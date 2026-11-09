import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { historyEntrySchema, jobSchema, researchInputSchema } from '../shared/schema';
import { readStudy } from '../server/research';

const base = 'http://127.0.0.1:3000';
const snapshotPath = '.audit/replay-inputs.json';
const resultPath = '.audit/replay-results.json';
const inputsSchema = z.array(researchInputSchema);

async function main() {
  await mkdir('.audit', { recursive: true });
  if (process.argv.includes('--snapshot')) {
    const response = await fetch(`${base}/api/history`);
    if (!response.ok) throw new Error('History could not be read.');
    const entries = z.array(historyEntrySchema).parse(await response.json());
    const inputs = await Promise.all(entries.map(async entry => {
      const study = await readStudy(entry.id);
      return researchInputSchema.parse({ brief: study.brief, focus: '', constraints: study.constraints, resources: study.resources });
    }));
    await writeFile(snapshotPath, JSON.stringify(inputs, null, 2));
    process.stdout.write(`Saved ${inputs.length} exact briefs. No research started.\n`);
    return;
  }
  if (!process.argv.includes('--run')) throw new Error('Use --snapshot first, then --run after validation.');
  const inputs = inputsSchema.parse(JSON.parse(await readFile(snapshotPath, 'utf8')));
  const outcomes: Array<{ studyId?: string; error?: string }> = [];
  let next = 0;
  async function worker() {
    while (next < inputs.length) {
      const index = next++;
      try {
        const response = await fetch(`${base}/api/research`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inputs[index]) });
        if (!response.ok) throw new Error(`Research request returned HTTP ${response.status}`);
        let job = jobSchema.parse(await response.json());
        const deadline = Date.now() + 12 * 60000;
        while (job.status === 'running') {
          if (Date.now() > deadline) throw new Error('Polling deadline reached; the job may still be running.');
          await Bun.sleep(1800);
          const poll = await fetch(`${base}/api/jobs/${job.id}`);
          if (!poll.ok) throw new Error(`Job polling returned HTTP ${poll.status}`);
          job = jobSchema.parse(await poll.json());
        }
        if (job.status === 'error') throw new Error(job.message);
        const saved = await readStudy(job.studyId);
        if (saved.brief !== inputs[index].brief) throw new Error('Saved brief differs from the historical input.');
        outcomes[index] = { studyId: job.studyId };
        process.stdout.write(`Completed ${index + 1}/${inputs.length}: ${job.studyId}\n`);
      } catch (error) {
        outcomes[index] = { error: error instanceof Error ? error.message : String(error) };
        process.stdout.write(`Failed ${index + 1}/${inputs.length}: ${outcomes[index].error}\n`);
      }
    }
  }
  await Promise.all([worker(), worker()]);
  await writeFile(resultPath, JSON.stringify(outcomes, null, 2));
  if (outcomes.some(outcome => outcome.error)) process.exitCode = 1;
}

await main();
