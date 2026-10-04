import { mkdir, writeFile } from 'node:fs/promises';
import { Cdp, routes, sleep } from './cdp.mjs';
const out = 'experiments/tailwind-source-boundary/results';
await mkdir(out, { recursive: true });
const cdp = new Cdp(); await cdp.connect();
const rows = []; const sheets = {};
try {
  for (const profile of ['mobile', 'desktop']) for (const [route, pathname] of routes) {
    const page = await cdp.page(profile);
    const headers = new Map();
    const listen = m => { if (m.sessionId === page.sessionId && m.method === 'CSS.styleSheetAdded') headers.set(m.params.header.styleSheetId, m.params.header); };
    cdp.listeners.add(listen);
    try {
      await page.send('DOM.enable'); await page.send('CSS.enable');
      await page.send('CSS.startRuleUsageTracking');
      await page.navigate('http://127.0.0.1:3150' + pathname); await sleep(350);
      const used = new Map();
      async function capture(state) {
        const { coverage } = await page.send('CSS.takeCoverageDelta');
        for (const r of coverage) if (r.used) used.set(`${r.styleSheetId}:${r.startOffset}:${r.endOffset}`, r);
        const css = [];
        for (const [id, header] of headers) {
          if (!header.sourceURL.includes('/static/css/a148221dd5f19252.css')) continue;
          const { text } = await page.send('CSS.getStyleSheetText', { styleSheetId: id });
          const key = new URL(header.sourceURL).pathname;
          sheets[key] = text;
          const ranges = [...used.values()].filter(r => r.styleSheetId === id).map(({ startOffset, endOffset }) => [startOffset, endOffset]);
          // CDP rule coverage counts matching rules anywhere in the document.
          // It does not establish viewport criticality or authorize deletion.
          css.push({ path: key, totalBytes: Buffer.byteLength(text), usedRanges: ranges, usedRuleBytes: ranges.reduce((n, [s,e]) => n + Buffer.byteLength(text.slice(s,e)), 0) });
        }
        const dom = await page.evaluate(`(() => ({ title: document.title, heading: document.querySelector('h1')?.textContent, nodes: document.querySelectorAll('*').length, viewport: [innerWidth, innerHeight], height: document.documentElement.scrollHeight, dialog: !!document.querySelector('[role="dialog"]'), visibleClasses: [...new Set([...document.querySelectorAll('[class]')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width && r.height; }).flatMap(e => [...e.classList]))].sort() }))()`);
        rows.push({ profile, route, state, css, dom });
        await writeFile(`${out}/coverage.json`, JSON.stringify({ browser: cdp.version, note: 'Cumulative matched-rule coverage; not first-paint critical CSS', rows }, null, 2) + '\n');
      }
      await capture('initial-light');
      await page.evaluate(`document.documentElement.style.scrollBehavior='auto';scrollTo(0,document.body.scrollHeight)`); await sleep(500); await capture('scrolled-light');
      await page.evaluate(`scrollTo(0,0);document.documentElement.classList.add('dark')`); await sleep(100); await capture('initial-dark');
      await page.evaluate(`document.querySelector('button[aria-label="Search"]').click()`); await sleep(500);
      await page.evaluate(`(() => { const el=document.querySelector('[role="combobox"]'); if(!el) throw Error('Search did not open'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(el,'rust');el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
      await sleep(250); await capture('search-dark');
      await page.send('CSS.stopRuleUsageTracking');
      console.log(`${profile}/${route}: 4 states`);
    } finally { cdp.listeners.delete(listen); await page.close(); }
  }
  await writeFile(`${out}/coverage-stylesheets.json`, JSON.stringify(sheets, null, 2) + '\n');
} finally { cdp.close(); }
