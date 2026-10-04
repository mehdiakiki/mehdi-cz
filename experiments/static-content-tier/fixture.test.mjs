import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import productionDocuments from "../../public/search.json" with { type: "json" };
import { findSearchDocuments } from "../../lib/search-documents-query.mjs";
import buildReport from "./generated/build-report.json" with { type: "json" };
import cacheAssets from "./generated/cache-assets.json" with { type: "json" };
import fixtureDocuments from "./generated/search.json" with { type: "json" };
import {
  avatarSizePolicies,
  assetPolicies,
  contentVariants,
  headOrders,
  renderContentDocument,
} from "./lib/render-document.mjs";
import { findDocuments } from "./lib/search.mjs";
import { createTransportShapingProxy } from "./lib/transport-shaping-proxy.mjs";
import { renderSearchPage } from "./app/hybrid/search/route.js";
import { contentCacheControl, GET as getContentPage } from "./app/hybrid/[variant]/[page]/route.js";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));

test("content documents have no React, Flight, or Next startup runtime", () => {
  for (const page of ["home", "article"]) {
    for (const variant of contentVariants) {
      const html = renderContentDocument(page, variant);
      assert.doesNotMatch(html, /self\.__next_f|\/_next\/static\/chunks|__next/);
      assert.match(html, /<script type="module" src="\/hybrid\/bootstrap\.js"><\/script>/);
      assert.equal((html.match(/<script\b/g) || []).length >= 2, true);
    }
  }
});

test("content responses are compressed and briefly reusable after intent prefetch", async () => {
  const response = await getContentPage(
    new Request("http://fixture.local/hybrid/pruned/home", {
      headers: { "accept-encoding": "gzip, br" },
    }),
    { params: Promise.resolve({ variant: "pruned", page: "home" }) }
  );
  assert.equal(response.headers.get("content-encoding"), "gzip");
  assert.equal(response.headers.get("cache-control"), contentCacheControl);
  assert.match(response.headers.get("vary"), /Accept-Encoding/i);
});

test("the enhancement contract has resilient non-JavaScript paths", () => {
  const html = renderContentDocument("article", "pruned");
  assert.match(html, /href="\/hybrid\/search\?variant=pruned"/);
  assert.match(html, /<dialog[^>]+data-hybrid-menu/);
  assert.match(html, /<form[^>]+action="\/api\/newsletter"[^>]+method="post"/);
  assert.match(html, /<noscript>/);
  assert.doesNotMatch(html, /aria-label="Scroll To Comment"/);
  assert.match(
    html,
    /aria-label="Scroll To Top"[^>]+href="#top"|href="#top"[^>]+aria-label="Scroll To Top"/
  );
});

test("the measured warm-loop article link remains inside each variant", () => {
  for (const variant of contentVariants) {
    const html = renderContentDocument("home", variant);
    assert.match(html, new RegExp(`href="/hybrid/${variant}/article"`));
    assert.match(html, new RegExp(`href="/hybrid/${variant}/home"`));
  }
});

test("prerender variants isolate their content-link policy", () => {
  const immediate = renderContentDocument("home", "prerender-immediate");
  const dwell = renderContentDocument("home", "prerender-dwell");
  const module = fs.readFileSync(path.join(fixtureRoot, "public/hybrid/prerender.js"), "utf8");

  for (const [html, variant, policy] of [
    [immediate, "prerender-immediate", "immediate"],
    [dwell, "prerender-dwell", "dwell"],
  ]) {
    assert.match(html, new RegExp(`data-perf031-policy="${policy}"`));
    assert.match(html, /src="\/hybrid\/prerender\.js"/);
    assert.match(html, new RegExp(`href="/hybrid/${variant}/article" data-prerender-on-intent=""`));
    assert.doesNotMatch(
      html,
      new RegExp(`href="/hybrid/${variant}/article" data-prefetch-on-intent=""`)
    );
    assert.match(html, /href="\/work" data-prefetch-on-intent=""/);
    assert.match(html, /href="\/generated\/shared\/base\.css"/);
  }
  assert.match(module, /HTMLScriptElement\.supports\?\.\("speculationrules"\)/);
  assert.match(module, /rule\.type = "speculationrules"/);
  assert.match(module, /eagerness: "immediate"/);
  assert.match(module, /state\.speculation\?\.remove\(\)/);
  assert.match(module, /root\.dataset\.perf032DwellMs/);
  assert.match(module, /Number\.isFinite\(requestedDwellMs\)/);
  assert.match(module, /requestedDwellMs : 150/);
  assert.match(module, /prefetchForTouch\(target\.url\)/);
  assert.match(module, /hint\.dataset\.perf032TouchPrefetch/);
  assert.doesNotMatch(module, /begin\(target\.link, target\.url, true\)/);
  assert.equal((module.match(/event\.pointerType === "touch"/g) || []).length, 2);
});

