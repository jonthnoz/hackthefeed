# Configure and extend AI providers

Angle calls the selected provider from its local server. Keep credentials in the server's `.env`. Never put keys in browser code, `VITE_` variables, URLs, or committed files. A remote API receives prompts and attached images through this server.

## Start with a provider

From the repository root, run `bun install` and `cp .env.example .env`. Set `ORIANE_API_KEY` in `.env` for live research. This credential is independent of AI provider authentication. The curated examples need no live research calls.

Run one provider command below. Restart the server after changing configuration. Open http://127.0.0.1:3000 in your browser by default.

### Codex CLI

Install Codex CLI and authenticate it, then start Angle:

```sh
codex login
AI_PROVIDER=codex bun run dev
```

`codex` is the default `AI_PROVIDER`. Leave `AI_MODEL` empty to use the CLI's default model, or set it to a model supported by your CLI account. `AI_API_KEY` and `AI_BASE_URL` are not used for this transport. Image attachments are existing local files.

### Claude Code CLI

Install Claude Code CLI and authenticate it, then start Angle:

```sh
claude auth login
AI_PROVIDER=claude bun run dev
```

Leave `AI_MODEL` empty to use the CLI's default model, or set it to a model supported by your CLI account. The adapter passes existing local image files. `AI_API_KEY` and `AI_BASE_URL` are not used for this transport.

### OpenRouter

Set `AI_API_KEY` in `.env` to your own OpenRouter credential. Replace the model placeholder with an available model that supports both vision and strict JSON Schema output:

```sh
AI_PROVIDER=openai-compatible AI_BASE_URL=https://openrouter.ai/api/v1 AI_MODEL=REPLACE_WITH_VISION_AND_JSON_SCHEMA_MODEL bun run dev
```

The placeholder is not a working default. Confirm support for both capabilities with your selected model and backend before a live run.

### LM Studio

Start the LM Studio local server and load a model with vision and strict JSON Schema output support. Replace the placeholder with the loaded model's ID:

```sh
AI_PROVIDER=openai-compatible AI_BASE_URL=http://localhost:1234/v1 AI_MODEL=REPLACE_WITH_LOADED_MODEL_ID bun run dev
```

Leave `AI_API_KEY` empty if your local server does not require authentication.

### Ollama

Start Ollama and pull a model with vision and strict JSON Schema output support. Replace the placeholder with the installed model's ID:

```sh
AI_PROVIDER=openai-compatible AI_BASE_URL=http://localhost:11434/v1 AI_MODEL=REPLACE_WITH_INSTALLED_MODEL_ID bun run dev
```

Leave `AI_API_KEY` empty if your local server does not require authentication. An OpenAI-compatible endpoint alone does not guarantee the required model capabilities.

## Configuration reference

| Variable | Default | Requirement |
| --- | --- | --- |
| `AI_PROVIDER` | `codex` | One of `codex`, `claude`, or `openai-compatible`. |
| `AI_MODEL` | CLI default | Optional for CLI providers. Required for the API transport. |
| `AI_REASONING_EFFORT` | Provider default | Optional `low`, `medium`, or `high`. The selected model must support the setting. |
| `AI_BASE_URL` | None | Required for the API transport, including its version prefix. |
| `AI_API_KEY` | Empty | Your API credential. Optional for a local HTTP endpoint without authentication. |
| `AI_TIMEOUT_MS` | `240000` | Positive integer in milliseconds. |
| `ORIANE_API_KEY` | Empty | Required for live research, regardless of AI provider. |
| `HOST` | `127.0.0.1` | Set to `0.0.0.0` only for a trusted LAN. The server has no authentication. |
| `PORT` | `3000` | Local server port. |

The API transport sends `POST <AI_BASE_URL>/chat/completions` with `response_format` set to `json_schema` and `strict: true`. Images are base64 data URLs in their original order. Select a vision model for research with frames. An unsupported capability must produce a clear error. There is no fallback to text-only analysis, a different model, or a different provider.

`AI_REASONING_EFFORT` maps to Codex's `model_reasoning_effort`, Claude Code's `--effort`, or the API's `reasoning_effort` field. Leave it empty for models that do not support reasoning controls. More reasoning can consume more time and usage; it does not replace a precise brief or grounded prompts.

Angle does not automatically cache or reuse responses, downloaded frames, or completed research. Saved studies in `data/studies/` can be reopened by ID but are not reused when a brief is resubmitted. Old `.cache/studies/` files require a manual copy if you want to retain them. Keep their referenced media too.

## Add a provider as an agent

Use the existing contract in `server/ai.ts`:

```ts
declare function askAI<T>(options: {
  prompt: string;
  schema: z.ZodType<T>;
  images?: string[];
}): Promise<T>;
```

`schema` is the caller's Zod schema. The central boundary serializes it as JSON Schema Draft 7, which the Claude Code CLI validator supports. `images` contains paths to existing local files. A transport parses the provider response into `unknown`. The central `askAI` boundary validates that value against `schema` before returning `T`.

The module responsibilities are:

| Module | Responsibility |
| --- | --- |
| `server/ai.ts` | Select the transport and validate its output centrally with Zod. |
| `server/ai/config.ts` | Parse provider settings and enforce required configuration. |
| `server/ai/process.ts` | Run CLI processes with timeout and cleanup. |
| `server/ai/codex.ts` | Adapt Codex CLI requests and responses. |
| `server/ai/claude.ts` | Adapt Claude Code CLI requests and responses. |
| `server/ai/openai-compatible.ts` | Adapt strict structured output and vision over HTTP. |

To extend the provider set:

1. Read `server/ai.ts` and the existing adapters before editing. Follow their actual signatures and module boundaries.
2. Add the transport under `server/ai/` and register its configuration and dispatch. Keep research callers on `askAI`.
3. Pass the prompt and schema requirements without rewriting source IDs. Preserve the image order so each frame still matches its source ID in the prompt.
4. For a CLI, pass existing local files. For an API, encode those files as base64 data URLs in the same order. Report missing files and unsupported image or schema capabilities explicitly.
5. Parse provider envelopes and JSON into `unknown`, then return that value for central Zod validation. Do not cast raw output to `T`, repair malformed JSON silently, swallow parse errors, or replace failed output with invented data.
6. Preserve useful errors for missing executables, authentication failures, timeouts, nonzero exits, HTTP failures, malformed JSON, and schema violations. Exclude credentials from diagnostics. Clean up temporary CLI files on success and failure.
7. Do not add automatic caches, response reuse, or silent provider, model, or capability fallbacks. Keep credentials on the local server.
8. Update `.env.example` and this guide with empty keys and explicit setup commands. Add no cloud deployment or OAuth flow.
9. Verify with mocked CLI and HTTP responses. Cover valid output, malformed output, schema rejection, image order, and the error paths above without paid calls. Run `bun run check`, `bun run lint`, and `bun test` before handing off.
