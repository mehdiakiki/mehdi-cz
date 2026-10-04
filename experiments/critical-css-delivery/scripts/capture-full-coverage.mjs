import { writeFile } from "node:fs/promises";
import { Cdp, sleep } from "./cdp.mjs";
import { origin, profiles, resultsRoot, routes, sourceCssPath } from "./config.mjs";

const cdp = new Cdp();
await cdp.connect();
const rows = [];

try {
  for (const [profileName, profile] of Object.entries(profiles)) {
    for (const route of routes) {
      for (const theme of ["light", "dark"]) {
        const page = await cdp.page(profile);
        const headers = new Map();
        const listen = (message) => {
          if (message.sessionId === page.sessionId && message.method === "CSS.styleSheetAdded") {
            headers.set(message.params.header.styleSheetId, message.params.header);
          }
        };
        cdp.listeners.add(listen);
        try {
          await page.send("DOM.enable");
          await page.send("CSS.enable");
          await page.send("Page.addScriptToEvaluateOnNewDocument", {
            source: `try{localStorage.setItem('theme','${theme}')}catch{}`,
          });
          await page.send("CSS.startRuleUsageTracking");
          await page.navigate(`${origin}${route.pathname}`);
          await sleep(100);
          const { coverage } = await page.send("CSS.takeCoverageDelta");
          const sheet = [...headers.entries()].find(([, header]) =>
            header.sourceURL.includes(sourceCssPath)
          );
          if (!sheet) throw new Error(`${route.name}: source stylesheet not found`);
          const [styleSheetId] = sheet;
          const ranges = coverage
            .filter((entry) => entry.used && entry.styleSheetId === styleSheetId)
            .map(({ startOffset, endOffset }) => [startOffset, endOffset]);
          rows.push({
            profile: profileName,
            route: route.name,
            state: `initial-${theme}`,
            ranges,
            coveredBytes: ranges.reduce((total, [start, end]) => total + end - start, 0),
          });
          await page.send("CSS.stopRuleUsageTracking");
          console.log(`${profileName}/${route.name}/${theme}: captured`);
        } finally {
          cdp.listeners.delete(listen);
          await page.close();
        }
      }
    }
  }
} finally {
  cdp.close();
}

await writeFile(
  `${resultsRoot}/full-css-coverage.json`,
  `${JSON.stringify({ browser: cdp.version, rows }, null, 2)}\n`
);
