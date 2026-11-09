import { mkdir, readFile, writeFile } from 'node:fs/promises';

const records = [
  ...JSON.parse(await readFile('research/examples/E01-finalists.json', 'utf8')).response.data.results,
  ...JSON.parse(await readFile('research/examples/E02-constraint-replacements.json', 'utf8')).response.data.results,
  ...JSON.parse(await readFile('research/examples/E03-photo-constraint.json', 'utf8')).response.data.results,
  ...JSON.parse(await readFile('research/examples/E04-final-mechanisms.json', 'utf8')).response.data.results,
  ...JSON.parse(await readFile('research/oriane/final-full-evidence.json', 'utf8')).response.data.results.filter(c => ['ccx.study', 'degrasya77', 'googlegemini'].includes(c.profileHandle)),
];
const manifest = [];
for (const content of records) {
  const dir = `public/media/examples/${content.id}`;
  await mkdir(dir, { recursive: true });
  const images = [
    { sourceUrl: content.thumbnailMediaUrl, local: `/${dir.slice(7)}/thumbnail.webp`, seconds: null },
    ...content.media.flatMap((media, mediaIndex) => (media.frames ?? []).map((frame, index) => ({
      sourceUrl: frame.url, local: `/${dir.slice(7)}/m${mediaIndex}-f${String(index).padStart(3, '0')}.webp`,
      seconds: frame.timestampSeconds, mediaIndex, frameIndex: index,
    }))),
  ];
  for (let start = 0; start < images.length; start += 8) {
    await Promise.all(images.slice(start, start + 8).map(async item => {
      const path = `public${item.local}`;
      if (!await Bun.file(path).exists()) {
        const response = await fetch(item.sourceUrl, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`Image HTTP ${response.status} for ${content.id}`);
        await writeFile(path, Buffer.from(await response.arrayBuffer()));
      }
      if (await Bun.file(path).size === 0) throw new Error(`Empty image ${path}`);
    }));
  }
  manifest.push({ id: content.id, creator: content.profileHandle, duration: content.media[0]?.duration, images });
  process.stdout.write(`${content.profileHandle}: ${images.length - 1} frames saved\n`);
}
await writeFile('research/examples/media.json', `${JSON.stringify(manifest, null, 2)}\n`);
