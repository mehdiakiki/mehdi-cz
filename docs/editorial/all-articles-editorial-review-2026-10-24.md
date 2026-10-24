# Review and edits for all thirty article drafts

Three AI reviewers separately read the CI, engineering, and security series on
October 24, 2026. They checked the writing and material claims against primary
documentation and, for the deployment story, this repository's recorded evidence.
The editor applied the changes and sent the revised passages back for review.
The second pass found one sentence that prematurely assumed a flaky test's
cause, plus a few repeated explanations. Those were corrected. No material
factual issue remained in the reviewers' final source inspections.

The main style problem was repetition. Many articles began by announcing a
fictional story, moved through similar advice sections, and ended with everything
neatly resolved. Several security articles also sounded like internal review
notes. The revised writing uses simpler words, varied openings, and more direct
next steps. It keeps the hypothetical stories and real incidents distinguishable.

The target is conversational English that is comfortable for readers who use
English as an additional language. No grammatical mistakes or personal incidents
were invented to suggest a particular writer's identity. An AI style review does
not establish human authorship or the author's native language.

## Changes applied to the CI series

| Article | Edits |
| --- | --- |
| [The Agent Finished](../../data/blog/the-agent-finished-the-pipeline-did-not.mdx) | Replaced the formal fictional opening and finished with the commit, assertion, and log the developer needs next. |
| [The Build Was Green](../../data/blog/the-build-was-green-and-nobody-understood-the-change.mdx) | Simplified the opening and test advice; made email normalization an explicit product rule for this example. |
| [The Flaky Test](../../data/blog/the-agent-made-the-flaky-test-green.mdx) | Added illustrative assertions for the actual duplicate rows, and removed a conclusion that assumed timing was the cause before investigation. |
| [Cancelled Checks](../../data/blog/every-new-commit-cancelled-the-check-that-mattered.mdx) | Scoped the example group to its workflow; added GitHub's queue option, its limits, and its incompatible cancellation setting. The real site configuration is still shown separately. |
| [The Wrong Commit](../../data/blog/the-test-passed-on-the-wrong-commit.mdx) | Distinguished manually dispatched evidence from an eligible required check and added the merge-queue event requirement. Simplified the fictional handoff. |
| [The Cache](../../data/blog/the-cache-made-the-build-fast-and-wrong.mdx) | Explained the stale date decision directly and why a declared build argument can invalidate a following RUN without appearing in the command text. |
| [The Monorepo](../../data/blog/the-monorepo-ran-every-test-for-a-small-change.mdx) | Explained skipped-job results and added a sample dependency-based selection summary. |
| [The Review Queue](../../data/blog/the-review-queue-outgrew-the-build-queue.mdx) | Removed a redundant fictional label and replaced the tidy resolution with a practical question about the oldest open request. |
| [Ignoring the Check](../../data/blog/the-agent-learned-to-ignore-the-check.mdx) | Added a summary step that exposes the original step outcome. Made clear that reporting a failure does not restore blocking enforcement. |
| [The Scheduler](../../data/blog/the-scheduler-worked-and-the-article-never-appeared.mdx) | Preserved the real failure and release evidence, added the next live checks, and clarified that the ten held drafts refer to the time of the repair. |

