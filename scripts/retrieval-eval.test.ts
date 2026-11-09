import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { mkdtemp, readdir, rmdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { contentSchema } from '../server/oriane';
import { legacyDiscover, legacySelect } from '../research/retrieval-eval/baseline';
import { Capture, digest, budgets, enrichmentIds, type Result } from './retrieval-eval';
import { buildResearchPlanPrompt as frozenPrompt } from '../research/retrieval-eval/frozen/prompts';
import type { RetrievalDependencies } from '../server/retrieval';

function row(id: string) {
  return contentSchema.parse({ id, profileHandle: id, platform: 'tiktok', platformId: id, publishedAt: '2026-01-01', media: [] });
}

test('legacy interleave fills six, preserves first position and last duplicate payload, then appends targeted four', () => {
  const visual = [row('a'), row('b'), row('c'), row('d'), row('e'), row('f')];
  const lexical = [{ ...row('a'), title: 'Last payload' }, row('g'), row('h'), row('i'), row('j'), row('k')];
  const selected = legacySelect({ visual, lexical, constrained: true, targeted: ['t1', 't2', 't3', 't4'].map(row) });
  expect(selected.map(item => item.id)).toEqual(['a', 'b', 'g', 'c', 'h', 'd', 't1', 't2', 't3', 't4']);
  expect(selected[0].title).toBe('Last payload');
});

test('legacy lexical-only and sparse pools remain usable without fabricated filling', () => {
  expect(legacySelect({ visual: [], lexical: [row('x')], constrained: false }).map(item => item.id)).toEqual(['x']);
  expect(legacySelect({ visual: [], lexical: [], constrained: false })).toEqual([]);
});

test('legacy provider calls retain exact filters, sorts and six/six/four limits', async () => {
  const requests: { body: unknown; sort: string; limit: number; projection: string }[] = [];
  const assets: string[] = [];
  const deps: RetrievalDependencies = {
    askAI: async () => { throw new Error('Legacy discovery must not qualify.'); },
    createVisualAsset: async text => { assets.push(text); return `asset-${assets.length}`; },
    searchContents: async (body, sort, limit, projection) => { requests.push({ body, sort, limit, projection }); return []; },
  };
  await legacyDiscover({ plan: { product: '', tagline: '', promise: '', question: '', visualQuery: 'scene', terms: ['saved places', 'map collection'], alternativeVisualQuery: 'hands on map' }, constrained: true, deps });
  expect(assets).toEqual(['scene', 'hands on map']);
  expect(requests.map(item => [item.sort, item.limit, item.projection])).toEqual([
    ['visualSimilarity:desc', 6, 'default'], ['interactionsCount:desc', 6, 'default'], ['visualSimilarity:desc', 4, 'default'],
  ]);
  expect(requests[1].body).toEqual({ operator: 'and', filters: { format: { includes: ['video'] }, viewsCount: { min: 5000 }, interactionsCount: { min: 100 } }, queries: [{ operator: 'or', filters: { caption: { includesExactly: { values: ['saved places', 'map collection'] } }, transcript: { includesExactly: { values: ['saved places', 'map collection'] } } } }] });
});

test('frozen planner is byte-identical except its type-only import location', () => {
  const original = readFileSync('research/retrieval-eval/frozen/prompts.ts.txt', 'utf8');
  expect(readFileSync('research/retrieval-eval/frozen/prompts.ts', 'utf8')).toBe(original.replaceAll('../shared/schema', '../../../shared/schema'));
  expect(digest(original)).toBe('db6f8b10db6dfba6f33c08366de89a4389b29e9fb8a98781eb885121efe6422c');
  const prompt = frozenPrompt({ brief: 'Save places', focus: '', constraints: { noRealPeople: true, exclude: '' } });
  expect(prompt).toContain('Hands/fingers-only demonstrations are allowed');
  expect(prompt).not.toContain('adjacentTerms');
});

test('six scenarios are fixed with three held out and a faithful bounded request envelope', () => {
  const scenarios = JSON.parse(readFileSync('research/retrieval-eval/frozen/scenarios.json', 'utf8'));
  expect(scenarios.filter((item: { split: string }) => item.split === 'screen')).toHaveLength(3);
  expect(scenarios.filter((item: { split: string }) => item.split === 'heldout')).toHaveLength(3);
  expect(readFileSync('research/retrieval-eval/scenarios.json', 'utf8')).toBe(readFileSync('research/retrieval-eval/frozen/scenarios.json', 'utf8'));
  const constrained = scenarios.filter((item: { input: { constraints: { noRealPeople: boolean; exclude: string } } }) => item.input.constraints.noRealPeople || item.input.constraints.exclude.trim()).length;
  expect(scenarios.length * 2 + constrained * 2).toBeLessThanOrEqual(budgets.asset);
  expect(scenarios.length * 5 + constrained * 2).toBeLessThanOrEqual(budgets.search);
});

async function withCapture(run: (capture: Capture, directory: string) => Promise<void>) {
  const directory = await mkdtemp('research/retrieval-eval/.capture-');
  try { await run(await Capture.load(directory), directory); }
  finally {
    const calls = path.join(directory, 'calls');
    for (const filename of await readdir(calls)) await unlink(path.join(calls, filename));
    await rmdir(calls);
    await rmdir(directory);
  }
}

test('completed evaluation captures replay across processes without another provider request', async () => {
  await withCapture(async (capture, directory) => {
    let invocations = 0;
    const invoke = async () => { invocations++; return ['source-a']; };
    expect(await capture.run('search', 'screen/places', { query: 'places' }, z.array(z.string()), invoke)).toEqual(['source-a']);
    const resumed = await Capture.load(directory);
    expect(await resumed.run('search', 'screen/places', { query: 'places' }, z.array(z.string()), invoke)).toEqual(['source-a']);
    expect(invocations).toBe(1);
    expect(resumed.counts().search).toBe(1);
  });
});

test('failed schema responses remain recorded and cannot trigger an implicit paid retry', async () => {
  await withCapture(async (capture, directory) => {
    let invocations = 0;
    const invoke = async () => { invocations++; return { wrong: true }; };
    await expect(capture.run('plan', 'screen/documents', {}, z.string(), invoke)).rejects.toThrow();
    const resumed = await Capture.load(directory);
    await expect(resumed.run('plan', 'screen/documents', {}, z.string(), invoke)).rejects.toThrow('no automatic retry');
    expect(invocations).toBe(1);
    expect(resumed.counts().plan).toBe(1);
    expect([...resumed.calls.values()][0].response).toEqual({ wrong: true });
  });
});

test('started and failed requests consume the hard ceiling before another dispatch', async () => {
  await withCapture(async capture => {
    for (let index = 0; index < budgets.asset; index++) capture.calls.set(`prior-${index}`, { id: `prior-${index}`, kind: 'asset', request: {}, status: index % 2 ? 'failed' : 'started', startedAt: '2026-11-09T00:00:00Z' });
    let invoked = false;
    await expect(capture.run('asset', 'screen/new', { text: 'new scene' }, z.string(), async () => { invoked = true; return 'asset'; })).rejects.toThrow('budget exhausted');
    expect(invoked).toBe(false);
  });
});

test('offline derivation cannot dispatch a missing paid request', async () => {
  await withCapture(async (_capture, directory) => {
    const replay = await Capture.load(directory, false, true);
    let invoked = false;
    await expect(replay.run('asset', 'missing', {}, z.string(), async () => { invoked = true; return 'asset'; })).rejects.toThrow('Offline replay is missing capture');
    expect(invoked).toBe(false);
    expect(replay.counts().asset).toBe(0);
  });
});

test('enrichment prioritizes list disagreement and never requests more than six unique IDs', () => {
  const common = ['one', 'two', 'three', 'four', 'five', 'six'];
  const arm = (id: string, selectedIds: string[]) => ({ id, plan: 'new', selectedIds, poolIds: selectedIds } satisfies Result['arms'][number]);
  const result: Result = { scenario: 'places', split: 'screen', oldPlan: { product: '', tagline: '', promise: '', question: '', visualQuery: '', terms: ['places', 'map'] }, newPlan: { product: '', tagline: '', promise: '', question: '', visualQuery: '', terms: ['places', 'map'], adjacentTerms: ['collections', 'favorites'], contextTerms: [] }, candidates: [], trace: {}, arms: [arm('A', common), arm('C', ['only-new', ...common.slice(0, 5)]), arm('O', ['ignore-order-arm'])] };
  const selected = enrichmentIds(result);
  expect(selected).toHaveLength(6);
  expect(new Set(selected).size).toBe(6);
  expect(selected.slice(0, 2).sort()).toEqual(['only-new', 'six']);
  expect(selected).not.toContain('ignore-order-arm');
});
