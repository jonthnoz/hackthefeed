import { expect, test } from 'bun:test';
import { z } from 'zod';
import { constraintsSchema } from '../shared/schema';
import { contentSchema, type Content } from '../server/oriane';
import {
  discoverCandidates, qualifyCandidates, retrieveCandidates, retrievalPlanSchema, selectCandidates,
  type CandidateDecision, type RetrievalDependencies,
} from '../server/retrieval';

const brief = 'An app that turns saved videos into places to visit.';
const plan = retrievalPlanSchema.parse({
  product: 'Saved places', tagline: 'Find your saved places', promise: 'Turn saved videos into places',
  question: 'Where did you save it?', visualQuery: 'Import a restaurant from a saved video into a map',
  terms: ['saved places', 'travel map'], adjacentTerms: ['trip planning', 'travel bookmarks'],
});
const unconstrained = constraintsSchema.parse({});
const constrained = constraintsSchema.parse({ noRealPeople: true });
const targetedPlan = { ...plan, alternativeVisualQuery: 'Hands import a saved restaurant video into a map app' };

test('literal task and subject context use separate OR groups joined by AND, while nearby fallback remains separate', async () => {
  const fake = boundaryFakes();
  const contextual = { ...plan, contextTerms: ['document', 'PDF reader'] };
  await discoverCandidates({ plan: contextual, constraints: unconstrained, phase: 'refined', deps: fake.deps });
  const lexical = fake.searches.find(row => row.sort === 'interactionsCount:desc');
  expect(lexical).toBeDefined();
  expect(lexical?.body).toMatchObject({ operator: 'and', queries: [
    { operator: 'or', filters: { caption: { includesExactly: { values: plan.terms } }, transcript: { includesExactly: { values: plan.terms } } } },
    { operator: 'or', filters: { caption: { includesExactly: { values: contextual.contextTerms } }, transcript: { includesExactly: { values: contextual.contextTerms } } } },
  ] });
  await discoverCandidates({ plan: contextual, constraints: unconstrained, phase: 'expanded', deps: fake.deps });
  expect(fake.searches.at(-1)?.body).toMatchObject({ queries: [{ filters: { caption: { includesExactly: { values: plan.adjacentTerms } } } }] });
  expect(JSON.stringify(fake.searches.at(-1)?.body)).not.toContain('PDF reader');
});

function candidate(id: string, overrides: Partial<Content> = {}): Content {
  return contentSchema.parse({
    id, profileHandle: `${id}_creator`, platform: 'youtube', platformId: `${id}_video`,
    title: `Demonstration ${id}`, caption: `Save the ${id} place for a trip.`, publishedAt: '2026-11-07',
    viewsCount: 10000, interactionsCount: 100, media: [{ duration: 20, transcript: `Import the ${id} saved video into a travel map.` }],
    ...overrides,
  });
}

function decision(id: string, relevance: CandidateDecision['relevance'] = 'direct', overrides: Partial<CandidateDecision> = {}): CandidateDecision {
  return { id, relevance, reason: `The ${id} source demonstrates a concrete ${relevance} task.`, duplicateOf: null, ...overrides };
}

test('execution deduplication happens before reserving baseline and targeted inspection slots', () => {
  for (const duplicatedLane of ['baseline', 'targeted']) {
    const rows = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 't1', 't2', 't3', 't4'].map((id, i) => candidate(id, { interactionsCount: duplicatedLane === 'targeted' ? 10000 - i : 10000 + i }));
    const duplicates = duplicatedLane === 'baseline' ? ['b5', 'b6'] : ['t1', 't2'];
    const repeated = 'The exact same long execution is cross-posted and should consume only one inspection slot, leaving room for a distinct demonstration in its lane.';
    const pool = rows.map(row => duplicates.includes(row.id) ? { ...row, media: [{ duration: 20, transcript: repeated }] } : row);
    const selected = selectCandidates({ candidates: pool, decisions: pool.map(row => decision(row.id)), baselineIds: rows.filter(row => row.id.startsWith('b')).map(row => row.id), targetedIds: rows.filter(row => row.id.startsWith('t')).map(row => row.id) });
    expect(selected.length).toBeLessThanOrEqual(6);
    expect(selected.filter(row => row.id.startsWith('b')).length).toBeGreaterThanOrEqual(3);
    expect(selected.filter(row => row.id.startsWith('t')).length).toBeGreaterThanOrEqual(2);
    expect(selected.filter(row => duplicates.includes(row.id))).toHaveLength(1);
  }
});

