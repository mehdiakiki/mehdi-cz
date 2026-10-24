export const editorialSeries = [
  {
    slug: "ci-and-coding-agents",
    title: "CI and coding agents",
    description:
      "Find the delay, preserve the test, and connect each CI result to the code it checked.",
    introduction:
      "A fast patch still needs an answer from CI and a decision from a reviewer. These articles follow the queues, tests, caches, and release steps between writing code and running it safely.",
    parts: [
      "the-agent-finished-the-pipeline-did-not",
      "the-build-was-green-and-nobody-understood-the-change",
      "the-agent-made-the-flaky-test-green",
      "every-new-commit-cancelled-the-check-that-mattered",
      "the-test-passed-on-the-wrong-commit",
      "the-cache-made-the-build-fast-and-wrong",
      "the-monorepo-ran-every-test-for-a-small-change",
      "the-review-queue-outgrew-the-build-queue",
      "the-agent-learned-to-ignore-the-check",
      "the-scheduler-worked-and-the-article-never-appeared",
    ],
  },
  {
    slug: "practical-engineering",
    title: "Practical engineering problems",
    description:
      "Small investigations into slow requests, runtime changes, browser work, and data contracts.",
    introduction:
      "Start with the symptom and choose one thing to inspect. Each article takes a specific engineering problem through a small example, the tradeoffs of a repair, and the checks that tell you whether it helped.",
    parts: [
      "deno-joining-cloudflare-what-happens-to-your-app",
      "what-can-an-ai-agent-reach-from-its-sandbox",
      "why-postgresql-stopped-using-the-index",
      "when-more-threads-make-a-service-slower",
      "could-this-feature-run-entirely-in-the-browser",
      "what-really-runs-when-you-install-an-npm-package",
      "following-one-slow-request-through-an-app",
      "why-does-a-simple-page-need-so-much-javascript",
      "the-api-changed-the-old-mobile-app-did-not",
      "does-this-search-need-a-vector-database",
    ],
  },
  {
    slug: "agent-security-boundaries",
    title: "Agent security boundaries",
    description:
      "Follow the file, process, network, permission, and runtime boundaries around an agent.",
    introduction:
      "An agent can cause damage through an overly powerful host tool even when its VM stays isolated. These articles separate that mistake from a runtime escape and show where to enforce the permission, lifecycle, or containment rule.",
    parts: [
      "the-sandbox-stayed-closed-the-file-helper-did-not",
      "blocking-http-did-not-block-the-way-out",
      "the-child-process-inherited-the-secret",
      "a-filename-became-a-shell-command",
      "the-safe-path-changed-before-it-was-opened",
      "localhost-is-not-an-admin-password",
      "the-readme-asked-for-a-different-job",
      "the-timeout-ended-one-process-not-the-job",
      "the-next-agent-read-the-previous-jobs-files",
      "sometimes-the-escape-is-in-the-runtime",
    ],
  },
];

export function editorialSeriesForPost(slug) {
  return editorialSeries.find((series) => series.parts.includes(slug));
}
