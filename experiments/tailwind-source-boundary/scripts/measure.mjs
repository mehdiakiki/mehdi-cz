import { writeFile } from 'node:fs/promises';
import { Cdp, routes, sleep } from './cdp.mjs';
const out = 'experiments/tailwind-source-boundary/results';
const cdp = new Cdp(); await cdp.connect(); const rows = [];
const repetitions = Number(process.env.PERF050_REPETITIONS || 8);
const profiles = (process.env.PERF050_PROFILES || 'mobile,desktop').split(',');
const observe = `window.__perf050={lcp:0,shifts:[],longTasks:[]};new PerformanceObserver(l=>{window.__perf050.lcp=l.getEntries().at(-1).startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__perf050.shifts.push({time:e.startTime,value:e.value})}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())window.__perf050.longTasks.push({time:e.startTime,duration:e.duration})}).observe({type:'longtask',buffered:true});`;
try {
  for (const profile of profiles) for (const [route, pathname] of routes) for (let rep=0;rep<repetitions;rep++) {
    for (const variant of rep%2 ? ['bounded','automatic'] : ['automatic','bounded']) {
      const page = await cdp.page(profile,true);
      try {
        await page.send('Page.addScriptToEvaluateOnNewDocument',{source:observe});
        await page.navigate(`http://127.0.0.1:${variant==='automatic'?3151:3152}${pathname}`);
        await sleep(700);
        const metrics = await page.evaluate(`(() => {const n=performance.getEntriesByType('navigation')[0];const r=performance.getEntriesByType('resource');return {...window.__perf050,cls:window.__perf050.shifts.reduce((s,e)=>s+e.value,0),fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,load:n.loadEventEnd,ttfb:n.responseStart,domContentLoaded:n.domContentLoadedEventEnd,documentBytes:n.transferSize,resources:r.map(e=>({path:new URL(e.name).pathname,transfer:e.transferSize,encoded:e.encodedBodySize,decoded:e.decodedBodySize,start:e.startTime,end:e.responseEnd,blocking:e.renderBlockingStatus})),heading:document.querySelector('h1')?.textContent}})()`);
        if (!metrics.fcp || !metrics.lcp || !metrics.heading) throw new Error('Invalid measured page');
        rows.push({profile,route,rep,variant,...metrics});
        await writeFile(`${out}/measurement.json`,JSON.stringify({browser:cdp.version,capturedAt:new Date().toISOString(),profile:'Both viewports use 150ms RTT, 1.6Mbps down, 750kbps up, 4x CPU; fresh context per navigation; matched proxy only substitutes CSS; samples end 700ms after load.',rows},null,2)+'\n');
        console.log(`${profile}/${route}/${rep}/${variant}: LCP ${metrics.lcp}, load ${metrics.load.toFixed(1)}, CLS ${metrics.cls}`);
      } finally {await page.close();}
    }
  }
} finally {cdp.close();}
