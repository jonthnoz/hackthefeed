# Retrieval strategy evaluation

The goal is to find more useful references close to the user's actual need, with verified improvements. The final two or three approaches must start with the closest supported interpretation of the brief. That presentation requirement has a separate check.

Both judges pass the fixed screening and heldout gates for sealed V3 on the initial light evidence. Retain the candidate, with later accepted-source yield as the next evaluation priority. Both richer-subset checks are complete and their secondary sensitivity calculation remains positive. All requests are accounted for. No production changes or strategy tuning followed the seal.

## Decision and fixed gate

Keep the sealed candidate unchanged. Advance the combined strategy only if each judge independently finds a mean heldout D minus A close-and-useful count of at least zero. Each judge must also find at least one additional close-and-useful reference per screening case on average. Screening satisfies the latter condition. List every individual regression even if the mean passes.

| Judge | V1 screen mean D minus A | V3 screen mean D minus A | V3 heldout mean D minus A | Promotion |
| --- | --- | --- | --- | --- |
| Codex | +3.0000 | +3.6667 | +2.3333 | Judge gate passes |
| Claude | +2.0000 | +2.0000 | +0.6667 | Judge gate passes |

These are reference counts on a zero-to-six scale. The corresponding V3 screening gains in close-and-useful@6 are +0.6111 and +0.3333. Heldout mean counts change from 2.0000 to 4.3333 for Codex and from 1.0000 to 1.6667 for Claude. Their normalized gains are +0.3889 and +0.1111. Means use three paired cases per split, separately for each judge. They do not pool videos as independent samples. Evidence is in the [V1 summary](review/topical-screen-v1/summary.json) and [V3 summary](review/topical-v3/summary.json).

Claude's Plant diagnosis result regresses from 3/6 to 2/6. The two other heldout cases offset this loss in Claude's mean. Passing the average gate does not establish an improvement for every case or reliable constraint compliance.

If either judge fails the heldout gate, do not promote the combined strategy. Retain only improvements supported by the ablations, instrumentation, and separately verified presentation changes. Mark the combined result inconclusive.

## Phases and policy choice

The [protocol](protocol.md) froze three screening briefs, three heldout briefs, paired arms, the rubric, and the gate before live work. Heldout descriptions were visible, but measured heldout outputs were not used to choose the strategy.

V1 tested short grounded task queries, a larger light pool, qualification, and one nearby-need expansion. D minus A counts were +3, +2, and +4 for Codex on Sokka, Reader, and Splitly. Claude found +3, 0, and +3. Reader remained weak. The nearby article-reader expansion returned no rows, and voice compilations did not establish a document-listening workflow. The [manual screening audit](manual-screen-audit.md) records this unblinded diagnosis separately from the independent labels.

V2 tested a universal task-AND-context lexical filter under the [context amendment](context-amendment.md). Original task phrases, visual descriptions, and nearby terms were preserved. One extra batch generated context arrays for the three screening briefs. The narrower filter reduced Sokka and Splitly lexical responses from 12 rows each to 2 each. Reader returned 4 contextual rows, including one direct Speechify demonstration, but neighboring voice-generation content remained. Splitly selected only 3 sources and no longer supplied 3 close qualified sources. These are unblinded capture and qualification observations, not independent V2 quality scores. V2 was rejected and remains preserved in [its run directory](runs/topical-v2/).

V3 preserves the initial short task queries. After qualification, fewer than three distinct direct or adjacent sources trigger exactly one recovery search. Defensible context anchors select a task-AND-context refinement. Otherwise, recovery uses nearby-need terms. There is no second recovery. Screening reuses original plans and separately generated context arrays. Heldout plans produce the complete final contract in their normal planner call. The [conditional recovery decision](conditional-recovery.md) records the rationale.

Only Reader triggered V3 recovery during screening. Its trace records `refined=true` and `expanded=false`, 4 contextual results, and 2 qualification calls. Its selected list grew from 3 to 5. Sokka and Splitly did not recover. The candidate also deduplicates executions before reserving constrained inspection slots. Screening cases are unconstrained, so their gains do not establish that fix's quality effect.

