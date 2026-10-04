# PERF-051 — Critical CSS delivery

This experiment tests a cacheable critical stylesheet followed by the unchanged
PERF-050 application stylesheet. It uses the existing `.next-perf050` build and
a local response-transforming proxy; it does not change production application
code.

The candidate was rejected. A viewport-scoped stylesheet preserved the initial
mobile viewport but shortened the temporarily styled document and exposed an
unstyled footer under an immediate scroll. A whole-document-matched stylesheet
was pixel-exact across 20 rapid-scroll and 10 JavaScript-disabled rows, but its
route assets were 4,509–5,729 gzip bytes and the shared asset was 7,731 gzip
bytes. Because the unchanged 14,945-byte stylesheet still downloads, even the
smallest correct arm adds more than the preregistered 2 KiB cold-transfer cap.

The key artifacts are:

- `PROTOCOL.md`: preregistered question and gates.
- `results/critical.json`: source and candidate sizes/hashes.
- `results/initial-audit.json`: 20-row viewport-initial comparison.
- `results/viewport-audit.json`: focused immediate-scroll rejection evidence.
- `results/document-audit.json`: complete conservative correctness matrix.
- `results/analysis.json`: assertions, gate outcomes, and decision.

With the PERF-050 server on port 3160 and Chromium DevTools on port 9250:

```sh
npm run extract
node scripts/proxy.mjs
npm run audit:initial
PERF051_RESULT=viewport-audit PERF051_PROFILES=desktop PERF051_ROUTES=home npm run audit
PERF051_RESULT=document-audit PERF051_ARM=document-external npm run audit
npm run analyze
npm test
```

The next candidate is PERF-052. It must change CSS ownership/materialization so
critical rules are not sent once in the critical asset and again in the full
sheet.