The factual additions follow [GitHub's concurrency documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency),
[required-check guidance](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks),
[step context reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#steps-context),
[Docker's cache reference](https://docs.docker.com/reference/dockerfile/#impact-on-build-caching),
and [Playwright's assertions](https://playwright.dev/docs/test-assertions).

## Changes applied to the engineering series

| Article | Edits |
| --- | --- |
| [Deno Migration](../../data/blog/deno-joining-cloudflare-what-happens-to-your-app.mdx) | Added the announcement year and ended with request, data, background-job, and write-routing checks before shutting down the old deployment. |
| [Sandbox Access](../../data/blog/what-can-an-ai-agent-reach-from-its-sandbox.mdx) | Stated the empty allowlist behavior plainly and explained hostname-only versus hostname-and-port rules. |
| [PostgreSQL Indexes](../../data/blog/why-postgresql-stopped-using-the-index.mdx) | Added an explicitly hypothetical estimated/actual row comparison and explained averages when loops exceed one. Simplified the final investigation step. |
| [Rust Threads](../../data/blog/when-more-threads-make-a-service-slower.mdx) | Replaced unclear response-time wording and explained both black_box overhead and the need to measure real record processing. Removed a repeated caveat. |
| [Browser Inference](../../data/blog/could-this-feature-run-entirely-in-the-browser.mdx) | Used tagging consistently throughout and distinguished a general initialization failure from proof of unsupported hardware. |
| [npm Installation](../../data/blog/what-really-runs-when-you-install-an-npm-package.mdx) | Added npm's implicit node-gyp build case and simplified the lockfile section and closing advice. |
| [Tracing](../../data/blog/following-one-slow-request-through-an-app.mdx) | Removed authoring narration and repetition; ended with concrete follow-up for connection waiting versus query time. |
| [Page JavaScript](../../data/blog/why-does-a-simple-page-need-so-much-javascript.mdx) | Added a before-and-after import sketch and simpler wording around the page example and measured result. |
| [Old Mobile Clients](../../data/blog/the-api-changed-the-old-mobile-app-did-not.mdx) | Replaced abstract decoding language and a vague matrix instruction with four explicit old/new client and response combinations. |
| [Vector Search](../../data/blog/does-this-search-need-a-vector-database.mdx) | Added filtered-result behavior with approximate indexes, explained recall, and showed rank-fusion arithmetic. |

These additions were checked against the [Deno announcement](https://deno.com/blog/cloudflare),
[Sandbox settings](https://docs.deno.com/sandbox/security/),
[PostgreSQL EXPLAIN guide](https://www.postgresql.org/docs/18/using-explain.html),
[npm lifecycle reference](https://docs.npmjs.com/cli/v11/using-npm/scripts/),
and [pgvector documentation](https://github.com/pgvector/pgvector#filtering).
The reviewers also checked the linked Rust, WebLLM, OpenTelemetry, Next.js, and
API compatibility references in the articles. The installed Next.js guide was
read for the client-boundary example.

## Changes applied to the security series

| Article | Edits |
| --- | --- |
| [The File Helper](../../data/blog/the-sandbox-stayed-closed-the-file-helper-did-not.mdx) | Named the .NET CVE separately from the Python finding and explained which process performs the host write. |
| [DNS](../../data/blog/blocking-http-did-not-block-the-way-out.mdx) | Simplified the disclosure/remediation timeline and described what the fake resolver and connector actually receive. |
| [Inherited Secrets](../../data/blog/the-child-process-inherited-the-secret.mdx) | Clarified close_fds defaults and explicit pass_fds handling on POSIX; replaced awkward wording about secret variables. |
| [Shell Arguments](../../data/blog/a-filename-became-a-shell-command.mdx) | Combined repeated payload cautions and added a concrete leading-option filename case. |
| [Directory Access](../../data/blog/the-safe-path-changed-before-it-was-opened.mdx) | Explained directory access and ambient authority in ordinary language while retaining the static-symlink limit. |
| [Localhost](../../data/blog/localhost-is-not-an-admin-password.mdx) | Removed draft-review narration, split startup and logging advice, and used authenticated caller instead of principal. |
| [README Injection](../../data/blog/the-readme-asked-for-a-different-job.mdx) | Explained the permission check directly and shortened the simulated-research discussion. |
| [Timeouts](../../data/blog/the-timeout-ended-one-process-not-the-job.mdx) | Explained reaping and described the supervisor's process group plainly, retaining the detached-child and normal-exit gaps. |
| [Previous Job State](../../data/blog/the-next-agent-read-the-previous-jobs-files.mdx) | Simplified retention advice and made researcher involvement in the cited communication tests more concrete. |
| [Runtime Escapes](../../data/blog/sometimes-the-escape-is-in-the-runtime.mdx) | Replaced a slogan about Python wrappers and explained what runtime approval records can actually establish. |

The reviewers rechecked the cited vendor reports and primary API references.
The relevant research conditions remain beside the claims: the DNS case was
remediated, the injection report concerns simulated interactions, and internal
escape research is not a general customer escape rate. The historical runc
advisories retain their different impacts and conditions.

## Review status and release hold

All thirty article sources were edited. Their dates, titles, tags, summaries,
and publication hold fields were preserved. The daily calendar still runs from
October 24 through November 22 at 13:00 UTC. No publication settings or workflow
files were changed by this editorial pass.

Authoring-status notes were removed from the public prose. Verification status
remains explicit here and in the experiment README: the new security examples
have not been executed or compiled, and the newly added CI snippets have only
been inspected. Descriptions of assertions explain their intended behavior;
they are not reports of passing runs.

No local build, test, typecheck, rendering, or benchmark workload ran. Source
readback covered the metadata, code fences, article links, and prose length.
GitHub CI verification and the final release approval remain outstanding. This
editorial review does not issue a publication review hash or remove either hold.
