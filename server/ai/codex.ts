import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { CLIConfig } from './config';
import { runCLI } from './process';
import type { GenerationRequest } from './types';

export async function generateWithCodex(request: GenerationRequest, config: CLIConfig): Promise<unknown> {
  const directory = await mkdtemp(path.join(tmpdir(), 'angle-codex-'));
  try {
    const schemaPath = path.join(directory, 'schema.json');
    const resultPath = path.join(directory, 'result.json');
    await writeFile(schemaPath, JSON.stringify(request.jsonSchema));
    const args = ['exec', '-', '--ignore-user-config', '--skip-git-repo-check', '--ephemeral', '--sandbox', 'read-only', '--output-schema', schemaPath, '--output-last-message', resultPath];
    if (config.model) args.push('--model', config.model);
    if (config.effort) args.push('-c', `model_reasoning_effort=${JSON.stringify(config.effort)}`);
    for (const image of request.images) args.push('--image', path.resolve(image));
    await runCLI({ command: 'codex', args, input: request.prompt, cwd: directory, timeoutMs: config.timeoutMs, hint: 'Check `codex login status` and that AI_MODEL is available to your account.' });
    return JSON.parse(await readFile(resultPath, 'utf8'));
  } finally { await rm(directory, { recursive: true, force: true }); }
}
