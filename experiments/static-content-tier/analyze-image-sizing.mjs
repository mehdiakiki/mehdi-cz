import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(experimentRoot, "../..");
const beforePath = path.join(experimentRoot, "results", "perf040-before-image-audit.json");
const afterPath = path.join(experimentRoot, "results", "perf040-after-image-audit.json");
const reproductionPath = path.join(
  repositoryRoot,
  "experiments",
  "next-image-sizes-parser",
  "results",
  "next-16.3.4.json"
);
const outputPath = path.join(experimentRoot, "results", "perf040-analysis.json");

const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));
const sha256 = (filePath) => createHash("sha256").update(readFileSync(filePath)).digest("hex");

const before = readJson(beforePath);
const after = readJson(afterPath);
const reproduction = readJson(reproductionPath);

assert.equal(before.experiment, "PERF-040");
assert.equal(after.experiment, "PERF-040");
assert.equal(before.phase, "before");
assert.equal(after.phase, "after");
assert.equal(before.rows.length, 12);
assert.equal(after.rows.length, 12);
assert.equal(reproduction.reproduced, true);

const comparisons = before.rows.map((beforeRow, rowIndex) => {
  const afterRow = after.rows[rowIndex];
  assert.equal(afterRow.route, beforeRow.route);
  assert.equal(afterRow.profile, beforeRow.profile);
  assert.deepEqual(afterRow.viewport, beforeRow.viewport);
  assert.equal(afterRow.images.length, beforeRow.images.length);
  assert.equal(beforeRow.preloads.length, 1);
  assert.equal(afterRow.preloads.length, 0);

  const images = beforeRow.images.map((beforeImage, imageIndex) => {
    const afterImage = afterRow.images[imageIndex];
    assert.equal(afterImage.alt, beforeImage.alt);
    assert.ok(Math.abs(afterImage.clientWidth - beforeImage.clientWidth) <= 0.5);
    assert.ok(Math.abs(afterImage.clientHeight - beforeImage.clientHeight) <= 0.5);
    assert.ok(afterImage.selectedWidth >= afterImage.clientWidth * afterRow.viewport.dpr);
    assert.ok(afterImage.oversizeRatio <= 1.27);
    assert.ok(afterImage.encodedBodyBytes <= beforeImage.encodedBodyBytes);

    return {
      alt: beforeImage.alt,
      slotCssPixels: beforeImage.clientWidth,
      requiredPhysicalPixels: beforeImage.clientWidth * beforeRow.viewport.dpr,
      selectedWidth: {
        before: beforeImage.selectedWidth,
        after: afterImage.selectedWidth,
      },
      oversizeRatio: {
        before: beforeImage.oversizeRatio,
        after: afterImage.oversizeRatio,
      },
      encodedBodyBytes: {
        before: beforeImage.encodedBodyBytes,
        after: afterImage.encodedBodyBytes,
        savings: beforeImage.encodedBodyBytes - afterImage.encodedBodyBytes,
      },
      srcset: {
        candidatesBefore: beforeImage.srcsetCandidates,
        candidatesAfter: afterImage.srcsetCandidates,
        bytesBefore: beforeImage.srcsetBytes,
        bytesAfter: afterImage.srcsetBytes,
        byteSavings: beforeImage.srcsetBytes - afterImage.srcsetBytes,
      },
      loading: {
        before: beforeImage.loading,
        after: afterImage.loading,
      },
    };
  });

  assert.notEqual(beforeRow.initialLcp?.alt, "Mehdi Akiki profile picture");
  assert.notEqual(beforeRow.initialLcp?.alt, "Mehdi Akiki avatar");
  assert.notEqual(afterRow.initialLcp?.alt, "Mehdi Akiki profile picture");
  assert.notEqual(afterRow.initialLcp?.alt, "Mehdi Akiki avatar");

  return {
    route: beforeRow.route,
    profile: beforeRow.profile,
    documentDomBytes: {
      before: beforeRow.documentBytes,
      after: afterRow.documentBytes,
      savings: beforeRow.documentBytes - afterRow.documentBytes,
    },
    preloadCount: { before: beforeRow.preloads.length, after: afterRow.preloads.length },
    initialLcp: { before: beforeRow.initialLcp, after: afterRow.initialLcp },
    imageBodyByteSavings: images.reduce(
      (total, image) => total + image.encodedBodyBytes.savings,
      0
    ),
    images,
  };
});

const byRoute = Object.values(
  comparisons.reduce((routes, row) => {
    const current = routes[row.route] || {
      route: row.route,
      profiles: [],
      domSavings: new Set(),
      bodySavings: {},
    };
    current.profiles.push(row.profile);
    current.domSavings.add(row.documentDomBytes.savings);
    current.bodySavings[row.profile] = row.imageBodyByteSavings;
    routes[row.route] = current;
    return routes;
  }, {})
).map((route) => ({
  ...route,
  domSavings: [...route.domSavings],
}));