test('context is a single conditional refinement and does not narrow an already useful initial pool', async () => {
  const contextual = { ...plan, contextTerms: ['saved documents'] };
  const first = candidate('first');
  const second = candidate('second');
  const recovery = candidate('recovery');
  const fake = boundaryFakes({ directVisual: [first], directText: [second] });
  const originalSearch = fake.deps.searchContents;
  const deps: RetrievalDependencies = { ...fake.deps, searchContents: async (body, sort, limit, projection) => {
    if (JSON.stringify(body).includes('saved documents')) return [recovery];
    return originalSearch(body, sort, limit, projection);
  } };
  const result = await retrieveCandidates({ brief, plan: contextual, constraints: unconstrained, onProgress() {}, deps });
  expect(result.trace.refined).toBe(true);
  expect(result.trace.expanded).toBe(false);
  expect(result.trace.queries.map(query => query.lane).sort()).toEqual(['direct-text', 'direct-visual', 'refined-text']);
  expect(result.trace.selectedIds).toContain('recovery');
  const good = boundaryFakes({ directText: [first, second, recovery] });
  const complete = await retrieveCandidates({ brief, plan: contextual, constraints: unconstrained, onProgress() {}, deps: good.deps });
  expect(complete.trace.refined).toBe(false);
  expect(complete.trace.expanded).toBe(false);
  expect(complete.trace.queries).toHaveLength(2);
  expect(JSON.stringify(complete.trace.queries)).not.toContain('saved documents');
});

const qualificationPayloadSchema = z.array(z.object({
  id: z.string(), creator: z.string(), title: z.string().nullish(), caption: z.string(), transcript: z.string(), onScreenText: z.string(),
}).strict());
type QualificationPayload = z.infer<typeof qualificationPayloadSchema>;
const knownPayloadSchema = qualificationPayloadSchema.element.pick({ id: true, creator: true, caption: true, transcript: true }).array();
type KnownPayload = z.infer<typeof knownPayloadSchema>;
const searchBodySchema = z.object({
  filters: z.object({ visualSimilarity: z.object({ includes: z.object({ values: z.array(z.object({ assetId: z.string() })) }) }).optional() }),
  queries: z.array(z.object({ filters: z.object({ caption: z.object({ includesExactly: z.object({ values: z.array(z.string()) }) }) }) })).optional(),
});

function boundaryFakes({ directVisual = [], directText = [], targeted = [], expanded = [], decide = rows => rows.map(row => decision(row.id)) }: {
  directVisual?: Content[]; directText?: Content[]; targeted?: Content[]; expanded?: Content[];
  decide?: (rows: QualificationPayload, call: number, known: KnownPayload) => CandidateDecision[];
} = {}) {
  const searches: { body: unknown; sort: string; limit: number; projection: string; resultIds: string[] }[] = [];
  const assets: { id: string; text: string }[] = [];
  const qualifications: QualificationPayload[] = [];
  const knownQualifications: KnownPayload[] = [];
  const prompts: string[] = [];
  const deps: RetrievalDependencies = {
    async createVisualAsset(text) {
      const id = `asset-${assets.length + 1}`;
      assets.push({ id, text });
      return id;
    },
    async searchContents(body, sort, limit, projection) {
      const parsed = searchBodySchema.parse(body);
      const assetId = parsed.filters.visualSimilarity?.includes.values[0]?.assetId;
      const text = assets.find(asset => asset.id === assetId)?.text;
      const isExpanded = parsed.queries?.[0]?.filters.caption.includesExactly.values.join('|') === plan.adjacentTerms.join('|');
      const rows = assetId ? text === plan.visualQuery ? directVisual : targeted : isExpanded ? expanded : directText;
      searches.push({ body, sort, limit, projection, resultIds: rows.map(row => row.id) });
      return rows;
    },
    async askAI({ prompt, schema, images }) {
      expect(images ?? []).toEqual([]);
      const rows = qualificationPayloadSchema.parse(JSON.parse(prompt.split('\nCandidates: ')[1]));
      const known = knownPayloadSchema.parse(JSON.parse(prompt.split('\nPreviously inspected sources: ')[1].split('\nCandidates: ')[0]));
      qualifications.push(rows);
      knownQualifications.push(known);
      prompts.push(prompt);
      return schema.parse({ decisions: decide(rows, qualifications.length, known) });
    },
  };
  return { deps, searches, assets, qualifications, knownQualifications, prompts };
}

