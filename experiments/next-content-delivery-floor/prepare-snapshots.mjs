import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { toHtml } from "hast-util-to-html";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(fixtureRoot, "../..");
const generatedRoot = path.join(fixtureRoot, "generated");
const generatedCssSourceRoot = path.join(fixtureRoot, "generated-css");
const publicRoot = path.join(fixtureRoot, "public");
const generatedCssRoot = path.join(publicRoot, "generated");
const generatedMediaRoot = path.join(publicRoot, "generated-media");

const pages = [
  {
    name: "home",
    route: "/",
    source: path.join(repositoryRoot, ".next/server/app/index.html"),
  },
  {
    name: "article",
    route: "/blog/BufReader-rust",
    source: path.join(
      repositoryRoot,
      ".next/server/app/blog/BufReader-rust.html"
    ),
  },
];

for (const page of pages) {
  if (!fs.existsSync(page.source)) {
    throw new Error(
      `Missing ${page.source}. Build the production site before preparing this fixture.`
    );
  }
}

for (const target of [
  generatedRoot,
  generatedCssSourceRoot,
  generatedCssRoot,
  generatedMediaRoot,
  path.join(publicRoot, "static"),
]) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
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

function cloneAndClean(node, section) {
  if (node.type === "comment") return undefined;
  if (node.type !== "element") return { ...node };

  if (node.tagName === "script") {
    const isStructuredData = node.properties.type === "application/ld+json";
    if (!isStructuredData) return undefined;
  }

  if (
    section === "head" &&
    node.tagName === "link" &&
    node.properties.rel?.includes("preload") &&
    node.properties.as === "script"
  ) {
    return undefined;
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
  };
}

