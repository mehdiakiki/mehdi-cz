import { readFile, writeFile } from "node:fs/promises";
import { Cdp, sleep } from "./cdp.mjs";
import { profiles, resultsRoot, sourceCssFile } from "./config.mjs";

const sourceCss = await readFile(sourceCssFile, "utf8");
const snapshots = JSON.parse(await readFile(`${resultsRoot}/visible-snapshots.json`, "utf8"));
const rows = [];
const cdp = new Cdp();
await cdp.connect();

try {
  for (const snapshot of snapshots.rows) {
    const page = await cdp.page(profiles[snapshot.profile]);
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
      await page.send("CSS.startRuleUsageTracking");
      const body = await readFile(`${resultsRoot}/${snapshot.file}`, "utf8");
      const htmlClass = snapshot.state.includes("dark") ? `${snapshot.rootClass} dark` : snapshot.rootClass;
      const documentHtml = `<!doctype html><html class=${JSON.stringify(htmlClass)}><head><meta name="viewport" content="width=device-width, initial-scale=1"><style data-perf051-source>${sourceCss}</style></head>${body}</html>`;
      await page.evaluate(`document.open();document.write(${JSON.stringify(documentHtml)});document.close()`);
      await sleep(100);
      const { coverage } = await page.send("CSS.takeCoverageDelta");
      const candidates = [];
      for (const [styleSheetId, header] of headers) {
        const { text } = await page.send("CSS.getStyleSheetText", { styleSheetId });
        if (text.length !== sourceCss.length) continue;
        candidates.push({ styleSheetId, header, text });
      }
      if (candidates.length !== 1) {
        throw new Error(`${snapshot.file}: expected one source sheet, found ${candidates.length}`);
      }
      const { styleSheetId } = candidates[0];
      const ranges = coverage
        .filter((entry) => entry.styleSheetId === styleSheetId && entry.used)
        .map(({ startOffset, endOffset }) => [startOffset, endOffset]);
      rows.push({
        profile: snapshot.profile,
        route: snapshot.route,
        state: snapshot.state,
        file: snapshot.file,
        ranges,
        coveredBytes: ranges.reduce((total, [start, end]) => total + end - start, 0),
      });
      await page.send("CSS.stopRuleUsageTracking");
      console.log(`${snapshot.profile}/${snapshot.route}/${snapshot.state}: ${ranges.length} rules`);
    } finally {
      cdp.listeners.delete(listen);
      await page.close();
    }
  }
} finally {
  cdp.close();
}

await writeFile(
  `${resultsRoot}/css-coverage.json`,
  `${JSON.stringify({ browser: cdp.version, sourceBytes: Buffer.byteLength(sourceCss), rows }, null, 2)}\n`,
);
