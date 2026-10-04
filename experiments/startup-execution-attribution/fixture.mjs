import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  "early-theme-full",
  "framework-only",
  "flight-only",
  "theme-only",
  "early-theme-only",
  "shell-only",
];

function isJsonLd(attributes) {
  return /\btype="application\/ld\+json"/i.test(attributes);
}

function isFlight(body) {
  return body.includes("self.__next_f");
}

function inertTag(attributes, body, preserveNetwork) {
  const src = attributes.match(/\bsrc="([^"]+)"/i)?.[1];
  const withoutType = attributes.replace(/\s+type="[^"]*"/i, "");
  const script = `<script type="application/perf045-inert"${withoutType}>${body}</script>`;
  if (!preserveNetwork || !src || /\bnomodule(?:\s|=|$)/i.test(attributes)) return script;
  return `<link rel="preload" as="script" fetchpriority="low" href="${src}">${script}`;
}

export function loadRouteHtml(route) {
  return readFileSync(path.join(repositoryRoot, route.artifact), "utf8");
}

export function transformScripts(html, variant) {
  const earlyTheme = variant.startsWith("early-theme-");
  const executionVariant = earlyTheme ? variant.replace("early-theme-", "") : variant;
  if (earlyTheme) {
    const theme = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].find(
      ([, attributes, body]) =>
        !isJsonLd(attributes) && !/\bsrc="/i.test(attributes) && !isFlight(body)
    );
    if (!theme) throw new Error("Cannot find the inline theme bootstrap");
    html = html.replace(theme[0], "").replace("<head>", `<head>${theme[0]}`);
  }
  if (executionVariant === "full") return html;

  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attributes, body) => {
    if (isJsonLd(attributes)) return tag;

    const external = /\bsrc="/i.test(attributes);
    const flight = !external && isFlight(body);
    const theme = !external && !flight;
    const enabled =
      (theme && executionVariant !== "shell-only") ||
      (external && executionVariant === "framework-only") ||
      (flight && executionVariant === "flight-only");

    return enabled ? tag : inertTag(attributes, body, external);
  });
}

export function buildVariant(route, variant) {
  if (!variants.includes(variant)) throw new Error(`Unknown PERF-045 variant: ${variant}`);
  return transformScripts(loadRouteHtml(route), variant);
}

export function summarizeHtml(html) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  return {
    bytes: Buffer.byteLength(html),
    scripts: scripts.length,
    executableScripts: scripts.filter(
      ([, attributes]) =>
        !isJsonLd(attributes) && !/\btype="application\/perf045-inert"/i.test(attributes)
    ).length,
    externalScripts: scripts.filter(([, attributes]) => /\bsrc="/i.test(attributes)).length,
    executableExternalScripts: scripts.filter(
      ([, attributes]) =>
        /\bsrc="/i.test(attributes) && !/\btype="application\/perf045-inert"/i.test(attributes)
    ).length,
    inlineFlightScripts: scripts.filter(
      ([, attributes, body]) => !isJsonLd(attributes) && isFlight(body)
    ).length,
    executableInlineFlightScripts: scripts.filter(
      ([, attributes, body]) =>
        !isJsonLd(attributes) &&
        isFlight(body) &&
        !/\btype="application\/perf045-inert"/i.test(attributes)
    ).length,
    inlineFlightBytes: scripts
      .filter(([, attributes, body]) => !isJsonLd(attributes) && isFlight(body))
      .reduce((total, [, , body]) => total + Buffer.byteLength(body), 0),
    lowPriorityScriptPreloads: (
      html.match(
        /<link rel="preload" as="script" fetchpriority="low" href="[^"]+"><script type="application\/perf045-inert"/gi
      ) || []
    ).length,
  };
}
