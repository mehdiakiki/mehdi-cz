import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { renderContentDocument } from "./lib/render-document.mjs";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(fixtureRoot, "../..");
const productionNextRoot = path.join(repositoryRoot, ".next");
const fixturePublicRoot = path.join(fixtureRoot, "public");

const definitions = [
  {
    page: "home",
    variant: "current",
    htmlPath: path.join(productionNextRoot, "server/app/index.html"),
    rscPath: path.join(productionNextRoot, "server/app/index.rsc"),
    nextRoot: productionNextRoot,
    publicRoot: path.join(repositoryRoot, "public"),
  },
  {
    page: "article",
    variant: "current",
    htmlPath: path.join(
      productionNextRoot,
      "server/app/blog/reconciliation-cross-system-sync.html"
    ),
    rscPath: path.join(productionNextRoot, "server/app/blog/reconciliation-cross-system-sync.rsc"),
    nextRoot: productionNextRoot,
    publicRoot: path.join(repositoryRoot, "public"),
  },
  {
    page: "home",
    variant: "hybrid-full-css",
    html: renderContentDocument("home", "full"),
    publicRoot: fixturePublicRoot,
  },
  {
    page: "article",
    variant: "hybrid-full-css",
    html: renderContentDocument("article", "full"),
    publicRoot: fixturePublicRoot,
  },
  {
    page: "home",
    variant: "hybrid-pruned-css",
    html: renderContentDocument("home", "pruned"),
    publicRoot: fixturePublicRoot,
  },
  {
    page: "article",
    variant: "hybrid-pruned-css",
    html: renderContentDocument("article", "pruned"),
    publicRoot: fixturePublicRoot,
  },
  {
    page: "home",
    variant: "hybrid-shared-pruned-css",
    html: renderContentDocument("home", "shared"),
    publicRoot: fixturePublicRoot,
  },
  {
    page: "article",
    variant: "hybrid-shared-pruned-css",
    html: renderContentDocument("article", "shared"),
    publicRoot: fixturePublicRoot,
  },
];

