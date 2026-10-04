import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import matter from "gray-matter";
import { authorityOpportunities } from "../data/authority-opportunities.mjs";
import { rustAtlasClaims, rustAtlasClaimStatuses } from "../data/rust-atlas-claims.mjs";
import {
  rustFailureEvidenceBacklog,
  rustFailureEvidenceBacklogReviewedAt,
} from "../data/rust-failure-evidence-backlog.mjs";
import { rustFailureAtlasGoal, rustFailureEvidenceCases } from "../data/rust-failure-evidence.mjs";
import {
  isRustFailureAtlasLaunched,
  rustFailureAreas,
  rustFailureAtlasLaunch,
  rustFailureAtlasEntries,
} from "../data/rust-failure-atlas.mjs";
import { getRelatedRustFailureIds, rustFailureTrails } from "../data/rust-failure-trails.mjs";
import {
  getRustFailureFeaturedPreviewIds,
  getRustFailureRunner,
  getRustFailureTier,
  isRustFailureErrorCodeCase,
  isRustFailureSystemsCase,
  rustFailureCuratedSystemsCases,
  rustFailureFeaturedLayers,
  rustFailureRunners,
  rustFailureSystemsRunners,
} from "../data/rust-failure-tiers.mjs";
import {
  rustAtlasSectionForOpportunity,
  rustSystemsAtlasEditorialSections,
  rustSystemsAtlasGoal,
  rustSystemsAtlasSections,
} from "../data/rust-systems-atlas.mjs";
import { articleReviewHash } from "../lib/content-review.mjs";
import { publicationStatus } from "../lib/publication.mjs";
import { isCanonicalRustFailureCase } from "../data/rust-failure-intent-review.mjs";

test("the failure index launches with all diagnostic records while articles stay gated", () => {
  assert.equal(isRustFailureAtlasLaunched(new Date("2026-09-04T20:59:59+01:00")), false);
  assert.equal(isRustFailureAtlasLaunched(new Date("2026-09-04T21:00:00+01:00")), true);

  const liveAtLaunch = rustFailureAtlasEntries.filter((entry) => {
    if (entry.plannedTitle) return false;
    const source = readFileSync(
      entry.articleSlug
        ? path.resolve("data/blog", `${entry.articleSlug}.mdx`)
        : path.resolve("data/rust-failures", `${entry.caseSlug}.mdx`),
      "utf8"
    );
    return publicationStatus(matter(source).data, new Date(rustFailureAtlasLaunch)) === "published";
  });

  assert.equal(rustFailureAtlasEntries.length, 722);
  assert.equal(liveAtLaunch.length, 24);
});

