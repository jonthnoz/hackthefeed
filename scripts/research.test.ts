import { expect, spyOn, test } from 'bun:test';
import { mkdtemp, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { createVisualAsset, searchContents, toReference } from '../server/oriane';
import { jobs, readStudy, startResearch } from '../server/research';
import { creativeAnalysisSchema, researchInputSchema, type Job } from '../shared/schema';
import { assessmentsSchema } from '../server/constraints';
import { candidateDecisionsSchema, retrievalPlanSchema } from '../server/retrieval';

const source = {
  id: 'cnt_fixture', profileHandle: 'source_creator', platform: 'youtube', platformId: 'source-video',
  caption: 'Save a place from a video', title: 'An observed video', thumbnailMediaUrl: 'https://media.example/thumbnail.webp',
  publishedAt: '2026-11-07', viewsCount: 12345, likesCount: 400, commentsCount: 30, sharesCount: 20,
  interactionsCount: 450, engagementRatePerViews: 0.036,
  media: [{ duration: 24, transcript: 'Save this place for your next trip.', frames: [
    { url: 'https://media.example/frame.webp', timestampSeconds: 4.5, onScreenTextRegions: [{ text: 'Save this place' }] },
  ] }],
};
const plan = retrievalPlanSchema.parse({
  product: 'Saved places', tagline: 'Find your saved places', promise: 'Turn saved videos into places',
  question: 'Where did you save it?', visualQuery: 'A traveler saves a place on a map', terms: ['saved places', 'travel map'],
  adjacentTerms: ['trip planning', 'travel bookmarks'],
});
const analysis = creativeAnalysisSchema.parse({
  overview: 'A place is saved from a video.', searchNotes: [],
  qualifications: [{ id: source.id, relevance: 'adjacent', reason: 'Place bookmarking is a nearby task; adapt it to importing saved videos.', format: 'Demonstration', hook: 'Save this place', title: 'Saving a place' }],
  angles: [{ id: 'angle', title: 'Find it later', label: 'Utility', description: 'Save a place.', whyItFits: 'Adapt place bookmarking to the stated saved-video workflow.', evidence: 'The source says to save a place.', referenceIds: [source.id], suggestedHook: 'Where did you save it?', visualDirection: 'Show a saved place.', proximity: 'direct' }],
  storyboard: { title: 'A saved place', premise: 'Save a place from a video.', hook: 'Find it later', scenes: [{ time: '0-5s', visual: 'Show a place.', voiceover: 'Save this place.' }], callToAction: 'Save a place', sourceIds: [source.id] },
});
const aiRequestSchema = z.object({ messages: z.array(z.object({ content: z.array(z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('image_url'), image_url: z.object({ url: z.string() }) }),
])) })), response_format: z.object({ json_schema: z.object({ schema: z.object({ properties: z.record(z.string(), z.unknown()) }) }) }) });

async function waitForJob(id: string): Promise<Exclude<Job, { status: 'running' }>> {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const job = jobs.get(id);
    if (job && job.status !== 'running') return job;
    await Bun.sleep(5);
  }
  throw new Error(`Research did not finish: ${JSON.stringify(jobs.get(id))}`);
}

