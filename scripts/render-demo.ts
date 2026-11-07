// Renders the submission demo video. Usage: bun run scripts/render-demo.ts [--still <seconds>...]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { COMPOSITION_ID, FPS, buildCaptions, buildScenes, totalSeconds, type Capture, type DemoProps, type Narration } from '../demo/timeline';

const root = path.resolve(import.meta.dir, '..');
const readJson = async (file: string) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const capture = async (dir: string): Promise<Capture> => ({ dir, frames: (await readJson(`public/journey/${dir}/manifest.json`)).frames });

const narration: Narration[] = await readJson('public/demo/narration.json');
const props: DemoProps = { scenes: buildScenes(narration), live: await capture('live'), brief: await capture('brief'), explore: await capture('explore') };
const browserExecutable = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const serveUrl = await bundle({ entryPoint: path.join(root, 'demo/index.tsx'), publicDir: path.join(root, 'public') });
const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps: props, browserExecutable });
process.stdout.write(`Duration ${totalSeconds(props.scenes).toFixed(1)}s\n${props.scenes.map(s => `${s.id} ${s.start.toFixed(1)}→${(s.start + s.duration).toFixed(1)}`).join('\n')}\n`);

const stills = process.argv.slice(2).filter(arg => arg !== '--still').map(Number);
const outDir = path.join(root, 'output/submission');
await mkdir(outDir, { recursive: true });
if (stills.length) {
  for (const seconds of stills) {
    const output = path.join(root, `output/demo-still-${seconds}.jpg`);
    await renderStill({ composition, serveUrl, inputProps: props, frame: Math.round(seconds * FPS), output, imageFormat: 'jpeg', browserExecutable });
    process.stdout.write(`${output}\n`);
  }
} else {
  await renderMedia({
    composition, serveUrl, inputProps: props, codec: 'h264', audioCodec: 'aac', audioBitrate: '192k', crf: 18, pixelFormat: 'yuv420p',
    outputLocation: path.join(outDir, 'angle-demo.mp4'), browserExecutable, concurrency: 4,
    onProgress: ({ progress }) => { if (Math.round(progress * 100) % 10 === 0) process.stdout.write(`\r${Math.round(progress * 100)}%`); },
  });
  const stamp = (s: number) => new Date(Math.round(s * 1000)).toISOString().slice(11, 23).replace('.', ',');
  const srt = buildCaptions(props.scenes).map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}`).join('\n\n');
  await writeFile(path.join(outDir, 'angle-demo.srt'), `${srt}\n`);
  process.stdout.write('\nRendered output/submission/angle-demo.mp4\n');
}
