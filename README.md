# Angle

Angle helps mobile app builders find a marketing direction using video evidence. It researches direct competitors, nearby user problems and transferable creative mechanisms, then connects sources to a proposed hook and editable storyboard.

This is a local beta for testing and feedback. No software license has been added. The interface and generated research are in English.

## Try the examples

Install Bun first. The beta is verified with Bun 1.3.3 on macOS; other operating systems have not been verified. You also need a browser. From the project directory, run:

```sh
bun install --frozen-lockfile
bun run dev
```

Open http://127.0.0.1:3000. Product photos, Room preview and Recall work from bundled studies and local images. You can explore them without an Oriane key, an AI account, or an installed AI CLI. A fresh installation starts with an empty research history.

## Run your own research

Copy the configuration template:

```sh
cp .env.example .env
```

Set `ORIANE_API_KEY` in `.env`, then configure one AI provider. For the default Codex provider, install Codex CLI separately and run `codex login`. Restart `bun run dev` after changing configuration. Each new research request uses your Oriane account and selected AI provider; usage limits and costs depend on those services.

Choose Codex CLI, Claude Code CLI, or an OpenAI-compatible API such as OpenRouter, LM Studio, or Ollama. See [provider setup and the agent extension contract](docs/providers.md) for commands, model requirements, and instructions for adding a provider. CLI providers use their configured default model unless `AI_MODEL` is set. API providers require an explicit model with vision and strict structured output support.

The server binds to `127.0.0.1` by default. Set `PORT` to change port 3000. To share on a trusted LAN, run `HOST=0.0.0.0 bun run dev` and open `http://<your-ip>:3000` from another device. Angle has no authentication, so use that setting only on a trusted LAN. This release runs locally and does not include cloud deployment, OAuth, or a public companion service.

A new brief uses Oriane REST and the selected AI provider through the local server. An App Store link can be included in the brief; its description is resolved before planning. Explain the benefit you want to demonstrate for the clearest results. AI provider credentials stay on your local server; remote providers receive the prompts and attached images they process.

## Research flow

1. The selected AI provider grounds the value proposition in the brief and project resources. It produces a topic-specific visual description, short literal search phrases, and separate phrases for a nearby need.
2. Oriane retrieves up to 24 lightweight rows across visual and textual searches, with at least 5,000 views and 100 interactions. Creative constraints add up to eight positively described alternative candidates.
3. The AI qualifies the sources' actual user problems before detailed enrichment. Selection prioritizes topic proximity, removes repeated executions, and limits creator concentration and distant presentation mechanisms. If fewer than three close references qualify, one recovery search retrieves up to twelve rows. It disambiguates the task with product-context anchors when available, or checks a nearby need otherwise. It does not repeatedly search until something fits. Constrained runs reserve inspection places for both topic-qualified neutral and targeted alternatives.
4. At most six sources receive full evidence enrichment. Creative constraints are assessed against sampled frames before ideation; only qualifying references support directions. This bound can leave fewer usable sources after visual assessment.
5. Creative approaches start with the one nearest the original brief, followed by broader inspiration when supported. Approach proximity is separate from source relevance. The interface exposes recorded metrics, frames, timestamps, source text and original links. The proposed storyboard can be edited and exported.

New studies retain a `retrievalTrace` with the generated search plan, executed query bodies, returned IDs, qualification decisions, expansion status and shortlist. This records how a result was produced; it does not reuse prior research. Older studies remain readable without the trace or approach-proximity fields.

The bounded retrieval evaluation, including frozen baseline, screening and held-out cases, is documented in [the evaluation protocol](research/retrieval-eval/protocol.md). Captured responses are reusable evaluation fixtures only. They do not change the application's fresh-request behavior.

Angle does not automatically cache or reuse research, Oriane responses, model results, or downloaded frames. Every submitted brief starts fresh work and can consume Oriane credits and provider usage. Finished studies are saved in `data/studies/` so you can reopen them by ID. Submitting the same brief does not reuse a saved study. Generated output is English in this prototype.

Older live studies in `.cache/studies/` are not migrated automatically. To keep one, manually copy its JSON file into `data/studies/`, preserving the filename and any referenced local media. The curated examples in `data/demo-*.json` remain available separately.

