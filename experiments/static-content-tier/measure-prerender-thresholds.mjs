import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { createTransportShapingProxy } from "./lib/transport-shaping-proxy.mjs";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const upstreamBaseUrl = process.env.PERF032_UPSTREAM_URL || "http://127.0.0.1:3120";
const proxyPort = Number(process.env.PERF032_PROXY_PORT || 3_132);
const baseUrl = `http://localhost:${proxyPort}`;
const runsPerCase = Number(process.env.PERF032_RUNS || 1);
const startMs = Number(process.env.PERF032_START_MS || 500);
const postActionMs = Number(process.env.PERF032_POST_ACTION_MS || 1_500);
const stagedExperiment = process.env.PERF033_STAGED === "1";
const gatedPromotionExperiment = process.env.PERF034_GATED === "1";
const streamingDeliveryExperiment = process.env.PERF035_STREAMING === "1";
const earlyPrefixExperiment = process.env.PERF036_PREFIX === "1";
const headOrderingExperiment = process.env.PERF037_HEAD_ORDER === "1";
const cacheFreshnessExperiment = process.env.PERF038_CACHE === "1";
const activationTraceExperiment = process.env.PERF039_TRACE === "1";
const activationTraceDurationSeconds = Number(process.env.PERF039_TRACE_DURATION || 3);
const activationTraceRoot = path.resolve(
  process.env.PERF039_TRACE_DIR || path.join(tmpdir(), "perf039-activation-traces")
);
const activationTraceCategories = [
  "blink",
  "blink.user_timing",
  "cc",
  "devtools.timeline",
  "loading",
  "navigation",
  "rail",
  "toplevel",
  "v8",
  "disabled-by-default-devtools.timeline.frame",
  "disabled-by-default-devtools.timeline.stack",
].join(",");
const activationTraceAvatarPolicies = csvStrings("PERF039_AVATAR_POLICIES", [
  "legacy-responsive",
  "fixed-40",
]);
const thresholds = csvNumbers("PERF032_THRESHOLDS", [0, 75, 150, 250]);
const promotionThresholds = csvNumbers("PERF033_PROMOTE_MS", [150]);
const commitCancelBeforeThresholds = csvNumbers("PERF033_CANCEL_BEFORE_MS", [250]);
const adaptiveCancelBeforeThresholds = csvNumbers("PERF033_ADAPTIVE_CANCEL_BEFORE_MS", [150]);
const stagedPolicies = csvStrings("PERF033_POLICIES", [
  "shared",
  "dwell",
  "keep",
  "cancel",
  "adaptive",
]);
const gatedPolicies = csvStrings("PERF034_POLICIES", [
  "shared",
  "dwell",
  "adaptive",
  "complete",
  "settled",
]);
const promotionSettleThresholds = csvNumbers("PERF034_SETTLE_MS", [150]);
const streamingPolicies = csvStrings("PERF035_POLICIES", ["eager", "complete"]);
const articleDeliveryModes = csvStrings("PERF035_DELIVERY", ["progressive", "burst"]);
const earlyPrefixBytes = csvNumbers("PERF036_PREFIX_BYTES", [1024, 2048, 4096, 8192]);
const hoverDurations = csvNumbers("PERF032_INTENT_MS", [50, 100, 150, 250, 500, 1_000]);
const actions = csvStrings("PERF032_ACTIONS", ["navigate", "cancel"]);
const intents = csvStrings("PERF032_INTENTS", ["pointer"]);
const outputName = process.env.PERF032_OUTPUT || "prerender-threshold-screening.json";
const resumeFromCheckpoint = process.env.PERF032_RESUME === "1";
const checkpointPath = path.resolve(
  fixtureRoot,
  "results",
  outputName.replace(/\.json$/, ".checkpoint.json")
);
const retainRequestDetails = process.env.PERF032_RETAIN_REQUESTS === "1";
const profiles = {
  controlled: { name: "controlled", latencyMs: 150, downloadKbps: 1_600 },
  constrained: { name: "constrained", latencyMs: 300, downloadKbps: 750 },
};
const requestedProfile = process.env.PERF032_PROFILE || "controlled";
const profile = profiles[requestedProfile];
if (!profile) throw new Error(`Unknown PERF032_PROFILE: ${requestedProfile}`);
if (thresholds.some((value) => ![0, 75, 150, 250].includes(value))) {
  throw new Error("PERF032_THRESHOLDS must contain only 0, 75, 150, or 250");
}
if (promotionThresholds.some((value) => ![0, 75, 150, 250].includes(value))) {
  throw new Error("PERF033_PROMOTE_MS must contain only 0, 75, 150, or 250");
}
if (commitCancelBeforeThresholds.some((value) => ![150, 250, 350, 500].includes(value))) {
  throw new Error("PERF033_CANCEL_BEFORE_MS must contain only 150, 250, 350, or 500");
}
if (adaptiveCancelBeforeThresholds.some((value) => ![150, 250, 350, 500].includes(value))) {
  throw new Error("PERF033_ADAPTIVE_CANCEL_BEFORE_MS must contain only 150, 250, 350, or 500");
}
if (
  stagedPolicies.some((value) => !["shared", "dwell", "keep", "cancel", "adaptive"].includes(value))
) {
  throw new Error("PERF033_POLICIES must contain only shared, dwell, keep, cancel, or adaptive");
}
if (
  gatedPolicies.some(
    (value) => !["shared", "dwell", "adaptive", "complete", "settled"].includes(value)
  )
) {
  throw new Error(
    "PERF034_POLICIES must contain only shared, dwell, adaptive, complete, or settled"
  );
}
if (promotionSettleThresholds.some((value) => ![75, 150, 250].includes(value))) {
  throw new Error("PERF034_SETTLE_MS must contain only 75, 150, or 250");
}
if (streamingPolicies.some((value) => !["eager", "complete"].includes(value))) {
  throw new Error("PERF035_POLICIES must contain only eager or complete");
}
if (articleDeliveryModes.some((value) => !["progressive", "burst"].includes(value))) {
  throw new Error("PERF035_DELIVERY must contain only progressive or burst");
}
if (earlyPrefixBytes.some((value) => ![1024, 2048, 4096, 8192].includes(value))) {
  throw new Error("PERF036_PREFIX_BYTES must contain only 1024, 2048, 4096, or 8192");
}
if (actions.some((value) => !["navigate", "cancel"].includes(value))) {
  throw new Error("PERF032_ACTIONS must contain only navigate or cancel");
}
if (intents.some((value) => !["pointer", "focus", "touch"].includes(value))) {
  throw new Error("PERF032_INTENTS must contain only pointer, focus, or touch");
}
if (![2, 3, 4, 5].includes(activationTraceDurationSeconds)) {
  throw new Error("PERF039_TRACE_DURATION must be 2, 3, 4, or 5 seconds");
}
if (
  activationTraceAvatarPolicies.some((value) => !["legacy-responsive", "fixed-40"].includes(value))
) {
  throw new Error("PERF039_AVATAR_POLICIES must contain only legacy-responsive or fixed-40");
}

