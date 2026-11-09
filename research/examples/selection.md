# Saved examples beyond Sokka

Selected `demo-product-photos`, `demo-room-preview`, and existing `demo-study` in [the manifest](../../data/examples.json). The first two are illustrative product concepts. Recall remains the existing illustrative study concept. No old example, backend, UI, or shared-schema file was edited by this task.

| Selected case | Fit | Excluded | Uncertain | Why keep it |
| --- | ---: | ---: | ---: | --- |
| Product photos | 3 | 0 | 1 | Recognizable handbag, lip gloss, and toothbrush inputs become visible product-image outputs. |
| Room preview | 3 | 1 | 1 | Hands are allowed. A phone-held room reveal and two comparison mechanisms survive; a presenter is excluded and a thumbnail-only source remains uncertain. |
| Recall, unchanged | 3 | 0 | 0 | Existing notes-to-flashcards and quiz evidence remains useful. |

## Method and actual calls

Reused `research/oriane/results.json`, `final-results.json`, `final-followups.json`, `final-full-evidence.json`, and `final-recovered-full.json` before fresh research. Their prior 17-call comparison was not rerun. The existing WPS, Gauth, and Gemini full records supplied Recall evidence without another search.

The initial shortlist was study tools, room design, and photo editing. Four initial searches returned at most four default-projection rows each. Only six finalists received the first full enrichment. Subsequent bounded recovery followed observed constraint failures. Twelve unique new sources ultimately received full detail, six more than initially planned because people or hands ruled out every initial finalist. No assets or paid visual-similarity searches were created. No askAI calls were needed.

Exactly 11 fresh Oriane calls were made. Each linked file contains the exact request, full response, pagination, request ID, and retrieval timestamp. Discovery was a ranked shortlist, not exhaustive pagination. Every discovery call used `viewsCount` descending; this is a selection aid, not a quality or conversion score.

| Call | Saved request | Query or IDs | Projection / returned |
| --- | --- | --- | --- |
| 1 | [D01-room](D01-room.json) | Caption OR transcript, `roomgpt`, `room planner`, `interior ai`, `redesign your room` | default / 4 |
| 2 | [D02-photo](D02-photo.json) | Caption OR transcript, `photoroom`, `pixelcut`, `cleanup.pictures`, `remove unwanted objects` | default / 4 |
| 3 | [D03-room-tight](D03-room-tight.json) | Caption, `roomgpt`, `interiorai`, `homedesignsai`, `reimaginehome`, `ai room`, `room redesign` | default / 4 |
| 4 | [D04-photo-tight](D04-photo-tight.json) | English captions, `photoroom`, `pixelcut`, `product photography app` | default / 4 |
| 5 | [E01-finalists](E01-finalists.json) | Six shortlisted IDs, gokceercan, mavgpt, photoshop._blog, spk3241_, kitandkaboodleinterior, googlephotos | full / 6 |
| 6 | [D05-room-faceless](D05-room-faceless.json) | AI-interior captions OR named room-design creators, exact filter payload in file | default / 4 |
| 7 | [E02-constraint-replacements](E02-constraint-replacements.json) | Planner5D bedroom and living-room layouts | full / 2 |
| 8 | [D06-screen-only](D06-screen-only.json) | Attempted creator restriction with `profileHandle.includes` | default / 4, discarded |
| 9 | [D07-screen-creators](D07-screen-creators.json) | Corrected creator restriction with `includesExactly.values`, `homestyler`, `interiorai`, `reimaginehome`, `photoroom`, `pixelcut` | default / 4 |
| 10 | [E03-photo-constraint](E03-photo-constraint.json) | Official Photoroom comparison and AI-character promotion | full / 2 |
| 11 | [E04-final-mechanisms](E04-final-mechanisms.json) | Existing-discovery Planner5D furniture comparisons and News Literacy Project art quiz | full / 2 |

D06 unexpectedly returned unrelated global results and a total count of 28,246,279. Its attempted handle filter did not constrain the query. No D06 result entered curation. D07 corrected the operator. This was one wasted call, included in the total. Earlier keyword searches also returned false positives; manual screening rejected them.

## What the images support

All 339 available indexed frames across the 15 detailed or reused sources were downloaded and visually inspected as timestamped contact sheets. Source frame URLs and local paths remain in [media.json](media.json). This count includes rejected candidates and the unchanged Recall sources. It is a count of indexed images, not continuous video coverage. Zero frames remain zero; no thumbnail was assigned an invented video timestamp.