test("PERF-032 dwell overrides are bounded and query-only", async () => {
  const normal = renderContentDocument("home", "prerender-dwell");
  const overridden = renderContentDocument("home", "prerender-dwell", {
    prerenderDwellMs: 75,
  });
  assert.doesNotMatch(normal, /data-perf032-dwell-ms/);
  assert.match(overridden, /data-perf032-dwell-ms="75"/);

  for (const [requested, expected] of [
    ["0", "0"],
    ["75", "75"],
    ["150", "150"],
    ["250", "250"],
    ["125", null],
    ["-1", null],
    ["not-a-number", null],
  ]) {
    const response = await getContentPage(
      new Request(`http://fixture.local/hybrid/prerender-dwell/home?perf032-dwell-ms=${requested}`),
      { params: Promise.resolve({ variant: "prerender-dwell", page: "home" }) }
    );
    const html = await response.text();
    if (expected === null) assert.doesNotMatch(html, /data-perf032-dwell-ms/);
    else assert.match(html, new RegExp(`data-perf032-dwell-ms="${expected}"`));
  }
});

test("PERF-033 staged preparation is bounded, isolated, and query-only", async () => {
  const module = fs.readFileSync(path.join(fixtureRoot, "public/hybrid/prerender.js"), "utf8");
  const normal = renderContentDocument("home", "prerender-dwell");
  const keep = renderContentDocument("home", "prerender-dwell", {
    prerenderDwellMs: 150,
    stagedPolicy: "keep",
  });
  const cancel = renderContentDocument("home", "prerender-dwell", {
    prerenderDwellMs: 150,
    stagedPolicy: "cancel",
    commitCancelBeforeMs: 250,
  });
  const adaptive = renderContentDocument("home", "prerender-dwell", {
    prerenderDwellMs: 150,
    stagedPolicy: "adaptive",
    commitCancelBeforeMs: 150,
  });
  const wrongVariant = renderContentDocument("home", "shared", {
    stagedPolicy: "cancel",
    commitCancelBeforeMs: 250,
  });

  assert.doesNotMatch(normal, /data-perf033-/);
  assert.match(keep, /data-perf033-policy="keep"/);
  assert.doesNotMatch(keep, /data-perf033-cancel-before-ms/);
  assert.match(cancel, /data-perf033-policy="cancel"/);
  assert.match(cancel, /data-perf033-cancel-before-ms="250"/);
  assert.match(adaptive, /data-perf033-policy="adaptive"/);
  assert.match(adaptive, /data-perf033-cancel-before-ms="150"/);
  assert.doesNotMatch(wrongVariant, /data-perf033-/);

  for (const [query, expectedPolicy, expectedGuard] of [
    ["perf032-dwell-ms=150&perf033-mode=keep", "keep", null],
    ["perf032-dwell-ms=150&perf033-mode=cancel&perf033-cancel-before-ms=250", "cancel", "250"],
    ["perf032-dwell-ms=150&perf033-mode=adaptive&perf033-cancel-before-ms=150", "adaptive", "150"],
    ["perf032-dwell-ms=150&perf033-mode=invalid&perf033-cancel-before-ms=125", null, null],
    ["", null, null],
  ]) {
    const response = await getContentPage(
      new Request(`http://fixture.local/hybrid/prerender-dwell/home?${query}`),
      { params: Promise.resolve({ variant: "prerender-dwell", page: "home" }) }
    );
    const html = await response.text();
    if (expectedPolicy === null) assert.doesNotMatch(html, /data-perf033-policy/);
    else assert.match(html, new RegExp(`data-perf033-policy="${expectedPolicy}"`));
    if (expectedGuard === null) assert.doesNotMatch(html, /data-perf033-cancel-before-ms/);
    else assert.match(html, new RegExp(`data-perf033-cancel-before-ms="${expectedGuard}"`));
    if (!query) assert.doesNotMatch(html, /data-perf032-dwell-ms/);
  }

  const wrongVariantResponse = await getContentPage(
    new Request(
      "http://fixture.local/hybrid/shared/home?perf033-mode=cancel&perf033-cancel-before-ms=250"
    ),
    { params: Promise.resolve({ variant: "shared", page: "home" }) }
  );
  assert.doesNotMatch(await wrongVariantResponse.text(), /data-perf033-/);
  assert.match(module, /prefetchForStage\(state, url\)/);
  assert.match(module, /state\.promotedAt = performance\.now\(\)/);
  assert.match(module, /prerenderAge < commitCancelBeforeMs/);
  assert.match(module, /prefetchCompletionAge < commitCancelBeforeMs/);
  assert.match(module, /prefetch\.completedAt = performance\.now\(\)/);
  assert.match(module, /state\.speculation\.remove\(\)/);
  assert.match(module, /perf033CommitRuleRemovals/);
});