async function runConstraintScenario(scenario: string) {
  const candidates = ['excluded', 'uncertain', 'allowed', 'incomplete', 'irrelevant'].map((id, index) => ({
    ...source, id: `cnt_${id}`, profileHandle: `${id}_creator`,
    caption: `${id}: save a ${['restaurant', 'museum', 'walking route', 'hotel', 'football pitch'][index]} from a video`,
    interactionsCount: id === 'irrelevant' ? 99999999 : 1000 - index,
    media: [{ ...source.media[0], transcript: `${id}: ${['A presenter bookmarks a restaurant.', 'A reflection may show someone at a museum.', 'Hands import a walking route into a map.', 'A hotel pin appears, but the middle frame is missing.', 'A viral football celebration has no place-saving workflow.'][index]}`, frames: [0, 1, 2, 3, 4].map(timestampSeconds => ({
      url: `https://media.example/${id}-${timestampSeconds}.webp`, timestampSeconds, onScreenTextRegions: timestampSeconds === 1 ? [{ text: id }] : [],
    })) }],
  }));
  const alternativeVisualQuery = 'Saved travel videos become pins in a map app screen recording';
  const downloads: string[] = [];
  let qualificationCalls = 0;
  let assessmentCalls = 0;
  let analysisCalls = 0;
  let assets = 0;
  const stagePrompts = new Map<string, string>();
  const transport = async (input: Parameters<typeof globalThis.fetch>[0], init?: Parameters<typeof globalThis.fetch>[1]) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.href === 'https://project.example/about') return new Response('<title>Project facts</title><p>Voice settings control pronunciation, not translation.</p>', { headers: { 'Content-Type': 'text/html' } });
    if (url.hostname === 'media.example') {
      downloads.push(url.pathname);
      return url.pathname === '/incomplete-2.webp' ? new Response('', { status: 404 }) : new Response(url.pathname);
    }
    if (url.hostname === 'connect.oriane.xyz') {
      if (url.pathname === '/rest/assets') {
        assets++;
        expect(String(init?.body)).toContain(assets === 1 ? plan.visualQuery : alternativeVisualQuery);
        return Response.json({ data: { id: `asset-${assets}` } });
      }
      if (url.pathname === '/rest/contents/search') {
        const body = String(init?.body);
        if (body.includes('asset-2')) return Response.json({ data: { results: [candidates[2], candidates[3]] } });
        if (body.includes('cnt_')) return Response.json({ data: { results: [...candidates].reverse() } });
        return Response.json({ data: { results: [candidates[0], candidates[1], candidates[4]] } });
      }
    }
    if (url.href === 'http://127.0.0.1:1/v1/chat/completions') {
      const request = aiRequestSchema.parse(JSON.parse(String(init?.body)));
      const content = request.messages[0].content;
      const properties = request.response_format.json_schema.schema.properties;
      const prompt = content.filter(item => item.type === 'text').map(item => item.text).join('\n');
      const images = content.filter(item => item.type === 'image_url');
      let result: unknown;
      if ('visualQuery' in properties) {
        stagePrompts.set('planning', prompt);
        expect(prompt).toContain('positive observable alternative');
        result = { ...plan, alternativeVisualQuery };
      } else if ('decisions' in properties) {
        stagePrompts.set('qualification', prompt);
        qualificationCalls++;
        expect(images).toEqual([]);
        result = candidateDecisionsSchema.parse({ decisions: candidates.map(candidate => ({
          id: candidate.id, relevance: candidate.id === 'cnt_irrelevant' ? 'mechanism' : 'direct',
          reason: candidate.media[0].transcript, duplicateOf: null,
        })) });
      } else if ('assessments' in properties) {
        stagePrompts.set('assessment', prompt);
        assessmentCalls++;
        expect(prompt).toContain('Hands and fingers alone');
        expect(prompt).toContain('regardless of whether generated by AI');
        expect(prompt).toContain('relevant=false');
        expect(prompt).toContain(plan.promise);
        expect(prompt).toContain('logos');
        expect(images).toHaveLength(14);
        result = assessmentsSchema.parse({ assessments: candidates.map(candidate => ({
          id: candidate.id, relevant: candidate.id !== 'cnt_irrelevant',
          status: scenario === 'constraints-uncertain-only' ? 'uncertain' : candidate.id === 'cnt_excluded' || candidate.id === 'cnt_irrelevant' ? 'excluded' : candidate.id === 'cnt_uncertain' || (scenario === 'constraints-no-fits' && candidate.id === 'cnt_allowed') ? 'uncertain' : 'fits',
          reason: candidate.id === 'cnt_excluded' ? 'A visible presenter violates the constraint.' : 'Sampled frames assessed; review the original video.',
        })) });
      } else {
        stagePrompts.set('analysis', prompt);
        analysisCalls++;
        expect(scenario).not.toBe('constraints-no-fits');
        expect(scenario).not.toBe('constraints-uncertain-only');
        expect(prompt).toContain('cnt_allowed');
        for (const id of ['excluded', 'uncertain', 'incomplete', 'irrelevant']) expect(prompt).not.toContain(`cnt_${id}`);
        expect(images).toHaveLength(3);
        for (const [index, image] of images.entries()) {
          expect(Buffer.from(image.image_url.url.split(',')[1], 'base64').toString()).toBe(`/allowed-${[0, 2, 4][index]}.webp`);
        }
        result = {
          ...analysis, qualifications: [{ ...analysis.qualifications[0], id: 'cnt_allowed', relevance: scenario === 'constraints-late-irrelevant' ? 'irrelevant' : 'direct' }],
          angles: [{ ...analysis.angles[0], referenceIds: ['cnt_allowed'] }, { ...analysis.angles[0], id: 'contaminated', referenceIds: ['cnt_allowed', 'cnt_excluded'] }],
          storyboard: { ...analysis.storyboard, sourceIds: scenario === 'constraints-contaminated' ? ['cnt_allowed', 'cnt_uncertain'] : scenario === 'constraints-unsupported-storyboard' ? ['cnt_invented'] : scenario === 'constraints-empty-storyboard' ? [] : ['cnt_allowed'] },
        };
      }
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] });
    }
    throw new Error(`Unexpected request: ${url.href}`);
  };
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(Object.assign(transport, { preconnect: globalThis.fetch.preconnect }));
  try {
    const input = researchInputSchema.parse({ brief: 'An app that turns saved videos into places to visit.', constraints: { noRealPeople: scenario !== 'constraints-freeform', exclude: 'logos' }, resources: scenario === 'constraints-project-context' ? ['https://project.example/about'] : [] });
    const job = await waitForJob((await startResearch(input)).id);
    if (job.status !== 'complete') throw new Error(job.message);
    const study = await readStudy(job.studyId);
    if (scenario === 'constraints-project-context') {
      expect([...stagePrompts.keys()].sort()).toEqual(['analysis', 'assessment', 'planning', 'qualification']);
      for (const [stage, prompt] of stagePrompts) {
        expect(prompt, `${stage} must retain loaded product facts`).toContain('Voice settings control pronunciation, not translation.');
        expect(prompt, `${stage} must retain the original brief authority`).toContain('The original user brief and explicit human clarifications take precedence');
      }
      expect(study.brief).toBe(input.brief);
      expect(study.resources).toEqual(input.resources);
    }
    expect(study.constraints).toEqual(input.constraints);
    expect(study.uncertainReferences.map(reference => reference.id)).toContain('cnt_incomplete');
    expect(study.constraintAssessments.cnt_incomplete.status).toBe('uncertain');
    expect(study.constraintAssessments.cnt_irrelevant).toBeUndefined();
    const allIds = [...study.references, ...study.excludedReferences, ...study.uncertainReferences].map(reference => reference.id);
    expect(allIds.sort()).toEqual(scenario === 'constraints-late-irrelevant' ? ['cnt_excluded', 'cnt_incomplete', 'cnt_uncertain'] : ['cnt_allowed', 'cnt_excluded', 'cnt_incomplete', 'cnt_uncertain']);
    expect(study.searchNotes.join(' ')).toContain('Review each original video');
    expect(study.searchNotes.join(' ')).toContain('not a controlled benchmark');
    expect(assets).toBe(2);
    expect(qualificationCalls).toBeGreaterThanOrEqual(1);
    expect(qualificationCalls).toBeLessThanOrEqual(2);
    expect(assessmentCalls).toBe(1);
    expect(downloads).toHaveLength(15);
    expect(downloads.every(url => /-(0|2|4)\.webp$/.test(url))).toBe(true);
    if (scenario === 'constraints-no-fits' || scenario === 'constraints-uncertain-only' || scenario === 'constraints-late-irrelevant') {
      expect(analysisCalls).toBe(scenario === 'constraints-late-irrelevant' ? 1 : 0);
      expect(study.searchNotes.join(' ')).toContain('0 fit the sampled evidence');
      expect(study.references).toEqual([]);
      expect(study.angles).toEqual([]);
      expect(study.storyboard.scenes).toEqual([]);
      expect(study.storyboard.sourceIds).toEqual([]);
      if (scenario === 'constraints-uncertain-only') expect(study.excludedReferences).toEqual([]);
    } else {
      expect(analysisCalls).toBe(1);
      expect(study.references.map(reference => reference.id)).toEqual(['cnt_allowed']);
      expect(study.excludedReferences.map(reference => reference.id)).toEqual(['cnt_excluded']);
      expect(study.angles.map(angle => angle.referenceIds)).toEqual([['cnt_allowed']]);
      const unsupportedStoryboard = ['constraints-contaminated', 'constraints-unsupported-storyboard', 'constraints-empty-storyboard'].includes(scenario);
      expect(study.storyboard.sourceIds).toEqual(unsupportedStoryboard ? [] : ['cnt_allowed']);
      if (unsupportedStoryboard) expect(study.storyboard.scenes).toEqual([]);
    }
    expect(await Bun.file(`data/studies/${job.studyId}.json`).json()).toEqual(study);
    expect(await readdir('frames')).toEqual([]);
  } finally { fetch.mockRestore(); }
}

