import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.PERF031_BASE_URL || "http://localhost:3120";
const runsPerCase = Number(process.env.PERF031_RUNS || 5);
const startMs = 500;
const settleMs = 750;
const cases = ["shared", "prerender-immediate", "prerender-dwell"];
const protocols = [
  { name: "glance", hoverMs: 50 },
  { name: "abandoned-dwell", hoverMs: 1_000 },
];
const rawRoot = path.join(tmpdir(), "perf031-abandoned-netlogs");
mkdirSync(rawRoot, { recursive: true });
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const round = (value, places = 3) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarizeNetlog(filename, runId) {
  const netlog = JSON.parse(readFileSync(filename, "utf8"));
  const eventNames = Object.fromEntries(
    Object.entries(netlog.constants.logEventTypes).map(([name, value]) => [value, name])
  );
  const urlRequestType = netlog.constants.logSourceType.URL_REQUEST;
  const matchingSources = new Set(
    netlog.events
      .filter(
        (event) =>
          event.source.type === urlRequestType &&
          event.params?.url?.includes("/article?") &&
          event.params.url.includes(runId)
      )
      .map((event) => `${event.source.type}:${event.source.id}`)
  );
  const matchingEvents = netlog.events.filter((event) =>
    matchingSources.has(`${event.source.type}:${event.source.id}`)
  );
  const byteEvents = matchingEvents
    .filter((event) => Number.isFinite(event.params?.byte_count))
    .map((event) => ({
      name: eventNames[event.type] || String(event.type),
      bytes: event.params.byte_count,
    }));
  const byType = {};
  for (const event of byteEvents) byType[event.name] = (byType[event.name] || 0) + event.bytes;
  const localRequests = new Map();
  for (const event of netlog.events) {
    if (event.source.type !== urlRequestType || !event.params?.url?.startsWith(baseUrl)) continue;
    localRequests.set(event.source.id, event.params.url);
  }
  const localEvents = netlog.events.filter(
    (event) => event.source.type === urlRequestType && localRequests.has(event.source.id)
  );
  const networkSourceIds = new Set(
    localEvents
      .filter((event) => eventNames[event.type] === "HTTP_TRANSACTION_READ_BODY")
      .map((event) => event.source.id)
  );
  const networkByteTotal = (eventName) =>
    localEvents
      .filter(
        (event) =>
          networkSourceIds.has(event.source.id) &&
          eventNames[event.type] === eventName &&
          Number.isFinite(event.params?.byte_count)
      )
      .reduce((total, event) => total + event.params.byte_count, 0);
  return {
    matchingSources: matchingSources.size,
    eventTypes: [...new Set(matchingEvents.map((event) => eventNames[event.type]))].filter(Boolean),
    byteCountsByEventType: byType,
    localhostNetwork: {
      requests: networkSourceIds.size,
      encodedBodyBytes: networkByteTotal("URL_REQUEST_JOB_BYTES_READ"),
      decodedBodyBytes: networkByteTotal("URL_REQUEST_JOB_FILTERED_BYTES_READ"),
      urls: [...networkSourceIds].map((sourceId) => localRequests.get(sourceId)).sort(),
    },
  };
}

async function launchRun(variant, protocol, sequence) {
  const profile = mkdtempSync(path.join(tmpdir(), "perf031-abandoned-"));
  const debugPort = 9_600 + sequence;
  const runId = `${protocol.name}-${variant}-${sequence}`;
  const netlogPath = path.join(rawRoot, `${runId}.json`);
  const url = new URL(`/hybrid/${variant}/home`, baseUrl);
  for (const [key, value] of Object.entries({
    "perf031-autorun": "1",
    action: "cancel",
    "start-ms": startMs,
    "hover-ms": protocol.hoverMs,
    "settle-ms": settleMs,
    "run-id": runId,
  })) {
    url.searchParams.set(key, String(value));
  }
  const chrome = spawn(
    "/opt/google/chrome/chrome",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--force-color-profile=srgb",
      "--force-device-scale-factor=2",
      "--window-size=390,844",
      "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost",
      `--log-net-log=${netlogPath}`,
      "--net-log-capture-mode=IncludeSensitive",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      url.href,
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  let stderr = "";
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  try {
    let browser;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        if (response.ok) {
          browser = await puppeteer.connect({
            browserURL: `http://127.0.0.1:${debugPort}`,
            defaultViewport: null,
          });
          break;
        }
      } catch {}
      await wait(100);
    }
    if (!browser) throw new Error(`Chrome did not expose DevTools:\n${stderr}`);

    await wait(startMs + protocol.hoverMs + settleMs + 500);
    const pages = await browser.pages();
    const page = pages.find((candidate) => candidate.url().startsWith(baseUrl));
    if (!page) throw new Error(`Cannot find the source page: ${pages.map((item) => item.url())}`);
    const result = await page.evaluate(() => ({
      url: location.href,
      source: JSON.parse(document.documentElement.dataset.perf031AutorunState || "null"),
      rules: document.querySelectorAll('script[type="speculationrules"]').length,
    }));
    await browser.close();
    await wait(500);
    result.netlog = summarizeNetlog(netlogPath, runId);
    return { ...result, run: sequence, runId };
  } finally {
    if (chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once("exit", resolve));
      chrome.kill("SIGTERM");
      await Promise.race([exited, wait(2_000)]);
    }
    await wait(500);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (error) {
      console.warn(`Could not remove temporary Chrome profile ${profile}: ${error.message}`);
    }
  }
}