test("PERF-034 promotion gates wait for bounded prefetch progress", async () => {
  const module = fs.readFileSync(path.join(fixtureRoot, "public/hybrid/prerender.js"), "utf8");
  const runner = fs.readFileSync(
    path.join(fixtureRoot, "measure-prerender-thresholds.mjs"),
    "utf8"
  );
  const normal = renderContentDocument("home", "prerender-dwell", {
    stagedPolicy: "adaptive",
    commitCancelBeforeMs: 150,
  });
  const complete = renderContentDocument("home", "prerender-dwell", {
    stagedPolicy: "adaptive",
    commitCancelBeforeMs: 150,
    promotionGate: "complete",
  });
  const settled = renderContentDocument("home", "prerender-dwell", {
    stagedPolicy: "adaptive",
    commitCancelBeforeMs: 150,
    promotionGate: "settled",
    promotionSettleMs: 150,
  });
  const incompleteSettled = renderContentDocument("home", "prerender-dwell", {
    stagedPolicy: "adaptive",
    promotionGate: "settled",
  });
  const wrongPolicy = renderContentDocument("home", "prerender-dwell", {
    stagedPolicy: "keep",
    promotionGate: "complete",
  });

  assert.doesNotMatch(normal, /data-perf034-/);
  assert.match(complete, /data-perf034-promotion="complete"/);
  assert.doesNotMatch(complete, /data-perf034-settle-ms/);
  assert.match(settled, /data-perf034-promotion="settled"/);
  assert.match(settled, /data-perf034-settle-ms="150"/);
  assert.doesNotMatch(incompleteSettled, /data-perf034-/);
  assert.doesNotMatch(wrongPolicy, /data-perf034-/);

  for (const [query, expectedGate, expectedSettle] of [
    [
      "perf033-mode=adaptive&perf033-cancel-before-ms=150&perf034-promotion=complete",
      "complete",
      null,
    ],
    [
      "perf033-mode=adaptive&perf033-cancel-before-ms=150&perf034-promotion=settled&perf034-settle-ms=150",
      "settled",
      "150",
    ],
    ["perf033-mode=adaptive&perf034-promotion=settled&perf034-settle-ms=125", null, null],
    ["perf033-mode=keep&perf034-promotion=complete", null, null],
  ]) {
    const response = await getContentPage(
      new Request(`http://fixture.local/hybrid/prerender-dwell/home?${query}`),
      { params: Promise.resolve({ variant: "prerender-dwell", page: "home" }) }
    );
    const html = await response.text();
    if (expectedGate === null) assert.doesNotMatch(html, /data-perf034-promotion/);
    else assert.match(html, new RegExp(`data-perf034-promotion="${expectedGate}"`));
    if (expectedSettle === null) assert.doesNotMatch(html, /data-perf034-settle-ms/);
    else assert.match(html, new RegExp(`data-perf034-settle-ms="${expectedSettle}"`));
  }

  assert.match(module, /scheduleGatedPromotion\(link, state\)/);
  assert.match(module, /state\.prefetch\.completedAt \+ promotionSettleMs/);
  assert.match(module, /waitingState\.prefetch === prefetch/);
  assert.match(module, /perf034PromotionGateDeferrals/);
  assert.match(runner, /PERF034_GATED/);
  assert.match(runner, /adaptive-complete-/);
  assert.match(runner, /adaptive-settled-/);
});

