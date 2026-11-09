import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import { researchInputSchema } from '../shared/schema';
import { jobs, listHistory, readExamples, readStudy, startResearch } from './research';
import { aiLabel, readAIConfig } from './ai/config';

const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/')) { vite.middlewares(request, response); return; }
  response.setHeader('Content-Type','application/json');
  try {
    if (request.method === 'GET' && url.pathname === '/api/examples') {
      response.end(JSON.stringify(await readExamples())); return;
    }
    if (request.method === 'GET' && url.pathname === '/api/history') {
      response.end(JSON.stringify(await listHistory())); return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/studies/')) {
      response.end(JSON.stringify(await readStudy(url.pathname.split('/').at(-1) ?? ''))); return;
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/jobs/')) {
      const job = jobs.get(url.pathname.split('/').at(-1) ?? '');
      if (!job) { response.statusCode = 404; response.end(JSON.stringify({ error: 'Research job not found. Start a new study.' })); return; }
      response.end(JSON.stringify(job)); return;
    }
    if (request.method === 'POST' && url.pathname === '/api/research') {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const input = researchInputSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      response.end(JSON.stringify(await startResearch(input))); return;
    }
    if (request.method === 'GET' && url.pathname === '/api/health') {
      response.end(JSON.stringify({ status: 'ok', oriane: Boolean(process.env.ORIANE_API_KEY), engine: aiLabel(readAIConfig()) })); return;
    }
    if (request.method === 'GET' && url.pathname === '/api/trailer') {
      try { await readFile('output/angle-trailer.mp4'); response.end(JSON.stringify({ available: true, url: '/trailer/angle-trailer.mp4' })); }
      catch { response.end(JSON.stringify({ available: false })); }
      return;
    }
    response.statusCode = 404; response.end(JSON.stringify({ error: 'Not found.' }));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT' && url.pathname.startsWith('/api/studies/')) {
      response.statusCode = 404;
      response.end(JSON.stringify({ error: 'Study not found. Open an example or start a new brief.' })); return;
    }
    response.statusCode = 400;
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Request could not be completed.' }));
  }
});
const host = process.env.HOST?.trim() || '127.0.0.1';
const port = z.coerce.number().int().min(1).max(65535).parse(process.env.PORT || 3000);
server.listen(port, host, () => { process.stdout.write(`Angle is running at http://${host}:${port}\n`); });
