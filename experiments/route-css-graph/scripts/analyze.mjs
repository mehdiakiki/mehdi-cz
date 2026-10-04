import { readFile, writeFile } from "node:fs/promises";

const resultsDir = "experiments/route-css-graph/results";
const readJson = async (name) => JSON.parse(await readFile(`${resultsDir}/${name}`, "utf8"));
const [webpack, singleSweep, explicitSweep, generation] = await Promise.all([
  readJson("webpack-control.json"),
  readJson("single-topology-sweep.json"),
  readJson("explicit-source-sweep.json"),
  readJson("source-generation.json"),
]);

const armFileName = (prefix, arm) =>
  `${prefix}r${arm.metadata.requestCost}-w${String(arm.metadata.weightDistribution).replace(
    ".",
    "p"
  )}.json`;
const singleBuilds = await Promise.all(
  singleSweep.arms.map((arm) => readJson(armFileName("", arm)))
);
const explicitDefaultBuild = await readJson("explicit-r20000-w0p1.json");

const findArm = (sweep, requestCost, weightDistribution) =>
  sweep.arms.find(
    (arm) =>
      arm.metadata.requestCost === requestCost &&
      arm.metadata.weightDistribution === weightDistribution
  );
const singleDefault = findArm(singleSweep, 20000, 0.1);
const explicitDefault = findArm(explicitSweep, 20000, 0.1);
if (!singleDefault || !explicitDefault) throw new Error("Missing documented default arm");

const baseline = webpack.summary;
const candidate = explicitDefault.summary;
const percentChange = (value, control) => Number((((value - control) / control) * 100).toFixed(3));
const percentSaving = (value, control) => Number((((control - value) / control) * 100).toFixed(3));
const roundBytes = (value) => Number(value.toFixed(3));
const byteSaving = roundBytes(baseline.routeWeightedGzipBytes - candidate.routeWeightedGzipBytes);
const appByteSaving = roundBytes(
  baseline.routeWeightedApplicationGzipBytes - candidate.routeWeightedApplicationGzipBytes
);
const journeySaving = roundBytes(
  baseline.journeyThreeRouteGzipBytes - candidate.journeyThreeRouteGzipBytes
);
const buildWallChange = percentChange(
  explicitDefault.metadata.wallMs,
  singleDefault.metadata.wallMs
);
const buildRssChange = percentChange(
  explicitDefault.metadata.peakTreeRssKiB,
  singleDefault.metadata.peakTreeRssKiB
);

const gates = {
  sourcePartitionExactLeafMultiset: generation.partition.exactLeafMultiset,
  routeWeightedCss:
    byteSaving >= 3072 ||
    percentSaving(candidate.routeWeightedGzipBytes, baseline.routeWeightedGzipBytes) >= 20,
  threeRouteJourney:
    percentSaving(candidate.journeyThreeRouteGzipBytes, baseline.journeyThreeRouteGzipBytes) >= 10,
  blockingRequests: candidate.medianRequestCount - baseline.medianRequestCount <= 1,
  repeatedFlightShare: candidate.maxRepeatedFlightShare <= 0.02,
  repeatedFlightBytes: candidate.maxRepeatedFlightBytes <= 10000,
  buildWall: Math.abs(buildWallChange) <= 10,
  buildRss: Math.abs(buildRssChange) <= 10,
};
const artifactEligible =
  gates.routeWeightedCss &&
  gates.threeRouteJourney &&
  gates.blockingRequests &&
  gates.repeatedFlightShare &&
  gates.repeatedFlightBytes &&
  gates.buildWall &&
  gates.buildRss;

const analysis = {
  capturedAt: new Date().toISOString(),
  decision: "reject-before-browser-timing",
  artifactEligible,
  browserTimingRun: false,
  webpackMaterializationRun: false,
  toolchainCaveat:
    "The repository declares Node >=24.20.0, but this session exposed Node 24.11.1 as its newest installed 24.x runtime. All compared Turbopack arms used the same runtime; release qualification should reproduce on the declared toolchain.",
  stoppingReason:
    "The explicit-source Turbopack arm fails route-weighted bytes, three-route transfer, and repeated Flight share. There is no eligible graph winner to materialize in webpack.",
  comparison: {
    arm: { requestCost: 20000, weightDistribution: 0.1 },
    rationale:
      "The installed documented defaults represent the ten-way tie for smallest route-weighted output without selecting on noisy build time.",
    webpackControl: baseline,
    turbopackSingleDefault: singleDefault.summary,
    turbopackExplicitDefault: candidate,
    routeWeightedGzipByteSaving: byteSaving,
    routeWeightedGzipPercentSaving: percentSaving(
      candidate.routeWeightedGzipBytes,
      baseline.routeWeightedGzipBytes
    ),
    routeWeightedApplicationGzipByteSaving: appByteSaving,
    routeWeightedApplicationGzipPercentSaving: percentSaving(
      candidate.routeWeightedApplicationGzipBytes,
      baseline.routeWeightedApplicationGzipBytes
    ),
    threeRouteGzipByteSaving: journeySaving,
    threeRouteGzipPercentSaving: percentSaving(
      candidate.journeyThreeRouteGzipBytes,
      baseline.journeyThreeRouteGzipBytes
    ),
    explicitVersusSingleTurbopackWeightedGzipSaving: roundBytes(
      singleDefault.summary.routeWeightedGzipBytes - candidate.routeWeightedGzipBytes
    ),
    explicitVersusSingleTurbopackThreeRouteGzipSaving: roundBytes(
      singleDefault.summary.journeyThreeRouteGzipBytes - candidate.journeyThreeRouteGzipBytes
    ),
    medianBlockingRequestDelta: candidate.medianRequestCount - baseline.medianRequestCount,
    buildWallPercentChange: buildWallChange,
    buildTreeRssPercentChange: buildRssChange,
  },
  negativeControl: {
    distinctPackagingSignatures: singleSweep.distinctTopologySignatures,
    everyArmHasUniformRouteApplicationBytes: singleBuilds.every(
      (build) =>
        new Set(build.routes.map((route) => route.applicationRawBytes)).size === 1 &&
        build.routes[0].applicationRawBytes === 92346
    ),
    explanation:
      "Graph tuning merges or separates the root Tailwind, alert, and font outputs, but it cannot create route ownership: all routes still import the same application bytes.",
  },
  everyExplicitDefaultRouteLargerThanWebpack: explicitDefaultBuild.routes.every(
    (route) =>
      route.applicationGzipBytes >
      webpack.routes.find((control) => control.key === route.key).applicationGzipBytes
  ),
  generatedSources: generation,
  gates,
};

await writeFile(`${resultsDir}/analysis.json`, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify(analysis, null, 2));
