# Grounded product prompts

The goal was to prevent ambiguous briefs and reference footage from becoming invented app capabilities while preserving specific, useful creative directions. Recommend variant B, with the original brief passed into analysis. Use medium effort as a starting setting, not as a measured optimum. The run supports the grounding change; it does not rank models or establish that higher effort improves results.

## Measured results

All 24 generations completed and passed the existing output schemas. Four screening scenarios ran on both `gpt-6.1-sol` at medium effort and `gpt-6-astra` at high effort. Four held-out scenarios alternated between those strategies. Each strategy generated 12 outputs. Every A/B pair used the same scenario, output schema, model and effort. No model fallback occurred.

Claude Code `opus` at high effort and Codex `gpt-6.1-sol` at high effort each judged all 12 pairs in one blinded batch. Opaque pair labels and side assignments were reproducible from a fixed seed. Neither judge received generator model names, variant names, prompt text or the assignment mapping. Both returned every required pair ID, and their listed fabrication counts passed consistency checks.

| Judge | A unsupported claims | B unsupported claims | A outputs with zero claims | B outputs with zero claims | Preferences |
| --- | ---: | ---: | ---: | ---: | --- |
| Claude Opus, high | 4 | 0 | 9/12 | 12/12 | B 12, A 0, ties 0 |
| Codex gpt-6.1-sol, high | 4 | 0 | 8/12 | 12/12 | B 5, A 0, ties 7 |

Claim counts sum distinct unsupported claims within each output. They are not counts of globally unique capabilities. The two judges' totals must not be added together.

Secondary scores use 0-4 scales. These are subjective judgments of the supplied text, not retrieval measurements.

| Judge | Faithfulness, A to B | Specificity, A to B | Actionable uncertainty, A to B | Explicit capabilities, A to B |
| --- | ---: | ---: | ---: | ---: |
| Claude | 2.92 to 4.00 | 3.00 to 4.00 | 1.92 to 4.00 | 2.75 to 4.00 |
| Codex | 3.33 to 4.00 | 3.67 to 3.92 | 3.08 to 4.00 | 3.33 to 4.00 |

Both judges reported zero creative-constraint violations under the frozen, stricter rule. Both preserved explicitly requested translation and automatic payment in the positive controls. Codex tied both translation pairs and the autopay pair, which provides useful counterevidence to treating every B output as a meaningful improvement.

## What changed and what the outputs show

A snapshots the original planning and analysis wording. B separates stated capabilities, plausible situations and unresolved assumptions. It asks for useful shared actions when wording is ambiguous and prevents an open question from adding a speculative feature to retrieval. Analysis additionally receives the original brief and focus. This comparison therefore measures wording plus restoration of authoritative product context, not wording alone.

- In the ambiguous reader case, A on Sol identified the translation question but still retrieved `document translation and read aloud`. B kept that uncertainty in the question and used document listening and text-to-speech terms. A on Astra avoided an explicit translation term already; B still made the unresolved selector meaning explicit.
- With the poisoned reader plan, A produced translation-led angles and the line `Read the translated text in your chosen language.` B corrected the plan, described pronunciation and voice selection, and kept the original text unchanged. This is the clearest analysis-stage failure and correction.
- Expense tracking stayed within recordkeeping in both variants. Bill reminders stayed separate from executing payments. Explicit translation and autopay survived B's grounding instructions. Both photo-editing outputs confined improvements to the image rather than claiming physical renovation.
- In subscription analysis, B preserved manual entry, reminders and the post-provider-cancellation status update. It rejected a stale roadmap, acknowledged the unloaded URL and flagged the plan's calendar interface as unconfirmed. A correctly rejected bank linking and automatic cancellation too, but omitted supported reminders and status updates while depicting an in-app calendar.

The judges agreed on the reader retrieval contamination, the poisoned translation plan and the calendar assumption. Claude counted translation and universal comprehension as two claims in the poisoned output; Codex counted the repeated translation capability once. Codex additionally counted unspecified bill-notification timing as one claim; Claude noted the timing assumption without counting a feature. The calendar itself is borderline because an editorial depiction can resemble an asserted interface capability. Treat these disagreements as measurement uncertainty.

My synthesis is narrower than Claude's unanimous preference and perfect B subscores. Codex's seven ties better reflect that the baseline already handled several scenarios well. Both Astra reader queries also omitted a concrete input–selector–playback demonstration. Retain B's grounding and original-brief propagation, then inspect the planned historical retrieval runs before concluding that its retrieval phrasing is better.

## Scope and reproducibility

The frozen run hash is `ebdbf1c2c2ed9d5d7ab5cadf52735065fccc594aec6fdf73dca1ac3ecf319759`. The manifest, individual prompts and structured outputs, blind mapping, call ledger and complete judge responses are in [runs/grounding-v1](runs/grounding-v1). [summary.json](runs/grounding-v1/summary.json) contains the underlying score vectors. [README.md](README.md) provides the commands.

The user changed the no-human policy during held-out execution. The evaluated B source was preserved before editing production. [frozen-prompts.source.txt](frozen-prompts.source.txt) retains the exact original bytes and hash. [frozen-prompts.ts](frozen-prompts.ts) changes only the type import path. A deterministic check regenerated all 24 sent prompts exactly. Production now allows hands/fingers-only demonstrations while excluding faces, presenters and full people. Eight local tests, 178 assertions, type-checking and targeted lint passed. The hands policy has deterministic prompt coverage; the 24-generation results measure the earlier stricter rule, not every semantic detail of the final production version.

The first Claude judge attempt failed locally before inference because the installed CLI rejected Zod's Draft 2020-12 schema dialect. Direct empty-input validation reproduced that error. The real Draft 7 preflight exited zero with no stderr. Retrying the same blind prompt with Draft 7 produced the successful Opus verdict. The ledger preserves the failed attempt. Total judge attempts were three, with two valid verdicts and one pre-inference failure. No further model calls were needed. Main owns the corresponding production schema fix. The original Codex generation records still describe their actual Draft 2020-12 requests.

The named Codex models were explicit CLI arguments. `opus` was the Claude alias supplied. The helpers do not expose resolved provider versions or token usage, so no more precise model-version claim is available. Claude tools were disabled. Codex used a read-only sandbox and a prompt prohibition on tools; its full tool-use trace was not retained. The original protocol's claim that tools were disabled for every candidate is corrected here.

## Limits and next step

There was one sample per scenario, strategy and variant, with no estimate of run-to-run variance. Held-out cases differ between model strategies, and model identity is coupled to reasoning effort. The Codex judge shares a model family with the generators. These are correlated subjective assessments, not independent statistical trials or evidence of a causal model or effort ranking.

The analysis cases used synthetic text evidence and no images. No Oriane research API calls, live retrieval or URL fetches were made. Specificity scores therefore do not measure search recall, relevance, conversion or creative performance. B often uses longer natural-language phrases, while the backend uses exact-phrase retrieval. Inspect main's six unchanged historical reruns for this practical concern. Do not modify the historical briefs or add case-specific mappings to improve the result.

Model the Domain and Type System Discipline kept planning and analysis scenarios distinct and derived prompt inputs from existing schemas. Prove It Works required actual CLI outputs, both complete verdicts and exact frozen-prompt reproduction. Explain the Number limits the recommendation to the observed paired outputs and keeps the unresolved retrieval and variance questions explicit.
