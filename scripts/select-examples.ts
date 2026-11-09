import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { contentSchema, toReference } from '../server/oriane';
import { referenceSchema, studySchema, type Reference } from '../shared/schema';

const rawRunSchema = z.object({ response: z.object({ data: z.object({ results: z.array(contentSchema) }) }) });
const rawFiles = [
  'research/oriane/results.json', 'research/oriane/final-results.json',
  'research/oriane/final-followups.json', 'research/oriane/final-full-evidence.json',
  'research/oriane/final-recovered-full.json',
  'research/examples/E01-finalists.json', 'research/examples/E02-constraint-replacements.json',
  'research/examples/E03-photo-constraint.json', 'research/examples/E04-final-mechanisms.json',
];
const sources = new Map<string, { file: string; content: z.infer<typeof contentSchema> }>();
for (const file of rawFiles) {
  const raw: unknown = JSON.parse(await readFile(file, 'utf8'));
  for (const run of z.array(rawRunSchema).parse(Array.isArray(raw) ? raw : [raw])) {
    for (const content of run.response.data.results) {
      const previous = sources.get(content.id);
      if (!previous || (content.media[0]?.frames?.length ?? 0) >= (previous.content.media[0]?.frames?.length ?? 0)) sources.set(content.id, { file, content });
    }
  }
}
const imageSchema = z.object({ local: z.string(), sourceUrl: z.string(), seconds: z.number().nullable(), mediaIndex: z.number().optional(), frameIndex: z.number().optional() });
const media = z.array(z.object({ id: z.string(), images: z.array(imageSchema) })).parse(JSON.parse(await readFile('research/examples/media.json', 'utf8')));
const referenceSpecSchema = referenceSchema.pick({ id: true, title: true, relevance: true, relevanceReason: true, format: true, hook: true }).extend({ frameIndices: z.array(z.number().int().nonnegative()) });
const curationSchema = studySchema.omit({ references: true, excludedReferences: true, uncertainReferences: true }).extend({
  references: z.array(referenceSpecSchema), excludedReferences: z.array(referenceSpecSchema), uncertainReferences: z.array(referenceSpecSchema),
});
const curated = z.array(curationSchema).parse(JSON.parse(await readFile('research/examples/curation.json', 'utf8')));
function reference(spec: z.infer<typeof referenceSpecSchema>): Reference {
  const source = sources.get(spec.id);
  assert(source, `Missing raw source ${spec.id}`);
  const images = media.find(item => item.id === spec.id)?.images;
  assert(images, `Missing downloaded media ${spec.id}`);
  const thumbnail = images.find(item => item.seconds === null);
  assert(thumbnail, `Missing thumbnail ${spec.id}`);
  const { frameIndices, ...interpretation } = spec;
  return referenceSchema.parse({
    ...toReference(source.content), ...interpretation, thumbnail: thumbnail.local,
    frames: frameIndices.map(index => {
      const raw = source.content.media[0]?.frames?.[index];
      const image = images.find(item => item.mediaIndex === 0 && item.frameIndex === index);
      assert(raw && image, `Missing frame ${spec.id}/${index}`);
      return { url: image.local, seconds: raw.timestampSeconds, text: raw.onScreenTextRegions?.map(region => region.text).join(' · ') ?? '' };
    }),
  });
}
const newStudies = curated.map(study => studySchema.parse({ ...study,
  references: study.references.map(reference), excludedReferences: study.excludedReferences.map(reference), uncertainReferences: study.uncertainReferences.map(reference),
}));
const ids = [...newStudies.map(study => study.id), 'demo-study'];
if (process.argv.includes('--write')) {
  for (const study of newStudies) {
    assert(['demo-product-photos', 'demo-room-preview'].includes(study.id), 'Only new example files may be written');
    await writeFile(`data/${study.id}.json`, `${JSON.stringify(study, null, 2)}\n`);
  }
  await writeFile('data/examples.json', `${JSON.stringify(ids, null, 2)}\n`);
}
assert.deepEqual(await Bun.file('data/examples.json').json(), ids, 'Selected-ID manifest');
const provenance = [];
for (const id of ids) {
  const study = studySchema.parse(await Bun.file(`data/${id}.json`).json());
  assert.equal(study.id, id);
  const groups = [study.references, study.excludedReferences, study.uncertainReferences];
  const all = groups.flat();
  assert.equal(new Set(all.map(item => item.id)).size, all.length, 'Reference groups must be disjoint');
  const fits = new Set(study.references.map(item => item.id));
  for (const links of [...study.angles.map(angle => angle.referenceIds), study.storyboard.sourceIds]) {
    assert(links.length > 0, 'Missing evidence links');
    for (const sourceId of links) assert(fits.has(sourceId), `Non-fit evidence ${sourceId}`);
  }
  if (study.constraints.noRealPeople || study.constraints.exclude) {
    for (const [index, status] of ['fits', 'excluded', 'uncertain'].entries()) {
      for (const item of groups[index]) assert.equal(study.constraintAssessments[item.id]?.status, status);
    }
    assert.deepEqual(Object.keys(study.constraintAssessments).sort(), all.map(item => item.id).sort());
  }
  for (const item of all) {
    const source = sources.get(item.id);
    assert(source, `No original Oriane evidence for ${item.id}`);
    const original = toReference(source.content);
    for (const key of ['id', 'creator', 'platform', 'url', 'publishedAt', 'views', 'likes', 'comments', 'shares', 'interactions', 'engagementRate', 'duration', 'caption', 'transcript'] as const) assert.deepEqual(item[key], original[key], `${item.id} ${key}`);
    assert(/^https:\/\/(www\.)?(tiktok\.com|instagram\.com|youtube\.com)\//.test(item.url));
    assert(item.thumbnail.startsWith('/media/'));
    assert((await Bun.file(`public${item.thumbnail}`).arrayBuffer()).byteLength > 0);
    const frames = [];
    for (const frame of item.frames) {
      const raw: NonNullable<z.infer<typeof contentSchema>['media'][number]['frames']>[number] | undefined = source.content.media.flatMap(m => m.frames ?? []).find(f => f.timestampSeconds === frame.seconds && (f.onScreenTextRegions?.map(region => region.text).join(' · ') ?? '') === frame.text);
      assert(raw, `Invented frame ${item.id} at ${frame.seconds}`);
      assert(frame.url.startsWith('/media/'));
      const bytes = await Bun.file(`public${frame.url}`).arrayBuffer();
      assert(bytes.byteLength > 0);
      const download = media.find(m => m.id === item.id)?.images.find(image => image.local === frame.url);
      if (download) assert.equal(download.sourceUrl, raw.url);
      frames.push({ seconds: frame.seconds, sourceUrl: raw.url, localUrl: frame.url, sha256: new Bun.CryptoHasher('sha256').update(bytes).digest('hex') });
    }
    provenance.push({ studyId: id, referenceId: item.id, rawFile: source.file, sourceUrl: item.url, publishedAt: item.publishedAt, thumbnail: { localUrl: item.thumbnail, sourceUrl: source.content.thumbnailMediaUrl }, metrics: { views: item.views, likes: item.likes, shares: item.shares, comments: item.comments, interactions: item.interactions, engagementRate: item.engagementRate }, frames });
  }
}
await writeFile('research/examples/provenance.json', `${JSON.stringify(provenance, null, 2)}\n`);
process.stdout.write(`Validated ${ids.length} studies and ${provenance.length} source references against raw Oriane evidence and local media.\n`);
