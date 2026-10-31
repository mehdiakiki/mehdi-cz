# Rust editorial direction for human readers

On October 27, 2026, the author accepted six Rust themes and set a daily traffic target of 1,000 as the next milestone. The longer ambition is to make mehdi.cz one of the most visited Rust websites. The articles should earn that audience by helping people understand and solve problems, with a natural voice and useful technical depth.

The author reported almost 200 per day. Keep the same analytics metric when comparing that baseline with later traffic. The daily figure is approximate and comes from the author; a sustained average will give a clearer view of progress than a single busy day.

## Editorial standard

Write as one engineer helping another. Explain what a reader is seeing, why it happens, and what they can do next. Let the author's actual observations and judgment give the writing its character. Use short sentences and familiar words, and explain technical terms when the reader needs them.

Each article needs enough detail to answer its question. Some questions need a short explanation. Others need a longer investigation with diagrams, traces, or code. Vary the structure to suit the problem. A repeated template, an arbitrary word count, or a daily slot must not determine how much an answer needs.

Use titles that describe the problem accurately. Link to another article where it answers a useful follow-up question. Finish with a complete answer to the current question, so the reader can leave with something useful even if they never open another page.

Personal stories must come from the author's experience. Describe a constructed reproduction as a reproduction. Explain uncertainty where it affects a decision. Use measured results only when execution evidence supports them. Keep accurate descriptions of authorship and assistance.

Before release, read the prose aloud and ask whether a person can follow the explanation without already knowing the answer. Remove filler, unexplained shorthand, forced storytelling, and repeated introductions or endings. Check that the reader can explain the cause and choose a sensible next step.

## Accepted themes

### When AI writes the first implementation

On October 31, the author asked for the Rust and AI articles to go beyond producing code. Assume a reader can ask a coding agent for an initial implementation. Help that reader decide what it should do, identify what remains uncertain, and collect evidence before accepting the change.

A SQLx example should help distinguish a pool wait from a database lock, explain why a smaller connection scope changes progress, and check whether the repair preserves the write contract. A retrieval example should inspect the documents sent to the model and account for edits, access boundaries, and deletion. A skill guide should explain how to judge a workflow's results as well as how to write its frontmatter.

Use a plausible wrong repair to make the decision concrete. Choose assertions from the requirement rather than from the implementation an agent happened to produce. Retain source versions and execution evidence, and say what the experiment cannot establish. These are editorial questions, not a required article template. Do not speculate about permanent limits on AI capability.

The first writing batch expands the connection-pool investigation and the existing Claude Code skills guide, and adds a Rust/PostgreSQL retrieval investigation. New SQL articles retain Rust executable examples. The approved daily calendar continues to govern releases.

The pool expansion is now folded into the existing pool-wait guide, `rust-request-waiting-for-pool-or-postgresql`. The overlapping source remains held and redirected. Its new value is the quote revision contract, cancellation check, and deliberately gated progress comparison. The retrieval manuscript adds a Rust serving and publication contract to the existing conceptual retrieval guides; it does not claim a complete model integration or a relevance benchmark.

The second batch keeps the existing SQLite writer and stale-snapshot explanation intact. A distinct checkpoint investigation follows the history retained by a long reader. A pgvector investigation compares exact and actual HNSW plans under the same tenant predicate. The existing Claude Code CI guide is revised around trusted source identity, independent requirement checks, bounded results, and publishing authority. The scope and primary sources are recorded in `ai-writing-second-batch-2026-10-31.json`.

### Subject priorities

The first three themes receive the most attention. Keep the next thirty proposed articles rooted in established SQL databases and database internals. Every executable example in that series must be Rust, with SQL inside Rust query calls.

