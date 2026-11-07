import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('./', import.meta.url);
const protocol = JSON.parse(fs.readFileSync(new URL('final-protocol.json', root)));
const runs = JSON.parse(fs.readFileSync(new URL('final-results.json', root)));
const followups = JSON.parse(fs.readFileSync(new URL('final-followups.json', root)));
const fullRuns = ['final-full-evidence.json', 'final-recovered-full.json'].map(file => JSON.parse(fs.readFileSync(new URL(file, root))));
assert.equal(runs.length, 12);
const rows = [...runs, ...followups, ...fullRuns];
assert.equal(rows.length, 17);
for (const run of rows) {
  assert.ok(run.response.data?.results, run.id);
  assert.ok(!run.response.error, run.id);
  assert.ok(run.response.data.results.length <= run.request.limit, run.id);
  for (const result of run.response.data.results) {
    assert.equal(result.format, 'video');
    if (run.request.filters?.platform) assert.ok(run.request.filters.platform.includes.includes(result.platform));
    if (run.request.filters?.viewsCount?.min) assert.ok(result.viewsCount >= run.request.filters.viewsCount.min);
    if (run.request.filters?.interactionsCount?.min) assert.ok(result.interactionsCount >= run.request.filters.interactionsCount.min);
    if (run.request.filters?.publishedAt) {
      assert.ok(result.publishedAt >= '2026-08-01T00:00:00.000Z');
      assert.ok(result.publishedAt <= '2026-11-07T23:59:59.999Z');
    }
  }
}
const balance = [];
for (const subject of protocol.subjects) {
  for (const strategy of ['A', 'B']) {
    const selected = runs.filter(run => run.subject === subject.id && run.strategy === strategy);
    assert.equal(selected.length, 2);
    assert.ok(selected.every(run => run.request.limit === 6));
    for (const field of ['platform', 'format', 'captionLanguage', 'publishedAt', 'viewsCount', 'interactionsCount']) {
      assert.deepEqual(selected[0].request.filters[field], runs[0].request.filters[field]);
      assert.deepEqual(selected[1].request.filters[field], runs[0].request.filters[field]);
    }
    balance.push({ subject: subject.id, strategy, calls: selected.length, returned: selected.flatMap(run => run.response.data.results).length, unique: new Set(selected.flatMap(run => run.response.data.results.map(result => result.id))).size });
  }
}
const detailed = fullRuns.flatMap(run => run.response.data.results);
assert.equal(detailed.length, 9);
assert.ok(detailed.every(result => result.captionLanguage === 'en'));
const cohort = followups.find(run => run.id === 'creator-cohort');
assert.ok(cohort.response.data.results.every(result => result.profileHandle === 'inbetweenpics'));
const verification = {
  comparisonCalls: runs.length,
  comparisonReturnedRows: runs.flatMap(run => run.response.data.results).length,
  comparisonUniqueContentIds: new Set(runs.flatMap(run => run.response.data.results.map(result => result.id))).size,
  totalNewSearchCalls: rows.length,
  totalNewAssets: 3,
  errorResponses: rows.filter(run => run.response.error).length,
  repetitionsPerSubjectAndStrategy: 1,
  observableMetadataFiltersPassed: true,
  captionLanguageCheckedOnlyOnDetailedSubset: true,
  balance,
  detailedVideos: detailed.map(result => ({ id: result.id, handle: result.profileHandle, platform: result.platform, platformId: result.platformId, views: result.viewsCount, interactions: result.interactionsCount, firstFrameSeconds: result.media[0].frames?.[0]?.timestampSeconds ?? null, frameCount: result.media[0].frames?.length ?? 0, firstChunk: result.media[0].transcriptChunks?.[0] ?? null })),
  cohort: { returned: cohort.response.data.results.length, totalCount: cohort.response.metadata.pagination.totalCount, exhaustive: false },
  limitations: ['Single exploratory trial. No statistical superiority claim.', 'Relevance labels are interpretations, separate from metadata checks.', 'Follow-up retrieval is outside the balanced comparison.'],
};
fs.writeFileSync(new URL('final-verification.json', root), JSON.stringify(verification, null, 2) + '\n');
console.log(JSON.stringify({ calls: verification.totalNewSearchCalls, comparisonCalls: verification.comparisonCalls, uniqueComparisonIds: verification.comparisonUniqueContentIds, errors: verification.errorResponses, detailedVideos: detailed.length, cohort: verification.cohort, balance }, null, 2));