test("PERF-035 isolates progressive and completion-delayed article delivery", () => {
  const proxy = fs.readFileSync(path.join(fixtureRoot, "lib/transport-shaping-proxy.mjs"), "utf8");
  const runner = fs.readFileSync(
    path.join(fixtureRoot, "measure-prerender-thresholds.mjs"),
    "utf8"
  );
  const entry = fs.readFileSync(path.join(fixtureRoot, "measure-streaming-promotion.mjs"), "utf8");

  assert.match(proxy, /startDedicatedArticleDelivery\(entry, mode, earlyPrefixBytes\)/);
  assert.match(proxy, /articleDeliveryMode must be aggregate, progressive, burst, or prefix/);
  assert.match(proxy, /scheduledCompletionMs/);
  assert.match(runner, /PERF035_STREAMING/);
  assert.match(runner, /PERF035_DELIVERY/);
  assert.match(runner, /adaptive-eager-\$\{articleDeliveryMode\}/);
  assert.match(runner, /adaptive-complete-\$\{articleDeliveryMode\}/);
  assert.match(entry, /PERF035_STREAMING = "1"/);
});

test("PERF-036 bounds early compressed-prefix candidates", () => {
  const proxy = fs.readFileSync(path.join(fixtureRoot, "lib/transport-shaping-proxy.mjs"), "utf8");
  const runner = fs.readFileSync(
    path.join(fixtureRoot, "measure-prerender-thresholds.mjs"),
    "utf8"
  );
  const entry = fs.readFileSync(path.join(fixtureRoot, "measure-early-prefix.mjs"), "utf8");

  assert.match(proxy, /\[1024, 2048, 4096, 8192\]\.includes\(articleEarlyPrefixBytes\)/);
  assert.match(proxy, /entry\.scheduledCompletionAt - Date\.now\(\)/);
  assert.match(runner, /PERF036_PREFIX_BYTES/);
  assert.match(runner, /adaptive-eager-prefix-\$\{articleEarlyPrefixBytes\}/);
  assert.match(entry, /PERF036_PREFIX = "1"/);
});

test("PERF-037 reorders identical head tokens behind a bounded measurement query", async () => {
  const renderOptions = { measure: true };
  const documents = Object.fromEntries(
    headOrders.map((headOrder) => [
      headOrder,
      renderContentDocument("article", "prerender-dwell", { ...renderOptions, headOrder }),
    ])
  );
  const headTokens = (html) =>
    html
      .match(/<head>([\s\S]*)<\/head>/)[1]
      .match(/<[^>]*>|[^<]+/g)
      .sort();
  const body = (html) => html.slice(html.indexOf("<body"));
  const stylesheet = 'href="/generated/shared/base.css"';
  const title = "<title>";
  const measurement = 'src="/hybrid/navigation-measurement.js"';

  assert.deepEqual(headTokens(documents.original), headTokens(documents["css-first"]));
  assert.deepEqual(headTokens(documents.original), headTokens(documents["resources-first"]));
  assert.equal(body(documents.original), body(documents["css-first"]));
  assert.equal(body(documents.original), body(documents["resources-first"]));
  assert.equal(Buffer.byteLength(documents.original), Buffer.byteLength(documents["css-first"]));
  assert.equal(
    Buffer.byteLength(documents.original),
    Buffer.byteLength(documents["resources-first"])
  );
  for (const html of Object.values(documents)) {
    assert.match(html, /<head><meta charset="utf-8"><meta name="viewport"/);
    assert.ok(html.indexOf('rel="preload"') < html.indexOf(stylesheet));
  }
  assert.ok(documents.original.indexOf(title) < documents.original.indexOf(stylesheet));
  assert.ok(documents["css-first"].indexOf(stylesheet) < documents["css-first"].indexOf(title));
  assert.ok(documents["css-first"].indexOf(title) < documents["css-first"].indexOf(measurement));
  assert.ok(
    documents["resources-first"].indexOf(measurement) < documents["resources-first"].indexOf(title)
  );
  const gzipSizes = Object.values(documents).map(
    (html) => zlib.gzipSync(Buffer.from(html), { level: 9 }).length
  );
  assert.ok(Math.max(...gzipSizes) - Math.min(...gzipSizes) <= 128);
  assert.throws(
    () =>
      renderContentDocument("article", "prerender-dwell", {
        ...renderOptions,
        headOrder: "invalid",
      }),
    /Unknown head order/
  );

  const requestDocument = async (headOrder, measure = true) => {
    const url = new URL("http://fixture.local/hybrid/prerender-dwell/article");
    if (measure) url.searchParams.set("perf031-measure", "1");
    url.searchParams.set("perf037-head-order", headOrder);
    const response = await getContentPage(
      new Request(url, { headers: { "accept-encoding": "gzip" } }),
      { params: Promise.resolve({ variant: "prerender-dwell", page: "article" }) }
    );
    return zlib.gunzipSync(Buffer.from(await response.arrayBuffer())).toString();
  };
  const routedCssFirst = await requestDocument("css-first");
  const routedInvalid = await requestDocument("invalid");
  const routedUnmeasured = await requestDocument("css-first", false);
  assert.ok(routedCssFirst.indexOf(stylesheet) < routedCssFirst.indexOf(title));
  assert.ok(routedInvalid.indexOf(title) < routedInvalid.indexOf(stylesheet));
  assert.ok(routedUnmeasured.indexOf(title) < routedUnmeasured.indexOf(stylesheet));

  const runner = fs.readFileSync(
    path.join(fixtureRoot, "measure-prerender-thresholds.mjs"),
    "utf8"
  );
  const autorun = fs.readFileSync(
    path.join(fixtureRoot, "public/hybrid/prerender-autorun.js"),
    "utf8"
  );
  const entry = fs.readFileSync(path.join(fixtureRoot, "measure-head-ordering.mjs"), "utf8");
  assert.match(runner, /PERF037_HEAD_ORDER/);
  assert.match(runner, /\["css-first", 1024\]/);
  assert.match(runner, /\["resources-first", 1024\]/);
  assert.match(autorun, /targetUrl\.searchParams\.set\("perf037-head-order", headOrder\)/);
  assert.match(entry, /PERF037_HEAD_ORDER = "1"/);
});

