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
    subtitle: "Founding Software Engineer",
    description:
      "Built and led MonitorMe, an open-source, full-stack observability framework designed for distributed microservices. Architected the system end-to-end: from data ingestion pipelines and metric aggregation to the real-time dashboard UI. MonitorMe gives engineering teams deep visibility into their infrastructure without the overhead of heavyweight commercial solutions.",
    imgSrc: "/static/images/monitorme.png",
    href: "https://github.com/mehdiakiki/monitorme",
    type: "personal",
  },
  {
    title: "Rust Programming Language",
    subtitle: "Open Source Contributor",
    description:
      "Contributed directly to the Rust compiler and its tooling ecosystem. Work included sharpening borrow-checker diagnostics to surface clearer, more actionable error messages and improving compilation performance where it matters most. Contributing to Rust means navigating one of the most rigorous codebases in the industry, where correctness is non-negotiable.",
    imgSrc: "/static/images/rust.png",
    href: "https://github.com/rust-lang/rust",
    type: "opensource",
  },
  {
    title: "Deno",
    subtitle: "Open Source Contributor",
    description:
      "Contributed to Deno, a secure-by-default JavaScript and TypeScript runtime built in Rust. Deno rethinks what a modern runtime should look like: native ES modules, top-level await, and a built-in suite of tooling (formatter, linter, test runner) with no configuration required. Working on Deno means reasoning about security boundaries, runtime internals, and the sharp edges of the JS spec.",
    imgSrc: "/static/images/deno.png",
    href: "https://github.com/denoland/deno",
    type: "opensource",
  },
  {
    title: "Rust Analyzer",
    subtitle: "Open Source Contributor",
    description:
      "Contributed to Rust Analyzer, the modular compiler frontend that powers the Rust developer experience across every major editor. Features like instant diagnostics, intelligent code completion, go-to-definition, and automated refactoring all flow through this codebase. It's infrastructure that thousands of Rust developers depend on daily, and getting anything merged requires understanding the compiler's internal architecture in depth.",
    imgSrc: "/static/images/rust_analyzer.png",
    href: "https://github.com/rust-lang/rust-analyzer",
    type: "opensource",
  },
  {
    title: "DICOM Viewer",
    subtitle: "Project",
    description:
      "Built an interactive, browser-based DICOM image viewer using React and Cornerstone3D. The viewer supports full slice navigation, zoom and pan, and window-level adjustments — the core interactions radiologists and medical engineers need when working with diagnostic imaging data. No plugins, no server round-trips: everything runs client-side.",
    imgSrc: "/static/images/dicom_viewer.png",
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
  imgSrc: "/static/images/new-application.png",
  href: "/blog/the-time-machine",
};
