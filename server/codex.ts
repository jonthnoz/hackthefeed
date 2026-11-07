import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { cacheKey } from './oriane';

export async function askCodex<T>(options: { prompt: string; schema: z.ZodType<T>; images?: string[]; refresh?: boolean }): Promise<T> {
  await mkdir('.cache/codex', { recursive: true });
  const key = cacheKey({ prompt: options.prompt, images: options.images ?? [], version: 1 });
  const resultPath = path.resolve(`.cache/codex/${key}.result.json`);
  if (!options.refresh) {
    try { return options.schema.parse(JSON.parse(await readFile(resultPath, 'utf8'))); } catch (error) { if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error; }
  }
  const schemaPath = path.resolve(`.cache/codex/${key}.schema.json`);
  await writeFile(schemaPath, JSON.stringify(z.toJSONSchema(options.schema)));
  const args = ['exec', options.prompt, '--ignore-user-config', '--skip-git-repo-check', '--ephemeral', '--sandbox', 'read-only', '--output-schema', schemaPath, '--output-last-message', resultPath];
  for (const image of options.images ?? []) args.push('--image', path.resolve(image));
  await new Promise<void>((resolve, reject) => {
    const child = spawn('codex', args, { cwd: process.cwd(), stdio: ['ignore', 'ignore', 'pipe'] });
    let diagnostic = '';
    child.stderr.on('data', chunk => { diagnostic = (diagnostic + String(chunk)).slice(-4000); });
    const timeout = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('The research took too long. Try again or open a verified example.')); }, 240000);
    child.on('error', error => { clearTimeout(timeout); reject(new Error(`Codex CLI is unavailable: ${error.message}`)); });
    child.on('close', code => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else { void writeFile(`.cache/codex/${key}.error.txt`, diagnostic); reject(new Error('Codex could not finish the analysis. Check that `codex login status` is connected.')); }
    });
  });
  return options.schema.parse(JSON.parse(await readFile(resultPath, 'utf8')));
}
