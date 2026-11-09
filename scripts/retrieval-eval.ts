import { createHash } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { contentSchema, createVisualAsset, searchContents, type Content } from '../server/oriane';
import { constraintsSchema } from '../shared/schema';
import { generateWithCodex } from '../server/ai/codex';
import type { CLIConfig } from '../server/ai/config';
import type { askAI } from '../server/ai';
import { buildResearchPlanPrompt, literalSearchContext } from '../server/prompts';
import { retrievalPlanSchema, retrieveCandidates, selectCandidates, type RetrievalDependencies } from '../server/retrieval';
import { buildResearchPlanPrompt as legacyPrompt } from '../research/retrieval-eval/frozen/prompts';
import { legacyDiscover, legacyPlanSchema, legacySelect } from '../research/retrieval-eval/baseline';

export const root = 'research/retrieval-eval';
export const digest = (text: string) => createHash('sha256').update(text).digest('hex');
export const budgets = { search: 36, asset: 16, full: 6, plan: 14, qualification: 18, judge: 9 };
export const planner: CLIConfig = { provider: 'codex', model: 'gpt-6.1-sol', effort: 'medium', timeoutMs: 240000 };
export const scenarioSchema = z.object({
  id: z.string(), split: z.enum(['screen', 'heldout']),
  input: z.object({ brief: z.string(), focus: z.string(), constraints: constraintsSchema, resources: z.array(z.string()) }),
  capabilities: z.array(z.string()), unsupported: z.array(z.string()), need: z.string(),
});
export type Scenario = z.infer<typeof scenarioSchema>;
const callSchema = z.object({
  id: z.string(), scope: z.string().optional(), retryOf: z.string().optional(), kind: z.enum(['search', 'asset', 'full', 'plan', 'qualification', 'judge']),
  request: z.unknown(), status: z.enum(['started', 'success', 'failed']),
  startedAt: z.string(), elapsedMs: z.number().optional(), response: z.unknown().optional(), error: z.string().optional(),
});
type Call = z.infer<typeof callSchema>;
export const armSchema = z.object({ id: z.string(), plan: z.enum(['old', 'new']), poolIds: z.array(z.string()), selectedIds: z.array(z.string()) });
export const resultSchema = z.object({
  scenario: z.string(), split: z.enum(['screen', 'heldout']), oldPlan: legacyPlanSchema.extend({ alternativeVisualQuery: z.string().optional() }), newPlan: retrievalPlanSchema.extend({ alternativeVisualQuery: z.string().optional() }),
  candidates: z.array(contentSchema), arms: z.array(armSchema), trace: z.unknown(),
});
export type Result = z.infer<typeof resultSchema>;

