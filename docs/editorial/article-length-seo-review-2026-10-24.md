# Adversarial review of article length and search readiness

This is the baseline review. The approved revisions and their verification are tracked in the [implementation record](article-length-seo-implementation-2026-10-24.md). Original measurements and verdicts below are preserved as the before state.

The thirty drafts need another content pass before release. Six have a strong
core, thirteen need revision, and eleven need major revision. The earlier language
and factual review improved the writing; it did not establish that each page
offers a distinct, complete answer to a searcher's problem.

Three AI reviewers challenged the series separately. The verdicts below describe
editorial readiness, not predicted rankings. A strong verdict still requires
the shared navigation, verification, and release work. No Search Console data,
search volumes, traffic forecasts, or conversion measurements were available.
Proposed search titles are intent hypotheses, not validated keyword demand.

This pass produced a review and a [source inventory](article-length-seo-inventory-2026-10-24.json).
It did not change article text, titles, URLs, dates, publication holds, or site code.

## Length findings

Reader-facing text ranges from **708 to 879 words**, with a **median of 760**.
The count excludes frontmatter, fenced code, HTML/comments, and link destinations.
It retains headings, lists, table text, and inline identifiers. Whitespace tokens
must contain a letter or digit to count. The inventory also records a stricter
count excluding inline code and a separate count using the repository's rule.
These methods explain small differences from the previous whitespace-only count.

| Series | Reader words, minimum | Median | Maximum | Strong | Revise | Major revision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| CI and coding agents | 750 | 776.5 | 879 | 1 | 5 | 4 |
| Practical engineering | 713 | 766 | 872 | 2 | 5 | 3 |
| Agent security | 708 | 743.5 | 774 | 3 | 3 | 4 |
| All thirty | 708 | 760 | 879 | 6 | 13 | 11 |

All thirty exceed the repository's 700-word threshold by text inspection using
its stripping rule. That is an editorial gate, not an SEO requirement or a claim
that the project audit ran. The repository counter can count link destinations
and some markup fragments while excluding inline code, so it is not identical
to reader-facing length.

