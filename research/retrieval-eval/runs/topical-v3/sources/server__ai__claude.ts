import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import type { CLIConfig } from './config';
import { runCLI } from './process';
import type { GenerationRequest } from './types';

const resultSchema = z.object({ type: z.literal('result'), is_error: z.boolean().optional(), subtype: z.string().optional(), structured_output: z.unknown().optional() });

export async function generateWithClaude(request: GenerationRequest, config: CLIConfig): Promise<unknown> {
  const directory = await mkdtemp(path.join(tmpdir(), 'angle-claude-'));
  try {
    const content: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> = [{ type: 'text', text: request.prompt }];
    for (const filename of request.images) {
      const file = Bun.file(filename);
      content.push({ type: 'image', source: { type: 'base64', media_type: file.type, data: Buffer.from(await file.arrayBuffer()).toString('base64') } });
    }
    const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--json-schema', JSON.stringify(request.jsonSchema), '--safe-mode', '--tools', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--no-session-persistence'];
    if (config.model) args.push('--model', config.model);
    if (config.effort) args.push('--effort', config.effort);
    const stdout = await runCLI({ command: 'claude', args, input: `${JSON.stringify({ type: 'user', message: { role: 'user', content } })}\n`, cwd: directory, timeoutMs: config.timeoutMs, hint: 'Check `claude auth status`, update Claude Code, and verify AI_MODEL.' });
    for (const line of stdout.trim().split('\n').reverse()) {
      const parsed = resultSchema.safeParse(JSON.parse(line));
      if (!parsed.success) continue;
      if (parsed.data.is_error || parsed.data.subtype !== 'success' || parsed.data.structured_output === undefined) {
        throw new Error('Claude Code did not produce structured output. Check your login, usage limits and model capabilities.');
      }
      return parsed.data.structured_output;
    }
    throw new Error('Claude Code returned no result. Update Claude Code and check `claude auth status`.');
  } finally { await rm(directory, { recursive: true, force: true }); }
}
