import type { Reference, Study } from '../shared/schema';

export function referenceGroups(study: Study) {
  const fits: Reference[] = [];
  const excluded: Reference[] = [];
  const uncertain: Reference[] = [];
  const unassessed: Reference[] = [];
  const excludedIds = new Set(study.excludedReferences.map(reference => reference.id));
  const uncertainIds = new Set(study.uncertainReferences.map(reference => reference.id));
  const references = new Map([...study.references, ...study.excludedReferences, ...study.uncertainReferences].map(reference => [reference.id, reference]));
  for (const reference of references.values()) {
    const assessment = Object.hasOwn(study.constraintAssessments, reference.id) ? study.constraintAssessments[reference.id] : undefined;
    const status = assessment?.status ?? (excludedIds.has(reference.id) ? 'excluded' : uncertainIds.has(reference.id) ? 'uncertain' : 'unassessed');
    switch (status) {
      case 'fits': fits.push(reference); break;
      case 'excluded': excluded.push(reference); break;
      case 'uncertain': uncertain.push(reference); break;
      case 'unassessed': unassessed.push(reference); break;
    }
  }
  const constrained = study.constraints.noRealPeople || Boolean(study.constraints.exclude.trim());
  return { fits, excluded, uncertain, unassessed, accepted: constrained ? fits : [...fits, ...unassessed], constrained };
}

export function recordedMedian(references: Reference[], key: 'views' | 'interactions') {
  const values = references.flatMap(reference => reference[key] === null ? [] : [reference[key]]).sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  const upper = values[middle];
  const lower = values[middle - 1];
  const median = upper === undefined ? null : values.length % 2 === 0 && lower !== undefined ? (lower + upper) / 2 : upper;
  return { median, count: values.length };
}

export function hasUsableStoryboard(study: Study): boolean {
  const acceptedIds = new Set(referenceGroups(study).accepted.map(reference => reference.id));
  return study.angles.length > 0 && study.storyboard.scenes.length > 0 && study.storyboard.sourceIds.length > 0 && study.storyboard.sourceIds.every(id => acceptedIds.has(id));
}
