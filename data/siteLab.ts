/**
 * Public summary of the site performance investigation (PERF-001 to PERF-056).
 *
 * Every number here comes from the experiment folders or the investigation
 * ledger. Early work (roughly PERF-001 to PERF-026) kept deterministic byte
 * counts but only single timing traces, so it is labelled as a single
 * historical measurement. Nothing here is field data.
 */

export const labRepository = "https://github.com/mehdiakiki/mehdi-cz";
export const experimentsBaseUrl = `${labRepository}/tree/main/experiments`;
export const upstreamDraftsUrl = `${labRepository}/tree/main/docs/upstream`;

export type LabOutcome = "kept" | "rejected" | "lab-only" | "upstream";

export type LabEvidence =
  { kind: "folder"; folders: string[]; note?: string } | { kind: "historical"; note?: string };

export interface LabInvestigation {
  id: string;
  title: string;
  perf: string;
  outcomes: LabOutcome[];
  result: string;
  conclusion: string;
  evidence: LabEvidence;
  upstream?: string;
}

export const labInvestigations: LabInvestigation[] = [
  {
    id: "default-path",
    title: "Who owns the work before first paint?",
    perf: "PERF-001, 003, 004, 005, 011, 020",
    outcomes: ["kept", "rejected"],
    result:
      "A custom vendor chunk put every dependency on every route, the full search index loaded at startup, and analytics started before the page finished. Moving optional work off the default path cut the homepage from 829,434 to 146,265 transferred bytes after the first four changes.",
    conclusion:
      "Look for global work before polishing assets. One attempt lost: calling dynamic() from a Server Component did not keep the footer form out of startup, so the boundary had to move instead.",
    evidence: { kind: "historical" },
  },
  {
    id: "prefetch-policy",
    title: "Idle prefetch is a bandwidth policy",
    perf: "PERF-002, 018",
    outcomes: ["kept"],
    result:
      "Viewport prefetch fetched route data for links nobody followed. With intent prefetch, /blog, /notes and /open-source went from 7, 8 and 3 idle fetches to zero, and a hover-then-click still reached the page in 50 to 58 ms.",
    conclusion:
      "Prefetching everything visible is a decision about other people's bandwidth. Prefetch on intent unless the data says otherwise.",
    evidence: { kind: "historical" },
  },
  {
    id: "search",
    title: "Search: the slow part was not the network",
    perf: "PERF-022, 023",
    outcomes: ["kept", "rejected"],
    result:
      "The search index shipped the authoring model. A four-field protocol made it 86.6% smaller. Then loading everything in parallel made the input appear later (391 to 643 ms), because 941 commands were initialized before it painted. A small eager shell with an intent-only index won.",
    conclusion:
      "The faster network path can still lose to initialization work. Measure until the input is usable, not until the bytes arrive.",
    evidence: { kind: "historical" },
  },
  {
    id: "archive",
    title: "A crawlable archive without shipping the archive",
    perf: "PERF-006, 007, 008, 009",
    outcomes: ["kept"],
    result:
      "Large hub pages serialized hundreds of entries into one document. Bounded directories cut the Atlas landing page's gzip HTML by 91.9% and its DOM by 90.3%, and the /rust document by 92%. Every link stays reachable without JavaScript.",
    conclusion:
      "A smaller document is not automatically a faster paint: one single trace even got 64 ms slower, so no paint improvement is claimed for that step.",
    evidence: { kind: "historical" },
  },
  {
    id: "server-boundaries",
    title: "When the Server Component is the bigger choice",
    perf: "PERF-015, 021, 024, 025, 026",
    outcomes: ["kept", "rejected"],
    result:
      "Moving the header to a Server Component saved 99 bytes of JavaScript but made the document and the Flight payload larger, so it was reverted. Eight small client links lost to one delegated island. The official multiple-root layout still loaded other routes' chunks.",
    conclusion:
      "Evaluate a server boundary where it changes the serialization graph, not only by the JavaScript it removes.",
    evidence: {
      kind: "folder",
      folders: ["next-rendering-boundary"],
      note: "PERF-015 has a folder with summary medians but no raw rows. The rest are single historical measurements.",
    },
  },
  {
    id: "editor",
    title: "The smaller editor was slower",
    perf: "PERF-019",
    outcomes: ["rejected"],
    result:
      "Three curated Monaco builds, about 21% smaller than the CDN version, became usable later than the full local build. Evaluation and grammar setup, not bytes, decided the ready time. The full local build was kept until the editor was removed from the site in October 2026.",
    conclusion:
      "Bytes are a proxy. When the proxy and the user-visible milestone disagree, trust the milestone.",
    evidence: { kind: "historical" },
  },
  {
    id: "upgrade-baseline",
    title: "Upgrading without letting the new version erase the baseline",
    perf: "PERF-016, 017, 028",
    outcomes: ["kept", "rejected"],
    result:
      "Turbopack repeated more Flight chunk-list bytes on the homepage (2.05% against a 2% budget) than webpack (0.95%), so production stayed on webpack behind an executable budget. DevTools estimated 12.1 kB of legacy JavaScript; the removable amount was 298 bytes.",
    conclusion:
      "Treat the bundler as a variable and turn a regression report into a release gate that fails the build.",
    evidence: {
      kind: "folder",
      folders: ["next-legacy-polyfills"],
      note: "PERF-016 and 017 are single historical measurements plus the budget script in scripts/.",
    },
    upstream: "Comment draft on Next.js #86785 / #88551 (unsubmitted).",
  },
  {
    id: "framework-floor",
    title: "What does the framework cost, and what breaks without it?",
    perf: "PERF-029, 030",
    outcomes: ["rejected", "lab-only"],
    result:
      "Plain HTML improved cold LCP by only 17 to 19 ms, but roughly halved load time. A static tier with 89% fewer startup bytes still lost warm navigation, because the live router reuses the DOM it already has. The framework stayed.",
    conclusion:
      "There is no universally fastest rendering model. Cold entry, warm navigation and back navigation each have a different winner.",
    evidence: { kind: "folder", folders: ["next-content-delivery-floor", "static-content-tier"] },
    upstream:
      "Validation for Next.js Route Handler compression, issue #98007 / PR #98044 (unsubmitted).",
  },
  {
    id: "prerender",
    title: "When does prerender pay for itself?",
    perf: "PERF-031 to 035",
    outcomes: ["lab-only", "rejected"],
    result:
      "Speculation Rules prerender helped only after real intent. Immediate touch and focus triggers were wasted on abandonment. Waiting for prefetch to finish before prerendering was slower, up to 632% at one boundary, because Chrome could already overlap the work.",
    conclusion:
      "Speculation needs an abandonment budget and proof of activation. The intuitive sequential pipeline was the slow one.",
    evidence: { kind: "folder", folders: ["static-content-tier"] },
  },
  {
    id: "html-scheduling",
    title: "The first 2 KiB of HTML is a scheduling API",
    perf: "PERF-036, 037, 038",
    outcomes: ["lab-only"],
    result:
      "In the static-tier prototype, 2 KiB was the smallest compressed prefix that worked across both transports. Reordering the head recovered 60 ms without adding bytes. Content-addressed assets removed six 304 revalidations.",
    conclusion:
      "Order and cache policy schedule work as much as size does. A 304 is still a round trip.",
    evidence: { kind: "folder", folders: ["static-content-tier"] },
  },
  {
    id: "image-scheduling",
    title: "Image eligibility, priority and preload",
    perf: "PERF-039 to 043",
    outcomes: ["kept", "rejected", "upstream"],
    result:
      "The first MDX diagram stays lazy but starts at high priority, and desktop gets a media-gated preload that moved LCP 532 to 924 ms earlier. A two-candidate preload duplicated downloads and was 500 to 812 ms slower at fractional pixel ratios.",
    conclusion:
      "Priority and eagerness are different decisions. Preload is an exception to lazy loading, not a default.",
    evidence: {
      kind: "folder",
      folders: [
        "mdx-image-priority",
        "mdx-media-preload",
        "mdx-preload-metadata",
        "next-image-sizes-parser",
        "next-image-preload-media",
      ],
    },
    upstream:
      "Original Next.js patches: a sizes parser that misses calc() and decimals, and a preloadMedia option for Image (both unsubmitted).",
  },
  {
    id: "image-publication",
    title: "The image finished, so why has it not painted?",
    perf: "PERF-044, 045",
    outcomes: ["kept", "rejected"],
    result:
      "The time after the image arrived was layout, raster and presentation. Synchronous decode and an early flush both lost. Separately, seven visible tags triggered 11 idle route requests after LCP; reusing intent links removed about 131 kB. An earlier theme script was rejected because it caused a hydration repair and a duplicate image download.",
    conclusion:
      "Attribute the whole interval before blaming the network or JavaScript. Work after the headline metric still costs.",
    evidence: {
      kind: "folder",
      folders: ["image-publication-delay", "startup-execution-attribution"],
    },
  },
  {
    id: "css-frontier",
    title: "The CSS frontier: faster-looking options that lost",
    perf: "PERF-048, 049, 051, 052",
    outcomes: ["kept", "rejected"],
    result:
      "Inlining all CSS won 372 to 480 ms of cold LCP and was still rejected: 18 to 22 kB more cold transfer, mixed or slower reloads, and 836 MB more build output. Splitting the historical article stylesheet by rendered content was kept. Critical CSS and route-weighted splitting failed their gates.",
    conclusion:
      "A better headline metric is not a better system when the full journey, the cache and the build all get worse.",
    evidence: {
      kind: "folder",
      folders: [
        "next-inline-css-growth",
        "article-style-promotion",
        "critical-css-delivery",
        "route-css-graph",
      ],
    },
    upstream:
      "Independent evidence for Next.js issue #95141 on inline CSS duplication (not posted).",
  },
  {
    id: "tailwind",
    title: "Tailwind scanned 12 GB of old builds",
    perf: "PERF-050",
    outcomes: ["kept"],
    result:
      "Automatic source detection was reading old build directories. Bounding the sources cut an isolated compile from 77.2 s and 14.0 GiB to 355 ms and 157 MiB, and the stylesheet lost 883 gzip bytes. Page load did not change measurably.",
    conclusion:
      "Some performance work is about the cost of producing the site, not the cost of loading it.",
    evidence: { kind: "folder", folders: ["tailwind-source-boundary"] },
  },
  {
    id: "prefetch-scheduler",
    title: "When the fifth prefetch disappeared",
    perf: "PERF-046, 047",
    outcomes: ["upstream"],
    result:
      "Some prefetches never ran. Decoding the router's prefetch protocol led to a Next.js scheduler bug where sibling tasks were lost. It was already reported. I reproduced it and confirmed the existing fix red/green with both webpack and Turbopack. No speed claim survived the measurement.",
    conclusion:
      "A correctness fix does not need a latency story. Report the bug, not an invented speedup.",
    evidence: { kind: "folder", folders: ["next-prefetch-sibling-starvation"] },
    upstream: "Validation of Next.js issue #96965 / PR #97377 (review note not posted).",
  },
  {
    id: "measurement",
    title: "Making the lab hard to fool",
    perf: "PERF-010, 013, 027",
    outcomes: ["kept", "upstream"],
    result:
      "Web Vitals code was reporting to an analytics sink that did not exist, an audit passed without testing anything, and a DevTools forced-reflow warning came from another thread. They became a removal, an executable check, and a DevTools patch draft.",
    conclusion:
      "Instruments can be confidently wrong. Check the instrument before trusting the reading.",
    evidence: {
      kind: "folder",
      folders: ["devtools-forced-reflow-attribution"],
      note: "PERF-010 and 013 are single historical measurements.",
    },
    upstream: "Original Chrome DevTools patch with a test (unsubmitted).",
  },
];

