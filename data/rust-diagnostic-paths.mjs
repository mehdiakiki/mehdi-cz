import { publicArticleHref } from "../lib/editorial-navigation.mjs";

export const rustDiagnosticPaths = [
  {
    slug: "request-stops-progressing",
    title: "A request stops making progress",
    firstCheck:
      "Separate waiting for a task, waiting for a connection, and waiting inside the database.",
    caseIds: ["RFA-014", "RFA-036"],
    articleSlugs: [
      "rust-request-waiting-for-pool-or-postgresql",
      "sql-postgresql-rust-service-transactions",
      "how-async-rust-works-under-the-hood",
      "release-mutex-before-remote-api-call",
      "decide-what-happens-when-queue-is-full",
    ],
  },
  {
    slug: "timeout-and-unknown-outcomes",
    title: "The request timed out. Did its work stop?",
    firstCheck: "Check the remote operation before deciding whether a retry can repeat its effect.",
    caseIds: ["RFA-012", "RFA-013"],
    articleSlugs: [
      "rust-timeout-does-not-stop-postgresql-query",
      "postgresql-commit-reply-lost-rust",
      "check-write-outcome-after-timeout",
      "choose-one-layer-to-own-retries",
      "async-cleanup-in-rust-when-drop-cannot-await",
    ],
  },
  {
    slug: "memory-and-slow-consumers",
    title: "Memory grows while a consumer is slow",
    firstCheck:
      "Count payload held by producers and consumers, then distinguish live data from retained capacity.",
    caseIds: ["RFA-011", "RFA-207"],
    articleSlugs: [
      "bounded-rust-channel-database-producer-memory",
      "slow-postgresql-row-consumer-holds-rust-connection",
      "bounded-channels-are-a-capacity-contract-not-just-a-queue-size",
      "bound-task-fanout-before-spawning",
      "arc-clones-retain-old-data",
      "limit-bytes-before-collecting-response-body",
    ],
  },
  {
    slug: "build-inputs-and-stale-results",
    title: "The build changed, or kept an old result",
    firstCheck:
      "Compare the exact build inputs, generated files, dependency features, and database descriptions.",
    caseIds: ["RFA-697", "RFA-032"],
    articleSlugs: [
      "sqlx-offline-build-stale-database-metadata",
      "why-did-cargo-rebuild-this-crate-fingerprints-and-dirty-reasons",
      "test-generated-code-from-empty-output",
      "check-lockfile-before-blaming-rust-upgrade",
      "keep-debug-symbols-for-shipped-binary",
    ],
  },
  {
    slug: "native-library-and-target",
    title: "A native dependency works only on one machine",
    firstCheck:
      "Compare the target architecture and the libraries available to the deployed process.",
    caseIds: ["RFA-042", "RFA-041"],
    articleSlugs: [
      "rust-oracle-client-library-missing-in-deployment",
      "how-the-dynamic-loader-finds-a-shared-library",
    ],
  },
  {slug:"failure-test-did-not-prove-the-contract",title:"A failure test passed without proving the rule",firstCheck:"Check the intended error, stored state, and a valid control before trusting a rejection.",caseIds:[],articleSlugs:["test-must-fail-for-intended-reason","flaky-test-needs-signal-not-longer-sleep","save-failing-input-before-fixing-bug"]},
  {slug:"tenant-boundary-and-cache",title:"An account boundary disappears in a cache or tool",firstCheck:"Trace the authenticated scope through reads, cache hits, invalidation, and the effect boundary.",caseIds:[],articleSlugs:["two-tenants-in-authorization-tests","tenant-in-cache-key-not-only-record-id","denied-tool-call-must-leave-no-side-effect"]},

];

export function availableRustDiagnosticPaths(posts, entries, now = new Date()) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  return rustDiagnosticPaths.flatMap((path) => {
    const links = path.articleSlugs.flatMap((slug) => {
      const href = publicArticleHref(posts, slug, now);
      return href ? [{ href, label: bySlug.get(slug).title, kind: "article" }] : [];
    });
    for (const id of path.caseIds) {
      const entry = byId.get(id);
      if (
        entry?.destinationAvailable &&
        !entry.isPreview &&
        !links.some((link) => link.href === entry.destinationPath)
      ) {
        links.push({ href: entry.destinationPath, label: entry.destinationTitle, kind: "case" });
      }
    }
    return links.length
      ? [{ slug: path.slug, title: path.title, firstCheck: path.firstCheck, links }]
      : [];
  });
}
