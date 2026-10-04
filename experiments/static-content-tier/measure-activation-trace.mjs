process.env.PERF033_STAGED = "1";
process.env.PERF038_CACHE = "1";
process.env.PERF039_TRACE = "1";
await import("./measure-prerender-thresholds.mjs");
