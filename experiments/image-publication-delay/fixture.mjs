import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, serialize } from "parse5";

export const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(experimentRoot, "../..");

export const routes = [
  {
    id: "control-plane",
    path: "/blog/design-control-plane-distributed-database",
    artifact: ".next/server/app/blog/design-control-plane-distributed-database.html",
    source: "/static/images/system-design-db-control-pane.webp",
    targetAlt: "Control plane architecture schema for a distributed database",
  },
  {
    id: "load-balancer",
    path: "/blog/load-balancer-sticky-sessions-course",
    artifact: ".next/server/app/blog/load-balancer-sticky-sessions-course.html",
    source: "/static/images/stick-sessions-load-balancer.webp",
    targetAlt: "Load Balancer Architecture",
  },
];

export const variants = [
  "full",
  "script-blocked",
  "script-inert",
  "prefix-flush",
  "decoding-sync",
  "minimal-shell",
];

function attribute(node, name) {
  return node.attrs?.find((candidate) => candidate.name === name)?.value;
}

function isTargetImage(node, targetAlt) {
  return node.tagName === "img" && attribute(node, "alt") === targetAlt;
}

function findNode(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.childNodes || []) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return undefined;
}

function isJsonLd(node) {
  return node.tagName === "script" && attribute(node, "type") === "application/ld+json";
}

function removeExecutableScripts(node) {
  if (!node.childNodes) return;
  node.childNodes = node.childNodes.filter(
    (child) => child.tagName !== "script" || isJsonLd(child)
  );
  for (const child of node.childNodes) removeExecutableScripts(child);
}

function pruneProseAfterTarget(document, targetAlt) {
  const image = findNode(document, (node) => isTargetImage(node, targetAlt));
  if (!image) throw new Error(`Cannot find target image ${JSON.stringify(targetAlt)}`);
  let prose = image.parentNode;
  while (prose && !attribute(prose, "class")?.split(/\s+/).includes("prose")) {
    prose = prose.parentNode;
  }
  if (!prose) throw new Error(`Cannot find prose ancestor for ${JSON.stringify(targetAlt)}`);
  let branch = image;
  while (branch.parentNode !== prose) branch = branch.parentNode;
  const index = prose.childNodes.indexOf(branch);
  if (index < 0) throw new Error("Target prose ancestry is not internally consistent");
  prose.childNodes = prose.childNodes.slice(0, index + 1);
}

function targetImageTag(html, targetAlt) {
  const escaped = targetAlt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<img\\b(?=[^>]*\\balt="${escaped}")[^>]*>`, "i"));
  if (!match) throw new Error(`Cannot find target image tag ${JSON.stringify(targetAlt)}`);
  return match[0];
}

export function loadRouteHtml(route) {
  return readFileSync(path.join(repositoryRoot, route.artifact), "utf8");
}

export function minimalShell(html, targetAlt) {
  const document = parse(html);
  pruneProseAfterTarget(document, targetAlt);
  removeExecutableScripts(document);
  return serialize(document);
}

export function decodingSync(html, targetAlt) {
  const tag = targetImageTag(html, targetAlt);
  if (!tag.includes('decoding="async"')) {
    throw new Error(`Target image ${JSON.stringify(targetAlt)} is not decoding asynchronously`);
  }
  return html.replace(tag, tag.replace('decoding="async"', 'decoding="sync"'));
}

export function inertScriptsWithPreloads(html) {
  return html.replace(/<script\b([^>]*)>/gi, (tag, attributes) => {
    if (/\btype="application\/ld\+json"/i.test(attributes)) return tag;
    const src = attributes.match(/\bsrc="([^"]+)"/i)?.[1];
    const withoutType = attributes.replace(/\s+type="[^"]*"/i, "");
    const inertTag = `<script type="application/perf044-inert"${withoutType}>`;
    if (!src || /\bnomodule(?:\s|=|$)/i.test(attributes)) return inertTag;
    return `<link rel="preload" as="script" fetchpriority="low" href="${src}">${inertTag}`;
  });
}

export function prefixFlushOffset(html, targetAlt) {
  const tag = targetImageTag(html, targetAlt);
  const start = html.indexOf(tag);
  const parentEnd = html.indexOf("</div>", start + tag.length);
  if (parentEnd < 0) throw new Error(`Cannot find target image parent end for ${targetAlt}`);
  return parentEnd + "</div>".length;
}

export function buildVariant(route, variant) {
  if (!variants.includes(variant)) throw new Error(`Unknown PERF-044 variant: ${variant}`);
  const full = loadRouteHtml(route);
  if (variant === "minimal-shell") return minimalShell(full, route.targetAlt);
  if (variant === "decoding-sync") return decodingSync(full, route.targetAlt);
  if (variant === "script-inert") return inertScriptsWithPreloads(full);
  return full;
}

export function summarizeHtml(html, targetAlt) {
  const target = targetImageTag(html, targetAlt);
  return {
    bytes: Buffer.byteLength(html),
    elementStarts: (html.match(/<[a-z][^>]*>/gi) || []).length,
    scripts: (html.match(/<script\b/gi) || []).length,
    executableScripts: [...html.matchAll(/<script\b([^>]*)>/gi)].filter(
      (match) => !/\btype="application\/ld\+json"/i.test(match[1])
    ).length,
    inlineFlightBytes: [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
      .filter((match) => match[1].includes("self.__next_f"))
      .reduce((total, match) => total + Buffer.byteLength(match[0]), 0),
    targetImageTag: target,
    targetOffset: html.indexOf(target),
  };
}

export function targetImageAttributes(html, targetAlt) {
  const document = parse(html);
  const image = findNode(document, (node) => isTargetImage(node, targetAlt));
  if (!image) throw new Error(`Cannot find target image ${JSON.stringify(targetAlt)}`);
  return Object.fromEntries(image.attrs.map(({ name, value }) => [name, value]));
}
