/**
 * Source-level performance invariant audit.
 *
 * This deliberately checks only facts that can be proved from the repository.
 * Browser timings, CDN behavior, and field Core Web Vitals belong in their own
 * measured audits and must not be represented by unconditional checkmarks here.
 */

const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const read = (relativePath) => readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const layout = read("app/layout.tsx");
const rootDocument = read("app/root-document.tsx");
const siteLayout = read("app/(site)/layout.tsx");
const tailwindCss = read("css/tailwind.css");
const prismCss = read("css/prism.css");
const nextConfig = read("next.config.js");
const mdxComponents = read("components/MDXComponents.tsx");
const codePlayground = read("components/CodePlayground.tsx");
const fullEditor = read("components/FullEditor.tsx");
const footer = read("components/Footer.tsx");
const footerNavigation = read("components/FooterNavigation.tsx");
const deferredNewsletter = read("components/DeferredNewsletterForm.tsx");
const sharedLink = read("components/Link.tsx");
const intentLink = read("components/IntentLink.tsx");
const navigationIntentLink = read("components/NavigationIntentLink.tsx");
const writingIndexIntentLink = read("components/WritingIndexIntentLink.tsx");
const writingIndex = read("app/(site)/blog/page.tsx");
const header = read("components/Header.tsx");
const tag = read("components/Tag.tsx");
const authorLayout = read("layouts/AuthorLayout.tsx");
const contactForm = read("components/ContactForm.tsx");
const tailwindConfig = read("tailwind.config.cjs");
const bufReaderArticle = read("data/blog/BufReader-rust.mdx");
const contentlayerConfig = read("contentlayer.config.ts");
const headingNormalizer = read("lib/remark-normalize-heading-order.mjs");
const searchDocument = read("lib/search-document.mjs");
const searchDocumentsLoader = read("lib/search-documents-loader.mjs");
const searchDocumentsQuery = read("lib/search-documents-query.mjs");
const activeSearch = read("components/search/ActiveSearch.tsx");
const searchButton = read("components/SearchButton.tsx");
const dockerfile = read("Dockerfile");
const packageJson = JSON.parse(read("package.json"));
const blogHeadingAudit = spawnSync(
  process.execPath,
  [path.join(repositoryRoot, "scripts/audit-blog-heading-order.mjs"), "--quiet"],
  { cwd: repositoryRoot, encoding: "utf8" }
);

const uiSource = ["app", "components", "layouts"]
  .flatMap((directory) => {
    const files = [];
    const visit = (relativeDirectory) => {
      for (const entry of readdirSync(path.join(repositoryRoot, relativeDirectory), {
        withFileTypes: true,
      })) {
        const relativePath = path.join(relativeDirectory, entry.name);
        if (entry.isDirectory()) visit(relativePath);
        else if (/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) files.push(read(relativePath));
      }
    };
    visit(directory);
    return files;
  })
  .join("\n");

