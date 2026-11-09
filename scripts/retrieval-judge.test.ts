import { expect, test } from 'bun:test';
import { z } from 'zod';
import { contentSchema } from '../server/oriane';
import { resultSchema, scenarioSchema } from './retrieval-eval';
import { assertCaptureMatches, buildRichUnion, buildUnion, disagreements, judgeConfigs, makePrompt, promotionGate, responseSchema, reusableLabels, scoreArm, summarizeLabels } from './retrieval-judge';

const scenario = scenarioSchema.parse({ id: 'test-brief', split: 'screen', input: { brief: 'Read existing documents aloud; no translation.', focus: 'Listen hands-free', constraints: { noRealPeople: false, exclude: '' }, resources: [] }, capabilities: ['read documents aloud'], unsupported: ['translation'], need: 'Listen to existing text' });
const row = (id: string) => contentSchema.parse({ id, platform: 'tiktok', platformId: id, profileHandle: 'same-creator', publishedAt: '2026-01-01', title: 'A task demonstration', caption: 'Import your document and listen to its words.', media: [{ transcript: 'Choose an existing document. Read it aloud.', onScreenText: ['Read aloud'], frames: [{ url: 'https://example.test/private-frame', timestampSeconds: 1, onScreenTextRegions: [{ text: 'Play narration' }] }] }], viewsCount: 999999, likesCount: 888888 });
const plan = { product: 'Reader', tagline: 'Listen', promise: 'Read aloud', question: 'Listen?', visualQuery: 'private query', terms: ['document', 'narration'] };
function fixture() {
  const candidates = ['one', 'two', 'three', 'four'].map(row);
  const result = resultSchema.parse({ scenario: scenario.id, split: 'screen', oldPlan: plan, newPlan: { ...plan, adjacentTerms: ['podcast', 'audiobook'] }, candidates, arms: ['A', 'B', 'C-small', 'C', 'D', 'O'].map(id => ({ id, plan: id === 'A' ? 'old' : 'new', poolIds: candidates.map(source => source.id), selectedIds: id === 'A' ? ['one'] : ['one', 'two', 'three', 'four'] })), trace: { query: 'must not leak', model: 'secret-model' } });
  const built = buildUnion([scenario], [result], 'research/retrieval-eval/runs/fixture', 'screen');
  const verdict = { labels: built.union.briefs.flatMap(brief => brief.sources.map(source => ({ briefId: brief.briefId, sourceId: source.sourceId, proximity: 'direct' as const, useful: 'yes' as const, mechanism: 'demonstration' as const, unsupportedCapabilityIssues: [], constraints: 'fits' as const, evidence: 'Import your document and listen to its words.' }))) };
  return { ...built, verdict, result };
}

test('seeded blinded union strips metadata, plans, rankings and identifiers but retains original task and text', () => {
  const { union, mapping, result } = fixture();
  expect(buildUnion([scenario], [{ ...result, candidates: result.candidates.toReversed(), arms: result.arms.toReversed() }], 'research/retrieval-eval/runs/fixture', 'screen').union).toEqual(union);
  const text = JSON.stringify(union);
  for (const secret of ['profileHandle', 'platformId', 'viewsCount', '999999', '888888', 'oldPlan', 'newPlan', 'selectedIds', 'poolIds', 'private query', 'secret-model', 'same-creator', 'private-frame', 'test-brief']) expect(text).not.toContain(secret);
  expect(union.briefs[0].brief).toBe(scenario.input.brief);
  expect(union.briefs[0].sources[0].transcript).toContain('Read it aloud');
  expect(union.briefs[0].sources[0].frameText).toBe('Play narration');
  expect(mapping.scenarios[0].sources).toHaveLength(4);
  expect(makePrompt(union)).toContain('Shared mood, emotion, audience');
  expect(makePrompt(union)).toContain('Hands-only demonstrations are allowed');
});

test('Draft7 response rejects missing, duplicate, invented and misassigned opaque IDs', () => {
  const { union, verdict } = fixture();
  const schema = responseSchema(union);
  expect(schema.parse(verdict)).toEqual(verdict);
  expect(z.toJSONSchema(schema, { target: 'draft-7' }).$schema).toContain('draft-07');
  expect(() => schema.parse({ labels: verdict.labels.slice(1) })).toThrow('Missing opaque ID');
  expect(() => schema.parse({ labels: [...verdict.labels, verdict.labels[0]] })).toThrow('Duplicate opaque ID');
  expect(() => schema.parse({ labels: [{ ...verdict.labels[0], sourceId: 'invented' }, ...verdict.labels.slice(1)] })).toThrow('Invented');
  expect(() => schema.parse({ labels: verdict.labels.map(label => ({ ...label, briefId: 'wrong' })) })).toThrow('misplaced');
});

