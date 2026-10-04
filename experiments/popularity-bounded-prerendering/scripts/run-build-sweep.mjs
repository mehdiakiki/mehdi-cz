import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { filterVisiblePosts } from "../../../lib/publication.mjs";
import {
  comparePrerenderPriority,
  selectPrerenderEntries,
} from "../../../lib/prerender-budget.mjs";

const root = process.cwd();
const experiment = path.join(root, "experiments", "popularity-bounded-prerendering");
const resultsDir = path.join(experiment, "results");
const workDir = path.join(experiment, "work");
const scratchName = ".next-perf055-scratch";
const scratch = path.join(root, scratchName);
const nextBinary = path.join(root, "node_modules", "next", "dist", "bin", "next");
const node = process.execPath;
const repetitionOrders = [
  ["full", "budget-25", "budget-100", "budget-250"],
  ["budget-100", "budget-250", "full", "budget-25"],
  ["budget-250", "budget-25", "budget-100", "full"],
];
const dynamicRouteKeys = ["/blog/[...slug]", "/rust/failures/[slug]"];

if (path.dirname(scratch) !== root || path.basename(scratch) !== scratchName) {
  throw new Error(`Refusing to manage unsafe scratch path: ${scratch}`);
}

await mkdir(resultsDir, { recursive: true });
await mkdir(workDir, { recursive: true });

async function loadJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function sha256File(file) {
  const bytes = await readFile(file);
  return { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}

async function treeStats(target) {
  try {
    const targetStat = await stat(target);
    if (targetStat.isFile()) return { files: 1, bytes: targetStat.size };
    if (!targetStat.isDirectory()) return { files: 0, bytes: 0 };
  } catch (error) {
    if (error?.code === "ENOENT") return { files: 0, bytes: 0 };
    throw error;
  }

  let files = 0;
  let bytes = 0;
  const entries = await readdir(target, { withFileTypes: true });
  for (const entry of entries) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) {
      const nested = await treeStats(child);
      files += nested.files;
      bytes += nested.bytes;
    } else if (entry.isFile()) {
      const childStat = await stat(child);
      files += 1;
      bytes += childStat.size;
    }
  }
  return { files, bytes };
}

