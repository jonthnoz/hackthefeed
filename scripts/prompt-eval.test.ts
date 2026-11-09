import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { analysisSchema, constraintsSchema } from '../shared/schema';
import { buildAnalysisPrompt, buildResearchPlanPrompt } from '../server/prompts';
import { blindPair, deterministicFlags, validateVerdicts, verdictSchema } from './prompt-eval';
import { outputSchema, scenarios } from '../research/prompt-eval/scenarios';
import { buildAnalysisPrompt as frozenAnalysis, buildResearchPlanPrompt as frozenPlan } from '../research/prompt-eval/frozen-prompts';
import { baselineAnalysis, baselinePlan } from '../research/prompt-eval/baseline';

test('both prompt builders preserve original product data and constraints across analysis', () => {
  const scenario = scenarios.find(scenario => scenario.id === 'analysis-poisoned-plan');
  if (!scenario || scenario.stage !== 'analysis') throw new Error('Analysis scenario missing.');
  const planning = buildResearchPlanPrompt(scenario.input);
  const analysis = buildAnalysisPrompt(scenario.input);
  for (const prompt of [planning, analysis]) {
    expect(prompt).toContain(JSON.stringify(scenario.input.brief));
    expect(prompt).toContain(JSON.stringify(scenario.input.constraints));
  }
  expect(analysis).toContain(JSON.stringify(scenario.input.plan));
  expect(analysis).toContain(JSON.stringify(scenario.input.sources));
  expect(analysis).toContain('original brief is the authority');
  expect(analysis).toContain('Correct unsupported assumptions');
});

test('constraints require a positive alternate query only when active', () => {
  const input = { brief: 'A bill reminder app', focus: '', constraints: constraintsSchema.parse({}) };
  expect(buildResearchPlanPrompt(input)).not.toContain('Also provide alternativeVisualQuery');
  for (const constraints of [{ noRealPeople: true }, { exclude: 'logos' }]) {
    expect(buildResearchPlanPrompt({ ...input, constraints: constraintsSchema.parse(constraints) })).toContain('positive observable alternative');
    expect(outputSchema('plan', true).safeParse({ product: 'Bills', tagline: 'Due soon', promise: 'Remember bills', question: 'What is due?', visualQuery: 'Bills on a calendar', terms: ['bill dates', 'bill reminders'] }).success).toBe(false);
  }
  expect(outputSchema('analysis', true)).toBe(analysisSchema);
});

test('blinding is reproducible, reversible and uses both presentation orders', () => {
  const pairs = Array.from({ length: 30 }, (_, index) => blindPair({ id: String(index), seed: 'fixed', a: 'first', b: 'second' }));
  expect(new Set(pairs.map(pair => pair.leftVariant)).size).toBe(2);
  for (const [index, pair] of pairs.entries()) {
    expect(pair).toEqual(blindPair({ id: String(index), seed: 'fixed', a: 'first', b: 'second' }));
    expect(pair.left).toBe(pair.leftVariant === 'A' ? 'first' : 'second');
    expect(pair.right).toBe(pair.leftVariant === 'A' ? 'second' : 'first');
    expect(pair.id).not.toBe(String(index));
  }
});

test('deterministic checks flag wording and missing positive value without semantic scoring', () => {
  expect(deterministicFlags({ promise: 'Do not translate documents' }, ['translat'], ['listen|audio'])).toEqual([
    'inspect unsupported wording: translat', 'inspect missing explicit value: listen|audio',
  ]);
  expect(deterministicFlags({ promise: 'Translate and listen in Spanish' }, [], ['translat', 'Spanish'])).toEqual([]);
});

test('judge completeness and feature counts reject incomplete or inconsistent verdicts', () => {
  const rating = { fabricatedFeatures: 0, fabricatedClaims: [], faithfulness: 4, specificity: 4, uncertainty: 4, explicitCapabilities: 4, constraintViolations: [], evidence: [] };
  const verdict = verdictSchema.parse({ pairs: [{ id: 'opaque', left: rating, right: rating, preferred: 'tie', reason: 'Both grounded.' }], limitations: [] });
  expect(validateVerdicts(verdict, ['opaque'])).toBe(verdict);
  expect(() => validateVerdicts(verdict, ['opaque', 'missing'])).toThrow('omitted');
  expect(() => validateVerdicts({ ...verdict, pairs: [...verdict.pairs, ...verdict.pairs] }, ['opaque'])).toThrow('duplicated');
  const pair = verdict.pairs[0];
  if (!pair) throw new Error('Pair missing.');
  expect(() => validateVerdicts({ ...verdict, pairs: [{ ...pair, left: { ...rating, fabricatedFeatures: 1 } }] }, ['opaque'])).toThrow('count');
});

test('the fixed matrix stays within the generation budget and covers positive controls and analysis', () => {
  const calls = scenarios.reduce((sum, scenario) => sum + (scenario.split === 'screen' ? 4 : 2), 0);
  expect(calls).toBe(24);
  expect(scenarios.filter(scenario => scenario.stage === 'analysis')).toHaveLength(2);
  expect(scenarios.find(scenario => scenario.id === 'explicit-translation')?.required).toContain('translat');
  expect(scenarios.find(scenario => scenario.id === 'explicit-autopay')?.required).toContain('automatic|automatically|autopay');
});

test('production no-human prompts permit hands-only demonstrations in planning and analysis', () => {
  const scenario = scenarios.find(scenario => scenario.stage === 'analysis');
  if (!scenario || scenario.stage !== 'analysis') throw new Error('Analysis scenario missing.');
  for (const prompt of [buildResearchPlanPrompt(scenario.input), buildAnalysisPrompt(scenario.input)]) {
    expect(prompt).toContain('Hands/fingers-only demonstrations are allowed');
    expect(prompt).toContain('faces, presenters, full people and photorealistic people');
    expect(prompt).not.toContain('forbids visible humans, hands, body parts');
    expect(prompt).not.toContain('avoiding humans, hands');
  }
});

test('the frozen module reproduces every sent prompt after production policy changes', () => {
  const directory = 'research/prompt-eval/runs/grounding-v1';
  const manifest = z.object({ hashes: z.record(z.string(), z.string()) }).parse(JSON.parse(readFileSync(`${directory}/manifest.json`, 'utf8')));
  const snapshot = readFileSync('research/prompt-eval/frozen-prompts.source.txt', 'utf8');
  expect(createHash('sha256').update(snapshot).digest('hex')).toBe(manifest.hashes['server/prompts.ts']);
  for (const split of ['screen', 'heldout']) {
    for (const [index, scenario] of scenarios.filter(scenario => scenario.split === split).entries()) {
      for (const strategy of split === 'screen' ? [0, 1] : [index % 2]) {
        for (const variant of ['A', 'B']) {
          const prompt = scenario.stage === 'analysis'
            ? (variant === 'A' ? baselineAnalysis : frozenAnalysis)(scenario.input)
            : (variant === 'A' ? baselinePlan : frozenPlan)(scenario.input);
          expect(prompt).toBe(readFileSync(`${directory}/${scenario.id}-${strategy}-${variant}.prompt.txt`, 'utf8'));
        }
      }
    }
  }
});