**Product photos.** `cnt_49e0c2f41f86380d21e95aaac4e3` by gokceercan shows the same bag before and after at 3.2s, then import at 12.6s, background editing at 14.8s, and a share view at 21.8s. `cnt_6d038cc84f6689ac9cc949df9f7e` by photoshop._blog contrasts a prop shoot with Product Staging at 15.37–15.97s and generated results at 25.87–32.13s. `cnt_af15ee332daf2908242f016a5ea2` by spk3241_ shows a toothbrush on a grey surface at 3.93s and a white-background output at 21.13s. Its Thai caption and unrelated song transcript are preserved, not treated as an English testimonial. All three sources contain real people or hands. The unconstrained study does not describe them as people-free.

The Photoroom AI-character promotion `cnt_8bd1cabb1b22125ef6a1fe1dfe63` has no indexed frames. Its caption identifies an AI-created character, but one thumbnail cannot establish the rest of the creative or its payoff. It remains uncertain, contributes no angle or storyboard evidence, and has an empty frame list. The official comparison `cnt_d2bd79fe85ef21394b8382900508` shows a real presenter in all three inspected frames. It adds no distinct mechanism beyond the stronger product demos. Google Photos has a visible editing payoff but relies on a magician and a person-centered story, making it less direct for seller product images.

**Room preview.** The user clarified that hands and fingers are allowed under the no-human rule. Curation was reassessed using the already downloaded frames, with no additional Oriane calls. The current saved example has three fitting references, one excluded presenter, and one uncertain source.

Kit & Kaboodle's ten indexed frames show a hands-held phone with an empty room at 7.9s and a furnished preview at 11.6s. This now supports a direct visible-transformation angle. Planner5D's seven-frame living-room layout uses pointing fingers and schematic floor-plan illustrations, supporting an adjacent comparison mechanism. Planner5D's furniture-only comparison has three indexed frames at 2.2s, 3.8s and 7.0s. The coordinator independently inspected these contact sheets. All fits are conditional on the sampled evidence; no claim is made about continuous video coverage.

mavgpt remains excluded because its fifteen indexed frames include a real presenter. The bedroom-layout full response has zero frames: its thumbnail hand is now allowed, but the unseen footage remains uncertain, not a confirmed fit. The initial stricter screening excluded all hands-only material; that historical interpretation is superseded by this user clarification. Saved assessments, angles and storyboard now follow the clarified rule. Only fitting reference IDs inform the creative directions.

**Recall.** Reinspection confirms WPS flashcards at 48.8s, Gauth practice at 44.33–50.1s, and Gemini's quiz at 19.53s. They justify retaining `demo-study` without modification. They do not establish better grades, long-term retention, or spaced-repetition effectiveness. Real people appear in these references, so Recall remains unconstrained.

## Reproduce and validate

`bun research/examples/inspect.mjs` downloads only the saved full-response sources, without additional Oriane queries. `swift -module-cache-path /private/tmp/angle-example-swift-cache research/examples/contact-sheets.swift` rebuilds the indexed-frame contact sheets on macOS. The media manifest keeps every original remote frame URL and timestamp.

`bun scripts/select-examples.ts --write` rebuilds only the two new studies and the manifest from [curation.json](curation.json). It never rewrites Recall or the old Sokka examples. `bun scripts/select-examples.ts` verifies the actual saved files and regenerates [provenance.json](provenance.json). It checks schema, disjoint groups, fit-only source IDs, original identity, source URL, full publication timestamp, metrics, captions, transcript, exact indexed frame timestamps and text, and local media. The provenance artifact records raw-file paths, remote and local image URLs, and frame SHA-256 values.

The supplied `bun test scripts/examples.test.ts` passes with 202 assertions. `bun run check` and `bunx oxlint scripts/select-examples.ts` pass. An initial TypeScript inference error in the verifier was fixed with a schema-derived frame type. The shared schema and backend were not modified to accommodate the data.

Source captions contain promotions, discount codes, and claims that have not been independently verified. Metrics are Oriane snapshots and may reflect paid distribution. Views and engagement do not show conversions or causal creative effectiveness. Manual relevance and constraint judgments are interpretations of the saved evidence. Product storyboards are proposed adaptations, not footage or tested capability of a real product.

The coordinator has offered independent visual and final-data review. This artifact is ready for that review. There is no reviewer-tool blocker.

Final rule clarification: hands/fingers allowed; source metrics and provenance remain unchanged. Current counts are 3 fit / 1 excluded / 1 uncertain for Room preview.