function compressedSize(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return {
    raw: buffer.length,
    gzip: zlib.gzipSync(buffer, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(buffer, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

function addSizes(items) {
  return items.reduce(
    (total, item) => ({
      raw: total.raw + item.raw,
      gzip: total.gzip + item.gzip,
      brotli: total.brotli + item.brotli,
    }),
    { raw: 0, gzip: 0, brotli: 0 }
  );
}

function openingTags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b([^>]*)>`, "gi"))].map((match) => match[1]);
}

function modernScriptUrls(html) {
  return [
    ...new Set(
      openingTags(html, "script")
        .filter((attributes) => !/\bnomodule(?:\s|=|$)/i.test(attributes))
        .map((attributes) => attributes.match(/\bsrc="([^"]+)"/i)?.[1])
        .filter(Boolean)
    ),
  ];
}

function stylesheetUrls(html) {
  return [
    ...new Set(
      openingTags(html, "link")
        .filter((attributes) => /\brel="[^"]*stylesheet/i.test(attributes))
        .map((attributes) => attributes.match(/\bhref="([^"]+)"/i)?.[1])
        .filter(Boolean)
    ),
  ];
}

function resolveAsset(url, definition) {
  const pathname = decodeURIComponent(new URL(url, "http://fixture.local").pathname);
  if (pathname.startsWith("/_next/")) {
    return path.join(definition.nextRoot, pathname.slice("/_next/".length));
  }
  return path.join(definition.publicRoot, pathname.slice(1));
}

function measureUrls(urls, definition) {
  const files = urls.map((url) => {
    const filename = resolveAsset(url, definition);
    if (!fs.existsSync(filename)) throw new Error(`Cannot resolve ${url} to ${filename}`);
    return compressedSize(fs.readFileSync(filename));
  });
  return { requests: urls.length, urls, ...addSizes(files) };
}

function property(node, name) {
  return node.properties?.[name];
}

function findElement(root, predicate) {
  const stack = [...(root.children || [])];
  while (stack.length) {
    const node = stack.shift();
    if (node.type === "element" && predicate(node)) return node;
    if (node.children) stack.unshift(...node.children);
  }
}

function collectText(node, target) {
  if (node.type === "text") target.push(node.value);
  for (const child of node.children || []) collectText(child, target);
}

function isEnhancementBoundary(node) {
  return (
    node.type === "element" &&
    Object.keys(node.properties || {}).some((name) => name.startsWith("dataHybrid"))
  );
}

function semanticSummary(html) {
  const document = fromHtmlIsomorphic(html);
  const head = findElement(document, (node) => node.tagName === "head");
  const body = findElement(document, (node) => node.tagName === "body");
  const visibleText = [];
  const headings = [];
  const images = [];
  const structuredData = [];

  function visit(node, ignored = false) {
    if (node.type === "comment") return;
    if (node.type === "text") {
      if (!ignored) visibleText.push(node.value);
      return;
    }
    if (node.type !== "element") return;

    const nextIgnored =
      ignored ||
      isEnhancementBoundary(node) ||
      ["script", "style", "template", "noscript"].includes(node.tagName);
    if (!nextIgnored && /^h[1-6]$/.test(node.tagName)) {
      const text = [];
      collectText(node, text);
      headings.push(text.join(" ").replace(/\s+/g, " ").trim());
    }
    if (!nextIgnored && node.tagName === "img") {
      images.push({
        alt: property(node, "alt") || "",
        src: property(node, "src") || "",
        width: property(node, "width") || null,
        height: property(node, "height") || null,
      });
    }
    for (const child of node.children || []) visit(child, nextIgnored);
  }

  for (const child of body.children || []) visit(child);
  for (const script of head.children || []) {
    if (
      script.type === "element" &&
      script.tagName === "script" &&
      property(script, "type") === "application/ld+json"
    ) {
      const text = [];
      collectText(script, text);
      structuredData.push(text.join(""));
    }
  }

  const title = findElement(head, (node) => node.tagName === "title");
  const titleText = [];
  if (title) collectText(title, titleText);
  const canonical = findElement(
    head,
    (node) => node.tagName === "link" && property(node, "rel")?.includes("canonical")
  );
  const normalizedText = visibleText.join(" ").replace(/\s+/g, " ").trim();
  return {
    title: titleText.join("").trim(),
    canonical: property(canonical, "href"),
    headings,
    images,
    visibleTextBytes: Buffer.byteLength(normalizedText),
    visibleTextSha256: crypto.createHash("sha256").update(normalizedText).digest("hex"),
    structuredDataSha256: crypto
      .createHash("sha256")
      .update(JSON.stringify(structuredData))
      .digest("hex"),
  };
}

function inlineExecutableSize(html) {
  const bodies = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\bsrc=/i.test(match[1]))
    .filter((match) => !/\btype="application\/ld\+json"/i.test(match[1]))
    .map((match) => match[2]);
  return compressedSize(bodies.join(""));
}

function inlineFlightSize(html) {
  const flight = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((body) => body.includes("self.__next_f"));
  return flight.length ? compressedSize(flight.join("")) : compressedSize("");
}

const results = definitions.map((definition) => {
  if (definition.htmlPath && !fs.existsSync(definition.htmlPath)) {
    throw new Error(`Missing ${definition.htmlPath}. Build the production site first.`);
  }
  const html = definition.html ?? fs.readFileSync(definition.htmlPath, "utf8");
  const document = compressedSize(html);
  const javascript = measureUrls(modernScriptUrls(html), definition);
  const css = measureUrls(stylesheetUrls(html), definition);
  const rsc = definition.rscPath
    ? compressedSize(fs.readFileSync(definition.rscPath))
    : { raw: 0, gzip: 0, brotli: 0 };
  return {
    page: definition.page,
    variant: definition.variant,
    document,
    css,
    javascript,
    inlineExecutable: inlineExecutableSize(html),
    inlineFlight: inlineFlightSize(html),
    rscNavigationPayload: rsc,
    initialTransferModel: {
      scope: "document + blocking CSS + modern startup JS; excludes images and fonts",
      ...addSizes([document, css, javascript]),
    },
    semantics: semanticSummary(html),
  };
});

for (const page of ["home", "article"]) {
  const reference = results.find(
    (result) => result.page === page && result.variant === "current"
  ).semantics;
  for (const result of results.filter((result) => result.page === page)) {
    result.semanticParity = {
      visibleText: result.semantics.visibleTextSha256 === reference.visibleTextSha256,
      headings: JSON.stringify(result.semantics.headings) === JSON.stringify(reference.headings),
      images: JSON.stringify(result.semantics.images) === JSON.stringify(reference.images),
      metadata:
        result.semantics.title === reference.title &&
        result.semantics.canonical === reference.canonical,
      structuredData: result.semantics.structuredDataSha256 === reference.structuredDataSha256,
    };
  }
}

const deferredSearch = {
  module: compressedSize(fs.readFileSync(path.join(fixtureRoot, "public/hybrid/search.js"))),
  index: compressedSize(fs.readFileSync(path.join(fixtureRoot, "public/generated/search.json"))),
};
deferredSearch.combined = addSizes([deferredSearch.module, deferredSearch.index]);

const buildReport = JSON.parse(
  fs.readFileSync(path.join(fixtureRoot, "generated/build-report.json"), "utf8")
);
const output = {
  generatedAt: new Date().toISOString(),
  versions: {
    node: process.version,
    next: JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, "node_modules/next/package.json"), "utf8")
    ).version,
    react: JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, "node_modules/react/package.json"), "utf8")
    ).version,
  },
  model: {
    initial: "document + blocking CSS + modern startup JavaScript",
    excluded: ["images", "fonts", "response headers", "deferred search module/index"],
    compression: "deterministic gzip level 9 and Brotli quality 11",
  },
  deferredSearch,
  cssPruning: buildReport.css,
  results,
};

fs.mkdirSync(path.join(fixtureRoot, "results"), { recursive: true });
fs.writeFileSync(
  path.join(fixtureRoot, "results/artifact-measurement.json"),
  `${JSON.stringify(output, null, 2)}\n`
);

console.table(
  results.map((result) => ({
    page: result.page,
    variant: result.variant,
    "HTML gzip": result.document.gzip,
    "JS req": result.javascript.requests,
    "JS gzip": result.javascript.gzip,
    "CSS gzip": result.css.gzip,
    "modeled gzip": result.initialTransferModel.gzip,
    "text parity": result.semanticParity.visibleText,
    "image parity": result.semanticParity.images,
  }))
);
console.log("Deferred search (module + index), gzip:", deferredSearch.combined.gzip);