The [screen seal](runs/topical-v3/screen-seal.json) freezes production hashes and the decision at `2026-11-09T03:33:09.441Z`. All eight current production file hashes were checked against the seal and match. Heldout findings cannot justify further tuning within this run.

## Screening scores by case, judge, and arm

The primary metric counts a source only when the judge labels it useful and direct or adjacent. A transferable mechanism in another domain does not qualify. Every cell below is a count divided by six. Missing slots score zero. Generic useful@6 is separate and also has denominator six.

| Case | Judge | A | B | C-small | C | D | O |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sokka places | Codex | 3/6 | 4/6 | 6/6 | 6/6 | 6/6 | 6/6 |
| Reader voice | Codex | 0/6 | 3/6 | 2/6 | 2/6 | 4/6 | 2/6 |
| Splitly expenses | Codex | 0/6 | 0/6 | 2/6 | 4/6 | 4/6 | 4/6 |
| Sokka places | Claude | 0/6 | 1/6 | 2/6 | 3/6 | 3/6 | 3/6 |
| Reader voice | Claude | 0/6 | 0/6 | 0/6 | 0/6 | 0/6 | 0/6 |
| Splitly expenses | Claude | 0/6 | 0/6 | 1/6 | 3/6 | 3/6 | 3/6 |

The next table gives generic useful count out of six, followed by the number of distinct useful mechanisms. Mechanism categories come from each judge's labels, so diversity comparisons stay within a judge.

| Case | Judge | A useful; mechanisms | B useful; mechanisms | C-small useful; mechanisms | C useful; mechanisms | D useful; mechanisms | O useful; mechanisms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sokka places | Codex | 3/6; 2 | 6/6; 4 | 6/6; 2 | 6/6; 2 | 6/6; 2 | 6/6; 2 |
| Reader voice | Codex | 1/6; 1 | 4/6; 2 | 3/6; 2 | 3/6; 2 | 5/6; 3 | 3/6; 2 |
| Splitly expenses | Codex | 2/6; 2 | 1/6; 1 | 3/6; 2 | 4/6; 3 | 4/6; 3 | 4/6; 3 |
| Sokka places | Claude | 0/6; 0 | 1/6; 1 | 2/6; 1 | 3/6; 1 | 3/6; 1 | 3/6; 1 |
| Reader voice | Claude | 0/6; 0 | 0/6; 0 | 0/6; 0 | 0/6; 0 | 0/6; 0 | 0/6; 0 |
| Splitly expenses | Claude | 0/6; 0 | 0/6; 0 | 1/6; 1 | 3/6; 2 | 3/6; 2 | 3/6; 2 |

All screening arms select six sources except Reader C-small, C, and O, which select three, and Reader D, which selects five. No screening D-versus-A primary regression occurs for either judge. Reader remains a substantive disagreement, with D scoring 4/6 for Codex and 0/6 for Claude. A better top source does not resolve uncertainty about usefulness.

## Paired ablations

A uses the frozen old planner and selection. B uses the new planner with old limits of 6 visual, 6 lexical, and 4 constrained targeted results. C-small applies production qualification and selection to B's entire pool. C raises those limits to 12, 12, and 8. D adds one conditional recovery. O keeps exactly C's selected membership in encounter order.

The following are differences in close-and-useful counts. Each mean uses three screening cases for that judge.

| Case | Judge | Query B minus A | Qualification C-small minus B | Pool C minus C-small | Recovery D minus C | Order O minus C | Combined D minus A |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sokka places | Codex | +1 | +2 | 0 | 0 | 0 | +3 |
| Reader voice | Codex | +3 | -1 | 0 | +2 | 0 | +4 |
| Splitly expenses | Codex | 0 | +2 | +2 | 0 | 0 | +4 |
| Screen mean | Codex | +1.3333 | +1.0000 | +0.6667 | +0.6667 | 0 | +3.6667 |
| Sokka places | Claude | +1 | +1 | +1 | 0 | 0 | +3 |
| Reader voice | Claude | 0 | 0 | 0 | 0 | 0 | 0 |
| Splitly expenses | Claude | 0 | +1 | +2 | 0 | 0 | +3 |
| Screen mean | Claude | +0.3333 | +0.6667 | +1.0000 | 0 | 0 | +2.0000 |