async function runScenario(scenario: string) {
  let assetCalls = 0;
  let searchCalls = 0;
  let planCalls = 0;
  let analysisCalls = 0;
  let qualificationCalls = 0;
  let fullCalls = 0;
  let resourceCalls = 0;
  const contextStages = new Set<string>();
  const frameDirectories = new Set<string>();
  const transport = async (input: Parameters<typeof globalThis.fetch>[0], init?: Parameters<typeof globalThis.fetch>[1]) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.href === 'https://project.example/about') {
      resourceCalls++;
      return new Response('<title>Project facts</title><p>Voice settings control pronunciation, not translation.</p>', { headers: { 'Content-Type': 'text/html' } });
    }
    if (url.href === source.media[0].frames[0].url) return new Response('downloaded frame');
    if (url.hostname === 'connect.oriane.xyz') {
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer fixture-only');
      expect(init?.method).toBe('POST');
      if (url.pathname === '/rest/assets') return Response.json({ data: { id: `asset-${++assetCalls}` } });
      if (url.pathname === '/rest/contents/search') {
        searchCalls++;
        if (url.searchParams.get('projection') === 'full') fullCalls++;
        return Response.json({ data: { results: [{ ...source, viewsCount: scenario === 'oriane' ? searchCalls : source.viewsCount }] } });
      }
    }
    if (url.href === 'http://127.0.0.1:1/v1/chat/completions') {
      const request = aiRequestSchema.parse(JSON.parse(String(init?.body)));
      const content = request.messages[0].content;
      const prompt = content.filter(item => item.type === 'text').map(item => item.text).join(' ');
      const properties = request.response_format.json_schema.schema.properties;
      const stage = 'visualQuery' in properties ? 'planning' : 'decisions' in properties ? 'qualification' : 'analysis';
      if (scenario === 'project-context') {
        expect(prompt).toContain('Voice settings control pronunciation, not translation.');
        expect(prompt).toContain('The original user brief and explicit human clarifications take precedence');
        contextStages.add(stage);
      }
      const images = content.filter(item => item.type === 'image_url');
      let result: unknown;
      if (stage === 'analysis') {
        analysisCalls++;
        expect(prompt).toContain('original brief is the authority');
        expect(prompt).toContain('closest to the original brief FIRST');
        expect(prompt).toContain("separate from source relevance");
        const angleOutput = z.object({ items: z.object({ required: z.array(z.string()) }) }).parse(properties.angles);
        expect(angleOutput.items.required).toContain('proximity');
        expect(images).toHaveLength(1);
        expect(images[0].image_url.url.split(',')[1]).toBe(Buffer.from('downloaded frame').toString('base64'));
        for (const directory of await readdir('frames')) {
          frameDirectories.add(directory);
          expect(path.isAbsolute(path.join(tmpdir(), directory))).toBe(true);
        }
        if (scenario === 'failure') return new Response('Analysis failed', { status: 500 });
        result = analysis;
      } else if (stage === 'qualification') {
        qualificationCalls++;
        expect(images).toEqual([]);
        result = { decisions: [{ id: source.id, relevance: 'adjacent', reason: 'The source bookmarks places for a trip.', duplicateOf: null }] };
      } else {
        planCalls++;
        expect(images).toEqual([]);
        result = plan;
      }
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] });
    }
    throw new Error(`Unexpected request: ${url.href}`);
  };
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(Object.assign(transport, { preconnect: globalThis.fetch.preconnect }));
  try {
    if (scenario === 'oriane') {
      expect(await createVisualAsset(plan.visualQuery)).toBe('asset-1');
      expect(await createVisualAsset(plan.visualQuery)).toBe('asset-2');
      const first = await searchContents({ query: 'same' }, 'publishedAt:desc', 6, 'full');
      const second = await searchContents({ query: 'same' }, 'publishedAt:desc', 6, 'full');
      expect(first[0].viewsCount).toBe(1);
      expect(second[0].viewsCount).toBe(2);
      expect(toReference(second[0])).toMatchObject({
        id: source.id, creator: source.profileHandle, url: 'https://www.youtube.com/watch?v=source-video',
        thumbnail: source.thumbnailMediaUrl, caption: source.caption, publishedAt: source.publishedAt,
        views: 2, likes: 400, comments: 30, shares: 20, interactions: 450, engagementRate: 0.036,
        duration: 24, transcript: source.media[0].transcript,
        frames: [{ url: source.media[0].frames[0].url, seconds: 4.5, text: 'Save this place' }],
      });
      expect((await readdir('.')).sort()).toEqual(['frames']);
      return;
    }
    const input = researchInputSchema.parse({ brief: 'An app that turns saved videos into places to visit.', resources: scenario === 'project-context' ? ['https://project.example/about'] : [] });
    const first = await startResearch(input);
    if (scenario === 'failure') {
      expect(await waitForJob(first.id)).toMatchObject({ status: 'error', message: expect.stringContaining('HTTP 500') });
      expect(analysisCalls).toBe(1);
      expect(frameDirectories.size).toBe(1);
      expect(await readdir('frames')).toEqual([]);
      expect((await readdir('.')).sort()).toEqual(['frames']);
      return;
    }
    const second = await startResearch(input);
    expect(first.status).toBe('running');
    expect(second.status).toBe('running');
    expect(first.id).not.toBe(second.id);
    const completed = await Promise.all([waitForJob(first.id), waitForJob(second.id)]);
    const third = await startResearch(input);
    expect(third.status).toBe('running');
    completed.push(await waitForJob(third.id));
    const ids: string[] = [];
    for (const job of completed) {
      if (job.status !== 'complete') throw new Error(job.message);
      expect(job.studyId).toMatch(/^study-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(Object.keys(job).sort()).toEqual(['id', 'status', 'studyId']);
      const study = await readStudy(job.studyId);
      expect(study.id).toBe(job.studyId);
      expect(study.brief).toBe(input.brief);
      if (scenario === 'project-context') {
        expect(study.resources).toEqual(input.resources);
        expect(study.projectSources[0]).toMatchObject({ url: input.resources[0], status: 'loaded', title: 'Project facts' });
      }
      expect(study.references[0]).toMatchObject({
        url: 'https://www.youtube.com/watch?v=source-video', thumbnail: source.thumbnailMediaUrl,
        creator: source.profileHandle, views: 12345, interactions: 450, transcript: source.media[0].transcript,
        frames: [{ url: source.media[0].frames[0].url, seconds: 4.5, text: 'Save this place' }],
      });
      expect(study.references[0].relevance).toBe('adjacent');
      expect(study.angles[0]).toMatchObject({ proximity: 'direct', referenceIds: [source.id] });
      expect(study.retrievalTrace).toMatchObject({ selectedIds: [source.id], candidateCount: 1, expanded: true });
      expect(await Bun.file(`data/studies/${job.studyId}.json`).json()).toEqual(study);
      ids.push(job.studyId);
    }
    expect(new Set(ids).size).toBe(3);
    expect((await readdir('data/studies')).sort()).toEqual(ids.map(id => `${id}.json`).sort());
    expect(planCalls).toBe(3);
    expect(analysisCalls).toBe(3);
    expect(qualificationCalls).toBeGreaterThanOrEqual(3);
    expect(qualificationCalls).toBeLessThanOrEqual(6);
    expect(assetCalls).toBe(3);
    expect(fullCalls).toBe(3);
    expect(searchCalls).toBeGreaterThanOrEqual(9);
    if (scenario === 'project-context') {
      expect(resourceCalls).toBe(3);
      expect([...contextStages].sort()).toEqual(['analysis', 'planning', 'qualification']);
    }
    expect(frameDirectories.size).toBe(3);
    expect(await readdir('frames')).toEqual([]);
    expect((await readdir('.')).sort()).toEqual(['data', 'frames']);
  } finally {
    fetch.mockRestore();
  }
}

