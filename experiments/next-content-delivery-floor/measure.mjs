import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(fixtureRoot, "../..");
const fixtureDistName = process.env.PERF029_FIXTURE_DIST || ".next";
const fixtureDistRoot = path.join(fixtureRoot, fixtureDistName);

const cases = [
  {
    page: "home",
    variant: "current",
    html: path.join(repositoryRoot, ".next/server/app/index.html"),
    rsc: path.join(repositoryRoot, ".next/server/app/index.rsc"),
    nextRoot: path.join(repositoryRoot, ".next"),
    publicRoot: path.join(repositoryRoot, "public"),
  },
  {
    page: "home",
    variant: "server-only",
    html: path.join(fixtureDistRoot, "server/app/server/home.html"),
    rsc: path.join(fixtureDistRoot, "server/app/server/home.rsc"),
    nextRoot: fixtureDistRoot,
    publicRoot: path.join(fixtureRoot, "public"),
  },
  {
    page: "home",
    variant: "plain-html",
    html: path.join(fixtureDistRoot, "server/app/plain/home.body"),
    nextRoot: fixtureDistRoot,
    publicRoot: path.join(fixtureRoot, "public"),
  },
  {
    page: "article",
    variant: "current",
    html: path.join(
      repositoryRoot,
      ".next/server/app/blog/BufReader-rust.html"
    ),
    rsc: path.join(
      repositoryRoot,
      ".next/server/app/blog/BufReader-rust.rsc"
    ),
    nextRoot: path.join(repositoryRoot, ".next"),
    publicRoot: path.join(repositoryRoot, "public"),
  },
  {
    page: "article",
    variant: "server-only",
    html: path.join(fixtureDistRoot, "server/app/server/article.html"),
    rsc: path.join(fixtureDistRoot, "server/app/server/article.rsc"),
    nextRoot: fixtureDistRoot,
    publicRoot: path.join(fixtureRoot, "public"),
  },
  {
    page: "article",
    variant: "plain-html",
    html: path.join(fixtureDistRoot, "server/app/plain/article.body"),
    nextRoot: fixtureDistRoot,
    publicRoot: path.join(fixtureRoot, "public"),
  },
];

for (const item of cases) {
  if (!fs.existsSync(item.html)) {
    throw new Error(`Missing ${item.html}. Run npm run build first.`);
  }
}

function compressedSize(buffer) {
  return {
    raw: buffer.length,
    gzip: zlib.gzipSync(buffer, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(buffer, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      },
    }).length,
  };
}

function addSizes(items) {
  return items.reduce(
    (sum, item) => ({
      raw: sum.raw + item.raw,
      gzip: sum.gzip + item.gzip,
      brotli: sum.brotli + item.brotli,
    }),
    { raw: 0, gzip: 0, brotli: 0 }
  );
}

function openingScriptTags(html) {
  return [...html.matchAll(/<script\b([^>]*)>/gi)].map((match) => match[1]);
}

function modernScriptUrls(html) {
  return [
    ...new Set(
      openingScriptTags(html)
        .filter((attributes) => !/\bnomodule(?:\s|=|$)/i.test(attributes))
        .map((attributes) => attributes.match(/\bsrc="([^"]+)"/i)?.[1])
        .filter(Boolean)
    ),
  ];
}

function stylesheetUrls(html) {
  return [
    ...new Set(
      [...html.matchAll(/<link\b([^>]*)>/gi)]
        .map((match) => match[1])
        .filter((attributes) => /\brel="[^"]*stylesheet/i.test(attributes))
        .map((attributes) => attributes.match(/\bhref="([^"]+)"/i)?.[1])
        .filter(Boolean)
    ),
  ];
}

function resolveAsset(url, item) {
  const pathname = decodeURIComponent(
    new URL(url, "http://fixture.local").pathname
  );
  if (pathname.startsWith("/_next/")) {
    return path.join(item.nextRoot, pathname.slice("/_next/".length));
  }
  return path.join(item.publicRoot, pathname.slice(1));
}

function measureUrls(urls, item) {
  return {
    requests: urls.length,
    urls,
    ...addSizes(
      urls.map((url) => {
        const resolved = resolveAsset(url, item);
        if (!fs.existsSync(resolved)) {
          throw new Error(`Cannot resolve ${url} to ${resolved}`);
        }
        return compressedSize(fs.readFileSync(resolved));
      })
    ),
  };
}

function findElement(root, tagName) {
  const stack = [...(root.children || [])];
  while (stack.length) {
    const node = stack.shift();
    if (node.type === "element" && node.tagName === tagName) return node;
    if (node.children) stack.unshift(...node.children);
  }
  return undefined;
}

function elementIsExecutableScript(node) {
  return (
    node.type === "element" &&
    node.tagName === "script" &&
    node.properties.type !== "application/ld+json"
  );
}

function isEmptyHiddenContainer(node) {
  if (
    node.type !== "element" ||
    node.tagName !== "div" ||
    node.properties.hidden !== true
  ) {
    return false;
  }
  return (node.children || []).every((child) => child.type === "comment");
}

