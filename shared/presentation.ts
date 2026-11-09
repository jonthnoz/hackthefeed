import type { Angle, Reference } from './schema';

const proximityRank = { direct: 0, adjacent: 1, mechanism: 2 } satisfies Record<NonNullable<Angle['proximity']>, number>;

export const angleProximityLabel = {
  direct: 'Closest to your brief',
  adjacent: 'Broader inspiration',
  mechanism: 'Presentation technique',
} satisfies Record<NonNullable<Angle['proximity']>, string>;

export function orderAngles(angles: readonly Angle[], references: readonly Reference[]): Angle[] {
  const referencesById = new Map(references.map(reference => [reference.id, reference]));
  return angles.map(angle => ({
    angle,
    rank: angle.proximity === undefined
      ? Math.min(3, ...angle.referenceIds.map(id => {
        const reference = referencesById.get(id);
        return reference ? proximityRank[reference.relevance] : 3;
      }))
      : proximityRank[angle.proximity],
  })).toSorted((a, b) => a.rank - b.rank).map(({ angle }) => angle);
}
