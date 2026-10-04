import {readFile,writeFile} from 'node:fs/promises';
import {Cdp,sleep} from './cdp.mjs';
const out='experiments/tailwind-source-boundary/results';
const html=await readFile('.next-perf049/server/app/index.html','utf8');
const fonts=[...new Set([...html.matchAll(/href="([^"]+\.woff2)"/g)].map(m=>m[1]))];
if(!fonts.length)throw Error('Font preload inventory missing');
const cdp=new Cdp();await cdp.connect();const rows=[];
const observer=`window.__layout={shifts:[],fonts:[]};new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__layout.shifts.push({time:e.startTime,value:e.value,sources:e.sources.map(s=>({tag:s.node?.nodeName,cls:s.node?.getAttribute?.('class'),text:s.node?.textContent?.slice(0,120),previous:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))})}).observe({type:'layout-shift',buffered:true});document.fonts.addEventListener('loadingdone',()=>window.__layout.fonts.push(performance.now()));`;
try{
  for(const [route,pathname] of [['home','/'],['code','/blog/load-balancer-sticky-sessions-course']])for(let rep=0;rep<3;rep++)for(const fontState of ['cold','warm'])for(const variant of rep%2?['bounded','automatic']:['automatic','bounded']){
    const page=await cdp.page('desktop',true);const origin=`http://127.0.0.1:${variant==='automatic'?3151:3152}`;
    try{
      if(fontState==='warm'){
        await page.navigate(origin+'/robots.txt');
        await page.evaluate(`Promise.all(${JSON.stringify(fonts)}.map(url=>fetch(url).then(r=>{if(!r.ok)throw Error('Font prime failed');return r.arrayBuffer()})))`);
      }
      await page.send('Page.addScriptToEvaluateOnNewDocument',{source:observer});
      await page.navigate(origin+pathname);await sleep(700);
      const result=await page.evaluate(`({...window.__layout,fontRequests:performance.getEntriesByType('resource').filter(e=>e.name.includes('.woff2')).map(e=>({path:new URL(e.name).pathname,transfer:e.transferSize,start:e.startTime,end:e.responseEnd})),fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime})`);
      rows.push({route,rep,fontState,variant,...result,cls:result.shifts.reduce((n,s)=>n+s.value,0)});
      await writeFile(`${out}/shift-attribution.json`,JSON.stringify({browser:cdp.version,method:'Exploratory factorial after primary timing. Desktop, same shaping. Prime only font responses on same-origin robots.txt in a fresh context before loading page; CSS remains cold. Record cache transfer, loadingdone, and shift-source rectangles.',fonts,rows},null,2)+'\n');
      console.log(`${route}/${rep}/${fontState}/${variant}: CLS ${rows.at(-1).cls}`);
    }finally{await page.close();}
  }
}finally{cdp.close();}
