import { createHash } from "node:crypto";
import { createServer, request } from "node:http";
import { readFile } from "node:fs/promises";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { origin, resultsRoot, sourceCssPath } from "./config.mjs";

const listenPort = Number(process.env.PERF051_PROXY_PORT || 3161);
const upstream = new URL(origin);
const sourceLink = `<link rel="stylesheet" href="${sourceCssPath}" data-precedence="next"/>`;
const promoter = Buffer.from(
  `for(const l of document.querySelectorAll('link[data-perf051-full]')){const p=()=>{l.media='all';l.removeAttribute('data-perf051-full')};l.sheet?p():l.addEventListener('load',p,{once:true})}`
);

const assetNames = [
  "shared-initial",
  "shared-document",
  "home-initial",
  "home-document",
  "index-initial",
  "index-document",
  "prose-initial",
  "prose-document",
  "code-initial",
  "code-document",
  "atlas-initial",
  "atlas-document",
];
const assets = new Map();
for (const name of assetNames) {
  const body = await readFile(`${resultsRoot}/assets/${name}.css`);
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
  assets.set(name, { body, path: `/_perf051/${name}-${hash}.css` });
}

function routeName(pathname) {
  if (pathname === "/") return "home";
  if (pathname === "/blog") return "index";
  if (pathname === "/blog/async-rust-libraries") return "prose";
  if (pathname === "/blog/load-balancer-sticky-sessions-course") return "code";
  if (pathname === "/rust-failure-atlas") return "atlas";
  return "shared";
}

function cookieArm(header = "") {
  return header
    .split(";")
    .map((value) => value.trim().split("="))
    .find(([name]) => name === "perf051_arm")?.[1];
}

function encode(body, acceptEncoding = "") {
  if (/\bbr\b/.test(acceptEncoding)) {
    return { body: brotliCompressSync(body), encoding: "br" };
  }
  if (/\bgzip\b/.test(acceptEncoding)) {
    return { body: gzipSync(body), encoding: "gzip" };
  }
  return { body, encoding: null };
}

function sendBuffer(response, statusCode, headers, body, acceptEncoding) {
  const encoded = encode(body, acceptEncoding);
  const outputHeaders = {
    ...headers,
    "content-length": encoded.body.length,
    vary: "Accept-Encoding",
  };
  delete outputHeaders["transfer-encoding"];
  delete outputHeaders["content-encoding"];
  if (encoded.encoding) outputHeaders["content-encoding"] = encoded.encoding;
  response.writeHead(statusCode, outputHeaders);
  response.end(encoded.body);
}

function transformHtml(html, arm, pathname, delay) {
  if (arm === "control") return html;
  const scope = arm.startsWith("shared-") ? "shared" : routeName(pathname);
  const coverage = arm.includes("document") ? "document" : "initial";
  const scopedName = `${scope}-${coverage}`;
  const asset = assets.get(scopedName) || assets.get("shared-initial");
  const mode = arm.endsWith("inline") ? "inline" : "external";
  const critical =
    mode === "inline"
      ? `<style data-precedence="next" data-perf051-critical>${asset.body}</style>`
      : `<link rel="stylesheet" href="${asset.path}" data-precedence="next" data-perf051-critical/>`;
  const delayQuery = delay > 0 ? `?__perf051_delay=${delay}` : "";
  const deferred = `<link rel="stylesheet" href="${sourceCssPath}${delayQuery}" media="print" data-precedence="next" data-perf051-full/><script async src="/_perf051/promote.js"></script><noscript>${sourceLink}</noscript>`;
  if (!html.includes(sourceLink)) throw new Error(`Cannot find source stylesheet in ${pathname}`);
  return html.replace(sourceLink, `${critical}${deferred}`);
}

const server = createServer((incoming, response) => {
  const requestUrl = new URL(incoming.url || "/", `http://${incoming.headers.host || "localhost"}`);
  if (requestUrl.pathname === "/_perf051/promote.js") {
    sendBuffer(
      response,
      200,
      {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": "public, max-age=31536000, immutable",
      },
      promoter,
      incoming.headers["accept-encoding"]
    );
    return;
  }
  for (const asset of assets.values()) {
    if (requestUrl.pathname !== asset.path) continue;
    sendBuffer(
      response,
      200,
      {
        "content-type": "text/css; charset=utf-8",
        "cache-control": "public, max-age=31536000, immutable",
      },
      asset.body,
      incoming.headers["accept-encoding"]
    );
    return;
  }

  const queryArm = requestUrl.searchParams.get("perf051");
  const arm = queryArm || cookieArm(incoming.headers.cookie) || "control";
  const delay = Number(
    requestUrl.searchParams.get("perf051_delay") ||
      requestUrl.searchParams.get("__perf051_delay") ||
      0
  );
  requestUrl.searchParams.delete("perf051");
  requestUrl.searchParams.delete("perf051_delay");
  requestUrl.searchParams.delete("__perf051_delay");
  const upstreamHeaders = {
    ...incoming.headers,
    host: upstream.host,
    "accept-encoding": "identity",
  };
  delete upstreamHeaders["content-length"];
  const upstreamRequest = request(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port,
      method: incoming.method,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      headers: upstreamHeaders,
    },
    (upstreamResponse) => {
      const chunks = [];
      upstreamResponse.on("data", (chunk) => chunks.push(chunk));
      upstreamResponse.on("end", () => {
        try {
          const body = Buffer.concat(chunks);
          const headers = { ...upstreamResponse.headers };
          if (queryArm) headers["set-cookie"] = `perf051_arm=${queryArm}; Path=/; SameSite=Lax`;
          const contentType = String(headers["content-type"] || "");
          if (!contentType.includes("text/html")) {
            const send = () =>
              sendBuffer(
                response,
                upstreamResponse.statusCode || 200,
                headers,
                body,
                incoming.headers["accept-encoding"]
              );
            if (delay > 0 && requestUrl.pathname === sourceCssPath) setTimeout(send, delay);
            else send();
            return;
          }
          const transformed = Buffer.from(
            transformHtml(body.toString(), arm, requestUrl.pathname, delay)
          );
          sendBuffer(
            response,
            upstreamResponse.statusCode || 200,
            headers,
            transformed,
            incoming.headers["accept-encoding"]
          );
        } catch (error) {
          response.writeHead(500, { "content-type": "text/plain" });
          response.end(error.stack);
        }
      });
    }
  );
  upstreamRequest.on("error", (error) => {
    response.writeHead(502, { "content-type": "text/plain" });
    response.end(error.stack);
  });
  incoming.pipe(upstreamRequest);
});

server.listen(listenPort, "127.0.0.1", () => {
  console.log(`PERF-051 proxy listening on http://127.0.0.1:${listenPort}`);
});
