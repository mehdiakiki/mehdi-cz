import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { inspectBuild } from "./inspect-build.mjs";

const root = process.cwd();
const experiment = path.join(root, "experiments", "route-css-graph");
const resultsDir = path.join(experiment, "results");
const logsDir = path.join(resultsDir, "logs");
const scratch = ".next-perf052-scratch";
const node = process.execPath;
const requestCosts = [0, 4096, 20000, 100000];
const weightDistributions = [0, 0.1, 0.5];
const topology = process.argv[2] ?? "single-entry";
if (!new Set(["single-entry", "explicit-sources"]).has(topology)) {
  throw new Error(`Unsupported topology: ${topology}`);
}
const filePrefix = topology === "single-entry" ? "" : "explicit-";

await mkdir(logsDir, { recursive: true });

async function processTreeRssKiB(pid, visited = new Set()) {
  if (visited.has(pid)) return 0;
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
    // A process can exit between the status and children reads.
  }
  return total;
}

async function runBuild(requestCost, weightDistribution) {
  const arm = `r${requestCost}-w${String(weightDistribution).replace(".", "p")}`;
  const label = `${filePrefix}${arm}`;
  await rm(scratch, { recursive: true, force: true });
  const started = performance.now();
  const child = spawn(node, ["node_modules/next/dist/bin/next", "build", "--turbopack"], {
    cwd: root,
    env: {
      ...process.env,
      NEXT_DIST_DIR: scratch,
      PERF052_CSS_CHUNKING: "graph",
      PERF052_REQUEST_COST: String(requestCost),
      PERF052_WEIGHT_DISTRIBUTION: String(weightDistribution),
      PERF_EXPERIMENT_IGNORE_TYPE_ERRORS: "true",
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
  const monitor = setInterval(async () => {
    peakTreeRssKiB = Math.max(peakTreeRssKiB, await processTreeRssKiB(child.pid));
  }, 25);
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  clearInterval(monitor);
  peakTreeRssKiB = Math.max(peakTreeRssKiB, await processTreeRssKiB(child.pid));
  const wallMs = performance.now() - started;
  await writeFile(path.join(logsDir, `${label}.log`), log);
  if (exitCode !== 0) {
    await rm(scratch, { recursive: true, force: true });
    throw new Error(`${label} build exited ${exitCode}`);
  }

  const result = await inspectBuild(scratch, {
    topology,
    bundler: "turbopack",
    requestCost,
    weightDistribution,
    wallMs,
    peakTreeRssKiB,
    peakRssMethod:
      "Maximum sampled sum of VmRSS for the build process tree at 25 ms intervals; shared pages may be counted in multiple processes.",
    node: process.version,
  });
  await writeFile(path.join(resultsDir, `${label}.json`), `${JSON.stringify(result, null, 2)}\n`);
  await rm(scratch, { recursive: true, force: true });
  return result;
}

const webpack = await inspectBuild(".next-perf050", {
  topology: "single-entry",
  bundler: "webpack",
  retainedFrom: "PERF-050",
});
if (topology === "single-entry") {
  await writeFile(
    path.join(resultsDir, "webpack-control.json"),
    `${JSON.stringify(webpack, null, 2)}\n`
  );
}

const arms = [];
for (const requestCost of requestCosts) {
  for (const weightDistribution of weightDistributions) {
    console.log(`\nPERF-052 ${requestCost} / ${weightDistribution}\n`);
    arms.push(await runBuild(requestCost, weightDistribution));
  }
}

const signatures = arms.map((arm) => ({
  requestCost: arm.metadata.requestCost,
  weightDistribution: arm.metadata.weightDistribution,
  routeHrefs: arm.routes.map((route) => ({ key: route.key, hrefs: route.hrefs })),
  assets: arm.assets.map((asset) => ({
    href: asset.href,
    rawBytes: asset.rawBytes,
    gzipBytes: asset.gzipBytes,
    sha256: asset.sha256,
  })),
}));
const topologySignatures = new Set(
  signatures.map((signature) =>
    JSON.stringify({ routeHrefs: signature.routeHrefs, assets: signature.assets })
  )
);
const summary = {
  capturedAt: new Date().toISOString(),
  protocol: {
    requestCosts,
    weightDistributions,
    armCount: arms.length,
  },
  webpack: webpack.summary,
  topology,
  allGraphArmsEquivalent: topologySignatures.size === 1,
  distinctTopologySignatures: topologySignatures.size,
  arms: arms.map((arm) => ({ metadata: arm.metadata, summary: arm.summary })),
};
await writeFile(
  path.join(
    resultsDir,
    topology === "single-entry" ? "single-topology-sweep.json" : "explicit-source-sweep.json"
  ),
  `${JSON.stringify(summary, null, 2)}\n`
);
console.log(JSON.stringify(summary, null, 2));
