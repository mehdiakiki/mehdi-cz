import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import selectorParser from 'postcss-selector-parser';
import postcss from 'postcss';
const output = 'experiments/tailwind-source-boundary/results';
const variants={};
for(const variant of ['automatic','bounded']){
  const css=await readFile(`${output}/assets/${variant}.css`,'utf8');const classes=new Set();
  postcss.parse(css).walkRules(rule=>selectorParser(root=>root.walkClasses(node=>classes.add(node.value))).processSync(rule.selector));
  variants[variant]={css,classes};
}
const removed=[...variants.automatic.classes].filter(c=>!variants.bounded.classes.has(c));
const added=[...variants.bounded.classes].filter(c=>!variants.automatic.classes.has(c));
const matches=[];let htmlFiles=0;let htmlBytes=0;let classAttributes=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
  const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);
  else if(entry.name.endsWith('.html')){
    const html=await readFile(p,'utf8');htmlFiles++;htmlBytes+=Buffer.byteLength(html);
    for(const m of html.matchAll(/\bclass="([^"]*)"/g)){
      classAttributes++;
      // HTML source attributes only: code examples encode quotes as &quot;;
      // Flight escapes JSON quotes with backslashes. Neither matches this form.
      for(const name of m[1].replaceAll('&amp;','&').split(/\s+/))if(removed.includes(name))matches.push({path:p,class:name});
    }
  }
}}
await walk('.next-perf049/server/app');
const dependencies={};for(const variant of ['automatic','bounded']){
  const manifest=JSON.parse(await readFile(`${output}/${variant}-compile.json`,'utf8'));
  const groups={};let bytes=0;let missing=0;
  for(const p of manifest.dependencies){try{const s=await stat(p);bytes+=s.size;const group=path.relative(process.cwd(),p).split(path.sep)[0];groups[group]=(groups[group]||0)+1;}catch{missing++;}}
  dependencies[variant]={count:manifest.dependencies.length,registeredFileBytes:bytes,missing,groups,
    caveat:'Registered dependency sizes are not measured physical I/O or proof that every binary byte was parsed.'};
}
const result={capturedAt:new Date().toISOString(),removedClasses:removed,addedClasses:added,htmlFiles,htmlBytes,classAttributes,matches,dependencies,
  tailwindInputSha256:createHash('sha256').update(await readFile(`${output}/input-before.css`)).digest('hex'),
  tailwindConfigSha256:createHash('sha256').update(await readFile('tailwind.config.cjs')).digest('hex')};
await writeFile(`${output}/artifact-audit.json`,JSON.stringify(result,null,2)+'\n');
console.log({removed:removed.length,added:added.length,htmlFiles,classAttributes,matches:matches.length,dependencies});
assert.equal(matches.length,0,'A removed class occurs in built HTML');
