import assert from "node:assert/strict";
import {
  buildVariant,
  prefixFlushOffset,
  routes,
  summarizeHtml,
  targetImageAttributes,
} from "./fixture.mjs";

for (const route of routes) {
  const full = buildVariant(route, "full");
  const scriptBlocked = buildVariant(route, "script-blocked");
  const scriptInert = buildVariant(route, "script-inert");
  const prefixFlush = buildVariant(route, "prefix-flush");
  const decoding = buildVariant(route, "decoding-sync");
  const minimal = buildVariant(route, "minimal-shell");
  const fullSummary = summarizeHtml(full, route.targetAlt);
  const minimalSummary = summarizeHtml(minimal, route.targetAlt);

  assert.equal(
    scriptBlocked,
    full,
    `${route.id}: the script-blocked body must stay byte-identical`
  );
  assert.equal(prefixFlush, full, `${route.id}: the prefix-flush body must stay byte-identical`);
  assert.equal(
    (scriptInert.match(/type="application\/perf044-inert"/g) || []).length,
    fullSummary.executableScripts,
    `${route.id}: every executable script must be inert`
  );
  assert.equal(
    (scriptInert.match(/<link rel="preload" as="script" fetchpriority="low"/g) || []).length,
    10,
    `${route.id}: preload every modern startup script`
  );
  assert.ok(prefixFlushOffset(full, route.targetAlt) > fullSummary.targetOffset);
  assert.equal(
    decoding.replace('decoding="sync"', 'decoding="async"'),
    full,
    `${route.id}: the decoding diagnostic may change only the target attribute`
  );
  assert.deepEqual(
    targetImageAttributes(minimal, route.targetAlt),
    targetImageAttributes(full, route.targetAlt)
  );
  assert.equal(minimalSummary.executableScripts, 0);
  assert.equal(minimalSummary.inlineFlightBytes, 0);
  assert.ok(minimalSummary.bytes < fullSummary.bytes * 0.25);
  assert.ok(minimalSummary.elementStarts < fullSummary.elementStarts * 0.4);
  assert.match(minimal, new RegExp(route.targetAlt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  console.log(
    `${route.id}: full=${fullSummary.bytes} B/${fullSummary.elementStarts} elements, ` +
      `minimal=${minimalSummary.bytes} B/${minimalSummary.elementStarts} elements`
  );
}

console.log("PERF-044 fixture invariants pass.");