test("the full Atlas search payload stays behind an interaction boundary", () => {
  const pageSource = readFileSync(path.resolve("app/(site)/rust-failure-atlas/page.tsx"), "utf8");
  const explorerSource = readFileSync(
    path.resolve("components/RustFailureAtlasExplorer.tsx"),
    "utf8"
  );
  const indexRouteSource = readFileSync(
    path.resolve("app/(site)/rust-failure-atlas/search-index/route.ts"),
    "utf8"
  );
  const compressedIndexRouteSource = readFileSync(
    path.resolve("app/(site)/rust-failure-atlas/search-index.json.gz/route.ts"),
    "utf8"
  );
  const areaRouteSource = readFileSync(
    path.resolve("app/(site)/rust-failure-atlas/area/[area]/page.tsx"),
    "utf8"
  );

  assert.match(pageSource, /<RustFailureAtlasDirectory/);
  assert.match(pageSource, /Browse by failure family/);
  assert.match(pageSource, /entryCount=\{entries\.length\}/);
  assert.doesNotMatch(pageSource, /<RustFailureAtlasExplorer[^>]*\bentries=/);
  assert.doesNotMatch(pageSource, /id=\{entry\.id\.toLocaleLowerCase/);
  assert.match(explorerSource, /fetch\(path/);
  assert.match(explorerSource, /new DecompressionStream\("gzip"\)/);
  assert.match(explorerSource, /fetchIndex\(fallbackIndexPath, false\)/);
  assert.match(explorerSource, /const MAX_RENDERED_RESULTS = 40/);
  assert.match(explorerSource, /window\.location\.replace/);
  assert.match(explorerSource, /addEventListener\("hashchange"/);
  assert.match(indexRouteSource, /export const dynamic = "force-static"/);
  assert.match(compressedIndexRouteSource, /gzipSync/);
  assert.match(compressedIndexRouteSource, /"Content-Type": "application\/gzip"/);
  assert.match(compressedIndexRouteSource, /export const dynamic = "force-static"/);
  assert.match(areaRouteSource, /generateStaticParams/);
  assert.match(areaRouteSource, /getVisibleRustFailureEntries\(\)\.filter/);
  assert.match(areaRouteSource, /id=\{entry\.id\.toLocaleLowerCase/);
  assert.match(areaRouteSource, /entry\.destinationAvailable/);
});

test("the Rust Failure Atlas has unique, stable case identities", () => {
  const ids = rustFailureAtlasEntries.map((entry) => entry.id);
  const destinations = rustFailureAtlasEntries.map(
    (entry) => entry.articleSlug || entry.caseSlug || entry.plannedTitle
  );

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(destinations).size, destinations.length);
  assert.equal(
    rustFailureAtlasEntries.filter((entry) => entry.caseSlug).length,
    694,
    "all dedicated case files in the current reviewed batch must remain complete"
  );
  assert.equal(
    rustFailureAtlasEntries.filter((entry) => entry.plannedTitle).length,
    0,
    "the reviewed failure records must not contain queued placeholders"
  );
  assert.deepEqual(
    ids,
    ids.map((_, index) => `RFA-${String(index + 1).padStart(3, "0")}`)
  );
});

test("new Atlas cases carry downloadable, toolchain-pinned evidence", () => {
  assert.equal(rustFailureAtlasGoal.authorityCheckpoint, 350);
  assert.equal(rustFailureAtlasGoal.canonicalCases, 717);
  assert.equal(rustFailureAtlasGoal.nextCanonicalCaseTarget, 750);
  assert.equal(rustFailureAtlasGoal.systemsAtlasMilestoneCases, 300);
  assert.equal(rustFailureAtlasGoal.evidenceCoverageTarget, 1);
  assert.equal(rustFailureAtlasGoal.reverificationCadenceDays, 90);
  assert.equal(rustFailureAtlasGoal.evidenceContractVersion, 17);
  assert.equal(rustFailureEvidenceCases.length, 694);

  const evidenceById = new Map(rustFailureEvidenceCases.map((evidence) => [evidence.id, evidence]));

  for (const evidence of rustFailureEvidenceCases) {
    const entry = rustFailureAtlasEntries.find((candidate) => candidate.id === evidence.id);
    assert.ok(entry, `${evidence.id} has no Atlas entry`);
    assert.match(evidence.toolchain, /^\d+\.\d+\.\d+$/);
    assert.ok(evidence.expectedDiagnostics.length >= 2);

    const fixtureRoot = path.resolve("public", "rust-failure-atlas", "evidence", entry.id);
    assert.ok(existsSync(path.join(fixtureRoot, evidence.failureFile)));
    assert.ok(existsSync(path.join(fixtureRoot, evidence.repairedFile)));
    if (
      evidence.runner === "cargo" ||
      evidence.runner === "cargo-rebuild" ||
      evidence.runner === "cargo-runtime-env" ||
      evidence.runner === "cargo-package" ||
      evidence.runner === "cargo-profile-pair" ||
      evidence.runner === "cargo-test-surfaces" ||
      evidence.runner === "cargo-suite-isolation" ||
      evidence.runner === "cargo-subprocess"
    ) {
      assert.ok(existsSync(path.join(fixtureRoot, evidence.failureManifest)));
      assert.ok(existsSync(path.join(fixtureRoot, evidence.repairedManifest)));
      if (evidence.failureCargoConfig) {
        assert.ok(existsSync(path.join(fixtureRoot, evidence.failureCargoConfig)));
      }
      if (evidence.repairedCargoConfig) {
        assert.ok(existsSync(path.join(fixtureRoot, evidence.repairedCargoConfig)));
      }
      if (evidence.locked || evidence.runner === "cargo-subprocess") {
        assert.ok(
          existsSync(
            path.join(path.dirname(path.join(fixtureRoot, evidence.failureManifest)), "Cargo.lock")
          )
        );
        assert.ok(
          existsSync(
            path.join(path.dirname(path.join(fixtureRoot, evidence.repairedManifest)), "Cargo.lock")
          )
        );
      }
    }
  }

  assert.deepEqual(evidenceById.get("RFA-099").unsetEnvironment, ["RFA_BUILD_SHA"]);
  assert.equal(rustFailureEvidenceCases.filter((item) => item.runner === "cargo").length, 24);
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "cargo-rebuild").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "cargo-runtime-env").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "cargo-package").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "cargo-profile-pair").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "cargo-test-surfaces").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "cargo-suite-isolation").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "cargo-subprocess").length,
    2
  );
  assert.equal(rustFailureEvidenceCases.filter((item) => item.runner === "rustc-run").length, 313);
  assert.equal(rustFailureEvidenceCases.filter((item) => item.runner === "rustc-link").length, 1);
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "rustc-symbol-matrix").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "rustc-native-target-matrix").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "rustc-native-discovery").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "rustc-native-owner").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "rustc-invariant-matrix").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "rustc-allocator-sanitizer").length,
    1
  );
  assert.equal(
    rustFailureEvidenceCases.filter((item) => item.runner === "rustc-link-resource-matrix").length,
    1
  );
});

