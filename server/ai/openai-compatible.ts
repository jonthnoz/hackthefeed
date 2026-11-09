import { z } from 'zod';
import type { APIConfig } from './config';
import type { GenerationRequest } from './types';

const completionSchema = z.object({ choices: z.array(z.object({ finish_reason: z.string().nullable().optional(), message: z.object({ content: z.string().nullable(), refusal: z.string().nullable().optional() }) })).min(1) });

export async function generateWithAPI(request: GenerationRequest, config: APIConfig): Promise<unknown> {
  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [{ type: 'text', text: request.prompt }];
  for (const filename of request.images) {
    const file = Bun.file(filename);
    content.push({ type: 'image_url', image_url: { url: `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}` } });
  }
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}) },
      body: JSON.stringify({ model: config.model, ...(config.effort ? { reasoning_effort: config.effort } : {}), messages: [{ role: 'user', content }], response_format: { type: 'json_schema', json_schema: { name: 'angle_response', strict: true, schema: request.jsonSchema } } }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch {
    throw new Error('The AI endpoint could not be reached or timed out. Check AI_BASE_URL, AI_TIMEOUT_MS and that your local model server is running.');
  }
  if (!response.ok) {
    const hint = response.status === 401 || response.status === 403 ? 'Check AI_API_KEY and model access.' : response.status === 429 ? 'Your provider reported a usage limit. Check your quota or credits.' : 'Check AI_MODEL and AI_BASE_URL. The model must support image inputs and response_format json_schema.';
    throw new Error(`AI endpoint returned HTTP ${response.status}. ${hint}`);
  }
  const completion = completionSchema.parse(await response.json());
  const choice = completion.choices[0];
  if (choice.message.refusal || !choice.message.content) throw new Error('The AI provider declined the request or returned no content.');
  if (choice.finish_reason && choice.finish_reason !== 'stop') throw new Error(`The AI response did not complete (${choice.finish_reason}). Choose a model with enough output capacity.`);
  return JSON.parse(choice.message.content);
}