test('recorded evaluations remain readable after relocation while changed evidence still rejects inherited labels', () => {
  const { result, mapping } = fixture();
  const relocated = buildUnion([scenario], [result], '/a/different/machine/research/retrieval-eval/runs/fixture', 'screen').mapping;
  expect(relocated.runDirectory).not.toBe(mapping.runDirectory);
  expect(() => assertCaptureMatches(mapping, relocated)).not.toThrow();
  const changed = buildUnion([scenario], [{ ...result, candidates: result.candidates.map(source => ({ ...source, caption: 'Different evidence' })) }], '/a/different/machine/research/retrieval-eval/runs/fixture', 'screen').mapping;
  expect(() => assertCaptureMatches(mapping, changed)).toThrow('Capture evidence changed');
});

test('selected-union review includes every arm selection and omits only candidates unused by all arms', () => {
  const { result } = fixture();
  const extra = row('unused');
  const extended = { ...result, candidates: [...result.candidates, extra], arms: result.arms.map(arm => ({ ...arm, poolIds: [...arm.poolIds, extra.id] })) };
  const all = buildUnion([scenario], [extended], 'research/retrieval-eval/runs/fixture', 'screen');
  const selected = buildUnion([scenario], [extended], 'research/retrieval-eval/runs/fixture', 'screen', true);
  expect(all.union.briefs[0].sources).toHaveLength(5);
  expect(selected.union.briefs[0].sources).toHaveLength(4);
  expect(selected.mapping.scenarios[0].sources.map(source => source.id).sort()).toEqual(['four', 'one', 'three', 'two']);
  expect(selected.mapping.scenarios[0].arms).toEqual(extended.arms);
});

test('evaluation label reuse requires the exact same brief context and exact source evidence', () => {
  const { union, verdict } = fixture();
  expect(reusableLabels(union, union, verdict)).toEqual(verdict.labels);
  const changed = { ...union, briefs: union.briefs.map(brief => ({ ...brief, sources: brief.sources.map((source, i) => i === 0 ? { ...source, transcript: 'Different evidence' } : source) })) };
  expect(reusableLabels(changed, union, verdict)).toHaveLength(verdict.labels.length - 1);
  const differentBrief = { ...union, briefs: union.briefs.map(brief => ({ ...brief, brief: 'A different product' })) };
  expect(reusableLabels(differentBrief, union, verdict)).toEqual([]);
});

test('close/useful@6 separates proximity from usefulness and leaves missing slots at zero', () => {
  const { mapping, verdict } = fixture();
  const sources = mapping.scenarios[0].sources;
  const labels = verdict.labels.map(label => ({ ...label, proximity: label.sourceId === sources[1].sourceId ? 'mechanism' as const : label.sourceId === sources[2].sourceId ? 'adjacent' as const : 'direct' as const, useful: label.sourceId === sources[3].sourceId ? 'uncertain' as const : 'yes' as const }));
  const score = scoreArm(sources.map(source => source.id), sources, { labels });
  expect(score.closeUsefulCount).toBe(2);
  expect(score.closeUsefulAt6).toBe(2 / 6);
  expect(score.usefulAt6).toBe(3 / 6);
  expect(score.missingSlots).toBe(2);
  expect(score.distinctUsefulMechanisms).toBe(1);
  expect(score.maxCreatorShare).toBe(1);
  expect(scoreArm([], sources, verdict).closeUsefulAt6).toBe(0);
  expect(scoreArm([], sources, verdict).missingSlots).toBe(6);
});

test('duplicate source identities cannot inflate quality; legacy selections retain count beyond six', () => {
  const { mapping, verdict } = fixture();
  const sources = mapping.scenarios[0].sources;
  const duplicate = { ...sources[1], identity: sources[0].identity };
  const score = scoreArm(['one', 'two', 'one', 'three', 'four', 'one', 'four', 'four'], [sources[0], duplicate, ...sources.slice(2)], verdict);
  expect(score.selectedCount).toBe(8);
  expect(score.closeUsefulCount).toBe(3);
  expect(score.closeUsefulAt6).toBe(3 / 6);
  expect(score.duplicateCount).toBe(3);
  expect(score.totalDuplicateCount).toBe(5);
});