test("PERF-038 isolates content addressing from immutable cache freshness", async () => {
  const renderOptions = {
    measure: true,
    headOrder: "css-first",
    stagedPolicy: "adaptive",
    commitCancelBeforeMs: 150,
  };
  const documents = Object.fromEntries(
    assetPolicies.map((assetPolicy) => [
      assetPolicy,
      renderContentDocument("article", "prerender-dwell", {
        ...renderOptions,
        assetPolicy,
      }),
    ])
  );
  const documentAssetSources = [
    "/generated/media/",
    "/generated/shared/base.css",
    "/hybrid/bootstrap.js",
    "/hybrid/prerender.js",
    "/site.webmanifest",
  ];
  const normalize = (html, policy) =>
    Object.entries(cacheAssets.policies[policy] ?? {}).reduce(
      (normalized, [source, target]) => normalized.replaceAll(target, source),
      html
    );

  assert.deepEqual(assetPolicies, ["mutable", "hashed-stale", "hashed-immutable"]);
  assert.equal(Object.keys(cacheAssets.policies["hashed-stale"]).length, 7);
  assert.deepEqual(
    Object.keys(cacheAssets.policies["hashed-stale"]),
    Object.keys(cacheAssets.policies["hashed-immutable"])
  );
  for (const asset of cacheAssets.assets) {
    const body = fs.readFileSync(path.join(fixtureRoot, "public", asset.url.slice(1)));
    const digest = createHash("sha256").update(body).digest("hex");
    assert.equal(asset.bytes, body.length);
    assert.equal(asset.sha256, digest);
    assert.ok(asset.url.includes(`.${digest.slice(0, 12)}.`));
  }
  for (const source of documentAssetSources) assert.match(documents.mutable, new RegExp(source));
  for (const policy of ["hashed-stale", "hashed-immutable"]) {
    const mapping = cacheAssets.policies[policy];
    for (const [source, target] of Object.entries(mapping)) {
      if (!source.includes("web-app-manifest-")) {
        assert.doesNotMatch(documents[policy], new RegExp(source.replaceAll("/", "\\/")));
        assert.ok(documents[policy].includes(target));
      }
      assert.match(target, /\.[a-f0-9]{12}\.[a-z0-9]+$/);
      assert.ok(fs.statSync(path.join(fixtureRoot, "public", target.slice(1))).size > 0);
    }
    const manifest = fs.readFileSync(
      path.join(fixtureRoot, "public", mapping["/site.webmanifest"].slice(1)),
      "utf8"
    );
    for (const iconUrl of [
      "/static/favicons/web-app-manifest-192x192.png",
      "/static/favicons/web-app-manifest-512x512.png",
    ]) {
      assert.doesNotMatch(manifest, new RegExp(iconUrl.replaceAll("/", "\\/")));
      assert.ok(manifest.includes(mapping[iconUrl]));
    }
    assert.equal(normalize(documents[policy], policy), documents.mutable);
  }
  assert.equal(
    Buffer.byteLength(documents["hashed-stale"]),
    Buffer.byteLength(documents["hashed-immutable"])
  );
  assert.throws(
    () =>
      renderContentDocument("article", "prerender-dwell", {
        ...renderOptions,
        assetPolicy: "invalid",
      }),
    /Unknown asset policy/
  );

  const requestDocument = async (assetPolicy) => {
    const url = new URL("http://fixture.local/hybrid/prerender-dwell/article");
    url.searchParams.set("perf038-cache", assetPolicy);
    const response = await getContentPage(new Request(url), {
      params: Promise.resolve({ variant: "prerender-dwell", page: "article" }),
    });
    return response.text();
  };
  assert.equal(
    normalize(await requestDocument("hashed-immutable"), "hashed-immutable"),
    renderContentDocument("article", "prerender-dwell", { assetPolicy: "mutable" })
  );
  assert.equal(
    await requestDocument("invalid"),
    renderContentDocument("article", "prerender-dwell")
  );

  const runner = fs.readFileSync(
    path.join(fixtureRoot, "measure-prerender-thresholds.mjs"),
    "utf8"
  );
  const autorun = fs.readFileSync(
    path.join(fixtureRoot, "public/hybrid/prerender-autorun.js"),
    "utf8"
  );
  const entry = fs.readFileSync(path.join(fixtureRoot, "measure-cache-freshness.mjs"), "utf8");
  const nextConfig = fs.readFileSync(path.join(fixtureRoot, "next.config.mjs"), "utf8");
  assert.match(runner, /PERF038_CACHE/);
  assert.match(runner, /\["mutable", "hashed-stale", "hashed-immutable"\]/);
  assert.match(autorun, /targetUrl\.searchParams\.set\("perf038-cache", assetPolicy\)/);
  assert.match(entry, /PERF038_CACHE = "1"/);
  assert.match(nextConfig, /source: "\/generated\/cache-fresh\/:path\*"/);
  assert.match(nextConfig, /public, max-age=31536000, immutable/);
  assert.doesNotMatch(nextConfig, /source: "\/generated\/cache-stale\/:path\*"/);
});

