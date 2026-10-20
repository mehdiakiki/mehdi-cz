# Recorded focused coding example

This is one recorded implementation session for the unpublished article
`data/blog/prompt-for-one-verifiable-change.mdx`. It is a case study, not a
comparison between models or a measurement of prompting effectiveness.

## What was supplied

The coordinator wrote six seed files with the row types, normalization helper,
a parser, a React renderer, and an unwired preview caller. Duplicate detection
was a throwing stub. The worker started without the article conversation and
received `session-01/harness.txt` and `session-01/prompt-01.txt`.

The seed parser is intended for one email column and one record per physical
line. Its address validation is a narrow ASCII demo policy. Reliable rejection
of multiline fields was added to the corrected working parser, as described
below; the seed is not a general CSV ingestion library.
The rendered output is static React HTML, not an interactive browser workflow.

## What was captured

- `seed/` is the unchanged input snapshot.
- `session-01/prompt-01.txt` is the first implementation request.
- `session-01/output-01.ts.txt` is the untouched generated function.
- `session-01/response-01.txt` is the worker's saved answer.
- `session-01/candidate/` is the working copy used by CI.
- `session-01/manifest.json` records provenance and hashes.

The exact runtime model identifier and collaboration-tool version are not
exposed by the tool. They are recorded as unknown rather than inferred from
local configuration. The capture preserves task prompts, saved answers, and
code snapshots; it does not export the worker's complete tool-event trace.

The first request deliberately leaves the preview unchanged. A failing preview
check at that stage means the feature is incomplete, not that the worker broke
its assigned contract. Any later follow-up and output are retained separately.

After the two captured worker responses, the coordinator found a problem in the
seed parser: splitting an unsupported multiline field could treat an interior
line as a separate address. The working parser now rejects an unmatched quoted
record, and a regression covers that input. This correction belongs to the
coordinator, not the recorded worker. The original seed and worker snapshots
remain unchanged.

## Verification

All builds, tests, typechecks, and rendering run through the existing GitHub
Actions Content safety workflow. No executable verification runs locally.
The workflow retains `preview.html` and the session text files as an artifact.

The coordinator wrote the checks independently of the generated implementation.
They cover empty input, original data and identity, three occurrences, interleaved
groups, frozen inputs, source row numbers after parsing, and server-rendered
preview output. The CSV fixture has valid rows 7, 11, 19, and 23, with invalid
records on rows 3 and 16.

The formatter check runs in CI as well. Seed inputs and recorded text snapshots
stay byte-for-byte unchanged. The working candidate may receive formatting-only
changes; its original code remains available in the recorded text snapshots.

CI runs and their exact source revisions are recorded in the session manifest
and the article's editorial notes. The article remains marked as a draft.
