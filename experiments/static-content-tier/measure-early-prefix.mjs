process.env.PERF033_STAGED = "1";
process.env.PERF036_PREFIX = "1";
await import("./measure-prerender-thresholds.mjs");