export interface LabWallEntry {
  perf: string;
  idea: string;
  gate: string;
  outcome: string;
  folder?: string;
}

/** The preregistered frontier: gates were written before the runs. */
export const labWall: LabWallEntry[] = [
  {
    perf: "PERF-051",
    idea: "Cacheable critical CSS core with the full stylesheet deferred",
    gate: "Exact rendering, at most 4 KiB gzip blocking CSS, at most 2 KiB added cold transfer",
    outcome:
      "The small arms broke the page during rapid scroll. Every correct arm duplicated too many bytes.",
    folder: "critical-css-delivery",
  },
  {
    perf: "PERF-052",
    idea: "Route-weighted CSS split",
    gate: "At least 20% or 3 KiB smaller route-weighted CSS, 10% better journey transfer, Flight share under 2%",
    outcome: "7.55% worse weighted bytes, 10.9% worse journey, 3.83% Flight share.",
    folder: "route-css-graph",
  },
  {
    perf: "PERF-053",
    idea: "HTTP 103 Early Hints for the critical stylesheet",
    gate: "Needed a stable critical asset from PERF-051",
    outcome: "Never eligible to run, because PERF-051 produced no asset worth hinting.",
  },
  {
    perf: "PERF-054",
    idea: "Compression dictionary transport for article pages",
    gate: "25% fewer document bytes by page three, dictionary cost repaid by page three",
    outcome:
      "Primed pages were 59% smaller, but fetching the dictionary made a three-page visit 11.8% (64 KiB) and 55.6% (128 KiB) worse.",
    folder: "compression-dictionary-transport",
  },
  {
    perf: "PERF-055",
    idea: "Prerender only popular pages, render the tail on demand",
    gate: "50% less server output, 30% faster build, 20% less memory",
    outcome: "29% less output, 5% faster, 0.4% less memory.",
    folder: "popularity-bounded-prerendering",
  },
  {
    perf: "PERF-056",
    idea: "Tuned fallback font metrics for the cold font swap",
    gate: "No route gets worse",
    outcome:
      "Every metric arm made at least one route worse. Hiding or withholding the font to fake a zero shift was refused.",
    folder: "font-fallback-metrics",
  },
];

