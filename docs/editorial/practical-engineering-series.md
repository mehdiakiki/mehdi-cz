# Practical engineering series

The author approved this series for daily publication on October 25, 2026. All ten sources now have `draft: false`, `reviewed: true`, and exact content review hashes. The [daily calendar](daily-publication-calendar.md) and [approval record](release-2026-10-25.json) record the active schedule.

Ten new drafts based on the themes the author accepted on October 24, 2026.
These are separate from the earlier CI and coding-agent series.

The requested voice is plain, conversational English that sounds less polished
and helps readers solve a problem. Use familiar words, explain necessary terms,
and allow short asides where they help. Do not manufacture grammatical errors,
claim native or non-native identity, or invent personal incidents. These are
AI-assisted drafts for the author's review, not a claim of human-only writing.

Each article should give readers a concrete problem, a small example, the next
thing to inspect or change, and a way to judge the result. Avoid repeated
disclaimers, slogans, and identical introductions or endings.

These ten articles occupy November 4–13 at 13:00 UTC, after the CI series. The shared thirty-article calendar starts October 25 and ends November 23. Commits use only the author's configured Git identity.

| Article | What the reader should be able to do |
| --- | --- |
| [Deno Is Joining Cloudflare: What Existing Apps Need to Move](../../data/blog/deno-joining-cloudflare-what-happens-to-your-app.mdx) | Separate runtime dependencies from hosting dependencies and plan a migration. |
| [AI Agent Sandbox Permissions: A Deno Sandbox Checklist](../../data/blog/what-can-an-ai-agent-reach-from-its-sandbox.mdx) | Check network access, credentials, and files before allowing generated code to run. |
| [PostgreSQL Chose a Sequential Scan: What to Check First](../../data/blog/why-postgresql-stopped-using-the-index.mdx) | Compare estimates with actual rows and choose the next query investigation. |
| [Why a Shared Atomic Counter Can Slow Rust Threads](../../data/blog/when-more-threads-make-a-service-slower.mdx) | Compare a shared counter with a reduction and measure the same work. |
| [Browser AI With WebLLM for a Small Tagging Feature](../../data/blog/could-this-feature-run-entirely-in-the-browser.mdx) | Check device support, model loading, and an explicit server fallback. |
| [npm Install Scripts: What Runs and How to Disable It](../../data/blog/what-really-runs-when-you-install-an-npm-package.mdx) | Inspect lifecycle scripts and separate provenance from code safety. |
| [Debug a Slow Node.js Request With OpenTelemetry](../../data/blog/following-one-slow-request-through-an-app.mdx) | Add useful spans and follow context across a service call. |
| [Why Your Next.js Page Sends Too Much JavaScript](../../data/blog/why-does-a-simple-page-need-so-much-javascript.mdx) | Narrow a client component and check the resulting browser work. |
| [How to Roll Out API Changes to Old Mobile Apps](../../data/blog/the-api-changed-the-old-mobile-app-did-not.mdx) | Handle unknown response values and check an old client against a new server. |
| [Try PostgreSQL Search Before Adding a Vector Database](../../data/blog/does-this-search-need-a-vector-database.mdx) | Compare lexical, vector, and hybrid retrieval on the same questions. |

Executable examples and any benchmarks must be verified through the existing
GitHub Actions workflows, with runner selection unchanged. None has been run
on the workstation. Drafts must not present proposed measurements as results.

The [review record](new-series-review-2026-10-24.md) lists the independent source
and language review findings, applied fixes, and remaining release checks.

The later [review of all thirty drafts](all-articles-editorial-review-2026-10-24.md)
records another language and fact check with further edits to these ten.

The [adversarial length and search review](article-length-seo-review-2026-10-24.md)
identifies two strong cores, five revisions, and three major revisions here.
Its implementation and overlap findings are addressed in the linked implementation record.
