import { describe, expect, test } from 'bun:test';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { askAI } from '../server/ai';
import { readAIConfig } from '../server/ai/config';
import { runCLI } from '../server/ai/process';

const schema = z.object({ answer: z.string() });

async function withEnv<T>(values: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    return await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

describe('provider configuration', () => {
  test('defaults to Codex and permits an unauthenticated local API', () => {
    expect(readAIConfig({})).toEqual({ provider: 'codex', model: undefined, timeoutMs: 240000 });
    expect(readAIConfig({ AI_PROVIDER: 'openai-compatible', AI_BASE_URL: 'http://localhost:1234/v1/', AI_MODEL: 'local-model' })).toMatchObject({ baseUrl: 'http://localhost:1234/v1', model: 'local-model', apiKey: undefined });
  });
  test('rejects unsupported providers, missing API settings and invalid timeouts', () => {
    expect(() => readAIConfig({ AI_PROVIDER: 'missing' })).toThrow('AI_PROVIDER');
    expect(() => readAIConfig({ AI_PROVIDER: 'openai-compatible' })).toThrow('AI_BASE_URL and AI_MODEL');
    expect(() => readAIConfig({ AI_TIMEOUT_MS: '-1' })).toThrow('AI_TIMEOUT_MS');
    expect(() => readAIConfig({ AI_REASONING_EFFORT: 'unknown' })).toThrow('AI_REASONING_EFFORT');
    expect(readAIConfig({ AI_PROVIDER: 'claude', AI_REASONING_EFFORT: 'high' })).toMatchObject({ effort: 'high' });
    expect(() => readAIConfig({ AI_PROVIDER: 'openai-compatible', AI_MODEL: 'model', AI_BASE_URL: 'https://user:secret@example.com/v1' })).toThrow('without credentials');
  });
});

test('API adapter transmits the schema and ordered images and makes a fresh request each time', async () => {
  const requests: unknown[] = [];
  const authorizations: Array<string | null> = [];
  const endpoint = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
    expect(new URL(request.url).pathname).toBe('/v1/chat/completions');
    requests.push(await request.json());
    authorizations.push(request.headers.get('Authorization'));
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ answer: `fresh-${requests.length}` }) } }] });
  } });
  const directory = await mkdtemp(path.join(tmpdir(), 'angle-api-test-'));
  try {
    const first = path.join(directory, 'first.png');
    const second = path.join(directory, 'second.webp');
    await writeFile(first, 'first-image'); await writeFile(second, 'second-image');
    await withEnv({ AI_PROVIDER: 'openai-compatible', AI_MODEL: 'vision-model', AI_BASE_URL: `http://127.0.0.1:${endpoint.port}/v1`, AI_API_KEY: 'test-only', AI_TIMEOUT_MS: '10000' }, async () => {
      expect(await askAI({ prompt: 'Inspect these sources.', schema, images: [first, second] })).toEqual({ answer: 'fresh-1' });
      expect(await askAI({ prompt: 'Inspect these sources.', schema, images: [first, second] })).toEqual({ answer: 'fresh-2' });
    });
    expect(authorizations).toEqual(['Bearer test-only', 'Bearer test-only']);
    const body = z.object({ model: z.string(), response_format: z.object({ type: z.string(), json_schema: z.object({ strict: z.boolean(), schema: z.unknown() }) }), messages: z.array(z.object({ content: z.array(z.union([z.object({ type: z.literal('text'), text: z.string() }), z.object({ type: z.literal('image_url'), image_url: z.object({ url: z.string() }) })])) })) }).parse(requests[0]);
    expect(body.model).toBe('vision-model');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema).toEqual(z.toJSONSchema(schema, { target: 'draft-7' }));
    expect(body.messages[0].content).toEqual([{ type: 'text', text: 'Inspect these sources.' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${Buffer.from('first-image').toString('base64')}` } }, { type: 'image_url', image_url: { url: `data:image/webp;base64,${Buffer.from('second-image').toString('base64')}` } }]);
  } finally { endpoint.stop(true); await rm(directory, { recursive: true, force: true }); }
});

test('API adapter reports provider failures and rejects malformed, refused, truncated or schema-invalid output', async () => {
  let mode = 'auth';
  const endpoint = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch() {
    if (mode === 'auth') return new Response('secret must not be exposed', { status: 401 });
    if (mode === 'limit') return new Response('', { status: 429 });
    if (mode === 'unsupported') return new Response('', { status: 400 });
    if (mode === 'bad-envelope') return Response.json({ unexpected: true });
    return Response.json({ choices: [{ finish_reason: mode === 'truncated' ? 'length' : 'stop', message: { refusal: mode === 'refused' ? 'refused' : null, content: mode === 'bad-json' ? 'not JSON' : '{"answer":123}' } }] });
  } });
  try {
    await withEnv({ AI_PROVIDER: 'openai-compatible', AI_MODEL: 'model', AI_BASE_URL: `http://127.0.0.1:${endpoint.port}/v1`, AI_API_KEY: undefined }, async () => {
      for (const [nextMode, message] of [['auth', 'AI_API_KEY'], ['limit', 'usage limit'], ['unsupported', 'json_schema'], ['bad-envelope', ''], ['bad-json', ''], ['refused', 'declined'], ['truncated', 'did not complete'], ['invalid-schema', "Angle's output schema"]]) {
        mode = nextMode;
        await expect(askAI({ prompt: 'Analyze.', schema })).rejects.toThrow(message);
      }
    });
  } finally { endpoint.stop(true); }
});

