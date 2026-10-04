import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(
  readFileSync(path.join(root, "results", "perf042-lazy-high.json"), "utf8")
);
const candidate = JSON.parse(
  readFileSync(path.join(root, "results", "perf042-media-preload.json"), "utf8")
);

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value, places = 1) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function cell(runs, profile, route) {
  return runs.filter((run) => run.profile === profile && run.route === route);
}

assert.equal(baseline.experiment, "PERF-042");
assert.equal(candidate.experiment, "PERF-042");
assert.equal(baseline.runs.length, 20);
assert.equal(candidate.runs.length, 20);
assert.deepEqual(candidate.transport, baseline.transport);

const cells = [];
for (const profile of ["mobile", "desktop"]) {
  for (const route of ["control-plane", "load-balancer"]) {
    const before = cell(baseline.runs, profile, route);
    const after = cell(candidate.runs, profile, route);
    assert.equal(before.length, 5);
    assert.equal(after.length, 5);

    for (let index = 0; index < before.length; index += 1) {
      const a = before[index];
      const b = after[index];
      assert.equal(b.image.loading, "lazy");
      assert.equal(b.image.fetchPriority, "high");
      assert.equal(b.image.initialPriority, "High");
      assert.equal(b.image.requestCount, 1, `${b.runId} duplicated its image request`);
      assert.equal(b.preloads.length, 1);
      assert.equal(b.preloads[0].fetchPriority, "high");
      assert.equal(b.preloads[0].imageSrcSet, b.image.srcSet);
      assert.equal(b.preloads[0].imageSizes, b.image.sizes);
      assert.equal(b.preloads[0].mediaMatches, profile === "desktop");
      assert.equal(b.image.resourceInitiatorType, profile === "desktop" ? "link" : "img");
      assert.equal(a.image.resourceInitiatorType, "img");
      assert.equal(b.image.currentSrc, a.image.currentSrc);
      assert.equal(b.image.encodedBodyBytes, a.image.encodedBodyBytes);
      for (const field of ["top", "bottom", "width", "height", "distanceBelowViewport"]) {
        assert.equal(b.image[field], a.image[field], `${b.runId} changed ${field}`);
      }
      assert.equal(b.lcp.alt, a.lcp.alt);
      assert.equal(b.lcp.tagName, a.lcp.tagName);
      assert.ok(!b.document.linkHeader?.includes('as="image"'));
    }

    const beforeStart = median(before.map((run) => run.image.resourceStart));
    const afterStart = median(after.map((run) => run.image.resourceStart));
    const beforeEnd = median(before.map((run) => run.image.responseEnd));
    const afterEnd = median(after.map((run) => run.image.responseEnd));
    const beforeLcp = median(before.map((run) => run.lcp.startTime));
    const afterLcp = median(after.map((run) => run.lcp.startTime));
    const documentOverhead = after[0].document.bodyBytes - before[0].document.bodyBytes;
    assert.ok(documentOverhead > 0 && documentOverhead < 3_000);

    const summary = {
      profile,
      route,
      imageTop: after[0].image.top,
      intersectsViewport: after[0].image.intersectsViewport,
      preloadMediaMatches: after[0].preloads[0].mediaMatches,
      imageRequestCount: 1,
      documentRawByteOverhead: documentOverhead,
      requestStart: {
        baselineMedianMs: round(beforeStart),
        candidateMedianMs: round(afterStart),
        deltaMs: round(afterStart - beforeStart),
      },
      responseEnd: {
        baselineMedianMs: round(beforeEnd),
        candidateMedianMs: round(afterEnd),
        deltaMs: round(afterEnd - beforeEnd),
      },
      lcp: {
        identity: after[0].lcp.alt || after[0].lcp.tagName,
        baselineMedianMs: round(beforeLcp),
        candidateMedianMs: round(afterLcp),
        deltaMs: round(afterLcp - beforeLcp),
      },
    };

    if (profile === "desktop") {
      assert.equal(summary.intersectsViewport, true);
      assert.ok(summary.requestStart.deltaMs < -700);
      assert.ok(summary.responseEnd.deltaMs < -700);
      assert.ok(summary.lcp.deltaMs < -400);
    } else {
      assert.ok(Math.abs(summary.requestStart.deltaMs) < 100);
      assert.ok(Math.abs(summary.lcp.deltaMs) < 100);
    }
    cells.push(summary);
  }
}

const output = {
  experiment: "PERF-042",
  generatedAt: new Date().toISOString(),
  decision: "adopt-opt-in-media-gated-responsive-preload",
  reason:
    "The exact responsive preload removes more than 700 ms of desktop discovery delay and more than 400 ms of desktop image-LCP while mismatched mobile layouts retain img-initiated lazy behavior and one request.",
  invariants: {
    exactSrcSetReuse: true,
    exactSizesReuse: true,
    oneImageRequestPerNavigation: true,
    mobilePreloadMediaMismatch: true,
    mobileResourceStillImgInitiated: true,
    desktopResourceLinkInitiated: true,
    geometryPreserved: true,
    selectedCandidateAndBytesPreserved: true,
  },
  cells,
};

writeFileSync(
  path.join(root, "results", "perf042-analysis.json"),
  `${JSON.stringify(output, null, 2)}\n`
);
console.log(JSON.stringify(output, null, 2));
