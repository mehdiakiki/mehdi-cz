import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { toHtml } from "hast-util-to-html";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(fixtureRoot, "../..");
const generatedRoot = path.join(fixtureRoot, "generated");
const publicRoot = path.join(fixtureRoot, "public");
const publicGeneratedRoot = path.join(publicRoot, "generated");
const hybridCss = fs.readFileSync(path.join(fixtureRoot, "public/hybrid/hybrid.css"), "utf8");

const pageDefinitions = [
  {
    name: "home",
    route: "/",
    source: path.join(repositoryRoot, ".next/server/app/index.html"),
  },
  {
    name: "article",
    route: "/blog/reconciliation-cross-system-sync",
    source: path.join(
      repositoryRoot,
      ".next/server/app/blog/reconciliation-cross-system-sync.html"
    ),
  },
];

for (const page of pageDefinitions) {
  if (!fs.existsSync(page.source)) {
    throw new Error(`Missing ${page.source}. Build the production site first.`);
  }
}

for (const target of [generatedRoot, publicGeneratedRoot, path.join(publicRoot, "static")]) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
}

function findElement(root, predicate) {
  const stack = [...(root.children || [])];
  while (stack.length) {
    const node = stack.shift();
    if (node.type === "element" && predicate(node)) return node;
    if (node.children) stack.unshift(...node.children);
  }
  return undefined;
}

function findParent(root, predicate) {
  const stack = [root];
  while (stack.length) {
    const parent = stack.shift();
    for (const child of parent.children || []) {
      if (child.type === "element" && predicate(child)) return { parent, child };
      if (child.children) stack.push(child);
    }
  }
  return undefined;
}

function walk(node, visit) {
  visit(node);
  for (const child of node.children || []) walk(child, visit);
  if (node.content) walk(node.content, visit);
}

function cloneAndClean(node, section) {
  if (node.type === "comment") return undefined;
  if (node.type !== "element") return { ...node };

  if (node.tagName === "script" && node.properties.type !== "application/ld+json") {
    return undefined;
  }
  if (section === "head" && node.tagName === "link") {
    const rel = node.properties.rel || [];
    if (rel.includes("modulepreload") || node.properties.as === "script") return undefined;
  }

  const children = (node.children || [])
    .map((child) => cloneAndClean(child, section))
    .filter(Boolean);
  if (
    section === "body" &&
    node.tagName === "div" &&
    node.properties.hidden === true &&
    children.length === 0
  ) {
    return undefined;
  }

  return {
    ...node,
    properties: { ...node.properties },
    children,
    ...(node.content ? { content: cloneAndClean(node.content, section) } : {}),
  };
}

function fragment(markup) {
  return fromHtmlIsomorphic(markup, { fragment: true }).children;
}

function classNames(node) {
  const value = node.properties?.className;
  return Array.isArray(value) ? value : typeof value === "string" ? value.split(/\s+/) : [];
}

