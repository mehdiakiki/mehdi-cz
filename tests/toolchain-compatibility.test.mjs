import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { searchDocumentKeys, toSearchDocument } from "../lib/search-document.mjs";
import { createSearchDocumentsLoader } from "../lib/search-documents-loader.mjs";
import {
  findSearchDocuments,
  maximumVisibleSearchResults,
} from "../lib/search-documents-query.mjs";
import { remarkPromoteFirstContentImage } from "../lib/remark-promote-first-content-image.mjs";

const mdxComponentsPath = new URL("../components/MDXComponents.tsx", import.meta.url);
const codePlaygroundPath = new URL("../components/CodePlayground.tsx", import.meta.url);
const sharedLinkPath = new URL("../components/Link.tsx", import.meta.url);
const intentLinkPath = new URL("../components/IntentLink.tsx", import.meta.url);
const fullEditorPath = new URL("../components/FullEditor.tsx", import.meta.url);
const nextConfigPath = new URL("../next.config.js", import.meta.url);
const footerPath = new URL("../components/Footer.tsx", import.meta.url);
const footerNavigationPath = new URL("../components/FooterNavigation.tsx", import.meta.url);
const deferredNewsletterPath = new URL("../components/DeferredNewsletterForm.tsx", import.meta.url);
const rootLayoutPath = new URL("../app/layout.tsx", import.meta.url);
const siteLayoutPath = new URL("../app/(site)/layout.tsx", import.meta.url);
const editorPagePath = new URL("../app/editor/page.tsx", import.meta.url);
const navigationIntentLinkPath = new URL("../components/NavigationIntentLink.tsx", import.meta.url);
const tagPath = new URL("../components/Tag.tsx", import.meta.url);
const writingIndexIntentLinkPath = new URL(
  "../components/WritingIndexIntentLink.tsx",
  import.meta.url
);
const writingIndexPath = new URL("../app/(site)/blog/page.tsx", import.meta.url);
const activeSearchPath = new URL("../components/search/ActiveSearch.tsx", import.meta.url);
const searchButtonPath = new URL("../components/SearchButton.tsx", import.meta.url);
const headerPath = new URL("../components/Header.tsx", import.meta.url);
const imageComponentPath = new URL("../components/Image.tsx", import.meta.url);
const contentlayerConfigPath = new URL("../contentlayer.config.ts", import.meta.url);
const mdxImagePath = new URL("../components/MDXComponents.tsx", import.meta.url);
const authorLayoutPath = new URL("../layouts/AuthorLayout.tsx", import.meta.url);
const postLayoutPath = new URL("../layouts/PostLayout.tsx", import.meta.url);
const postBannerPath = new URL("../layouts/PostBanner.tsx", import.meta.url);
const mainCardPath = new URL("../components/MainCard.tsx", import.meta.url);
const workCardPath = new URL("../components/WorkCard.tsx", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);
const nextPackagePath = new URL("../node_modules/next/package.json", import.meta.url);
const nextModulePolyfillsPath = new URL(
  "../node_modules/next/dist/build/polyfills/polyfill-module.js",
  import.meta.url
);
const supportedBrowserPolyfillsPath = new URL(
  "../lib/next-supported-browser-polyfills.js",
  import.meta.url
);

