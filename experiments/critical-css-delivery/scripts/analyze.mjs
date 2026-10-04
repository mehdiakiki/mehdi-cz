import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { resultsRoot } from "./config.mjs";

const blockingBudget = 4 * 1024;
const addedColdBudget = 2 * 1024;
const promoter = Buffer.from(
  `for(const l of document.querySelectorAll('link[data-perf051-full]')){const p=()=>{l.media='all';l.removeAttribute('data-perf051-full')};l.sheet?p():l.addEventListener('load',p,{once:true})}`
);

const critical = JSON.parse(await readFile(`${resultsRoot}/critical.json`, "utf8"));
const initial = JSON.parse(await readFile(`${resultsRoot}/initial-audit.json`, "utf8"));
const documentAudit = JSON.parse(await readFile(`${resultsRoot}/document-audit.json`, "utf8"));
const viewportAudit = JSON.parse(await readFile(`${resultsRoot}/viewport-audit.json`, "utf8"));

assert.equal(initial.rows.length, 20, "initial viewport matrix is complete");
assert.equal(documentAudit.rapidScroll.length, 20, "document rapid-scroll matrix is complete");
assert.equal(documentAudit.noScript.length, 10, "document no-script matrix is complete");
assert.ok(
  documentAudit.rapidScroll.every(
    (row) => row.difference.pixels === 0 && row.failures === 0 && row.errors.length === 0
  ),
  "document candidates retain exact rapid-scroll rendering"
);
assert.ok(
  documentAudit.noScript.every((row) => row.difference.pixels === 0),
  "document candidates retain exact no-script rendering"
);
assert.ok(
  viewportAudit.rapidScroll.some((row) => row.difference.pixels > 0),
  "viewport candidate exposes a rapid-scroll mismatch"
);

const promoterBytes = {
  raw: promoter.length,
  gzip: gzipSync(promoter).length,
  brotli: brotliCompressSync(promoter).length,
};

const candidates = critical.candidates
  .filter((candidate) => /-(initial|document)$/.test(candidate.name))
  .map((candidate) => ({
    name: candidate.name,
    scope: candidate.name.startsWith("shared-") ? "shared" : "route",
    coverage: candidate.name.endsWith("-document") ? "document" : "viewport",
    bytes: candidate.bytes,
    blockingBudgetPassed: candidate.bytes.gzip <= blockingBudget,
    minimumAddedColdGzip: candidate.bytes.gzip + promoterBytes.gzip,
    addedColdBudgetPassed: candidate.bytes.gzip + promoterBytes.gzip <= addedColdBudget,
  }));

const documentCandidates = candidates.filter((candidate) => candidate.coverage === "document");
const viewportCandidates = candidates.filter((candidate) => candidate.coverage === "viewport");
const sharedCandidates = candidates.filter((candidate) => candidate.scope === "shared");

const analysis = {
  experiment: "PERF-051",
  analyzedAt: new Date().toISOString(),
  decision: "reject-critical-css-delivery-candidate",
  reason:
    "The viewport-scoped arm meets the blocking-size gate on only three route families and exposes unstyled below-fold content under immediate scroll. The document-scoped arm is visually exact but every route exceeds both the 4 KiB blocking budget or the 2 KiB added-cold-transfer budget; the reusable shared arm is larger still.",
  budgets: {
    blockingCriticalCssGzip: blockingBudget,
    addedCompleteColdGzip: addedColdBudget,
  },
  source: critical.source,
  promoterBytes,
  candidates,
  correctness: {
    viewportInitialRows: initial.rows.length,
    viewportInitialMobilePixelExact: initial.rows
      .filter((row) => row.profile === "mobile")
      .every((row) => row.difference.pixels === 0),
    viewportInitialDesktopDifferences:
      "Only scrollbar pixels differ after structural-context recovery, caused by the shorter temporarily unstyled document.",
    viewportRapidScroll: viewportAudit.rapidScroll.map((row) => ({
      profile: row.profile,
      route: row.route,
      theme: row.theme,
      changedPixels: row.difference.pixels,
      controlDocumentHeight: row.state.control.scrollHeight,
      candidateDocumentHeight: row.state.candidate.scrollHeight,
      controlFooterHeight: row.state.control.footer?.[3] ?? null,
      candidateFooterHeight: row.state.candidate.footer?.[3] ?? null,
    })),
    documentRapidScrollRows: documentAudit.rapidScroll.length,
    documentRapidScrollPixelExact: documentAudit.rapidScroll.every(
      (row) => row.difference.pixels === 0
    ),
    documentNoScriptRows: documentAudit.noScript.length,
    documentNoScriptPixelExact: documentAudit.noScript.every((row) => row.difference.pixels === 0),
  },
  gates: {
    anyDocumentCandidatePassesBlockingBudget: documentCandidates.some(
      (candidate) => candidate.blockingBudgetPassed
    ),
    anyDocumentCandidatePassesAddedColdBudget: documentCandidates.some(
      (candidate) => candidate.addedColdBudgetPassed
    ),
    everyViewportRoutePassesBlockingBudget: viewportCandidates
      .filter((candidate) => candidate.scope === "route")
      .every((candidate) => candidate.blockingBudgetPassed),
    viewportRapidScrollPassed: viewportAudit.rapidScroll.every(
      (row) => row.difference.pixels === 0
    ),
    anySharedCandidatePassesBlockingBudget: sharedCandidates.some(
      (candidate) => candidate.blockingBudgetPassed
    ),
    anySharedCandidatePassesAddedColdBudget: sharedCandidates.some(
      (candidate) => candidate.addedColdBudgetPassed
    ),
  },
  timingDecision:
    "The preregistered hard correctness and transfer gates failed before paired timing. A cached DevTools spot trace showed the expected two-stylesheet request topology but cannot support an LCP claim.",
  nextCandidate:
    "Run PERF-052's route-weighted CSS topology sweep. A viable follow-up must stop duplicating the critical rules in the unchanged full sheet rather than extracting another overlapping copy.",
};

await writeFile(`${resultsRoot}/analysis.json`, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      decision: analysis.decision,
      gates: analysis.gates,
      nextCandidate: analysis.nextCandidate,
    },
    null,
    2
  )
);
