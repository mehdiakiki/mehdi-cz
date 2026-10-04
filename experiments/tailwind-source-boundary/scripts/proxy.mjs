import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

// Both arms use exactly this server and the same upstream production build.
const cssPath = '/_next/static/css/a148221dd5f19252.css';
const variant = process.argv[2];
const port = Number(process.argv[3]);
const contents = await readFile(`experiments/tailwind-source-boundary/results/assets/${variant}.css`);
const compressed = gzipSync(contents);
const etag = `"${createHash('sha256').update(contents).digest('hex')}"`;
http.createServer((req, res) => {
  if (req.url.split('?')[0] === cssPath) {
    const gzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    const data = gzip ? compressed : contents;
    const headers = {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      Vary: 'Accept-Encoding', ETag: etag,
      ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
    };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return; }
    res.writeHead(200, { ...headers, 'Content-Length': data.length });
    res.end(data); return;
  }
  const upstream = http.request({ hostname: '127.0.0.1', port: 3150, path: req.url,
    method: req.method, headers: { ...req.headers, host: '127.0.0.1:3150' } }, response => {
    res.writeHead(response.statusCode, response.headers); response.pipe(res);
  });
  upstream.on('error', error => { res.writeHead(502); res.end(error.message); });
  req.pipe(upstream);
}).listen(port, '127.0.0.1', () => console.log(`${variant}: http://127.0.0.1:${port}`));