Recorded interactions are selection signals. They do not establish conversion, sales, paid/organic attribution or the cause of a video's performance. Curated examples are labeled separately from live studies. Sources without extracted frames remain text evidence.

## Creative constraints and history

Add up to five project links in the recommended Project links field. Angle reads public App Store descriptions, GitHub READMEs, and readable text/HTML pages before planning. Links in the brief are also detected. Resource excerpts and read failures appear in the study's Project context section. Private repositories, sign-in pages, PDFs and binary files are not supported; dynamic websites may provide limited text. Sources are context, not instructions or proof of unstated capabilities. Your explicit clarifications take precedence.

Use Correct brief from a study to restore its brief, links and constraints for editing. The original study remains in History; submitting the revision creates a new study rather than replacing earlier work.

Use the optional creative constraints on the brief form to exclude real people on screen or describe other content to avoid. Excluded and uncertain references remain separate from qualifying alternatives. Constraint assessments use sampled frames and source text; review the original video before production. The no-person rule allows hands-only demonstrations and fingers, while excluding faces, presenters and photorealistic human figures irrespective of how the footage was generated. An explicit additional exclusion can still prohibit hands.

Comparisons show available engagement signals for the inspected samples. A higher recorded median does not prove a format is more efficient, caused engagement, or will sell your product. The sample is small and selected, and platforms, publication dates and audiences may differ. If no qualifying evidence is found, Angle reports that rather than inventing compliant examples.

Open History to find and reopen completed live studies by product or brief. Saved work survives server restarts in `data/studies/`; opening an existing study makes no new research calls. History belongs to this local installation, not an individual authenticated account. Other people allowed to access the same server can see it. Curated examples are separate from history.

## Verify the local release

```sh
bun run check
bun run lint
bun test
bun run build
```

These checks do not require paid provider calls. Provider tests use local fixtures. Keep the `research/` fixtures when sharing a source copy because tests validate examples and evaluations against their recorded evidence.

`bun run build` builds the browser bundle. Continue to use `bun run dev` for the complete local app; the files in `dist/` alone do not include the research server.

## Share the beta

Share the complete source and bundled example assets, including `.env.example` and `bun.lock`. Exclude `.env`, `node_modules/`, `.cache/`, `.audit/`, `data/studies/`, and generated `output/` files. Your history and credentials belong to your local installation. An archive should also omit `.git/`.

Before sharing a Git branch, check `git status --short` and include all intended source, documentation, example media and test fixtures in the same release. Files that are untracked or uncommitted are not available to someone cloning the published branch. See [the beta sharing notes](docs/sharing.md).

## Historical hackathon demo reproduction

The following commands document the original submission workflow. They do not regenerate as part of local setup or release verification.

This historical workflow requires macOS with Google Chrome at `/Applications/Google Chrome.app`, plus `uv` and Python 3.14. The Python scripts declare their dependencies for `uv`. Narration uses Edge TTS online. Generated captures, audio, decks and videos are not included in a fresh source copy.

```sh
bun run scripts/capture-journey.ts brief                       # app must run on :3000
bun run scripts/capture-journey.ts explore <studyId>
uv run scripts/narrate-demo.py
bun run scripts/render-demo.ts                                 # add --still <seconds> for previews
uv run deck/build_deck.py
```

The demo video is a recorded real session of the app, not a mock-up. `capture-journey.ts` drives Chrome with a visible cursor and saves a timestamped 3840×2160 frame sequence under `public/journey/` (gestures and CSS animations run 4× slower, timestamps are rescaled, so playback is real speed). The original `live` journey recorded a 61-second research run. That version cached the brief for instant replay. The local release no longer reuses that cache, so a new recording can make live, billable requests. `render-demo.ts` composes the frames with Remotion (`demo/`), adds the Edge TTS narration from `demo/narration.json` and burned-in subtitles, and writes `output/submission/angle-demo.mp4` and `.srt`.

`deck/build_deck.py` fills the official Hack the Feed pitch template (`deck/template/pitch-template.pdf`): it removes only placeholder text, the Lovable logo and unused team avatars, then sets the content from `deck/content.json` in Inter, the template typeface.

The commands generate submission files under `output/submission/`, which is ignored by Git. Research evidence and verification notes live in `research/oriane/` and `research/production/`.