const candidates = activationTraceExperiment
  ? promotionThresholds.flatMap((thresholdMs) =>
      adaptiveCancelBeforeThresholds.flatMap((commitCancelBeforeMs) =>
        activationTraceAvatarPolicies.flatMap((avatarSizePolicy) =>
          [false, true].map((traceEnabled) => ({
            name: `adaptive-eager-css-first-immutable-prefix-1024-${avatarSizePolicy}-${traceEnabled ? "startup-trace" : "untraced"}-${thresholdMs}-${commitCancelBeforeMs}`,
            variant: "prerender-dwell",
            thresholdMs,
            stagedPolicy: "adaptive",
            commitCancelBeforeMs,
            articleDeliveryMode: "prefix",
            articleEarlyPrefixBytes: 1024,
            articleHeadOrder: "css-first",
            assetPolicy: "hashed-immutable",
            avatarSizePolicy,
            traceEnabled,
          }))
        )
      )
    )
  : cacheFreshnessExperiment
    ? promotionThresholds.flatMap((thresholdMs) =>
        adaptiveCancelBeforeThresholds.flatMap((commitCancelBeforeMs) =>
          ["mutable", "hashed-stale", "hashed-immutable"].map((assetPolicy) => ({
            name: `adaptive-eager-css-first-${assetPolicy}-prefix-1024-${thresholdMs}-${commitCancelBeforeMs}`,
            variant: "prerender-dwell",
            thresholdMs,
            stagedPolicy: "adaptive",
            commitCancelBeforeMs,
            articleDeliveryMode: "prefix",
            articleEarlyPrefixBytes: 1024,
            articleHeadOrder: "css-first",
            assetPolicy,
          }))
        )
      )
    : headOrderingExperiment
      ? promotionThresholds.flatMap((thresholdMs) =>
          adaptiveCancelBeforeThresholds.flatMap((commitCancelBeforeMs) => [
            ...[
              ["original", 1024],
              ["css-first", 1024],
              ["resources-first", 1024],
              ["original", 2048],
            ].map(([articleHeadOrder, articleEarlyPrefixBytes]) => ({
              name: `adaptive-eager-${articleHeadOrder}-prefix-${articleEarlyPrefixBytes}-${thresholdMs}-${commitCancelBeforeMs}`,
              variant: "prerender-dwell",
              thresholdMs,
              stagedPolicy: "adaptive",
              commitCancelBeforeMs,
              articleDeliveryMode: "prefix",
              articleEarlyPrefixBytes,
              articleHeadOrder,
            })),
            {
              name: `adaptive-eager-original-progressive-${thresholdMs}-${commitCancelBeforeMs}`,
              variant: "prerender-dwell",
              thresholdMs,
              stagedPolicy: "adaptive",
              commitCancelBeforeMs,
              articleDeliveryMode: "progressive",
              articleHeadOrder: "original",
            },
          ])
        )
      : earlyPrefixExperiment
        ? promotionThresholds.flatMap((thresholdMs) =>
            adaptiveCancelBeforeThresholds.flatMap((commitCancelBeforeMs) => [
              {
                name: `adaptive-eager-burst-${thresholdMs}-${commitCancelBeforeMs}`,
                variant: "prerender-dwell",
                thresholdMs,
                stagedPolicy: "adaptive",
                commitCancelBeforeMs,
                articleDeliveryMode: "burst",
              },
              ...earlyPrefixBytes.map((articleEarlyPrefixBytes) => ({
                name: `adaptive-eager-prefix-${articleEarlyPrefixBytes}-${thresholdMs}-${commitCancelBeforeMs}`,
                variant: "prerender-dwell",
                thresholdMs,
                stagedPolicy: "adaptive",
                commitCancelBeforeMs,
                articleDeliveryMode: "prefix",
                articleEarlyPrefixBytes,
              })),
              {
                name: `adaptive-eager-progressive-${thresholdMs}-${commitCancelBeforeMs}`,
                variant: "prerender-dwell",
                thresholdMs,
                stagedPolicy: "adaptive",
                commitCancelBeforeMs,
                articleDeliveryMode: "progressive",
              },
            ])
          )
        : streamingDeliveryExperiment
          ? articleDeliveryModes.flatMap((articleDeliveryMode) => [
              ...(streamingPolicies.includes("eager")
                ? promotionThresholds.flatMap((thresholdMs) =>
                    adaptiveCancelBeforeThresholds.map((commitCancelBeforeMs) => ({
                      name: `adaptive-eager-${articleDeliveryMode}-${thresholdMs}-${commitCancelBeforeMs}`,
                      variant: "prerender-dwell",
                      thresholdMs,
                      stagedPolicy: "adaptive",
                      commitCancelBeforeMs,
                      articleDeliveryMode,
                    }))
                  )
                : []),
              ...(streamingPolicies.includes("complete")
                ? promotionThresholds.flatMap((thresholdMs) =>
                    adaptiveCancelBeforeThresholds.map((commitCancelBeforeMs) => ({
                      name: `adaptive-complete-${articleDeliveryMode}-${thresholdMs}-${commitCancelBeforeMs}`,
                      variant: "prerender-dwell",
                      thresholdMs,
                      stagedPolicy: "adaptive",
                      commitCancelBeforeMs,
                      promotionGate: "complete",
                      promotionSettleMs: 0,
                      articleDeliveryMode,
                    }))
                  )
                : []),
            ])
          : gatedPromotionExperiment
            ? [
                ...(gatedPolicies.includes("shared")
                  ? [{ name: "shared-prefetch", variant: "shared", thresholdMs: null }]
                  : []),
                ...(gatedPolicies.includes("dwell")
                  ? promotionThresholds.map((thresholdMs) => ({
                      name: `prerender-dwell-${thresholdMs}`,
                      variant: "prerender-dwell",
                      thresholdMs,
                    }))
                  : []),
                ...(gatedPolicies.includes("adaptive")
                  ? promotionThresholds.flatMap((thresholdMs) =>
                      adaptiveCancelBeforeThresholds.map((commitCancelBeforeMs) => ({
                        name: `adaptive-eager-${thresholdMs}-${commitCancelBeforeMs}`,
                        variant: "prerender-dwell",
                        thresholdMs,
                        stagedPolicy: "adaptive",
                        commitCancelBeforeMs,
                      }))
                    )
                  : []),
                ...(gatedPolicies.includes("complete")
                  ? promotionThresholds.flatMap((thresholdMs) =>
                      adaptiveCancelBeforeThresholds.map((commitCancelBeforeMs) => ({
                        name: `adaptive-complete-${thresholdMs}-${commitCancelBeforeMs}`,
                        variant: "prerender-dwell",
                        thresholdMs,
                        stagedPolicy: "adaptive",
                        commitCancelBeforeMs,
                        promotionGate: "complete",
                        promotionSettleMs: 0,
                      }))
                    )
                  : []),
                ...(gatedPolicies.includes("settled")
                  ? promotionThresholds.flatMap((thresholdMs) =>
                      adaptiveCancelBeforeThresholds.flatMap((commitCancelBeforeMs) =>
                        promotionSettleThresholds.map((promotionSettleMs) => ({
                          name: `adaptive-settled-${thresholdMs}-${promotionSettleMs}-${commitCancelBeforeMs}`,
                          variant: "prerender-dwell",
                          thresholdMs,
                          stagedPolicy: "adaptive",
                          commitCancelBeforeMs,
                          promotionGate: "settled",
                          promotionSettleMs,
                        }))
                      )
                    )
                  : []),
              ]
            : stagedExperiment
              ? [
                  ...(stagedPolicies.includes("shared")
                    ? [{ name: "shared-prefetch", variant: "shared", thresholdMs: null }]
                    : []),
                  ...(stagedPolicies.includes("dwell")
                    ? promotionThresholds.map((thresholdMs) => ({
                        name: `prerender-dwell-${thresholdMs}`,
                        variant: "prerender-dwell",
                        thresholdMs,
                      }))
                    : []),
                  ...(stagedPolicies.includes("keep")
                    ? promotionThresholds.map((thresholdMs) => ({
                        name: `staged-keep-${thresholdMs}`,
                        variant: "prerender-dwell",
                        thresholdMs,
                        stagedPolicy: "keep",
                      }))
                    : []),
                  ...(stagedPolicies.includes("cancel")
                    ? promotionThresholds.flatMap((thresholdMs) =>
                        commitCancelBeforeThresholds.map((commitCancelBeforeMs) => ({
                          name: `staged-cancel-${thresholdMs}-${commitCancelBeforeMs}`,
                          variant: "prerender-dwell",
                          thresholdMs,
                          stagedPolicy: "cancel",
                          commitCancelBeforeMs,
                        }))
                      )
                    : []),
                  ...(stagedPolicies.includes("adaptive")
                    ? promotionThresholds.flatMap((thresholdMs) =>
                        adaptiveCancelBeforeThresholds.map((commitCancelBeforeMs) => ({
                          name: `staged-adaptive-${thresholdMs}-${commitCancelBeforeMs}`,
                          variant: "prerender-dwell",
                          thresholdMs,
                          stagedPolicy: "adaptive",
                          commitCancelBeforeMs,
                        }))
                      )
                    : []),
                ]
              : [
                  { name: "shared-prefetch", variant: "shared", thresholdMs: null },
                  ...thresholds.map((thresholdMs) => ({
                    name: `prerender-${thresholdMs}`,
                    variant: "prerender-dwell",
                    thresholdMs,
                  })),
                ];