function semanticSummary(html) {
  const document = fromHtmlIsomorphic(html);
  const body = findElement(document, "body");
  const head = findElement(document, "head");
  const texts = [];
  const headings = [];
  const histogram = {};
  let elements = 0;
  let links = 0;
  let images = 0;
  let structuredData = 0;

  function visit(node, ignored = false) {
    if (node.type === "comment") return;
    if (elementIsExecutableScript(node) || isEmptyHiddenContainer(node)) return;
    if (node.type === "text") {
      if (!ignored) texts.push(node.value);
      return;
    }
    if (node.type !== "element") return;

    // Resource hints and stylesheets can legally be discovered from the body
    // in the server-only replay. They do not belong to the rendered content
    // tree whose parity this fingerprint is intended to prove.
    if (node.tagName === "link") return;

    elements += 1;
    histogram[node.tagName] = (histogram[node.tagName] || 0) + 1;
    if (node.tagName === "a") links += 1;
    if (node.tagName === "img") images += 1;
    if (
      node.tagName === "script" &&
      node.properties.type === "application/ld+json"
    ) {
      structuredData += 1;
    }

    const nextIgnored = ignored || node.tagName === "script" || node.tagName === "style";
    if (/^h[1-6]$/.test(node.tagName)) {
      const headingText = [];
      collectText(node, headingText);
      headings.push(headingText.join(" ").replace(/\s+/g, " ").trim());
    }
    for (const child of node.children || []) visit(child, nextIgnored);
  }

  function collectText(node, target) {
    if (node.type === "text") target.push(node.value);
    for (const child of node.children || []) collectText(child, target);
  }

  for (const child of body.children || []) visit(child);
  const normalizedText = texts.join(" ").replace(/\s+/g, " ").trim();
  const title = findElement(head, "title");
  const titleText = [];
  if (title) collectText(title, titleText);
  let canonical;
  for (const node of head.children || []) {
    if (
      node.type === "element" &&
      node.tagName === "link" &&
      node.properties.rel?.includes("canonical")
    ) {
      canonical = node.properties.href;
    }
  }

  return {
    title: titleText.join("").trim(),
    canonical,
    elements,
    links,
    images,
    structuredData,
    headings,
    visibleTextBytes: Buffer.byteLength(normalizedText),
    visibleTextSha256: crypto
      .createHash("sha256")
      .update(normalizedText)
      .digest("hex"),
    tagHistogramSha256: crypto
      .createHash("sha256")
      .update(JSON.stringify(Object.entries(histogram).sort()))
      .digest("hex"),
  };
}

function inlineFlightSize(html) {
  const chunks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((body) => body.includes("self.__next_f"));
  if (chunks.length === 0) return { raw: 0, gzip: 0, brotli: 0 };
  return compressedSize(Buffer.from(chunks.join("")));
}

const results = cases.map((item) => {
  const htmlBuffer = fs.readFileSync(item.html);
  const html = htmlBuffer.toString("utf8");
  const javascript = measureUrls(modernScriptUrls(html), item);
  const css = measureUrls(stylesheetUrls(html), item);
  const document = compressedSize(htmlBuffer);
  const rsc = item.rsc
    ? compressedSize(fs.readFileSync(item.rsc))
    : { raw: 0, gzip: 0, brotli: 0 };

  return {
    page: item.page,
    variant: item.variant,
    document,
    javascript,
    css,
    initialTransferModel: {
      scope: "document + blocking CSS + modern startup JS; excludes images and fonts",
      raw: document.raw + css.raw + javascript.raw,
      gzip: document.gzip + css.gzip + javascript.gzip,
      brotli: document.brotli + css.brotli + javascript.brotli,
    },
    inlineFlight: inlineFlightSize(html),
    rscNavigationPayload: rsc,
    semantics: semanticSummary(html),
  };
});

for (const page of ["home", "article"]) {
  const pageResults = results.filter((result) => result.page === page);
  const reference = pageResults[0].semantics;
  for (const result of pageResults) {
    result.semanticParity = {
      visibleText:
        result.semantics.visibleTextSha256 === reference.visibleTextSha256,
      tagHistogram:
        result.semantics.tagHistogramSha256 === reference.tagHistogramSha256,
      headings:
        JSON.stringify(result.semantics.headings) ===
        JSON.stringify(reference.headings),
      metadata:
        result.semantics.title === reference.title &&
        result.semantics.canonical === reference.canonical,
    };
  }
}

fs.mkdirSync(path.join(fixtureRoot, "results"), { recursive: true });
fs.writeFileSync(
  path.join(fixtureRoot, "results/artifact-measurement.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      fixtureDist: fixtureDistName,
      versions: {
        node: process.version,
        next: JSON.parse(
          fs.readFileSync(
            path.join(repositoryRoot, "node_modules/next/package.json"),
            "utf8"
          )
        ).version,
        react: JSON.parse(
          fs.readFileSync(
            path.join(repositoryRoot, "node_modules/react/package.json"),
            "utf8"
          )
        ).version,
      },
      results,
    },
    null,
    2
  )}\n`
);

console.table(
  results.map((result) => ({
    page: result.page,
    variant: result.variant,
    "HTML gzip": result.document.gzip,
    "Flight gzip": result.inlineFlight.gzip,
    "JS requests": result.javascript.requests,
    "JS gzip": result.javascript.gzip,
    "CSS gzip": result.css.gzip,
    "modeled gzip": result.initialTransferModel.gzip,
    "text parity": result.semanticParity.visibleText,
    "DOM parity": result.semanticParity.tagHistogram,
    "metadata parity": result.semanticParity.metadata,
  }))
);