async function routeArtifactStats(routePath) {
  const stem = path.join(scratch, "server", "app", routePath.replace(/^\//, ""));
  const parent = path.dirname(stem);
  const basename = path.basename(stem);
  let entries;
  try {
    entries = await readdir(parent, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return { files: 0, bytes: 0, entries: [] };
    throw error;
  }

  const matched = entries.filter(
    (entry) => entry.name === `${basename}.segments` || entry.name.startsWith(`${basename}.`)
  );
  let files = 0;
  let bytes = 0;
  for (const entry of matched) {
    const item = await treeStats(path.join(parent, entry.name));
    files += item.files;
    bytes += item.bytes;
  }
  return { files, bytes, entries: matched.map((entry) => entry.name).sort() };
}

async function processTreeRssKiB(pid, visited = new Set()) {
  if (!pid || visited.has(pid)) return 0;
  visited.add(pid);
  let total = 0;
  try {
    const status = await readFile(`/proc/${pid}/status`, "utf8");
    const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
    total += Number(match?.[1] ?? 0);
  } catch {
    return total;
  }

  try {
    const children = await readFile(`/proc/${pid}/task/${pid}/children`, "utf8");
    for (const child of children.trim().split(/\s+/).filter(Boolean)) {
      total += await processTreeRssKiB(Number(child), visited);
    }
  } catch {
    // Processes can exit between reading status and the child list.
  }
  return total;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function reduction(control, candidate) {
  return control === 0 ? 0 : (control - candidate) / control;
}

function relativeDifference(control, candidate) {
  return control === 0 ? (candidate === 0 ? 0 : Infinity) : Math.abs(candidate - control) / control;
}

const blogs = filterVisiblePosts(
  await loadJson(path.join(root, ".contentlayer", "generated", "Blog", "_index.json")),
  { preview: false }
);
const rustFailures = filterVisiblePosts(
  await loadJson(path.join(root, ".contentlayer", "generated", "RustFailure", "_index.json")),
  { preview: false }
);
const inventories = {
  blog: blogs.map((entry) => ({ slug: entry.slug, date: entry.date })),
  rust: rustFailures.map((entry) => ({ slug: entry.slug, date: entry.date })),
};
const prioritizedInventories = {
  blog: [...inventories.blog].sort(comparePrerenderPriority),
  rust: [...inventories.rust].sort(comparePrerenderPriority),
};

function armBudget(arm) {
  return arm === "full" ? null : Number(arm.slice("budget-".length));
}

function expectedForArm(arm) {
  const budget = armBudget(arm);
  const environment = budget === null ? {} : { PRERENDER_BUDGET: String(budget) };
  return {
    blog: selectPrerenderEntries(inventories.blog, environment),
    rust: selectPrerenderEntries(inventories.rust, environment),
  };
}

const sourceFiles = [
  "next.config.js",
  "package.json",
  "tsconfig.json",
  "lib/publication.mjs",
  "lib/prerender-budget.mjs",
  "app/(site)/blog/[...slug]/page.tsx",
  "app/(site)/rust/failures/[slug]/page.tsx",
  ".contentlayer/generated/Blog/_index.json",
  ".contentlayer/generated/RustFailure/_index.json",
];
async function captureSourceSnapshot() {
  return Object.fromEntries(
    await Promise.all(sourceFiles.map(async (file) => [file, await sha256File(path.join(root, file))]))
  );
}
const sourceSnapshot = await captureSourceSnapshot();

async function inspectBuild(arm, repetition, wallMs, peakTreeRssKiB) {
  const observedSourceSnapshot = await captureSourceSnapshot();
  const manifest = await loadJson(path.join(scratch, "prerender-manifest.json"));
  const routeKeys = new Set(Object.keys(manifest.routes));
  const expected = expectedForArm(arm);
  const allPaths = {
    blog: inventories.blog.map((entry) => `/blog/${entry.slug}`),
    rust: inventories.rust.map((entry) => `/rust/failures/${entry.slug}`),
  };
  const prioritizedPaths = {
    blog: prioritizedInventories.blog.map((entry) => `/blog/${entry.slug}`),
    rust: prioritizedInventories.rust.map((entry) => `/rust/failures/${entry.slug}`),
  };
  const expectedPaths = {
    blog: expected.blog.map((entry) => `/blog/${entry.slug}`),
    rust: expected.rust.map((entry) => `/rust/failures/${entry.slug}`),
  };
  const expectedSets = {
    blog: new Set(expectedPaths.blog),
    rust: new Set(expectedPaths.rust),
  };
  const actualPaths = {
    blog: allPaths.blog.filter((route) => routeKeys.has(route)),
    rust: allPaths.rust.filter((route) => routeKeys.has(route)),
  };
  const missingExpected = {
    blog: expectedPaths.blog.filter((route) => !routeKeys.has(route)),
    rust: expectedPaths.rust.filter((route) => !routeKeys.has(route)),
  };
  const unexpectedOmitted = {
    blog: actualPaths.blog.filter((route) => !expectedSets.blog.has(route)),
    rust: actualPaths.rust.filter((route) => !expectedSets.rust.has(route)),
  };
  const priorityRoutes = {
    blog: prioritizedPaths.blog[0],
    rust: prioritizedPaths.rust[0],
  };
  const firstOmittedRoutes = {
    blog: prioritizedPaths.blog.find((route) => !expectedSets.blog.has(route)) ?? null,
    rust: prioritizedPaths.rust.find((route) => !expectedSets.rust.has(route)) ?? null,
  };
  const dynamicFallbacks = Object.fromEntries(
    dynamicRouteKeys.map((key) => {
      const value = manifest.dynamicRoutes[key];
      return [
        key,
        {
          present: Boolean(value),
          fallback: value?.fallback,
          compute: value?.compute,
          response: value?.response,
          allowsOnDemand: Boolean(value) && value.fallback !== false && value.compute === "blocking",
        },
      ];
    })
  );
  const sitemap = await sha256File(path.join(scratch, "server", "app", "sitemap.xml.body"));

  return {
    capturedAt: new Date().toISOString(),
    arm,
    repetition,
    budgetPerFamily: armBudget(arm),
    environment: {
      node: process.version,
      next: (await loadJson(path.join(root, "node_modules", "next", "package.json"))).version,
      bundler: "webpack",
      nodeEnv: "production",
      nextDistDir: scratchName,
      ignoredTypeErrors: true,
      nodeOptions: "--no-warnings",
    },
    sourceSnapshot: observedSourceSnapshot,
    sourceSnapshotMatchesInitial:
      JSON.stringify(observedSourceSnapshot) === JSON.stringify(sourceSnapshot),
    inventory: { blog: inventories.blog.length, rust: inventories.rust.length },
    metrics: {
      wallMs,
      peakTreeRssKiB,
      peakRssMethod:
        "Maximum sampled sum of VmRSS for the build process tree at 25 ms intervals; shared pages may be counted in multiple processes.",
      dist: await treeStats(scratch),
      serverApp: await treeStats(path.join(scratch, "server", "app")),
      blogArtifacts: await treeStats(path.join(scratch, "server", "app", "blog")),
      rustFailureArtifacts: await treeStats(
        path.join(scratch, "server", "app", "rust", "failures")
      ),
      priorityArtifacts: {
        blog: await routeArtifactStats(priorityRoutes.blog),
        rust: await routeArtifactStats(priorityRoutes.rust),
      },
    },
    manifest: {
      routeCount: routeKeys.size,
      dynamicRouteCount: Object.keys(manifest.dynamicRoutes).length,
      expectedCounts: { blog: expectedPaths.blog.length, rust: expectedPaths.rust.length },
      actualCounts: { blog: actualPaths.blog.length, rust: actualPaths.rust.length },
      missingExpected,
      unexpectedOmitted,
      priorityRoutes,
      firstOmittedRoutes,
      firstOmittedPrerendered: {
        blog: firstOmittedRoutes.blog ? routeKeys.has(firstOmittedRoutes.blog) : false,
        rust: firstOmittedRoutes.rust ? routeKeys.has(firstOmittedRoutes.rust) : false,
      },
      dynamicFallbacks,
    },
    sitemap,
  };
}

async function runBuild(arm, repetition, position) {
  const label = `rep-${repetition}-${arm}`;
  const logFile = path.join(workDir, `${label}.log`);
  const resultFile = path.join(resultsDir, `${label}.json`);
  const budget = armBudget(arm);

  await rm(scratch, { recursive: true, force: true });
  console.log(`\nPERF-055 repetition ${repetition}, position ${position}: ${arm}\n`);
  const started = performance.now();
  const child = spawn(node, [nextBinary, "build", "--webpack"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      INIT_CWD: root,
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_DIST_DIR: scratchName,
      PERF_EXPERIMENT_IGNORE_TYPE_ERRORS: "true",
      NODE_OPTIONS: "--no-warnings",
      EXPORT: "",
      PRERENDER_BUDGET: budget === null ? "" : String(budget),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let log = "";
  child.stdout.on("data", (chunk) => {
    log += chunk;
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    log += chunk;
    process.stderr.write(chunk);
  });

  let peakTreeRssKiB = 0;
  let monitoring = true;
  const monitor = async () => {
    while (monitoring) {
      peakTreeRssKiB = Math.max(peakTreeRssKiB, await processTreeRssKiB(child.pid));
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };
  const monitoringPromise = monitor();
  const { code, signal } = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  monitoring = false;
  await monitoringPromise;
  const wallMs = performance.now() - started;
  await writeFile(logFile, log);

  if (code !== 0) {
    const failure = {
      capturedAt: new Date().toISOString(),
      arm,
      repetition,
      exitCode: code,
      signal,
      wallMs,
      peakTreeRssKiB,
      logFile: path.relative(root, logFile),
    };
    await writeFile(resultFile, `${JSON.stringify(failure, null, 2)}\n`);
    await rm(scratch, { recursive: true, force: true });
    throw new Error(`${label} failed with exit code ${code ?? `signal ${signal}`}`);
  }

  try {
    const result = await inspectBuild(arm, repetition, wallMs, peakTreeRssKiB);
    await writeFile(resultFile, `${JSON.stringify(result, null, 2)}\n`);
    console.log(
      `PERF-055 ${label}: ${(wallMs / 1000).toFixed(1)}s, ` +
        `${(peakTreeRssKiB / 1024).toFixed(0)} MiB peak tree RSS, ` +
        `${result.metrics.serverApp.bytes} server/app bytes`
    );
    return result;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

const runs = [];
for (const [repetitionIndex, order] of repetitionOrders.entries()) {
  for (const [positionIndex, arm] of order.entries()) {
    runs.push(await runBuild(arm, repetitionIndex + 1, positionIndex + 1));
  }
}

const controlByRepetition = new Map(
  runs.filter((run) => run.arm === "full").map((run) => [run.repetition, run])
);
const arms = ["full", "budget-25", "budget-100", "budget-250"];
const medians = Object.fromEntries(
  arms.map((arm) => {
    const armRuns = runs.filter((run) => run.arm === arm);
    return [
      arm,
      {
        wallMs: median(armRuns.map((run) => run.metrics.wallMs)),
        peakTreeRssKiB: median(armRuns.map((run) => run.metrics.peakTreeRssKiB)),
        serverAppBytes: median(armRuns.map((run) => run.metrics.serverApp.bytes)),
        distBytes: median(armRuns.map((run) => run.metrics.dist.bytes)),
        blogArtifactBytes: median(armRuns.map((run) => run.metrics.blogArtifacts.bytes)),
        rustFailureArtifactBytes: median(
          armRuns.map((run) => run.metrics.rustFailureArtifacts.bytes)
        ),
        priorityBlogBytes: median(
          armRuns.map((run) => run.metrics.priorityArtifacts.blog.bytes)
        ),
        priorityRustBytes: median(
          armRuns.map((run) => run.metrics.priorityArtifacts.rust.bytes)
        ),
      },
    ];
  })
);
const control = medians.full;
const decisions = Object.fromEntries(
  arms.slice(1).map((arm) => {
    const armRuns = runs.filter((run) => run.arm === arm);
    const candidate = medians[arm];
    const gates = {
      serverAppBytesReduction: reduction(control.serverAppBytes, candidate.serverAppBytes) >= 0.5,
      wallTimeReduction: reduction(control.wallMs, candidate.wallMs) >= 0.3,
      peakTreeRssReduction: reduction(control.peakTreeRssKiB, candidate.peakTreeRssKiB) >= 0.2,
      priorityBlogArtifactStable:
        relativeDifference(control.priorityBlogBytes, candidate.priorityBlogBytes) <= 0.03,
      priorityRustArtifactStable:
        relativeDifference(control.priorityRustBytes, candidate.priorityRustBytes) <= 0.03,
      exactRouteMembership: armRuns.every(
        (run) =>
          run.manifest.missingExpected.blog.length === 0 &&
          run.manifest.missingExpected.rust.length === 0 &&
          run.manifest.unexpectedOmitted.blog.length === 0 &&
          run.manifest.unexpectedOmitted.rust.length === 0 &&
          !run.manifest.firstOmittedPrerendered.blog &&
          !run.manifest.firstOmittedPrerendered.rust
      ),
      onDemandFallbacks: armRuns.every((run) =>
        Object.values(run.manifest.dynamicFallbacks).every((fallback) => fallback.allowsOnDemand)
      ),
      sourceSnapshotStable: armRuns.every(
        (run) => run.sourceSnapshotMatchesInitial
      ),
      sitemapStable: armRuns.every((run) => {
        const matchedControl = controlByRepetition.get(run.repetition);
        return run.sitemap.sha256 === matchedControl.sitemap.sha256;
      }),
    };
    return [
      arm,
      {
        metrics: {
          serverAppBytesReduction: reduction(control.serverAppBytes, candidate.serverAppBytes),
          wallTimeReduction: reduction(control.wallMs, candidate.wallMs),
          peakTreeRssReduction: reduction(control.peakTreeRssKiB, candidate.peakTreeRssKiB),
          priorityBlogArtifactDifference: relativeDifference(
            control.priorityBlogBytes,
            candidate.priorityBlogBytes
          ),
          priorityRustArtifactDifference: relativeDifference(
            control.priorityRustBytes,
            candidate.priorityRustBytes
          ),
        },
        gates,
        passes: Object.values(gates).every(Boolean),
      },
    ];
  })
);
const passing = arms.slice(1).filter((arm) => decisions[arm].passes);
const winner = passing[0] ?? null;
const summary = {
  capturedAt: new Date().toISOString(),
  protocol: { repetitionOrders, repetitionsPerArm: 3, samplingIntervalMs: 25 },
  inventory: { blog: inventories.blog.length, rust: inventories.rust.length },
  sourceSnapshot,
  medians,
  decisions,
  winner,
  nextStep: winner
    ? "Advance the winning arm to retained-artifact runtime validation."
    : "Stop before runtime, browser, export, or Docker work because no arm passed every build gate.",
};
await writeFile(path.join(resultsDir, "build-sweep-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`\n${JSON.stringify(summary, null, 2)}`);