if (!candidates.length) throw new Error("The experiment needs at least one candidate");
if (activationTraceExperiment) mkdirSync(activationTraceRoot, { recursive: true });
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function csvStrings(name, fallback) {
  const value = process.env[name];
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback;
}

function csvNumbers(name, fallback) {
  return csvStrings(name, fallback.map(String)).map(Number);
}

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function distribution(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length
    ? {
        median: round(median(finite)),
        min: round(Math.min(...finite)),
        max: round(Math.max(...finite)),
      }
    : { median: null, min: null, max: null };
}

async function launchRun(proxy, specification, sequence) {
  const { candidate, action, intent, hoverMs, repetition } = specification;
  const runId = `${profile.name}-${intent}-${action}-${hoverMs}-${candidate.name}-${repetition}`;
  proxy.reset({
    runId,
    profile,
    articleDeliveryMode: candidate.articleDeliveryMode ?? "aggregate",
    articleEarlyPrefixBytes: candidate.articleEarlyPrefixBytes ?? 0,
  });
  const chromeProfile = mkdtempSync(path.join(tmpdir(), "perf032-threshold-"));
  const debugPort = 10_100 + sequence;
  const traceFile = candidate.traceEnabled
    ? path.join(
        activationTraceRoot,
        `${profile.name}-${String(sequence).padStart(3, "0")}-${candidate.name}-${repetition}.json`
      )
    : null;
  const url = new URL(`/hybrid/${candidate.variant}/home`, baseUrl);
  const settleMs = postActionMs;
  for (const [key, value] of Object.entries({
    "perf031-autorun": "1",
    action,
    intent,
    "start-ms": startMs,
    "hover-ms": hoverMs,
    "settle-ms": settleMs,
    "run-id": runId,
  })) {
    url.searchParams.set(key, String(value));
  }
  if (candidate.thresholdMs !== null) {
    url.searchParams.set("perf032-dwell-ms", String(candidate.thresholdMs));
  }
  if (candidate.stagedPolicy) {
    url.searchParams.set("perf033-mode", candidate.stagedPolicy);
  }
  if (candidate.commitCancelBeforeMs) {
    url.searchParams.set("perf033-cancel-before-ms", String(candidate.commitCancelBeforeMs));
  }
  if (candidate.promotionGate) {
    url.searchParams.set("perf034-promotion", candidate.promotionGate);
  }
  if (candidate.promotionSettleMs) {
    url.searchParams.set("perf034-settle-ms", String(candidate.promotionSettleMs));
  }
  if (candidate.articleHeadOrder) {
    url.searchParams.set("perf037-head-order", candidate.articleHeadOrder);
  }
  if (candidate.assetPolicy) {
    url.searchParams.set("perf038-cache", candidate.assetPolicy);
  }
  if (candidate.avatarSizePolicy) {
    url.searchParams.set("perf039-avatar-size", candidate.avatarSizePolicy);
  }

  const traceArguments = traceFile
    ? [
        `--trace-startup=${activationTraceCategories}`,
        `--trace-startup-file=${traceFile}`,
        `--trace-startup-duration=${activationTraceDurationSeconds}`,
        "--trace-startup-format=json",
        "--trace-startup-owner=controller",
      ]
    : [];
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
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${chromeProfile}`,
      ...traceArguments,
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
    for (let attempt = 0; attempt < 60; attempt += 1) {
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
    const chromeVersion = await browser.version();

    await wait(startMs + hoverMs + settleMs + 750);
    const pages = await browser.pages();
    const page = pages.find((candidatePage) => candidatePage.url().startsWith(baseUrl));
    if (!page) throw new Error(`Cannot find test page: ${pages.map((item) => item.url())}`);
    const browserResult = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const firstContentfulPaint = performance
        .getEntriesByType("paint")
        .find((entry) => entry.name === "first-contentful-paint");
      const autorunState = document.documentElement.dataset.perf031AutorunState;
      const avatar = document.querySelector('img[alt$=" avatar"]');
      const avatarResource = avatar
        ? performance.getEntriesByType("resource").find((entry) => entry.name === avatar.currentSrc)
        : null;
      const avatarUrl = avatar?.currentSrc ? new URL(avatar.currentSrc) : null;
      return {
        url: location.href,
        source: autorunState
          ? JSON.parse(autorunState)
          : JSON.parse(localStorage.getItem("perf031-source-state") || "null"),
        lifecycle: document.documentElement.dataset.perf031Lifecycle || "normal-navigation",
        prerendering: document.prerendering,
        activationStart: navigation?.activationStart ?? null,
        responseStart: navigation?.responseStart ?? null,
        domContentLoaded: navigation?.domContentLoadedEventEnd ?? null,
        load: navigation?.loadEventEnd ?? null,
        transferSize: navigation?.transferSize ?? null,
        encodedBodySize: navigation?.encodedBodySize ?? null,
        firstContentfulPaint: firstContentfulPaint?.startTime ?? null,
        clickToFirstContentfulPaint: Number(
          document.documentElement.dataset.perf031MeasureClickToFcp
        ),
        avatar: avatar
          ? {
              sizes: avatar.sizes,
              clientWidth: avatar.clientWidth,
              clientHeight: avatar.clientHeight,
              naturalWidth: avatar.naturalWidth,
              naturalHeight: avatar.naturalHeight,
              candidateWidth: Number(avatarUrl?.searchParams.get("w")) || null,
              encodedBodySize: avatarResource?.encodedBodySize ?? null,
              transferSize: avatarResource?.transferSize ?? null,
              responseEnd: avatarResource?.responseEnd ?? null,
            }
          : null,
      };
    });
    if (traceFile) {
      for (let attempt = 0; attempt < 50 && !existsSync(traceFile); attempt += 1) {
        await wait(100);
      }
    }
    await browser.close();
    await wait(250);
    let traceArtifact = null;
    if (traceFile) {
      for (let attempt = 0; attempt < 40 && !existsSync(traceFile); attempt += 1) {
        await wait(100);
      }
      if (!existsSync(traceFile)) throw new Error(`Chrome did not write ${traceFile}`);
      const traceBody = readFileSync(traceFile);
      traceArtifact = {
        path: traceFile,
        bytes: statSync(traceFile).size,
        sha256: createHash("sha256").update(traceBody).digest("hex"),
      };
    }
    return {
      runId,
      repetition,
      candidate: candidate.name,
      variant: candidate.variant,
      thresholdMs: candidate.thresholdMs,
      stagedPolicy: candidate.stagedPolicy ?? null,
      commitCancelBeforeMs: candidate.commitCancelBeforeMs ?? null,
      promotionGate: candidate.promotionGate ?? null,
      promotionSettleMs: candidate.promotionSettleMs ?? null,
      articleDeliveryMode: candidate.articleDeliveryMode ?? "aggregate",
      articleEarlyPrefixBytes: candidate.articleEarlyPrefixBytes ?? 0,
      articleHeadOrder: candidate.articleHeadOrder ?? "original",
      assetPolicy: candidate.assetPolicy ?? "mutable",
      avatarSizePolicy: candidate.avatarSizePolicy ?? null,
      traceEnabled: candidate.traceEnabled ?? false,
      traceArtifact,
      action,
      intent,
      hoverMs,
      chromeVersion,
      ...browserResult,
      transport: proxy.snapshot(),
    };
  } finally {
    if (chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once("exit", resolve));
      chrome.kill("SIGTERM");
      await Promise.race([exited, wait(2_000)]);
    }
    await wait(250);
    try {
      rmSync(chromeProfile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (error) {
      console.warn(`Could not remove temporary Chrome profile ${chromeProfile}: ${error.message}`);
    }
  }
}

const checkpoint = resumeFromCheckpoint
  ? JSON.parse(readFileSync(checkpointPath, "utf8"))
  : { rawRuns: [], lastSequence: 0 };
const runs = checkpoint.rawRuns;
let sequence = checkpoint.lastSequence;
if (
  runs.some(
    (run) =>
      run.transport?.profile?.name !== profile.name ||
      !candidates.some((candidate) => candidate.name === run.candidate) ||
      !actions.includes(run.action) ||
      !intents.includes(run.intent) ||
      !hoverDurations.includes(run.hoverMs) ||
      run.repetition > runsPerCase
  )
) {
  throw new Error(`Checkpoint ${checkpointPath} does not match this experiment configuration`);
}
const proxy = createTransportShapingProxy({ upstreamBaseUrl });
await proxy.listen(proxyPort);

try {
  const baseCases = [];
  for (const action of actions) {
    for (const intent of intents) {
      for (const hoverMs of hoverDurations) {
        for (const candidate of candidates) baseCases.push({ candidate, action, intent, hoverMs });
      }
    }
  }

  for (let repetition = 1; repetition <= runsPerCase; repetition += 1) {
    const offset = (repetition - 1) % candidates.length;
    const ordered = baseCases.slice(offset).concat(baseCases.slice(0, offset));
    for (const specification of ordered) {
      if (
        runs.some(
          (run) =>
            run.repetition === repetition &&
            run.candidate === specification.candidate.name &&
            run.action === specification.action &&
            run.intent === specification.intent &&
            run.hoverMs === specification.hoverMs
        )
      ) {
        continue;
      }
      let result;
      for (let attempt = 1; attempt <= 3 && !result; attempt += 1) {
        sequence += 1;
        try {
          result = await launchRun(proxy, { ...specification, repetition }, sequence);
        } catch (error) {
          if (attempt === 3) throw error;
          console.warn(
            `Retrying ${specification.candidate.name} repetition ${repetition} after attempt ${attempt}: ${error.message}`
          );
        }
      }
      runs.push(result);
      writeFileSync(
        checkpointPath,
        `${JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            completedRuns: runs.length,
            lastSequence: sequence,
            rawRuns: runs,
          },
          null,
          2
        )}\n`
      );
      const primary =
        result.action === "navigate"
          ? `${round(result.clickToFirstContentfulPaint)} ms click→FCP, activation ${round(result.activationStart)}`
          : `${result.transport.target.sentBodyBytes} B sent, ${result.source?.started ?? 0}/${result.source?.cancelled ?? 0} start/cancel`;
      console.log(
        `${sequence}: ${result.candidate} ${result.intent} ${result.action} ${result.hoverMs} ms: ${primary}`
      );
    }
  }
} finally {
  await proxy.close();
}

const groupKeys = ["candidate", "action", "intent", "hoverMs"];
const grouped = new Map();
for (const run of runs) {
  const key = groupKeys.map((field) => run[field]).join(":");
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(run);
}
const results = [...grouped.values()].map((samples) => {
  const first = samples[0];
  return {
    candidate: first.candidate,
    thresholdMs: first.thresholdMs,
    stagedPolicy: first.stagedPolicy,
    commitCancelBeforeMs: first.commitCancelBeforeMs,
    promotionGate: first.promotionGate,
    promotionSettleMs: first.promotionSettleMs,
    articleDeliveryMode: first.articleDeliveryMode,
    articleEarlyPrefixBytes: first.articleEarlyPrefixBytes,
    articleHeadOrder: first.articleHeadOrder,
    assetPolicy: first.assetPolicy,
    avatarSizePolicy: first.avatarSizePolicy,
    traceEnabled: first.traceEnabled,
    action: first.action,
    intent: first.intent,
    hoverMs: first.hoverMs,
    runs: samples.length,
    activationSuccesses: samples.filter((sample) => sample.activationStart > 0).length,
    started: samples.map((sample) => sample.source?.started ?? 0),
    cancelled: samples.map((sample) => sample.source?.cancelled ?? 0),
    stagedPrefetches: samples.map((sample) => sample.source?.stagedPrefetches ?? 0),
    promotions: samples.map((sample) => sample.source?.promotions ?? 0),
    commitRuleRemovals: samples.map((sample) => sample.source?.commitRuleRemovals ?? 0),
    commitKeeps: samples.map((sample) => sample.source?.commitKeeps ?? 0),
    commitsWithoutPromotion: samples.map((sample) => sample.source?.commitsWithoutPromotion ?? 0),
    commitPrerenderAge: distribution(
      samples.map((sample) => sample.source?.commitPrerenderAge ?? 0)
    ),
    commitPrefetchCompletionAge: distribution(
      samples.map((sample) => sample.source?.commitPrefetchCompletionAge ?? 0)
    ),
    promotionGateDeferrals: samples.map((sample) => sample.source?.promotionGateDeferrals ?? 0),
    clickToFirstContentfulPaint: distribution(
      samples.map((sample) => sample.clickToFirstContentfulPaint).filter((value) => value > 0)
    ),
    targetSentBodyBytes: distribution(
      samples.map((sample) => sample.transport.target.sentBodyBytes)
    ),
    targetPlannedBodyBytes: distribution(
      samples.map((sample) => sample.transport.target.plannedBodyBytes)
    ),
    targetRequests: distribution(samples.map((sample) => sample.transport.target.requests)),
    targetCompletedRequests: distribution(
      samples.map((sample) => sample.transport.target.completed)
    ),
    targetCancelledRequests: distribution(
      samples.map((sample) => sample.transport.target.cancelled)
    ),
    articleRequests: distribution(samples.map((sample) => sample.transport.target.articleRequests)),
    articleSentBodyBytes: distribution(
      samples.map((sample) => sample.transport.target.articleSentBodyBytes)
    ),
    articleRequestToHeadersMs: distribution(
      samples.map((sample) => sample.transport.target.articleRequestDetails[0]?.requestToHeadersMs)
    ),
    articleFirstBodyMs: distribution(
      samples.map((sample) => sample.transport.target.articleRequestDetails[0]?.firstBodyMs)
    ),
    articleBodySpanMs: distribution(
      samples.map((sample) => sample.transport.target.articleRequestDetails[0]?.bodySpanMs)
    ),
    articleDurationMs: distribution(
      samples.map((sample) => sample.transport.target.articleRequestDetails[0]?.durationMs)
    ),
    articleRequestDetails: samples.map((sample) => sample.transport.target.articleRequestDetails),
    avatarCandidateWidth: distribution(samples.map((sample) => sample.avatar?.candidateWidth)),
    avatarEncodedBodyBytes: distribution(samples.map((sample) => sample.avatar?.encodedBodySize)),
    avatarTransferBytes: distribution(samples.map((sample) => sample.avatar?.transferSize)),
  };
});

const output = {
  generatedAt: new Date().toISOString(),
  browser: "Detached headless Chrome; no inspected page target until after the action",
  runtime: {
    node: process.version,
    chrome: [...new Set(runs.map((run) => run.chromeVersion))],
  },
  profile: {
    upstreamBaseUrl,
    proxyBaseUrl: baseUrl,
    transport: profile,
    shaping: activationTraceExperiment
      ? "Target phase only: matched content-addressed immutable CSS-first article delivery with a 1 KiB compressed prefix; alternating untraced and Chrome startup-traced processes quantify trace overhead before activation-floor attribution"
      : cacheFreshnessExperiment
        ? "Target phase only: matched CSS-first article delivery with a 1 KiB compressed prefix and completion-delayed remainder; mutable, content-addressed stale, and content-addressed immutable shared-resource cache policies; aggregate downstream budget for uncached target responses"
        : headOrderingExperiment
          ? "Target phase only: original or resource-reordered article head with a bounded early compressed prefix and completion-delayed remainder, plus an original progressive reference; aggregate downstream budget for other target responses"
          : earlyPrefixExperiment
            ? "Target phase only: matched article headers/bytes/completion with a bounded early compressed prefix and completion-delayed remainder; aggregate downstream budget for other target responses"
            : streamingDeliveryExperiment
              ? "Target phase only: matched article headers/bytes/completion with progressive or completion-delayed body delivery; aggregate downstream budget for other target responses"
              : "Target phase only: response-start latency plus aggregate downstream body budget across concurrent target responses",
    source: "Unshaped and loaded in a fresh browser profile per run",
    upload: "Not shaped; the request bodies in this navigation experiment are negligible",
    startMs,
    postActionMs,
    runsPerCase,
    stagedExperiment,
    gatedPromotionExperiment,
    streamingDeliveryExperiment,
    earlyPrefixExperiment,
    headOrderingExperiment,
    cacheFreshnessExperiment,
    activationTraceExperiment,
    resumeFromCheckpoint,
    activationTrace: activationTraceExperiment
      ? {
          durationSeconds: activationTraceDurationSeconds,
          categories: activationTraceCategories.split(","),
          rawTraceDirectory: activationTraceRoot,
        }
      : null,
    candidates: candidates.map(
      ({
        name,
        thresholdMs,
        stagedPolicy: policyName,
        commitCancelBeforeMs,
        promotionGate,
        promotionSettleMs,
        articleDeliveryMode,
        articleEarlyPrefixBytes,
        articleHeadOrder,
        assetPolicy,
        avatarSizePolicy,
        traceEnabled,
      }) => ({
        name,
        thresholdMs,
        stagedPolicy: policyName ?? null,
        commitCancelBeforeMs: commitCancelBeforeMs ?? null,
        promotionGate: promotionGate ?? null,
        promotionSettleMs: promotionSettleMs ?? null,
        articleDeliveryMode: articleDeliveryMode ?? "aggregate",
        articleEarlyPrefixBytes: articleEarlyPrefixBytes ?? 0,
        articleHeadOrder: articleHeadOrder ?? "original",
        assetPolicy: assetPolicy ?? "mutable",
        avatarSizePolicy: avatarSizePolicy ?? null,
        traceEnabled: traceEnabled ?? false,
      })
    ),
    hoverDurations,
    actions,
    intents,
  },
  results,
  rawRuns: runs.map((run) => ({
    ...run,
    transport: retainRequestDetails ? run.transport : { ...run.transport, requests: undefined },
  })),
  limitations: [
    "The named profiles are explicit experiment settings, not claims that they reproduce a current Chrome preset or a particular carrier.",
    "The proxy buffers each upstream localhost response before applying downstream latency and bandwidth, so it isolates browser-facing transport rather than origin compute time.",
    "The byte counter records response-body bytes accepted by the proxy's downstream writes; it excludes headers and request upload bytes.",
    "Per-request transport rows are omitted by default; set PERF032_RETAIN_REQUESTS=1 when request-level attribution is required.",
    "PERF-033 article-request summaries retain Purpose, Sec-Purpose, destination, and body completion even when the full request list is omitted.",
    "PERF-034 uses document-prefetch completion as an observable scheduling gate; it does not claim the source document can observe true hidden-prerender readiness.",
    "PERF-035 gives the article document a dedicated byte schedule so progressive and burst delivery can match its headers, bytes, and nominal completion time; destination subresources continue to use the aggregate scheduler.",
    "PERF-036 releases a bounded compressed prefix shortly after headers and withholds at least the final byte until the same scheduled completion point; it measures browser-visible compressed bytes, not decoded HTML bytes.",
    "PERF-037 reorders the same decoded head tags, so compressed article byte counts can differ slightly; the analyzer bounds that gzip-ordering effect and verifies decoded byte equality.",
    "PERF-038 keeps source and target shared-resource content identical while comparing current mutable URLs, content-addressed max-age=0 URLs, and equally shaped content-addressed immutable URLs. The hashed-stale/hashed-immutable contrast isolates freshness from URL rewriting.",
    "PERF-039 alternates identical untraced and startup-traced browsers for both the legacy responsive avatar hint and the fixed 40 px hint. A material trace-overhead result limits event durations to attribution rather than treating traced FCP as an unperturbed timing estimate.",
    "Removing a speculation-rules element at click is an experimental cancellation request; activationStart determines whether Chrome actually avoided prerender activation.",
    "Synthetic pointer, focus, and touch events reveal policy boundaries but do not estimate the field distribution of user intent.",
    "These lab results test the isolated fixture and do not predict visitor growth or field Core Web Vitals by themselves.",
  ],
};
const outputPath = path.resolve(fixtureRoot, "results", outputName);
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
rmSync(checkpointPath, { force: true });

console.table(
  results.map((result) => ({
    candidate: result.candidate,
    action: result.action,
    intent: result.intent,
    "intent ms": result.hoverMs,
    activations: `${result.activationSuccesses}/${result.runs}`,
    "click→FCP": result.clickToFirstContentfulPaint.median,
    "target bytes": result.targetSentBodyBytes.median,
    requests: result.targetRequests.median,
    "article reqs": result.articleRequests.median,
    "article bytes": result.articleSentBodyBytes.median,
    "article mode": result.articleDeliveryMode,
    "early prefix": result.articleEarlyPrefixBytes,
    "head order": result.articleHeadOrder,
    "cache policy": result.assetPolicy,
    "avatar sizes": result.avatarSizePolicy,
    "avatar candidate": result.avatarCandidateWidth.median,
    "avatar body bytes": result.avatarEncodedBodyBytes.median,
    traced: result.traceEnabled,
    "article first body": result.articleFirstBodyMs.median,
    "article duration": result.articleDurationMs.median,
    "rule removals": result.commitRuleRemovals.join(","),
    "gate deferrals": result.promotionGateDeferrals.join(","),
    "cancelled reqs": result.targetCancelledRequests.median,
  }))
);
console.log(`Wrote ${outputPath}`);
