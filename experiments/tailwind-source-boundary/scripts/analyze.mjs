import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const out='experiments/tailwind-source-boundary/results';
const input=JSON.parse(await readFile(`${out}/measurement.json`,'utf8'));
const median=x=>{const s=x.toSorted((a,b)=>a-b);return (s[Math.floor((s.length-1)/2)]+s[Math.floor(s.length/2)])/2;};
let seed=50050;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
function interval(values){const samples=Array.from({length:10000},()=>median(values.map(()=>values[Math.floor(random()*values.length)]))).sort((a,b)=>a-b);return[samples[249],samples[9749]];}
const groups=[];
for(const profile of [...new Set(input.rows.map(r=>r.profile))])for(const route of [...new Set(input.rows.map(r=>r.route))]){
  const rows=input.rows.filter(r=>r.profile===profile&&r.route===route);
  const pairs=[];for(const rep of [...new Set(rows.map(r=>r.rep))]){
    const a=rows.find(r=>r.rep===rep&&r.variant==='automatic'),b=rows.find(r=>r.rep===rep&&r.variant==='bounded');
    if(a&&b)pairs.push({a,b});
  }
  if(!pairs.length)continue;
  const metrics={};for(const key of ['lcp','fcp','load','domContentLoaded']){
    const differences=pairs.map(({a,b})=>b[key]-a[key]);metrics[key]={automaticMedian:median(pairs.map(p=>p.a[key])),boundedMedian:median(pairs.map(p=>p.b[key])),pairedMedian:median(differences),bootstrap95:interval(differences),improved:differences.filter(x=>x<0).length,tied:differences.filter(x=>x===0).length,differences};
  }
  groups.push({profile,route,pairs:pairs.length,metrics});
}
const assets={};for(const variant of ['automatic-complete','bounded-complete','retained']){
  const buffer=await readFile(`${out}/assets/${variant}.css`);assets[variant]={raw:buffer.length,gzip:gzipSync(buffer).length,brotli:brotliCompressSync(buffer).length,sha256:createHash('sha256').update(buffer).digest('hex')};
}
const summary={capturedAt:new Date().toISOString(),browser:input.browser,sampleCount:input.rows.length,method:'Median of within-repetition candidate-minus-control deltas. 10,000 deterministic paired bootstrap resamples; percentile 95% intervals. Small lab samples; no multiplicity-adjusted significance or field claim.',groups,assets,nonzeroCls:input.rows.filter(r=>r.cls>0).map(r=>({profile:r.profile,route:r.route,rep:r.rep,variant:r.variant,cls:r.cls})),cssResources:input.rows.map(r=>({profile:r.profile,route:r.route,rep:r.rep,variant:r.variant,...r.resources.find(x=>x.path.includes('a148221dd5f19252.css'))}))};
await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2)+'\n');
console.log(groups.map(g=>({profile:g.profile,route:g.route,n:g.pairs,lcp:g.metrics.lcp.pairedMedian,lcp95:g.metrics.lcp.bootstrap95,load:g.metrics.load.pairedMedian})));