const performanceFilters = { format: { includes: ['video'] }, viewsCount: { min: 5000 }, interactionsCount: { min: 100 } };
function lexicalBody(terms: string[]) {
  return { operator: 'and', filters: performanceFilters, queries: [{ operator: 'or', filters: {
    caption: { includesExactly: { values: terms } }, transcript: { includesExactly: { values: terms } },
  } }] };
}
function visualBody(assetId: string) {
  return { operator: 'and', filters: { ...performanceFilters, visualSimilarity: { includes: { values: [{ assetId }] } } } };
}

test('relevance outranks much higher engagement, while engagement breaks ties within a relevance class', () => {
  const candidates = [
    candidate('viral', { interactionsCount: 9000000 }), candidate('mechanism', { interactionsCount: 8000000 }),
    candidate('adjacent', { interactionsCount: 7000000 }), candidate('direct-low', { interactionsCount: 100 }),
    candidate('direct-high', { interactionsCount: 200 }),
  ];
  const decisions = [decision('viral', 'irrelevant'), decision('mechanism', 'mechanism'), decision('adjacent', 'adjacent'), decision('direct-low'), decision('direct-high')];
  expect(selectCandidates({ candidates, decisions }).map(row => row.id)).toEqual(['direct-high', 'direct-low', 'adjacent', 'mechanism']);
});

test('the six-source budget caps creators at two and transferable mechanisms at two', () => {
  const candidates = [
    ...['creator-1', 'creator-2', 'creator-3'].map((id, index) => candidate(id, { profileHandle: 'same_creator', interactionsCount: 300 - index })),
    candidate('another-direct'), candidate('adjacent'),
    ...['mechanism-1', 'mechanism-2', 'mechanism-3'].map((id, index) => candidate(id, { interactionsCount: 3000 - index })),
  ];
  const decisions = candidates.map(row => decision(row.id, row.id.startsWith('mechanism') ? 'mechanism' : row.id === 'adjacent' ? 'adjacent' : 'direct'));
  expect(selectCandidates({ candidates, decisions }).map(row => row.id)).toEqual(['creator-1', 'creator-2', 'another-direct', 'adjacent', 'mechanism-1', 'mechanism-2']);
  const moreDirect = [...candidates, candidate('extra-direct')];
  expect(selectCandidates({ candidates: moreDirect, decisions: [...decisions, decision('extra-direct')] }).map(row => row.id)).toEqual(['creator-1', 'creator-2', 'another-direct', 'extra-direct', 'adjacent', 'mechanism-1']);
});

test('missing, conflicting, blank, invalid duplicate targets, and duplicate cycles all fail closed', async () => {
  const candidates = ['good', 'missing', 'ambiguous', 'blank', 'self', 'unknown-target', 'cycle-a', 'cycle-b', 'cross-post'].map(id => candidate(id));
  const malformed = [
    decision('good'), decision('ambiguous'), decision('ambiguous', 'adjacent'), decision('blank', 'direct', { reason: ' \n ' }),
    decision('self', 'direct', { duplicateOf: 'self' }), decision('unknown-target', 'direct', { duplicateOf: 'invented' }),
    decision('cycle-a', 'direct', { duplicateOf: 'cycle-b' }), decision('cycle-b', 'direct', { duplicateOf: 'cycle-a' }),
    decision('cross-post', 'direct', { duplicateOf: 'good' }), decision('invented'),
  ];
  const fake = boundaryFakes({ decide: () => malformed });
  const decisions = await qualifyCandidates({ brief, plan, candidates, deps: fake.deps });
  expect(decisions.map(row => row.id)).toEqual(candidates.map(row => row.id));
  expect(decisions.filter(row => ['missing', 'ambiguous', 'blank', 'self', 'unknown-target'].includes(row.id)).every(row => row.relevance === 'irrelevant')).toBe(true);
  expect(selectCandidates({ candidates, decisions }).map(row => row.id)).toEqual(['good']);
  expect(selectCandidates({ candidates: candidates.filter(row => row.id !== 'self' && row.id !== 'unknown-target'), decisions: malformed }).map(row => row.id)).toEqual(['good']);
});

