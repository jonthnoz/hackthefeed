import { z } from 'zod';

const providerSchema = z.enum(['codex', 'claude', 'openai-compatible']);
const timeoutSchema = z.coerce.number().int().positive().max(3_600_000);

export type ReasoningEffort = 'low' | 'medium' | 'high';
export type CLIConfig = { provider: 'codex' | 'claude'; model?: string; effort?: ReasoningEffort; timeoutMs: number };
export type APIConfig = { provider: 'openai-compatible'; model: string; baseUrl: string; apiKey?: string; effort?: ReasoningEffort; timeoutMs: number };
export type AIConfig = CLIConfig | APIConfig;

export function readAIConfig(env: NodeJS.ProcessEnv = process.env): AIConfig {
  const provider = providerSchema.safeParse(env.AI_PROVIDER?.trim() || 'codex');
  if (!provider.success) throw new Error('AI_PROVIDER must be codex, claude or openai-compatible.');
  const timeout = timeoutSchema.safeParse(env.AI_TIMEOUT_MS || 240000);
  if (!timeout.success) throw new Error('AI_TIMEOUT_MS must be a positive integer, at most 3600000.');
  const model = env.AI_MODEL?.trim() || undefined;
  const effortResult = z.enum(['low', 'medium', 'high']).optional().safeParse(env.AI_REASONING_EFFORT?.trim() || undefined);
  if (!effortResult.success) throw new Error('AI_REASONING_EFFORT must be low, medium or high, or left empty.');
  const effort = effortResult.data ? { effort: effortResult.data } : {};
  if (provider.data !== 'openai-compatible') return { provider: provider.data, model, ...effort, timeoutMs: timeout.data };
  const baseUrl = z.url().safeParse(env.AI_BASE_URL?.trim());
  if (!baseUrl.success || !model) throw new Error('Set AI_BASE_URL and AI_MODEL for the openai-compatible provider.');
  const url = new URL(baseUrl.data);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('AI_BASE_URL must be an HTTP(S) base URL without credentials, query parameters or a fragment.');
  }
  return { provider: provider.data, model, baseUrl: baseUrl.data.replace(/\/+$/, ''), apiKey: env.AI_API_KEY?.trim() || undefined, ...effort, timeoutMs: timeout.data };
}

export function aiLabel(config: AIConfig): string {
  const labels = { codex: 'Codex CLI', claude: 'Claude Code', 'openai-compatible': 'OpenAI-compatible API' };
  return `${labels[config.provider]}${config.model ? ` (${config.model})` : ''}`;
}
