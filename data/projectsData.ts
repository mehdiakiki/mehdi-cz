interface Project {
  title: string;
  description: string;
  subtitle?: string;
  href?: string;
  imgSrc?: string;
  type?: string;
}

export const projectsData: Project[] = [
  {
    title: "MonitorMe",
    subtitle: "Founder",
    description:
      "Founded MonitorMe as an open-source observability framework and startup product. Designed the system across telemetry ingestion, backend services, dashboards, and browser session replay, then installed and configured it for several client environments through consulting engagements.",
    imgSrc: "/static/images/monitorme.png",
    href: "https://github.com/mehdiakiki/monitorme",
    type: "personal",
  },
  {
    title: "Rust Programming Language",
    subtitle: "Open Source Contributor",
    description:
      "Contributed ten merged changes to the Rust compiler across linker and crate metadata, language behavior, parser checks, diagnostics, and compiler tooling.",
    imgSrc: "/static/images/rust.png",
    href: "https://github.com/rust-lang/rust",
    type: "opensource",
  },
  {
    title: "Deno",
    subtitle: "Open Source Contributor",
    description:
      "Contributed two merged changes to Deno: a fast path for non-streaming TextDecoder calls and the userAgent property on Navigator's prototype.",
    imgSrc: "/static/images/deno.png",
    href: "https://github.com/denoland/deno",
    type: "opensource",
  },
  {
    title: "Rust Analyzer",
    subtitle: "Open Source Contributor",
    description:
      "Contributed three merged changes to rust-analyzer covering editor behavior and internal naming consistency.",
    imgSrc: "/static/images/rust_analyzer.webp",
    href: "https://github.com/rust-lang/rust-analyzer",
    type: "opensource",
  },
  {
    title: "DICOM Viewer",
    subtitle: "Project",
    description:
      "Built an interactive, browser-based DICOM image viewer using React and Cornerstone3D. The viewer supports full slice navigation, zoom and pan, and window-level adjustments — the core interactions radiologists and medical engineers need when working with diagnostic imaging data. No plugins, no server round-trips: everything runs client-side.",
    imgSrc: "/static/images/dicom_viewer.webp",
    href: "https://github.com/mehdiakiki/dicomviewer",
    type: "personal",
  },
  {
    title: "Go Async Image Processing",
    subtitle: "Project",
    description:
      "Designed and built a Go backend demonstrating production-grade async job processing via a worker pool architecture. The system handles concurrent image operations including resizing and thumbnail generation, with a clean job queue, graceful shutdown under load, and structured logging throughout. A focused exploration of Go's concurrency primitives applied to a realistic workload.",
    imgSrc: "/static/images/go_worker_pool.png",
    href: "https://github.com/mehdiakiki/go-async-image-processing",
    type: "opensource",
  },
];

export const mainProjectData: Project = {
  title: "What is MonitorMe?",
  description: `MonitorMe is an integrated observability platform using OpenTelemetry to monitor backend performance and replay frontend events for rapid error detection. Its intuitive UI delivers near real-time insights.`,
  imgSrc: "/static/images/new-application.webp",
  href: "/work/monitorme",
};