test('long normalized transcript or caption deduplicates executions without merging distinct demonstrations by one creator', () => {
  const transcript = 'Import a saved restaurant video, extract its location, then open the resulting place on a map for the next trip. '.repeat(2).trim();
  const caption = 'Bookmark this museum while planning a weekend trip, then revisit the saved location before choosing your walking route. '.repeat(2).trim();
  const candidates = [
    candidate('original', { media: [{ duration: 20, transcript }], profileHandle: 'same_creator' }),
    candidate('cross-post', { media: [{ duration: 20, transcript: `  ${transcript.toUpperCase().replaceAll(' ', '\n  ')}  ` }] }),
    candidate('distinct', { profileHandle: 'same_creator' }),
    candidate('caption-original', { caption, media: [] }),
    candidate('caption-cross-post', { caption: caption.toUpperCase().replaceAll(' ', '  '), media: [] }),
    candidate('short-1', { caption: 'Save this place', media: [] }), candidate('short-2', { caption: 'Save this place', media: [] }),
  ];
  const decisions = candidates.map(row => decision(row.id));
  expect(selectCandidates({ candidates, decisions }).map(row => row.id)).toEqual(['original', 'distinct', 'caption-original', 'short-1', 'short-2']);
});

test('constraint comparisons preserve up to three qualified nearby baseline sources without reserving irrelevant or mechanism sources', () => {
  const baseline = ['neutral-1', 'neutral-2', 'neutral-3', 'neutral-4', 'unrelated', 'neutral-mechanism'].map(id => candidate(id));
  const targeted = Array.from({ length: 6 }, (_, index) => candidate(`targeted-${index}`, { interactionsCount: 9000000 }));
  const candidates = [...targeted, ...baseline];
  const decisions = candidates.map(row => decision(row.id, row.id === 'unrelated' ? 'irrelevant' : row.id === 'neutral-mechanism' ? 'mechanism' : row.id.startsWith('neutral') ? 'adjacent' : 'direct'));
  const selected = selectCandidates({ candidates, decisions, baselineIds: baseline.map(row => row.id) });
  expect(selected.map(row => row.id)).toEqual(['neutral-1', 'neutral-2', 'neutral-3', 'targeted-0', 'targeted-1', 'targeted-2']);
  expect(selectCandidates({ candidates, decisions }).map(row => row.id)).toEqual(targeted.map(row => row.id));
});

test('two nearby targeted sources survive six much more popular neutral presenters and preserve three baseline comparisons', () => {
  const baseline = Array.from({ length: 6 }, (_, index) => candidate(`presenter-${index}`, { interactionsCount: 9000000 - index }));
  const targeted = [candidate('hands-1'), candidate('hands-2')];
  const candidates = [...baseline, ...targeted];
  const decisions = candidates.map(row => decision(row.id));
  expect(selectCandidates({ candidates, decisions, baselineIds: baseline.map(row => row.id) }).map(row => row.id)).toEqual(baseline.map(row => row.id));
  expect(selectCandidates({ candidates, decisions, baselineIds: baseline.map(row => row.id), targetedIds: targeted.map(row => row.id) }).map(row => row.id)).toEqual(['hands-1', 'hands-2', 'presenter-0', 'presenter-1', 'presenter-2', 'presenter-3']);
});

test('targeted and baseline reservations outrank creator diversity, while extra slots still respect the creator cap', () => {
  const candidates = ['presenter-1', 'presenter-2', 'presenter-3', 'hands-1', 'hands-2', 'unreserved'].map(id => candidate(id, { profileHandle: 'one_creator' }));
  candidates.push(candidate('other-creator'));
  const decisions = candidates.map(row => decision(row.id));
  const selected = selectCandidates({ candidates, decisions, baselineIds: ['presenter-1', 'presenter-2', 'presenter-3'], targetedIds: ['hands-1', 'hands-2'] });
  expect(selected.map(row => row.id)).toEqual(['hands-1', 'hands-2', 'presenter-1', 'presenter-2', 'presenter-3', 'other-creator']);
});