There is no reason to expand every article to the same larger target. Google's
[helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
explicitly rejects a preferred word count and asks whether readers can achieve
their goal and whether the page adds useful original value. The weak drafts
need a missing demonstration, a narrower promise, or a distinct purpose. Extra
general advice would make those problems worse.

## Findings across the batch

**Search topics are often hidden by the story titles.** Several titles omit
Playwright, GitHub Actions, OpenTelemetry, WebLLM, Python subprocesses, or Rust
directory capabilities even though those are the worked subjects. Keep the
stories, but identify the actual problem in the title and opening. Google's
[title guidance](https://developers.google.com/search/docs/appearance/title-link)
supports concise, descriptive titles. It does not impose a universal character
limit or promise that the supplied title will be the displayed search title.

**The titles and summaries are present and unique.** Titles have 33–58 characters;
the root template adds ` | mehdi.cz`. Summaries have 101–162 characters. These
are measurements, not pass/fail limits. All thirty have distinct summaries, and
the article route uses them for descriptions and social metadata. Google's
[snippet guidance](https://developers.google.com/search/docs/appearance/snippet)
explains that snippets are query-dependent and may come from page content rather
than the supplied description. A 162-character summary is not automatically a defect.

**Contextual linking is almost absent.** Twenty-seven article bodies contain no
authored internal link. The CI series has two, engineering has one, and security
has none. Across the 464 local blog MDX sources, no other article body mentions
or links to any of these thirty slugs. Generated archive, topic, tag, adjacent,
and recommendation links are a separate mechanism; these are not proven orphan
pages. Google's [link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
recommends relevant, descriptive internal links and links into important pages.
It does not prescribe a links-per-page quota.

**The public series structure is not registered.** All thirty slugs are absent
from `data/writing-tiers.mjs` and therefore default to reference, without a theme
or investigation membership. They do not enter the curated article lists on
the Writing page or qualify as related-article recommendations. Twenty-seven
have a cluster and can appear in its reference list after release. Archive and
search discovery remain available, and the homepage's latest-published slot can
include any tier. This is a distribution limitation to review, not an indexing
ban or a Google penalty. Classify the strongest revised pieces deliberately;
do not promote everything merely to fill a series.

**Several pages duplicate a stronger existing answer.** The clearest cases are
the importer acceptance-rule essay, the mobile enum article, vector evaluation,
and the README permission gate. Related subjects can coexist when their reader
questions differ. Here, some examples and conclusions repeat with little added
value. This is an editorial overlap risk; no ranking loss or algorithmic penalty
has been measured. Some overlapping inventory articles have future approved
dates, so they must not all be described as already live.

**A disclaimer does not complete a tutorial.** The DNS example checks a fake
broker, the timeout example launches one sleeper, and the runtime comparator
checks supplied strings. Their limits are honestly described. The articles still
need either a promise that fits that scope or enough additional work to answer
the broader prevention problem. The same issue affects browser inference that
only initializes an engine and monorepo selection that has no selector.

## CI and coding agents

### 1 Slow CI for coding agents

[Current draft](../../data/blog/the-agent-finished-the-pipeline-did-not.mdx) · **750 words** · **Major revision**

Suggested title: **How to Diagnose Slow CI for AI Coding Agents**.

The timing template is blank. The page recommends measuring queue, setup, and
test time without diagnosing a pipeline. It also repeats advice about extra
pushes that belongs in the concurrency article. Replace those repetitions with
one linked CI run, its observed stages, and the change that follows from the
largest delay. This could work as the series introduction once it has that evidence.

### 2 Reviewing generated tests against requirements

[Current draft](../../data/blog/the-build-was-green-and-nobody-understood-the-change.mdx) · **790 words** · **Major revision**

Suggested title: **How to Review AI Generated Tests Against the Requirement**.

The row-7/19/23 duplicate rule repeats the already-published
[prompting article](../../data/blog/prompt-for-one-verifiable-change.mdx), which
has more code and recorded evidence. Give this page a different problem: show
the requirement, an incorrect implementation/test pair, and an independently
specified expected result. Otherwise consolidate its useful material into the
existing article. More explanation of the same importer will not make it distinct.

### 3 Repairing flaky Playwright tests

[Current draft](../../data/blog/the-agent-made-the-flaky-test-green.mdx) · **764 words** · **Revise**

Suggested title: **Fix Flaky Playwright Tests Without Removing Assertions**.

The sleep-to-retrying-assertion progression is useful, but Playwright is hidden
from the title and opening. Add a minimal delayed-completion example and verify
that the repaired test still fails for wrong duplicate rows. Link its remote CI
evidence when available. Keep this about preserving behavioral coverage; temporary
exceptions belong in article 9. Its current length is sufficient.

### 4 Concurrency cancellation

[Current draft](../../data/blog/every-new-commit-cancelled-the-check-that-mattered.mdx) · **771 words** · **Revise**

Suggested title: **Why GitHub Actions Cancels Runs After Every Push**.

The concrete mechanism is strong, but the platform and setting arrive late.
Name concurrency groups early and add a short decision table for PR validation,
cross-workflow collisions, active deployments, and waiting releases. Preserve the
`queue: max` limits and clearly scope PR-only snippets. Replace repeated warnings
about cleanup pushes with this selection guide rather than extending the article.

### 5 Checked out source versus PR head

[Current draft](../../data/blog/the-test-passed-on-the-wrong-commit.mdx) · **759 words** · **Revise**

Suggested title: **Which Commit Did GitHub Actions Test? PR Head vs Merge SHA**.

The only executable reporting snippet prints checkout HEAD, while the useful
comparison also needs the PR head, event, and run URL. Show those fields together
and interpret one example so readers can distinguish an older result from a valid
test-merge SHA. Keep artifact provenance as a bounded next step unless it is
demonstrated. Link the concurrency article when explaining replaced runs.

### 6 Docker cache and publication dates

[Current draft](../../data/blog/the-cache-made-the-build-fast-and-wrong.mdx) · **782 words** · **Revise**

Suggested title: **Docker Build Cache Can Hide Scheduled Posts**.

The time-dependent cache mistake is distinctive. Complete the connection by
showing the workflow build argument that feeds the Dockerfile and linking the
reviewed implementation at an immutable revision. Add a before/after publication
boundary example, clearly labeled as constructed until recorded. Link article 10
for the separate server-disk failure. More generic cache advice would add little.

### 7 Affected tests in a monorepo

[Current draft](../../data/blog/the-monorepo-ran-every-test-for-a-small-change.mdx) · **807 words** · **Major revision**

Suggested title: **Monorepo CI Selection Without Skipping Dependent Packages**.

The page describes dependency graphs and desired output but supplies no selector,
task-runner setup, or final required-result gate. Choose one concrete setup and
demonstrate transitive selection, root/lockfile fallback, and failure when selection
cannot run. If implementation stays out of scope, narrow the promise to why path
filters miss dependencies. Warnings alone do not answer an implementation query.

### 8 The code review queue

[Current draft](../../data/blog/the-review-queue-outgrew-the-build-queue.mdx) · **760 words** · **Major revision**

Suggested title: **AI Code Review Bottlenecks and How to Measure the Queue**.

The broad thesis overlaps [Claude Code Team Productivity](../../data/blog/claude-code-team-productivity.mdx)
and [The Review Ratchet](../../data/blog/the-review-ratchet-how-ai-is-quietly-eating-your-codebase-from-the-inside.mdx).
Give this page an operational method: distinguish first-review wait, active
review, author rework, and dependency waits; then show a real or clearly
illustrative queue snapshot and one intervention. Otherwise improve an existing
article rather than publish another version of the same argument.

### 9 Tolerated failures in GitHub Actions

[Current draft](../../data/blog/the-agent-learned-to-ignore-the-check.mdx) · **786 words** · **Revise**

Suggested title: **GitHub Actions continue-on-error and Visible Failed Checks**.

The useful distinction is outcome versus conclusion, reporting versus blocking,
and temporary exception ownership. Bring that mechanism forward and add one
exception record containing check, confirmed issue, owner, expiry or restoration
condition, and required evidence. Link article 3 for investigating the flaky
test itself. Replace repeated known-noise explanations with the record.

### 10 The failed scheduled deployment

[Current draft](../../data/blog/the-scheduler-worked-and-the-article-never-appeared.mdx) · **879 words** · **Strong**

Suggested title: **Docker Pull Failed With No Space Left on Device**.

This has the batch's clearest original evidence: a real failure, repair, portability
mistake, and live check. Put the exact error and observed cause near the beginning,
then keep the story. Link the immutable cleanup change and show its relevant
protection for rollback and in-use images. Keep the current limits on what the
log proves about disk use and reclaimed space. Expansion is unnecessary.

## Practical engineering

### 11 Moving an existing Deno application

[Current draft](../../data/blog/deno-joining-cloudflare-what-happens-to-your-app.mdx) · **807 words** · **Revise**

Suggested title: **Deno Is Joining Cloudflare and What Existing Apps Need to Move**.

The announcement is specific, but much of the migration advice fits any platform.
Replace a generic paragraph with a table for entry point, database, scheduled
work, and storage: what to identify, what the destination must support, and the
acceptance check. Keep the planning scope clear. Refresh support timelines before
release; do not turn the article into an unsupported complete porting tutorial.

### 12 Deno Sandbox permissions

[Current draft](../../data/blog/what-can-an-ai-agent-reach-from-its-sandbox.mdx) · **760 words** · **Revise**

Suggested title: **AI Agent Sandbox Permissions With a Deno Sandbox Checklist**.

The broad threat-model advice repeats the
[existing sandbox article](../../data/blog/sandboxing-model-generated-code-is-a-systems-problem.mdx)
and new security series. Make this page own the Deno permission audit: omitted
`allowNet`, an empty list, exact host, and host-plus-port, with expected operations
for each. Link broader design elsewhere. Distinguish documented settings from
actual deployment checks; the new page does not need more generic sandbox advice.

### 13 PostgreSQL sequential scans

[Current draft](../../data/blog/why-postgresql-stopped-using-the-index.mdx) · **789 words** · **Revise**

Suggested title: **PostgreSQL Chose a Sequential Scan and What to Check First**.

Readers get commands but no plan to interpret. Add a short annotated fragment
tied to the orders query, with one estimate mismatch, a useful buffer measurement,
and the next investigation. Label illustrative output or use recorded CI output.
Replace repeated compare-again advice. Do not recommend the older composite-index
article until its overly broad index-usage claims have their own accuracy update.

### 14 Shared atomic writes in Rust

[Current draft](../../data/blog/when-more-threads-make-a-service-slower.mdx) · **772 words** · **Strong**

Suggested title: **Why a Shared Atomic Counter Can Slow Rust Threads**.

The focused mechanism and progress-display tradeoff earn the length. Narrow the
title from general service performance to shared writes and add a tiny correctness
comparison showing equal totals for the same work allocation. Link the
[existing ordering article](../../data/blog/when-relaxed-atomics-are-enough-and-what-they-never-guarantee.mdx)
when that destination is public. No speedup number should appear before measurement.

### 15 Browser tagging with WebLLM

[Current draft](../../data/blog/could-this-feature-run-entirely-in-the-browser.mdx) · **774 words** · **Major revision**

Suggested title: **Browser AI With WebLLM for a Small Tagging Feature**.

The story promises tag suggestions, but the code only loads an engine. Add a
generation call using a supported pinned model selection, validation against an
allowed tag set, and one input with acceptable output properties. Replace some
generic measurement advice with that missing operation. Alternatively narrow the
page to initialization and failure handling, which the current code actually covers.

### 16 npm lifecycle programs

[Current draft](../../data/blog/what-really-runs-when-you-install-an-npm-package.mdx) · **757 words** · **Strong**

Suggested title: **npm Install Scripts and How to Disable Them**.

The inspection commands, implicit native-build exception, and trust distinctions
give readers useful actions at this length. Add a short recipe for foreground
lifecycle logging in disposable CI using the pinned npm version, then connect the
identified package to the exact-version metadata inspection. The gap is finding
the package behind a hidden step, not explaining more supply-chain theory.

### 17 OpenTelemetry latency triage

[Current draft](../../data/blog/following-one-slow-request-through-an-app.mdx) · **713 words** · **Revise**

Suggested title: **Debug a Slow Node.js Request With OpenTelemetry**.

The wrapper measures the whole lookup, while the promised diagnosis depends on
separating pool wait from query time. Show those two boundaries and a small
interpretation table for long-wait/short-query versus short-wait/long-query. An
illustrative timeline is sufficient if labeled. Let this page own HTTP/database
triage rather than repeat the separate AI-workflow tracing article.

### 18 Next.js client imports

[Current draft](../../data/blog/why-does-a-simple-page-need-so-much-javascript.mdx) · **726 words** · **Revise**

Suggested title: **Why Your Next.js Page Sends Too Much JavaScript**.

The boundary explanation is sound, but no expensive import is actually removed
in the example. Show one concrete before/after import path and identify what
stays on the server. Define the production comparison: route, commits, transferred
JavaScript, RSC payload, and first interaction. Fill results only after measurement.
Keep this scoped to imports; it does not need a general React optimization chapter.

### 19 Rolling out API changes to mobile clients

[Current draft](../../data/blog/the-api-changed-the-old-mobile-app-did-not.mdx) · **736 words** · **Major revision**

Suggested title: **How to Roll Out API Changes to Old Mobile Apps**.

The enum failure, fallback, matrix, and rollout discussion largely repeat the
[existing enum draft](../../data/blog/how-an-unknown-enum-value-breaks-an-otherwise-compatible-consumer.mdx).
Make this page own mobile rollout: show a version or capability decision, what
an old binary receives, and how its released decoder remains in CI. Keep the enum
story brief. The older inventory draft is scheduled for November 20, so do not
add a public link to it earlier without resolving availability.

### 20 Choosing whether vectors need another database

[Current draft](../../data/blog/does-this-search-need-a-vector-database.mdx) · **872 words** · **Major revision**

Suggested title: **Try PostgreSQL Search Before Adding a Vector Database**.

The database-choice promise is mostly answered with retrieval-evaluation advice
already covered by [hybrid retrieval](../../data/blog/hybrid-retrieval-when-keywords-rescue-embeddings.mdx)
and [retrieval evaluation](../../data/blog/evaluate-retrieval-separately-from-answer-generation.mdx).
Make this an implementation trial: a small document fixture, three labeled
queries, SQL baselines, and a decision record covering useful results, latency,
updates/deletes, and operational effort. Link the theory when public rather than
reteaching it. Better retrieval alone does not establish the need for another database.

## Agent security

### 21 Agent file helpers and host paths

[Current draft](../../data/blog/the-sandbox-stayed-closed-the-file-helper-did-not.mdx) · **760 words** · **Strong**

Suggested title: **Prevent Host Side Path Traversal in Agent File Tools**.

The vulnerable helper and replacement explain a concrete repair. Link the full
source and the promised directory-capability follow-up when available. Add a
small request-to-artifact-to-authorized-download flow so the ownership check is
more than advice. Keep this separate from a VM escape. The short length already
fits the question; no broad security expansion is needed.

### 22 DNS policy in an egress broker

[Current draft](../../data/blog/blocking-http-did-not-block-the-way-out.mdx) · **711 words** · **Major revision**

Suggested title: **Reject Disallowed Hosts Before DNS in an Agent Egress Broker**.

The example checks broker ordering, not prevention of direct DNS traffic from
arbitrary agent code. Either adopt that narrow scope or document a concrete
deployment that requires the broker and restricts direct resolution. Add a
denied-address case and show how the real connector pins the address while
verifying the TLS hostname. More general egress warnings will not close the gap.

### 23 Python child inheritance

[Current draft](../../data/blog/the-child-process-inherited-the-secret.mdx) · **774 words** · **Strong**

Suggested title: **Stop Secret Inheritance in Python Subprocesses**.

The example answers a narrow question and explains normal defaults. Put the
expected dummy-token/descriptor result for each launch beside its changed
settings. Distinguish expected assertions from recorded results. Link the timeout
article for resource and lifecycle handling once public instead of broadening
this into another general sandbox guide.

### 24 Shell injection in Python tools

[Current draft](../../data/blog/a-filename-became-a-shell-command.mdx) · **708 words** · **Strong**

Suggested title: **Prevent Shell Injection in Python Agent Tools**.

The repair, option handling, and fixed executable are useful at this length.
Replace some broad closing advice with a small table for semicolon, spaces,
and leading-option input, or a real converter argument example using its
documented filename handling. That applied boundary would add more value than
another explanation of why shell strings are dangerous.

### 25 Directory handles in Rust

[Current draft](../../data/blog/the-safe-path-changed-before-it-was-opened.mdx) · **734 words** · **Revise**

Suggested title: **Restrict Rust File Tools With cap-std Directory Capabilities**.

The current title promises a timed path race; the example checks traversal and
an existing outward symlink. Lead with handle-based access and use the race as
motivation. Show which reads stay on the handle and which unrestricted fallback
would undermine the design. A race demonstration is optional under the narrower
title. Link this from the host-file helper when public.

### 26 Local control service authorization

[Current draft](../../data/blog/localhost-is-not-an-admin-password.mdx) · **746 words** · **Revise**

Suggested title: **Local Agent Control APIs Need Job Scoped Authorization**.

The token function is followed by endpoint responsibilities, leaving readers to
connect trusted authentication to the handler. Show credential extraction,
trusted grant lookup, and a harmless allowed or denied operation. Keep the
network-namespace investigation central: that is the distinct contribution beyond
the existing tool-authorization article. A longer token-comparison discussion
would not solve the missing connection.

### 27 Repository text and tool permissions

[Current draft](../../data/blog/the-readme-asked-for-a-different-job.mdx) · **737 words** · **Major revision**

Suggested title: **Enforce Tool Permissions After Reading Untrusted Repository Content**.

The central rule and unauthorized-export scenario repeat
[tool authorization](../../data/blog/carry-user-authorization-through-every-ai-tool-call.mdx).
Follow one proposed call through the permission gate to the downstream effect,
showing the forbidden action never runs. Include instruction-shaped text that is
legitimate summary evidence. A constructed trace is enough if labeled. Otherwise
consolidate rather than maintain two versions of the same permission lesson.

### 28 Process group timeouts

[Current draft](../../data/blog/the-timeout-ended-one-process-not-the-job.mdx) · **742 words** · **Major revision**

Suggested title: **Python Subprocess Timeouts and Process Group Limits**.

The central problem is surviving descendants, but the demonstration launches
only one sleeper. Add a bounded descendant case with observable remote CI
results, then one supervisor-owned lifecycle covering successful leader exit too.
Keep detached-session limits explicit. Without that work, narrow the scope to
the existing process-group helper and avoid implying complete job containment.

### 29 State across reused jobs

[Current draft](../../data/blog/the-next-agent-read-the-previous-jobs-files.mdx) · **745 words** · **Revise**

Suggested title: **Isolate Agent Job State With Scoped Leases and Generations**.

Same-owner separation and stale generations are valuable, but the title promises
files while the code protects dictionary reads. Show an operator-owned expired
state cleanup path or connect the store to a temporary artifact adapter. Make
the state before and after cleanup visible. Shorten the CPU-cache aside and link
runtime isolation rather than letting it displace the application-state solution.

### 30 Operating the sandbox runtime

[Current draft](../../data/blog/sometimes-the-escape-is-in-the-runtime.mdx) · **757 words** · **Major revision**

Suggested title: **Maintain the Container Runtime Behind an AI Sandbox**.

The advisory comparison is stronger than the Rust string comparator. Build
around an operator workflow: inventory the real runtime/host package, assess the
advisory and backports, stop assignment, replace affected workers, and verify the
old pool is drained. Show a representative inventory record and rollout decision.
Keep the comparator only if it supports that workflow. No real escape payload is needed.

## Technical SEO source inspection

The article route already supplies page-specific title, description, Open Graph,
and Twitter metadata. The root supplies the title suffix, a relative canonical,
and robots defaults. Article and breadcrumb structured data are present, and
publication filtering excludes held/future content from production routes and
sitemap generation by design. Those holds are expected, not an SEO failure.

This is source evidence, not a rendered production check of the thirty drafts.
No draft was built or published for this review. A live fetch through the web
tool was unavailable, so this pass does not certify live canonical tags, indexing,
rich-result eligibility, or page performance.

Before release, verify the rendered page-specific canonical and title, consistent
dates/byline, discoverable internal links, and sitemap inclusion for due approved
content. The route currently emits both Article and BlogPosting objects for the
same post. Review their consistency and whether one identified entity is clearer;
the duplication is not evidence of a ranking penalty. Google's
[Article documentation](https://developers.google.com/search/docs/appearance/structured-data/article)
describes supported article information but does not guarantee search appearance.

## Order of the next content pass

1. Resolve the eleven major revisions. Decide whether each earns a distinct
   page through an implementation, observed evidence, a narrower question, or
   consolidation. Do this before expanding prose or promoting the pages.
2. Give every retained article a specific search question and a title that
   identifies its actual subject. Keep the story in the body. The current title
   field drives both heading and metadata; an unwired SEO-title field would do
   nothing. There is no need to rename URLs solely for this review.
3. Finish the missing solution steps in the thirteen revision drafts. Replace
   general advice with the concrete plan, flow, policy record, or example named
   above. Record real measurements through GitHub CI where needed; never fill
   tables with invented results.
4. Add contextual links and a usable series map. Reuse appropriate existing
   topic structure where possible. Useful CI pairs are flaky-test repair with
   tolerated failures, cancellation with commit identity, and cache invalidation
   with deployment failure. Security navigation should map the boundary each
   article covers. Never link readers to a held or future-only target as though
   it is available; add links as destinations become public.
5. Classify retained pieces deliberately and run release verification through
   the existing GitHub workflows. Reconcile the daily dates at approval so
   elapsed slots do not publish in a batch. This review does not approve release.

The useful next step is a content-and-evidence revision, not another general
language pass or a longer word-count target.
