import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "../../../node_modules/sharp/dist/index.cjs";
import { Cdp, sleep } from "./cdp.mjs";
import { profiles, resultsRoot, routes } from "./config.mjs";

const proxyOrigin = process.env.PERF051_PROXY_ORIGIN || "http://127.0.0.1:3161";
const delay = Number(process.env.PERF051_AUDIT_DELAY || 1_200);
const candidateArm = process.env.PERF051_ARM || "external";
const selectedProfiles = new Set(
  (process.env.PERF051_PROFILES || Object.keys(profiles).join(",")).split(",")
);
const selectedRoutes = new Set(
  (process.env.PERF051_ROUTES || routes.map((route) => route.name).join(",")).split(",")
);
const selectedThemes = new Set((process.env.PERF051_THEMES || "light,dark").split(","));
const output = `${resultsRoot}/initial-audit`;
await mkdir(output, { recursive: true });

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function until(page, expression, label) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      if (await page.evaluate(expression)) return;
    } catch {}
    await sleep(25);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

const stateExpression = `(() => {
  const rows = [];
  const elements = [document.documentElement, document.body, ...document.body.querySelectorAll('*')];
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];
    const rect = element.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth)) continue;
    const style = getComputedStyle(element);
    const computed = {};
    for (const property of style) {
      if (!property.startsWith('--')) computed[property] = style.getPropertyValue(property);
    }
    rows.push({
      index,
      tag: element.tagName,
      className: typeof element.className === 'string' ? element.className : '',
      text: element.childElementCount ? '' : element.textContent,
      rect: [rect.x, rect.y, rect.width, rect.height].map((value) => Math.round(value * 1000) / 1000),
      computed,
    });
  }
  return { rootClass: document.documentElement.className, rows };
})()`;

async function capture(cdp, profile, route, theme, arm, delayed) {
  const page = await cdp.page(profile);
  const failures = [];
  const errors = [];
  const listen = (message) => {
    if (message.sessionId !== page.sessionId) return;
    if (message.method === "Network.loadingFailed") failures.push(message.params);
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails?.text || "exception");
  };
  cdp.listeners.add(listen);
  try {
    if (theme === "dark") {
      await page.send("Emulation.setEmulatedMedia", {
        features: [
          { name: "prefers-color-scheme", value: "dark" },
          { name: "prefers-reduced-motion", value: "no-preference" },
        ],
      });
      await page.send("Page.addScriptToEvaluateOnNewDocument", {
        source: `try{localStorage.setItem('theme','dark')}catch{}`,
      });
    }
    const url = new URL(route.pathname, proxyOrigin);
    url.searchParams.set("perf051", arm);
    if (delayed) url.searchParams.set("perf051_delay", String(delay));
    const navigation = await page.send("Page.navigate", { url: url.href });
    if (navigation.errorText) throw new Error(navigation.errorText);
    await until(
      page,
      `performance.getEntriesByName('first-contentful-paint').length > 0 && document.fonts.status === 'loaded'`,
      "font-stable first contentful paint"
    );
    await page.evaluate(
      "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    );
    const fullPending = await page.evaluate(
      "Boolean(document.querySelector('[data-perf051-full]'))"
    );
    const screenshot = Buffer.from(
      (await page.send("Page.captureScreenshot", { format: "png", fromSurface: true })).data,
      "base64"
    );
    const state = await page.evaluate(stateExpression);
    await until(
      page,
      "document.readyState === 'complete' && !document.querySelector('[data-perf051-full]')",
      "full CSS"
    );
    const timing = await page.evaluate(`(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      return { fcp: fcp?.startTime || null, load: navigation?.loadEventEnd || null };
    })()`);
    return { screenshot, state, fullPending, failures, errors, timing };
  } finally {
    cdp.listeners.delete(listen);
    await page.close();
  }
}

