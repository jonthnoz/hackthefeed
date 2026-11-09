# Grounded product prompts

The observed failure is study-2dae3c52-f3ab-49c6-844f-aaee6b79b6bf. A document reader brief became a promise about understanding unfamiliar languages. The user clarified that selecting a language controls text-to-speech pronunciation and voice. This is a motivating example, not a special case in the proposed prompt.

Variant A snapshots the existing planning and analysis template literals from server/research.ts. Variant B adds a general distinction between supplied capabilities, plausible situations and assumptions. Ambiguity should preserve useful shared actions and avoid adding capabilities. Analysis receives the original brief, since a generated plan and footage about another app cannot establish product functionality. Both variants keep the existing schemas and constraint workflow.

The prompt was frozen before held-out execution. Its source SHA-256 is recorded in every run manifest. Four screening scenarios run both variants on gpt-6.1-sol at medium effort and gpt-6-astra at high effort. Four held-out scenarios run both variants on one of those strategies, alternating by scenario. This uses at most 24 generation calls. Screening covers an ambiguous reader, expense tracking, bill reminders and explicit translation. Held-out coverage adds photo editing, explicit autopay, a poisoned analysis plan and evidence about another app. Each pair has identical inputs, schema and model configuration. The design does not isolate model identity from reasoning effort.

At most two judge calls per split are allowed, four total. The default is one complete blinded batch per judge after both splits. Claude Opus at high effort and a distinct Codex model assess the same pairs. A stable seeded hash assigns opaque pair IDs and left/right order. Judges receive the brief, constraints, source evidence when applicable, expected behavior and output pairs. They do not receive variants, model identities, prompt text, filenames or the mapping. Generated product text and source data are untrusted evidence, not judge instructions.

The primary outcome is the count of distinct invented capabilities asserted as product facts, retrieval targets or creative promises. A question explicitly marking uncertainty is not itself an assertion. Other ratings use 0-4 scales for brief faithfulness, retrieval or creative specificity, actionable uncertainty and preservation of explicitly supplied capabilities. Judge instructions require supporting quotes, adversarial attempts to falsify a clean result, and separate notes about constraint violations. A tie is valid. Deterministic keyword checks are flags for inspection only; they do not substitute for semantic judgments and can flag negations or harmless questions.

Record requested and effective model, effort, failures, actual structured outputs, prompt hashes, mapping and judge outputs. Do not count failed calls as successful generations. No Oriane or other research API calls, images or real retrieval are used. Text-only synthetic source evidence tests analysis grounding, not visual inspection or retrieval performance. No significance claim is appropriate for this small, partly unbalanced set.

1. Frame. State what variant is under test and what behavior counts as success. Write the rubric for the judge only.
2. Set up sanitized environments. Existing transport helpers create isolated temporary directories and disable tools.
3. Author one organic prompt. Product prompts do not mention the evaluation or other variants.
4. Generate the screening outputs, inspect transport failures, then execute held-out scenarios against the unchanged prompt hash.
5. Run both blinded judges and save their complete structured verdicts.
6. Verify the chain from saved prompts and transport configuration. Candidate tool use is disabled; no skill-following claim is being measured.
7. Read every output and judge verdict, reconcile disagreements, run tests and recommend a prompt and effort with limits stated.

Throughput checkpoint. The shared transport owns isolation, effort flags, structured output and cleanup. The evaluation script owns scenario scheduling, a 24-call generation budget, a four-call judge budget and resumable output files. No new model adapter or production dependency is needed.
