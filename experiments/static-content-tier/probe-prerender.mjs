import puppeteer from "puppeteer-core";

const baseUrl = process.env.PERF031_BASE_URL || "http://localhost:3120";
const browser = await puppeteer.launch({
  executablePath: "/opt/google/chrome/chrome",
  headless: true,
  ignoreDefaultArgs: ["--disable-background-networking"],
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const client = await page.createCDPSession();
  const preloadEvents = [];
  for (const eventName of [
    "Preload.ruleSetUpdated",
    "Preload.ruleSetRemoved",
    "Preload.preloadingAttemptSourcesUpdated",
    "Preload.prefetchStatusUpdated",
    "Preload.prerenderStatusUpdated",
  ]) {
    client.on(eventName, (payload) => preloadEvents.push({ eventName, payload }));
  }
  await client.send("Preload.enable");
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    connectionType: "cellular4g",
  });

  await page.goto(`${baseUrl}/hybrid/prerender-immediate/home`, {
    waitUntil: "networkidle0",
  });
  const source = await page.evaluate(() => ({
    supported: document.documentElement.dataset.perf031Supported,
    lifecycle: document.documentElement.dataset.perf031Lifecycle,
    userAgent: navigator.userAgent,
  }));
  const link = await page.$('a[href="/hybrid/prerender-immediate/article"]');
  if (!link) throw new Error("Cannot find the immediate-policy article link");
  await link.hover();
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  const beforeClick = await page.evaluate(() => ({
    started: document.documentElement.dataset.perf031Started,
    cancelled: document.documentElement.dataset.perf031Cancelled,
    rules: [...document.querySelectorAll('script[type="speculationrules"]')].map(
      (rule) => rule.textContent
    ),
  }));
  await link.click();
  await page.waitForFunction(() => location.pathname.endsWith("/article"), { timeout: 10_000 });
  await new Promise((resolve) => setTimeout(resolve, 250));
  const destination = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    return {
      url: location.href,
      activationStart: navigation?.activationStart ?? null,
      navigationType: navigation?.type ?? null,
      lifecycle: document.documentElement.dataset.perf031Lifecycle,
      prerendering: document.prerendering,
    };
  });

  console.log(JSON.stringify({ source, beforeClick, destination, preloadEvents }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