test('CLI adapters use stdin, attach images and clean their temporary files on success and failure', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'angle-cli-test-'));
  const capture = path.join(directory, 'capture.json');
  const fixture = `#!/usr/bin/env bun
import { writeFile } from 'node:fs/promises';
const args=process.argv.slice(2), input=await Bun.stdin.text();
await writeFile(process.env.ANGLE_TEST_CAPTURE,JSON.stringify({args,input,cwd:process.cwd()}));
if(process.env.ANGLE_TEST_MODE==='failure')process.exit(7);
if(process.argv[1].endsWith('codex')){
  const target=args[args.indexOf('--output-last-message')+1];
  await writeFile(target,process.env.ANGLE_TEST_MODE==='invalid'?'not JSON':'{"answer":"codex"}');
}else{
  console.log(JSON.stringify({type:'system',subtype:'init'}));
  console.log(JSON.stringify({type:'result',subtype:'success',is_error:false,structured_output:process.env.ANGLE_TEST_MODE==='invalid'?{answer:42}:{answer:'claude'}}));
}
`;
  try {
    for (const command of ['codex', 'claude']) { await writeFile(path.join(directory, command), fixture); await chmod(path.join(directory, command), 0o755); }
    const image = path.join(directory, 'frame.png'); await writeFile(image, 'frame');
    await withEnv({ PATH: `${directory}${path.delimiter}${process.env.PATH}`, ANGLE_TEST_CAPTURE: capture, AI_MODEL: 'test-model', AI_REASONING_EFFORT: 'high', AI_TIMEOUT_MS: '10000' }, async () => {
      for (const provider of ['codex', 'claude']) {
        await withEnv({ AI_PROVIDER: provider, ANGLE_TEST_MODE: undefined }, async () => {
          expect(await askAI({ prompt: 'Keep literal $(commands) and unicode ✓.', schema, images: [image] })).toEqual({ answer: provider });
          const recorded = z.object({ args: z.array(z.string()), input: z.string(), cwd: z.string() }).parse(JSON.parse(await readFile(capture, 'utf8')));
          expect(recorded.args).toContain('test-model');
          expect(await Bun.file(path.join(recorded.cwd, 'schema.json')).exists()).toBe(false);
          if (provider === 'codex') {
            expect(recorded.args).toContain('model_reasoning_effort="high"');
            expect(recorded.input).toBe('Keep literal $(commands) and unicode ✓.');
            expect(recorded.args).toContain(image);
          } else {
            expect(recorded.args).toContain('--effort');
            expect(recorded.args).toContain('high');
            expect(recorded.args).toContain('--safe-mode');
            const input = JSON.parse(recorded.input);
            expect(input.message.content[0].text).toContain('$(commands)');
            expect(input.message.content[1].source).toEqual({ type: 'base64', media_type: 'image/png', data: Buffer.from('frame').toString('base64') });
          }
        });
        await withEnv({ AI_PROVIDER: provider, ANGLE_TEST_MODE: 'invalid' }, async () => { await expect(askAI({ prompt: 'Bad output.', schema })).rejects.toThrow(); });
        await withEnv({ AI_PROVIDER: provider, ANGLE_TEST_MODE: 'failure' }, async () => { await expect(askAI({ prompt: 'Failed run.', schema })).rejects.toThrow('exited with code 7'); });
      }
    });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('CLI timeout and missing executable return actionable errors', async () => {
  await expect(runCLI({ command: 'angle-test-missing-command', args: [], input: '', cwd: tmpdir(), timeoutMs: 500, hint: 'Install the CLI.' })).rejects.toThrow('available on PATH');
  await expect(runCLI({ command: process.execPath, args: ['-e', 'setTimeout(() => {}, 10000)'], input: '', cwd: tmpdir(), timeoutMs: 30, hint: '' })).rejects.toThrow('timed out');
});

test('CLI deadline rejects even when a descendant inherits output pipes', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'angle-descendant-test-'));
  try {
    const marker = path.join(directory, 'descendant-started');
    const script = `const child=Bun.spawn([process.execPath,'-e','setTimeout(() => {}, 2500)'],{stdout:'inherit',stderr:'inherit'});await Bun.write(${JSON.stringify(marker)},String(child.pid));process.exit(0);`;
    await expect(Promise.race([
      runCLI({ command: process.execPath, args: ['-e', script], input: '', cwd: directory, timeoutMs: 200, hint: '' }),
      Bun.sleep(1000).then(() => { throw new Error('The inherited output pipe prevented the deadline.'); }),
    ])).rejects.toThrow('timed out');
    expect(await Bun.file(marker).exists()).toBe(true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
