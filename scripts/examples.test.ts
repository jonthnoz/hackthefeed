import { expect, test } from 'bun:test';
import { z } from 'zod';
import { studySchema } from '../shared/schema';

test('featured examples have real source links, usable local images and consistent constraint evidence', async () => {
  const ids = z.array(z.string().regex(/^demo-[a-z0-9-]+$/)).min(2).max(3).parse(await Bun.file('data/examples.json').json());
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) {
    const study = studySchema.parse(await Bun.file(`data/${id}.json`).json());
    expect(study.id).toBe(id);
    expect(study.origin).toBe('curated');
    expect(study.angles.length).toBeGreaterThan(0);
    const allowed = new Set(study.references.map(reference => reference.id));
    const all = [...study.references, ...study.excludedReferences, ...study.uncertainReferences];
    expect(new Set(all.map(reference => reference.id)).size).toBe(all.length);
    for (const reference of all) {
      expect(reference.id).toMatch(/^cnt_/);
      expect(reference.url).toMatch(/^https:\/\/(www\.)?(tiktok\.com|instagram\.com|youtube\.com)\//);
      expect(reference.thumbnail).toMatch(/^\/media\//);
      expect(await Bun.file(`public${reference.thumbnail}`).size).toBeGreaterThan(0);
      for (const frame of reference.frames) {
        expect(frame.seconds).toBeGreaterThanOrEqual(0);
        if (frame.url.startsWith('/')) expect(await Bun.file(`public${frame.url}`).size).toBeGreaterThan(0);
      }
    }
    for (const links of [...study.angles.map(angle => angle.referenceIds), study.storyboard.sourceIds]) {
      expect(links.length).toBeGreaterThan(0);
      for (const sourceId of links) expect(allowed.has(sourceId)).toBe(true);
    }
    if (study.constraints.noRealPeople || study.constraints.exclude.trim()) {
      for (const reference of study.references) expect(study.constraintAssessments[reference.id]?.status).toBe('fits');
      for (const reference of study.excludedReferences) expect(study.constraintAssessments[reference.id]?.status).toBe('excluded');
      for (const reference of study.uncertainReferences) expect(study.constraintAssessments[reference.id]?.status).toBe('uncertain');
    }
  }
});