test('targeted reservations never admit missing, ambiguous, unrelated, duplicate, or mechanism-only evidence', () => {
  const candidates = ['baseline', 'target', 'missing', 'ambiguous', 'irrelevant', 'duplicate', 'mechanism'].map(id => candidate(id));
  const decisions = [decision('baseline'), decision('target', 'adjacent'), decision('ambiguous'), decision('ambiguous'), decision('irrelevant', 'irrelevant'), decision('duplicate', 'direct', { duplicateOf: 'baseline' }), decision('mechanism', 'mechanism')];
  const selected = selectCandidates({ candidates, decisions, baselineIds: ['baseline'], targetedIds: candidates.filter(row => row.id !== 'baseline').map(row => row.id) });
  expect(selected.map(row => row.id)).toEqual(['target', 'baseline', 'mechanism']);
});

test('initial discovery requests a default pool of 24 plus eight targeted sources with unchanged performance filters', async () => {
  const shared = candidate('shared');
  const fake = boundaryFakes({ directVisual: [candidate('visual'), shared], directText: [candidate('text'), shared], targeted: [candidate('hands'), shared] });
  const result = await discoverCandidates({ plan: targetedPlan, constraints: constrained, phase: 'initial', deps: fake.deps });
  expect(result.candidates.map(row => row.id)).toEqual(['visual', 'shared', 'text', 'hands']);
  expect(fake.assets.map(asset => asset.text).sort()).toEqual([plan.visualQuery, targetedPlan.alternativeVisualQuery].sort());
  expect(fake.searches).toHaveLength(3);
  expect(fake.searches).toEqual(expect.arrayContaining([
    { body: visualBody('asset-1'), sort: 'visualSimilarity:desc', limit: 12, projection: 'default', resultIds: ['visual', 'shared'] },
    { body: lexicalBody(plan.terms), sort: 'interactionsCount:desc', limit: 12, projection: 'default', resultIds: ['text', 'shared'] },
    { body: visualBody('asset-2'), sort: 'visualSimilarity:desc', limit: 8, projection: 'default', resultIds: ['hands', 'shared'] },
  ]));
  for (const query of result.queries) {
    const request = fake.searches.find(search => JSON.stringify(search.body) === JSON.stringify(query.body));
    expect(request).toEqual({ body: query.body, sort: query.sort, limit: query.limit, projection: 'default', resultIds: query.resultIds });
    if (query.lane === 'direct-visual') expect(query.assetText).toBe(plan.visualQuery);
    if (query.lane === 'constraint-visual') expect(query.assetText).toBe(targetedPlan.alternativeVisualQuery);
  }
  expect(result.queries.map(query => query.lane).sort()).toEqual(['constraint-visual', 'direct-text', 'direct-visual']);
});

test.each([
  ['no active exclusions', unconstrained, targetedPlan],
  ['no alternative query', constrained, plan],
])('initial discovery omits the targeted lane with %s', async (_name, constraints, searchPlan) => {
  const fake = boundaryFakes();
  await discoverCandidates({ plan: searchPlan, constraints, phase: 'initial', deps: fake.deps });
  expect(fake.assets).toHaveLength(1);
  expect(fake.searches.map(search => search.limit).sort()).toEqual([12, 12]);
  expect(fake.searches.every(search => search.projection === 'default')).toBe(true);
});

test('three distinct nearby references suppress fallback even with lower engagement than mechanisms', async () => {
  const candidates = ['direct-1', 'direct-2', 'adjacent', 'mechanism'].map(id => candidate(id, { interactionsCount: id === 'mechanism' ? 9000000 : 100 }));
  const fake = boundaryFakes({ directVisual: candidates, decide: rows => rows.map(row => decision(row.id, row.id === 'adjacent' ? 'adjacent' : row.id === 'mechanism' ? 'mechanism' : 'direct')) });
  const progress: string[] = [];
  const result = await retrieveCandidates({ brief, plan, constraints: unconstrained, onProgress: detail => progress.push(detail), deps: fake.deps });
  expect(result.trace.expanded).toBe(false);
  expect(result.trace.qualificationCalls).toBe(1);
  expect(fake.searches).toHaveLength(2);
  expect(progress).toEqual([]);
  expect(result.selected.map(row => row.id)).toEqual(['direct-1', 'direct-2', 'adjacent', 'mechanism']);
});