Query changes alone improve Sokka for both judges but do not improve Splitly's primary count. They reduce Splitly's generic usefulness for Codex from 2/6 to 1/6. Qualification improves Sokka and Splitly, but reduces Reader's primary count from 3 to 2 for Codex. The larger pool adds two close useful Splitly sources for each judge. Recovery adds two close useful Reader sources for Codex and none for Claude. These results expose distinct contributions and individual losses. They do not establish that every component improves every case.

B versus C-small bundles relevance filtering, duplicate suppression, caps, reservations, and selection order. This run does not isolate those components individually. C-small reuses qualification from the larger initial pool. A duplicate target outside the smaller pool can still suppress its representative. B also uses prefixes of captured top-12 responses rather than separate top-6 requests. Both are attribution limitations.

C and O have identical primary and generic useful counts, as required by identical membership. Source top-one proximity changes for Reader and Splitly. This diagnostic does not test the user's requirement about final approach order.

Across all six paired cases, query changes contribute +8 close useful references for Codex and +1 for Claude. Qualification contributes +4 and +3. The larger pool contributes +4 for each judge. Recovery contributes +2 and 0, entirely from the disputed Reader screening result. Combined totals are +18 and +8. These sums describe six paired case deltas, not independent source-level samples. The enlarged pool has support from both judges. Conditional recovery has limited, disputed support and no heldout primary gain, so retain its bound without claiming a universal benefit.

## Uncertainty, diversity, and capability fidelity

The [V3 summary](review/topical-v3/summary.json) contains every arm's direct, adjacent, unknown, duplicate, creator-share, and top-one diagnostics. Selected D diagnostics follow. Direct and adjacent counts describe proximity regardless of usefulness. Unknown counts use the summary's uncertain-label metric.

| Case | Judge | Direct | Adjacent | Unknown | Largest creator share | Top-one source proximity |
| --- | --- | --- | --- | --- | --- | --- |
| Sokka places | Codex | 6 | 0 | 0 | 2/6 | Direct |
| Reader voice | Codex | 1 | 3 | 0 | 2/5 | Direct |
| Splitly expenses | Codex | 4 | 2 | 0 | 1/6 | Direct |
| Sokka places | Claude | 3 | 3 | 3 | 2/6 | Adjacent |
| Reader voice | Claude | 1 | 1 | 4 | 2/5 | Direct |
| Splitly expenses | Claude | 3 | 1 | 1 | 1/6 | Direct |

Every screening arm has zero duplicate platform identities in its selected list. That does not establish semantic diversity. The manual audit found overlapping voice-compilation segments. Reader C's largest creator share is 2/3, falling to 2/5 in D. Codex's Sokka diversity falls from four useful categories in B to two in C while its primary count rises. Relevance and diversity must both remain visible.

Across 93 screening brief-source pairs, judges disagree on usefulness for 37, proximity for 38, and mechanism for 61. They differ on at least one reported field for 85 pairs. The 43 differences in unsupported-capability lists can include wording differences. These are label differences, not independent errors or agreement confidence.

Evidence is in [Codex's labels](review/topical-v3/screen/codex.json) and [Claude's labels](review/topical-v3/screen/claude.json). Each reuses 89 labels from that same judge's V1 review and adds 4 new labels. Inheritance requires an identical original brief and source evidence payload. An offline comparison confirms all 89 inherited brief-source payloads and each judge's 89 inherited labels are identical. Labels never transfer between judges. Inheritance provenance is recorded in each artifact. Original and revised screening reviews consume four judge calls cumulatively. Reuse is not a fresh replication of inherited labels.

Source relevance does not establish product capability fidelity. These source-specific boundaries remain material.