test("PERF-039 isolates the fixed avatar slot from the legacy responsive hint", async () => {
  const renderOptions = {
    measure: true,
    headOrder: "css-first",
    assetPolicy: "hashed-immutable",
  };
  const legacy = renderContentDocument("article", "prerender-dwell", {
    ...renderOptions,
    avatarSizePolicy: "legacy-responsive",
  });
  const fixed = renderContentDocument("article", "prerender-dwell", {
    ...renderOptions,
    avatarSizePolicy: "fixed-40",
  });
  const legacySizes =
    "(max-width: 640px) 100vw, (max-width: 768px) 75vw, (max-width: 1024px) 50vw, 33vw";

  assert.deepEqual(avatarSizePolicies, ["legacy-responsive", "fixed-40"]);
  assert.equal(
    (legacy.match(new RegExp(legacySizes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || [])
      .length,
    2
  );
  assert.equal((fixed.match(/(?:image)?sizes="40px"/g) || []).length, 2);
  assert.doesNotMatch(fixed, new RegExp(legacySizes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal((fixed.match(/(?:image)?srcset="[^"]*w=96[^"]*96w/g) || []).length, 2);
  assert.doesNotMatch(legacy, /(?:image)?srcset="[^"]*w=96[^"]*96w/);
  const normalizeAvatarHints = (html) =>
    html
      .replaceAll(legacySizes, "__AVATAR_SIZES__")
      .replaceAll("40px", "__AVATAR_SIZES__")
      .replace(
        /((?:image)?srcset)="[^"]*mehdi_image_enhanced_square\.webp[^"]*"/g,
        '$1="__AVATAR_SRCSET__"'
      );
  assert.equal(
    normalizeAvatarHints(legacy),
    normalizeAvatarHints(fixed),
    "only the preload/img sizes and srcset values should differ"
  );
  assert.throws(
    () =>
      renderContentDocument("article", "prerender-dwell", {
        ...renderOptions,
        avatarSizePolicy: "invalid",
      }),
    /Unknown avatar size policy/
  );

  const requestDocument = async (avatarSizePolicy, measure = true) => {
    const url = new URL("http://fixture.local/hybrid/prerender-dwell/article");
    if (measure) url.searchParams.set("perf031-measure", "1");
    url.searchParams.set("perf039-avatar-size", avatarSizePolicy);
    const response = await getContentPage(new Request(url), {
      params: Promise.resolve({ variant: "prerender-dwell", page: "article" }),
    });
    return response.text();
  };
  assert.match(await requestDocument("fixed-40"), /(?:image)?sizes="40px"/);
  assert.doesNotMatch(await requestDocument("fixed-40", false), /(?:image)?sizes="40px"/);
  assert.doesNotMatch(await requestDocument("invalid"), /(?:image)?sizes="40px"/);

  const runner = fs.readFileSync(
    path.join(fixtureRoot, "measure-prerender-thresholds.mjs"),
    "utf8"
  );
  const autorun = fs.readFileSync(
    path.join(fixtureRoot, "public/hybrid/prerender-autorun.js"),
    "utf8"
  );
  const entry = fs.readFileSync(path.join(fixtureRoot, "measure-activation-trace.mjs"), "utf8");
  assert.match(runner, /PERF039_TRACE/);
  assert.match(runner, /PERF039_AVATAR_POLICIES/);
  assert.match(runner, /--trace-startup-file=/);
  assert.match(autorun, /targetUrl\.searchParams\.set\("perf039-avatar-size", avatarSizePolicy\)/);
  assert.match(entry, /PERF039_TRACE = "1"/);
});

test("measurement automation is query-only and absent from normal documents", () => {
  const normal = renderContentDocument("home", "prerender-immediate");
  const automated = renderContentDocument("home", "prerender-immediate", { autorun: true });
  const measured = renderContentDocument("article", "prerender-immediate", { measure: true });

  assert.doesNotMatch(normal, /prerender-autorun|navigation-measurement/);
  assert.match(automated, /src="\/hybrid\/prerender-autorun\.js"/);
  assert.doesNotMatch(automated, /navigation-measurement/);
  assert.match(measured, /src="\/hybrid\/navigation-measurement\.js"/);
  assert.doesNotMatch(measured, /prerender-autorun/);
});

test("fallback search is escaped, noindexed, and uses production ranking", () => {
  const query = 'reconciliation <script>alert("x")</script>';
  const html = renderSearchPage(query, "pruned");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(html, /<script>alert\("x"\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);

  for (const candidate of ["", "rust", "reconciliation", "system sync", "zz-no-hit"]) {
    assert.deepEqual(
      findDocuments(fixtureDocuments, candidate),
      findSearchDocuments(productionDocuments, candidate)
    );
  }
});

test("route pruning reduces every measured stylesheet without empty output", () => {
  for (const entry of buildReport.css) {
    assert.ok(entry.pruned.gzip > 0, `${entry.page}/${entry.stylesheet} is empty`);
    assert.ok(
      entry.pruned.gzip < entry.full.gzip,
      `${entry.page}/${entry.stylesheet} did not shrink`
    );
    assert.ok(entry.removedRules > 0, `${entry.page}/${entry.stylesheet} removed no rules`);
  }
  for (const relative of [
    "generated/full/base.css",
    "generated/pruned/home-base.css",
    "generated/pruned/article-base.css",
    "generated/full/article.css",
    "generated/pruned/article.css",
    "generated/shared/base.css",
  ]) {
    assert.ok(fs.statSync(path.join(fixtureRoot, "public", relative)).size > 0);
  }
});

test("the source search index is copied byte-for-byte", () => {
  assert.deepEqual(fixtureDocuments, productionDocuments);
});

test("the PERF-032 proxy meters completed bodies and observes pre-header cancellation", async () => {
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const listen = (server) =>
    new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject);
        resolve(server.address());
      });
    });
  const close = (server) => {
    server.closeIdleConnections?.();
    return new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  };
  const body = Buffer.alloc(2_000, "p");
  const upstream = http.createServer((_request, response) => {
    response.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": body.length,
    });
    response.end(body);
  });
  const upstreamAddress = await listen(upstream);
  const proxy = createTransportShapingProxy({
    upstreamBaseUrl: `http://127.0.0.1:${upstreamAddress.port}`,
    tickMs: 20,
  });

  try {
    const proxyAddress = await proxy.listen(0);
    const articleUrl = `http://127.0.0.1:${proxyAddress.port}/hybrid/shared/article`;

    proxy.reset({
      runId: "complete",
      profile: { name: "test", latencyMs: 40, downloadKbps: 80 },
    });
    const response = await fetch(articleUrl);
    assert.equal((await response.arrayBuffer()).byteLength, body.length);
    const completed = proxy.snapshot();
    assert.equal(completed.target.requests, 1);
    assert.equal(completed.target.completed, 1);
    assert.equal(completed.target.cancelled, 0);
    assert.equal(completed.target.plannedBodyBytes, body.length);
    assert.equal(completed.target.sentBodyBytes, body.length);
    assert.equal(completed.target.articleRequests, 1);
    assert.equal(completed.target.articlePlannedBodyBytes, body.length);
    assert.equal(completed.target.articleSentBodyBytes, body.length);
    assert.equal(completed.target.articleRequestDetails.length, 1);
    assert.equal(completed.target.articleRequestDetails[0].completed, true);
    assert.equal(completed.target.articleRequestDetails[0].sentBodyBytes, body.length);
    assert.ok(completed.requests[0].requestToHeadersMs >= 30);

    const delivery = {};
    for (const articleDeliveryMode of ["progressive", "burst"]) {
      proxy.reset({
        runId: articleDeliveryMode,
        profile: { name: "test", latencyMs: 40, downloadKbps: 80 },
        articleDeliveryMode,
      });
      const modeResponse = await fetch(`${articleUrl}?delivery=${articleDeliveryMode}`);
      assert.equal((await modeResponse.arrayBuffer()).byteLength, body.length);
      delivery[articleDeliveryMode] = proxy.snapshot().target.articleRequestDetails[0];
      assert.equal(delivery[articleDeliveryMode].sentBodyBytes, body.length);
      assert.equal(delivery[articleDeliveryMode].completed, true);
      assert.equal(delivery[articleDeliveryMode].cancelled, false);
      assert.equal(delivery[articleDeliveryMode].deliveryMode, `article-${articleDeliveryMode}`);
      assert.ok(delivery[articleDeliveryMode].requestToHeadersMs >= 30);
    }
    assert.ok(Math.abs(delivery.progressive.durationMs - delivery.burst.durationMs) <= 40);
    assert.ok(delivery.burst.firstBodyMs - delivery.progressive.firstBodyMs >= 50);
    assert.ok(delivery.progressive.bodySpanMs >= 50);
    assert.ok(delivery.burst.bodySpanMs <= 10);

    proxy.reset({
      runId: "prefix",
      profile: { name: "test", latencyMs: 40, downloadKbps: 80 },
      articleDeliveryMode: "prefix",
      articleEarlyPrefixBytes: 1024,
    });
    const prefixResponse = await fetch(`${articleUrl}?delivery=prefix-1024`);
    assert.equal((await prefixResponse.arrayBuffer()).byteLength, body.length);
    const prefix = proxy.snapshot().target.articleRequestDetails[0];
    assert.equal(prefix.deliveryMode, "article-prefix-1024");
    assert.equal(prefix.actualEarlyPrefixBytes, 1024);
    assert.equal(prefix.sentBodyBytes, body.length);
    assert.ok(Math.abs(prefix.durationMs - delivery.burst.durationMs) <= 40);
    assert.ok(prefix.firstBodyMs < delivery.burst.firstBodyMs - 100);
    assert.ok(prefix.bodySpanMs >= 100);

    assert.throws(
      () =>
        proxy.reset({
          runId: "invalid-mode",
          profile: { name: "test", latencyMs: 40, downloadKbps: 80 },
          articleDeliveryMode: "invalid",
        }),
      /articleDeliveryMode must be aggregate, progressive, burst, or prefix/
    );
    assert.throws(
      () =>
        proxy.reset({
          runId: "invalid-prefix",
          profile: { name: "test", latencyMs: 40, downloadKbps: 80 },
          articleDeliveryMode: "prefix",
          articleEarlyPrefixBytes: 3072,
        }),
      /articleEarlyPrefixBytes must be 1024, 2048, 4096, or 8192/
    );

    proxy.reset({
      runId: "cancelled",
      profile: { name: "test", latencyMs: 100, downloadKbps: 80 },
    });
    const controller = new AbortController();
    const abandoned = fetch(`${articleUrl}?abandoned=1`, { signal: controller.signal }).catch(
      (error) => error
    );
    for (let attempt = 0; attempt < 20 && !proxy.snapshot().target.requests; attempt += 1) {
      await wait(5);
    }
    controller.abort();
    await abandoned;
    await wait(25);
    const cancelled = proxy.snapshot();
    assert.equal(cancelled.target.requests, 1);
    assert.equal(cancelled.target.completed, 0);
    assert.equal(cancelled.target.cancelled, 1);
    assert.equal(cancelled.target.sentBodyBytes, 0);
    assert.equal(cancelled.target.articleRequests, 1);
    assert.equal(cancelled.target.articleSentBodyBytes, 0);
    assert.equal(cancelled.target.articleRequestDetails[0].cancelled, true);
  } finally {
    await proxy.close();
    await close(upstream);
  }
});
