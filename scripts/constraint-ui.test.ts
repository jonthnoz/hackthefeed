import { expect, test } from 'bun:test';
import { studySchema } from '../shared/schema';
import { recordedMedian, referenceGroups } from '../src/constraintEvidence';

const original = studySchema.parse(await Bun.file('data/demo-study.json').json());

test('missing assessments never become fits when a constraint is active', () => {
  expect(referenceGroups(original).accepted).toHaveLength(original.references.length);
  const constrained = { ...original, constraints: { noRealPeople: true, exclude: '' } };
  expect(referenceGroups(constrained).accepted).toEqual([]);
  expect(referenceGroups(constrained).unassessed).toHaveLength(original.references.length);
});

test('comparison medians omit unknown metrics and retain observed zero values', () => {
  const reference = original.references[0];
  expect(recordedMedian([], 'views')).toEqual({ median: null, count: 0 });
  expect(recordedMedian([{ ...reference, views: null }, { ...reference, views: 0 }], 'views')).toEqual({ median: 0, count: 1 });
  expect(recordedMedian([20, 5, 10, 100].map(views => ({ ...reference, views })), 'views')).toEqual({ median: 15, count: 4 });
  expect(recordedMedian([20, 5, 10].map(interactions => ({ ...reference, interactions })), 'interactions')).toEqual({ median: 10, count: 3 });
});
