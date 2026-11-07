# Render the Angle trailer

Run commands from the repository root. The `AngleTrailer` composition is 1920 × 1080, 30 fps, and 90 seconds.

```sh
bun run scripts/render-trailer.ts
```

The video is written to `output/angle-trailer.mp4`. Rendering uses H.264, AAC narration, and three concurrent frame workers. The script uses installed Chrome when available and otherwise calls Remotion's `ensureBrowser`. Set `REMOTION_BROWSER_EXECUTABLE` to select another installed browser.

To render a production preview at frame 1440:

```sh
bun run scripts/render-trailer.ts --still 1440
```

The image is written to `output/trailer-frame-1440.png`. Before all assets arrive, add `--allow-missing-assets` to a still command. Missing images then appear as labeled development panels. The flag is rejected for MP4 exports.

The coordinator supplies these files under `public/trailer`:

- `screen-home.png`
- `screen-study.png`
- `screen-proof.png`
- `screen-storyboard.png`
- `screen-identify.png`
- `narration.mp3`
- `captions.json`, an array of `{ "start": 0, "end": 2, "text": "English narration" }`, with times in seconds.

Capture the real app at a landscape viewport, preferably 1920 × 1080. Screens appear in large editorial crops with a slow camera move. Keep the important content near the top and center of each capture. The proof capture appears after the source-frame explanation.

The four required source frames are declared in `trailer/timeline.ts`. They use the existing Barcelona, Paris, and Veya assets under `public/media`, with source labels and timestamps from the curated research. The final render checks every required image and the narration before bundling, and requires nonempty captions.

Optional `public/trailer/scenes.json` uses the same shape as `scripts/narration.json`. It must contain eight contiguous scenes totaling 90 seconds. IDs and titles are free text; visual scenes follow array order. If absent, the composition uses this timing:

| Time    | Visual                                           |
| ------- | ------------------------------------------------ |
| 0–8 s   | Builder problem                                  |
| 8–18 s  | Angle and the Sokka brief                        |
| 18–30 s | Oriane visual, speech, and text search           |
| 30–43 s | Nearby value propositions and the real study     |
| 43–56 s | Timestamped source frames, then the proof screen |
| 56–68 s | Adapted storyboard                               |
| 68–80 s | Missing-address promise                          |
| 80–90 s | Angle end card                                   |

`trailer/index.ts` registers `TrailerRoot`. `trailer/Trailer.tsx` exports `AngleTrailer`. The composition also discovers local assets and optional timing files when opened in Remotion Studio. Rendering from the supplied script enforces the final-asset checks.
