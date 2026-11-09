# Run the retrieval comparison

The original source freeze is in `frozen/`. The active candidate source freeze, explicit ceilings and amendments are in `runs/topical-screen-v1/manifest.json`. All calls, including failed or started calls, have separate request/response files in that run's `calls/` directory. Run one live writer at a time. Normal Bun credential autoload is authorized for authenticated services. Do not inspect or print secrets.

Validate locally without loading credentials.

```sh
bun --no-env-file test scripts/retrieval-eval.test.ts
bun --no-env-file run check
```

The coordinator owns the current live screening process. Its authorized command is below. It requires an escalated shell so the authenticated Codex CLI can run. Do not launch a second copy while `live.lock` exists.

```sh
bun run scripts/retrieval-eval.ts screen research/retrieval-eval/runs/topical-screen-v1 --live --retry-failed-plan
```

The retry flag applies only to the initial recorded 92 ms sandbox preflight failure. It preserves that failure and counts the retry as another attempt. No other request is retried implicitly. Successful captures are reused within this evaluation only.

Each `<scenario>.json` contains `scenario`, `split`, both plans, the common light `candidates` union, `arms` with `id`, `plan`, `poolIds`, and `selectedIds`, and the production `trace`. A is frozen legacy, B changes queries, C-small applies fixed qualification to B's pool, C grows the initial pool, D adds conditional expansion, and O restores encounter order on exactly C's selected set. Independent judges use this same candidate union. Their tools live in `scripts/retrieval-judge.ts` and have separate artifacts under `review/`.

After the live process finishes, derive the ablations from exact captured lane payloads in production's visual, lexical, targeted encounter order. This offline command refuses to issue a missing provider request. If an earlier derivation differs, it preserves the earlier result alongside the corrected result.

```sh
bun --no-env-file run scripts/retrieval-eval.ts derive research/retrieval-eval/runs/topical-screen-v1
```

After screening, a richer evidence check can fetch at most six selected IDs per case in one full-projection request. This command is live and uses the same exclusive lock and global ledger.

```sh
bun run scripts/retrieval-eval.ts enrich research/retrieval-eval/runs/topical-screen-v1 --live
```

It writes `enriched-screen.json`, an array of records with `scenario`, `requestedIds`, `missingIds`, `candidates`, `evidenceKind`, and `selectionPolicy`. IDs appearing in some selected lists but not all come first, then best position, then a SHA256 tiebreak. O does not affect this choice. Rich evidence consists of full text and indexed frame metadata. No image or complete video inspection occurs.

Inspect screening and both independent verdicts before sealing the strategy. Supply an actual decision note. This command is offline.

```sh
bun --no-env-file run scripts/retrieval-eval.ts seal research/retrieval-eval/runs/topical-screen-v1 'Advance unchanged after reviewing screening and both judges; record observed limitations here.'
```

Held-out calls require that seal and the same frozen retrieval inputs. They never start automatically.

```sh
bun run scripts/retrieval-eval.ts heldout research/retrieval-eval/runs/topical-screen-v1 --live
bun run scripts/retrieval-eval.ts enrich research/retrieval-eval/runs/topical-screen-v1 --live --heldout
```

The primary metric and promotion gate are fixed in `protocol.md`. Useful mechanisms in other domains do not count as close-and-useful. Source top-one proximity is diagnostic. Final approach clarity, distinctness and nearest-subject-first ordering require actual generated approaches and remain separate presentation checks.

## Evaluation status

The current sealed candidate is [topical-v3](runs/topical-v3/manifest.json). The commands above document the original screening run. Do not restart that run or issue new live calls to update the report.

Read [the evaluation report](report.md) for measured screening scores, paired ablations, heldout status, separate product checks, and cumulative budget accounting. The [screen seal](runs/topical-v3/screen-seal.json) fixes the candidate before heldout results. The [context amendment](context-amendment.md) and [conditional recovery decision](conditional-recovery.md) preserve the rejected universal-context trial and the final policy rationale.

Heldout review covers every source selected by any arm under the [policy fixed before labels](runs/topical-v3/heldout-review-policy.json). All @6 metrics keep denominator six. The final run inherits ancestor calls, including failures and earlier screening judges. Count unique call IDs once rather than summing run directories. Retrieval scores and the nearest-approach-first presentation check remain separate.
