# Retrieval protocol v1

Frozen before implementation. Source copies in `frozen/` preserve the existing research algorithm, planner and shared plan schema. Three screening scenarios and three held-out scenarios in `scenarios.json` are fixed. No domain-specific retrieval rules may be added to win these cases. Held-out descriptions are necessarily visible to implementers; the gate prevents tuning on their measured outputs, not knowledge of their existence.

The hypothesis is that shorter grounded queries, a larger qualified pool, and one bounded expansion improve useful discovery. The user requires the final two or three approaches to start nearest the original subject, then offer broader inspiration. That is a presentation requirement, not a reason to force the first retrieved video to be direct. Keep retrieval effects and final presentation checks separate.

## Paired arms

| Arm | Queries | Light pool | Selection |
| --- | --- | --- | --- |
| A | Frozen old planner | Visual 6, exact-caption/transcript 6; constrained targeted 4 | Frozen interleave/dedup six; append targeted up to ten when constrained |
| B | New planner | Same 6/6/4 limits derived from matching C responses | Same frozen interleave and limits |
| C | New planner | Initial visual 12, lexical 12; constrained targeted 8 | Production qualification and selection, max six |
| D | Same as C | Same initial pool, plus one adjacent lexical 12 only when fewer than three direct/adjacent remain | Same qualification and selection |
| O | Same as C | Exactly C's IDs | Same selected set as C in frozen encounter order |

A/B isolates changed query generation with old pool/selection. B/C is the combined larger-pool and qualification effect. Add C-small using the production qualifier and selector on B's entire 6/6/4 pool, then B/C-small isolates qualification and C-small/C isolates pool size. C/D isolates adaptive expansion on the same captured initial pool. C/O isolates retrieval order only, without changing membership. Order findings are diagnostic and never justify forcing a direct source into slot one. Report that slicing a captured top-12 response assumes stable result prefixes; note it as a limitation rather than an independently repeated top-6 request. Record all raw pool IDs so this assumption can be checked later if needed.

The old constrained path really selects up to ten, so report useful@6 on its first six and also report constrained total selected. Never quietly change the frozen legacy behavior into six overall.

## Stages and evidence

1. `prepare` is offline. Verify source hashes, freeze protocol/scenarios, write manifest and explicit budgets, validate contracts. No `.env` reads and no application cache.
2. `screen` is live only after explicit authorization. Generate old and new plans for three screening briefs. Capture exact provider requests/responses once in this run. Reuse those captures across ablations only. Failed and started requests count against ceilings. No implicit retries or model fallback.
3. Review screening, then `seal` the candidate production source hashes and a decision note before `heldout`. No further strategy tuning against hold-out results; changes require a new protocol/run and a candid contamination note.
4. Build a single blinded union of light evidence per scenario. Both independent judges label the same unique IDs once, regardless of arm. Strip engagement metrics, strategy identity, query trace and arm membership. Each judge independently reviews all anonymized lists on one scale. Judge artifacts must not contain the hidden mapping.
5. `enrich` optionally fetches at most six IDs per scenario in one full-projection request. Select deterministically from arm disagreement first, then top positions. This is a bounded richer-text/frame-metadata check, not full-video or image inspection. An actual image check needs a separately logged image budget. Never claim text metadata proves whole-video constraint compliance.
6. Independent Codex and Claude judges separately assess the same evidence, blind to arm and generation model. Recheck only the enriched union subset, reporting disagreement and changes rather than replacing light labels silently. Presentation checks require actual generated approaches and qualified sources; they remain pending if no such output was captured.
7. `summarize` reports per-scenario, per-split and per-judge results. No promotion before all six cases and both judge families are present. Empty or short lists remain visible; never drop failed scenarios from denominators.

## Budgets for one complete run

Hard ceiling across six briefs is 36 light searches, 16 visual asset creations, and 6 optional full-projection calls with at most 6 IDs each. The coordinator explicitly corrected the asset ceiling from 12 to 16 before live work. Two plan variants need up to 12 unfiltered assets; two constrained scenarios need up to 4 additional assets. Full search calls count separately from the 36 light searches. Requests are recorded before dispatch. Started/failed requests consume budget; recovery reuses completed captures only.

Generation uses explicit Codex `gpt-6.1-sol`, medium effort, no fallback. The coordinator explicitly amended the planner ceiling to 13 total attempts, at most 12 successful paired plans plus the recorded initial sandbox preflight failure. That first CLI call exited in 92 ms under the restricted shell before inference. Its failed capture remains in the ledger. Only that exact request has one explicitly flagged retry; other failures stop. Live CLI execution requires the escalated shell. The ceiling is 18 initial/expanded qualification calls and 0 final-analysis calls in the retrieval phase. C-small reuses the full initial-pool qualification, restricted to its member IDs. This holds qualification fixed; a duplicateOf target outside the smaller pool can still suppress its representative, a disclosed context limitation. Both judges use separate explicit configurations, Codex `gpt-6.1-sol` high and Claude `opus` high; the Claude alias cannot establish an exact model version. Maximum 4 judge calls per split (two light plus two richer), 8 total; optional presentation judgments share those requests. All model calls have 240-second generation or 480-second judge timeouts. No dollar-cost assertion without billing evidence. Report request counts and observed durations, model aliases and effective-version uncertainty.

## Common label rubric and metrics

Judges label each unique candidate with need proximity (direct, adjacent, transferable mechanism, irrelevant, unknown), useful for the brief (yes/no/uncertain), creative mechanism category, capability misinterpretations, and constraint status (fits/violates/unknown). Give an evidence quote or missing-evidence reason. A source advertising a capability this app lacks is not automatically useless; transferable presentation is allowed if the unsupported capability is not adopted. Hands-only demonstrations are allowed. Sparse metadata yields unknown, not an invented certainty.

The primary metric is close-and-useful@6. Count sources among the first six only when both useful and direct or adjacent, with fixed denominator six. A useful mechanism in another domain does not count toward this primary metric. Missing slots contribute zero. Report top-1 need proximity as descriptive labels, generic useful@6 separately, unknown count, relevant/direct/adjacent counts, duplicate and creator concentration, and distinct useful mechanisms among the first six. Report capability fidelity of plans and any captured approaches separately from source relevance. For approaches report count two or three, clarity of product interpretation, distinctness, grounded source support, and closest qualified approach first. This presentation check does not establish retrieval causality.

Promotion requires each independent judge to find no mean held-out reduction in close-and-useful@6 for the combined strategy versus A, plus a screening practical gain of at least one close-and-useful reference per study. Report every individual regression. If that gate fails, do not promote the combined strategy blindly. Retain only supported winning ablations, instrumentation and presentation ordering, and mark the overall result inconclusive. This is one trial per scenario with no statistical claim.

Use paired scenario deltas and individual outcomes, not pooled video counts as independent experimental samples. Keep disagreements between judges visible. Model judgments are labels, not ground truth. The retrieved union is not the corpus, so do not claim corpus recall, conversion effects, statistical significance or causal attribution beyond the ablations' controlled factors. No fabricated numeric quality scores; before live outputs and verdicts exist, status is pending.
