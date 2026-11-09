import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { listHistory, readStudy } from '../server/research';
import { studySchema } from '../shared/schema';

async function verifyHistory() {
  expect(await listHistory()).toEqual([]);
  const fixture = studySchema.parse(await Bun.file(new URL('../data/demo-places.json', import.meta.url)).json());
  const { constraints: _constraints, excludedReferences: _excluded, uncertainReferences: _uncertain, constraintAssessments: _assessments, ...legacy } = fixture;
  await mkdir('data/studies', { recursive: true });
  await writeFile('data/studies/study-old.json', JSON.stringify({ ...legacy, id: 'study-old', createdAt: '2026-11-09T00:30:00+02:00' }));
  await writeFile('data/studies/study-new.json', JSON.stringify({ ...fixture, id: 'study-new', createdAt: '2026-11-08T23:00:00Z', constraints: { noRealPeople: true, exclude: 'logos' }, references: [], angles: [] }));
  await writeFile('data/studies/study-invalid-json.json', '{broken');
  await writeFile('data/studies/study-invalid-schema.json', JSON.stringify({ id: 'study-invalid-schema' }));
  await writeFile('data/studies/study-invalid-date.json', JSON.stringify({ ...legacy, id: 'study-invalid-date', createdAt: 'not a date' }));
  await writeFile('data/studies/study-mismatched.json', JSON.stringify({ ...legacy, id: 'study-other' }));
  await writeFile('data/studies/in-progress.tmp', '{');
  const before = (await readdir('data/studies')).sort();
  const entries = await listHistory();
  expect(entries.map(entry => entry.id)).toEqual(['study-new', 'study-old']);
  expect(entries[0]).toMatchObject({ constraints: { noRealPeople: true, exclude: 'logos' }, referenceCount: 0, angleCount: 0 });
  expect(entries[1]).toMatchObject({ product: legacy.product, tagline: legacy.tagline, brief: legacy.brief, constraints: { noRealPeople: false, exclude: '' }, referenceCount: legacy.references.length, angleCount: legacy.angles.length });
  expect(Object.keys(entries[0]).sort()).toEqual(['angleCount', 'brief', 'constraints', 'createdAt', 'id', 'product', 'referenceCount', 'tagline']);
  expect(await readStudy('study-old')).toMatchObject({ constraints: { noRealPeople: false, exclude: '' }, excludedReferences: [], uncertainReferences: [], constraintAssessments: {} });
  expect((await readdir('data/studies')).sort()).toEqual(before);
  await writeFile('data/studies/study-latest.json', JSON.stringify({ ...legacy, id: 'study-latest', createdAt: '2026-11-09T10:00:00Z' }));
  expect((await listHistory()).map(entry => entry.id)).toEqual(['study-latest', 'study-new', 'study-old']);
}

if (process.env.ANGLE_HISTORY_SCENARIO === 'fixture') {
  await verifyHistory();
} else {
  test('history reads persisted summaries newest first, defaults legacy fields, skips malformed studies individually and never caches', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'angle-history-test-'));
    try {
      const child = Bun.spawn([process.execPath, import.meta.path], { cwd: directory, stdout: 'pipe', stderr: 'pipe', env: { ...process.env, ANGLE_HISTORY_SCENARIO: 'fixture' } });
      const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
      expect(code, stdout + stderr).toBe(0);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}
