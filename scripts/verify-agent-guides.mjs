import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { heldArticleSlugs } from "../data/publication-hold.mjs";
import { reviewedGuide, llmsText, guideIndex } from "../lib/agent-guides.mjs";

assert.equal(process.env.GITHUB_ACTIONS, "true", "Use the existing GitHub workflow");
const catalog = JSON.parse(await readFile("data/agent-guides.json", "utf8"));
const expected = [];
for (const guide of catalog.guides) {
  const source = await readFile(`data/blog/${guide.slug}.mdx`, "utf8");
  const result = reviewedGuide(catalog, guide, source);
  assert.ok(result, `Review or remove the ineligible pilot entry ${guide.slug}`);
  expected.push(result);
}

// Verify the built server's public files and headers, including the production
// file-serving path. Reading a generated file alone would miss routing errors.
const port = "4187";
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], {
  stdio: ["ignore", "inherit", "inherit"],
  env: { ...process.env, NODE_ENV: "production" },
});
const get = (path) => fetch(origin + path, { signal: AbortSignal.timeout(20000) });
try {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (server.exitCode !== null) throw new Error("The built server exited before verification");
    try {
      ready = (await get("/llms.txt")).ok;
      if (ready) break;
    } catch { /* Wait for Next.js to bind its listener. */ }
    await delay(500);
  }
  assert.ok(ready, "The built server did not become ready");
  const discovery = await get("/llms.txt");
  assert.match(discovery.headers.get("content-type"), /text\/plain/);
  assert.equal(await discovery.text(), llmsText(catalog, expected));
  const index = await get("/rust/guide-index");
  assert.equal(index.status, 200);
  assert.match(index.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await index.json(), guideIndex(catalog, expected));
  for (const guide of expected) {
    const markdown = await get(guide.paths.markdown);
    assert.equal(markdown.status, 200);
    assert.match(markdown.headers.get("content-type"), /text\/markdown/);
    assert.ok(markdown.headers.get("link").includes(`<${guide.entry.htmlUrl}>; rel="canonical"`));
    assert.equal(await markdown.text(), guide.markdown);
    const html = await get(guide.paths.html);
    assert.equal(html.status, 200);
    const body = await html.text();
    assert.ok(body.includes(`rel="canonical" href="${guide.entry.htmlUrl}"`));
    assert.ok(body.includes(`type="text/markdown" href="${guide.entry.markdownUrl}"`));
    assert.ok(body.includes(`href="${guide.paths.markdown}"`));
    assert.ok(body.includes("Markdown version"));
  }
  for (const slug of ["missing-agent-guide", [...heldArticleSlugs][0]]) {
    assert.equal((await get(`/blog/${slug}.md`)).status, 404);
  }
  console.log("Verified all three Markdown copies, HTML alternates, discovery files, headers, and unpublished/unknown 404s through the built server.");
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    const exited = once(server, "exit");
    server.kill("SIGTERM");
    await exited;
  }
}