const scenario = process.env.ANGLE_RESEARCH_SCENARIO;
if (scenario) {
  if (scenario.startsWith('constraints-')) await runConstraintScenario(scenario);
  else await runScenario(scenario);
} else {
  for (const [scenario, name] of [
    ['freshness', 'identical briefs start independent concurrent jobs and fresh persisted studies after completion'],
    ['project-context', 'loaded project excerpts inform planning, qualification, and analysis while the original brief remains authoritative and saved'],
    ['failure', 'failed AI analysis removes downloaded temporary frames'],
    ['oriane', 'repeated Oriane searches and asset creation use fresh transport responses and preserve source provenance'],
    ['constraints-mixed', 'constraints screen topic relevance and all sampled frames before allowed-only ideation'],
    ['constraints-freeform', 'freeform exclusions alone activate assessment and allowed-only ideation'],
    ['constraints-no-fits', 'no fitting references complete with comparison evidence and no invented storyboard'],
    ['constraints-uncertain-only', 'only uncertain references complete with preserved comparison evidence and no ideation'],
    ['constraints-contaminated', 'angles and storyboards citing forbidden IDs are rejected as a whole'],
    ['constraints-unsupported-storyboard', 'a storyboard citing an invented source is removed'],
    ['constraints-empty-storyboard', 'a storyboard without source evidence is removed'],
    ['constraints-project-context', 'loaded facts and original brief authority reach constrained planning, qualification, assessment, and analysis'],
    ['constraints-late-irrelevant', 'late relevance rejection cannot re-enter fitting comparison metrics'],
  ]) {
    test(name, async () => {
      const directory = await mkdtemp(path.join(tmpdir(), 'angle-research-test-'));
      await mkdir(path.join(directory, 'frames'));
      try {
        const child = Bun.spawn([process.execPath, import.meta.path], {
          cwd: directory, stdout: 'pipe', stderr: 'pipe',
          env: { ...process.env, ANGLE_RESEARCH_SCENARIO: scenario, TMPDIR: path.join(directory, 'frames'),
            ORIANE_API_KEY: 'fixture-only', AI_PROVIDER: 'openai-compatible', AI_BASE_URL: 'http://127.0.0.1:1/v1',
            AI_MODEL: 'fixture', AI_API_KEY: '', AI_TIMEOUT_MS: '1000' },
        });
        const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
        expect(code, stdout + stderr).toBe(0);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
}
