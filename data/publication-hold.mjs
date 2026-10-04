/**
 * Editorial hold, set on 2026-10-04.
 *
 * These reviewed articles were queued for automatic release between October and
 * December 2026. The queue is paused while the writing is reorganized around
 * investigations, so each piece can be placed deliberately: main body of work,
 * reference, rewritten around an investigation, or kept out of the main paths.
 *
 * A held article is never published, even after its date passes, and the
 * scheduled-publication check does not report it as overdue. Its frontmatter,
 * review state, and review hash are untouched. Remove a slug to release it.
 */
export const heldArticleSlugs = new Set([
  "ordering-exists-inside-a-boundary-choosing-an-event-partition-key", // 2026-10-04T09:00:00+01:00
  "why-one-lookup-per-byte-can-be-latency-bound", // 2026-10-05T08:50:00+01:00
  "macro-expansion-and-name-resolution-rusts-compiler-feedback-loop", // 2026-10-05T09:00:00+01:00
  "a-dead-letter-queue-is-evidence-not-a-disposal-bin", // 2026-10-06T09:00:00+01:00
  "approval-boundaries-for-expensive-external-and-irreversible-ai-actions", // 2026-10-07T09:00:00+01:00
  "retry-topics-change-ordering-decide-whether-that-is-acceptable", // 2026-10-08T09:00:00+01:00
  "how-rust-analyzer-recomputes-only-what-an-edit-invalidates", // 2026-10-09T09:00:00+01:00
  "where-a-transaction-ends-in-a-message-consumer", // 2026-10-10T09:00:00+01:00
  "benchmark-streaming-scanner-rust", // 2026-10-10T14:15:00+01:00
  "sandboxing-model-generated-code-is-a-systems-problem", // 2026-10-11T09:00:00+01:00
  "why-rust-analyzer-uses-immutable-green-trees-for-broken-code", // 2026-10-12T09:00:00+01:00
  "compensation-is-a-business-operation-not-a-database-rollback", // 2026-10-13T09:00:00+01:00
  "the-cdc-snapshot-to-stream-handoff-without-a-missing-event-gap", // 2026-10-14T09:00:00+01:00
  "reading-rustc-self-profile-data-to-find-a-slow-crate", // 2026-10-15T09:00:00+01:00
  "when-match-reporting-costs-more-than-search", // 2026-10-15T10:40:00+01:00
  "prompt-injection-becomes-serious-when-the-model-has-tools", // 2026-10-16T09:00:00+01:00
  "backward-forward-and-full-compatibility-with-concrete-events", // 2026-10-17T09:00:00+01:00
  "how-a-rust-function-becomes-llvm-ir-without-losing-the-plot", // 2026-10-18T09:00:00+01:00
  "what-a-consumer-rebalance-can-interrupt", // 2026-10-19T09:00:00+01:00
  "recovering-an-agent-workflow-after-the-process-dies", // 2026-10-20T09:00:00+01:00
  "rust-bytes-are-not-text-utf8-scanners", // 2026-10-20T17:25:00+01:00
  "where-backpressure-goes-when-a-stream-processor-cannot-keep-up", // 2026-10-21T09:00:00+01:00
  "what-denos-op2-macro-generates-at-the-javascript-rust-boundary", // 2026-10-22T09:00:00+01:00
  "replaying-events-without-re-sending-emails-or-charging-cards", // 2026-10-23T09:00:00+01:00
  "when-relaxed-atomics-are-enough-and-what-they-never-guarantee", // 2026-10-24T09:00:00+01:00
  "rust-bufread-slices-memory-mapping-copying", // 2026-10-24T09:10:00+01:00
  "why-a-webhook-receiver-cannot-promise-exactly-once", // 2026-10-25T09:00:00+01:00
  "chunk-documents-by-meaning-before-tuning-chunk-size", // 2026-10-26T09:00:00+01:00
  "release-sequences-in-rust-the-rule-behind-a-surprising-acquire-load", // 2026-10-27T09:00:00+01:00
  "acknowledge-before-or-after-processing-enumerate-the-crash-points", // 2026-10-28T09:00:00+01:00
  "reuse-compiled-aho-corasick-searchers-rust", // 2026-10-28T13:50:00+01:00
  "event-time-processing-time-and-watermarks-with-late-data", // 2026-10-29T09:00:00+01:00
  "atomic-fences-in-rust-without-hand-waving", // 2026-10-30T09:00:00+01:00
  "hybrid-retrieval-when-keywords-rescue-embeddings", // 2026-10-31T09:00:00+01:00
  "test-streaming-algorithms-every-chunk-boundary", // 2026-10-31T16:05:00+01:00
  "when-sequence-numbers-fail-and-version-vectors-become-useful", // 2026-11-01T09:00:00+01:00
  "how-an-atomicwaker-avoids-the-check-then-sleep-race", // 2026-11-02T09:00:00+01:00
  "what-schema-registry-compatibility-modes-actually-protect", // 2026-11-03T09:00:00+01:00
  "spend-the-reranking-budget-where-candidate-quality-changes", // 2026-11-04T09:00:00+01:00
  "an-added-field-can-still-be-a-breaking-change", // 2026-11-05T09:00:00+01:00
  "bounded-channels-are-a-capacity-contract-not-just-a-queue-size", // 2026-11-06T09:00:00+01:00
  "unknown-fields-are-the-quiet-engine-of-protobuf-evolution", // 2026-11-07T09:00:00+01:00
  "what-tokio-select-cancels-at-every-loop-iteration", // 2026-11-08T09:00:00+01:00
  "a-canonical-id-is-an-internal-promise-not-a-provider-id", // 2026-11-09T09:00:00+01:00
  "a-retrieval-index-needs-an-invalidation-strategy", // 2026-11-10T09:00:00+01:00
  "entity-resolution-before-machine-learning-exact-normalized-and-reviewed-matches", // 2026-11-11T09:00:00+01:00
  "how-one-blocking-function-stalls-an-async-rust-executor", // 2026-11-12T09:00:00+01:00
  "why-semantic-versioning-does-not-describe-data-compatibility", // 2026-11-13T09:00:00+01:00
  "tokio-s-cooperative-budget-why-a-ready-future-must-still-yield", // 2026-11-14T09:00:00+01:00
  "filter-before-retrieval-permissions-are-part-of-relevance", // 2026-11-15T09:00:00+01:00
  "null-missing-empty-and-default-are-four-different-data-states", // 2026-11-16T09:00:00+01:00
  "graceful-shutdown-in-async-rust-starts-with-task-ownership", // 2026-11-17T09:00:00+01:00
  "units-currency-and-time-zones-belong-in-the-type-or-contract", // 2026-11-18T09:00:00+01:00
  "citations-need-claim-level-provenance-not-decorative-links", // 2026-11-19T09:00:00+01:00
  "how-an-unknown-enum-value-breaks-an-otherwise-compatible-consumer", // 2026-11-20T09:00:00+01:00
  "rust-drop-order-for-fields-locals-temporaries-and-captures", // 2026-11-21T09:00:00+01:00
  "record-level-provenance-explain-where-a-normalized-field-came-from", // 2026-11-22T09:00:00+01:00
  "what-repr-transparent-guaranteesand-what-it-leaves-unspecified", // 2026-11-23T09:00:00+01:00
  "valid-time-and-system-time-two-histories-a-data-product-may-need", // 2026-11-24T09:00:00+01:00
  "tenant-isolation-in-vector-search-beyond-a-metadata-filter", // 2026-11-25T09:00:00+01:00
  "validating-a-knowledge-graph-at-its-product-boundary", // 2026-11-26T09:00:00+01:00
  "slice-str-and-dyn-trait-metadata-through-ptr-metadata", // 2026-11-27T09:00:00+01:00
  "migrating-an-ontology-without-rewriting-reality-in-place", // 2026-11-28T09:00:00+01:00
  "trace-an-ai-workflow-across-retrieval-models-and-tools", // 2026-11-29T09:00:00+01:00
  "initializing-arrays-with-maybeuninit-without-leaking-partial-progress", // 2026-11-30T09:00:00+01:00
  "a-valid-schema-can-still-represent-an-impossible-business-state", // 2026-12-01T09:00:00+01:00
  "the-manuallydrop-box-t-rule-rust-1-98-finally-documents", // 2026-12-02T09:00:00+01:00
  "the-anti-corruption-layer-as-an-integration-boundary-you-can-test", // 2026-12-03T09:00:00+01:00
  "give-an-ai-task-a-cost-budget-before-optimizing-tokens", // 2026-12-04T09:00:00+01:00
  "version-translation-where-old-and-new-api-meaning-coexist", // 2026-12-05T09:00:00+01:00
  "rust-1-98-algebraic-float-operations-faster-math-with-different-answers", // 2026-12-06T09:00:00+01:00
  "who-owns-a-data-contract-when-producer-and-consumer-disagree", // 2026-12-07T09:00:00+01:00
  "replacing-itoa-with-rust-1-98-s-numbuffer-and-format-into", // 2026-12-08T09:00:00+01:00
  "define-the-recovery-point-of-a-data-pipeline-before-it-fails", // 2026-12-09T09:00:00+01:00
  "caching-ai-results-requires-an-identity-and-freshness-model", // 2026-12-10T09:00:00+01:00
  "reconciliation-is-the-repair-loop-of-a-distributed-system", // 2026-12-11T09:00:00+01:00
  "why-rust-added-new-copy-range-types-without-changing-0-10-yet", // 2026-12-12T09:00:00+01:00
  "a-repair-queue-needs-ownership-evidence-and-an-exit", // 2026-12-13T09:00:00+01:00
  "streaming-an-ai-response-moves-latency-it-does-not-remove-it", // 2026-12-14T09:00:00+01:00
  "assert-matches-in-rust-1-96-better-failure-output-for-pattern-tests", // 2026-12-15T09:00:00+01:00
  "what-to-record-before-you-can-safely-replay-data", // 2026-12-16T09:00:00+01:00
  "trace-one-record-across-a-data-pipeline-without-logging-its-secrets", // 2026-12-17T09:00:00+01:00
  "cfg-select-in-rust-1-95-as-a-compile-time-match", // 2026-12-18T09:00:00+01:00
  "design-the-non-ai-path-before-the-model-is-unavailable", // 2026-12-19T09:00:00+01:00
  "an-slo-for-data-freshness-is-not-an-http-availability-slo", // 2026-12-20T09:00:00+01:00
  "if-let-guards-in-rust-1-95-and-the-exhaustiveness-detail-that-matters", // 2026-12-21T09:00:00+01:00
  "what-your-product-does-while-a-critical-provider-is-down", // 2026-12-22T09:00:00+01:00
  "model-routing-is-a-policy-engine-with-quality-consequences", // 2026-12-23T09:00:00+01:00
  "detecting-data-drift-when-the-json-schema-has-not-changed", // 2026-12-24T09:00:00+01:00
  "array-windows-in-rust-1-94-const-sized-windows-and-inferred-patterns", // 2026-12-25T09:00:00+01:00
  "checksums-for-fast-reconciliation-without-comparing-every-row", // 2026-12-26T09:00:00+01:00
  "why-rust-1-96-stopped-turning-undefined-webassembly-symbols-into-imports", // 2026-12-27T09:00:00+01:00
  "a-runbook-for-a-synchronization-job-that-has-stopped-moving", // 2026-12-28T09:00:00+01:00
  "capacity-planning-for-ai-workloads-with-provider-rate-limits", // 2026-12-29T09:00:00+01:00
  "what-rust-1-93-s-musl-upgrade-changed-for-static-network-binaries", // 2026-12-30T09:00:00+01:00
  "fault-injection-for-integrations-timeouts-duplicates-reordering-and-drift", // 2026-12-31T09:00:00+01:00
]);

/**
 * Upgrade deadlines from the 2026 content campaign are paused for the same
 * review. While this is true, a passed upgrade slot is not reported as overdue.
 * Due publish slots for articles that are not held are still checked.
 */
export const campaignUpgradeDeadlinesPaused = true;