- Sokka references include agents that book, generate itineraries, check availability, recommend menus, or give conversational advice. Those capabilities are not established for Sokka. Its plans retain saved places, collections, rediscovery, and opening a place on a map. Instagram query terms do not establish an implemented Instagram integration. The saving method remains unresolved.
- Reader sources include voice identity compilations, typed-text pronunciation tips, and neighboring voice-generation content. These do not establish document import or sustained listening. Reader uses existing document text and voice selection. Translation must not be inherited from a source.
- Splitly references include YouTrip settlement requests and Revolut in-app payments. Splitly supports entered shared expenses, balances, and manual marking of settlement. Source payment flows do not establish in-app transfers. Household balance examples can supply relevant presentation evidence without changing those capabilities.

The manual audit supports these plan observations. Source labels do not supply independent plan-fidelity verdicts. Actual approaches have their own review below.

## Heldout and richer evidence

Heldout retrieval is complete for Plant diagnosis, Subscription reminders, and Product photo. The [heldout review policy](runs/topical-v3/heldout-review-policy.json) was fixed before labels. Judges review the complete union selected by any arm, including all ten legacy constrained selections when present. Unused pool candidates remain captured but are outside judgment. This deterministic coverage retains every scored source without choosing sources by outcomes. It measures selected-list quality, not candidate-pool classifier accuracy or recall. The rubric, fixed denominator, and promotion gate are unchanged.

The packet contains 45 selected-union sources and 71,830 characters. [Codex's complete verdict](review/topical-v3/heldout/codex.json) and [Claude's repaired complete verdict](review/topical-v3/heldout/claude.json) each cover all 45 sources. Codex's call took about 267 seconds.

Claude's first response returned 44 of 45 labels and correctly failed completeness validation. The [failed raw response](runs/topical-v3/calls/ceb5f959d86eb4cfbf30bacd140e1ac07f1e0573181a1bb3e58071c3125d3c7a.json) remains charged. An explicit repair revalidated those 44 labels and judged only the missing source. The repair succeeded in 4,882 ms. The [coverage record](review/topical-v3/heldout/coverage-repair.json) confirms 44 retained plus one repaired label and full coverage. No case or source was silently dropped. The repair is a technical coverage recovery, not a new complete Claude review.

| Case | Judge | A | B | C-small | C | D | O | D minus A |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plant diagnosis | Codex | 4/6 | 4/6 | 4/6 | 4/6 | 4/6 | 4/6 | 0 |
| Plant diagnosis | Claude | 3/6 | 2/6 | 2/6 | 2/6 | 2/6 | 2/6 | -1 |
| Subscription reminders | Codex | 1/6 | 4/6 | 5/6 | 5/6 | 5/6 | 5/6 | +4 |
| Subscription reminders | Claude | 0/6 | 1/6 | 2/6 | 2/6 | 2/6 | 2/6 | +2 |
| Product photo | Codex | 1/6 | 2/6 | 2/6 | 4/6 | 4/6 | 4/6 | +3 |
| Product photo | Claude | 0/6 | 0/6 | 0/6 | 1/6 | 1/6 | 1/6 | +1 |

The frozen constrained legacy path can select ten. Only its first six score for @6. Total selected is reported below. Failed or empty cases stay in the denominator.

The following values come from complete labels and the [arm mapping](review/topical-v3/heldout/mapping.json). Each cell gives generic useful count out of six, then distinct useful mechanisms.

| Case | Judge | A useful; mechanisms | B useful; mechanisms | C-small useful; mechanisms | C useful; mechanisms | D useful; mechanisms | O useful; mechanisms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Plant diagnosis | Codex | 4/6; 2 | 4/6; 3 | 5/6; 4 | 5/6; 4 | 5/6; 4 | 5/6; 4 |
| Subscription reminders | Codex | 1/6; 1 | 4/6; 3 | 5/6; 3 | 6/6; 4 | 6/6; 4 | 6/6; 4 |
| Product photo | Codex | 2/6; 2 | 4/6; 2 | 4/6; 1 | 5/6; 3 | 5/6; 3 | 5/6; 3 |
| Plant diagnosis | Claude | 3/6; 2 | 2/6; 2 | 2/6; 2 | 2/6; 2 | 2/6; 2 | 2/6; 2 |
| Subscription reminders | Claude | 0/6; 0 | 1/6; 1 | 2/6; 1 | 2/6; 1 | 2/6; 1 | 2/6; 1 |
| Product photo | Claude | 0/6; 0 | 0/6; 0 | 0/6; 0 | 1/6; 1 | 1/6; 1 | 1/6; 1 |

