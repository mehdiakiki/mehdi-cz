# CI and coding agents series

The author approved this series for daily publication on October 25, 2026. All ten sources now have `draft: false`, `reviewed: true`, and exact content review hashes. The [daily calendar](daily-publication-calendar.md) and [approval record](release-2026-10-25.json) record the active schedule.

Review history: ten drafts revised after an independent AI language review for human
readers. The author requested the style review and simpler wording on October 24.
The later [review of all thirty drafts](all-articles-editorial-review-2026-10-24.md)
adds a fresh language and source check and records its applied edits.
The [adversarial length and search review](article-length-seo-review-2026-10-24.md)
then identifies one strong core, five revisions, and four major revisions in
this series. Those are content findings, not release approval.
The completed verification is tracked in the [implementation record](article-length-seo-implementation-2026-10-24.md).

These first ten articles occupy October 25–November 3 at 13:00 UTC, one per day.

| Publication day | Article |
| --- | --- |
| October 25 | [How to Diagnose Slow CI for AI Coding Agents](../../data/blog/the-agent-finished-the-pipeline-did-not.mdx) |
| October 26 | [How to Review AI Generated Tests Against the Requirement](../../data/blog/the-build-was-green-and-nobody-understood-the-change.mdx) |
| October 27 | [Fix Flaky Playwright Tests Without Removing Assertions](../../data/blog/the-agent-made-the-flaky-test-green.mdx) |
| October 28 | [Why GitHub Actions Cancels Runs After Every Push](../../data/blog/every-new-commit-cancelled-the-check-that-mattered.mdx) |
| October 29 | [Which Commit Did GitHub Actions Test? PR Head vs Merge SHA](../../data/blog/the-test-passed-on-the-wrong-commit.mdx) |
| October 30 | [Docker Build Cache Can Hide Scheduled Posts](../../data/blog/the-cache-made-the-build-fast-and-wrong.mdx) |
| October 31 | [Monorepo CI Selection Without Skipping Dependent Packages](../../data/blog/the-monorepo-ran-every-test-for-a-small-change.mdx) |
| November 1 | [AI Code Review Bottlenecks and How to Measure the Queue](../../data/blog/the-review-queue-outgrew-the-build-queue.mdx) |
| November 2 | [GitHub Actions continue-on-error and Visible Failed Checks](../../data/blog/the-agent-learned-to-ignore-the-check.mdx) |
| November 3 | [Docker Pull Failed With No Space Left on Device](../../data/blog/the-scheduler-worked-and-the-article-never-appeared.mdx) |

The articles use explicitly illustrative scenarios alongside labelled records. The first now analyses a recorded verification run, and the last follows
this repository's real October 24 failed scheduled deployment through its
verified repair and live publication check. Examples are illustrative unless
explicitly identified as records of this site's workflow; none is presented as a new
recorded agent experiment.

The [language review](ci-agent-series-language-review.md) records the phrases and
repeated structures flagged in all ten originals, a second pass on the revisions,
and the final wording fixes. The revision uses simpler
words, removes repeated disclaimers, and keeps the code snippets and technical
distinctions. Article 10 now includes the completed release already recorded in
[the deployment verification note](site-publication-verification-2026-10-24.md).

The existing GitHub Content safety workflow verified the examples, publication rules and production build. The approved scheduling change adds checks for all thirty actual source dates, review hashes and publication boundaries. No workloads were run on the workstation.

The production workflow checks hourly at minute 17. An article becomes due at its timestamp and appears after a successful deployment.
GitHub can delay scheduled runs, so the timestamp is not an exact delivery promise.
