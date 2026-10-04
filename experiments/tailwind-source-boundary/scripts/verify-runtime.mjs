import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Cdp, routes, sleep } from './cdp.mjs';
const out='experiments/tailwind-source-boundary/results';
const cdp=new Cdp();await cdp.connect();const rows=[];
const state=`(() => ({pathname:location.pathname,title:document.title,heading:document.querySelector('h1')?.textContent,mainText:document.querySelector('main')?.textContent,styles:[...document.styleSheets].map(s=>s.href&&new URL(s.href).pathname).filter(Boolean),css:performance.getEntriesByType('resource').filter(r=>r.name.includes('.css')).map(r=>({path:new URL(r.name).pathname,transfer:r.transferSize,encoded:r.encodedBodySize})),cls:window.__shifts?.reduce((s,e)=>s+e,0)||0,styleProbe:[...document.querySelectorAll('h1,h2,p,pre,header,footer')].map(e=>{const s=getComputedStyle(e);const r=e.getBoundingClientRect();return {tag:e.tagName,rect:[r.width,r.height],font:s.fontFamily,color:s.color,display:s.display}})}))()`;
async function until(page,expression){for(let i=0;i<80;i++){if(await page.evaluate(expression))return;await sleep(100);}throw Error(`Timed out: ${expression}`);}
try{
  for(const [route,pathname] of routes){
    const arms={};for(const variant of ['automatic','bounded']){
      const page=await cdp.page('mobile');try{
        await page.send('Emulation.setScriptExecutionDisabled',{value:true});
        await page.navigate(`http://127.0.0.1:${variant==='automatic'?3151:3152}${pathname}`);await sleep(200);
        arms[variant]=await page.evaluate(state);
      }finally{await page.close();}
    }
    assert.deepEqual(arms.automatic.styleProbe,arms.bounded.styleProbe);
    assert.equal(arms.automatic.mainText,arms.bounded.mainText);
    rows.push({kind:'no-js',route,pass:true,heading:arms.bounded.heading,styles:arms.bounded.styles});
  }
  for(const variant of ['automatic','bounded']){
    const page=await cdp.page('desktop');const origin=`http://127.0.0.1:${variant==='automatic'?3151:3152}`;const errors=[];
    const listen=m=>{if(m.sessionId===page.sessionId&&m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};cdp.listeners.add(listen);
    try{
      await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__shifts=[];new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__shifts.push(e.value)}).observe({type:'layout-shift',buffered:true});`});
      await page.navigate(origin+'/');await sleep(400);const initial=await page.evaluate(state);
      await page.navigate(origin+'/blog');await sleep(400);const warm=await page.evaluate(state);
      assert.equal(warm.css.find(r=>r.path.includes('a148221dd5f19252.css'))?.transfer,0);
      await page.evaluate(`window.__navigationProof='kept';document.querySelector('header a[href="/"]').click()`);
      await until(page,`location.pathname==='/'`);await sleep(500);
      assert.equal(await page.evaluate(`window.__navigationProof`),'kept');
      await page.evaluate(`document.querySelector('header a[href="/blog"]').click()`);
      await until(page,`location.pathname==='/blog'`);await sleep(500);
      assert.equal(await page.evaluate(`window.__navigationProof`),'kept');
      const soft=await page.evaluate(state);assert.ok(soft.heading);assert.equal(soft.styles.filter(s=>s.includes('a148221dd5f19252.css')).length,1);
      await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'k',code:'KeyK',modifiers:2});
      await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'k',code:'KeyK',modifiers:2});
      await until(page,`document.activeElement?.getAttribute('role')==='combobox'`);
      await page.send('Input.insertText',{text:'rust'});
      await until(page,`document.querySelectorAll('[role="option"]').length>0`);
      const results=await page.evaluate(`document.querySelectorAll('[role="option"]').length`);
      await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
      await until(page,`!document.querySelector('[role="dialog"]')`);
      assert.equal(errors.length,0);assert.equal(soft.cls,0);
      rows.push({kind:'journey',variant,initialCss:initial.css,warmCss:warm.css,softStyles:soft.styles,softHeading:soft.heading,documentPreserved:true,cls:soft.cls,keyboardSearchResults:results,exceptions:errors});
    }finally{cdp.listeners.delete(listen);await page.close();}
  }
}finally{cdp.close();}
await writeFile(`${out}/runtime-verification.json`,JSON.stringify({browser:cdp.version,rows},null,2)+'\n');console.log(rows);
