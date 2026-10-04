import { Cdp, sleep } from "./cdp.mjs";
import { profiles } from "./config.mjs";

const cdp = new Cdp();
await cdp.connect();
try {
  for (const arm of ["control", "external"]) {
    const page = await cdp.page(profiles.mobile);
    try {
      await page.send("Page.navigate", {
        url: `http://127.0.0.1:3161/?perf051=${arm}&perf051_delay=5000`,
      });
      await sleep(500);
      const state = await page.evaluate(`(() => {
        const header = document.querySelector('header');
        const nav = header?.lastElementChild;
        const menu = document.querySelector('button[aria-label="Open menu"]');
        const values = (element, properties) => Object.fromEntries(properties.map((property) => [property, getComputedStyle(element).getPropertyValue(property)]));
        return {
          readyState: document.readyState,
          fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
          viewport: [innerWidth, innerHeight],
          viewportMeta: document.querySelector('meta[name="viewport"]')?.outerHTML,
          visualViewport: [visualViewport.width, visualViewport.height, visualViewport.scale],
          screen: [screen.width, screen.height, devicePixelRatio],
          url: location.href,
          header: values(header, ['display','padding-top','padding-bottom','gap','width']),
          nav: values(nav, ['display','gap','column-gap','width']),
          menu: menu ? values(menu, ['display','width','height','margin-left','visibility']) : null,
          spacing: getComputedStyle(document.documentElement).getPropertyValue('--spacing'),
          sheets: [...document.styleSheets].map((sheet) => ({ href: sheet.href, media: sheet.media.mediaText, disabled: sheet.disabled, rules: (() => { try { return sheet.cssRules.length } catch { return null } })() })),
        };
      })()`);
      console.log(arm, JSON.stringify(state, null, 2));
    } finally {
      await page.close();
    }
  }
} finally {
  cdp.close();
}
