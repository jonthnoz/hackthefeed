import { z } from 'zod';
import type { Content } from '../../server/oriane';
import type { RetrievalDependencies } from '../../server/retrieval';

export const legacyPlanSchema = z.object({
  product: z.string(), tagline: z.string(), promise: z.string(), question: z.string(),
  visualQuery: z.string().max(300), terms: z.array(z.string()).min(2).max(8),
});
export type LegacyPlan = z.infer<typeof legacyPlanSchema> & { alternativeVisualQuery?: string };
export const legacyFilters = { format: { includes: ['video'] }, viewsCount: { min: 5000 }, interactionsCount: { min: 100 } };

export function legacySelect({ visual, lexical, targeted = [], constrained }: { visual: Content[]; lexical: Content[]; targeted?: Content[]; constrained: boolean }): Content[] {
  const combined = visual.flatMap((item, index) => lexical[index] ? [item, lexical[index]] : [item]);
  const baseline = [...new Map([...combined, ...lexical].map(item => [item.id, item])).values()].slice(0, 6);
  return [...new Map([...baseline, ...targeted].map(item => [item.id, item])).values()].slice(0, constrained ? 10 : 6);
}

export async function legacyDiscover({ plan, constrained, deps }: { plan: LegacyPlan; constrained: boolean; deps: RetrievalDependencies }) {
  const assetId = await deps.createVisualAsset(plan.visualQuery);
  const targetedAssetId = plan.alternativeVisualQuery ? await deps.createVisualAsset(plan.alternativeVisualQuery) : undefined;
  const [visual, lexical, targeted] = await Promise.all([
    deps.searchContents({ operator: 'and', filters: { ...legacyFilters, visualSimilarity: { includes: { values: [{ assetId }] } } } }, 'visualSimilarity:desc', 6, 'default'),
    deps.searchContents({ operator: 'and', filters: legacyFilters, queries: [{ operator: 'or', filters: { caption: { includesExactly: { values: plan.terms } }, transcript: { includesExactly: { values: plan.terms } } } }] }, 'interactionsCount:desc', 6, 'default'),
    targetedAssetId ? deps.searchContents({ operator: 'and', filters: { ...legacyFilters, visualSimilarity: { includes: { values: [{ assetId: targetedAssetId }] } } } }, 'visualSimilarity:desc', 4, 'default') : Promise.resolve([]),
  ]);
  return { visual, lexical, targeted, selected: legacySelect({ visual, lexical, targeted, constrained }) };
}
