# Development

Run from the repository root:

```sh
bun run check
bun run lint
bun test
bun run build
bun run scripts/select-examples.ts
```

The tests use stored fixtures and mocked providers; they do not start live research. The build command produces the client bundle. Use `bun run dev` to run the complete application with its local server.

## Code layout

| Directory | Contents |
| --- | --- |
| `src/` | Brief, research results, history, and storyboard editor |
| `server/` | Project context, Oriane retrieval, research jobs, and AI adapters |
| `shared/` | Zod schemas and approach ordering |
| `scripts/` | Tests, example verification, and evaluation runners |
| `data/` | Bundled studies and the featured example manifest |
| `public/media/` | Bundled source thumbnails and frames |

Provider setup and the adapter contract are in [AI providers](providers.md).

## Example evidence

`data/examples.json` selects the three examples shown in the app. Two older studies remain as compatibility and test fixtures.

`research/examples/sources/` contains the original Oriane responses used to verify source identities, metrics, transcripts, and frame timestamps. `media.json` maps downloaded images to source URLs. `provenance.json` records the featured examples' sources and frame hashes.

`bun run scripts/select-examples.ts` verifies the featured examples without writing files. With `--write`, it regenerates Product photos and Room preview from `curation.json` and updates the manifest and provenance. Recall is a frozen example; the command validates it but does not regenerate it.

## Evaluations

Keep frozen prompts, inputs, and judge outputs unchanged when running a new experiment. Use a new run directory.

| Tool | Purpose | Report |
| --- | --- | --- |
| `scripts/prompt-eval.ts` | Compare product interpretation and creative analysis prompts | [Prompt evaluation](../research/prompt-eval/report.md) |
| `scripts/retrieval-eval.ts` | Capture and compare retrieval strategies | [Retrieval evaluation](../research/retrieval-eval/report.md) |
| `scripts/retrieval-judge.ts` | Prepare blinded comparisons and collect independent judgments | [Protocol](../research/retrieval-eval/protocol.md) |

The reports explain the recorded results and their limits. Preparing an evaluation is offline; generation, retrieval, and judging use your configured accounts. Read the runner's modes before starting a live evaluation.
