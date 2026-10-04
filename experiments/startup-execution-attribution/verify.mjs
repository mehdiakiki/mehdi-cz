import assert from "node:assert/strict";
import { buildVariant, routes, summarizeHtml, variants } from "./fixture.mjs";

for (const route of routes) {
  const summaries = Object.fromEntries(
    variants.map((variant) => [variant, summarizeHtml(buildVariant(route, variant))])
  );
  const full = summaries.full;

  assert.equal(full.executableExternalScripts, 11, `${route.id}: modern plus nomodule scripts`);
  assert.ok(full.executableInlineFlightScripts >= 2, `${route.id}: Flight script count`);
  assert.equal(summaries["framework-only"].executableExternalScripts, 11);
  assert.equal(summaries["framework-only"].executableInlineFlightScripts, 0);
  assert.equal(summaries["flight-only"].executableExternalScripts, 0);
  assert.equal(
    summaries["flight-only"].executableInlineFlightScripts,
    full.executableInlineFlightScripts
  );
  assert.equal(summaries["theme-only"].executableExternalScripts, 0);
  assert.equal(summaries["theme-only"].executableInlineFlightScripts, 0);
  assert.equal(summaries["theme-only"].executableScripts, 1);
  assert.equal(summaries["early-theme-full"].executableScripts, full.executableScripts);
  assert.equal(summaries["early-theme-only"].executableScripts, 1);
  assert.ok(
    buildVariant(route, "early-theme-full").indexOf("Array.isArray") <
      buildVariant(route, "early-theme-full").indexOf("</head>")
  );
  assert.equal(summaries["shell-only"].executableScripts, 0);

  for (const variant of ["flight-only", "theme-only", "early-theme-only", "shell-only"]) {
    assert.equal(
      summaries[variant].lowPriorityScriptPreloads,
      10,
      `${route.id}/${variant}: preload each modern external startup script`
    );
  }
  assert.equal(summaries["framework-only"].lowPriorityScriptPreloads, 0);
  assert.equal(summaries.full.lowPriorityScriptPreloads, 0);
  assert.equal(summaries["flight-only"].inlineFlightBytes, full.inlineFlightBytes);
  assert.equal(summaries["shell-only"].inlineFlightBytes, full.inlineFlightBytes);

  console.log(
    `${route.id}: ${full.inlineFlightBytes} B Flight; ` +
      `${full.executableExternalScripts - 1} modern external scripts; variant matrix passes`
  );
}

console.log("PERF-045 fixture invariants pass.");
