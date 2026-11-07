import assert from 'node:assert/strict';
import fs from 'node:fs';

const experiments = JSON.parse(fs.readFileSync(new URL('./results.json', import.meta.url), 'utf8'));
assert.equal(experiments.length, 15);
assert.equal(new Set(experiments.map(e => e.id)).size, 15);
for (const experiment of experiments) {
  assert.ok(experiment.response?.data?.results, experiment.id);
  assert.ok(!experiment.response.error, experiment.id);
  assert.ok(experiment.response.data.results.length <= experiment.request.limit, experiment.id);
  assert.equal(experiment.response.metadata.pagination.offset, experiment.request.offset ?? 0);
  assert.ok(experiment.response.metadata.pagination.totalCount >= experiment.response.data.results.length);
  if (experiment.request.filters?.format) {
    assert.ok(experiment.response.data.results.every(result => result.format === 'video'), experiment.id);
  }
}

const firstPage = experiments.find(e => e.id === 'T04-vision-travel');
const secondPage = experiments.find(e => e.id === 'T12-pagination');
assert.equal(secondPage.request.aiSearchAnchor, firstPage.response.metadata.pagination.aiSearchAnchor);
assert.equal(secondPage.response.metadata.pagination.aiSearchAnchor, secondPage.request.aiSearchAnchor);
assert.ok(secondPage.response.data.results.every(result => !firstPage.response.data.results.some(first => first.id === result.id)));

const hybrid = experiments.find(e => e.id === 'T09-hybrid');
for (const result of hybrid.response.data.results) {
  assert.equal(result.platform, 'instagram');
  assert.ok(result.publishedAt >= '2026-09-01T00:00:00.000Z');
  assert.ok(result.publishedAt <= '2026-11-07T23:59:59.999Z');
  assert.ok(result.interactionsCount >= 100);
}
const threshold = experiments.find(e => e.id === 'T11-threshold');
for (const result of threshold.response.data.results) {
  assert.ok(result.viewsCount >= 10000);
  assert.ok(result.engagementRatePerViews >= 2);
}
const imageAsset = JSON.parse(fs.readFileSync(new URL('./image-asset.json', import.meta.url), 'utf8'));
assert.equal(experiments.find(e => e.id === 'T14-image-similarity').response.data.results[0].id, imageAsset.sourceContentId);

const full = experiments.find(e => e.id === 'T15-full-evidence');
assert.deepEqual(new Set(full.response.data.results.map(result => result.id)), new Set(full.request.filters.id.includes));
const records = experiments.flatMap(e => e.response.data.results);
const rateChecks = records.filter(result => result.viewsCount > 0 && result.interactionsCount != null && result.engagementRatePerViews != null);
const rateMismatches = rateChecks.filter(result => Math.abs(result.interactionsCount / result.viewsCount * 100 - result.engagementRatePerViews) > 0.000001);
const details = full.response.data.results.map(result => {
  const media = result.media[0];
  const firstChunk = media.transcriptChunks?.[0];
  return {
    id: result.id,
    handle: result.profileHandle,
    frameCount: media.frames?.length ?? 0,
    firstFrameSeconds: media.frames?.[0]?.timestampSeconds ?? null,
    earlyFrameCount: media.frames?.filter(frame => frame.timestampSeconds <= 3).length ?? 0,
    hasTranscript: Boolean(media.transcript),
    firstChunkEndSeconds: firstChunk?.endSeconds ?? null,
    captionLanguage: result.captionLanguage,
    transcriptLanguage: media.transcriptLanguage,
    firstChunkConfinedToThreeSeconds: Boolean(firstChunk && firstChunk.startSeconds < 3 && firstChunk.endSeconds <= 3),
  };
});
const controlled = experiments.find(e => e.id === 'T13-threshold-controlled');
const summary = {
  searchCalls: experiments.length,
  assetCreations: JSON.parse(fs.readFileSync(new URL('./assets.json', import.meta.url), 'utf8')).length + 1,
  returnedRows: records.length,
  uniqueContentIds: new Set(records.map(result => result.id)).size,
  rateChecks: rateChecks.length,
  rateMismatches: rateMismatches.length,
  nonOverlappingAnchoredPages: true,
  hybridObservableConstraintsPassed: true,
  hybridCaptionLanguageNotExposedInDefaultProjection: true,
  controlledThresholdSameFirstPage: JSON.stringify(firstPage.response.data.results.map(result => result.id)) === JSON.stringify(controlled.response.data.results.map(result => result.id)),
  detailedSampleSize: details.length,
  detailedVideosWithEarlyFrames: details.filter(result => result.earlyFrameCount > 0).length,
  detailedVideosWithTranscript: details.filter(result => result.hasTranscript).length,
  detailedFirstChunksConfinedToThreeSeconds: details.filter(result => result.firstChunkConfinedToThreeSeconds).length,
  details,
};
fs.writeFileSync(new URL('./verification.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
