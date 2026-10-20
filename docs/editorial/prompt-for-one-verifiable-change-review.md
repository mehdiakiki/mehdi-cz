# Prompt for One Verifiable Change editorial review

Date: 2026-10-20

Article: [Prompt for One Verifiable Change](../../data/blog/prompt-for-one-verifiable-change.mdx)

Status: work in progress. Keep `draft: true` and `reviewed: false`. The article
now includes a recorded coding session and GitHub verification of its example.
It has not been approved for publication.

## Directional verdict

**Continue.** The independent AI reviewer found the revised article substantially
less robotic, its examples useful for a practical tutorial, and no must-fix
technical or evidentiary issue by inspection. Their latest review also checked
the recorded prompts, outputs, test coverage, and limits of the case study.

The revision starts with concrete uploaded rows, shortens the prompts, removes
repeated abstract terms and caveats, and replaces two similar full functions
with a trace and focused repair diff. It explains when a larger coherent task
or a direct edit is appropriate. It invents no personal experience or measured
productivity improvement.

## Recorded session

The [capture directory](../../experiments/focused-code-prompts/README.md) contains
the seed, exact prompts, saved responses, untouched source snapshots, hashes,
independently authored checks, and the working candidate used by CI.

A fresh worker started without the article conversation. The first request
implemented only duplicate detection. The returned implementation kept the
original source reference correctly and noted that the preview was still
unwired. The article explicitly says the constructed three-occurrence defect
did not occur in this session.

The second request connected detection to the existing caller while preserving
source rows, original email values, invalid-row reporting, and the response
shape. The verified function remained unchanged during that worker follow-up.

The independent reviewer found that the article correctly distinguishes this
successful handoff from the constructed failures used to teach review. A single
session with no comparison condition cannot establish comparative prompting
effectiveness. The tool does not expose the exact runtime model identifier or
complete tool-event trace; the capture states those limits.

## GitHub verification

- [First run](https://github.com/mehdiakiki/mehdi-cz/actions/runs/39416379631),
  revision `4a018fc2f9ca000908ffe0b6f1a23ecec06ce2b8`: strict typechecking and all
  five function checks passed. Two of four preview checks failed because the
  caller remained intentionally unwired. This is planned unfinished integration,
  not a failure to follow the first prompt.
- [Second run](https://github.com/mehdiakiki/mehdi-cz/actions/runs/39416912492),
  revision `487fec94c727ece7d3ff61195f06c9b5b62f7114`: strict typechecking, all five
  function checks, and all four preview checks passed. The rendered artifact
  retains rows 7 and 11 and reports rows 19 and 23 against row 7. The overall
  workflow failed formatting, so the site build did not run in that revision.
- [Third run](https://github.com/mehdiakiki/mehdi-cz/actions/runs/39417441459),
  revision `f6584135f15f13f7e31aaf2222e770bf63dfe5d1`: typechecking, all ten
  example checks, rendering, and formatting passed. Contentlayer compiled the
  article successfully. One publication test then required the new draft to be
  added to its explicit list of editorial sources outside the authority campaign.
  That registration has been added without weakening its assertions. Full site
  verification is being repeated with the registration in place.

All executable verification and rendering ran in the existing Content safety
workflow with its runner selection unchanged. No builds, tests, typechecks, or
development servers ran locally. Source was committed through the GitHub API on
the isolated `wip/focused-code-prompts` branch; formatting checks run remotely.
No production branch was changed and no deployment was requested.

## Coordinator corrections and scope

The supplied seed parser had a separate defect: an unsupported multiline field
could expose an interior line as a standalone address. After the two recorded
responses, the coordinator corrected the working parser to reject unmatched
quotes and added a regression. This correction is recorded separately from the
worker's output. The immutable seed and raw responses have not been rewritten.

The source fixture is intentionally limited to one email column and one physical
line per record, with a narrow ASCII validation policy. Rendering produces static
React HTML. The case does not include general CSV ingestion, database writes,
an interactive upload form, or browser interaction checks.

The assertion example also saves original object references before the call;
comparing to the input only afterward could miss replacements with equal-valued
objects. The checks preserve values, identity, ordering, first-occurrence reports,
and source row numbers through the preview caller.

## Remaining editorial work

Review the final CI result and its generated preview artifact, retain the draft
flags, and let the author assess the voice before publication. A broader model
comparison or another example is optional future work, not evidence supplied by
this case study. Deno remains a separate article opportunity.
