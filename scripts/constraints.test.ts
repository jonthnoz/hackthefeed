import { expect, test } from 'bun:test';
import { partitionReferences, sampleFrames } from '../server/constraints';
import { contentSchema, toReference } from '../server/oriane';

const reference = { ...toReference(contentSchema.parse({
  id: 'source', profileHandle: 'creator', platform: 'youtube', platformId: 'video', publishedAt: '2026-11-07',
  media: [{ frames: [9, 0, 3, 6, 3].map(seconds => ({ url: `https://media.example/${seconds}.webp`, timestampSeconds: seconds })) }],
})), frames: [9, 0, 3, 6, 3].map(seconds => ({ url: `https://media.example/${seconds}.webp`, seconds, text: '' })) };
const evidence = sampleFrames(reference).map(frame => ({ id: reference.id, seconds: frame.seconds }));

test('constraint sampling uses first, middle and last distinct timestamps regardless of index order', () => {
  expect(sampleFrames(reference).map(frame => frame.seconds)).toEqual([0, 6, 9]);
  expect(sampleFrames({ ...reference, frames: [] })).toEqual([]);
});

test('missing or duplicate assessments remain uncertain instead of fitting', () => {
  const assessment = { id: reference.id, relevant: true, status: 'fits' as const, reason: 'Clear sampled evidence.' };
  for (const assessments of [[], [assessment, assessment]]) {
    const result = partitionReferences([reference], assessments, evidence);
    expect(result.references).toEqual([]);
    expect(result.uncertainReferences).toEqual([reference]);
    expect(result.constraintAssessments.source.status).toBe('uncertain');
  }
});

test('missing downloads, fewer than three frames and empty reasons cannot qualify a source', () => {
  const assessment = { id: reference.id, relevant: true, status: 'fits' as const, reason: 'Clear sampled evidence.' };
  expect(partitionReferences([reference], [assessment], evidence.slice(0, 2)).references).toEqual([]);
  expect(partitionReferences([{ ...reference, frames: reference.frames.slice(0, 1) }], [assessment], evidence).references).toEqual([]);
  expect(partitionReferences([reference], [{ ...assessment, reason: ' ' }], evidence).references).toEqual([]);
});

test('irrelevant high-engagement excluded sources are absent from every comparison group', () => {
  const irrelevant = { ...reference, id: 'viral', interactions: 99999999 };
  const result = partitionReferences([irrelevant, reference], [
    { id: 'viral', relevant: false, status: 'excluded', reason: 'Unrelated dance with people.' },
    { id: reference.id, relevant: true, status: 'excluded', reason: 'Relevant demo with a visible presenter.' },
  ], evidence);
  expect(result.excludedReferences).toEqual([reference]);
  expect(result.constraintAssessments.viral).toBeUndefined();
});
