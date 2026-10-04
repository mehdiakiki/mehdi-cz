import { brotliCompressSync, gzipSync } from "node:zlib";

const origin = process.env.MEASURE_ORIGIN || "http://127.0.0.1:3116";
const routes = ["/server", "/client-props", "/client-fetch", "/document", "/records"];

const inlineFlightPattern = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;

const decodeFlight = (html) =>
  [...html.matchAll(inlineFlightPattern)].map((match) => JSON.parse(match[1])).join("");

const measure = async (route) => {
  const response = await fetch(`${origin}${route}`, {
    headers: route === "/records" ? {} : { Accept: "text/html" },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const text = bytes.toString("utf8");
  const flight = route === "/records" || route === "/document" ? "" : decodeFlight(text);

  return {
    route,
    status: response.status,
    contentType: response.headers.get("content-type"),
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
    brotliBytes: brotliCompressSync(bytes).length,
    decodedFlightBytes: Buffer.byteLength(flight),
    flightShare: bytes.length ? Number((Buffer.byteLength(flight) / bytes.length).toFixed(3)) : 0,
    recordMarkers: text.match(/RBD-\d{4}-[a-z0-9]+/g)?.length ?? 0,
    renderedArticles: text.match(/<article(?: |>|\n)/g)?.length ?? 0,
  };
};

const results = [];
for (const route of routes) results.push(await measure(route));

console.table(results);
console.log(JSON.stringify({ next: "16.3.4", react: "19.2.8", origin, results }, null, 2));
