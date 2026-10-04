import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Cdp, routes, sleep } from '../../tailwind-source-boundary/scripts/cdp.mjs';

const outputDirectory = 'experiments/font-fallback-metrics/results';
const repetitions = Number(process.env.PERF056_REPETITIONS || 8);
const profiles = (process.env.PERF056_PROFILES || 'mobile,desktop').split(',');
const ports = { control: 3161, candidate: 3162 };
const derivation = JSON.parse(await readFile(`${outputDirectory}/derivation.json`, 'utf8'));
const rows = [];
const observer = `window.__perf056={lcp:0,shifts:[],fontEvents:[],errors:[]};
new PerformanceObserver(list=>{window.__perf056.lcp=list.getEntries().at(-1)?.startTime||0}).observe({type:'largest-contentful-paint',buffered:true});
new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__perf056.shifts.push({time:entry.startTime,value:entry.value,sources:entry.sources.map(source=>({tag:source.node?.nodeName,className:source.node?.getAttribute?.('class'),text:source.node?.textContent?.slice(0,160),previous:source.previousRect.toJSON(),current:source.currentRect.toJSON()}))})}).observe({type:'layout-shift',buffered:true});
document.fonts.addEventListener('loadingdone',event=>window.__perf056.fontEvents.push({type:'done',time:performance.now(),families:[...event.fontfaces].map(face=>face.family)}));
document.fonts.addEventListener('loadingerror',event=>window.__perf056.fontEvents.push({type:'error',time:performance.now(),families:[...event.fontfaces].map(face=>face.family)}));
addEventListener('error',event=>window.__perf056.errors.push({type:'error',message:event.message}));
addEventListener('unhandledrejection',event=>window.__perf056.errors.push({type:'unhandledrejection',message:String(event.reason)}));`;

await mkdir(outputDirectory, { recursive: true });
const cdp = new Cdp();
await cdp.connect();

try {
  for (const profile of profiles) for (const [route, pathname] of routes) for (let repetition = 0; repetition < repetitions; repetition += 1) {
    const order = repetition % 2 ? ['candidate', 'control'] : ['control', 'candidate'];
    for (const variant of order) {
      const page = await cdp.page(profile, true);
      try {
        await page.send('Page.addScriptToEvaluateOnNewDocument', { source: observer });
        await page.navigate(`http://127.0.0.1:${ports[variant]}${pathname}`);
        await sleep(700);
        const metrics = await page.evaluate(`(() => {
          const navigation=performance.getEntriesByType('navigation')[0];
          const resources=performance.getEntriesByType('resource').map(entry=>({path:new URL(entry.name).pathname,transfer:entry.transferSize,encoded:entry.encodedBodySize,decoded:entry.decodedBodySize,start:entry.startTime,end:entry.responseEnd,blocking:entry.renderBlockingStatus}));
          const fontFaces=[...document.fonts].map(face=>({family:face.family,status:face.status,weight:face.weight,style:face.style,display:face.display}));
          return {...window.__perf056,
            cls:window.__perf056.shifts.reduce((sum,entry)=>sum+entry.value,0),
            fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime||0,
            load:navigation.loadEventEnd,ttfb:navigation.responseStart,
            domContentLoaded:navigation.domContentLoadedEventEnd,
            documentBytes:navigation.transferSize,resources,fontFaces,
            fontsStatus:document.fonts.status,
            primaryReady:document.fonts.check('400 16px space_grotesk'),
            heading:document.querySelector('h1')?.textContent||null,
          };
        })()`);
        if (!metrics.fcp || !metrics.lcp || !metrics.heading) throw new Error(`Invalid measured page: ${profile}/${route}/${variant}`);
        rows.push({ profile, route, pathname, repetition, variant, ...metrics });
        await writeFile(`${outputDirectory}/measurement.json`, JSON.stringify({
          browser: cdp.version,
          capturedAt: new Date().toISOString(),
          candidate: derivation.candidate,
          profile: 'Fresh context per navigation; both viewports use 150ms RTT, 1.6Mbps down, 750kbps up, and 4x CPU. Matched proxy changes only four adjusted-fallback CSS descriptors. Samples end 700ms after load.',
          rows,
        }, null, 2) + '\n');
        console.log(`${profile}/${route}/${repetition}/${variant}: LCP ${metrics.lcp.toFixed(1)}, CLS ${metrics.cls}`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  cdp.close();
}