| Priority | Theme                                  | What the reader should gain                                                                                      |
| -------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1        | Debugging across Rust and the database | Separate task scheduling, connection acquisition, database waits, and result handling using observable evidence. |
| 2        | Cancellation and uncertain outcomes    | Understand what the caller knows after a timeout or disconnect and how to recover safely.                        |
| 3        | Memory budgets and backpressure        | Trace retained data and slow consumers through the whole request or worker.                                      |
| 4        | Deliberate failure testing             | Force the important interruption or execution order and check the resulting data.                                |
| 5        | Build diagnosis and dependency costs   | Find which input or dependency caused work and judge the cost of a proposed change.                              |
| 6        | Rust inside existing systems           | Diagnose native clients, deployment dependencies, encoding, and ownership across system boundaries.              |

The existing Rust atlas supplies the deeper explanations. Extend it with distinct investigations and improve an existing article when it already answers the question.

The Rust surveys support attention to these problems. The [2025 State of Rust results](https://blog.rust-lang.org/2026/03/02/2025-State-Of-Rust-Survey-results/) identify compilation and storage usage as persistent concerns. The [2026 debugging survey](https://blog.rust-lang.org/2026/09/07/rust-debugging-survey-2026-results/) documents difficulties with stepping, inspecting values, and async debugging. These are signals of reader need; actual site results will guide the balance between themes.

## Candidate follow ups

These briefs develop the accepted themes. Article preparation follows the existing publication and review process. The [approved daily calendar](daily-publication-calendar.md) continues to govern its scheduled batch.

### A Rust request is hanging

Follow a Rust request into PostgreSQL and show how to distinguish a stalled task, a pool wait, and a database lock. Give the reader an order of investigation and explain what observation changes the diagnosis. Use controlled cases that make the differences visible.

Build on [the connection lifetime draft](../../data/blog/database-pool-full-check-connection-lifetime.mdx) and [the request tracing article](../../data/blog/tokio-spawn-loses-request-tracing-span.mdx). The new value is the comparison between causes. Keep the detailed connection lifetime explanation in its existing article.

### The connection failed during commit

Investigate a PostgreSQL transaction whose commit response does not reach the Rust caller. Show the data and operation identity that would let the application resolve the outcome. Separate a confirmed rejection from a result that remains unknown.

Extend [the timeout outcome draft](../../data/blog/check-write-outcome-after-timeout.mdx) with evidence at the database boundary. Keep recovery claims specific to the tested engine, driver, and protocol behavior.

### Streaming rows to a slow client

Follow PostgreSQL rows from the query through the Rust response to a controlled slow consumer. Inspect where data waits, how long the connection remains occupied, and what cancellation leaves behind. Explain the tradeoff between collecting a result and keeping a stream open.

Build on [the queue memory draft](../../data/blog/message-count-is-not-queue-memory-budget.mdx). Add evidence about the database connection and result stream so the article answers a different reader question.

### Disconnect during a transaction

Help a Rust reader choose meaningful assertions for a PostgreSQL interruption test. Arrange a known interruption point, inspect persisted data through a separate connection, and explain which outcome the test establishes.

Keep this article focused on designing the test. If the investigation only repeats the commit recovery article, include the explanation there. Publish a separate page only when it supplies a complete and distinct answer.

### SQLx offline metadata drift

Explain what a Rust build using offline query metadata checks and what must be checked against the database. Use a controlled schema change to make the distinction visible. Give readers a CI procedure they can adapt to their own schema and deployment process.

Connect this to [Cargo rebuild diagnosis](../../data/blog/why-did-cargo-rebuild-this-crate-fingerprints-and-dirty-reasons.mdx). Verify SQLx behavior against the pinned version's primary documentation when preparing the article.

### Shipping an Oracle client dependency

Start with a Rust program that connects in one environment and fails in its deployment environment. Follow the native client dependencies and configuration needed to explain the difference. Give the reader a way to identify the missing requirement and verify the repair.

Extend [the Oracle integration article](../../data/blog/adding-rust-to-a-system-that-already-uses-oracle.mdx) with a specific deployment investigation. Record the native client, operating system, architecture, and Rust crate versions that determine the result.

## Cadence and evidence

Keep the established daily publication cadence. Group related investigations so that readers can follow one useful question into the next. Use the existing queue where it already serves the accepted themes. Preserve time to improve an explanation or reproduction before release.

All builds, tests, typechecks, benchmarks, and other compiler or materializer workloads run through the existing GitHub Actions workflows with their configured runners. Local editing and file review are allowed. An article must not present a planned experiment as an observed result.

## Measuring progress

Use a trailing 28-day daily average on the same traffic metric to judge progress toward 1,000 per day. Keep the measurement definition and source consistent. This is the next milestone; it does not establish a ranking among Rust websites.

Review equally aged article groups after at least 28 days, allowing for reporting delay. Follow the existing [growth experiment](../../data/rust-atlas-growth-experiments.mjs) when its cohorts and decision rule apply. For the new themes, track search clicks to each article and visits to a relevant follow-up article. Read questions and corrections from readers to find explanations that need more work.

Use those findings to choose the next investigation and improve existing answers. Keep the human reader's understanding as the standard for the prose.

## Opportunities from readership

Help readers who want to know more about the author find relevant engineering work and get in touch. Rust articles should offer a clear route to the compiler case study. A reader with a question or correction should feel welcome to ask it. Offer RSS for people who want to follow future writing in a feed reader.

Review the number of relevant conversations about roles, projects, and collaboration alongside traffic. Work and contact clicks show interest; the author can judge which enquiries become useful opportunities. Keep the articles complete and helpful on their own.

## October 30 release and reader needs

The remaining practical drafts now supply forty-two distinct guides. Two overlapping drafts strengthen the existing pool-wait and bounded-channel guides instead of creating competing answers. Five reading series and the atlas symptom paths connect the new material to deeper investigations.

A current documentation search confirms that the basic rules already have good sources. Tokio explains [short shared-state lock scopes](https://tokio.rs/tokio/tutorial/shared-state), SQLx documents [pool ownership and acquisition](https://docs.rs/sqlx/0.8.6/sqlx/struct.Pool.html), and Cargo describes [persistent build output directories](https://doc.rust-lang.org/cargo/reference/build-scripts.html). OWASP also documents [excessive tool permissions](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/). These topics are not absent from the internet. Our editorial opportunity is an inference: connect the documented rule to a complete failure reproduction, stored outcome, repair decision, and explicit limits. This search is not a search-volume study or proof that competing examples do not exist.

Give the database and runtime paths the most attention when evaluating this release. Useful entry questions include a full connection pool with an idle database, work that survives a lost reply, queued payload outside a channel's nominal capacity, and stale generated output that survives a rebuild. Use actual search queries and reader questions to decide which explanations need refinement. Do not infer demand from the number of pages published.

The target still needs roughly eight hundred additional daily visits on the author's original metric. There is no defensible fixed number of articles that guarantees that increase. Compare the trailing 28-day average, article search clicks, follow-up reading, and relevant work enquiries after the cohort has had time to be discovered. Prioritize improving pages with relevant impressions but weak clicks, or useful entry traffic with poor follow-up reading. Keep the existing scheduled calendar separate from this explicitly requested draft release.

## October 31 publication request

The author asked to make these articles more human and publish them once revised. The resulting release adds the Rust/PostgreSQL retrieval, SQLite checkpoint, and filtered pgvector investigations. It updates the existing pool-wait, Claude Code skills, and Claude Code CI guides at their current URLs.

The prose now starts with concrete symptoms, explains terms beside the problem, and removes repeated review language. Compiled Rust excerpts and observed results remain intact. Constructed examples are not presented as personal incidents, and local policy checks are not presented as a model-quality evaluation. The author remains Mehdi Akiki alone.

`ai-writing-release-2026-10-31.json` records the requested release and hashes of the reviewed sources. Existing GitHub checks and the production deployment workflow govern publication. The other scheduled calendar is unchanged.
