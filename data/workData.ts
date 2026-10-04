export interface WorkLink {
  label: string;
  href: string;
}

export interface WorkItem {
  id: string;
  title: string;
  role: string;
  summary: string;
  highlights: string[];
  areas: string[];
  links?: WorkLink[];
}

export interface EarlierWorkItem {
  title: string;
  description: string;
  href: string;
}

export const featuredWork: WorkItem[] = [
  {
    id: "inferal",
    title: "Inferal",
    role: "Founding Engineer",
    summary:
      "Worked across three foundational parts of Inferal: the core engine, its ontology system, and Relay, the product's data-synchronization capability.",
    highlights: [
      "Built Relay from the ground up to synchronize data from internal systems and external APIs.",
      "Worked on the engine and on the ontologies used to give connected data an explicit, shared model.",
    ],
    areas: ["Engine architecture", "Data synchronization", "Ontologies"],
    links: [
      { label: "Read about my work at Inferal", href: "/work/inferal" },
      { label: "Visit Inferal", href: "https://inferal.com" },
    ],
  },
  {
    id: "monitorme",
    title: "MonitorMe",
    role: "Founder",
    summary:
      "Founded MonitorMe as an open-source observability framework for diagnosing microservices, then installed and configured it for several client environments through consulting engagements.",
    highlights: [
      "Designed the product across telemetry ingestion, backend services, real-time dashboards, and browser session replay.",
      "Turned the framework into client deployments through installation, configuration, and operational integration.",
    ],
    areas: ["Observability", "Distributed systems", "Product engineering"],
    links: [
      {
        label: "Read the MonitorMe case study",
        href: "/work/monitorme",
      },
      {
        label: "View the framework",
        href: "https://github.com/mehdiakiki/monitorme",
      },
    ],
  },
];

export const consultingWork: WorkItem[] = [
  {
    id: "attijariwafa-bank",
    title: "Attijariwafa Bank",
    role: "Consulting engagement",
    summary:
      "Delivered a latency-sensitive trading and credit platform under strict throughput and reliability requirements.",
    highlights: [
      "Worked across Python and React services, Kafka-backed workflows, multithreading, and caching.",
      "Designed the system around the performance and operational constraints of financial workflows.",
    ],
    areas: ["Financial systems", "Low latency", "Event-driven architecture"],
  },
  {
    id: "cheikh-zaid-hospital",
    title: "Cheikh Zaid Hospital",
    role: "Consulting engagement",
    summary:
      "Led the design and implementation of MedTrack and modernized legacy data-processing workflows used for anonymization and reporting.",
    highlights: [
      "Built MedTrack across Go, Node.js, and Java services.",
      "Reworked legacy ETL into secure AWS Lambda workflows for anonymization and reporting.",
    ],
    areas: ["Healthcare systems", "Data processing", "Cloud infrastructure"],
  },
];

export const independentWork: WorkItem[] = [
  {
    id: "bitarena",
    title: "Bitarena",
    role: "Creator and maintainer",
    summary:
      "Designed a bitset-accelerated generational arena for stable handles and fast iteration over sparse tables.",
    highlights: [
      "Uses generational indices to reject stale handles and bitsets to skip empty blocks during sparse iteration.",
      "Supports no_std with alloc and is validated with unit tests, property tests, and Miri.",
      "Documents benchmark methodology, design invariants, and the workloads where a different data structure is the better choice.",
    ],
    areas: ["Rust", "Data structures", "Performance", "Correctness"],
    links: [
      {
        label: "Read the Bitarena case study",
        href: "/work/bitarena",
      },
      {
        label: "Inspect Bitarena",
        href: "https://github.com/mehdiakiki/bitarena",
      },
    ],
  },
  {
    id: "rust-compiler",
    title: "Rust compiler",
    role: "Contributor · 10 merged pull requests",
    summary:
      "Contributions spanning linker and crate metadata, language behavior, parser diagnostics, and compiler tooling.",
    highlights: [
      "Added an rlib digest used to identify Rust object files.",
      "Added a per-link cache for decoded rmeta and moved native-library filename metadata into the archive.",
      "Adjusted Unpin behavior for local extern types and contributed smaller parser and tooling improvements.",
    ],
    areas: ["rustc", "Linking", "Compiler metadata", "Language semantics"],
    links: [
      {
        label: "rlib object identification",
        href: "https://github.com/rust-lang/rust/pull/154861",
      },
      {
        label: "rmeta link cache",
        href: "https://github.com/rust-lang/rust/pull/158194",
      },
      {
        label: "extern type semantics",
        href: "https://github.com/rust-lang/rust/pull/161692",
      },
    ],
  },
  {
    id: "deno",
    title: "Deno",
    role: "Contributor · 2 merged pull requests",
    summary:
      "Targeted contributions to Deno's web-platform implementation and runtime performance.",
    highlights: [
      "Added a fast path for non-streaming TextDecoder calls.",
      "Added the userAgent property to Navigator's prototype.",
    ],
    areas: ["Runtime performance", "Web APIs", "Rust"],
    links: [
      {
        label: "TextDecoder fast path",
        href: "https://github.com/denoland/deno/pull/14217",
      },
      {
        label: "Navigator userAgent",
        href: "https://github.com/denoland/deno/pull/14415",
      },
    ],
  },
  {
    id: "rust-analyzer",
    title: "rust-analyzer",
    role: "Contributor · 3 merged pull requests",
    summary: "Contributions to editor behavior and consistency inside Rust language tooling.",
    highlights: [
      "Added semicolon completion for module declarations.",
      "Contributed repository and internal naming consistency improvements.",
    ],
    areas: ["Developer tooling", "IDE behavior", "Rust"],
    links: [
      {
        label: "Module semicolon completion",
        href: "https://github.com/rust-lang/rust-analyzer/pull/13207",
      },
    ],
  },
];

export const earlierWork: EarlierWorkItem[] = [
  {
    title: "DICOM Viewer",
    description:
      "A browser-based medical image viewer with slice navigation, windowing, zoom, pan, and searchable DICOM metadata.",
    href: "https://github.com/mehdiakiki/dicomviewer",
  },
  {
    title: "Go Async Image Processing",
    description:
      "A Go worker-pool implementation covering concurrent image jobs, queue management, graceful shutdown, and structured logging.",
    href: "https://github.com/mehdiakiki/go-async-image-processing",
  },
];
