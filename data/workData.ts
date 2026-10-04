export interface WorkLink {
  label: string;
  href: string;
}

/**
 * A piece of work described as an engineering problem: what the problem was,
 * how far down the stack it went, what I changed or decided, and where the
 * evidence is.
 */
export interface WorkItem {
  id: string;
  title: string;
  context: string;
  problem: string;
  depth: string;
  decision: string;
  evidence: WorkLink[];
  /** Set when details stay private (NDA) and the entry is scoped to public facts. */
  constrained?: string;
}

export interface EarlierWorkItem {
  title: string;
  description: string;
  href: string;
}

export const deepWork: WorkItem[] = [
  {
    id: "rustc-late-metadata",
    title: "Changing what goes inside a Rust rlib",
    context: "rust-lang/rust · 4 merged pull requests, 1 open",
    problem:
      "rustc decided which rlib archive members were Rust object files from their names, which a bundled native library can imitate, and link-only data such as bundled native library filenames was stored with the early crate metadata.",
    depth:
      "The compiler backend and the metadata format: the archive writer and reader, the LTO paths of the LLVM and GCC backends, native library handling, and object file sections on different platforms.",
    decision:
      "Added a lib.rmeta-link archive member that only the linking code reads, deleted the filename heuristic, moved native library filenames into the member, and added a cache so each member is decoded once per link. Review reshaped most of the first design.",
    evidence: [
      { label: "Read the case study", href: "/work/rustc-late-metadata" },
      { label: "Tracking issue #138243", href: "https://github.com/rust-lang/rust/issues/138243" },
    ],
  },
  {
    id: "site-performance-lab",
    title: "This site as an engineering laboratory",
    context: "This website · PERF-001 to PERF-056",
    problem:
      "A mostly static site transferred 829 KB on its homepage and fetched a 2.48 MB search index at startup. The question was where that cost came from and how far it could go down without breaking behavior.",
    depth:
      "From application code to the bundler, React server and client boundaries, the Next.js router's prefetch scheduler, HTML delivery, the browser's image pipeline, and Chrome DevTools' trace model.",
    decision:
      "Kept the changes that won on the full journey, rejected several that improved a headline metric but made the system worse, and stopped when six experiments planned in advance failed their own gates.",
    evidence: [
      { label: "Read the investigation", href: "/work/site-performance-lab" },
      {
        label: "Experiment folders",
        href: "https://github.com/mehdiakiki/mehdi-cz/tree/main/experiments",
      },
    ],
  },
  {
    id: "bitarena",
    title: "Bitarena: an arena designed for sparse iteration",
    context: "Original Rust crate · creator and maintainer",
    problem:
      "Generational arenas give stable handles, but iterating a long-lived, mostly empty table still visits every hole.",
    depth:
      "Memory layout and unsafe code: uninitialized slots, an occupancy bitset scanned a machine word at a time, invariants written down in DESIGN.md, and Miri in CI.",
    decision:
      "Pair generational slots with occupancy bitsets, document where a different data structure is the better choice, and publish the benchmark method next to the results.",
    evidence: [
      { label: "Read the case study", href: "/work/bitarena" },
      { label: "Repository", href: "https://github.com/mehdiakiki/bitarena" },
    ],
  },
];

export const professionalWork: WorkItem[] = [
  {
    id: "inferal",
    title: "Inferal: the engine, the ontology system, and Relay",
    context: "Inferal · Founding Engineer · current",
    problem:
      "Keep data from internal systems and third-party APIs synchronized and modeled consistently, under versioning, pagination, rate limits, partial success, duplicates, and out-of-order data.",
    depth:
      "The core engine, the ontology system that gives connected data an explicit model, and Relay, the synchronization capability I built from the ground up.",
    decision:
      "Built Relay from the ground up as the product's data-synchronization capability, and work on the engine and the ontologies it depends on.",
    constrained:
      "The implementation is proprietary, so the case study describes the design pressures rather than the code. My public writing on interrupted execution, retries and reconciliation uses generic examples of the same class of problems.",
    evidence: [
      { label: "Read about my work at Inferal", href: "/work/inferal" },
      { label: "Relay", href: "/work/inferal/relay" },
    ],
  },
  {
    id: "monitorme",
    title: "MonitorMe: connecting backend traces to what the user saw",
    context: "MonitorMe · Founder · March 2025 to present",
    problem:
      "Diagnosing an incident across microservices needs the backend trace and the user's session in one place.",
    depth:
      "Telemetry ingestion with OpenTelemetry, a Go and PostgreSQL API for spans, events and session snapshots, a real-time dashboard, and browser session replay.",
    decision:
      "Built it as an open-source framework, then installed and configured it for client environments through consulting engagements.",
    evidence: [
      { label: "Read the MonitorMe case study", href: "/work/monitorme" },
      { label: "Repository", href: "https://github.com/mehdiakiki/monitorme" },
    ],
  },
  {
    id: "consulting-work",
    title: "Financial and healthcare systems",
    context: "Independent consulting · February 2022 to February 2025",
    problem:
      "A latency-sensitive trading and credit platform at Attijariwafa Bank, and secure data processing for anonymization and reporting at Cheikh Zaid Hospital.",
    depth:
      "Kafka-backed workflows, multithreading and caching for the financial platform; Go, Node.js and Java services for MedTrack at the hospital.",
    decision:
      "Designed the financial system around its throughput and reliability requirements, and reworked the hospital's legacy ETL into secure AWS Lambda workflows.",
    evidence: [],
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
