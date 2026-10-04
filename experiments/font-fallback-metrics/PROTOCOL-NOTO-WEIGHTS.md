# PERF-056E weight-matched Noto fallback preregistered protocol

Date locked: 2026-09-15, after PERF-056D's identity failure and before any
weight-matched sweep.

## Mechanism correction

PERF-056D's 102.7% arm met its geometry-improvement and line/overflow gates, but
the required 100% identity arm did not reproduce `system-ui`. The experiment had
mapped all CSS weights to `Noto Sans Regular`, whereas font matching on this host
uses Regular at 400, Medium at 500, Bold at 600–700, and Black at 800–900. The
identity failure therefore rejects the single-face topology, not the measured
scale.

Define one experiment-only family with these exact local full names and weights:

| CSS weight | Local source |
| --- | --- |
| 400 | `Noto Sans Regular` |
| 500 | `Noto Sans Medium` |
| 600–700 | `Noto Sans Bold` |
| 800–900 | `Noto Sans Black` |

Use native vertical metrics. Repeat the unchanged 94.00%–106.00% sweep in
0.10-point increments and the same five-route minimax coordinate objective. Do
not seed or prefer the prior 102.7% observation; ties prefer 100%, then the lower
size.

## Gates and terminal rule

The 100% identity arm must reproduce the current `system-ui` baseline within
0.01 px for both pooled and maximum route RMSE and must match every route's line
and overflow state. The winner then needs at least 50% lower pooled and
maximum-route RMSE, no worse individual route, no line/overflow change, and all
four local faces loaded.

Only an eligible winner advances to the original 160-navigation PERF-056 timing,
font-completion, resource, final-screenshot, held-fallback, and source-build
gates. Identity or geometry failure ends metric tuning with no source change.

