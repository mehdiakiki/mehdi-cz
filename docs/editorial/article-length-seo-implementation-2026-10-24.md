# Length and search review: implemented revisions

All thirty held articles have been revised against the [adversarial review](article-length-seo-review-2026-10-24.md). The [baseline inventory](article-length-seo-inventory-2026-10-24.json) is preserved. A separate [revised inventory](article-length-seo-revised-inventory-2026-10-24.json) records the current source measurements. These are editorial measurements, not ranking predictions or Search Console results.

Publication is still held: every article remains `draft: true`, `reviewed: false`, with its original slug and daily timestamp. No review hashes or release approval were added. Dates still cover October 24–November 22 at 13:00 UTC; elapsed slots must be reconsidered at release approval to avoid publishing several articles together.

Reader-facing source length is now **821–1,198 words**, with a **median of 959.5**, using the same stripping rule as the baseline. All thirty have authored outgoing contextual references and at least one planned incoming reference from another draft. Those links become clickable only when their target is public; source relationships are not being reported as existing live links.

## What changed

| Review finding | Implemented repair |
| --- | --- |
| Story titles hide the engineering problem | Descriptive titles name GitHub Actions, Playwright, Next.js, WebLLM, OpenTelemetry, PostgreSQL, or the precise boundary where relevant; each summary describes the actual example. |
| Slow CI advice has no diagnosis | One recorded workflow run supplies actual stage boundaries, a checked revision, and a next investigation; no speedup or typical duration is invented. |
| Requirement example repeats the published importer | A fourteen-day trial expiry rule now compares a plausible wrong implementation/test pair against independently specified boundary cases. |
| Playwright repair could erase coverage | A delayed browser fixture and a deliberately wrong row identity check the waiting behavior and the surviving assertion separately. |
| Concurrency, source reporting, cache advice, and exceptions lack operational detail | Add a concurrency decision table, PR head/merge/checkout reporting, a matching cache build input and visibility table, and an owned exception record with restoration conditions. |
| Monorepo article has no selector | A small dependency graph, transitive reverse-dependency traversal, conservative fallback, and a required-result gate are implemented and given positive and negative cases. |
| Review queue article has no method | A fixed snapshot separates waiting, active review, and author rework, with a reproducible summary and limits on causal conclusions. |
| Runtime migration and npm installation advice are broad | A host-dependency inventory, acceptance checks, rollback and installation-permission checks give each article a concrete scope. |
| PostgreSQL and Rust performance advice lacks a worked inspection | A clearly labelled teaching plan explains estimates, loops, buffers and the next action; equal-work Rust programs assert the same result without claiming a benchmark win. |
| Browser inference only initializes an engine | An identified WebLLM catalog model reaches an actual typed completion request; strict output validation, fake-engine cases, and a real SDK export/catalog check cover the application contract. Real GPU behavior and tagging quality remain unmeasured. |
| Tracing and Next.js examples stop too early | The tracing adapter separates connection acquisition and query lifetime, including failure cleanup. A concrete report-history import moves behind the server boundary. No deployed exporter or byte saving is claimed. |
| Mobile and vector articles overlap existing guides | Mobile focuses on preventing a new enum reaching an old decoder during rollout. The search article uses a disposable PostgreSQL lexical/vector/fusion trial, with hand-written coordinates and exact assertions rather than retrieval-quality claims. |
| Host helper and shell examples omit later effects | An artifact lifecycle checks creation, download ownership, expiry, size and denial. An argument-array example includes the fixed converter's option grammar. |
| DNS policy stops at a predicate | Socket-free checks carry the validated numeric address into the real HTTPS option shape, retaining SNI, Host and TLS verification; empty/mixed/forbidden answers and redirects are denied. |
| Filesystem, local API and prompt injection examples need clearer boundaries | Directory-relative reads, job-bound handler credentials, and approved-call-to-effect traces exercise the intended rules and state exactly what a same-process example cannot enforce. |
| Timeout, job cleanup and runtime maintenance examples stop at configuration | Bounded Linux leader/descendant cases cover completion, timeout, cancellation and launcher error; job collection preserves live state; runtime inventory covers admission, observation age, drain and replacement. These are not actual cgroup or vendor-exploit tests. |
| Contextual links and public series structure are missing | Authored `ArticleLink` references use the publication gate; three ordered series hubs, per-article navigation and Writing-page entries become visible only after a member is public. All thirty receive an explicit theme/tier registration, with twenty-two articles and eight references. |
| Article metadata has duplicate entities and inherited canonical ambiguity | The article route supplies a concrete canonical URL and one Article JSON-LD entity, retaining authors and the relevant collection. Series hubs receive their own canonical, collection schema and sitemap entries only when public. |

The prose keeps the practical, conversational voice. Added length serves missing demonstrations and decision points; there is no larger word-count target, manufactured grammatical mistakes, fabricated personal experience, or claim of human-only authorship.

## Verification and limits

Examples live under `experiments/editorial-ci/`, `experiments/practical-engineering/`, and `experiments/agent-security/`. Their READMEs describe inputs, commands and limits. Expected assertions are not evidence of completed runs.

The existing Content safety workflow now installs isolated, pinned fixture dependencies, runs their checks, typechecks relevant examples, executes the disposable database trial, builds the production site and renders all thirty held MDX sources into review artifacts. Navigation tests cover the exact publication boundary, holds, order and unavailable hubs. The configured runner is unchanged. Builds, checks, example execution and formatting run in GitHub CI only.

Remote verification is pending at this revision. The first CI pass also captures a patch for generated dependency locks and formatting; that patch must be reviewed and committed before a clean verification can pass. No local example, build, test, typecheck or benchmark was run.

Independent source reviewers checked the three content groups and the navigation integration. Cross-review identified a pool-acquisition wording issue, missing positive handler coverage, a SQL output/assertion mismatch, and a process-ID acquisition race; those fixes are included before running the fixtures. This review is AI-assisted and is not release approval from the author.

Before release, the author still needs to approve the articles and refresh time-sensitive vendor claims and elapsed publication dates. Live browser model execution, actual network containment, deployed telemetry propagation, production bundle differences and real runtime patching remain environment-specific checks; the small fixtures do not establish those outcomes.
