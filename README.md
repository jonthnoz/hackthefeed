# Angle

Angle helps mobile app builders find a marketing direction using video evidence. It researches direct competitors, nearby user problems and transferable creative mechanisms, then connects sources to a proposed hook and editable storyboard.

## Run locally

```sh
bun install
codex login
bun run dev
```

Open http://localhost:3000. The server also listens on the local network, so others on the same Wi-Fi can open http://<your-ip>:3000. Put `ORIANE_API_KEY=your_key` in `.env` before starting the server. The key stays on the server. Codex CLI must be installed and authenticated; no OpenAI API key is used.

The three verified examples work from stored studies and local images. A new brief uses Oriane REST and the local Codex CLI. An App Store link can be included in the brief; its description is resolved before planning. Explain the benefit you want to demonstrate for the clearest results.

## Research flow

1. Codex expands the app brief into a value proposition, visual query and lexical terms.
2. Oriane searches visual/semantic and lexical evidence with minimum view and interaction filters.
3. Up to six candidates are enriched. Codex interprets available frames, OCR, transcripts and captions, rejects irrelevant matches, and links directions to retained source IDs.
4. The interface exposes relevance, recorded metrics, frames and timestamps, source text, and original links. The proposed storyboard can be edited and exported.

Requests, model results and finished studies are cached in `.cache/`. Repeating a brief reuses its study. The explicit refresh option makes a fresh research run and can consume Oriane credits. Generated output is English in this prototype.

Recorded interactions are selection signals. They do not establish conversion, sales, paid/organic attribution or the cause of a video's performance. Curated examples are labeled separately from live studies. Sources without extracted frames remain text evidence.

## Verify and reproduce the submission

```sh
bun run check
bun run lint
bun test
bun run scripts/capture-journey.ts brief                       # app must run on :3000
bun run scripts/capture-journey.ts explore <studyId>
uv run scripts/narrate-demo.py
bun run scripts/render-demo.ts                                 # add --still <seconds> for previews
uv run deck/build_deck.py
```

The demo video is a recorded real session of the app, not a mock-up. `capture-journey.ts` drives Chrome with a visible cursor and saves a timestamped 3840×2160 frame sequence under `public/journey/` (gestures and CSS animations run 4× slower, timestamps are rescaled, so playback is real speed). The `live` journey recorded the actual 61-second research run; the brief used is cached, so replaying it is instant. `render-demo.ts` composes the frames with Remotion (`demo/`), adds the Edge TTS narration from `demo/narration.json` and burned-in subtitles, and writes `output/submission/angle-demo.mp4` and `.srt`.

`deck/build_deck.py` fills the official Hack the Feed pitch template (`deck/template/pitch-template.pdf`): it removes only placeholder text, the Lovable logo and unused team avatars, then sets the content from `deck/content.json` in Inter, the template typeface.

Final upload files are in `output/submission/`. Research evidence and verification notes live in `research/oriane/` and `research/production/`.
