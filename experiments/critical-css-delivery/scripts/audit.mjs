import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "../../../node_modules/sharp/dist/index.cjs";
import { Cdp, sleep } from "./cdp.mjs";
import { profiles, resultsRoot, routes } from "./config.mjs";

const proxyOrigin = process.env.PERF051_PROXY_ORIGIN || "http://127.0.0.1:3161";
const candidateArm = process.env.PERF051_ARM || "external";
const delay = Number(process.env.PERF051_AUDIT_DELAY || 5_000);
const resultName = process.env.PERF051_RESULT || "audit";
const output = `${resultsRoot}/${resultName}`;
await mkdir(output, { recursive: true });

const selectedProfiles = new Set(
  (process.env.PERF051_PROFILES || Object.keys(profiles).join(",")).split(",")
);
const selectedRoutes = new Set(
  (process.env.PERF051_ROUTES || routes.map((route) => route.name).join(",")).split(",")
);
const selectedThemes = new Set((process.env.PERF051_THEMES || "light,dark").split(","));

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function until(page, expression, label) {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    try {
      if (await page.evaluate(expression)) return;
    } catch {}
    await sleep(25);
  }
  throw new Error(`Timed out waiting for ${label}`);
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
    maxDelta = Math.max(maxDelta, delta);
    changedPixels[Math.floor(index / a.info.channels)] = 1;
  }
  return { pixels: changedPixels.reduce((total, value) => total + value, 0), channels, maxDelta };
}

function urlFor(route, arm, delayed = false) {
  const url = new URL(route.pathname, proxyOrigin);
  url.searchParams.set("perf051", arm);
  if (delayed) url.searchParams.set("perf051_delay", String(delay));
  return url.href;
}

async function configureTheme(page, theme) {
  await page.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: theme },
      { name: "prefers-reduced-motion", value: "no-preference" },
    ],
  });
  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `try{localStorage.setItem('theme','${theme}')}catch{}`,
  });
}

async function screenshot(page) {
  return Buffer.from(
    (await page.send("Page.captureScreenshot", { format: "png", fromSurface: true })).data,
    "base64"
  );
}

async function captureRapidScroll(cdp, profile, route, theme, arm, delayed) {
  const page = await cdp.page(profile);
  const failures = [];
  const errors = [];
  const listen = (message) => {
    if (message.sessionId !== page.sessionId) return;
    if (message.method === "Network.loadingFailed") failures.push(message.params);
    if (message.method === "Runtime.exceptionThrown") {
      errors.push(message.params.exceptionDetails?.text || "exception");
    }
  };
  cdp.listeners.add(listen);
  try {
    await configureTheme(page, theme);
    const navigation = await page.send("Page.navigate", { url: urlFor(route, arm, delayed) });
    if (navigation.errorText) throw new Error(navigation.errorText);
    await until(
      page,
      `performance.getEntriesByName('first-contentful-paint').length > 0 && document.fonts.status === 'loaded'`,
      "font-stable first contentful paint"
    );
    await page.evaluate(
      "document.documentElement.style.scrollBehavior='auto';scrollTo(0,document.documentElement.scrollHeight)"
    );
    await page.evaluate(
      "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    );
    const state = await page.evaluate(`(() => ({
      scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      viewport: [innerWidth, innerHeight],
      fullPending: Boolean(document.querySelector('[data-perf051-full]')),
      rootClass: document.documentElement.className,
      footer: (() => {
        const rect = document.querySelector('footer')?.getBoundingClientRect();
        return rect ? [rect.x, rect.y, rect.width, rect.height] : null;
      })(),
    }))()`);
    return { image: await screenshot(page), state, failures, errors };
  } finally {
    cdp.listeners.delete(listen);
    await page.close();
  }
}

async function captureNoScript(cdp, profile, route, arm) {
  const page = await cdp.page(profile);
  const failures = [];
  const listen = (message) => {
    if (message.sessionId === page.sessionId && message.method === "Network.loadingFailed") {
      failures.push(message.params);
    }
  };
  cdp.listeners.add(listen);
  try {
    await page.send("Emulation.setScriptExecutionDisabled", { value: true });
    await page.navigate(urlFor(route, arm));
    const image = await screenshot(page);
    return { image, failures };
  } finally {
    cdp.listeners.delete(listen);
    await page.close();
  }
}

const cdp = new Cdp();
await cdp.connect();
const rapidScroll = [];
const noScript = [];
try {
  for (const [profileName, profile] of Object.entries(profiles)) {
    if (!selectedProfiles.has(profileName)) continue;
    for (const route of routes) {
      if (!selectedRoutes.has(route.name)) continue;
      for (const theme of ["light", "dark"]) {
        if (!selectedThemes.has(theme)) continue;
        const control = await captureRapidScroll(cdp, profile, route, theme, "control", false);
        const candidate = await captureRapidScroll(cdp, profile, route, theme, candidateArm, true);
        const stem = `${profileName}-${route.name}-${theme}-rapid-scroll`;
        await writeFile(`${output}/${stem}-control.png`, control.image);
        await writeFile(`${output}/${stem}-candidate.png`, candidate.image);
        const difference = await pixelDifference(control.image, candidate.image);
        rapidScroll.push({
          profile: profileName,
          route: route.name,
          theme,
          difference,
          screenshotEqual: hash(control.image) === hash(candidate.image),
          state: { control: control.state, candidate: candidate.state },
          failures: [...control.failures, ...candidate.failures].length,
          errors: [...control.errors, ...candidate.errors],
        });
        console.log(`${stem}: ${difference.pixels} changed pixels`);
      }

      const control = await captureNoScript(cdp, profile, route, "control");
      const candidate = await captureNoScript(cdp, profile, route, candidateArm);
      const stem = `${profileName}-${route.name}-no-script`;
      await writeFile(`${output}/${stem}-control.png`, control.image);
      await writeFile(`${output}/${stem}-candidate.png`, candidate.image);
      const difference = await pixelDifference(control.image, candidate.image);
      noScript.push({
        profile: profileName,
        route: route.name,
        difference,
        screenshotEqual: hash(control.image) === hash(candidate.image),
        failures: [...control.failures, ...candidate.failures],
      });
      console.log(`${stem}: ${difference.pixels} changed pixels`);
    }
  }
} finally {
  cdp.close();
}

await writeFile(
  `${resultsRoot}/${resultName}.json`,
  `${JSON.stringify({ browser: cdp.version, candidateArm, delay, rapidScroll, noScript }, null, 2)}\n`
);