Heldout ablation deltas preserve the same controlled comparisons.

| Case | Judge | Query B minus A | Qualification C-small minus B | Pool C minus C-small | Recovery D minus C | Order O minus C | Combined D minus A |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Plant diagnosis | Codex | 0 | 0 | 0 | 0 | 0 | 0 |
| Subscription reminders | Codex | +3 | +1 | 0 | 0 | 0 | +4 |
| Product photo | Codex | +1 | 0 | +2 | 0 | 0 | +3 |
| Heldout mean | Codex | +1.3333 | +0.3333 | +0.6667 | 0 | 0 | +2.3333 |
| Plant diagnosis | Claude | -1 | 0 | 0 | 0 | 0 | -1 |
| Subscription reminders | Claude | +1 | +1 | 0 | 0 | 0 | +2 |
| Product photo | Claude | 0 | 0 | +1 | 0 | 0 | +1 |
| Heldout mean | Claude | 0 | +0.3333 | +0.3333 | 0 | 0 | +0.6667 |

Claude's Plant loss first appears with the query change. Neither qualification, pool enlargement, nor recovery restores it. No Codex heldout D-versus-A regression occurs. Recovery contributes no heldout primary gain for either judge.

Heldout D diagnostics retain constraint uncertainty explicitly. The summary's unknown metric counts a source if proximity, usefulness, or constraints are uncertain.

| Case | Judge | Direct | Adjacent | Unknown | Constraint violations | Largest creator share | Top-one source proximity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Plant diagnosis | Codex | 4 | 0 | 6 | 0 | 1/6 | Mechanism |
| Subscription reminders | Codex | 3 | 2 | 0 | 0 | 1/6 | Direct |
| Product photo | Codex | 2 | 3 | 6 | 0 | 1/6 | Adjacent |
| Plant diagnosis | Claude | 2 | 2 | 5 | 1 | 1/6 | Mechanism |
| Subscription reminders | Claude | 2 | 3 | 4 | 0 | 1/6 | Direct |
| Product photo | Claude | 2 | 3 | 6 | 0 | 1/6 | Adjacent |

All heldout arms have zero duplicate platform identities in selected lists. Across 45 heldout brief-source pairs, judges differ on usefulness for 18, proximity for 12, mechanisms for 13, and constraints for one. They differ on at least one reported field for 33 pairs. Unsupported-capability lists differ for 25, including possible wording differences.

Claude flags Plant source `cnt_e495752c2d0d0b2504042d8d4d85` as violating the no-brand constraint because indexed text names a neem-oil product label. It is a maintenance recipe, not damage investigation. Codex leaves constraint status unknown. The source is not useful according to Claude, so it does not increase the primary count, but remains a selection-quality concern. Plant supports possible causes and watering records, not guaranteed diagnosis or cure. Subscription references must not add bank linking, automatic cancellation, negotiation, or guaranteed savings. Product photo references must stay within background removal, solid color, brightness, and export. Generative shadows, invented product details, publication, and guaranteed sales are unsupported.

The constrained legacy arm selects eight Plant sources and nine Product photo sources. B selects seven and nine, respectively. The unconstrained Subscription lists select six in both legacy-selection arms. C-small selects five for Plant and Subscription and six for Product photo. C, D, and O select six in every heldout case. All @6 metrics still use six slots.

Three richer heldout requests are complete. The [enrichment capture](runs/topical-v3/enriched-heldout.json) confirms six requested and six returned IDs per case, 18 in total, with every `missingIds` array empty. Selection prioritizes arm disagreement, then top position and a deterministic tiebreak. Both judges rechecked all 18 sources. Each changed at least one reported field for 13 sources; this includes mechanism labels, uncertainty and explanatory wording, not 13 changes to the primary quality score. Initial light labels remain primary.

