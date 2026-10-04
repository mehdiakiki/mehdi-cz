import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const resultUrl = new URL("../results/perf047-source-validation.json", import.meta.url);
const result = JSON.parse(await readFile(resultUrl, "utf8"));
let checks = 0;

function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

check(result.experiment, "PERF-047", "wrong experiment id");
check(result.patch.matchesPullRequestExactly, true, "patch is not exact");
check(
  result.patch.workingDiffSha256,
  result.patch.upstreamDiffSha256,
  "working diff does not match the upstream PR diff"
);
check(result.patch.files, 8, "unexpected patch file count");
check(result.patch.additions, 194, "unexpected addition count");
check(result.patch.deletions, 6, "unexpected deletion count");

for (const row of result.matrix) {
  check(row.before.result, "failed-as-expected", `${row.bundler} base passed`);
  check(
    row.before.missing,
    ["/products/alpha"],
    `${row.bundler} did not reproduce the alpha boundary`
  );
  check(row.after.result, "passed", `${row.bundler} patch failed`);
  check(row.after.missing, [], `${row.bundler} still loses a task`);
  check(
    row.after.routeTreesObserved,
    result.routeTreesExpected,
    `${row.bundler} did not fetch all five route trees`
  );
}

check(result.validation.baseBuildAll.result, "passed", "base build failed");
check(result.validation.patchedNextBuild.result, "passed", "patch build failed");
check(result.validation.prettier, "passed", "format check failed");
check(result.validation.eslint, "passed", "lint check failed");
check(result.discardedSetupAttempts.length, 3, "failure record changed");
check(result.nextGrowthSearch.metrics.lcpMs, 151, "growth trace LCP changed");
check(result.nextGrowthSearch.metrics.cls, 0, "growth trace shifted layout");
check(
  result.nextGrowthSearch.metrics.lcpElementRenderDelayMs,
  136,
  "growth trace render delay changed"
);
check(
  result.nextGrowthSearch.metrics.criticalNetworkChainMs,
  20,
  "growth trace critical chain changed"
);
check(result.nextGrowthSearch.fieldData, null, "local trace gained field data");
check(
  result.nextGrowthSearch.decision,
  "PERF-048-low-end-mobile-route-journey-survey",
  "next experiment changed"
);
check(result.claims.schedulerTaskCommitmentFixed, true, "scheduler conclusion is missing");
check(result.claims.localSpeedupClaimed, false, "speed was overstated");
check(
  result.claims.suiteDurationsComparedAsPerformance,
  false,
  "test-suite setup time was misused as a performance metric"
);
check(result.claims.siteRuntimeChanged, false, "site runtime was changed");
check(result.claims.externalPullRequestModified, false, "external PR was modified");

console.log(`PERF-047 source validation: ${checks}/${checks} checks passed`);
