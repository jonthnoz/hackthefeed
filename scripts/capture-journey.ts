// Records a real browser session of Angle as a timestamped 3840×2160 JPEG sequence for the demo video.
// Scripted gestures and CSS animations run SLOW× slower while screenshots are taken in a loop;
// timestamps are divided by SLOW, so playback at 1× shows real speed at a high frame rate.
// Usage: bun run scripts/capture-journey.ts live | brief | explore <studyId>
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, type Locator } from 'playwright-core';

const BASE = 'http://localhost:3000';
const BRIEF = 'Sokka Map: share any TikTok or Instagram food video and the restaurant lands on your personal map. No more saved videos you never find again when you are hungry.';
const [journey = 'live', studyId = ''] = process.argv.slice(2);
const SLOW = journey === 'live' ? 1 : 4;
const directory = `public/journey/${journey}`;
await mkdir(`${directory}/frames`, { recursive: true });

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] });
await context.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const cursor = document.createElement('div');
    cursor.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2.5 19.5 13l-7 1.2-3.6 6.3z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(cursor.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none', transform: 'translate(-100px,-100px)', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))' });
    const ring = document.createElement('div');
    Object.assign(ring.style, { position: 'fixed', width: '44px', height: '44px', margin: '-22px 0 0 -22px', borderRadius: '50%', background: 'rgba(214,240,92,.55)', zIndex: '2147483646', pointerEvents: 'none', opacity: '0', transform: 'scale(.3)', transition: 'transform .35s ease-out, opacity .45s ease-out' });
    document.body.append(ring, cursor);
    const saved = sessionStorage.getItem('demo-cursor');
    if (saved) cursor.style.transform = saved;
    addEventListener('mousemove', (event: MouseEvent) => { cursor.style.transform = `translate(${event.clientX - 4}px,${event.clientY - 3}px)`; sessionStorage.setItem('demo-cursor', cursor.style.transform); }, true);
    addEventListener('mousedown', (event: MouseEvent) => {
      Object.assign(ring.style, { left: `${event.clientX}px`, top: `${event.clientY}px`, transition: 'none', opacity: '1', transform: 'scale(.3)' });
      requestAnimationFrame(() => requestAnimationFrame(() => Object.assign(ring.style, { transition: 'transform .35s ease-out, opacity .45s ease-out', opacity: '0', transform: 'scale(1.4)' })));
    }, true);
  });
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const frames: { file: string; t: number }[] = [];
const marks: Record<string, number> = {};
let start = 0;
const now = () => (Date.now() / 1000 - start) / SLOW;
const mark = (name: string) => { marks[name] = now(); process.stdout.write(`${name} ${marks[name].toFixed(2)}s\n`); };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms * SLOW));

let pointer = { x: 960, y: 700 };
async function moveTo(target: Locator, duration = 700) {
  const box = await target.boundingBox();
  if (!box) throw new Error('Target not visible');
  const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const steps = Math.round(duration / 16);
  for (let step = 1; step <= steps; step++) {
    const p = step / steps;
    const e = p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
    await page.mouse.move(pointer.x + (to.x - pointer.x) * e, pointer.y + (to.y - pointer.y) * e);
    await sleep(16);
  }
  pointer = to;
}
async function click(target: Locator, pause = 250) {
  await target.scrollIntoViewIfNeeded();
  await moveTo(target);
  await sleep(pause);
  await page.mouse.down(); await sleep(90); await page.mouse.up();
}
async function scroll(distance: number, duration = 1200) {
  const steps = Math.round(duration / 16);
  for (let step = 0; step < steps; step++) { await page.mouse.wheel(0, distance / steps); await sleep(16); }
}

await page.goto(journey === 'explore' ? `${BASE}/?view=study&study=${studyId}` : BASE, { waitUntil: 'networkidle' });
await page.mouse.move(pointer.x, pointer.y);
await cdp.send('Animation.enable');
await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / SLOW });
start = Date.now() / 1000;
let recording = true;
const recorder = (async () => {
  while (recording) {
    const t = now();
    const { cssVisualViewport: { pageX, pageY } } = await cdp.send('Page.getLayoutMetrics');
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, optimizeForSpeed: true, clip: { x: pageX, y: pageY, width: 1920, height: 1080, scale: 2 } });
    const file = `frames/${String(frames.length).padStart(5, '0')}.jpg`;
    frames.push({ file, t });
    await writeFile(`${directory}/${file}`, Buffer.from(data, 'base64'));
  }
})();
await sleep(1500);

if (journey === 'live' || journey === 'brief') {
  mark('home');
  await click(page.locator('#brief'));
  mark('typing');
  await page.keyboard.type(BRIEF, { delay: 22 * SLOW });
  await sleep(600);
  mark('submit');
  const submit = page.getByRole('button', { name: /Find my angle/ });
  if (journey === 'brief') { await moveTo(submit); await sleep(1500); }
  else {
    await click(submit);
    await page.waitForURL(/view=study/, { timeout: 20 * 60 * 1000 });
    mark('results');
    await page.waitForLoadState('networkidle');
    await sleep(4000);
  }
} else {
  mark('study');
  await sleep(1200);
  await moveTo(page.locator('.angle-select').first(), 900);
  await sleep(800);
  await scroll(260, 900);
  await sleep(900);
  mark('reference');
  await click(page.getByRole('button', { name: /A city guide worth saving/ }).first(), 400);
  await sleep(2200);
  mark('drawer');
  const thumbs = page.locator('.frame-strip button');
  for (const position of [1, 2]) { await click(thumbs.nth(position), 300); mark(`frame${position}`); await sleep(1600); }
  await sleep(600);
  mark('close');
  await click(page.getByRole('button', { name: 'Close source details' }));
  await sleep(700);
  await scroll(-260, 700);
  await click(page.getByRole('button', { name: /Open storyboard/ }), 400);
  await page.waitForURL(/view=storyboard/);
  mark('storyboard');
  await sleep(2500);
  mark('scroll');
  await scroll(520, 2200);
  await sleep(1500);
  await scroll(-520, 1200);
  await sleep(400);
  mark('copy');
  await click(page.getByRole('button', { name: /Copy script/ }), 300);
  await sleep(2500);
}

mark('end');
recording = false;
await recorder;
await writeFile(`${directory}/manifest.json`, JSON.stringify({ frames, marks, slow: SLOW }, null, 1));
await browser.close();
process.stdout.write(`${frames.length} frames (${(frames.length / marks.end).toFixed(1)} fps) → ${directory}\n`);
