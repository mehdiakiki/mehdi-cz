import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { getRustFailureArea } from "../data/rust-failure-atlas.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const requireFixture = createRequire(
  new URL("../experiments/editorial-ci/package.json", import.meta.url)
);
const { chromium, expect } = requireFixture("@playwright/test");
const port = "4191";
const origin = `http://127.0.0.1:${port}`;
const output = "/tmp/editorial-evidence/previews/atlas-navigation";
await mkdir(output, { recursive: true });
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port],
  {
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, NODE_ENV: "production" },
  }
);
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (server.exitCode !== null) throw new Error("The built server exited before verification");
    try {
      ready = (await fetch(`${origin}/rust-failure-atlas`, { signal: AbortSignal.timeout(20000) }))
        .ok;
      if (ready) break;
    } catch {
      /* Next.js has not bound its listener yet. */
    }
    await delay(500);
  }
  assert.ok(ready, "The built server did not become ready");
  const html = await (await fetch(`${origin}/rust-failure-atlas`)).text();
  assert.ok(html.indexOf('id="failure-search"') < html.indexOf('id="atlas-featured"'));
  for (const fixture of ["RFA-088/fail.rs", "RFA-088/fixed.rs", "RFA-033/fail/src/lib.rs"]) {
    const path = `/rust-failure-atlas/evidence/${fixture}`;
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type"), /^text\/plain(?:;|$)/i, path);
    assert.equal(await response.text(), await readFile(`public${path}`, "utf8"), path);
  }
  const wire = await (await fetch(`${origin}/rust-failure-atlas/search-index`)).json();
  const counts = new Map();
  for (const entry of wire.entries) counts.set(entry[1], (counts.get(entry[1]) || 0) + 1);
  const [family, familyCount] = [...counts].sort((a, b) => b[1] - a[1])[0];
  assert.ok(familyCount > 80, "Use a real family with at least three result pages");
  const familyLabel = getRustFailureArea(family).label;

  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  // Keep the browser check independent of external analytics and widgets.
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  );
  const page = await context.newPage();
  let indexRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/rust-failure-atlas/search-index"))
      indexRequests++;
  });
  await page.goto(`${origin}/rust-failure-atlas`, { waitUntil: "load" });
  const input = page.getByLabel("Search an error or describe what happened", { exact: true });
  await expect(input).toBeVisible();
  assert.equal(indexRequests, 0, "The full index must wait for search intent");
  await page.screenshot({ path: `${output}/desktop.png` });
  await page.getByRole("button", { name: `${familyLabel} (${familyCount})`, exact: true }).click();
  const results = page.locator("[data-atlas-results] > li");
  await expect(results).toHaveCount(40, { timeout: 15000 });
  const ids = () => results.evaluateAll((nodes) => nodes.map((node) => node.id));
  const firstPage = await ids();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator("#atlas-search-status")).toContainText("Showing 41–80");
  assert.equal(new URL(page.url()).searchParams.get("page"), "2");
  assert.equal(new URL(page.url()).searchParams.get("area"), family);
  const secondPage = await ids();
  assert.ok(secondPage.every((id) => !firstPage.includes(id)));
  await page.reload({ waitUntil: "load" });
  await expect(page.locator("#atlas-search-status")).toContainText("Showing 41–80");
  assert.deepEqual(await ids(), secondPage);
  await page.goBack({ waitUntil: "load" });
  await expect(page.locator("#atlas-search-status")).toContainText("Showing 1–40");
  assert.deepEqual(await ids(), firstPage);

  for (const [label, query] of [
    ["Future is not Send", "future not Send"],
    ["A test hangs", "test hangs"],
    ["Build script keeps running", "build script reruns"],
    ["Debug works, release fails", "debug release"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(input).toHaveValue(query);
    await expect(page.locator("#atlas-search-status")).toContainText("Showing ");
    await expect(results.first()).toBeVisible();
  }

  await page.getByRole("button", { name: "Future is not Send", exact: true }).click();
  await expect(input).toHaveValue("future not Send");
  await expect(results.first()).toBeVisible();
  assert.equal(new URL(page.url()).searchParams.get("area"), null);
  assert.equal(new URL(page.url()).searchParams.get("page"), null);
  await input.fill("error[E0277]: Pin::new(&mut future) cannot be unpinned --> src/main.rs:77:3");
  await expect(results.first()).toHaveAttribute("id", "rfa-088");
  const titleLink = results.first().getByRole("heading", { level: 3 }).getByRole("link");
  await expect(titleLink).toHaveAttribute(
    "href",
    "/rust/failures/async-block-cannot-be-unpinned-with-pin-new"
  );
  await titleLink.click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pin::new");
  await expect(
    page.getByRole("link", { name: "Download the failing fixture", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ask about a similar Rust problem", exact: true })
  ).toHaveAttribute("href", "/contact");

  const retry = await context.newPage();
  let unavailable = true;
  await retry.route("**/rust-failure-atlas/search-index*", (route) =>
    unavailable ? route.abort() : route.continue()
  );
  await retry.goto(`${origin}/rust-failure-atlas?q=RFA-088`, { waitUntil: "load" });
  await expect(
    retry.getByText("Search is temporarily unavailable.", { exact: true })
  ).toBeVisible();
  unavailable = false;
  // Force the plain JSON fallback as well as the failed-request retry path.
  await retry.route("**/rust-failure-atlas/search-index.json.gz", (route) => route.abort());
  await retry.getByRole("button", { name: "Retry loading search data", exact: true }).click();
  await expect(retry.locator("[data-atlas-results] > li")).toHaveCount(1);
  await expect(retry.locator("[data-atlas-results] > li")).toHaveAttribute("id", "rfa-088");

  const plain = await browser.newContext({ javaScriptEnabled: false });
  const plainPage = await plain.newPage();
  await plainPage.goto(`${origin}/rust-failure-atlas`, { waitUntil: "domcontentloaded" });
  const familyLinks = plainPage.locator("#atlas-directory a");
  assert.ok((await familyLinks.count()) > 0);
  await familyLinks.first().click();
  await expect(plainPage).toHaveURL(/\/rust-failure-atlas\/area\//);
  await expect(plainPage.locator("main").getByRole("heading", { level: 1 })).toBeVisible();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${origin}/rust-failure-atlas`, { waitUntil: "load" });
  const mobileInput = mobilePage.getByLabel("Search an error or describe what happened", {
    exact: true,
  });
  await expect(mobileInput).toBeVisible();
  const box = await mobileInput.boundingBox();
  await mobilePage.screenshot({ path: `${output}/mobile.png` });
  assert.ok(box && box.y < 844, "Search should be reachable in the first mobile viewport");
  await writeFile(
    `${output}/summary.txt`,
    "Checked lazy loading, real-family paging, reload/back, query reset, pasted diagnostics, title links, case evidence/contact, retry/plain-index fallback, no-JavaScript family browsing, and mobile search placement.\n"
  );
  console.log(
    "Verified Atlas search, paging, browser history, result links, fallbacks, and mobile placement against the built site."
  );
} finally {
  if (browser) await browser.close();
  if (server.exitCode === null && server.signalCode === null) {
    const exited = once(server, "exit");
    server.kill("SIGTERM");
    await exited;
  }
}
