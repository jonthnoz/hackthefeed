import { z } from 'zod';
import { aiLabel, readAIConfig } from './ai/config';
import { generateWithCodex } from './ai/codex';
import { generateWithClaude } from './ai/claude';
import { generateWithAPI } from './ai/openai-compatible';
import type { GenerationRequest } from './ai/types';

export async function askAI<T>(options: { prompt: string; schema: z.ZodType<T>; images?: string[] }): Promise<T> {
  const config = readAIConfig();
  const request: GenerationRequest = { prompt: options.prompt, jsonSchema: z.toJSONSchema(options.schema, { target: 'draft-7' }), images: options.images ?? [] };
  let raw: unknown;
  try {
    switch (config.provider) {
      case 'codex': raw = await generateWithCodex(request, config); break;
      case 'claude': raw = await generateWithClaude(request, config); break;
      case 'openai-compatible': raw = await generateWithAPI(request, config); break;
      default: { const exhaustive: never = config; throw new Error(`Unsupported provider: ${exhaustive}`); }
    }
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      throw new Error(`${aiLabel(config)} returned malformed JSON or an unexpected response format. Check the provider's structured output support.`);
    }
    throw error;
  }
  const parsed = options.schema.safeParse(raw);
  if (!parsed.success) throw new Error(`${aiLabel(config)} returned JSON that does not match Angle's output schema. Choose a model that supports structured output.`);
  return parsed.data;
}
