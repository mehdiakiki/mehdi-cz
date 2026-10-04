process.env.PERF033_STAGED = "1";
process.env.PERF034_GATED = "1";
process.env.PERF035_STREAMING = "1";
await import("./measure-prerender-thresholds.mjs");