test('paired differences preserve query, qualification, pool, adaptive and order diagnostics', () => {
  const { mapping, verdict } = fixture();
  const summary = summarizeLabels(mapping, verdict)[0];
  expect(summary.differences.find(row => row.factor === 'combined')?.closeUsefulDelta).toBe(3);
  expect(summary.differences.map(row => row.factor)).toEqual(['query', 'qualification', 'pool', 'adaptive', 'order-diagnostic', 'combined']);
  expect(summary.arms.O.closeUsefulCount).toBe(summary.arms.C.closeUsefulCount);
});

test('promotion needs each judge, all six cases, screening mean gain >=1 and no heldout mean loss', () => {
  const rows = ['codex', 'claude'].flatMap(judge => ['s1', 's2', 's3', 'h1', 'h2', 'h3'].map(scenario => ({ judge, scenario, split: scenario.startsWith('s') ? 'screen' as const : 'heldout' as const, gain: scenario.startsWith('s') ? 1 : 0 })));
  expect(promotionGate(rows).status).toBe('pass');
  expect(promotionGate(rows.slice(1)).status).toBe('pending');
  expect(promotionGate(rows.map(row => row.judge === 'claude' && row.scenario === 'h1' ? { ...row, gain: -1 } : row)).status).toBe('inconclusive');
  const screenFail = promotionGate(rows.map(row => row.judge === 'claude' && row.scenario === 's1' ? { ...row, gain: 0 } : row));
  expect(screenFail.status).toBe('inconclusive');
  const regression = promotionGate(rows.map(row => row.scenario === 'h1' ? { ...row, gain: -1 } : row.scenario === 'h2' ? { ...row, gain: 1 } : row));
  expect(regression.status).toBe('pass');
  expect(regression.individualRegressions).toHaveLength(2);
});

test('richer recheck uses independent subset with stable IDs, missing records explicit and no images', () => {
  const { union, mapping } = fixture();
  const rich = buildRichUnion(union, mapping, [{ scenario: scenario.id, requestedIds: ['one', 'two'], missingIds: ['two'], candidates: [{ ...row('one'), media: [{ transcript: 'Richer narration paragraph.' }] }], evidenceKind: 'full-text-and-indexed-frame-metadata', selectionPolicy: 'arm disagreement' }]);
  expect(rich.briefs[0].sources).toHaveLength(2);
  expect(rich.briefs[0].sources.find(source => source.sourceId === mapping.scenarios[0].sources[0].sourceId)?.transcript).toBe('Richer narration paragraph.');
  expect(rich.briefs[0].sources.find(source => source.sourceId === mapping.scenarios[0].sources[1].sourceId)?.truncated).toBe(true);
  expect(() => buildRichUnion(union, mapping, [{ scenario: scenario.id, requestedIds: ['invented'], missingIds: [], candidates: [row('invented')], evidenceKind: 'full-text-and-indexed-frame-metadata', selectionPolicy: '' }])).toThrow('Invented');
});

test('both independent configurations explicit high effort; disagreements stay visible', () => {
  expect(judgeConfigs.codex.model).toBe('gpt-6.1-sol');
  expect(judgeConfigs.claude.model).toBe('opus');
  expect(judgeConfigs.codex.effort).toBe('high');
  expect(judgeConfigs.claude.effort).toBe('high');
  const { verdict } = fixture();
  expect(disagreements(verdict, verdict)).toEqual([]);
  const changed = { labels: verdict.labels.map((label, index) => index ? label : { ...label, useful: 'no' as const }) };
  expect(disagreements(verdict, changed)[0].changed).toEqual(['useful']);
});

test('invalid capture membership and duplicate candidates fail before model dispatch', () => {
  const { result } = fixture();
  expect(() => buildUnion([scenario], [{ ...result, candidates: [...result.candidates, result.candidates[0]] }], 'fixture', 'screen')).toThrow('Duplicate candidate');
  expect(() => buildUnion([scenario], [{ ...result, arms: result.arms.map(arm => ({ ...arm, selectedIds: ['invented'] })) }], 'fixture', 'screen')).toThrow('Missing candidate');
  expect(() => buildUnion([scenario], [], 'fixture', 'screen')).toThrow('Missing');
});