A secondary [sensitivity calculation](review/topical-v3/rich-sensitivity.json) replaces only those 18 labels with that same judge's richer verdict, keeping all other initial labels. Codex's heldout mean gain changes from +2.3333 to +2.6667 and Claude's from +0.6667 to +1.3333 references out of six. Claude's plant-case sensitivity changes from 3 versus 2 to 3 versus 3; the original regression stays in the primary results. This is a partial recheck, not a fresh complete trial or a reason to change the gate.

Full projection supplies richer text and indexed frame metadata. It is not actual image review. Original full videos have never been reviewed in this benchmark. Neither light labels nor frame metadata proves complete-video constraint compliance. Any separate visual review applies only to the sampled images inspected.

## Separate product and approach checks

Two real application jobs completed outside the benchmark budget. The coordinator supplied the observations below. Independent semantic reviewer Hooke reviewed the actual approaches. These checks do not add benchmark cases or change retrieval scores.

| Job | Retrieval and approach evidence | Review outcome and limit |
| --- | --- | --- |
| Reader, study ID beginning `5f7ac4ec` | Five accepted references, including a direct document source, support two direct approaches, core workflow and voice comparison. | Grounded and distinct. Voice selection does not translate. No invented capability. The first hook, "This document has words", is plain, and the storyboard drops the everyday listening payoff. |
| Product photo, study ID beginning `d7de` | One adjacent accepted reference, zero excluded and zero uncertain, supports two proposed direct approaches, full demo and color choice. | Grounded, with no invented features or confirmed citation or constraint issue. Both four-step angles are only modestly distinct and share one source. One adjacent source cannot establish recurring formats or a winning format. |