export async function save(filename: string, data: unknown) {
  const temporary = `${filename}.${process.pid}.pending`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`);
  await rename(temporary, filename);
}
export const exists = (filename: string) => Bun.file(filename).exists();
export const readJSON = async (filename: string): Promise<unknown> => JSON.parse(await readFile(filename, 'utf8'));

export class Capture {
  private constructor(readonly directory: string, readonly calls: Map<string, Call>, readonly retryFailedPlan: boolean, readonly replayOnly: boolean) {}
  static async load(directory: string, retryFailedPlan = false, replayOnly = false) {
    await mkdir(path.join(directory, 'calls'), { recursive: true });
    const rows = await Promise.all((await readdir(path.join(directory, 'calls'))).filter(file => file.endsWith('.json')).map(async file => callSchema.parse(await readJSON(path.join(directory, 'calls', file)))));
    return new Capture(directory, new Map(rows.map(row => [row.id, row])), retryFailedPlan, replayOnly);
  }
  counts() { return Object.fromEntries(Object.keys(budgets).map(kind => [kind, [...this.calls.values()].filter(call => call.kind === kind).length])); }
  async run<T>(kind: Call['kind'], scope: string, request: unknown, schema: z.ZodType<T>, invoke: () => Promise<unknown>): Promise<T> {
    let id = digest(JSON.stringify({ kind, scope, request }));
    let retryOf: string | undefined;
    const approvedFailure = '92f6090b5f5f60aa33f67b3ed3d9c9d6dab0650ec16c0ce4d67f35eb63f4b38b';
    if (kind === 'plan' && id === approvedFailure && this.calls.get(id)?.status === 'failed') {
      const retryId = digest(`${id}/authorized-retry-1`);
      if (this.retryFailedPlan || this.calls.has(retryId)) { retryOf = id; id = retryId; }
    }
    const previous = this.calls.get(id);
    if (previous) {
      if (previous.status !== 'success') throw new Error(`Request ${id} is ${previous.status}; no automatic retry. Inspect the capture.`);
      return schema.parse(previous.response);
    }
    if (this.replayOnly) throw new Error(`Offline replay is missing capture ${id}; no provider request was dispatched.`);
    if ([...this.calls.values()].filter(call => call.kind === kind).length >= budgets[kind]) throw new Error(`${kind} request budget exhausted.`);
    const call: Call = { id, scope, ...(retryOf ? { retryOf } : {}), kind, request, status: 'started', startedAt: new Date().toISOString() };
    this.calls.set(id, call);
    const filename = path.join(this.directory, 'calls', `${id}.json`);
    await save(filename, call);
    const started = performance.now();
    try {
      const raw = await invoke();
      call.response = raw;
      const response = schema.parse(raw);
      call.status = 'success';
      call.elapsedMs = Math.round(performance.now() - started);
      await save(filename, call);
      console.log(JSON.stringify({ kind, scope, status: call.status, elapsedMs: call.elapsedMs, counts: this.counts() }));
      return response;
    } catch (error) {
      call.status = 'failed';
      call.elapsedMs = Math.round(performance.now() - started);
      call.error = error instanceof Error ? error.message : String(error);
      await save(filename, call);
      throw error;
    }
  }
}

const sourceFiles = ['server/prompts.ts', 'server/retrieval.ts', 'server/research.ts', 'server/oriane.ts', 'shared/schema.ts', 'server/ai/codex.ts', 'server/ai/claude.ts', 'server/ai/process.ts'];
async function hashes(files: string[]) {
  return Object.fromEntries(await Promise.all(files.map(async file => [file, digest(await readFile(file, 'utf8'))])));
}
export async function prepare(directory: string, recordReviewFixes = false) {
  const original = z.record(z.string(), z.string()).parse(await readJSON(`${root}/frozen/source-hashes.json`));
  for (const [file, hash] of Object.entries(original)) {
    if (digest(await readFile(`${root}/frozen/${file}`, 'utf8')) !== hash) throw new Error(`Original baseline changed: ${file}`);
  }
  if (await readFile(`${root}/scenarios.json`, 'utf8') !== await readFile(`${root}/frozen/scenarios.json`, 'utf8')) throw new Error('Scenarios differ from the frozen set.');
  const production = await hashes(sourceFiles);
  const experiment = await hashes([`${root}/protocol.md`, `${root}/context-amendment.md`, `${root}/conditional-recovery.md`, `${root}/frozen/scenarios.json`, `${root}/baseline.ts`, `${root}/frozen/prompts.ts`]);
  const manifest = { version: 1, production, experiment, original, budgets, planner, judges: { codex: { model: 'gpt-6.1-sol', effort: 'high' }, claude: { model: 'opus', effort: 'high', resolution: 'alias, exact model not exposed' } }, createdAt: new Date().toISOString() };
  await mkdir(directory, { recursive: true });
  const filename = path.join(directory, 'manifest.json');
  if (await exists(filename)) {
    const previous = z.object({ production: z.record(z.string(), z.string()), experiment: z.record(z.string(), z.string()) }).parse(await readJSON(filename));
    if (JSON.stringify(previous.production) !== JSON.stringify(production) || JSON.stringify(previous.experiment) !== JSON.stringify(experiment)) {
      if (!recordReviewFixes) throw new Error('Frozen inputs changed; use a new run directory or the explicitly authorized pre-search refreeze.');
      const capture = await Capture.load(directory);
      if ([...capture.calls.values()].some(call => call.kind !== 'plan' || call.status !== 'failed')) throw new Error('Pre-search refreeze permits only the recorded failed planner preflight.');
      const archive = path.join(directory, 'manifest-before-review-fixes.json');
      if (await exists(archive)) throw new Error('Pre-search review fix already recorded.');
      await save(archive, await readJSON(filename));
      await mkdir(path.join(directory, 'sources-before-review-fixes'), { recursive: true });
      for (const file of sourceFiles) {
        const basename = file.replaceAll('/', '__');
        await writeFile(path.join(directory, 'sources-before-review-fixes', basename), await readFile(path.join(directory, 'sources', basename), 'utf8'));
        await writeFile(path.join(directory, 'sources', basename), await readFile(file, 'utf8'));
      }
      await save(filename, { ...manifest, amendment: 'Coordinator authorized final review fixes before any successful inference or search; planner ceiling13 preserves one sandbox preflight failure. Previous manifest and source copies retained.' });
    }
  } else {
    await mkdir(path.join(directory, 'sources'), { recursive: true });
    for (const file of sourceFiles) await writeFile(path.join(directory, 'sources', file.replaceAll('/', '__')), await readFile(file, 'utf8'));
    await save(filename, manifest);
  }
  return manifest;
}

function dependencies(capture: Capture, scope: string): RetrievalDependencies {
  const model: typeof askAI = async ({ prompt, schema, images = [] }) => {
    const request = { prompt, jsonSchema: z.toJSONSchema(schema, { target: 'draft-7' }), images };
    return capture.run('qualification', scope, { ...request, config: planner }, schema, () => generateWithCodex(request, planner));
  };
  return {
    askAI: model,
    createVisualAsset: text => capture.run('asset', scope, { text }, z.string(), () => createVisualAsset(text)),
    searchContents: (body, sort, limit, projection) => {
      if (projection === 'full' && limit > 6) throw new Error('Full projection is limited to six IDs.');
      return capture.run(projection === 'full' ? 'full' : 'search', scope, { body, sort, limit, projection }, z.array(contentSchema), () => searchContents(body, sort, limit, projection));
    },
  };
}

export async function runScenario(scenario: Scenario, capture: Capture, plansOnly = false, pairedPlans?: Pick<Result, 'oldPlan' | 'newPlan'>) {
  const constrained = scenario.input.constraints.noRealPeople || Boolean(scenario.input.constraints.exclude.trim());
  async function plan<T>(variant: string, prompt: string, schema: z.ZodType<T>) {
    const request = { prompt, jsonSchema: z.toJSONSchema(schema, { target: 'draft-7' }), images: [] };
    return capture.run('plan', `${scenario.id}/${variant}`, { ...request, config: planner }, schema, () => generateWithCodex(request, planner));
  }
  const oldSchema = constrained ? legacyPlanSchema.extend({ alternativeVisualQuery: z.string().min(1).max(300) }) : legacyPlanSchema;
  const newSchema = constrained ? retrievalPlanSchema.extend({ alternativeVisualQuery: z.string().min(1).max(300) }) : retrievalPlanSchema;
  const generateOld = () => plan('old', legacyPrompt(scenario.input), oldSchema);
  const generateNew = () => plan('new', buildResearchPlanPrompt(scenario.input), newSchema);
  const [first, second] = Number.parseInt(digest(scenario.id).slice(0, 2), 16) % 2 ? [generateNew, generateOld] : [generateOld, generateNew];
  const plans = pairedPlans ? [pairedPlans.oldPlan, pairedPlans.newPlan] : [await first(), await second()];
  const oldPlan = plans.find(item => !('adjacentTerms' in item));
  const newPlan = plans.find(item => 'adjacentTerms' in item);
  if (!oldPlan || !newPlan || !('adjacentTerms' in newPlan)) throw new Error('Missing paired plans.');
  const newParsed = newSchema.parse(newPlan);
  if (plansOnly) return;
  const old = await legacyDiscover({ plan: oldPlan, constrained, deps: dependencies(capture, `${scenario.id}/old`) });
  const deps = dependencies(capture, `${scenario.id}/new`);
  const next = await retrieveCandidates({ brief: scenario.input.brief, plan: newParsed, constraints: scenario.input.constraints, deps, onProgress: detail => console.log(`${scenario.id}: ${detail}`) });
  const captured = [...capture.calls.values()].filter(call => call.status === 'success' && call.kind === 'search' && (call.scope === `${scenario.id}/old` || call.scope === `${scenario.id}/new`));
  const all = [...new Map(captured.flatMap(call => z.array(contentSchema).parse(call.response)).map(row => [row.id, row])).values()];
  const lookup = new Map(all.map(row => [row.id, row]));
  const rows = (ids: string[]) => ids.map(id => { const row = lookup.get(id); if (!row) throw new Error(`Missing captured source ${id}.`); return row; });
  const initial = next.trace.queries.filter(query => query.lane !== 'expanded-text' && query.lane !== 'refined-text');
  const requestSchema = z.object({ body: z.unknown(), sort: z.string(), limit: z.number(), projection: z.string() });
  const lane = (name: string, count: number) => {
    const query = initial.find(query => query.lane === name);
    if (!query) return [];
    const call = captured.find(call => {
      if (call.scope !== `${scenario.id}/new`) return false;
      const request = requestSchema.parse(call.request);
      return request.sort === query.sort && request.limit === query.limit && JSON.stringify(request.body) === JSON.stringify(query.body);
    });
    if (!call) throw new Error(`Missing captured lane ${name}.`);
    return z.array(contentSchema).parse(call.response).slice(0, count);
  };
  const small = { visual: lane('direct-visual', 6), lexical: lane('direct-text', 6), targeted: lane('constraint-visual', 4), constrained };
  const smallPool = [...new Map([...small.visual, ...small.lexical, ...small.targeted].map(row => [row.id, row])).values()];
  const initialPool = [...new Map([...lane('direct-visual', 12), ...lane('direct-text', 12), ...lane('constraint-visual', 8)].map(row => [row.id, row])).values()];
  const initialIds = new Set(initialPool.map(row => row.id));
  const initialDecisions = next.trace.decisions.filter(decision => initialIds.has(decision.id));
  const baselineIds = constrained ? initial.filter(query => query.lane !== 'constraint-visual').flatMap(query => query.resultIds) : [];
  const targetedIds = initial.filter(query => query.lane === 'constraint-visual').flatMap(query => query.resultIds);
  const c = selectCandidates({ candidates: initialPool, decisions: initialDecisions, baselineIds, targetedIds });
  const smallIds = new Set(smallPool.map(row => row.id));
  const cSmall = selectCandidates({ candidates: smallPool, decisions: initialDecisions.filter(decision => smallIds.has(decision.id)), baselineIds: baselineIds.filter(id => smallIds.has(id)), targetedIds: targetedIds.filter(id => smallIds.has(id)) });
  const arm = (id: string, variant: 'old' | 'new', pool: Content[], selected: Content[]) => ({ id, plan: variant, poolIds: pool.map(row => row.id), selectedIds: selected.map(row => row.id) });
  const cIds = new Set(c.map(row => row.id));
  const arms = [
    arm('A', 'old', [...old.visual, ...old.lexical, ...old.targeted], old.selected),
    arm('B', 'new', smallPool, legacySelect(small)), arm('C-small', 'new', smallPool, cSmall),
    arm('C', 'new', initialPool, c), arm('D', 'new', rows(next.trace.queries.flatMap(query => query.resultIds)), next.selected),
    arm('O', 'new', initialPool, initialPool.filter(row => cIds.has(row.id))),
  ];
  const used = new Set(arms.flatMap(item => item.poolIds));
  return { scenario: scenario.id, split: scenario.split, oldPlan, newPlan: newParsed, candidates: all.filter(row => used.has(row.id)), arms, trace: next.trace };
}

export async function runSplit(directory: string, split: 'screen' | 'heldout', plansOnly = false, retryFailedPlan = false) {
  await prepare(directory);
  if (split === 'heldout' && !(await exists(path.join(directory, 'screen-seal.json')))) throw new Error('Seal the screening decision before opening held-out calls.');
  const scenarios = z.array(scenarioSchema).parse(await readJSON(`${root}/frozen/scenarios.json`)).filter(scenario => scenario.split === split);
  const capture = await Capture.load(directory, retryFailedPlan);
  for (const scenario of scenarios) {
    const filename = path.join(directory, `${scenario.id}.json`);
    if (await exists(filename)) { resultSchema.parse(await readJSON(filename)); continue; }
    console.log(`Starting ${split} ${scenario.id}`);
    const result = await runScenario(scenario, capture, plansOnly);
    if (!result) { console.log(`Captured paired plans for ${scenario.id}`); continue; }
    await save(filename, result);
    console.log(`Saved ${scenario.id}`);
  }
  if (!plansOnly) await save(path.join(directory, `${split}-complete.json`), { scenarios: scenarios.map(scenario => scenario.id), counts: capture.counts() });
}

async function contextScreen(directory: string, previousDirectory: string) {
  await prepare(directory);
  await mkdir(path.join(directory, 'calls'), { recursive: true });
  for (const filename of (await readdir(path.join(previousDirectory, 'calls'))).filter(file => file.endsWith('.json'))) {
    const call = callSchema.parse(await readJSON(path.join(previousDirectory, 'calls', filename)));
    if (call.kind === 'judge') continue;
    const target = path.join(directory, 'calls', filename);
    if (!(await exists(target))) await save(target, call);
  }
  const capture = await Capture.load(directory);
  const scenarios = z.array(scenarioSchema).parse(await readJSON(`${root}/frozen/scenarios.json`)).filter(row => row.split === 'screen');
  const previous = await Promise.all(scenarios.map(async row => resultSchema.parse(await readJSON(path.join(previousDirectory, `${row.id}.json`)))));
  const schema = z.object({ contexts: z.array(z.object({ id: z.string(), contextTerms: z.array(z.string()).min(2).max(8) })) });
  const prompt = `Generate subject context anchors for literal video search. Do not use tools or inspect files. ${literalSearchContext}\nReturn exactly one context array for each supplied ID. Ground these search anchors in the original briefs; no extra product capabilities. Inputs: ${JSON.stringify(scenarios.map(row => ({ id: row.id, brief: row.input.brief, focus: row.input.focus, taskTerms: previous.find(item => item.scenario === row.id)?.newPlan.terms })))}`;
  const request = { prompt, jsonSchema: z.toJSONSchema(schema, { target: 'draft-7' }), images: [] };
  const contexts = await capture.run('plan', 'screen/context-anchors', { ...request, config: planner }, schema, () => generateWithCodex(request, planner));
  if (contexts.contexts.length !== scenarios.length || scenarios.some(row => contexts.contexts.filter(context => context.id === row.id).length !== 1)) throw new Error('Context planner returned missing, duplicate or unknown scenarios.');
  await save(path.join(directory, 'context-anchors.json'), { ...contexts, previousDirectory, prompt });
  for (const scenario of scenarios) {
    const filename = path.join(directory, `${scenario.id}.json`);
    if (await exists(filename)) continue;
    const old = previous.find(row => row.scenario === scenario.id);
    const context = contexts.contexts.find(row => row.id === scenario.id);
    if (!old || !context) throw new Error('Missing preserved screening plan.');
    const result = await runScenario(scenario, capture, false, { oldPlan: old.oldPlan, newPlan: { ...old.newPlan, contextTerms: context.contextTerms } });
    await save(filename, result);
    console.log(`Saved contextual screening ${scenario.id}`);
  }
  await save(path.join(directory, 'screen-complete.json'), { scenarios: scenarios.map(row => row.id), counts: capture.counts(), previousDirectory, amendment: `${root}/context-amendment.md` });
}

export function enrichmentIds(result: Result): string[] {
  const arms = result.arms.filter(arm => arm.id !== 'O');
  const lists = arms.map(arm => [...new Set(arm.selectedIds.slice(0, 6))]);
  const union = [...new Set(lists.flat())];
  return union.sort((a, b) => {
    const coverage = (id: string) => lists.filter(list => list.includes(id)).length;
    const rank = (id: string) => Math.min(...lists.map(list => list.includes(id) ? list.indexOf(id) : Infinity));
    return Number(coverage(a) === lists.length) - Number(coverage(b) === lists.length) || rank(a) - rank(b) || digest(a).localeCompare(digest(b));
  }).slice(0, 6);
}

export async function enrich(directory: string, split: 'screen' | 'heldout') {
  await prepare(directory);
  if (!(await exists(path.join(directory, `${split}-complete.json`)))) throw new Error(`Complete ${split} captures before enrichment.`);
  const scenarios = z.array(scenarioSchema).parse(await readJSON(`${root}/frozen/scenarios.json`)).filter(scenario => scenario.split === split);
  const capture = await Capture.load(directory);
  const output = [];
  for (const scenario of scenarios) {
    const result = resultSchema.parse(await readJSON(path.join(directory, `${scenario.id}.json`)));
    const ids = enrichmentIds(result);
    const full = ids.length ? await dependencies(capture, `${scenario.id}/enrich`).searchContents({ operator: 'and', filters: { id: { includes: ids } } }, 'publishedAt:desc', ids.length, 'full') : [];
    if (full.some(row => !ids.includes(row.id)) || new Set(full.map(row => row.id)).size !== full.length) throw new Error('Full projection returned invented or duplicate IDs.');
    output.push({ scenario: scenario.id, requestedIds: ids, missingIds: ids.filter(id => !full.some(row => row.id === id)), candidates: full, evidenceKind: 'full-text-and-indexed-frame-metadata', selectionPolicy: 'selected-list disagreement first, best rank next, SHA256 tiebreak; exclude order-only arm' });
  }
  await save(path.join(directory, `enriched-${split}.json`), output);
  return output;
}

async function derive(directory: string, split: 'screen' | 'heldout') {
  await prepare(directory);
  if (!(await exists(path.join(directory, `${split}-complete.json`)))) throw new Error('Complete captures before offline derivation.');
  const capture = await Capture.load(directory, false, true);
  const scenarios = z.array(scenarioSchema).parse(await readJSON(`${root}/frozen/scenarios.json`)).filter(scenario => scenario.split === split);
  for (const scenario of scenarios) {
    const filename = path.join(directory, `${scenario.id}.json`);
    const previous = resultSchema.parse(await readJSON(filename));
    const derived = await runScenario(scenario, capture);
    if (!derived) throw new Error('No derived result.');
    if (JSON.stringify(previous.arms) !== JSON.stringify(derived.arms)) {
      const archive = path.join(directory, `${scenario.id}.before-derivation.json`);
      if (await exists(archive)) throw new Error('A derivation archive already exists; inspect it before another change.');
      await save(archive, previous);
    }
    await save(filename, derived);
    console.log(`Re-derived ${scenario.id} offline from immutable provider captures.`);
  }
}

async function main() {
  const [mode = 'prepare', directory = `${root}/runs/topical-v1`, ...flags] = process.argv.slice(2);
  if (!path.resolve(directory).startsWith(`${path.resolve(root)}/`)) throw new Error('Run directory must be inside research/retrieval-eval/.');
  if (mode === 'prepare' || mode === 'refreeze') {
    const manifest = await prepare(directory, mode === 'refreeze');
    const capture = await Capture.load(directory);
    console.log(JSON.stringify({ status: 'prepared-offline', production: manifest.production, budgets, used: capture.counts(), planner }, null, 2));
    return;
  }
  if (mode === 'seal') {
    const manifest = await prepare(directory);
    if (!(await exists(path.join(directory, 'screen-complete.json')))) throw new Error('Complete screening before sealing.');
    const note = flags.find(flag => !flag.startsWith('--'));
    if (!note?.trim()) throw new Error('Supply a concrete screening decision note.');
    const filename = path.join(directory, 'screen-seal.json');
    if (await exists(filename)) throw new Error('Screening decision already sealed.');
    await save(filename, { production: manifest.production, note, sealedAt: new Date().toISOString(), screenHashes: await hashes((await readdir(directory)).filter(file => file.endsWith('.json')).map(file => path.join(directory, file))) });
    return;
  }
  if (mode === 'derive') {
    const lockPath = path.join(directory, 'live.lock');
    const lock = await open(lockPath, 'wx');
    try { await derive(directory, flags.includes('--heldout') ? 'heldout' : 'screen'); }
    finally { await lock.close(); await unlink(lockPath); }
    return;
  }
  if (!['screen', 'heldout', 'enrich', 'context-screen'].includes(mode)) throw new Error('Use prepare, screen, seal, heldout, context-screen or enrich.');
  if (!flags.includes('--live')) throw new Error('Live calls require the explicit --live flag and coordinator authorization.');
  const lockPath = path.join(directory, 'live.lock');
  const lock = await open(lockPath, 'wx');
  try {
    if (mode === 'context-screen') {
      const previous = flags.find(flag => !flag.startsWith('--'));
      if (!previous) throw new Error('Supply the preserved first screening run directory.');
      await contextScreen(directory, previous);
    } else if (mode === 'enrich') await enrich(directory, flags.includes('--heldout') ? 'heldout' : 'screen');
    else await runSplit(directory, mode === 'screen' ? 'screen' : 'heldout', flags.includes('--plans-only'), flags.includes('--retry-failed-plan'));
  }
  finally { await lock.close(); await unlink(lockPath); }
}

if (import.meta.main) await main();
