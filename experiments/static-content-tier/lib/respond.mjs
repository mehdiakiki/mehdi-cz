import zlib from "node:zlib";

export function compressedHtmlResponse(request, html, extraHeaders = {}) {
  const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(
    request.headers.get("accept-encoding") || ""
  );
  const body = acceptsGzip ? zlib.gzipSync(Buffer.from(html), { level: 9 }) : html;

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=0, must-revalidate",
      "content-type": "text/html; charset=utf-8",
      vary: "Accept-Encoding",
      ...(acceptsGzip ? { "content-encoding": "gzip" } : {}),
      ...extraHeaders,
    },
  });
}