function walk(node, visit) {
  visit(node);
  for (const child of node.children || []) walk(child, visit);
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyPublicAsset(url) {
  if (!url.startsWith("/static/") && url !== "/site.webmanifest") return;
  const relative = url.slice(1);
  const source = path.join(repositoryRoot, "public", relative);
  const destination = path.join(publicRoot, relative);
  if (fs.existsSync(source)) copyFile(source, destination);
}

function collectPublicUrls(value) {
  if (typeof value !== "string") return;
  for (const token of value.split(/[\s,]+/)) {
    const normalized = token.replace(/&amp;/g, "&");
    if (normalized.startsWith("/static/") || normalized === "/site.webmanifest") {
      copyPublicAsset(normalized);
    }
    if (normalized.startsWith("/_next/image?")) {
      const encoded = new URL(normalized, "http://fixture.local").searchParams.get(
        "url"
      );
      if (encoded) copyPublicAsset(encoded);
    }
  }
}

const copiedCss = new Set();
const cssContents = new Map();
function copyStylesheet(href) {
  const prefix = "/_next/static/css/";
  if (!href.startsWith(prefix)) return href;
  const filename = href.slice(prefix.length);
  if (!copiedCss.has(filename)) {
    const source = path.join(repositoryRoot, ".next/static/css", filename);
    let css = fs.readFileSync(source, "utf8");
    css = css.replace(
      /\/_next\/static\/media\/([^)'\"?#]+)/g,
      (_match, mediaName) => {
        copyFile(
          path.join(repositoryRoot, ".next/static/media", mediaName),
          path.join(generatedMediaRoot, mediaName)
        );
        return `/generated-media/${mediaName}`;
      }
    );
    fs.writeFileSync(path.join(generatedCssRoot, filename), css);
    cssContents.set(filename, css);
    copiedCss.add(filename);
  }
  return `/generated/${filename}`;
}

function rewriteAndCopyAssets(root) {
  walk(root, (node) => {
    if (node.type !== "element") return;
    for (const [name, value] of Object.entries(node.properties)) {
      if (name === "href" && typeof value === "string") {
        node.properties[name] = copyStylesheet(value);
      }
      const rewritten = node.properties[name];
      if (typeof rewritten === "string") collectPublicUrls(rewritten);
      if (Array.isArray(rewritten)) {
        for (const item of rewritten) collectPublicUrls(item);
      }
    }

    if (
      node.tagName === "link" &&
      node.properties.rel?.includes("preload") &&
      node.properties.as === "font" &&
      typeof node.properties.href === "string"
    ) {
      const prefix = "/_next/static/media/";
      if (node.properties.href.startsWith(prefix)) {
        const filename = node.properties.href.slice(prefix.length);
        copyFile(
          path.join(repositoryRoot, ".next/static/media", filename),
          path.join(generatedMediaRoot, filename)
        );
        node.properties.href = `/generated-media/${filename}`;
      }
    }
  });
}

function extractLinkMetadata(head) {
  const links = head.children.filter(
    (node) => node.type === "element" && node.tagName === "link"
  );
  const hasRel = (node, value) => node.properties.rel?.includes(value);
  const asDescriptor = (node) => ({
    url: node.properties.href,
    ...(node.properties.type ? { type: node.properties.type } : {}),
    ...(node.properties.sizes
      ? {
          sizes: Array.isArray(node.properties.sizes)
            ? node.properties.sizes.join(" ")
            : node.properties.sizes,
        }
      : {}),
  });

  return {
    canonical: links.find((node) => hasRel(node, "canonical"))?.properties
      .href,
    alternates: links
      .filter(
        (node) => hasRel(node, "alternate") && node.properties.type
      )
      .map((node) => ({
        type: node.properties.type,
        href: node.properties.href,
        title: node.properties.title,
      })),
    icons: links.filter((node) => hasRel(node, "icon")).map(asDescriptor),
    appleTouchIcons: links
      .filter((node) => hasRel(node, "apple-touch-icon"))
      .map(asDescriptor),
    manifest: links.find((node) => hasRel(node, "manifest"))?.properties.href,
  };
}

const snapshots = [];
for (const page of pages) {
  const sourceHtml = fs.readFileSync(page.source, "utf8");
  const document = fromHtmlIsomorphic(sourceHtml);
  const html = findElement(document, "html");
  const sourceHead = findElement(html, "head");
  const sourceBody = findElement(html, "body");
  const head = cloneAndClean(sourceHead, "head");
  const body = cloneAndClean(sourceBody, "body");

  rewriteAndCopyAssets(head);
  rewriteAndCopyAssets(body);

  const snapshot = {
    name: page.name,
    route: page.route,
    source: path.relative(repositoryRoot, page.source),
    html: {
      lang: html.properties.lang || "en-us",
      className: (html.properties.className || []).join(" "),
    },
    bodyClassName: (sourceBody.properties.className || []).join(" "),
    linkMetadata: extractLinkMetadata(head),
    head: toHtml({ type: "root", children: head.children }),
    body: toHtml({ type: "root", children: body.children }),
  };

  fs.writeFileSync(
    path.join(generatedRoot, `${page.name}.json`),
    `${JSON.stringify(snapshot, null, 2)}\n`
  );
  snapshots.push(snapshot);
  console.log(
    `${page.name}: ${Buffer.byteLength(snapshot.body)} body bytes, ` +
      `${Buffer.byteLength(snapshot.head)} head bytes`
  );
}

function stylesheetNames(snapshot) {
  return [...snapshot.head.matchAll(/href="\/generated\/([^"]+\.css)"/g)].map(
    (match) => match[1]
  );
}

const homeSnapshot = snapshots.find((snapshot) => snapshot.name === "home");
const articleSnapshot = snapshots.find((snapshot) => snapshot.name === "article");
const [baseStylesheet] = stylesheetNames(homeSnapshot);
const articleStylesheet = stylesheetNames(articleSnapshot).find(
  (filename) => filename !== baseStylesheet
);
if (!baseStylesheet || !articleStylesheet) {
  throw new Error("Expected one shared stylesheet and one article stylesheet");
}
fs.writeFileSync(
  path.join(generatedCssSourceRoot, "base.css"),
  cssContents.get(baseStylesheet)
);
fs.writeFileSync(
  path.join(generatedCssSourceRoot, "article.css"),
  cssContents.get(articleStylesheet)
);

const homeHead = fromHtmlIsomorphic(homeSnapshot.head, { fragment: true });
const fontPreload = homeHead.children.find(
  (node) =>
    node.type === "element" &&
    node.tagName === "link" &&
    node.properties.rel?.includes("preload") &&
    node.properties.as === "font"
);
if (!fontPreload) throw new Error("Expected a shared font preload");
fs.writeFileSync(
  path.join(generatedRoot, "resources.js"),
  `export const baseFontPreload = ${JSON.stringify({
    href: fontPreload.properties.href,
    type: fontPreload.properties.type,
  })};\n`
);

console.log(
  `copied ${copiedCss.size} stylesheet(s) from the production build without changing their rules`
);