test('fewer than three nearby references triggers one fallback and qualifies only newly discovered IDs', async () => {
  const first = candidate('first');
  const second = candidate('second');
  const fallback = candidate('fallback');
  const fake = boundaryFakes({ directVisual: [first], directText: [first, second], expanded: [second, fallback] });
  const result = await retrieveCandidates({ brief, plan, constraints: unconstrained, onProgress() {}, deps: fake.deps });
  expect(fake.qualifications.map(rows => rows.map(row => row.id))).toEqual([['first', 'second'], ['fallback']]);
  expect(fake.searches).toHaveLength(3);
  expect(fake.searches.find(search => JSON.stringify(search.body) === JSON.stringify(lexicalBody(plan.adjacentTerms)))).toEqual({
    body: lexicalBody(plan.adjacentTerms), sort: 'interactionsCount:desc', limit: 12, projection: 'default', resultIds: ['second', 'fallback'],
  });
  expect(result.trace).toMatchObject({ strategy: 'topical-v3', expanded: true, refined: false, candidateCount: 3, qualificationCalls: 2, selectedIds: ['first', 'second', 'fallback'] });
  expect(result.trace.decisions).toEqual([decision('first'), decision('second'), decision('fallback')]);
  expect(result.trace.queries).toEqual(expect.arrayContaining([
    { lane: 'direct-visual', body: visualBody('asset-1'), sort: 'visualSimilarity:desc', limit: 12, resultIds: ['first'], assetText: plan.visualQuery },
    { lane: 'direct-text', body: lexicalBody(plan.terms), sort: 'interactionsCount:desc', limit: 12, resultIds: ['first', 'second'] },
    { lane: 'expanded-text', body: lexicalBody(plan.adjacentTerms), sort: 'interactionsCount:desc', limit: 12, resultIds: ['second', 'fallback'] },
  ]));
  expect(fake.searches.every(search => search.projection === 'default')).toBe(true);
});

test('mechanism references cannot fill the three-nearby threshold and suppress fallback', async () => {
  const fake = boundaryFakes({ directVisual: ['near-1', 'near-2', 'mechanism-1', 'mechanism-2'].map(id => candidate(id)), decide: rows => rows.map(row => decision(row.id, row.id.startsWith('mechanism') ? 'mechanism' : 'direct')) });
  const result = await retrieveCandidates({ brief, plan, constraints: unconstrained, onProgress() {}, deps: fake.deps });
  expect(result.selected.map(row => row.id)).toEqual(['near-1', 'near-2', 'mechanism-1', 'mechanism-2']);
  expect(result.trace.expanded).toBe(true);
  expect(fake.searches).toHaveLength(3);
});

test('fallback never repeats when new evidence remains unrelated, and known IDs are not requalified', async () => {
  const existing = candidate('existing');
  const fake = boundaryFakes({ directVisual: [existing], expanded: [existing, candidate('unrelated')], decide: rows => rows.map(row => decision(row.id, row.id === 'unrelated' ? 'irrelevant' : 'direct')) });
  const result = await retrieveCandidates({ brief, plan, constraints: unconstrained, onProgress() {}, deps: fake.deps });
  expect(result.selected.map(row => row.id)).toEqual(['existing']);
  expect(fake.qualifications.map(rows => rows.map(row => row.id))).toEqual([['existing'], ['unrelated']]);
  expect(fake.searches).toHaveLength(3);
  expect(result.trace).toMatchObject({ expanded: true, qualificationCalls: 2, candidateCount: 2 });
});

