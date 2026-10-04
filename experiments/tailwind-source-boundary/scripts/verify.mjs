import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { Cdp, routes, sleep } from './cdp.mjs';
const out = 'experiments/tailwind-source-boundary/results';
await mkdir(`${out}/screenshots`,{recursive:true});
const cdp = new Cdp();await cdp.connect();const rows=[];
const digest=x=>createHash('sha256').update(x).digest('hex');
const snapshot = `(() => {const properties=['display','position','width','height','color','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight','paddingTop','paddingLeft','marginTop','borderTopWidth','borderTopColor','overflow','gap'];return [...document.body.querySelectorAll('*')].filter(e=>!['SCRIPT','STYLE','LINK','NEXTJS-PORTAL'].includes(e.tagName)).map(e=>{const s=getComputedStyle(e);const r=e.getBoundingClientRect();return {tag:e.tagName,cls:e.getAttribute('class'),text:e.childNodes.length===1&&e.firstChild.nodeType===3?e.textContent:null,rect:[r.x,r.y,r.width,r.height],styles:properties.map(p=>s[p])}})})()`;
try {
  for(const profile of ['mobile','desktop']) for(const [route,pathname] of routes){
    const arms={};
    for(const variant of ['automatic','bounded']){
      const page=await cdp.page(profile);const states={};
      try{
        await page.navigate(`http://127.0.0.1:${variant==='automatic'?3151:3152}${pathname}`);await sleep(500);
        await page.evaluate(`document.documentElement.style.scrollBehavior='auto'`);
        async function capture(state){
          await sleep(150);
          await page.evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
          await page.evaluate(`Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))`);
          const dom=await page.evaluate(snapshot);
          const {data}=await page.send('Page.captureScreenshot',{format:'png'});
          const buffer=Buffer.from(data,'base64');
          await writeFile(`${out}/screenshots/${profile}-${route}-${state}-${variant}.png`,buffer);
          const meta=await sharp(buffer).metadata();
          const pixels=await sharp(buffer).extract({left:0,top:0,width:meta.width-4,height:meta.height}).removeAlpha().raw().toBuffer();
          states[state]={dom,domHash:digest(JSON.stringify(dom)),pixelHash:digest(pixels),pixels};
        }
        await capture('initial-light');
        await page.evaluate(`scrollTo(0,document.body.scrollHeight)`);await sleep(500);await capture('footer-light');
        await page.evaluate(`scrollTo(0,0);document.documentElement.classList.add('dark')`);await capture('initial-dark');
        await page.evaluate(`document.querySelector('button[aria-label="Search"]').click()`);await sleep(600);
        await page.evaluate(`document.querySelector('[role="combobox"]').blur()`);await capture('search-dark');
        await page.evaluate(`document.querySelector('button[aria-label="Close search"]').click()`);
        if(profile==='mobile'){
          await page.evaluate(`document.querySelector('button[aria-label="Open menu"]').click()`);await sleep(300);await capture('menu-dark');
        }
        arms[variant]=states;
      }finally{await page.close();}
    }
    for(const state of Object.keys(arms.automatic)){
      const a=arms.automatic[state],b=arms.bounded[state];
      let changed=0;assert.equal(a.pixels.length,b.pixels.length);
      for(let i=0;i<a.pixels.length;i+=3)if(a.pixels[i]!==b.pixels[i]||a.pixels[i+1]!==b.pixels[i+1]||a.pixels[i+2]!==b.pixels[i+2])changed++;
      const row={profile,route,state,domEqual:a.domHash===b.domHash,changedPixels:changed,automaticHash:a.pixelHash,boundedHash:b.pixelHash};rows.push(row);
      if(!row.domEqual)await writeFile(`${out}/screenshots/${profile}-${route}-${state}-dom-diff.json`,JSON.stringify({automatic:a.dom,bounded:b.dom},null,2));
    }
    await writeFile(`${out}/visual-verification.json`,JSON.stringify({browser:cdp.version,method:'Exact pixel comparison excluding rightmost four physical scrollbar pixels; DOM computed styles and geometry; full source images retained.',rows},null,2)+'\n');
    console.log(`${profile}/${route}: ${rows.filter(r=>r.profile===profile&&r.route===route).map(r=>`${r.state}=${r.changedPixels}px/dom:${r.domEqual}`).join(', ')}`);
  }
}finally{cdp.close();}
assert.ok(rows.every(r=>r.domEqual&&r.changedPixels===0),'Visual or DOM comparison failed; investigate retained differences');