function hasRel(node, value) {
  return node.properties.rel?.includes(value);
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeContentAddressedAsset(policyDirectory, logicalRelativePath, value) {
  const body = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const parsed = path.posix.parse(logicalRelativePath);
  const digest = sha256(body).slice(0, 12);
  const relative = path.posix.join(parsed.dir, `${parsed.name}.${digest}${parsed.ext}`);
  const destination = path.join(publicGeneratedRoot, policyDirectory, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, body);
  return {
    url: `/generated/${policyDirectory}/${relative}`,
    sha256: sha256(body),
    bytes: body.length,
  };
}

function copyPublicAsset(url) {
  if (!url.startsWith("/static/") && url !== "/site.webmanifest") return;
  const relative = url.slice(1);
  const source = path.join(repositoryRoot, "public", relative);
  if (fs.existsSync(source)) copyFile(source, path.join(publicRoot, relative));
}

function collectPublicUrls(value) {
  if (typeof value !== "string") return;
  for (const token of value.split(/[\s,]+/)) {
    const normalized = token.replace(/&amp;/g, "&");
    if (normalized.startsWith("/static/") || normalized === "/site.webmanifest") {
      copyPublicAsset(normalized);
    }
    if (normalized.startsWith("/_next/image?")) {
      const sourceUrl = new URL(normalized, "http://fixture.local").searchParams.get("url");
      if (sourceUrl) copyPublicAsset(sourceUrl);
    }
  }
}

function rewriteAndCopyDocumentAssets(root) {
  walk(root, (node) => {
    if (node.type !== "element") return;
    for (const value of Object.values(node.properties || {})) {
      if (typeof value === "string") collectPublicUrls(value);
      if (Array.isArray(value)) value.forEach(collectPublicUrls);
    }
    if (
      node.tagName === "link" &&
      hasRel(node, "preload") &&
      node.properties.as === "font" &&
      typeof node.properties.href === "string" &&
      node.properties.href.startsWith("/_next/static/media/")
    ) {
      const filename = node.properties.href.slice("/_next/static/media/".length);
      copyFile(
        path.join(repositoryRoot, ".next/static/media", filename),
        path.join(publicGeneratedRoot, "media", filename)
      );
      node.properties.href = `/generated/media/${filename}`;
    }
  });
}

function cssSource(filename) {
  let css = fs.readFileSync(path.join(repositoryRoot, ".next/static/css", filename), "utf8");
  css = css.replace(/\/_next\/static\/media\/([^)'"?#]+)/g, (_match, mediaName) => {
    copyFile(
      path.join(repositoryRoot, ".next/static/media", mediaName),
      path.join(publicGeneratedRoot, "media", mediaName)
    );
    return `/generated/media/${mediaName}`;
  });
  return css;
}

function textContent(node) {
  const values = [];
  walk(node, (child) => {
    if (child.type === "text") values.push(child.value);
  });
  return values.join(" ").replace(/\s+/g, " ").trim();
}

function enhanceBody(body, page) {
  const firstElement = body.children.find((node) => node.type === "element");
  if (firstElement && !firstElement.properties.id) firstElement.properties.id = "top";

  const searchButton = findElement(
    body,
    (node) => node.tagName === "button" && node.properties.ariaLabel === "Search"
  );
  if (!searchButton) throw new Error(`${page}: missing search button`);
  searchButton.tagName = "a";
  searchButton.properties = {
    ...searchButton.properties,
    href: "/hybrid/search?variant=__PERF030_VARIANT__",
    dataHybridSearch: "",
    dataPrefetchOnIntent: undefined,
  };
  delete searchButton.properties.type;

  const menuButton = findElement(
    body,
    (node) => node.tagName === "button" && node.properties.ariaLabel === "Open menu"
  );
  if (!menuButton) throw new Error(`${page}: missing menu button`);
  menuButton.properties.dataHybridMenuOpen = "";
  menuButton.properties.ariaControls = "hybrid-mobile-menu";

  const commentButton = findParent(
    body,
    (node) => node.tagName === "button" && node.properties.ariaLabel === "Scroll To Comment"
  );
  if (commentButton) {
    commentButton.parent.children = commentButton.parent.children.filter(
      (node) => node !== commentButton.child
    );
  }
  const topButton = findElement(
    body,
    (node) => node.tagName === "button" && node.properties.ariaLabel === "Scroll To Top"
  );
  if (topButton) {
    topButton.tagName = "a";
    topButton.properties.href = "#top";
    topButton.properties.dataHybridScrollTop = "";
    const controls = findParent(body, (node) => node === topButton)?.parent;
    if (controls?.type === "element") {
      controls.properties.dataHybridScrollControls = "";
      controls.properties.dataVisible = "false";
    }
  }

  const newsletter = findElement(
    body,
    (node) => node.tagName === "div" && classNames(node).includes("min-h-44")
  );
  if (!newsletter) throw new Error(`${page}: missing newsletter boundary`);
  newsletter.properties.dataHybridNewsletter = "";
  newsletter.children = fragment(`
    <template>
      <div>
        <div class="hybrid-newsletter-title">Subscribe to the newsletter</div>
        <form class="hybrid-newsletter-form" action="/api/newsletter" method="post">
          <label><span class="sr-only">Email address</span><input autocomplete="email" name="email" placeholder="Enter your email" required type="email"></label>
          <button type="submit">Sign up</button>
          <p class="hybrid-newsletter-status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </template>
    <noscript><p><a href="mailto:hello@mehdi.cz?subject=Newsletter%20subscription">Email me to subscribe</a></p></noscript>
  `);

  const activeHome = page === "home" ? ' aria-current="page"' : "";
  const activeWriting = page === "article" ? ' aria-current="page"' : "";
  body.children.push(
    ...fragment(`
      <dialog id="hybrid-mobile-menu" class="hybrid-menu" data-hybrid-menu aria-label="Site navigation">
        <div class="hybrid-menu__panel">
          <button class="hybrid-menu__close" type="button" data-hybrid-menu-close aria-label="Close menu">✕</button>
          <nav aria-label="Mobile navigation">
            <a href="/hybrid/__PERF030_VARIANT__/home"${activeHome}>Home</a>
            <a href="/work">Work</a><a href="/open-source">Open Source</a>
            <a href="/blog"${activeWriting}>Writing</a><a href="/about">About</a><a href="/contact">Contact</a>
          </nav>
        </div>
      </dialog>
      <dialog class="hybrid-search-dialog" data-hybrid-search-dialog aria-label="Site search">
        <form action="/hybrid/search" method="get">
          <input type="hidden" name="variant" value="__PERF030_VARIANT__">
          <label class="sr-only" for="hybrid-search-input">Search the site</label>
          <input id="hybrid-search-input" type="search" name="q" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="hybrid-search-results" autocomplete="off" placeholder="Type a command or search…">
          <button class="hybrid-search-dialog__close" type="button" data-hybrid-search-close aria-label="Close search">ESC</button>
        </form>
        <p class="hybrid-search-status" data-hybrid-search-status aria-live="polite">Loading…</p>
        <ul id="hybrid-search-results" class="hybrid-search-results" data-hybrid-search-results role="listbox" aria-label="Search results"></ul>
      </dialog>
    `)
  );

  walk(body, (node) => {
    if (node.type !== "element" || node.tagName !== "a") return;
    const href = node.properties.href;
    if (href === "/") node.properties.href = "/hybrid/__PERF030_VARIANT__/home";
    if (page === "home" && href === "/blog/reconciliation-cross-system-sync") {
      node.properties.href = "/hybrid/__PERF030_VARIANT__/article";
    }
    const rewrittenHref = node.properties.href;
    if (
      typeof rewrittenHref === "string" &&
      rewrittenHref.startsWith("/") &&
      !rewrittenHref.startsWith("/hybrid/search") &&
      !rewrittenHref.startsWith("/#")
    ) {
      node.properties.dataPrefetchOnIntent = "";
    }
  });
}

function selectorIsPossible(selector, classes, ids) {
  let possible = true;
  const isInsideNot = (node) => {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (parent.type === "pseudo" && parent.value === ":not") return true;
    }
    return false;
  };
  selector.walkClasses((node) => {
    if (!isInsideNot(node) && node.value !== "dark" && !classes.has(node.value)) {
      possible = false;
    }
  });
  selector.walkIds((node) => {
    if (!isInsideNot(node) && !ids.has(node.value)) possible = false;
  });
  return possible;
}

