# Prompt for One Verifiable Change editorial review

Date: 2026-10-20

Article: [Prompt for One Verifiable Change](../../data/blog/prompt-for-one-verifiable-change.mdx)

Status: work in progress. Keep `draft: true` and `reviewed: false`. This is a direction review by a separate AI reviewer, not publication approval or executable verification.

## Directional verdict

**Continue.** The independent reviewer found a useful, distinct companion to the existing essay on AI and code review. The article turns the problem of understanding generated code into a concrete workflow a developer can apply. Its strongest next step is evidence from an actual coding session.

Keep the article focused on coding prompts and review. Deno remains a separate article opportunity; the running example here uses TypeScript without making runtime or migration recommendations.

## Strengths identified by the reviewer

- The contract captures real product decisions: retaining original values, preserving source row numbers, keeping the first occurrence, and reporting duplicates.
- The scope follows behavior rather than arbitrary file or line limits. The article acknowledges that an isolated function does not finish the importer.
- The provenance is explicit. AI-authored teaching examples are distinguished from independently captured agent output.

## Findings and revisions

| Priority | Independent review finding | Current response |
| --- | --- | --- |
| High | The demonstration is hypothetical. It does not establish that a particular prompt produces better code. | Keep the disclosure and avoid comparative performance claims. Recorded agent runs remain the main next task. |
| High | The preview boundary is described but not exercised. A correct function can still be integrated incorrectly. | Added a caller that loses source row numbers, its pass-through repair, and exact expected visible results. Captured integration and CI evidence remain open. |
| Medium | The initial faulty snippet returned the wrong shape and did not produce the later debugging scenario. | Replaced it with a candidate that has the stated return type but overwrites the first-occurrence lookup. The third matching row points to the second occurrence, matching the debugging prompt. |
| Medium | Readers might confuse prompt length with the technique. | Added a shorter prompt and explained that settled repository contracts should be referenced rather than repeated. |

The reviewer found no algorithmic defect in the intended candidate or its expected assertion results under the stated preconditions. That finding comes from inspection only.

A second pass confirmed that the revised defect, regression fixture, corrected implementation, and debugging prompt now align. The reviewer also confirmed that the shorter prompt resolves the repetition concern and that the preview adapter improves the integration explanation without overstating evidence. The final wording correction distinguishes the third occurrence from the third duplicate; the fixture contains three occurrences and two duplicates.

## Voice and example revision

The user's follow-up asked whether the writing sounded robotic, whether the content was wrong, and whether the examples were strong enough. The first draft repeated abstract terms such as contract, boundary, and evidence; its lengthy prompts and repeated caveats made it read like an internal procedure. The revision now starts with four uploaded rows and what a user should see, uses shorter prompts, and explains the faulty loop with a lookup table and a small repair diff instead of printing two similar full functions.

The preview example now shows a second concrete defect: the caller replaces source row numbers with array indexes. Passing the validated rows through unchanged repairs that example. A real parsed fixture and rendered preview are still needed to check the complete path.

The assertions now retain a copy of the original object references before the call. Comparing against the input array only after the call could miss replacements with equal-valued objects. The value snapshots and reference checks cover separate requirements.

The closing section explains when direct edits and larger coherent tasks are appropriate. The article recommends making unresolved behavior explicit, rather than imposing a fixed task size or asking for a plan on every edit. No personal anecdote or measured productivity improvement has been invented to make the voice sound more natural.

The independent reviewer read the revised article and found it substantially less robotic, with no technical error by inspection. Their assessment is that the examples are sufficient for a practical tutorial; adding another example just to increase the count would not help. Their final edits were applied: merged the repetitive sequencing section, shortened the technical citations, and explained why the loop is deliberately small. The code, repair diff, expected results, and object-identity assertions were found consistent.

The remaining distinction is between a worked tutorial and an observed coding session. The current examples explain the method; they do not demonstrate a measured improvement in agent performance. Captured output and executable integration evidence remain the useful next additions.

The sources support the limited attributions: GitHub recommends decomposition and relevant examples; Anthropic recommends verification and inspectable evidence; SlopCodeBench reports degradation during iterative extensions. Vendor recommendations and that benchmark do not establish which prompt works best for this importer.

## Evidence to collect next

### Capture actual agent runs

Create a small, fixed seed repository containing the importer types, normalization policy, callers, and existing test conventions. For every run, retain:

- The seed revision and complete initial task context.
- The model identifier, agent/tool version, date, available tools, and relevant configuration.
- Exact prompts and follow-ups in order, including human interventions.
- Unedited responses, generated patches, and final revision.
- GitHub workflow run links and results for the revision that contains that output.

If comparing prompt structure, give each condition the same behavior contract and context, with comparable tool access and budgets. A vague request compared with a fully specified contract demonstrates clarification of requirements; it cannot isolate the effect of task decomposition. Describe a small set of runs as a case study and preserve unsuccessful or uneventful results.

### Follow a connected failure and repair

Prefer a failure observed in the captured runs. Show the requirement it violates, the relevant generated code, the targeted debugging prompt, the actual patch, and the resulting CI evidence. If no such failure occurs, report that and retain the constructed defect as an explicitly illustrative example.

Keep raw output separate from edited excerpts. Label excerpt omissions and any author changes so the article never presents a cleaned implementation as untouched agent output.

### Verify the preview boundary

Carry the fixture with source rows 7, 11, 19, and 23 through parsing, detection, the caller, and the rendered preview. Retained rows must be 7 and 11 with their original email values; warnings for 19 and 23 must both refer to 7. Check that the UI preserves source row numbers and displays duplicate information.

Keep database writes outside this step. Persistence needs its own contract for existing contacts, partial failure, and retries.

## Verification status

The draft has received source inspection, publication-metadata inspection, whitespace inspection, and an independent editorial and technical review. Builds, tests, typechecks, and snippet execution have not been run. GitHub CI has not been dispatched for this uncommitted draft.

The existing Content safety workflow is the route for validating a committed review revision. Follow the repository's GitHub CI policy; do not run workloads locally or use a production deployment to obtain verification.