test("every non-portable evidence gap has one maintained proof plan", () => {
  const evidenceIds = new Set(rustFailureEvidenceCases.map((evidence) => evidence.id));
  const dedicatedWithoutEvidence = rustFailureAtlasEntries
    .filter((entry) => entry.caseSlug && !evidenceIds.has(entry.id))
    .map((entry) => entry.id);
  const backlogIds = rustFailureEvidenceBacklog.map((item) => item.id);

  assert.equal(rustFailureEvidenceBacklogReviewedAt, "2026-09-07");
  assert.deepEqual(new Set(backlogIds), new Set(dedicatedWithoutEvidence));
  assert.equal(new Set(backlogIds).size, backlogIds.length);
  assert.deepEqual(
    rustFailureEvidenceBacklog.map((item) => item.priority),
    Array.from({ length: rustFailureEvidenceBacklog.length }, (_, index) => index + 1)
  );
  for (const item of rustFailureEvidenceBacklog) {
    assert.ok(item.harness.length > 60, `${item.id} needs a concrete harness`);
    assert.ok(item.proofBoundary.length > 70, `${item.id} needs a discriminating proof boundary`);
    assert.ok(item.portabilityRisk.length > 60, `${item.id} needs an honest portability boundary`);
  }
});

test("every failure family has evidence-backed case files", () => {
  const knownAreas = new Set(rustFailureAreas.map((area) => area.slug));

  for (const area of rustFailureAreas) {
    assert.ok(area.label.length > 4);
    assert.ok(area.description.length > 30);
    assert.ok(rustFailureAtlasEntries.some((entry) => entry.area === area.slug));
  }

  for (const entry of rustFailureAtlasEntries) {
    assert.ok(knownAreas.has(entry.area), `${entry.id} has an unknown area`);
    assert.ok(entry.symptom.length > 45, `${entry.id} has a vague symptom`);
    assert.ok(entry.likelyCause.length > 60, `${entry.id} has a vague mechanism`);
    assert.ok(entry.firstCheck.length > 45, `${entry.id} has a vague first check`);
    assert.ok(entry.searchTerms.length >= 3, `${entry.id} needs search language`);
    assert.ok(entry.evidence.length >= 3, `${entry.id} needs an evidence plan`);
  }
});

test("mechanism trails connect related dedicated cases without duplicate identities", () => {
  const entriesById = new Map(rustFailureAtlasEntries.map((entry) => [entry.id, entry]));
  const trailSlugs = rustFailureTrails.map((trail) => trail.slug);

  assert.equal(new Set(trailSlugs).size, trailSlugs.length);
  for (const trail of rustFailureTrails) {
    assert.ok(trail.label.length > 12);
    assert.ok(trail.caseIds.length >= 2);
    assert.equal(new Set(trail.caseIds).size, trail.caseIds.length);
    for (const caseId of trail.caseIds) {
      assert.ok(entriesById.get(caseId)?.caseSlug, `${caseId} needs a dedicated case route`);
    }
  }

  assert.ok(getRelatedRustFailureIds("RFA-160").includes("RFA-161"));
  assert.ok(getRelatedRustFailureIds("RFA-162").includes("RFA-175"));
  assert.deepEqual(getRelatedRustFailureIds("RFA-001"), []);
});

