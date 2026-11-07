import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import {
  ASSET_PATHS,
  COMPOSITION_ID,
  DEFAULT_SCENES,
  DURATION,
  FPS,
  captionsSchema,
  scenesSchema,
} from "../trailer/timeline";
import type { TrailerProps } from "../trailer/timeline";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const stillIndex = args.indexOf("--still");
const still = stillIndex === -1 ? undefined : Number(args[stillIndex + 1]);
const allowMissingAssets = args.includes("--allow-missing-assets");
const validArguments = new Set(["--still", "--allow-missing-assets"]);
for (const [index, arg] of args.entries()) {
  if (index === stillIndex + 1 && stillIndex !== -1) continue;
  if (!validArguments.has(arg)) throw new Error(`Unknown argument: ${arg}`);
}
if (still !== undefined && (!Number.isInteger(still) || still < 0 || still >= DURATION * FPS)) {
  throw new Error(`--still requires a frame from 0 to ${DURATION * FPS - 1}`);
}
if (allowMissingAssets && still === undefined) {
  throw new Error(
    "--allow-missing-assets is only available for development stills. Final video exports require real assets.",
  );
}

async function optionalJson(relative: string): Promise<unknown> {
  const filename = path.join(root, "public", relative);
  if (!existsSync(filename)) return undefined;
  return JSON.parse(await readFile(filename, "utf8"));
}

const [captionData, sceneData] = await Promise.all([
  optionalJson("trailer/captions.json"),
  optionalJson("trailer/scenes.json"),
]);
const assets = ASSET_PATHS.filter((asset) => existsSync(path.join(root, "public", asset)));
const missing = ASSET_PATHS.filter((asset) => !assets.includes(asset));
if (!allowMissingAssets && missing.length > 0) {
  throw new Error(`Missing required assets under public/:\n${missing.join("\n")}`);
}
const captions = captionData === undefined ? [] : captionsSchema.parse(captionData);
if (!allowMissingAssets && captions.length === 0)
  throw new Error("public/trailer/captions.json must contain timed English captions.");
if (captions.some((caption) => caption.end > DURATION))
  throw new Error("Captions extend beyond the 90-second composition.");
const inputProps: TrailerProps = {
  assets,
  captions,
  scenes: sceneData === undefined ? DEFAULT_SCENES : scenesSchema.parse(sceneData),
  prepared: true,
  allowMissingAssets,
};

const outputDir = path.join(root, "output");
await mkdir(outputDir, { recursive: true });
const executable = [
  process.env.REMOTION_BROWSER_EXECUTABLE,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate !== undefined && existsSync(candidate));
await ensureBrowser({ browserExecutable: executable });
const serveUrl = await bundle({
  entryPoint: path.join(root, "trailer/index.ts"),
  outDir: path.join(outputDir, "trailer-bundle"),
  publicDir: existsSync(path.join(root, "public")) ? path.join(root, "public") : null,
});
const composition = await selectComposition({
  serveUrl,
  id: COMPOSITION_ID,
  inputProps,
  browserExecutable: executable,
});
if (still !== undefined) {
  const output = path.join(outputDir, `trailer-frame-${still}.png`);
  await renderStill({
    composition,
    serveUrl,
    inputProps,
    frame: still,
    output,
    imageFormat: "png",
    browserExecutable: executable,
  });
  process.stdout.write(`Rendered ${output}\n`);
} else {
  const outputLocation = path.join(outputDir, "angle-trailer.mp4");
  await renderMedia({
    composition,
    serveUrl,
    inputProps,
    outputLocation,
    codec: "h264",
    audioCodec: "aac",
    audioBitrate: "192k",
    crf: 17,
    pixelFormat: "yuv420p",
    concurrency: 3,
    browserExecutable: executable,
    enforceAudioTrack: true,
    metadata: { title: "Angle | Your next video starts with a better angle", language: "eng" },
  });
  process.stdout.write(`Rendered ${outputLocation}\n`);
}
