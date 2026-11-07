import { z } from 'zod';

export const frameSchema = z.object({ url: z.string(), seconds: z.number(), text: z.string() });
export const referenceSchema = z.object({
  id: z.string(), title: z.string(), creator: z.string(), platform: z.string(),
  url: z.string(), thumbnail: z.string(), publishedAt: z.string(),
  views: z.number().nullable(), likes: z.number().nullable(), comments: z.number().nullable(), shares: z.number().nullable(),
  interactions: z.number().nullable(), engagementRate: z.number().nullable(),
  duration: z.number().nullable(), caption: z.string(), transcript: z.string(),
  frames: z.array(frameSchema),
  relevance: z.enum(['direct', 'adjacent', 'mechanism']),
  relevanceReason: z.string(), format: z.string(), hook: z.string(),
});
export const angleSchema = z.object({
  id: z.string(), title: z.string(), label: z.string(), description: z.string(),
  whyItFits: z.string(), evidence: z.string(), referenceIds: z.array(z.string()),
  suggestedHook: z.string(), visualDirection: z.string(),
});
export const storyboardSchema = z.object({
  title: z.string(), premise: z.string(), hook: z.string(),
  scenes: z.array(z.object({ time: z.string(), visual: z.string(), voiceover: z.string() })),
  callToAction: z.string(), sourceIds: z.array(z.string()),
});
export const studySchema = z.object({
  id: z.string(), product: z.string(), tagline: z.string(), brief: z.string(),
  promise: z.string(), question: z.string(), createdAt: z.string(),
  origin: z.enum(['curated', 'live']), language: z.string(),
  overview: z.string(), searchNotes: z.array(z.string()),
  references: z.array(referenceSchema), angles: z.array(angleSchema),
  storyboard: storyboardSchema,
});
export const researchInputSchema = z.object({ brief: z.string().min(12).max(5000), focus: z.string().max(1000).default(''), refresh: z.boolean().default(false) });
export const planSchema = z.object({
  product: z.string(), tagline: z.string(), promise: z.string(), question: z.string(),
  visualQuery: z.string().max(300), terms: z.array(z.string()).min(2).max(8),
});
export const analysisSchema = z.object({
  overview: z.string(), searchNotes: z.array(z.string()),
  qualifications: z.array(z.object({
    id: z.string(), relevance: z.enum(['direct', 'adjacent', 'mechanism', 'irrelevant']),
    reason: z.string(), format: z.string(), hook: z.string(), title: z.string(),
  })),
  angles: z.array(angleSchema), storyboard: storyboardSchema,
});
export const jobSchema = z.discriminatedUnion('status', [
  z.object({ id: z.string(), status: z.literal('running'), stage: z.string(), detail: z.string() }),
  z.object({ id: z.string(), status: z.literal('complete'), studyId: z.string(), cached: z.boolean() }),
  z.object({ id: z.string(), status: z.literal('error'), message: z.string() }),
]);
export type Reference = z.infer<typeof referenceSchema>;
export type Angle = z.infer<typeof angleSchema>;
export type Study = z.infer<typeof studySchema>;
export type ResearchInput = z.infer<typeof researchInputSchema>;
export type Job = z.infer<typeof jobSchema>;