export interface LabUpstreamItem {
  item: string;
  layer: string;
  role: string;
  status: string;
  href?: string;
}

/** Roles are exact: an original finding is not the same as validating someone else's fix. */
export const labUpstream: LabUpstreamItem[] = [
  {
    item: "Prefetch scheduler loses sibling tasks",
    layer: "Next.js",
    role: "Reproduced and validated the existing fix (issue #96965, PR #97377) red/green with webpack and Turbopack",
    status: "Unsubmitted review note",
    href: `${experimentsBaseUrl}/next-prefetch-sibling-starvation`,
  },
  {
    item: "Route Handler responses skip compression",
    layer: "Next.js",
    role: "Validated the existing fix (issue #98007, PR #98044) on real content",
    status: "Unsubmitted comment",
    href: `${upstreamDraftsUrl}/next-route-handler-compression-validation.md`,
  },
  {
    item: "Image sizes parser misses calc() and decimals",
    layer: "Next.js",
    role: "Original finding and patch",
    status: "Unsubmitted, not yet run in the Next.js monorepo",
    href: `${experimentsBaseUrl}/next-image-sizes-parser`,
  },
  {
    item: "Image preload cannot carry a media query",
    layer: "Next.js",
    role: "Original patch for a long-requested gap (discussions #25171, #29621, #71393)",
    status: "Unsubmitted",
    href: `${experimentsBaseUrl}/next-image-preload-media`,
  },
  {
    item: "Webpack ships all module polyfills",
    layer: "Next.js",
    role: "Webpack parity evidence for issue #86785 / PR #88551",
    status: "Unsubmitted comment",
    href: `${upstreamDraftsUrl}/next-webpack-selective-module-polyfills-comment.md`,
  },
  {
    item: "Inline CSS duplicated into every RSC payload",
    layer: "Next.js",
    role: "Independent evidence for existing issue #95141 (+836 MB build output)",
    status: "Not posted",
    href: `${experimentsBaseUrl}/next-inline-css-growth`,
  },
  {
    item: "Forced reflow blamed on the wrong thread",
    layer: "Chrome DevTools",
    role: "Original finding, patch and test",
    status: "Unsubmitted, not yet run in a DevTools checkout",
    href: `${upstreamDraftsUrl}/chrome-devtools-forced-reflow-thread-attribution-pr.md`,
  },
  {
    item: "Umami script cannot load after the page",
    layer: "Pliny",
    role: "Original finding and patch",
    status: "Unsubmitted",
    href: `${upstreamDraftsUrl}/pliny-umami-script-strategy-pr.md`,
  },
];