const afterImages = after.rows.flatMap((row) => row.images);
const beforeImages = before.rows.flatMap((row) => row.images);
const sourceInventory = [
  {
    callSite: "layouts/AuthorLayout.tsx",
    reachability: "live:/about",
    slot: "fixed-192",
    policy: "compact fixed 1x/2x srcset; lazy; blur retained",
  },
  {
    callSite: "layouts/PostLayout.tsx",
    reachability: "live:all default blog and note articles",
    slot: "fixed-40",
    policy: "compact fixed 1x/2x srcset; lazy; empty placeholder",
  },
  {
    callSite: "components/MDXComponents.tsx",
    reachability: "live:two current Markdown image nodes",
    slot: "responsive padded article column",
    policy: "explicit mobile/tablet/xl source-size model",
  },
  {
    callSite: "layouts/PostBanner.tsx",
    reachability: "dormant:no content selects this layout",
    slot: "responsive Bleed banner",
    policy: "explicit Bleed geometry and Next 16 preload",
  },
  {
    callSite: "components/MainCard.tsx",
    reachability: "dormant:no route import",
    slot: "responsive card",
    policy: "explicit viewport-to-1088px responsive size; unmeasured while dormant",
  },
  {
    callSite: "components/WorkCard.tsx",
    reachability: "dormant:no route import",
    slot: "responsive card",
    policy: "explicit one/two-column-to-512px responsive size; unmeasured while dormant",
  },
  {
    callSite: "components/OptimizedImage.tsx",
    reachability: "dormant:no consumer",
    slot: "delegating wrapper",
    policy: "migrated from priority to preload and preserves explicit sizes",
  },
];

const output = {
  experiment: "PERF-040",
  generatedAt: new Date().toISOString(),
  decision: "adopt-explicit-image-intent-and-prepare-nextjs-vw-parser-patch",
  inputs: [beforePath, afterPath, reproductionPath].map((filePath) => ({
    path: path.relative(repositoryRoot, filePath),
    bytes: readFileSync(filePath).byteLength,
    sha256: sha256(filePath),
  })),
  method: {
    matrix: "3 live routes x mobile/desktop x DPR 1/2 = 12 isolated browser rows",
    cache: after.method.cache,
    loading: after.method.loading,
    timingAuthority:
      "This experiment audits deterministic selection, transfer, markup, loading and LCP identity; it does not promote one-run development-server timing to an FCP/LCP claim.",
  },
  sourceInventory,
  claims: {
    allRenderedBoxesPreserved: true,
    everyAfterCandidateCoversPhysicalSlot: true,
    maximumAfterOversizeRatio: Math.max(...afterImages.map((image) => image.oversizeRatio)),
    maximumBeforeOversizeRatio: Math.max(...beforeImages.map((image) => image.oversizeRatio)),
    everyLiveAvatarPreloadRemoved: true,
    avatarWasNeverInitialLcpAcrossMatrix: true,
    responsiveDesktopSelectionPreserved: true,
    nextSizesParserLimitationReproduced: reproduction.reproduced,
  },
  summary: {
    rows: comparisons.length,
    imageObservations: afterImages.length,
    preloadLinksAcrossMatrix: { before: 12, after: 0 },
    fixedPostAvatar: {
      selectedWidthPreserved: "48px at DPR1; 96px at DPR2",
      candidates: { before: 15, after: 2 },
      srcsetBytes: { before: 1320, after: 168, savings: 1152 },
    },
    aboutAvatar: {
      selectedWidth: {
        mobileDpr1: "640 -> 192",
        mobileDpr2: "828 -> 384",
        desktopDpr1: "640 -> 192",
        desktopDpr2: "1080 -> 384",
      },
      encodedBodyByteSavings: {
        dpr1: 7687,
        dpr2: 3979,
      },
      documentDomByteSavings: 2060,
    },
    mobileMdx: {
      selectedWidth: { dpr1: "640 -> 384", dpr2: "828 -> 750" },
      encodedBodyByteSavings: {
        controlPlane: { dpr1: 6759, dpr2: 1782 },
        loadBalancer: { dpr1: 2649, dpr2: 1906 },
      },
    },
    postDocumentDomByteSavings: {
      controlPlane: 3553,
      loadBalancer: 3554,
    },
    nextParserReproduction: {
      compactCalcCandidates: 16,
      whitespaceCalcCandidates: 9,
      measuredMdxSrcsetBytes: { compactCalc: 1440, whitespaceWorkaround: 818 },
    },
  },
  byRoute,
  comparisons,
  limitations: [
    "Encoded image body bytes and selected URLs come from the real Next.js development image optimizer with browser cache disabled; origin-side optimizer cache state is not a claim about production latency.",
    "documentDomBytes measures serialized post-hydration DOM, not Brotli-compressed transfer bytes. It isolates deterministic markup reduction but is not an HTTP payload measurement.",
    "The three routes cover every image context reachable from current production content. Four dormant call sites are source-audited but do not have browser rows.",
    "The audit records initial LCP identity to review preload correctness, but single development-server navigations are not used as before/after LCP timing evidence.",
    "The upstream patch is prepared against current Next.js source and unit-test locations; it has not been run in a full Next.js monorepo checkout.",
  ],
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  JSON.stringify(
    { decision: output.decision, claims: output.claims, summary: output.summary },
    null,
    2
  )
);
console.log(`Wrote ${outputPath}`);
