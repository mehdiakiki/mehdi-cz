import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const root = process.cwd();
const started = performance.now();
const usageBefore = process.resourceUsage();
const output = path.join(root, 'experiments/tailwind-source-boundary/results');
await mkdir(path.join(output, 'assets'), { recursive: true });
const source = await readFile(path.join(output, 'input-before.css'), 'utf8');
const variant = process.argv[2] || 'bounded';
const label = process.argv[3] || variant;
let css = variant === 'automatic' ? source : source.replace('@import "tailwindcss";', '@import "tailwindcss" source(none);');
if (variant.includes('no-data')) css += '\n@source not "../data";';
if (variant.includes('no-pliny')) css += '\n@source not "../node_modules/pliny";';
const result = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(css, {
  from: path.join(root, 'css', `perf050-${variant}.css`), map: false,
});
await writeFile(path.join(output, 'assets', `${label}.css`), result.css);
// The retained Next chunk also contains alert styling and next/font output.
// Preserve that suffix in both browser arms; compiling Tailwind alone is not
// a valid replacement for the complete chunk.
const retained = await readFile('.next-perf049/static/css/a148221dd5f19252.css', 'utf8');
const retainedRoot = postcss.parse(retained);
const suffixNode = retainedRoot.nodes.find(n => n.type === 'atrule' && n.name === 'media' && n.toString().includes('.markdown-alert'));
if (!suffixNode) throw new Error('Cannot identify retained non-Tailwind CSS boundary');
const suffix = retained.slice(suffixNode.source.start.offset);
await writeFile(path.join(output, 'assets', `${label}-complete.css`), result.css + suffix);
const stats = {
  variant, raw: Buffer.byteLength(result.css), gzip: gzipSync(result.css).length,
  brotli: brotliCompressSync(result.css).length,
  sha256: createHash('sha256').update(result.css).digest('hex'),
  dependencies: result.messages.filter(m => m.type === 'dependency').map(m => m.file),
  directories: result.messages.filter(m => m.type === 'dir-dependency').map(m => ({ dir: m.dir, glob: m.glob })),
  elapsedMs: performance.now() - started,
  userCpuMs: (process.resourceUsage().userCPUTime - usageBefore.userCPUTime) / 1000,
  systemCpuMs: (process.resourceUsage().systemCPUTime - usageBefore.systemCPUTime) / 1000,
  maxRssKiB: process.resourceUsage().maxRSS,
};
await writeFile(path.join(output, `${label}-compile.json`), JSON.stringify(stats, null, 2) + '\n');
console.log(JSON.stringify({ ...stats, dependencies: stats.dependencies.length, directories: stats.directories.length }));
