# Reproduce the product prompt comparison

Use the installed Codex CLI and authenticated Claude Code CLI. In the managed workspace, inference commands need escalation for network and keychain access. No credentials or `.env` files are read by this script.

Run these commands sequentially from the repository root, using a fresh output directory for a new run.

```bash
bun run scripts/prompt-eval.ts prepare research/prompt-eval/runs/new-run
bun run scripts/prompt-eval.ts screen research/prompt-eval/runs/new-run
bun run scripts/prompt-eval.ts heldout research/prompt-eval/runs/new-run
bun run scripts/prompt-eval.ts judge-claude research/prompt-eval/runs/new-run
bun run scripts/prompt-eval.ts judge-codex research/prompt-eval/runs/new-run
bun run scripts/prompt-eval.ts summarize research/prompt-eval/runs/new-run
```

Screen and heldout modes resume by preserving completed output files. Every attempted call, including a failed or interrupted call, consumes the recorded budget. The limits are 24 generation calls and four judge calls. Existing verdicts cannot be overwritten. There is no automatic model fallback; a failed requested model remains a logged failure. Run modes sequentially because the call ledger has one writer.

The manifest freezes prompt, baseline, scenario and protocol hashes. Each generated result includes the model argument, effort, prompt hash, validated structured output and advisory wording flags. Prompt files preserve what was sent. `calls.json` records success or failure, and `blind-mapping.json` reverses the seeded labels after judging. Judge prompt files contain opaque pair labels, with no variant or generator model names. Judge raw structured responses are saved before completeness checks.

The run uses `frozen-prompts.ts`, captured before the user clarified that hands/fingers-only demonstrations are allowed. `frozen-prompts.source.txt` preserves the exact original source bytes and hash; the executable copy changes only its type import path. The production module now allows hands-only demonstrations. That later policy change has deterministic coverage and was not part of the 24 measured generations. The frozen module regenerates all 24 saved prompt texts exactly.

The first Claude attempt failed before inference because this CLI rejected the default Draft 2020-12 schema dialect. An empty-input replay reproduced the rejection. A real empty-input Draft 7 preflight exited zero with no stderr. Claude judging therefore uses Draft 7; the original Codex generations retain their actual Draft 2020-12 schema history. Both preflight records are saved with the run.

The production helpers clean their temporary directories. They do not expose resolved model versions, token usage or complete CLI traces. Claude uses disabled tools and customizations. Codex uses a read-only sandbox, ignores user config and receives a prohibition on tool use. Its complete tool-use trace cannot be verified from these saved results. The original frozen protocol overstates tool disabling for Codex; this paragraph corrects that statement without altering the frozen record.

`baseline.ts` is the captured original prompt wording. `scenarios.ts` owns the fixed matrix. `protocol.md` records the pre-run method. `decisions.tsv` records execution choices. `report.md` contains the completed findings and their limits.

Run local checks without inference.

```bash
bun test scripts/prompt-eval.test.ts
bun run check
bunx oxlint server/prompts.ts scripts/prompt-eval.ts scripts/prompt-eval.test.ts research/prompt-eval/*.ts
```