test("webpack ships only the polyfill required by Next's supported browsers", async () => {
  const [nextConfig, projectPackage, nextPackage, upstreamPolyfills, replacementPolyfills] =
    await Promise.all([
      readFile(nextConfigPath, "utf8"),
      readFile(packagePath, "utf8").then(JSON.parse),
      readFile(nextPackagePath, "utf8").then(JSON.parse),
      readFile(nextModulePolyfillsPath, "utf8"),
      readFile(supportedBrowserPolyfillsPath, "utf8"),
    ]);

  assert.equal(projectPackage.browserslist, undefined);
  assert.equal(nextPackage.version, projectPackage.dependencies.next);
  assert.equal(
    createHash("sha256").update(upstreamPolyfills).digest("hex"),
    "94c8008b70e41ac5b0360fd6f35ea7a59c20c6927aca7731ef8c6a3c26b9cddf",
    "review the replacement whenever Next changes its internal polyfill contract"
  );
  assert.match(nextConfig, /applyNextSupportedBrowserPolyfills\(config, webpack\)/);
  assert.match(nextConfig, /if \(!isServer\)/);
  assert.match(replacementPolyfills, /if \(!\(["']canParse["'] in URL\)\)/);
  assert.doesNotMatch(
    replacementPolyfills,
    /trimStart|trimEnd|Symbol\.prototype|Array\.prototype|Promise\.prototype|fromEntries|hasOwn/
  );

  const NativeURL = URL;
  const context = {
    Boolean,
    URL: class {
      constructor(url, base) {
        return new NativeURL(url, base);
      }
    },
  };
  runInNewContext(replacementPolyfills, context);
  assert.equal(context.URL.canParse("https://example.com/path"), true);
  assert.equal(context.URL.canParse("/path", "https://example.com"), true);
  assert.equal(context.URL.canParse("http://["), false);
});

test("Pliny subpaths resolve to real modules with modern package exports", async () => {
  const specifiers = [
    "pliny/comments",
    "pliny/mdx-components",
    "pliny/newsletter",
    "pliny/search/KBar",
    "pliny/ui/Pre",
    "pliny/utils/contentlayer",
    "pliny/utils/contentlayer.js",
  ];

  for (const specifier of specifiers) {
    const resolved = import.meta.resolve(specifier);
    assert.match(resolved, /node_modules\/pliny\/.+\.js$/);
    await access(new URL(resolved));
  }
});

test("Prism cannot rewrite server-highlighted MDX before hydration", async () => {
  const [mdxComponents, codePlayground] = await Promise.all([
    readFile(mdxComponentsPath, "utf8"),
    readFile(codePlaygroundPath, "utf8"),
  ]);

  assert.match(mdxComponents, /from "\.\/ClientOnlyCodePlayground"/);
  assert.doesNotMatch(mdxComponents, /from "\.\/CodePlayground"/);
  assert.match(codePlayground, /Prism\.manual = true/);
});

test("fixed avatars use Next Image's compact candidate path without preload", async () => {
  const [authorLayout, postLayout] = await Promise.all([
    readFile(authorLayoutPath, "utf8"),
    readFile(postLayoutPath, "utf8"),
  ]);
  const authorImage = authorLayout.match(/<Image[\s\S]*?\/>/)?.[0] || "";
  const postImage = postLayout.match(/<Image[\s\S]*?\/>/)?.[0] || "";

  assert.match(postLayout, /width=\{38\}[\s\S]*height=\{38\}/);
  assert.match(postImage, /className="h-10 w-10 rounded-full"/);
  assert.doesNotMatch(postImage, /blur=|placeholder=|sizes=|priority=|preload=/);
  assert.match(authorImage, /width=\{192\}[\s\S]*height=\{192\}/);
  assert.match(authorImage, /blur=\{true\}/);
  assert.doesNotMatch(authorImage, /sizes=|priority=|preload=/);
});

test("image sizing and loading intent stay explicit at every responsive call site", async () => {
  const [imageComponent, mdxImage, postBanner, mainCard, workCard, nextConfig] = await Promise.all([
    readFile(imageComponentPath, "utf8"),
    readFile(mdxImagePath, "utf8"),
    readFile(postBannerPath, "utf8"),
    readFile(mainCardPath, "utf8"),
    readFile(workCardPath, "utf8"),
    readFile(nextConfigPath, "utf8"),
  ]);

  assert.doesNotMatch(imageComponent, /const responsiveSizes|33vw/);
  assert.match(imageComponent, /"preload" \| "priority"/);
  assert.match(
    imageComponent,
    /blur \? providedBlurDataURL \|\| getBlurDataURL\(sourcePath\) : undefined/
  );
  assert.match(imageComponent, /preload \? \{ preload: true \} : \{ loading \}/);
  assert.match(imageComponent, /sizes \? \{ sizes \} : \{\}/);
  assert.match(imageComponent, /getImageProps\(imageProps\)/);
  assert.match(imageComponent, /preloadResource\(props\.src/);
  assert.match(imageComponent, /imageSrcSet: props\.srcSet/);
  assert.match(imageComponent, /imageSizes: props\.sizes/);
  assert.match(imageComponent, /media: preloadMedia/);
  assert.match(
    mdxImage,
    /sizes="\(max-width: 639px\) calc\( 100vw - 2rem\), \(max-width: 1279px\) min\(calc\( 100vw - 3rem\), 720px\), 762px"/
  );
  assert.match(mdxImage, /blur=\{true\}/);
  assert.match(postBanner, /preload=\{true\}/);
  assert.doesNotMatch(postBanner, /priority=\{/);
  assert.match(postBanner, /calc\( 100vw \+ 1rem\)/);
  assert.match(mainCard, /sizes="\(max-width: 1119px\) calc\( 100vw - 2rem\), 1088px"/);
  assert.match(
    workCard,
    /sizes="\(max-width: 767px\) calc\( 100vw - 2rem\), \(max-width: 1151px\) calc\( 50vw - 2rem\), 512px"/
  );
  assert.match(nextConfig, /deviceSizes: \[384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840\]/);
  assert.match(nextConfig, /imageSizes: \[32, 48, 64, 96, 128, 192, 256\]/);
});

test("only the first MDX content image receives native viewport-gated priority", () => {
  const image = (attributes = []) => ({
    type: "mdxJsxFlowElement",
    name: "Image",
    attributes,
    children: [],
  });
  const first = image([
    { type: "mdxJsxAttribute", name: "loading", value: "eager" },
    { type: "mdxJsxAttribute", name: "fetchPriority", value: "low" },
  ]);
  const second = image();
  const tree = { type: "root", children: [first, second] };

  remarkPromoteFirstContentImage()(tree);

  assert.deepEqual(
    first.attributes.map(({ name, value }) => [name, value]),
    [
      ["loading", "lazy"],
      ["fetchPriority", "high"],
    ]
  );
  assert.deepEqual(second.attributes, []);
});

test("responsive preload is opt-in by measured first-image source", () => {
  const media = "(min-width: 1280px) and (min-height: 640px)";
  const target = {
    type: "mdxJsxFlowElement",
    name: "Image",
    attributes: [
      {
        type: "mdxJsxAttribute",
        name: "src",
        value: "/static/images/measured-diagram.webp",
      },
    ],
    children: [],
  };
  const later = {
    type: "mdxJsxFlowElement",
    name: "Image",
    attributes: [{ type: "mdxJsxAttribute", name: "src", value: "/static/images/later.webp" }],
    children: [],
  };
  const tree = { type: "root", children: [target, later] };

  remarkPromoteFirstContentImage({
    preloadMediaBySrc: { "/static/images/measured-diagram.webp": media },
  })(tree);

  assert.deepEqual(
    target.attributes.map(({ name, value }) => [name, value]),
    [
      ["src", "/static/images/measured-diagram.webp"],
      ["loading", "lazy"],
      ["fetchPriority", "high"],
      ["preloadMedia", media],
    ]
  );
  assert.deepEqual(later.attributes, [
    { type: "mdxJsxAttribute", name: "src", value: "/static/images/later.webp" },
  ]);
});

test("PERF-043 retains the exact responsive preload instead of DPR-pruned candidates", async () => {
  const [imageComponent, contentlayerConfig, nextConfig] = await Promise.all([
    readFile(imageComponentPath, "utf8"),
    readFile(contentlayerConfigPath, "utf8"),
    readFile(nextConfigPath, "utf8"),
  ]);

  assert.match(imageComponent, /imageSrcSet: props\.srcSet/);
  assert.match(imageComponent, /imageSizes: props\.sizes/);
  for (const source of [imageComponent, contentlayerConfig, nextConfig]) {
    assert.doesNotMatch(
      source,
      /PERF043_PRELOAD_VARIANT|PERF043_BUILD_ID|filterPreloadSrcSet|dpr-1-2/
    );
  }
});

test("content links defer route prefetch until visitor intent", async () => {
  const [sharedLink, intentLink] = await Promise.all([
    readFile(sharedLinkPath, "utf8"),
    readFile(intentLinkPath, "utf8"),
  ]);

  assert.match(sharedLink, /import IntentLink from "\.\/IntentLink"/);
  assert.match(sharedLink, /<IntentLink/);
  assert.match(sharedLink, /<a className="break-words"/);
  assert.match(intentLink, /import Link from "next\/link"/);
  assert.match(intentLink, /prefetch=\{false\}/);
  assert.match(intentLink, /router\.prefetch\(href\)/);
});

test("article tag links defer dynamic-route prefetch until visitor intent", async () => {
  const tag = await readFile(tagPath, "utf8");

  assert.match(tag, /import IntentLink from "\.\/IntentLink"/);
  assert.match(tag, /<IntentLink/);
  assert.match(tag, /href=\{`\/blog\/tags\/\$\{slug\(text\)\}\/page\/1`\}/);
  assert.doesNotMatch(tag, /from "next\/link"/);
});

test("Monaco stays on the installed version and same-origin workers", async () => {
  const [fullEditor, nextConfig] = await Promise.all([
    readFile(fullEditorPath, "utf8"),
    readFile(nextConfigPath, "utf8"),
  ]);

  assert.match(fullEditor, /import \* as monaco from "monaco-editor"/);
  assert.match(fullEditor, /loader\.config\(\{ monaco \}\)/);
  assert.match(fullEditor, /monaco-editor\/language\/typescript\/ts\.worker\.js/);
  assert.match(fullEditor, /monaco-editor\/editor\/editor\.worker\.js/);
  assert.match(nextConfig, /worker-src 'self' blob:/);
  assert.doesNotMatch(nextConfig, /cdn\.jsdelivr\.net/);
});

test("the global newsletter form waits until the footer is near", async () => {
  const [footer, deferredNewsletter] = await Promise.all([
    readFile(footerPath, "utf8"),
    readFile(deferredNewsletterPath, "utf8"),
  ]);

  assert.match(footer, /import DeferredNewsletterForm from "\.\/DeferredNewsletterForm"/);
  assert.doesNotMatch(footer, /from "next\/dynamic"/);
  assert.match(deferredNewsletter, /import\("pliny\/ui\/NewsletterForm"\)/);
  assert.match(deferredNewsletter, /ssr: false/);
  assert.match(deferredNewsletter, /new IntersectionObserver/);
  assert.match(deferredNewsletter, /rootMargin: "300px 0px"/);
  assert.match(deferredNewsletter, /min-h-44 sm:min-h-20/);
});

test("footer links share one delegated intent-prefetch client boundary", async () => {
  const [footer, footerNavigation] = await Promise.all([
    readFile(footerPath, "utf8"),
    readFile(footerNavigationPath, "utf8"),
  ]);

  assert.match(footer, /import FooterNavigation from "\.\/FooterNavigation"/);
  assert.match(footer, /<FooterNavigation \/>/);
  assert.doesNotMatch(footer, /NavigationIntentLink/);
  assert.match(footerNavigation, /^"use client";/);
  assert.equal((footerNavigation.match(/usePathname\(\)/g) ?? []).length, 1);
  assert.equal((footerNavigation.match(/useRouter\(\)/g) ?? []).length, 1);
  assert.match(footerNavigation, /useRef\(new Set<string>\(\)\)/);
  assert.match(footerNavigation, /target\.closest<HTMLAnchorElement>/);
  assert.match(footerNavigation, /onMouseOver: prefetchFromIntent/);
  assert.match(footerNavigation, /onFocus: prefetchFromIntent/);
  assert.match(footerNavigation, /onTouchStart: prefetchFromIntent/);
  assert.match(footerNavigation, /router\.prefetch\(href\)/);
  assert.equal((footerNavigation.match(/prefetch=\{false\}/g) ?? []).length, 2);
  assert.equal((footerNavigation.match(/\{ href: "\//g) ?? []).length, 7);
});

test("route-specific client boundaries do not leak site chrome or article chunks", async () => {
  const [rootLayout, siteLayout, navigationIntentLink, writingIndexIntentLink, writingIndex] =
    await Promise.all([
      readFile(rootLayoutPath, "utf8"),
      readFile(siteLayoutPath, "utf8"),
      readFile(navigationIntentLinkPath, "utf8"),
      readFile(writingIndexIntentLinkPath, "utf8"),
      readFile(writingIndexPath, "utf8"),
      access(editorPagePath),
    ]);

  assert.doesNotMatch(rootLayout, /<Header|<Footer|<DeferredSearchProvider/);
  assert.match(siteLayout, /<Header/);
  assert.match(siteLayout, /<Footer/);
  assert.doesNotMatch(siteLayout, /DeferredSearchProvider/);
  assert.match(navigationIntentLink, /prefetch=\{false\}/);
  assert.match(navigationIntentLink, /router\.prefetch\(href\)/);
  assert.match(writingIndex, /@\/components\/WritingIndexIntentLink/);
  assert.doesNotMatch(writingIndex, /@\/components\/Link|@\/components\/Tag/);
  assert.match(writingIndexIntentLink, /prefetch=\{false\}/);
  assert.match(writingIndexIntentLink, /router\.prefetch\(href\)/);
});

test("the measured header stays one client boundary while its behavior spans the shell", async () => {
  const header = await readFile(headerPath, "utf8");

  assert.match(header, /^"use client";/);
  assert.match(header, /import \{ usePathname \} from "next\/navigation"/);
  assert.match(header, /const pathname = usePathname\(\)/);
  assert.match(header, /import NavigationIntentLink from "\.\/NavigationIntentLink"/);
  assert.match(header, /<SearchButton \/>/);
  assert.match(header, /<MobileNav \/>/);
  assert.doesNotMatch(header, /DesktopNavigation/);
});

test("search documents expose only the runtime fields consumed in the browser", async () => {
  const source = {
    path: "blog/example",
    title: "Example",
    summary: "Searchable summary",
    date: "2026-09-08T00:00:00.000Z",
    toc: [{ value: "Authoring detail" }],
    structuredData: { body: "Large generated representation" },
    reviewedHash: "build-only",
  };

  assert.deepEqual(toSearchDocument(source), {
    path: source.path,
    title: source.title,
    summary: source.summary,
    date: source.date,
  });
  assert.deepEqual(Object.keys(toSearchDocument(source)), searchDocumentKeys);

  const generatedDocuments = JSON.parse(
    await readFile(new URL("../public/search.json", import.meta.url), "utf8")
  );
  assert.ok(generatedDocuments.length > 0);
  for (const document of generatedDocuments) {
    assert.deepEqual(Object.keys(document), searchDocumentKeys);
  }
});

test("search document loading shares one request and retries after a failure", async () => {
  let successfulFetches = 0;
  const loadDocuments = createSearchDocumentsLoader("/search.json", async () => {
    successfulFetches += 1;
    return {
      ok: true,
      json: async () => [{ path: "blog/example" }],
    };
  });

  const firstLoad = loadDocuments();
  const concurrentLoad = loadDocuments();
  assert.strictEqual(firstLoad, concurrentLoad);
  assert.deepEqual(await firstLoad, [{ path: "blog/example" }]);
  assert.deepEqual(await loadDocuments(), [{ path: "blog/example" }]);
  assert.equal(successfulFetches, 1);

  let attempts = 0;
  const loadWithRetry = createSearchDocumentsLoader("/search.json", async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error("temporary network failure");
    }
    return { ok: true, json: async () => [] };
  });

  await assert.rejects(loadWithRetry(), /temporary network failure/);
  assert.deepEqual(await loadWithRetry(), []);
  assert.equal(attempts, 2);
});

test("search relevance is query-first and bounds the rendered result set", () => {
  const documents = Array.from({ length: 12 }, (_, index) => ({
    path: `blog/example-${index}`,
    title: index === 4 ? "Allowed Actions" : `Example ${index}`,
    summary: index === 7 ? "A guide to allowed actions in production" : "A general summary",
    date: "2026-09-08T00:00:00.000Z",
  }));

  assert.equal(findSearchDocuments(documents, "").length, maximumVisibleSearchResults);
  assert.deepEqual(
    findSearchDocuments(documents, "allowed actions").map((document) => document.path),
    ["blog/example-4", "blog/example-7"]
  );
  assert.deepEqual(findSearchDocuments(documents, "allowed missing"), []);
});

test("the small search shell ships eagerly while its data stays intent-only", async () => {
  const [activeSearch, searchButton, header] = await Promise.all([
    readFile(activeSearchPath, "utf8"),
    readFile(searchButtonPath, "utf8"),
    readFile(headerPath, "utf8"),
  ]);

  assert.match(header, /import SearchButton from "\.\/SearchButton"/);
  assert.match(header, /<SearchButton \/>/);
  assert.match(searchButton, /import ActiveSearch from "@\/components\/search\/ActiveSearch"/);
  assert.doesNotMatch(searchButton, /next\/dynamic|loadActiveSearch|createContext|useContext/);
  assert.match(searchButton, /Promise\.allSettled\(\[loadSearchDocuments\(\)\]\)/);
  assert.doesNotMatch(searchButton, /useEffect\([^]*loadSearchDocuments\(\)/);
  assert.match(searchButton, /<ActiveSearch key=\{requestId\}/);
  assert.match(searchButton, /createPortal\(<ActiveSearch key=\{requestId\} \/>, document\.body\)/);
  assert.match(activeSearch, /findSearchDocuments/);
  assert.match(activeSearch, /loadSearchDocuments\(\)/);
  assert.doesNotMatch(activeSearch, /from "kbar"|pliny\/search/);
  assert.match(searchButton, /onFocus=\{prepareSearch\}/);
  assert.match(searchButton, /onPointerEnter=\{prepareSearch\}/);
  assert.match(searchButton, /onTouchStart=\{prepareSearch\}/);
});
