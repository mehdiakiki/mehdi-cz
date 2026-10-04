import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const output = path.resolve('experiments/tailwind-source-boundary/results');
// Keep the temporary fixture beside the project so package imports resolve.
const fixture = await mkdtemp(path.join(output, 'fixture-'));
const digest = x => createHash('sha256').update(x).digest('hex');
try {
  await mkdir(path.join(fixture, 'app')); await mkdir(path.join(fixture, 'research'));
  await writeFile(path.join(fixture,'tailwind.config.cjs'), 'module.exports = { content: ["./app/**/*.tsx"] };\n');
  await writeFile(path.join(fixture,'app/page.tsx'), '<div className="p-4 text-red-500">Hello</div>');
  async function compile(bounded) {
    const css = '@config "./tailwind.config.cjs";\n@import "tailwindcss"' + (bounded ? ' source(none)' : '') + ';';
    const r = await postcss([tailwind({ base: fixture, optimize: { minify: true } })]).process(css, { from: path.join(fixture, `${bounded?'bounded':'auto'}-${Math.random()}.css`), map:false });
    return { css:r.css, raw:Buffer.byteLength(r.css), sha256:digest(r.css) };
  }
  const before = { automatic:await compile(false), bounded:await compile(true) };
  await writeFile(path.join(fixture,'research/notes.md'), 'A non-UI experiment mentions z-[918273] and w-[137px].\n');
  const poisoned = { automatic:await compile(false), bounded:await compile(true) };
  assert.notEqual(before.automatic.sha256,poisoned.automatic.sha256);
  assert.equal(before.bounded.sha256,poisoned.bounded.sha256);
  assert.match(poisoned.automatic.css,/918273/); assert.doesNotMatch(poisoned.bounded.css,/918273/);
  await writeFile(path.join(fixture,'app/real.tsx'), '<div className="h-[271px]">Real UI</div>');
  const realSource = await compile(true);
  assert.notEqual(realSource.sha256,poisoned.bounded.sha256); assert.match(realSource.css,/271px/);
  const strip = ({ css, ...rest }) => rest;
  const result = { capturedAt:new Date().toISOString(), tailwind:JSON.parse(await readFile('node_modules/tailwindcss/package.json','utf8')).version,
    method:'A legacy content array coexists with automatic v4 discovery. The only treatment is source(none). Non-UI poison and configured UI additions are independent controls.',
    before:Object.fromEntries(Object.entries(before).map(([k,v])=>[k,strip(v)])),
    poisoned:Object.fromEntries(Object.entries(poisoned).map(([k,v])=>[k,strip(v)])), realSource:strip(realSource),
    assertions: { autoIncludesResearch:true, boundedRejectsResearch:true, boundedIncludesNewApplicationSource:true },
  };
  await writeFile(path.join(output,'boundary-proof.json'),JSON.stringify(result,null,2)+'\n'); console.log(result);
} finally { await rm(fixture,{recursive:true,force:true}); }
