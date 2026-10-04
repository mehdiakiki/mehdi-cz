process.env.PERF033_STAGED = "1";
process.env.PERF037_HEAD_ORDER = "1";
await import("./measure-prerender-thresholds.mjs");