function pruneCss(css, documentMarkup) {
  const classes = new Set();
  const ids = new Set();
  for (const match of documentMarkup.matchAll(/\bclass="([^"]*)"/g)) {
    match[1]
      .split(/\s+/)
      .filter(Boolean)
      .forEach((name) => classes.add(name));
  }
  for (const match of documentMarkup.matchAll(/\bid="([^"]+)"/g)) ids.add(match[1]);
  const root = postcss.parse(css);
  let keptRules = 0;
  let removedRules = 0;

  root.walkRules((rule) => {
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === "atrule" && /keyframes$/i.test(parent.name)) {
        keptRules += 1;
        return;
      }
    }
    try {
      const parsed = selectorParser().astSync(rule.selector);
      parsed.nodes = parsed.nodes.filter((selector) => selectorIsPossible(selector, classes, ids));
      if (parsed.nodes.length === 0) {
        removedRules += 1;
        rule.remove();
      } else {
        keptRules += 1;
        rule.selector = parsed.toString();
      }
    } catch {
      keptRules += 1;
    }
  });

  let changed = true;
  while (changed) {
    changed = false;
    root.walkAtRules((atRule) => {
      if (
        atRule.nodes &&
        atRule.nodes.length === 0 &&
        !["font-face", "property"].includes(atRule.name.toLowerCase())
      ) {
        atRule.remove();
        changed = true;
      }
    });
  }
  return { css: root.toString(), keptRules, removedRules, classes: classes.size };
}

