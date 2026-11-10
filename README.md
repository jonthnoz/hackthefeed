# Angle

Find marketing video ideas for your app, with real videos to back them up. Angle helps app builders and marketers research a topic, compare creative approaches, and draft a storyboard.

[Download the original hackathon demo](https://github.com/jonthnoz/hackthefeed/raw/refs/heads/main/docs/demo/angle-demo.mp4) to watch it. [English subtitles](docs/demo/angle-demo.srt) are also available.

## Run locally

Requires [Bun](https://bun.sh).

```sh
bun install --frozen-lockfile
bun run dev
```

Open http://127.0.0.1:3000. Three bundled examples work without API keys or an AI login.

For your own research:

```sh
cp .env.example .env
```

Set `ORIANE_API_KEY` in `.env`. Install the [Codex CLI](https://github.com/openai/codex), sign in with `codex login`, and restart Angle.

You can also use Claude Code, OpenRouter, or a local OpenAI-compatible server. See [AI providers](docs/providers.md) for configuration and custom adapters. Live research uses your Oriane and AI accounts.

## From brief to storyboard

1. Describe your app and the problem it solves. Add a public project link, such as an App Store page or repository, to give Angle more context.
2. Set any creative constraints, such as excluding faces and presenters while allowing hands.
3. Angle searches Oriane for videos about that problem and related needs. It compares views and interactions, then examines source text and sampled frames to identify useful approaches. These metrics indicate reach and engagement, not sales.
4. Explore the approaches and their source videos, starting with the closest match to your brief. Open the proposed storyboard, edit it, and export it as Markdown.

If Angle misreads your product, use **Correct brief** to start a revised study. History keeps your previous research in `data/studies/`. Storyboard edits stay in your browser.

The interface and generated research are in English.

## Development

See [development and evaluations](docs/development.md) for checks, source verification, and prompt and retrieval experiments.
