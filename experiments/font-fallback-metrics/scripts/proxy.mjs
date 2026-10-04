import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const variant = process.argv[2];
const port = Number(process.argv[3]);
if (!['control', 'candidate'].includes(variant) || !Number.isInteger(port)) {
  throw new Error('Usage: node proxy.mjs <control|candidate> <port>');
}

const outputDirectory = 'experiments/font-fallback-metrics/results';
const cssPath = '/_next/static/css/ebc471532293f512.css';
const fontPath = '/_next/static/media/5a0c43ffa288c21a-s.p.woff2';
const upstreamPort = Number(process.env.PERF056_UPSTREAM_PORT || 3150);
const fontDelay = Number(process.env.PERF056_FONT_DELAY_MS || 0);
const derivation = JSON.parse(await readFile(`${outputDirectory}/derivation.json`, 'utf8'));
const original = await readFile('.next-perf050/static/css/ebc471532293f512.css', 'utf8');
const controlDeclaration = '@font-face{font-family:space_grotesk Fallback;src:local("Arial");ascent-override:88.78%;descent-override:26.34%;line-gap-override:0.00%;size-adjust:110.84%}';
const metrics = derivation.candidate;
const candidateDeclaration = `@font-face{font-family:space_grotesk Fallback;src:local("Arial");ascent-override:${metrics.ascentOverride.toFixed(2)}%;descent-override:${metrics.descentOverride.toFixed(2)}%;line-gap-override:${metrics.lineGapOverride.toFixed(2)}%;size-adjust:${metrics.sizeAdjust.toFixed(2)}%}`;
if (original.split(controlDeclaration).length !== 2) throw new Error('Expected exactly one generated fallback declaration');
const contents = Buffer.from(variant === 'candidate'
  ? original.replace(controlDeclaration, candidateDeclaration)
  : original);
const compressed = gzipSync(contents);
const etag = `"${createHash('sha256').update(contents).digest('hex')}"`;
await mkdir(`${outputDirectory}/assets`, { recursive: true });
await writeFile(`${outputDirectory}/assets/${variant}.css`, contents);

const server = http.createServer((request, response) => {
  const pathname = request.url.split('?')[0];
  if (pathname === cssPath) {
    const gzip = /\bgzip\b/.test(request.headers['accept-encoding'] || '');
    const data = gzip ? compressed : contents;
    const headers = {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      Vary: 'Accept-Encoding', ETag: etag,
      ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
    };
    if (request.headers['if-none-match'] === etag) {
      response.writeHead(304, headers); response.end(); return;
    }
    response.writeHead(200, { ...headers, 'Content-Length': data.length });
    response.end(data); return;
  }

  const forward = () => {
    const upstream = http.request({
      hostname: '127.0.0.1', port: upstreamPort, path: request.url,
      method: request.method,
      headers: { ...request.headers, host: `127.0.0.1:${upstreamPort}` },
    }, upstreamResponse => {
      response.writeHead(upstreamResponse.statusCode, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstream.on('error', error => { response.writeHead(502); response.end(error.message); });
    request.pipe(upstream);
  };
  if (pathname === fontPath && fontDelay > 0) setTimeout(forward, fontDelay);
  else forward();
});

server.listen(port, '127.0.0.1', () => {
  console.log(`${variant}: http://127.0.0.1:${port} (font delay ${fontDelay} ms)`);
});

