import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { contentSchema, toReference } from '../server/oriane';
import { readStudy } from '../server/research';
import { jobSchema, researchInputSchema, studySchema } from '../shared/schema';

const rawRun = z.object({ response: z.object({ data: z.object({ results: z.array(contentSchema) }) }) });
const sources = new Map<string, z.infer<typeof contentSchema>[]>();
for (const file of ['results', 'final-results', 'final-followups', 'final-full-evidence', 'final-recovered-full']) {
  const raw: unknown = await Bun.file(`research/oriane/${file}.json`).json();
  for (const run of z.array(rawRun).parse(Array.isArray(raw) ? raw : [raw])) {
    for (const content of run.response.data.results) sources.set(content.id, [...(sources.get(content.id) ?? []), content]);
  }
}

for (const id of ['demo-places', 'demo-identify', 'demo-study']) {
  describe(id, () => {
    test('loads the actual stored study with complete source links', async () => {
      const study = await readStudy(id);
      expect(study.id).toBe(id);
      expect(study.origin).toBe('curated');
      expect(study.references.length).toBeGreaterThan(0);
      const ids = study.references.map(reference => reference.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(study.angles.length).toBeGreaterThanOrEqual(2);
      for (const links of [...study.angles.map(angle => angle.referenceIds), study.storyboard.sourceIds]) {
        expect(links.length).toBeGreaterThan(0);
        for (const sourceId of links) expect(ids).toContain(sourceId);
      }
      expect(study.storyboard.scenes).toHaveLength(4);
    });

    test('preserves source identity, metrics, transcript and frame timestamps from raw Oriane evidence', async () => {
      const study = await readStudy(id);
      for (const reference of study.references) {
        const records = sources.get(reference.id) ?? [];
        expect(records.length, reference.id).toBeGreaterThan(0);
        expect(records.some(record => {
          const adapted = toReference(record);
          return adapted.url === reference.url && adapted.creator === reference.creator &&
            adapted.views === reference.views && adapted.interactions === reference.interactions &&
            adapted.transcript === reference.transcript;
        }), reference.id).toBe(true);
        for (const frame of reference.frames) {
          expect(frame.seconds).toBeGreaterThanOrEqual(0);
          expect(records.some(record => record.media.some(media => media.frames?.some(raw =>
            raw.timestampSeconds === frame.seconds && (raw.onScreenTextRegions?.map(region => region.text).join(' · ') ?? '') === frame.text
          ))), `${reference.id} at ${frame.seconds}s`).toBe(true);
          expect(frame.url.startsWith('/media/')).toBe(true);
          expect(await Bun.file(`public${frame.url}`).size).toBeGreaterThan(0);
        }
        expect(await Bun.file(`public${reference.thumbnail}`).size).toBeGreaterThan(0);
      }
    });
  });
}

test('actual Oriane adapter retains unknown metrics and empty media without invented evidence', () => {
  const raw = contentSchema.parse({ id: 'cnt_test', profileHandle: 'creator', platform: 'youtube', platformId: 'video', publishedAt: '2026-11-07', media: [] });
  const reference = toReference(raw);
  expect(reference.url).toBe('https://www.youtube.com/watch?v=video');
  expect(reference.views).toBeNull();
  expect(reference.duration).toBeNull();
  expect(reference.transcript).toBe('');
  expect(reference.frames).toEqual([]);
});

test('study adapter rejects invalid IDs before file access', async () => {
  await expect(readStudy('../data/demo-study')).rejects.toThrow('Unknown study.');
});

test('input adapter rejects short briefs and defaults focus and creative constraints', () => {
  expect(researchInputSchema.safeParse({ brief: 'short' }).success).toBe(false);
  expect(researchInputSchema.parse({ brief: 'A useful product brief' })).toEqual({ brief: 'A useful product brief', focus: '', constraints: { noRealPeople: false, exclude: '' }, resources: [] });
});

test('completed jobs identify a study without reuse metadata', () => {
  expect(jobSchema.parse({ id: 'job', status: 'complete', studyId: 'study' })).toEqual({ id: 'job', status: 'complete', studyId: 'study' });
});

test('golden live study keeps valid links to its source evidence', async () => {
  const smoke = z.object({ study: studySchema }).parse(await Bun.file('research/production/live-smoke-result.json').json());
  expect(smoke.study.origin).toBe('live');
  expect(smoke.study.references.length).toBeGreaterThan(0);
  const ids = smoke.study.references.map(reference => reference.id);
  for (const links of [...smoke.study.angles.map(angle => angle.referenceIds), smoke.study.storyboard.sourceIds]) {
    expect(links.length).toBeGreaterThan(0);
    for (const id of links) expect(ids).toContain(id);
  }
});
