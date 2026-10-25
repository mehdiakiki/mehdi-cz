# Engineering and agent security draft review

The later [review of all thirty drafts](all-articles-editorial-review-2026-10-24.md)
records the requested second language and fact check and the edits applied
after it. It also moves execution-status narration out of public article prose.

Reviewed October 24, 2026. Scope: the ten articles listed in
[practical engineering](practical-engineering-series.md), the ten articles in
[agent security](agent-security-series.md), and their ten security demonstration
sources. All remain held for release. This was an independent AI review for
human readers, followed by authoring revisions; it was not a human sign-off.

The review covered plain language, unsupported claims, misleading example
scope, and code defects visible by inspection. No example was executed or
compiled. No build, typecheck, benchmark, or test suite ran on the workstation.

## Corrections applied

- The control authorization function now rejects empty configured and supplied
  tokens. A missing credential cannot match an empty configured secret.
- Application state now receives a trusted current-job context, checks its owner
  and fresh lease generation, and keys results by that context. The example
  includes same-owner job separation, stale context, and expiry cases. Expiry
  denies access; an operator still needs to delete expired state separately.
- The npm article now correctly says `npm ci` removes existing `node_modules`.
  Fresh workspaces also prevent generated outputs elsewhere from hiding what
  install scripts produce.
- The Deno migration article makes the announced end of team-led runtime
  development explicit. Container packaging does not extend upstream support.
- The sandbox overview uses a dummy credential in its denial checklist.
- The inheritance article tells readers to adapt the canary check to their real
  launcher; the standalone example cannot detect changes to an unrelated wrapper.
- The runtime article includes the June runc advisory's Docker-specific condition
  alongside its limited impact and low severity.
- The directory example is described as traversal and existing-symlink checks,
  not a reproduced symlink-swap race. The timeout example checks a single
  sleeper, not detached descendants or complete job containment.

## Language revisions

Replaced repeated “fixture” and “guarded case” wording where ordinary “example”
or “launch” is clearer. Explained lease generation as a fresh random value.
Simplified the prompt-injection heading and the wording about execution
environments. Removed narration about absent speedup figures and absent success
records. Each security article keeps one short execution-status note and the
specific limits needed to understand its technique.

The stories are hypothetical unless tied explicitly to a cited report or this
repository's recorded deployment. None claims the author personally experienced
an invented incident or that the prose was written without assistance.

## Checks still required before release

Run executable demonstrations and production content checks through the
project's existing GitHub workflows, keeping configured runners unchanged.
Generate and review the Rust lockfile remotely. The 27 new clustered editorial
sources have been registered in the existing campaign audit fixture; its checks
have not been run for this batch. Check rendered MDX and article links,
then complete the existing review-hash and publication approval gates.

The daily dates were inspected as file metadata: thirty consecutive timestamps
from October 24 through November 22, at 13:00 UTC, with both hold flags retained.
This is not a live-release check or evidence that these drafts are published.

Refresh time-sensitive announcements and remediation details on each release
day. In particular, a research result from an internal environment is not a
customer escape rate, a remediated DNS issue is not currently unpatched, and a
simulated prompt-injection result is not evidence of a live worm.
