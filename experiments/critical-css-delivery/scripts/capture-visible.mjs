import { mkdir, writeFile } from "node:fs/promises";
import { Cdp, sleep } from "./cdp.mjs";
import { origin, profiles, resultsRoot, routes } from "./config.mjs";

const output = `${resultsRoot}/visible`;
await mkdir(output, { recursive: true });

const captureExpression = `(() => {
  const source = document.documentElement;
  const clone = source.cloneNode(true);
  const originals = [source, ...source.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  const keep = new Set();
  for (let index = 0; index < originals.length; index += 1) {
    const element = originals[index];
    const tag = element.tagName;
    if (tag === 'HTML' || tag === 'HEAD' || tag === 'BODY') {
      keep.add(index);
      continue;
    }
    if (element.closest('head')) continue;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (
      rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight &&
      rect.right > 0 && rect.left < innerWidth && style.display !== 'none' &&
      style.visibility !== 'hidden' && Number(style.opacity || 1) !== 0
    ) {
      let current = element;
      while (current) {
        const currentIndex = originals.indexOf(current);
        if (currentIndex >= 0) keep.add(currentIndex);
        current = current.parentElement;
      }
    }
  }
  // Rules that hide an element, or spacing on an otherwise empty element, do
  // not appear in a visible-element census even when they affect a visible
  // flex/grid container. Retain those immediate children as structural
  // context; retaining every child of body/main would recreate the full DOM.
  for (let index = 0; index < originals.length; index += 1) {
    if (keep.has(index)) continue;
    const element = originals[index];
    const parentIndex = originals.indexOf(element.parentElement);
    if (!keep.has(parentIndex)) continue;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (
      style.display === 'none' || style.visibility === 'hidden' ||
      Number(style.opacity || 1) === 0 || !(rect.width > 0 && rect.height > 0)
    ) {
      keep.add(index);
    }
  }
  for (let index = copies.length - 1; index >= 0; index -= 1) {
    const element = copies[index];
    if (!keep.has(index) && element.closest('body')) element.remove();
  }
  for (const element of clone.querySelectorAll('script,noscript,nextjs-portal')) element.remove();
  const body = clone.querySelector('body');
  return {
    html: body?.outerHTML || '<body></body>',
    viewport: [innerWidth, innerHeight],
    sourceNodes: originals.length,
    keptNodes: keep.size,
    heading: document.querySelector('h1')?.textContent || null,
    rootClass: document.documentElement.className,
  };
})()`;

async function capture(page, profileName, routeName, state) {
  await sleep(150);
  await page.evaluate(
    "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
  );
  const snapshot = await page.evaluate(captureExpression);
  const name = `${profileName}-${routeName}-${state}`;
  await writeFile(`${output}/${name}.html`, `${snapshot.html}\n`);
  return {
    profile: profileName,
    route: routeName,
    state,
    file: `visible/${name}.html`,
    ...snapshot,
  };
}

async function until(page, expression) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await page.evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

const cdp = new Cdp();
await cdp.connect();
const rows = [];
try {
  for (const [profileName, profile] of Object.entries(profiles)) {
    for (const route of routes) {
      const page = await cdp.page(profile);
      try {
        await page.navigate(`${origin}${route.pathname}`);
        rows.push(await capture(page, profileName, route.name, "initial-light"));

        await page.evaluate("document.documentElement.classList.add('dark')");
        rows.push(await capture(page, profileName, route.name, "initial-dark"));

        await page.evaluate("document.querySelector('button[aria-label=\"Search\"]')?.click()");
        await until(page, "Boolean(document.querySelector('[role=\"dialog\"]'))");
        rows.push(await capture(page, profileName, route.name, "search-dark"));
        await page.evaluate(
          "document.querySelector('button[aria-label=\"Close search\"]')?.click()"
        );
        await until(page, "!document.querySelector('[role=\"dialog\"]')");

        if (profileName === "mobile") {
          await page.evaluate(
            "document.querySelector('button[aria-label=\"Open menu\"]')?.click()"
          );
          await until(page, "Boolean(document.querySelector('button[aria-label=\"Close menu\"]'))");
          rows.push(await capture(page, profileName, route.name, "menu-dark"));
        }
        console.log(`${profileName}/${route.name}: captured`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  cdp.close();
}

await writeFile(
  `${resultsRoot}/visible-snapshots.json`,
  `${JSON.stringify({ browser: cdp.version, origin, rows }, null, 2)}\n`
);
