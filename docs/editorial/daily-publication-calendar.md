# Daily publication calendar

Approved October 25, 2026. These thirty articles are scheduled **one per day at 13:00 UTC**, from **October 25 through November 23, 2026**. The series order is CI and coding agents, practical engineering, then agent security. The already published prompting article is outside this batch.

**Release status: approved and scheduled.** Every listed article has `draft: false`, `reviewed: true`, and an exact review hash for the verified title, summary and body. The author approved removing the publication hold on October 25 after the revisions and GitHub CI verification. The release check also prompted a wording clarification in the Deno Sandbox checklist, where a technical term matched the unfinished-content detector. Its review hash was updated; the examples and scope are unchanged.

The earlier working dates started October 24. Approval arrived October 25, so the entire batch moved forward one day. This avoids making yesterday's first article and today's second article due together. There are no elapsed or overlapping slots within this batch.

Article `date` frontmatter is the input to the existing publication logic. This document and the [approval record](release-2026-10-25.json) are editorial records, not additional schedulers. Existing schedules for other series are unchanged.

An article becomes eligible at its timestamp. The GitHub workflow checks hourly at minute 17 and deploys when a due article is missing from the live sitemap. A successful deployment exposes the article and updates its navigation, search and sitemap entries. GitHub can delay scheduled runs, so 13:00 UTC is not an exact delivery guarantee. The first expected check after each slot is 13:17 UTC.

| Day | Date, 13:00 UTC | Series | Article |
| --- | --- | --- | --- |
| 1 | 2026-10-25 | CI and coding agents | [How to Diagnose Slow CI for AI Coding Agents](../../data/blog/the-agent-finished-the-pipeline-did-not.mdx) |
| 2 | 2026-10-26 | CI and coding agents | [How to Review AI Generated Tests Against the Requirement](../../data/blog/the-build-was-green-and-nobody-understood-the-change.mdx) |
| 3 | 2026-10-27 | CI and coding agents | [Fix Flaky Playwright Tests Without Removing Assertions](../../data/blog/the-agent-made-the-flaky-test-green.mdx) |
| 4 | 2026-10-28 | CI and coding agents | [Why GitHub Actions Cancels Runs After Every Push](../../data/blog/every-new-commit-cancelled-the-check-that-mattered.mdx) |
| 5 | 2026-10-29 | CI and coding agents | [Which Commit Did GitHub Actions Test? PR Head vs Merge SHA](../../data/blog/the-test-passed-on-the-wrong-commit.mdx) |
| 6 | 2026-10-30 | CI and coding agents | [Docker Build Cache Can Hide Scheduled Posts](../../data/blog/the-cache-made-the-build-fast-and-wrong.mdx) |
| 7 | 2026-10-31 | CI and coding agents | [Monorepo CI Selection Without Skipping Dependent Packages](../../data/blog/the-monorepo-ran-every-test-for-a-small-change.mdx) |
| 8 | 2026-11-01 | CI and coding agents | [AI Code Review Bottlenecks and How to Measure the Queue](../../data/blog/the-review-queue-outgrew-the-build-queue.mdx) |
| 9 | 2026-11-02 | CI and coding agents | [GitHub Actions continue-on-error and Visible Failed Checks](../../data/blog/the-agent-learned-to-ignore-the-check.mdx) |
| 10 | 2026-11-03 | CI and coding agents | [Docker Pull Failed With No Space Left on Device](../../data/blog/the-scheduler-worked-and-the-article-never-appeared.mdx) |
| 11 | 2026-11-04 | Practical engineering | [Deno Is Joining Cloudflare: What Existing Apps Need to Move](../../data/blog/deno-joining-cloudflare-what-happens-to-your-app.mdx) |
| 12 | 2026-11-05 | Practical engineering | [AI Agent Sandbox Permissions: A Deno Sandbox Checklist](../../data/blog/what-can-an-ai-agent-reach-from-its-sandbox.mdx) |
| 13 | 2026-11-06 | Practical engineering | [PostgreSQL Chose a Sequential Scan: What to Check First](../../data/blog/why-postgresql-stopped-using-the-index.mdx) |
| 14 | 2026-11-07 | Practical engineering | [Why a Shared Atomic Counter Can Slow Rust Threads](../../data/blog/when-more-threads-make-a-service-slower.mdx) |
| 15 | 2026-11-08 | Practical engineering | [Browser AI With WebLLM for a Small Tagging Feature](../../data/blog/could-this-feature-run-entirely-in-the-browser.mdx) |
| 16 | 2026-11-09 | Practical engineering | [npm Install Scripts: What Runs and How to Disable It](../../data/blog/what-really-runs-when-you-install-an-npm-package.mdx) |
| 17 | 2026-11-10 | Practical engineering | [Debug a Slow Node.js Request With OpenTelemetry](../../data/blog/following-one-slow-request-through-an-app.mdx) |
| 18 | 2026-11-11 | Practical engineering | [Why Your Next.js Page Sends Too Much JavaScript](../../data/blog/why-does-a-simple-page-need-so-much-javascript.mdx) |
| 19 | 2026-11-12 | Practical engineering | [How to Roll Out API Changes to Old Mobile Apps](../../data/blog/the-api-changed-the-old-mobile-app-did-not.mdx) |
| 20 | 2026-11-13 | Practical engineering | [Try PostgreSQL Search Before Adding a Vector Database](../../data/blog/does-this-search-need-a-vector-database.mdx) |
| 21 | 2026-11-14 | Agent security | [Prevent Path Traversal in Host Tools for AI Agents](../../data/blog/the-sandbox-stayed-closed-the-file-helper-did-not.mdx) |
| 22 | 2026-11-15 | Agent security | [Reject Disallowed Hosts Before DNS in an Agent Egress Broker](../../data/blog/blocking-http-did-not-block-the-way-out.mdx) |
| 23 | 2026-11-16 | Agent security | [Stop Secret Inheritance in Python Subprocesses](../../data/blog/the-child-process-inherited-the-secret.mdx) |
| 24 | 2026-11-17 | Agent security | [Prevent Shell Injection in Python Agent Tools](../../data/blog/a-filename-became-a-shell-command.mdx) |
| 25 | 2026-11-18 | Agent security | [Restrict Rust File Tools with cap-std Directory Capabilities](../../data/blog/the-safe-path-changed-before-it-was-opened.mdx) |
| 26 | 2026-11-19 | Agent security | [Local Agent Control APIs Need Job-Scoped Authorization](../../data/blog/localhost-is-not-an-admin-password.mdx) |
| 27 | 2026-11-20 | Agent security | [README Prompt Injection: Check Tool Permissions Before Effects](../../data/blog/the-readme-asked-for-a-different-job.mdx) |
| 28 | 2026-11-21 | Agent security | [Python Subprocess Timeouts and Descendant Cleanup](../../data/blog/the-timeout-ended-one-process-not-the-job.mdx) |
| 29 | 2026-11-22 | Agent security | [Isolate Agent Job State with Scoped Leases and Generations](../../data/blog/the-next-agent-read-the-previous-jobs-files.mdx) |
| 30 | 2026-11-23 | Agent security | [Maintain the Container Runtime Behind an AI Sandbox](../../data/blog/sometimes-the-escape-is-in-the-runtime.mdx) |
