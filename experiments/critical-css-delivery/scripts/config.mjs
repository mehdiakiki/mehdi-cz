import { resolve } from "node:path";

export const repositoryRoot = resolve(import.meta.dirname, "../../..");
export const buildRoot = resolve(repositoryRoot, process.env.PERF051_BUILD || ".next-perf050");
export const resultsRoot = resolve(import.meta.dirname, "../results");
export const sourceCssPath = "/_next/static/css/ebc471532293f512.css";
export const sourceCssFile = resolve(buildRoot, "static/css/ebc471532293f512.css");
export const origin = process.env.PERF051_ORIGIN || "http://127.0.0.1:3160";

export const routes = [
  { name: "home", pathname: "/", html: "server/app/index.html" },
  { name: "index", pathname: "/blog", html: "server/app/blog.html" },
  {
    name: "prose",
    pathname: "/blog/async-rust-libraries",
    html: "server/app/blog/async-rust-libraries.html",
  },
  {
    name: "code",
    pathname: "/blog/load-balancer-sticky-sessions-course",
    html: "server/app/blog/load-balancer-sticky-sessions-course.html",
  },
  { name: "atlas", pathname: "/rust-failure-atlas", html: "server/app/rust-failure-atlas.html" },
];

export const profiles = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2.75, mobile: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
};