const runs = Object.fromEntries(
  protocols.flatMap((protocol) => cases.map((variant) => [`${protocol.name}:${variant}`, []]))
);
let sequence = 0;
for (let roundIndex = 0; roundIndex < runsPerCase; roundIndex += 1) {
  const orderedCases = cases
    .slice(roundIndex % cases.length)
    .concat(cases.slice(0, roundIndex % cases.length));
  for (const protocol of protocols) {
    for (const variant of orderedCases) {
      sequence += 1;
      const result = await launchRun(variant, protocol, sequence);
      const key = `${protocol.name}:${variant}`;
      runs[key].push(result);
      console.log(
        `${key} ${runs[key].length}/${runsPerCase}: started ${result.source?.started}, cancelled ${result.source?.cancelled}, prefetch ${result.source?.prefetch?.transferSize ?? 0} B`
      );
    }
  }
}

const results = protocols.flatMap((protocol) =>
  cases.map((variant) => {
    const samples = runs[`${protocol.name}:${variant}`];
    const transferSizes = samples.map((sample) => sample.source?.prefetch?.transferSize || 0);
    const networkEncodedSizes = samples.map(
      (sample) => sample.netlog.localhostNetwork.encodedBodyBytes
    );
    return {
      protocol: protocol.name,
      hoverMs: protocol.hoverMs,
      variant,
      runs: samples,
      summary: {
        started: samples.map((sample) => sample.source?.started ?? null),
        cancelled: samples.map((sample) => sample.source?.cancelled ?? null),
        sourceVisiblePrefetchTransfer: {
          median: round(median(transferSizes)),
          min: Math.min(...transferSizes),
          max: Math.max(...transferSizes),
        },
        localhostNetworkEncodedBodyBytes: {
          median: round(median(networkEncodedSizes)),
          min: Math.min(...networkEncodedSizes),
          max: Math.max(...networkEncodedSizes),
        },
      },
    };
  })
);
const output = {
  generatedAt: new Date().toISOString(),
  browser: "Chrome 145 detached headless process with NetLog",
  profile: {
    baseUrl,
    sourceState: "new browser process and fresh profile per run",
    action: `wait ${startMs} ms, synthetic pointerover, pointerout after the protocol dwell, then settle ${settleMs} ms without navigation`,
    network: "localhost, unthrottled",
    runsPerCase,
    rawNetlogs: `${rawRoot}/*.json (intentionally not committed)`,
  },
  results,
  limitations: [
    "Resource Timing exposes the ordinary prefetch to the source document but not a prerender's hidden navigation, so raw NetLog event summaries are retained for attribution.",
    "Localhost can complete work before a 50 ms cancellation; the result measures this implementation and protocol, not a universal byte cost on slower networks.",
    "Synthetic intent isolates the policy boundary and does not estimate real abandonment frequency.",
  ],
};
const outputPath = path.join(fixtureRoot, "results/abandoned-intent-measurement.json");
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.table(
  results.map((result) => ({
    protocol: result.protocol,
    variant: result.variant,
    started: result.summary.started.join("/"),
    cancelled: result.summary.cancelled.join("/"),
    "source-visible bytes": result.summary.sourceVisiblePrefetchTransfer.median,
    "all localhost bytes": result.summary.localhostNetworkEncodedBodyBytes.median,
  }))
);