function sizeSummary(value) {
  const buffer = Buffer.from(value);
  return {
    raw: buffer.length,
    gzip: zlib.gzipSync(buffer, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(buffer, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

const snapshots = [];
const cssByFilename = new Map();

for (const definition of pageDefinitions) {
  const document = fromHtmlIsomorphic(fs.readFileSync(definition.source, "utf8"));
  const sourceHtml = findElement(document, (node) => node.tagName === "html");
  const sourceHead = findElement(sourceHtml, (node) => node.tagName === "head");
  const sourceBody = findElement(sourceHtml, (node) => node.tagName === "body");
  const head = cloneAndClean(sourceHead, "head");
  const body = cloneAndClean(sourceBody, "body");
  rewriteAndCopyDocumentAssets(head);
  rewriteAndCopyDocumentAssets(body);

  const stylesheetFilenames = head.children
    .filter(
      (node) => node.type === "element" && node.tagName === "link" && hasRel(node, "stylesheet")
    )
    .map((node) => path.basename(node.properties.href));
  for (const filename of stylesheetFilenames) {
    if (!cssByFilename.has(filename)) cssByFilename.set(filename, cssSource(filename));
  }
  head.children = head.children.filter(
    (node) => !(node.type === "element" && node.tagName === "link" && hasRel(node, "stylesheet"))
  );

  enhanceBody(body, definition.name);
  const title = findElement(head, (node) => node.tagName === "title");
  const canonical = findElement(
    head,
    (node) => node.tagName === "link" && hasRel(node, "canonical")
  );
  const snapshot = {
    name: definition.name,
    route: definition.route,
    source: path.relative(repositoryRoot, definition.source),
    title: title ? textContent(title) : "",
    canonical: canonical?.properties.href,
    html: {
      lang: sourceHtml.properties.lang || "en-us",
      className: (sourceHtml.properties.className || []).join(" "),
    },
    bodyClassName: (sourceBody.properties.className || []).join(" "),
    head: toHtml({ type: "root", children: head.children }),
    body: toHtml({ type: "root", children: body.children }),
    stylesheetFilenames,
  };
  snapshots.push(snapshot);
}

const baseFilename = snapshots.find((snapshot) => snapshot.name === "home").stylesheetFilenames[0];
const articleFilename = snapshots
  .find((snapshot) => snapshot.name === "article")
  .stylesheetFilenames.find((filename) => filename !== baseFilename);
if (!baseFilename || !articleFilename) {
  throw new Error("Expected a shared stylesheet and one article stylesheet");
}

const cssReport = [];

function completeDocumentMarkup(snapshot) {
  return `<html class="${snapshot.html.className}"><head>${snapshot.head}</head><body class="${snapshot.bodyClassName}">${snapshot.body}</body></html>`;
}

const sharedBaseCss = pruneCss(
  cssByFilename.get(baseFilename),
  snapshots.map(completeDocumentMarkup).join("\n")
);
const sharedBaseWithHybrid = `${sharedBaseCss.css}\n${hybridCss}`;
const sharedBasePath = path.join(publicGeneratedRoot, "shared/base.css");
fs.mkdirSync(path.dirname(sharedBasePath), { recursive: true });
fs.writeFileSync(sharedBasePath, sharedBaseWithHybrid);
cssReport.push({
  page: "shared",
  stylesheet: "base",
  full: sizeSummary(`${cssByFilename.get(baseFilename)}\n${hybridCss}`),
  pruned: sizeSummary(sharedBaseWithHybrid),
  keptRules: sharedBaseCss.keptRules,
  removedRules: sharedBaseCss.removedRules,
  documentClasses: sharedBaseCss.classes,
});

for (const snapshot of snapshots) {
  const baseCss = cssByFilename.get(baseFilename);
  const completeMarkup = completeDocumentMarkup(snapshot);
  const prunedBase = pruneCss(baseCss, completeMarkup);
  const fullBase = `${baseCss}\n${hybridCss}`;
  const prunedBaseWithHybrid = `${prunedBase.css}\n${hybridCss}`;
  const baseFullPath = path.join(publicGeneratedRoot, "full/base.css");
  const basePrunedPath = path.join(publicGeneratedRoot, `pruned/${snapshot.name}-base.css`);
  fs.mkdirSync(path.dirname(baseFullPath), { recursive: true });
  if (!fs.existsSync(baseFullPath)) fs.writeFileSync(baseFullPath, fullBase);
  fs.mkdirSync(path.dirname(basePrunedPath), { recursive: true });
  fs.writeFileSync(basePrunedPath, prunedBaseWithHybrid);

  const styles = {
    full: ["/generated/full/base.css"],
    pruned: [`/generated/pruned/${snapshot.name}-base.css`],
    shared: ["/generated/shared/base.css"],
  };
  cssReport.push({
    page: snapshot.name,
    stylesheet: "base",
    full: sizeSummary(fullBase),
    pruned: sizeSummary(prunedBaseWithHybrid),
    keptRules: prunedBase.keptRules,
    removedRules: prunedBase.removedRules,
    documentClasses: prunedBase.classes,
  });

  if (snapshot.name === "article") {
    const articleCss = cssByFilename.get(articleFilename);
    const prunedArticle = pruneCss(articleCss, completeMarkup);
    fs.writeFileSync(path.join(publicGeneratedRoot, "full/article.css"), articleCss);
    fs.writeFileSync(path.join(publicGeneratedRoot, "pruned/article.css"), prunedArticle.css);
    styles.full.push("/generated/full/article.css");
    styles.pruned.push("/generated/pruned/article.css");
    styles.shared.push("/generated/pruned/article.css");
    cssReport.push({
      page: snapshot.name,
      stylesheet: "article",
      full: sizeSummary(articleCss),
      pruned: sizeSummary(prunedArticle.css),
      keptRules: prunedArticle.keptRules,
      removedRules: prunedArticle.removedRules,
      documentClasses: prunedArticle.classes,
    });
  }

  snapshot.styles = styles;
  delete snapshot.stylesheetFilenames;
  fs.writeFileSync(
    path.join(generatedRoot, `${snapshot.name}.json`),
    `${JSON.stringify(snapshot, null, 2)}\n`
  );
  console.log(`${snapshot.name}: ${Buffer.byteLength(snapshot.body)} enhanced body bytes`);
}

copyFile(path.join(repositoryRoot, "public/search.json"), path.join(generatedRoot, "search.json"));
copyFile(
  path.join(repositoryRoot, "public/search.json"),
  path.join(publicGeneratedRoot, "search.json")
);
copyPublicAsset("/site.webmanifest");
const manifestIconUrls = [
  "/static/favicons/web-app-manifest-192x192.png",
  "/static/favicons/web-app-manifest-512x512.png",
];
for (const iconUrl of manifestIconUrls) copyPublicAsset(iconUrl);

const fontUrls = [
  ...new Set(
    snapshots.flatMap((snapshot) =>
      [...snapshot.head.matchAll(/\/generated\/media\/[^"']+\.woff2/g)].map((match) => match[0])
    )
  ),
];
if (fontUrls.length !== 1) {
  throw new Error(`Expected one generated font URL, received ${fontUrls.join(", ")}`);
}
const sharedAssetSources = ["/hybrid/bootstrap.js", "/hybrid/prerender.js"];
const cachePolicies = {};
const cacheAssetReport = [];
for (const [policy, policyDirectory] of [
  ["hashed-stale", "cache-stale"],
  ["hashed-immutable", "cache-fresh"],
]) {
  const mapping = {};
  const originalFontUrl = fontUrls[0];
  const font = writeContentAddressedAsset(
    policyDirectory,
    `media/${path.posix.basename(originalFontUrl)}`,
    fs.readFileSync(path.join(publicRoot, originalFontUrl.slice(1)))
  );
  mapping[originalFontUrl] = font.url;
  cacheAssetReport.push({ policy, source: originalFontUrl, ...font });

  const sharedCss = writeContentAddressedAsset(
    policyDirectory,
    "shared/base.css",
    sharedBaseWithHybrid.replaceAll(originalFontUrl, font.url)
  );
  mapping["/generated/shared/base.css"] = sharedCss.url;
  cacheAssetReport.push({
    policy,
    source: "/generated/shared/base.css",
    ...sharedCss,
  });

  for (const iconUrl of manifestIconUrls) {
    const icon = writeContentAddressedAsset(
      policyDirectory,
      iconUrl.slice(1),
      fs.readFileSync(path.join(publicRoot, iconUrl.slice(1)))
    );
    mapping[iconUrl] = icon.url;
    cacheAssetReport.push({ policy, source: iconUrl, ...icon });
  }

  for (const source of sharedAssetSources) {
    const asset = writeContentAddressedAsset(
      policyDirectory,
      source.slice(1),
      fs.readFileSync(path.join(publicRoot, source.slice(1)))
    );
    mapping[source] = asset.url;
    cacheAssetReport.push({ policy, source, ...asset });
  }
  const manifestSource = "/site.webmanifest";
  const manifest = writeContentAddressedAsset(
    policyDirectory,
    manifestSource.slice(1),
    Object.entries(mapping).reduce(
      (value, [source, target]) => value.replaceAll(source, target),
      fs.readFileSync(path.join(publicRoot, manifestSource.slice(1)), "utf8")
    )
  );
  mapping[manifestSource] = manifest.url;
  cacheAssetReport.push({ policy, source: manifestSource, ...manifest });
  cachePolicies[policy] = mapping;
}

fs.writeFileSync(
  path.join(generatedRoot, "cache-assets.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      policies: cachePolicies,
      assets: cacheAssetReport,
    },
    null,
    2
  )}\n`
);

fs.writeFileSync(
  path.join(generatedRoot, "build-report.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      pages: snapshots.map(({ name, route, source, title, canonical }) => ({
        name,
        route,
        source,
        title,
        canonical,
      })),
      css: cssReport,
      removedObservedDefect:
        "The current article renders a Scroll To Comment button but no #comment target after hydration; the hybrid snapshot omits that no-op control.",
    },
    null,
    2
  )}\n`
);

console.table(
  cssReport.map((entry) => ({
    page: entry.page,
    stylesheet: entry.stylesheet,
    "full gzip": entry.full.gzip,
    "pruned gzip": entry.pruned.gzip,
    "gzip change": entry.pruned.gzip - entry.full.gzip,
    keptRules: entry.keptRules,
    removedRules: entry.removedRules,
  }))
);