test('fallback with only known candidates does not spend a second qualification call', async () => {
  const existing = candidate('existing');
  const fake = boundaryFakes({ directVisual: [existing], expanded: [existing] });
  const result = await retrieveCandidates({ brief, plan, constraints: unconstrained, onProgress() {}, deps: fake.deps });
  expect(fake.qualifications.map(rows => rows.map(row => row.id))).toEqual([['existing']]);
  expect(result.trace).toMatchObject({ expanded: true, qualificationCalls: 1, candidateCount: 1, selectedIds: ['existing'] });
  expect(fake.searches).toHaveLength(3);
});

test('empty discovery still tries the one fallback without making empty AI requests', async () => {
  const fake = boundaryFakes();
  const result = await retrieveCandidates({ brief, plan, constraints: unconstrained, onProgress() {}, deps: fake.deps });
  expect(result.selected).toEqual([]);
  expect(result.trace).toMatchObject({ expanded: true, candidateCount: 0, qualificationCalls: 0, decisions: [], selectedIds: [] });
  expect(fake.qualifications).toEqual([]);
  expect(fake.searches).toHaveLength(3);
});

test('creator and execution deduplication count toward the fallback threshold', async () => {
  const transcript = 'Import this restaurant video, check the location, and save the place to the map before making plans for the weekend trip. '.repeat(2);
  const candidates = [candidate('one'), candidate('copy-a', { media: [{ duration: 20, transcript }] }), candidate('copy-b', { media: [{ duration: 20, transcript }] })];
  const fake = boundaryFakes({ directVisual: candidates.slice(0, 1), directText: candidates.slice(1) });
  const result = await retrieveCandidates({ brief, plan, constraints: unconstrained, onProgress() {}, deps: fake.deps });
  expect(result.selected.map(row => row.id)).toEqual(['one', 'copy-a']);
  expect(result.trace.expanded).toBe(true);
  const sameCreator = boundaryFakes({ directVisual: ['one', 'two', 'three'].map(id => candidate(id, { profileHandle: 'same_creator' })) });
  const capped = await retrieveCandidates({ brief, plan, constraints: unconstrained, onProgress() {}, deps: sameCreator.deps });
  expect(capped.selected).toHaveLength(2);
  expect(capped.trace.expanded).toBe(true);
});

test('exact execution deduplication spans the initial and fallback phases', async () => {
  const transcript = 'Find a cafe in a saved video, import its address, and check the resulting location on the map while planning a walking route. '.repeat(2);
  const first = candidate('original', { media: [{ duration: 20, transcript }] });
  const crossPost = candidate('cross-post', { media: [{ duration: 20, transcript: transcript.toUpperCase().replaceAll(' ', '  ') }] });
  const fake = boundaryFakes({ directVisual: [first], expanded: [crossPost, candidate('new-task')] });
  const result = await retrieveCandidates({ brief, plan, constraints: unconstrained, onProgress() {}, deps: fake.deps });
  expect(result.selected.map(row => row.id)).toEqual(['original', 'new-task']);
  expect(result.trace).toMatchObject({ candidateCount: 3, qualificationCalls: 2, selectedIds: ['original', 'new-task'] });
});

test('constrained retrieval keeps nearby neutral comparison evidence when targeted results dominate engagement', async () => {
  const baseline = ['presenter', 'ambiguous', 'neutral-screen'].map(id => candidate(id));
  const targeted = Array.from({ length: 6 }, (_, index) => candidate(`hands-${index}`, { interactionsCount: 9000000 }));
  const fake = boundaryFakes({ directVisual: baseline, targeted, decide: rows => rows.map(row => decision(row.id, row.id.startsWith('hands') ? 'direct' : 'adjacent')) });
  const result = await retrieveCandidates({ brief, plan: targetedPlan, constraints: constrained, onProgress() {}, deps: fake.deps });
  expect(result.selected.map(row => row.id)).toEqual(['hands-0', 'hands-1', 'presenter', 'ambiguous', 'neutral-screen', 'hands-2']);
  expect(result.trace.expanded).toBe(false);
  expect(result.trace.selectedIds).toEqual(result.selected.map(row => row.id));
});

