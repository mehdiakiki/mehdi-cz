export const featuredWritingSlugs = [
  "reconciliation-cross-system-sync",
  "grpc-from-the-ground-up",
  "websockets-from-the-wire-up",
  "last-write-wins",
];

export const selectedWritingSlugs = [
  ...featuredWritingSlugs,
  "why-kafka-is-fast",
  "design-control-plane-distributed-database",
  "pub-sub-vs-message-queues",
  "outbox-pattern",
  "cursor-vs-offset-pagination",
  "agent-tool-call-deadline",
  "centralized-idl-api-versioning",
  "real-time-tweet-stat-update-system",
];

export const writingTopics = [
  {
    title: "Distributed systems and data",
    description: "Consistency, reconciliation, messaging, storage, and system boundaries.",
    tags: ["distributed-systems", "system-design", "databases"],
  },
  {
    title: "Rust and systems programming",
    description: "Language internals, runtime behavior, concurrency, and low-level design.",
    tags: ["rust", "systems-programming", "compiler"],
  },
  {
    title: "Reliability and performance",
    description: "Failure modes, observability, latency, and operating software in production.",
    tags: ["reliability", "performance", "systems-programming"],
  },
  {
    title: "Architecture and engineering practice",
    description: "Technical decisions, durable abstractions, and maintaining room to change.",
    tags: ["architecture", "backend", "api-design"],
  },
];
