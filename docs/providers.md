# Configure and extend AI providers

Angle calls the selected provider from its local server. Keep credentials in `.env`, outside browser code and version control. Remote providers receive prompts and attached images.

## Start with a provider

Copy `.env.example` to `.env` and set `ORIANE_API_KEY` for live research. Configure one AI provider below. Bundled examples need no credentials.

Run commands from the repository root. Restart the server after changing configuration. Open http://127.0.0.1:3000.

### Codex CLI

Install Codex CLI and authenticate it, then start Angle:

```sh
codex login
AI_PROVIDER=codex bun run dev
```

`codex` is the default provider. Angle passes `--ignore-user-config`, so set `AI_MODEL` explicitly if you want a particular model. When empty, Angle omits the model argument and lets the CLI select it.

### Claude Code CLI

Install Claude Code CLI and authenticate it, then start Angle:

```sh
claude auth login
AI_PROVIDER=claude bun run dev
```

Leave `AI_MODEL` empty to let the CLI select a model, or set an ID available to your account. Both CLI providers use their own authentication and ignore `AI_API_KEY` and `AI_BASE_URL`.

### OpenAI-compatible API

Set these values in `.env`, using the endpoint below and an actual model ID:

```dotenv
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=REPLACE_WITH_YOUR_MODEL_ID
AI_API_KEY=
```

| Service | `AI_BASE_URL` | Setup |
| --- | --- | --- |
| OpenRouter | `https://openrouter.ai/api/v1` | Set `AI_API_KEY` to your OpenRouter key. |
| LM Studio | `http://localhost:1234/v1` | Start its local server and load your model. |
| Ollama | `http://localhost:11434/v1` | Start Ollama and pull your model. |

Choose a model and backend that support image inputs and strict JSON Schema output. The endpoint address alone does not establish compatibility. Leave `AI_API_KEY` empty only when the endpoint needs no authentication, then run `bun run dev`.

## Configuration reference

| Variable | Default | Requirement |
| --- | --- | --- |
| `AI_PROVIDER` | `codex` | One of `codex`, `claude`, or `openai-compatible`. |
| `AI_MODEL` | Unset | Optional for CLI providers, with the Codex caveat above. Required for the API transport. |
| `AI_REASONING_EFFORT` | Provider default | Optional `low`, `medium`, or `high`. The selected model must support the setting. |
| `AI_BASE_URL` | Unset | Required for the API transport. HTTP or HTTPS, including the version prefix; no embedded credentials, query, or fragment. |
| `AI_API_KEY` | Empty | Your API credential. Optional for a local HTTP endpoint without authentication. |
| `AI_TIMEOUT_MS` | `240000` | Integer from `1` to `3600000`, in milliseconds, per provider call. |
| `ORIANE_API_KEY` | Empty | Required for live research, regardless of AI provider. |
| `HOST` | `127.0.0.1` | Set to `0.0.0.0` only for a trusted LAN. The server has no authentication. |
| `PORT` | `3000` | Integer from `1` to `65535`. |

The API transport sends `POST <AI_BASE_URL>/chat/completions` with `response_format` set to `json_schema` and `strict: true`. Images are base64 data URLs. Angle validates returned JSON against the caller's schema and reports HTTP and parsing failures. It cannot verify whether a backend actually used the images.

`AI_REASONING_EFFORT` maps to Codex's `model_reasoning_effort`, Claude Code's `--effort`, or the API's `reasoning_effort` field. Leave it empty for models that do not support reasoning controls.

## Add a provider as an agent

Use the existing contract in `server/ai.ts`:

```ts
declare function askAI<T>(options: {
  prompt: string;
  schema: z.ZodType<T>;
  images?: string[];
}): Promise<T>;
```

`askAI` converts the caller's Zod schema to JSON Schema Draft 7. Adapters receive `{ prompt, jsonSchema, images }` and return `Promise<unknown>`; `askAI` validates the result before returning `T`. Images are paths to existing local files. Preserve their order so they match the source IDs in the prompt. Codex receives file paths; Claude Code and the HTTP adapter encode file contents as base64.

Add the adapter under `server/ai/`, extend configuration in `server/ai/config.ts`, and register dispatch in `server/ai.ts`. Keep research callers on `askAI`. Use `server/ai/process.ts` for CLI execution with timeouts, and clean up temporary files on success and failure.

Propagate provider and validation failures without exposing credentials, inventing output, or silently switching models or providers. Update this guide and `.env.example` for new settings. Verify output validation, image order, and failure handling with local fixtures in `scripts/ai.test.ts`.
