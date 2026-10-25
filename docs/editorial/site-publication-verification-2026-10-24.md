# Site publication verification on October 24 2026

The ten CI and agent story drafts are held for the author's review. Their
validation and publication were explicitly paused on October 24. They are not
part of the commits or releases below. See [the draft index](ci-agent-series.md).

The original prompting article and the repair to existing scheduled publication
remain a separate, previously authorized release.

## Observed failure

[Scheduled run 40073679798](https://github.com/mehdiakiki/mehdi-cz/actions/runs/40073679798)
detected thirteen missing due publications. Building and pushing the image
succeeded. Pulling it on the VPS failed during layer extraction with
`no space left on device`. The failing filename was under
`/app/node_modules/lit/`; it did not establish the disk's largest consumer.

## Release changes and verification

[PR 2](https://github.com/mehdiakiki/mehdi-cz/pull/2) publishes the original
prompting article, adds scoped removal of obsolete site image tags while
protecting rollback and container-used images, and adds a read-only publication
probe through `workflow_dispatch` with `check_only: true`.

[Content safety run 40095468919](https://github.com/mehdiakiki/mehdi-cz/actions/runs/40095468919)
passed the strict example typecheck, ten recorded-example checks, formatting,
all 150 repository safety checks, and the full production site build.

The [first release attempt](https://github.com/mehdiakiki/mehdi-cz/actions/runs/40095664420)
then caught a portability mistake in the new regression test: the Alpine build
image did not have Bash. No deployment occurred in that attempt.
[PR 3](https://github.com/mehdiakiki/mehdi-cz/pull/3) uses `sh` for both the fake
Docker command and the test's execution of the portable deployment snippet.
[Its final CI run](https://github.com/mehdiakiki/mehdi-cz/actions/runs/40096015210)
passed before merge.

The [release of revision fa9de330](https://github.com/mehdiakiki/mehdi-cz/actions/runs/40096218062)
succeeded. The log shows obsolete site tags and image layers removed before the
pull, the new image pulled, and the blog container healthy at 13:06:05 UTC.
The final dangling-image prune reported 0B; that is separate from the preceding
tag removals and is not a measurement of all storage reclaimed by the repair.

The [read-only live publication probe](https://github.com/mehdiakiki/mehdi-cz/actions/runs/40096755012)
also succeeded. At 13:07:09 UTC it reported `shouldDeploy: false`,
`checkFailed: false`, `missing: []`, and `overdue: []`. All four image build and
deployment actions were skipped in this check-only run.

The [published prompting article](https://www.mehdi.cz/blog/prompt-for-one-verifiable-change)
returned HTTP 200 on a read-only fetch. Its HTML includes the expected document
title, article heading, and opening paragraph distinguishing the recorded session
from constructed examples.

This verifies the repaired deployment and current due-publication reconciliation.
It does not guarantee future cron execution at an exact minute. The workflow
checks hourly at minute 17, and GitHub may delay scheduled runs. The ten held
drafts are not registered or activated in this release; their date-boundary and
editorial validation remains paused at the author's request.

All executable verification and builds ran through the existing GitHub
workflows with runner selection unchanged. No local build, test, typecheck,
render, or container workload was run.