async function pixelDifference(left, right) {
  const a = await sharp(left).raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(right).raw().toBuffer({ resolveWithObject: true });
  if (JSON.stringify(a.info) !== JSON.stringify(b.info)) {
    return { pixels: null, channels: null, maxDelta: null, incompatible: [a.info, b.info] };
  }
  let channels = 0;
  let maxDelta = 0;
  const changedPixels = new Uint8Array(a.info.width * a.info.height);
  for (let index = 0; index < a.data.length; index += 1) {
    const delta = Math.abs(a.data[index] - b.data[index]);
    if (!delta) continue;
    channels += 1;
    if (delta > maxDelta) maxDelta = delta;
    changedPixels[Math.floor(index / a.info.channels)] = 1;
  }
  return { pixels: changedPixels.reduce((total, value) => total + value, 0), channels, maxDelta };
}

function stateDifference(control, candidate) {
  const left = new Map(control.rows.map((row) => [row.index, row]));
  const right = new Map(candidate.rows.map((row) => [row.index, row]));
  const missingFromCandidate = [...left.keys()].filter((index) => !right.has(index));
  const additionalInCandidate = [...right.keys()].filter((index) => !left.has(index));
  const propertyCounts = new Map();
  const samples = [];
  let geometryElements = 0;
  let computedElements = 0;
  for (const [index, controlRow] of left) {
    const candidateRow = right.get(index);
    if (!candidateRow) continue;
    const geometryEqual = JSON.stringify(controlRow.rect) === JSON.stringify(candidateRow.rect);
    if (!geometryEqual) geometryElements += 1;
    const properties = [];
    for (const property of new Set([
      ...Object.keys(controlRow.computed),
      ...Object.keys(candidateRow.computed),
    ])) {
      if (controlRow.computed[property] === candidateRow.computed[property]) continue;
      properties.push(property);
      propertyCounts.set(property, (propertyCounts.get(property) || 0) + 1);
    }
    if (properties.length) computedElements += 1;
    if ((!geometryEqual || properties.length) && samples.length < 20) {
      samples.push({
        index,
        tag: controlRow.tag,
        className: controlRow.className,
        controlRect: controlRow.rect,
        candidateRect: candidateRow.rect,
        properties: properties.slice(0, 20).map((property) => ({
          property,
          control: controlRow.computed[property],
          candidate: candidateRow.computed[property],
        })),
      });
    }
  }
  return {
    rootClassEqual: control.rootClass === candidate.rootClass,
    controlRootClass: control.rootClass,
    candidateRootClass: candidate.rootClass,
    missingFromCandidate,
    additionalInCandidate,
    geometryElements,
    computedElements,
    topProperties: [...propertyCounts]
      .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])
      .slice(0, 30)
      .map(([property, count]) => ({ property, count })),
    samples,
  };
}

const cdp = new Cdp();
await cdp.connect();
const rows = [];
try {
  for (const [profileName, profile] of Object.entries(profiles)) {
    if (!selectedProfiles.has(profileName)) continue;
    for (const route of routes) {
      if (!selectedRoutes.has(route.name)) continue;
      for (const theme of ["light", "dark"]) {
        if (!selectedThemes.has(theme)) continue;
        const control = await capture(cdp, profile, route, theme, "control", false);
        const candidate = await capture(cdp, profile, route, theme, candidateArm, true);
        const stem = `${profileName}-${route.name}-${theme}`;
        await writeFile(`${output}/${stem}-control.png`, control.screenshot);
        await writeFile(`${output}/${stem}-critical.png`, candidate.screenshot);
        const difference = await pixelDifference(control.screenshot, candidate.screenshot);
        const row = {
          profile: profileName,
          route: route.name,
          theme,
          difference,
          screenshotEqual: hash(control.screenshot) === hash(candidate.screenshot),
          stateEqual: JSON.stringify(control.state) === JSON.stringify(candidate.state),
          stateDifference: stateDifference(control.state, candidate.state),
          criticalFullPending: candidate.fullPending,
          failures: [...control.failures, ...candidate.failures].length,
          errors: [...control.errors, ...candidate.errors],
          timing: { control: control.timing, candidate: candidate.timing },
        };
        rows.push(row);
        console.log(`${stem}: ${difference.pixels} changed pixels; state=${row.stateEqual}`);
        await writeFile(
          `${resultsRoot}/initial-audit.json`,
          `${JSON.stringify({ browser: cdp.version, delay, candidateArm, rows }, null, 2)}\n`
        );
      }
    }
  }
} finally {
  cdp.close();
}