test("every atlas record has exactly one canonical long-form destination", () => {
  const rustOpportunities = new Map(
    authorityOpportunities
      .filter((opportunity) => opportunity.cluster === "rust-under-the-hood")
      .map((opportunity) => [opportunity.slug, opportunity])
  );

  for (const entry of rustFailureAtlasEntries) {
    assert.equal(
      [entry.articleSlug, entry.caseSlug, entry.plannedTitle].filter(Boolean).length,
      1,
      `${entry.id} must be linked, dedicated, or explicitly queued`
    );
    if (entry.plannedTitle) {
      assert.ok(entry.plannedTitle.length > 45, `${entry.id} needs a specific queued title`);
      continue;
    }
    if (entry.caseSlug) {
      assert.ok(
        existsSync(path.resolve("data/rust-failures", `${entry.caseSlug}.mdx`)),
        `${entry.id} is missing its canonical case file`
      );
      continue;
    }
    assert.ok(
      existsSync(path.resolve("data/blog", `${entry.articleSlug}.mdx`)),
      `${entry.id} is missing its canonical article`
    );
    assert.ok(
      rustOpportunities.has(entry.articleSlug),
      `${entry.id} points outside the reviewed Rust authority cluster`
    );
  }
});

test("dedicated case files are substantial, primary-sourced, and review locked", () => {
  for (const entry of rustFailureAtlasEntries.filter((candidate) => candidate.caseSlug)) {
    const source = readFileSync(
      path.resolve("data/rust-failures", `${entry.caseSlug}.mdx`),
      "utf8"
    );
    const parsed = matter(source);
    const words = parsed.content.match(/[\p{L}\p{N}_'-]+/gu) || [];

    assert.equal(parsed.data.caseId, entry.id);
    assert.equal(parsed.data.area, entry.area);
    assert.equal(parsed.data.reviewed, true);
    assert.equal(parsed.data.reviewedHash, articleReviewHash(source));
    assert.ok(words.length >= 700, `${entry.id} needs at least 700 body words`);
    assert.ok(parsed.data.evidence.length >= 3, `${entry.id} needs evidence`);
    assert.ok(parsed.data.sources.length >= 2, `${entry.id} needs primary sources`);
    assert.ok(
      parsed.data.sources.every((source) =>
        ["https://doc.rust-lang.org/", "https://docs.rs/"].some((origin) =>
          source.startsWith(origin)
        )
      ),
      `${entry.id} cites a non-primary source`
    );
  }
});

test("the systems atlas assigns every existing Rust page once", () => {
  const rustOpportunities = authorityOpportunities.filter(
    (opportunity) => opportunity.cluster === "rust-under-the-hood"
  );
  const sectionSlugs = new Set(rustSystemsAtlasSections.map((section) => section.slug));

  assert.equal(
    rustSystemsAtlasSections.reduce((total, section) => total + section.targetPages, 0),
    rustSystemsAtlasGoal.canonicalPages
  );
  assert.equal(rustSystemsAtlasGoal.canonicalPages, 750);
  assert.equal(rustSystemsAtlasGoal.evidenceArtifacts, 250);
  assert.equal(rustSystemsAtlasGoal.failurePagesAtMilestone, 300);
  assert.equal(rustOpportunities.length, 70);

  for (const opportunity of rustOpportunities) {
    assert.ok(
      sectionSlugs.has(rustAtlasSectionForOpportunity(opportunity)),
      `${opportunity.id} is missing a primary atlas section`
    );
  }
});

test("the systems atlas assigns every editorial Rust article exactly once", () => {
  const opportunitySlugs = new Set(
    authorityOpportunities
      .filter((opportunity) => opportunity.cluster === "rust-under-the-hood")
      .map((opportunity) => opportunity.slug)
  );
  const editorialSlugs = readdirSync(path.resolve("data/blog"))
    .filter((file) => file.endsWith(".mdx"))
    .flatMap((file) => {
      const source = readFileSync(path.resolve("data/blog", file), "utf8");
      const metadata = matter(source).data;
      const slug = file.replace(/\.mdx$/, "");
      return metadata.cluster === "rust-under-the-hood" && !opportunitySlugs.has(slug)
        ? [slug]
        : [];
    })
    .sort();

  assert.deepEqual(editorialSlugs, Object.keys(rustSystemsAtlasEditorialSections).sort());
  assert.ok(
    Object.values(rustSystemsAtlasEditorialSections).every((section) =>
      rustSystemsAtlasSections.some((candidate) => candidate.slug === section)
    )
  );
  assert.ok(
    rustFailureAtlasEntries.filter(
      (entry) => entry.caseSlug && isCanonicalRustFailureCase(entry.id)
    ).length +
      opportunitySlugs.size +
      editorialSlugs.length >=
      rustSystemsAtlasGoal.canonicalPages,
    "the current local Atlas inventory must stay at or above the canonical-page milestone"
  );
});

test("the first claim lab separates executable facts from conditional performance claims", () => {
  const ids = rustAtlasClaims.map((claim) => claim.id);
  const slugs = rustAtlasClaims.map((claim) => claim.articleSlug);
  const lab = readFileSync(
    path.resolve("experiments/rust-atlas/aho-corasick-claims/src/lib.rs"),
    "utf8"
  );

  assert.equal(rustAtlasClaims.length, 14);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.deepEqual(
    ids,
    ids.map((_, index) => `RCL-${String(index + 1).padStart(3, "0")}`)
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(rustAtlasClaimStatuses).map((status) => [
        status,
        rustAtlasClaims.filter((claim) => claim.status === status).length,
      ])
    ),
    { verified: 7, bounded: 3, measurement: 4 }
  );

  for (const claim of rustAtlasClaims) {
    assert.ok(existsSync(path.resolve("data/blog", `${claim.articleSlug}.mdx`)));
    assert.ok(claim.claim.length > 60, `${claim.id} needs a specific claim`);
    assert.ok(claim.falsifier.length > 60, `${claim.id} needs a real falsifier`);
    assert.ok(claim.evidence.length > 25, `${claim.id} needs an evidence method`);
    if (claim.status === "verified") {
      assert.match(lab, new RegExp(`fn ${claim.evidence}\\b`), claim.id);
    }
  }
});

test("the systems atlas and launched failure index are connected to discovery", () => {
  const systemsRoute = readFileSync("app/(site)/rust/page.tsx", "utf8");
  const failureRoute = readFileSync("app/(site)/rust-failure-atlas/page.tsx", "utf8");
  const failureAreaRoute = readFileSync(
    "app/(site)/rust-failure-atlas/area/[area]/page.tsx",
    "utf8"
  );
  const sitemap = readFileSync("app/sitemap.ts", "utf8");
  const navigation = readFileSync("data/headerNavLinks.ts", "utf8");
  const footer = readFileSync("components/Footer.tsx", "utf8");
  const footerNavigation = readFileSync("components/FooterNavigation.tsx", "utf8");
  const explorer = readFileSync("components/RustFailureAtlasExplorer.tsx", "utf8");
  const caseRoute = readFileSync("app/(site)/rust/failures/[slug]/page.tsx", "utf8");
  const writingIndex = readFileSync("app/(site)/blog/page.tsx", "utf8");

  assert.match(systemsRoute, /CollectionPage/);
  assert.match(systemsRoute, /ItemList/);
  assert.match(systemsRoute, /Seven maps, one system/);
  assert.match(systemsRoute, /allRustFailures/);
  assert.match(systemsRoute, /rustAtlasSectionForEditorialArticle/);
  assert.match(systemsRoute, /Every strong statement needs a way to lose/);
  assert.match(systemsRoute, /Complete article directory/);
  assert.match(systemsRoute, /articleMaterial\.filter/);
  assert.doesNotMatch(systemsRoute, /itemListElement: material\.map/);
  assert.doesNotMatch(systemsRoute, /entries\.slice\(4\)\.map/);
  assert.doesNotMatch(systemsRoute, /<details/);
  assert.match(failureRoute, /Inclusion standard/);
  assert.match(failureRoute, /robots: isRustFailureAtlasLaunched/);
  assert.match(failureAreaRoute, /destinationAvailable/);
  assert.match(sitemap, /`\$\{siteUrl\}\/rust`/);
  assert.match(sitemap, /rust-failure-atlas/);
  assert.match(sitemap, /rust-failure-atlas\/area/);
  assert.match(sitemap, /isRustFailureAtlasLaunched/);
  assert.doesNotMatch(navigation, /href: "\/rust"/);
  assert.match(footer, /<FooterNavigation \/>/);
  assert.match(footerNavigation, /href: "\/rust-failure-atlas"/);
  assert.match(explorer, /URLSearchParams/);
  assert.match(explorer, /queryTokens\.every/);
  assert.match(caseRoute, /rel="prev"/);
  assert.match(caseRoute, /rel="next"/);
  assert.match(caseRoute, /Continue by mechanism/);
  assert.match(caseRoute, /rust-failure-related-open/);
  assert.match(writingIndex, /href="\/rust"/);
});

test("the Atlas front page features systems cases while the reference layer stays complete", () => {
  const evidenceById = new Map(rustFailureEvidenceCases.map((evidence) => [evidence.id, evidence]));
  const entriesById = new Map(rustFailureAtlasEntries.map((entry) => [entry.id, entry]));
  const layeredIds = rustFailureFeaturedLayers.flatMap((layer) => layer.caseIds);
  const systemsRunners = new Set(rustFailureSystemsRunners);
  const dataSelected = rustFailureEvidenceCases
    .filter((evidence) => evidence.runner && systemsRunners.has(evidence.runner))
    .map((evidence) => evidence.id);
  const featured = rustFailureAtlasEntries
    .filter((entry) => isRustFailureSystemsCase(entry.id))
    .map((entry) => entry.id);

  for (const evidence of rustFailureEvidenceCases) {
    const runner = rustFailureRunners[evidence.runner || "rustc"];
    assert.ok(runner, `${evidence.id} uses a runner without a description`);
    assert.ok(runner.label.length > 8 && runner.method.length > 40);
  }

  assert.equal(new Set(layeredIds).size, layeredIds.length);
  assert.deepEqual(new Set(layeredIds), new Set(featured));
  for (const caseId of dataSelected) assert.ok(layeredIds.includes(caseId), caseId);
  for (const [caseId, reason] of Object.entries(rustFailureCuratedSystemsCases)) {
    assert.ok(layeredIds.includes(caseId), `${caseId} is curated but not shown`);
    assert.ok(!dataSelected.includes(caseId), `${caseId} is already selected by its runner`);
    assert.ok(reason.length > 50, `${caseId} needs a concrete reason`);
    assert.doesNotMatch(reason, /\u2014/, `${caseId} reason uses an em dash`);
  }

  for (const caseId of layeredIds) {
    assert.ok(entriesById.get(caseId)?.caseSlug, `${caseId} needs a case page`);
    assert.ok(isCanonicalRustFailureCase(caseId), `${caseId} is not canonical`);
    assert.ok(evidenceById.has(caseId), `${caseId} is featured without a fixture`);
    assert.ok(getRustFailureRunner(caseId));
  }

  const featuredSlugs = new Set(layeredIds.map((caseId) => entriesById.get(caseId).caseSlug));
  for (const slug of [
    "lto-removes-ffi-symbol",
    "linker-killed-release-build",
    "native-dependency-built-for-host",
    "sys-crate-wrong-native-library",
    "incompatible-native-library-copies",
    "ffi-memory-freed-wrong-allocator",
    "doctest-different-cfg",
  ]) {
    assert.ok(featuredSlugs.has(slug), `${slug} must be featured`);
  }
  assert.deepEqual(getRustFailureFeaturedPreviewIds(4), [
    "RFA-039",
    "RFA-041",
    "RFA-046",
    "RFA-050",
  ]);

  const canonicalEntries = rustFailureAtlasEntries.filter((entry) =>
    isCanonicalRustFailureCase(entry.id)
  );
  const reference = canonicalEntries.filter(
    (entry) => getRustFailureTier(entry.id) === "reference"
  );
  assert.equal(featured.length, 27);
  assert.equal(reference.length, canonicalEntries.length - featured.length);
  assert.ok(reference.filter((entry) => isRustFailureErrorCodeCase(entry.id)).length > 250);
  assert.ok(isRustFailureErrorCodeCase("RFA-031"));
  assert.ok(!isRustFailureErrorCodeCase("RFA-039"));
});

test("pages never claim executable evidence for records without fixtures", () => {
  const evidenceIds = new Set(rustFailureEvidenceCases.map((evidence) => evidence.id));
  const withoutFixtures = rustFailureAtlasEntries.filter((entry) => !evidenceIds.has(entry.id));
  const landing = readFileSync("app/(site)/rust-failure-atlas/page.tsx", "utf8");
  const areaRoute = readFileSync("app/(site)/rust-failure-atlas/area/[area]/page.tsx", "utf8");
  const caseRoute = readFileSync("app/(site)/rust/failures/[slug]/page.tsx", "utf8");
  const explorer = readFileSync("components/RustFailureAtlasExplorer.tsx", "utf8");
  const atlasLibrary = readFileSync("lib/rust-failure-atlas.ts", "utf8");

  assert.deepEqual(
    withoutFixtures.map((entry) => entry.id),
    Array.from({ length: 28 }, (_, index) => `RFA-${String(index + 1).padStart(3, "0")}`)
  );
  for (const entry of withoutFixtures) {
    assert.ok(entry.articleSlug && !entry.caseSlug, `${entry.id} must not have a case page`);
  }

  assert.match(
    atlasLibrary,
    /hasExecutableFixture: Boolean\(getRustFailureEvidence\(entry\.id\)\)/
  );
  assert.match(landing, /entries\.filter\(\(entry\) => entry\.hasExecutableFixture\)\.length/);
  assert.doesNotMatch(landing, /rustFailureEvidenceCases/);
  assert.doesNotMatch(landing, />\s*\d{2,}\s*</, "landing counts must come from data");
  assert.match(areaRoute, /entry\.hasExecutableFixture/);
  assert.match(areaRoute, /No fixture yet/);
  assert.match(explorer, /No executable fixture exists for this record yet/);
  assert.match(explorer, /entry\.hasExecutableFixture \? \(/);

  assert.match(caseRoute, /\{executableEvidence && \(/);
  assert.match(caseRoute, /\{!executableEvidence && \(/);
  assert.match(caseRoute, /No executable fixture exists for this case yet/);
  assert.match(caseRoute, /"No executable fixture yet"/);
  const gatedBlock = caseRoute.slice(
    caseRoute.indexOf("{executableEvidence && ("),
    caseRoute.indexOf("{!executableEvidence && (")
  );
  assert.match(gatedBlock, /Download the failing fixture/);
  assert.match(gatedBlock, /Last run \{executableEvidence\.verifiedAt\}/);
  assert.doesNotMatch(caseRoute.replace(gatedBlock, ""), /Download the|Last run|Rechecked/);

  assert.match(caseRoute, /It does not check the explanation on this page/);
  assert.match(landing, /It does not check the written explanation/);
  for (const source of [landing, areaRoute, caseRoute, explorer]) {
    assert.doesNotMatch(source, /verified explanation|tested explanation|verified entry/i);
  }
});

test("Atlas and Rust hub pages carry no campaign or production language", () => {
  const sources = Object.fromEntries(
    [
      "app/(site)/rust/page.tsx",
      "app/(site)/rust-failure-atlas/page.tsx",
      "app/(site)/rust-failure-atlas/area/[area]/page.tsx",
      "app/(site)/rust/failures/[slug]/page.tsx",
      "components/RustFailureAtlasExplorer.tsx",
    ].map((file) => [file, readFileSync(file, "utf8")])
  );

  for (const [file, source] of Object.entries(sources)) {
    for (const phrase of [
      /crawlable/i,
      /server-rendered/i,
      /canonical (pages|symptoms|case link|failure collection)/i,
      /\bSEO\b/,
      /difficult-to-copy/i,
      /long-term advantage/i,
      /article volume/i,
      /publication (gate|queue)/i,
      /must answer/i,
      /rustSystemsAtlasGoal/,
      /I help teams/,
      /See how I work/,
    ]) {
      assert.doesNotMatch(source, phrase, `${file} still says ${phrase}`);
    }
  }

  const caseRoute = sources["app/(site)/rust/failures/[slug]/page.tsx"];
  assert.match(caseRoute, /More from the Rust Failure Atlas/);
  assert.match(caseRoute, /href="\/rust-failure-atlas"/);
  assert.match(caseRoute, /href="\/work"/);
  assert.match(
    caseRoute,
    /`\/rust-failure-atlas\/area\/\$\{encodeURIComponent\(failure\.area\)\}`/
  );

  const hub = sources["app/(site)/rust/page.tsx"];
  assert.match(hub, /getRustFailureFeaturedPreviewIds\(4\)/);
  assert.doesNotMatch(hub, /\/ \{/);
});
