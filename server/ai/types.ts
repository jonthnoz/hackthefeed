import type { z } from 'zod';

export type GenerationRequest = {
  prompt: string;
  jsonSchema: z.core.JSONSchema.BaseSchema;
  images: string[];
};
