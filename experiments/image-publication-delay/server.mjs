import http from "node:http";
import zlib from "node:zlib";
import { buildVariant, prefixFlushOffset, routes } from "./fixture.mjs";

const port = Number(process.env.PERF044_PORT || 3122);
const upstreamUrl = new URL(process.env.PERF044_UPSTREAM || "http://127.0.0.1:3121");
const originalCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "worker-src 'self' blob:",
].join("; ");
const blockedScriptCsp = originalCsp.replace(
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "script-src 'none'"
);

function routeFor(pathname) {
  return routes.find((candidate) => candidate.path === pathname);
}

function htmlHeaders(variant, encodedLength) {
  return {
    "Cache-Control": "no-store",
    "Content-Encoding": "gzip",
    "Content-Length": String(encodedLength),
    "Content-Security-Policy": variant === "script-blocked" ? blockedScriptCsp : originalCsp,
    "Content-Type": "text/html; charset=utf-8",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    Vary: "Accept-Encoding",
    "X-Content-Type-Options": "nosniff",
    "X-PERF044-Variant": variant,
  };
}

function serveHtml(request, response, route, variant) {
  const html = buildVariant(route, variant);
  if (variant !== "prefix-flush" || request.method === "HEAD") {
    const encoded = zlib.gzipSync(html, { level: 6 });
    response.writeHead(200, htmlHeaders(variant, encoded.length));
    if (request.method === "HEAD") response.end();
    else response.end(encoded);
    return;
  }

  const splitAt = prefixFlushOffset(html, route.targetAlt);
  const gzip = zlib.createGzip({ level: 6 });
  const headers = htmlHeaders(variant, 0);
  delete headers["Content-Length"];
  response.writeHead(200, headers);
  gzip.pipe(response);
  gzip.write(html.slice(0, splitAt));
  gzip.flush(zlib.constants.Z_SYNC_FLUSH, () => {
    setImmediate(() => gzip.end(html.slice(splitAt)));
  });
}

function proxy(request, response) {
  const headers = { ...request.headers, host: upstreamUrl.host };
  const upstream = http.request(
    {
      protocol: upstreamUrl.protocol,
      hostname: upstreamUrl.hostname,
      port: upstreamUrl.port,
      method: request.method,
      path: request.url,
      headers,
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    }
  );
  upstream.on("error", (error) => {
    if (!response.headersSent) response.writeHead(502, { "Content-Type": "text/plain" });
    response.end(`PERF-044 upstream error: ${error.message}\n`);
  });
  request.pipe(upstream);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `127.0.0.1:${port}`}`);
  const route = routeFor(url.pathname);
  const variant = url.searchParams.get("perf044_variant");
  if (route && variant) {
    try {
      serveHtml(request, response, route, variant);
    } catch (error) {
      response.writeHead(500, { "Content-Type": "text/plain" });
      response.end(`${error.stack || error.message}\n`);
    }
    return;
  }
  proxy(request, response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`PERF-044 fixture listening on http://127.0.0.1:${port}`);
  console.log(`Proxying assets to ${upstreamUrl.href}`);
});

function close() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", close);
process.on("SIGTERM", close);
