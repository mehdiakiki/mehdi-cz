import http from "node:http";
import zlib from "node:zlib";
import { buildVariant, routes } from "./fixture.mjs";

const port = Number(process.env.PERF045_PORT || 3123);
const upstreamUrl = new URL(process.env.PERF045_UPSTREAM || "http://127.0.0.1:3121");
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

function routeFor(pathname) {
  return routes.find((candidate) => candidate.path === pathname);
}

function serveHtml(request, response, route, variant) {
  const encoded = zlib.gzipSync(buildVariant(route, variant), { level: 6 });
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Encoding": "gzip",
    "Content-Length": String(encoded.length),
    "Content-Security-Policy": csp,
    "Content-Type": "text/html; charset=utf-8",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    Vary: "Accept-Encoding",
    "X-Content-Type-Options": "nosniff",
    "X-PERF045-Variant": variant,
  });
  if (request.method === "HEAD") response.end();
  else response.end(encoded);
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
    response.end(`PERF-045 upstream error: ${error.message}\n`);
  });
  request.pipe(upstream);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `127.0.0.1:${port}`}`);
  const route = routeFor(url.pathname);
  const variant = url.searchParams.get("perf045_variant");
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
  console.log(`PERF-045 fixture listening on http://127.0.0.1:${port}`);
  console.log(`Proxying assets to ${upstreamUrl.href}`);
});

function close() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", close);
process.on("SIGTERM", close);
