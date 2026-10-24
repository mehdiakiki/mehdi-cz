# CI article examples

These are small editorial fixtures, not this site's production CI selector or a
complete importer. No new workload was run locally while writing this revision.
Run the commands below only through the existing GitHub Actions verification
workflow and its configured runners. Do not publish or deploy to obtain a run.

## What each example checks

- `trial-policy.mjs` contains a constructed inclusive-expiry defect and its
  exclusive-expiry repair. The test expectations use independently listed UTC
  instants, including the exact boundary. This is an elapsed fourteen-day trial
  policy, not a calendar-day or billing-timezone policy.
- `affected-tests.mjs`, `package-graph.json`, and the selector/gate CLIs implement
  a finite explicit reverse-dependency selection. Tests cover transitive
  consumers, root/unknown-path full selection, invalid graph/diff failures, and
  failed/skipped/cancelled/missing/duplicate selected results. The graph is
  constructed. Actual workflow job results must feed the gate through trusted
  plumbing; a pull request must not supply its own successful report. No complete
  GitHub matrix adapter or diff collector is claimed here.
- `review-queue.mjs` and its snapshot CLI compute current-stage elapsed time.
  `review-queue-snapshot.json` is explicitly constructed. Ages are not estimates
  of hands-on reviewer effort. Tests cover draft exclusion, stage ordering,
  future times, duplicate records, and provenance in CLI output.
- `preview.spec.mjs` uses Playwright `page.setContent` with fixed warning rows.
  One case waits for a controlled 700 ms completion without a test sleep. The
  other deliberately displays the wrong original row and verifies that the
  correct assertion rejects it despite a passing count assertion. There is no
  CSV parser, server, upload endpoint, or external network request in this
  browser fixture.
- `observed-run-40096015210.json` is selected metadata retrieved from GitHub on
  October 24. It is observed evidence, unlike the constructed examples above.
  Whole-second API fields limit precision. Run creation to job start is not an
  isolated measurement of runner queue delay. The composite `yarn build` step
  contains more than Next.js compilation. No speedup comparison is claimed.

## Remote verification commands

Run from the repository root using the existing Node 24 setup:

```sh
node --test experiments/editorial-ci/*.test.mjs
node experiments/editorial-ci/select-affected.mjs experiments/editorial-ci/package-graph.json experiments/editorial-ci/changed-files.json
node experiments/editorial-ci/summarize-review-queue.mjs experiments/editorial-ci/review-queue-snapshot.json
```

The gate CLI is exercised with both a successful and skipped-result report by
`cli.test.mjs`; a skipped selected result must produce exit code 1. These tests
are verification of the example, not evidence that a real application's graph
is complete or that its workflow passed the correct conclusions to the gate.

The separate browser fixture pins `@playwright/test` **1.64.1**, confirmed against
the [official npm registry version metadata](https://registry.npmjs.org/@playwright/test/1.64.1).
Do not change root package dependencies just to run this example. In GitHub CI:

```sh
npm install --prefix experiments/editorial-ci --ignore-scripts --no-audit --no-fund
npm exec --prefix experiments/editorial-ci -- playwright install --with-deps chromium
npm exec --prefix experiments/editorial-ci -- playwright test --config experiments/editorial-ci/playwright.config.mjs
```

The first remote installation creates the nested npm lockfile. Preserve it from
the CI artifact and use `npm ci --prefix experiments/editorial-ci --ignore-scripts`
for later runs once that lockfile is committed. Preserve the browser result and
failure trace if present. Installing system browser dependencies must fit the
existing runner environment; if it cannot, report the CI blocker rather than
moving execution to the workstation or changing runner selection.

Record the immutable source revision and run URL before describing these new
examples as verified. Until then, the articles describe intended assertions.
Existing historical deployment and focused-prompting runs remain separate
evidence and do not verify these new fixture files.

## Retrieving the historical timing evidence

These are read-only GitHub API requests. Their selected fields were copied into
the observation file; the file is not presented as an unmodified raw response:

```sh
gh api repos/mehdiakiki/mehdi-cz/actions/runs/40096015210 --jq '{id,event,head_sha,created_at,run_started_at,updated_at,conclusion}'
gh api repos/mehdiakiki/mehdi-cz/actions/runs/40096015210/jobs --jq '.jobs[] | {id,name,started_at,completed_at,steps:[.steps[]|{name,started_at,completed_at,conclusion}]}'
```

The article links the run and the source API endpoints are retained in the JSON.
This captured run finished successfully; retrieving it does not execute a new
build or establish typical performance across other runs.
