export const contentClusterSlugs = [
  "rust-under-the-hood",
  "reliable-data-integrations",
  "reliable-ai-systems",
];

export const contentClusters = [
  {
    slug: "rust-under-the-hood",
    shortTitle: "Rust under the hood",
    title: "Rust Under the Hood",
    subtitle: "Async, types, memory, and compiler behaviour",
    description:
      "Practical explanations of the Rust behaviour that only becomes obvious after reading compiler output, measuring a program, or working close to the language and its tools.",
    featuredSlugs: [
      "rustc-defid-vs-hirid",
      "deno_files",
      "tokio-main-deep-dive",
      "acquire-release-rust",
    ],
    introduction: [
      "Rust gives us strong guarantees, but the most useful mental models often sit below the surface syntax. Futures become state machines. A harmless-looking local changes a future's size. Variance, drop checking, pinning, and pointer provenance shape which abstractions are actually sound.",
      "This series makes those mechanics observable. Each article starts from a concrete question, builds the smallest useful model, and then connects it to decisions we make in real code.",
    ],
    principles: [
      {
        title: "Inspect what the compiler builds",
        description:
          "Use expanded code, type information, layouts, MIR, diagnostics, and small experiments instead of relying on folklore.",
      },
      {
        title: "Connect semantics to design",
        description:
          "Language rules matter because they change API boundaries, memory use, concurrency, and the safety of an abstraction.",
      },
      {
        title: "Keep examples reproducible",
        description:
          "Prefer focused programs and commands that a reader can run, change, and use to disprove the explanation.",
      },
    ],
    questions: [
      "What does an async function store across each await point?",
      "Why does a future stop implementing Send?",
      "When do pinning, variance, and drop checking affect an API?",
      "How do compiler and rust-analyzer concepts map source code to meaning?",
    ],
    cta: {
      title: "When implementation details shape the product",
      description:
        "I work on systems where compiler behaviour, runtime constraints, correctness, and performance are part of the design—not cleanup after it.",
      primary: { label: "Review open-source work", href: "/open-source" },
      secondary: { label: "Discuss a role or problem", href: "/contact" },
    },
  },
  {
    slug: "reliable-data-integrations",
    shortTitle: "Reliable data integrations",
    title: "Reliable Data Integrations",
    subtitle: "Synchronization, events, schemas, and recovery",
    description:
      "Engineering patterns for integrations and distributed data flows that must stay understandable when APIs change, deliveries repeat, and parts of the system fail.",
    featuredSlugs: [
      "reconciliation-cross-system-sync",
      "design-control-plane-distributed-database",
      "grpc-from-the-ground-up",
      "centralized-idl-api-versioning",
    ],
    introduction: [
      "Connecting two systems is easy in the successful case. The durable design appears in the less comfortable cases: duplicate delivery, partial progress, conflicting changes, disappearing records, schema drift, and a replay that happens months later.",
      "This series treats integration as a systems problem. It develops explicit models for identity, ownership, ordering, recovery, and observability, then shows how those models guide implementation.",
    ],
    principles: [
      {
        title: "Model identity and ownership first",
        description:
          "A synchronization flow needs explicit answers about which records correspond and which system may change each field.",
      },
      {
        title: "Design the replay before the happy path",
        description:
          "Retries, idempotency, checkpoints, tombstones, and reconciliation are normal operation, not exceptional add-ons.",
      },
      {
        title: "Translate at system boundaries",
        description:
          "Stable internal models contain provider-specific schemas and keep external change from spreading through the product.",
      },
    ],
    questions: [
      "How do two systems converge after partial failure?",
      "Where should idempotency, ordering, and deduplication live?",
      "How can an internal model survive external API and schema changes?",
      "What evidence makes a failed synchronization safe to replay?",
    ],
    cta: {
      title: "When an integration has to survive production",
      description:
        "I design data and integration systems around explicit contracts, observable failure, safe recovery, and the realities of changing external APIs.",
      primary: { label: "See relevant work", href: "/work" },
      secondary: { label: "Discuss your system", href: "/contact" },
    },
  },
  {
    slug: "reliable-ai-systems",
    shortTitle: "Reliable AI systems",
    title: "Reliable AI Systems in Production",
    subtitle: "Evals, retrieval, tools, and observability",
    description:
      "A software-engineering view of AI-enabled products: where models help, where deterministic boundaries remain necessary, and how to operate the whole system responsibly.",
    featuredSlugs: [
      "rag-vs-agents-vs-workflow-automation-startups",
      "the-review-ratchet-how-ai-is-quietly-eating-your-codebase-from-the-inside",
      "how-to-build-secure-internal-ai-tool",
      "agent-tool-call-deadline",
    ],
    introduction: [
      "A useful AI feature is still a production system. It depends on permissions, identity, current data, tool contracts, latency budgets, evaluation, and a recovery path when a probabilistic component behaves differently than expected.",
      "This series focuses on those engineering boundaries. The model is important, but it is one component inside a system that still needs clear invariants and evidence that it works.",
    ],
    principles: [
      {
        title: "Keep deterministic boundaries explicit",
        description:
          "Use models for useful ambiguity, while permissions, state transitions, money, and irreversible actions remain enforceable in code.",
      },
      {
        title: "Evaluate the real workflow",
        description:
          "Measure retrieval, tool selection, outputs, latency, and cost against representative tasks instead of judging a demo by feel.",
      },
      {
        title: "Make failure inspectable",
        description:
          "Record the inputs, versions, sources, tool calls, and decisions needed to explain and improve a production result.",
      },
    ],
    questions: [
      "How do we evaluate an AI workflow rather than one model response?",
      "Which tool actions require validation, authorization, or human approval?",
      "How do retrieval freshness and permissions affect answer quality?",
      "What should be traced to debug quality, latency, and cost together?",
    ],
    cta: {
      title: "AI capability with ordinary engineering discipline",
      description:
        "I help teams turn AI-enabled workflows into maintainable products with clear data, evaluation, permission, and failure boundaries.",
      primary: { label: "See how I work", href: "/how-i-work" },
      secondary: { label: "Discuss your product", href: "/contact" },
    },
  },
];

export const authorityCampaign = {
  opportunityTarget: 200,
  canonicalPageTarget: 200,
  checkpointPageTarget: 100,
  yearEnd: "2026-12-31",
  clusters: {
    "rust-under-the-hood": { opportunities: 70, canonicalPages: 70, checkpointPages: 35 },
    "reliable-data-integrations": {
      opportunities: 90,
      canonicalPages: 90,
      checkpointPages: 45,
    },
    "reliable-ai-systems": { opportunities: 40, canonicalPages: 40, checkpointPages: 20 },
  },
};

export function isContentClusterSlug(value) {
  return contentClusterSlugs.includes(value);
}

export function getContentCluster(slug) {
  return contentClusters.find((cluster) => cluster.slug === slug);
}