const checks = [
  {
    name: "Local Space Grotesk uses swap, preload, and system fallbacks",
    pass:
      rootDocument.includes('from "next/font/local"') &&
      rootDocument.includes('display: "swap"') &&
      rootDocument.includes("preload: true") &&
      rootDocument.includes('fallback: ["system-ui", "arial"]'),
  },
  {
    name: "Search state is owned by the header-local trigger",
    pass:
      header.includes('import SearchButton from "./SearchButton"') &&
      header.includes("<SearchButton />") &&
      searchButton.includes('import ActiveSearch from "@/components/search/ActiveSearch"') &&
      searchButton.includes('import { createPortal } from "react-dom"') &&
      searchButton.includes("createPortal(<ActiveSearch key={requestId} />, document.body)") &&
      !siteLayout.includes("DeferredSearchProvider") &&
      !searchButton.includes("createContext") &&
      !searchButton.includes("useContext"),
  },
  {
    name: "The measured header remains one client boundary",
    pass:
      header.startsWith('"use client";') &&
      header.includes('import { usePathname } from "next/navigation"') &&
      header.includes("const pathname = usePathname()") &&
      header.includes('import NavigationIntentLink from "./NavigationIntentLink"') &&
      header.includes("<SearchButton />") &&
      header.includes("<MobileNav />") &&
      !header.includes("DesktopNavigation") &&
      !existsSync(path.join(repositoryRoot, "components/DesktopNavigation.tsx")),
  },
  {
    name: "Umami is optional and scheduled with lazyOnload",
    pass:
      rootDocument.includes("umami?.umamiWebsiteId ?") &&
      rootDocument.includes('strategy="lazyOnload"'),
  },
  {
    name: "The root layout contains no route-independent preconnect or DNS-prefetch hints",
    pass:
      !rootDocument.includes('rel="preconnect"') && !rootDocument.includes('rel="dns-prefetch"'),
  },
  {
    name: "DocSearch CSS is absent from global stylesheet entry points",
    pass:
      !layout.includes("@docsearch/css") &&
      !rootDocument.includes("@docsearch/css") &&
      !tailwindCss.includes("@docsearch/css"),
  },
  {
    name: "Tailwind automatic discovery cannot scan research or previous build outputs",
    pass: /@import\s+["']tailwindcss["']\s+source\(none\)/.test(tailwindCss),
  },
  {
    name: "No dead Web Vitals client or dependency is shipped",
    pass:
      !existsSync(path.join(repositoryRoot, "components/WebVitals.tsx")) &&
      !packageJson.dependencies?.["web-vitals"] &&
      !packageJson.devDependencies?.["web-vitals"],
  },
  {
    name: "Next.js owns chunk splitting; no global splitChunks override remains",
    pass: !nextConfig.includes("splitChunks"),
  },
  {
    name: "Next.js response compression and ETags are enabled",
    pass: nextConfig.includes("compress: true") && nextConfig.includes("generateEtags: true"),
  },
  {
    name: "Package import optimization remains scoped to named libraries",
    pass: nextConfig.includes('optimizePackageImports: ["react-icons", "lucide-react"]'),
  },
  {
    name: "Modern image formats and the image cache TTL remain configured",
    pass:
      nextConfig.includes('formats: ["image/webp", "image/avif"]') &&
      nextConfig.includes("minimumCacheTTL: 31536000"),
  },
  {
    name: "Static assets and fonts retain immutable one-year cache headers",
    pass:
      nextConfig.includes('source: "/static/(.*)"') &&
      nextConfig.includes('source: "/(.*).woff2"') &&
      nextConfig.includes('value: "public, max-age=31536000, immutable"'),
  },
  {
    name: "Production builds enforce the Flight chunk-list regression budget",
    pass:
      existsSync(path.join(repositoryRoot, "scripts/analyze-flight-chunk-lists.mjs")) &&
      packageJson.scripts?.build?.includes("performance:flight:build") &&
      packageJson.scripts?.["performance:flight:build"]?.includes("--max-repeated-share=0.02") &&
      packageJson.scripts?.["performance:flight:build"]?.includes("--max-repeated-bytes=10000") &&
      packageJson.scripts?.["performance:flight:build"]?.includes("--min-reference-rows=1"),
  },
  {
    name: "The reviewed runtime stack is pinned across framework, React, Node, and Yarn",
    pass:
      packageJson.dependencies?.next === "16.3.4" &&
      packageJson.dependencies?.react === "19.2.8" &&
      packageJson.dependencies?.["react-dom"] === "19.2.8" &&
      packageJson.packageManager === "yarn@4.18.0" &&
      packageJson.engines?.node === ">=24.20.0" &&
      dockerfile.includes("FROM node:24.20.0-alpine"),
  },
  {
    name: "Production content is generated with preview filtering enabled",
    pass:
      packageJson.scripts?.build?.includes("NODE_ENV=production") &&
      packageJson.scripts?.build?.includes("contentlayer2 build") &&
      !nextConfig.includes("withContentlayer"),
  },
  {
    name: "Webpack remains the measured Next.js 16 production bridge",
    pass: packageJson.scripts?.build?.includes("next build --webpack"),
  },
  {
    name: "The playground and Prism stay off ordinary MDX article startup paths",
    pass:
      mdxComponents.includes('from "./ClientOnlyCodePlayground"') &&
      !mdxComponents.includes('from "./CodePlayground"') &&
      codePlayground.includes("Prism.manual = true"),
  },
  {
    name: "Shared internal links prefetch on intent instead of viewport entry",
    pass:
      sharedLink.includes('import IntentLink from "./IntentLink"') &&
      sharedLink.includes("<IntentLink") &&
      intentLink.includes('import Link from "next/link"') &&
      intentLink.includes("prefetch={false}") &&
      intentLink.includes("router.prefetch(href)"),
  },
  {
    name: "Monaco uses the installed ESM build and same-origin workers",
    pass:
      fullEditor.includes('import * as monaco from "monaco-editor"') &&
      fullEditor.includes("loader.config({ monaco })") &&
      fullEditor.includes('new URL("monaco-editor/language/typescript/ts.worker.js"') &&
      fullEditor.includes('new URL("monaco-editor/editor/editor.worker.js"') &&
      nextConfig.includes("worker-src 'self' blob:") &&
      !nextConfig.includes("cdn.jsdelivr.net"),
  },
  {
    name: "The global newsletter form loads only near the footer",
    pass:
      footer.includes('import DeferredNewsletterForm from "./DeferredNewsletterForm"') &&
      !footer.includes('from "next/dynamic"') &&
      deferredNewsletter.includes(
        'dynamic(() => import("pliny/ui/NewsletterForm"), { ssr: false })'
      ) &&
      deferredNewsletter.includes("IntersectionObserver") &&
      deferredNewsletter.includes('rootMargin: "300px 0px"') &&
      deferredNewsletter.includes("min-h-44") &&
      deferredNewsletter.includes("[&_button]:bg-primary-700") &&
      deferredNewsletter.includes("[&_button:hover]:bg-primary-800"),
  },
  {
    name: "Primary foreground and filled-control roles meet the measured contrast floor",
    pass:
      !uiSource.includes("text-primary-500") &&
      !uiSource
        .split("\n")
        .some((line) => line.includes("bg-primary-500") && line.includes("text-white")) &&
      !uiSource.includes("dark:bg-primary-500") &&
      tailwindConfig.includes('color: theme("colors.primary.700")') &&
      tailwindConfig.includes('color: theme("colors.primary.400")') &&
      tag.includes("text-primary-700") &&
      tag.includes("dark:text-primary-400") &&
      authorLayout.includes("bg-primary-700") &&
      contactForm.includes("bg-primary-700") &&
      mdxComponents.includes("[&_button]:bg-primary-700"),
  },
  {
    name: "Known non-primary Lighthouse accessibility regressions stay fixed",
    pass:
      prismCss.includes("color: rgb(148, 163, 163)") &&
      !prismCss.includes("color: rgb(99, 119, 119)") &&
      codePlayground.includes("color:#94a3a3") &&
      tailwindConfig.includes('color: theme("colors.indigo.400")') &&
      tag.includes("min-h-6 min-w-6") &&
      authorLayout.includes('<h2 className="pt-4 pb-2') &&
      !authorLayout.includes('<h3 className="pt-4 pb-2') &&
      bufReaderArticle.includes("## Why Buffering Matters in I/O") &&
      bufReaderArticle.includes("### The Problem with Small Reads") &&
      !bufReaderArticle.includes("### Why Buffering Matters in I/O"),
  },
  {
    name: "Compiled blog headings cannot skip ranks beneath the page title",
    pass:
      blogHeadingAudit.status === 0 &&
      headingNormalizer.includes("normalizeHeadingOrder") &&
      contentlayerConfig.includes(
        'import remarkNormalizeHeadingOrder from "./lib/remark-normalize-heading-order.mjs"'
      ) &&
      contentlayerConfig.includes("remarkNormalizeHeadingOrder,") &&
      contentlayerConfig.includes("extractNormalizedTocHeadings") &&
      packageJson.scripts?.["content:audit-headings"] ===
        "node scripts/audit-blog-heading-order.mjs" &&
      packageJson.scripts?.prebuild?.includes("node scripts/audit-blog-heading-order.mjs"),
  },
  {
    name: "Footer links share one delegated intent-prefetch client boundary",
    pass:
      footer.includes('import FooterNavigation from "./FooterNavigation"') &&
      footer.includes("<FooterNavigation />") &&
      !footer.includes("NavigationIntentLink") &&
      footerNavigation.startsWith('"use client";') &&
      (footerNavigation.match(/usePathname\(\)/g) || []).length === 1 &&
      (footerNavigation.match(/useRouter\(\)/g) || []).length === 1 &&
      footerNavigation.includes("useRef(new Set<string>())") &&
      footerNavigation.includes(
        'target.closest<HTMLAnchorElement>("a[data-prefetch-on-intent]")'
      ) &&
      footerNavigation.includes("onMouseOver: prefetchFromIntent") &&
      footerNavigation.includes("onFocus: prefetchFromIntent") &&
      footerNavigation.includes("onTouchStart: prefetchFromIntent") &&
      footerNavigation.includes("router.prefetch(href)") &&
      (footerNavigation.match(/prefetch=\{false\}/g) || []).length === 2,
  },
  {
    name: "Route-specific chrome and writing links stay out of unrelated client chunks",
    pass:
      existsSync(path.join(repositoryRoot, "app/editor/page.tsx")) &&
      !existsSync(path.join(repositoryRoot, "app/(site)/editor/page.tsx")) &&
      !layout.includes("<Header") &&
      !layout.includes("<Footer") &&
      !layout.includes("<DeferredSearchProvider") &&
      siteLayout.includes("<Header") &&
      siteLayout.includes("<Footer") &&
      !siteLayout.includes("<DeferredSearchProvider") &&
      header.includes('import NavigationIntentLink from "./NavigationIntentLink"') &&
      footer.includes('import FooterNavigation from "./FooterNavigation"') &&
      navigationIntentLink.includes("prefetch={false}") &&
      navigationIntentLink.includes("router.prefetch(href)") &&
      writingIndex.includes('from "@/components/WritingIndexIntentLink"') &&
      !writingIndex.includes('from "@/components/Link"') &&
      !writingIndex.includes('from "@/components/Tag"') &&
      writingIndexIntentLink.includes("prefetch={false}") &&
      writingIndexIntentLink.includes("router.prefetch(href)"),
  },
  {
    name: "The deferred search payload contains only its four runtime fields",
    pass:
      contentlayerConfig.includes(".map(toSearchDocument)") &&
      searchDocument.includes('["path", "title", "summary", "date"]') &&
      searchDocument.includes("path: document.path") &&
      searchDocument.includes("title: document.title") &&
      searchDocument.includes("summary: document.summary") &&
      searchDocument.includes("date: document.date") &&
      !searchDocument.includes("structuredData") &&
      !searchDocument.includes("reviewedHash") &&
      !searchDocument.includes("toc:"),
  },
  {
    name: "The small search shell is eager while one bounded data path stays intent-only",
    pass:
      searchButton.includes('import ActiveSearch from "@/components/search/ActiveSearch"') &&
      !searchButton.includes("next/dynamic") &&
      !searchButton.includes("loadActiveSearch") &&
      searchButton.includes("Promise.allSettled([loadSearchDocuments()])") &&
      searchButton.includes("createPortal(<ActiveSearch key={requestId} />, document.body)") &&
      !searchButton.includes("requestIdleCallback") &&
      searchDocumentsLoader.includes("let documentsPromise") &&
      searchDocumentsLoader.includes("return documentsPromise") &&
      searchDocumentsLoader.includes("documentsPromise = undefined") &&
      searchDocumentsQuery.includes("maximumVisibleSearchResults = 10") &&
      activeSearch.includes("findSearchDocuments") &&
      activeSearch.includes("loadSearchDocuments()") &&
      !activeSearch.includes('from "kbar"') &&
      !activeSearch.includes("pliny/search") &&
      searchButton.includes("onFocus={prepareSearch}") &&
      searchButton.includes("onPointerEnter={prepareSearch}") &&
      searchButton.includes("onTouchStart={prepareSearch}"),
  },
];

console.log("Performance source-invariant audit\n");

let failures = 0;
for (const check of checks) {
  if (check.pass) {
    console.log(`PASS ${check.name}`);
  } else {
    failures += 1;
    console.error(`FAIL ${check.name}`);
  }
}

console.log(`\n${checks.length - failures}/${checks.length} source invariants passed.`);
console.log(
  "Not asserted here: browser timings, Lighthouse, field Web Vitals, or CDN cache status."
);

if (failures > 0) {
  process.exitCode = 1;
}
