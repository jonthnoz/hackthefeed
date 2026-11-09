# Share the local beta

The beta is intended for testing and feedback. No software license is added. It runs on the recipient's machine and uses their own Oriane credential and selected AI provider for live research.

## Include the complete source

Keep the app source, `package.json`, `bun.lock`, `.env.example`, `data/demo-*.json`, `data/examples.json`, `public/media/`, documentation and tests together. The tests also read recorded fixtures under `research/`; do not remove those fixtures from a source release that advertises the test suite.

Exclude local credentials and work: `.env`, `node_modules/`, `.cache/`, `.audit/`, `data/studies/`, `dist/`, and `output/`. Omit `.git/` from a source archive. A Git clone already excludes files covered by `.gitignore`, but only includes changes committed to the shared branch.

Check `git status --short` before preparing a release. Include new provider modules, UI components, curated example files and media with their callers. Sharing only tracked files from a partly updated working tree can produce a broken app.

## Verify a fresh copy

From a clean source directory with no `.env` or `node_modules/`, run:

```sh
bun install --frozen-lockfile
bun run check
bun run lint
bun test
bun run build
bun run dev
```

Open http://127.0.0.1:3000. Verify that the home page and all three examples open, their images load, and History is empty. No AI authentication or Oriane key is needed for this check. Live research requires the recipient's configuration, as described in [the provider guide](providers.md).

The tested environment is Bun 1.3.3 on macOS. Other operating systems have not been verified. Run one local development server per machine during this check; concurrent copies can compete for Vite's development WebSocket port.

The beta is a local server with no user authentication. Sharing its source is separate from exposing that server publicly. Building `dist/` does not produce a standalone hosted service.

## Keep generated demo files separate

The historical hackathon recording and deck workflow has additional macOS, Chrome, `uv` and Python requirements. Its generated `output/`, `public/demo/` and `public/journey/` files are ignored by Git and are not necessary to run the beta.

Source examples contain video frames and excerpts linked to their original sources. The repository's beta status does not turn those references into original product footage or proof of marketing performance.
