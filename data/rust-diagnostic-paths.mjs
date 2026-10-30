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