Both product traces select six sources and record no recovery. Across the two jobs together, the traces and procedure imply five discovery requests, two full requests, and three assets. There is no separate live application call ledger, so these are inferred counts rather than metered benchmark totals. Open the completed [Reader study](http://127.0.0.1:3000/?view=study&study=study-5f7ac4ec-213e-44c4-8b7d-8354510f784b) and [Product photo study](http://127.0.0.1:3000/?view=study&study=study-d7deec0e-16f7-4930-b537-93a89a1a7f1f) on the running local app.

Photo's early light qualification counted poster and Canva cutout videos as adjacent and a cake-poster background-removal video as direct. At least three nearby sources therefore suppressed recovery. Later topic and constraint assessment rejected five as outside the seller-photo task, retaining one Photoshop reference. Those five were not reported as human-constraint exclusions. The final counts remain one adjacent accepted, zero excluded, and zero uncertain.

Recovery currently precedes the later visual qualification. There is no replenishment after those rejections under the six-source full-evidence cap. This is a remaining quality gap. A follow-up evaluation should measure accepted-source yield after visual qualification and test recovery allocation under the same evidence bound in a new protocol. The sealed strategy was not changed. Benchmark close-and-useful@6, including baseline judgments, measures comparative usefulness rather than compliant final creative yield.

The coordinator's browser checks cover Reader at width 1440 and Product photo at width 390. Each shows two ordered and labeled approaches, with the closest first, no overflow, and no browser errors. Hooke's review reports no confirmed capability invention or citation issue. These observations support actual presentation checks for these two jobs, independently of source top-one diagnostics. Creative quality limitations were preserved without retuning after the seal.

The coordinator inspected three actual photo-source images at 1.00, 34.53, and 66.73 seconds. They show a Photoshop interface and shadow tutorial, cream-colored packaging on orange, and an Adobe call to action. No faces or people appear in those three samples. This sample does not establish absence of a hand or person throughout the video. No full video was reviewed.

The actual photo job sets `noRealPeople=true` with no additional exclusion. Hands and fingers are allowed, as in the benchmark photo rule. This fresh application journey is a separate product check and is not counted as another independent heldout trial.

Final checks pass with 125 tests and 1,054 assertions, a production build, type-check, lint and diff check. These support implementation validation and do not substitute for retrieval verdicts or approach review. Browser screenshots and inspection records are in the local `.audit/` directory; the saved studies above remain available through History.

## Budget and reproducibility

The final run is [topical-v3](runs/topical-v3/manifest.json). Its ledger inherits V1 and V2 non-judge attempts, including unsuccessful requests, plus the original screening judges. Count unique call IDs once in the final cumulative ledger. Do not sum ancestor ledgers or run directories. The screening summary is a snapshot, not final live usage.

| Request kind | Ceiling | Completed-screen snapshot | Latest observed or coordinator-reported attempts | Final attempts |
| --- | --- | --- | --- | --- |
| Light searches | 36 | 17 | 33 | 33 |
| Visual assets | 16 | 6 | 16 | 16 |
| Full-projection calls, at most six IDs each | 6 | 0 | 3 | 3 |
| Planner attempts | 14 | 8 | 14 | 14 |
| Qualification attempts | 18 | 7 | 10 | 10 |
| Independent judge attempts | 9, amended from 8 | 4 | 9 | 9 |

Final counts were checked against unique call IDs in V3. Nine judge attempts include four successful screening calls, one complete Codex heldout call, the failed Claude heldout response, the one-source repair and two successful richer checks. All attempts are finished. The two recorded failures are the initial sandbox planner preflight and the incomplete Claude verdict; both remain counted. No dollar or token-cost estimate is inferred from these request counts.

The [judge-budget amendment](runs/topical-v3/judge-budget-amendment.json) raises only the judge ceiling from eight to nine for the explicit one-source coverage repair. It was recorded before dispatch. The sealed manifest retains the original eight-call ceiling, with this amendment separate. Two richer checks remain within the amended total. This is not an automatic retry or a change to production strategy, source membership, labels already validated, or the promotion gate.

The planner ceiling includes up to 12 successful original paired plans, one failed preflight, and one successful three-case context batch. The 92 ms CLI preflight failed under the restricted shell before inference. This recorded authorization or authentication failure still consumes an attempt. Only that exact request had one explicitly authorized retry. No other implicit retry or model fallback is permitted.

The V1 summary records 13 searches, 6 assets, 7 planner attempts, 3 qualifications, and 2 judges. Those attempts are already inherited into V3. Discarded V2 searches and qualifications also remain charged. Judge allocation is two original screening calls, two revised screening calls, two heldout light calls, one explicit coverage repair, and two heldout richer calls.

Generation uses explicit Codex `gpt-6.1-sol`, medium effort, and a 240-second timeout. Judges use Codex `gpt-6.1-sol` high and Claude `opus` high, with 480-second timeouts. Claude's alias does not expose an exact effective version. Immutable call files record requests, responses, status, and observed durations. Duration is not a latency comparison. No billing evidence supports a dollar-cost claim. This documentation sidecar makes no paid calls.

The seal records production and screening artifact hashes. Scenario files preserve both plans, raw candidate IDs, arm pool and selected IDs, and traces. Review artifacts preserve blinded evidence and labels separately from the hidden mapping. Captures are reused within this evaluation only. No application cache supplies evaluation evidence.

Reproduce cumulative attempt counts offline from this directory. This counts unique call IDs, including failed and started attempts.

```sh
jq -s 'unique_by(.id) | group_by(.kind) | map({kind: .[0].kind, attempts: length})' runs/topical-v3/calls/*.json
```

## Limits and outstanding evidence

This is one captured trial per case. Screening guided policy choice and is not independent confirmation. Prefix reuse, qualification context, sparse text, model-alias uncertainty, and judge disagreement constrain attribution. Model judgments are labels, not ground truth. The retrieved union cannot measure corpus recall. No statistical significance, repeatability, conversion, or corpus-recall claim follows from these results.

The initial light-evidence gate passes for both judges, with Claude's Plant regression preserved. Richer-subset sensitivity remains positive, with all request attempts accounted for. The next useful experiment is accepted-source yield after visual qualification, under the same evidence budget, followed by approach distinctness and hook quality. These gaps remain visible in the two real product checks; no heldout result was used to tune them away.