test('constrained retrieval reserves hands demos even when every baseline presenter has much higher engagement', async () => {
  const baseline = Array.from({ length: 6 }, (_, index) => candidate(`presenter-${index}`, { interactionsCount: 9000000 - index }));
  const hands = [candidate('hands-1'), candidate('hands-2')];
  const fake = boundaryFakes({ directVisual: baseline, targeted: hands });
  const result = await retrieveCandidates({ brief, plan: targetedPlan, constraints: constrained, onProgress() {}, deps: fake.deps });
  expect(result.selected.map(row => row.id)).toEqual(['hands-1', 'hands-2', 'presenter-0', 'presenter-1', 'presenter-2', 'presenter-3']);
  expect(result.trace.selectedIds).toEqual(result.selected.map(row => row.id));
  expect(result.trace.expanded).toBe(false);
  expect(fake.searches).toHaveLength(3);
});

test('qualification accepts duplicate links to previously inspected IDs and excludes that short-caption cross-post', async () => {
  const caption = 'Save a restaurant video as a map pin for your next weekend trip.'.slice(0, 62);
  expect(caption).toHaveLength(62);
  const original = candidate('original', { caption, media: [] });
  const crossPost = candidate('cross-post', { caption, media: [] });
  const fake = boundaryFakes({ decide: (rows, _call, known) => {
    expect(rows.map(row => row.id)).toEqual(['cross-post']);
    expect(known).toEqual([{ id: 'original', creator: original.profileHandle, caption, transcript: '' }]);
    return [decision('cross-post', 'direct', { duplicateOf: 'original' })];
  } });
  const decisions = await qualifyCandidates({ brief, plan, candidates: [crossPost], knownCandidates: [original], deps: fake.deps });
  expect(decisions).toEqual([decision('cross-post', 'direct', { duplicateOf: 'original' })]);
  expect(selectCandidates({ candidates: [original, crossPost], decisions: [decision('original'), ...decisions] }).map(row => row.id)).toEqual(['original']);
});

test('fallback sends old sources as deduplication context and never selects their short-caption cross-posts', async () => {
  const caption = 'Save a restaurant video as a map pin for your next weekend trip.'.slice(0, 62);
  const original = candidate('original', { caption, media: [] });
  const crossPost = candidate('cross-post', { caption, media: [] });
  const fake = boundaryFakes({ directVisual: [original], expanded: [original, crossPost, candidate('distinct')], decide: (rows, call, known) => {
    if (call === 1) {
      expect(known).toEqual([]);
      return rows.map(row => decision(row.id));
    }
    expect(known.map(row => row.id)).toEqual(['original']);
    return rows.map(row => decision(row.id, 'direct', { duplicateOf: row.id === 'cross-post' ? 'original' : null }));
  } });
  const result = await retrieveCandidates({ brief, plan, constraints: unconstrained, onProgress() {}, deps: fake.deps });
  expect(fake.qualifications.map(rows => rows.map(row => row.id))).toEqual([['original'], ['cross-post', 'distinct']]);
  expect(result.trace).toMatchObject({ expanded: true, qualificationCalls: 2, candidateCount: 3, selectedIds: ['original', 'distinct'] });
  expect(result.trace.decisions.find(row => row.id === 'cross-post')).toEqual(decision('cross-post', 'direct', { duplicateOf: 'original' }));
  expect(result.selected.map(row => row.id)).toEqual(['original', 'distinct']);
});

test('identical concurrent and repeated retrievals make fresh searches, assets, and text-only qualification requests', async () => {
  const candidates = ['one', 'two', 'three'].map(id => candidate(id));
  const fake = boundaryFakes({ directVisual: candidates });
  const run = () => retrieveCandidates({ brief, plan, constraints: unconstrained, onProgress() {}, deps: fake.deps });
  const results = await Promise.all([run(), run()]);
  results.push(await run());
  expect(fake.assets).toHaveLength(3);
  expect(new Set(fake.assets.map(asset => asset.id)).size).toBe(3);
  expect(fake.searches).toHaveLength(6);
  expect(fake.qualifications).toHaveLength(3);
  expect(results.map(result => result.trace.selectedIds)).toEqual([['one', 'two', 'three'], ['one', 'two', 'three'], ['one', 'two', 'three']]);
  expect(fake.searches.every(search => search.projection === 'default')).toBe(true);
  expect(fake.prompts.every(prompt => prompt.includes(brief))).toBe(true);
});
