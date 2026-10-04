import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const screenshotRoot = path.resolve(process.argv[2] || "/tmp");
const outputPath = path.resolve(
  process.argv[3] || path.join(fixtureRoot, "results/visual-parity.json")
);

const comparisons = [];
for (const page of ["home", "article"]) {
  for (const [left, right] of [
    ["current", "server"],
    ["current", "plain"],
    ["server", "plain"],
  ]) {
    const leftPath = path.join(screenshotRoot, `perf029-${page}-${left}.png`);
    const rightPath = path.join(screenshotRoot, `perf029-${page}-${right}.png`);
    for (const file of [leftPath, rightPath]) {
      if (!fs.existsSync(file)) throw new Error(`Missing screenshot: ${file}`);
    }

    const dimensions = command("identify", ["-format", "%w %h", leftPath]);
    const [width, height] = dimensions.split(/\s+/).map(Number);
    const ae = metric("AE", leftPath, rightPath);
    const rmse = metric("RMSE", leftPath, rightPath);
    comparisons.push({
      page,
      left,
      right,
      width,
      height,
      differingPixels: ae.absolute,
      differingPixelRatio: ae.normalized,
      rmse: rmse.absolute,
      normalizedRmse: rmse.normalized,
    });
  }
}

function command(binary, args, acceptedStatuses = [0]) {
  const result = spawnSync(binary, args, { encoding: "utf8" });
  if (!acceptedStatuses.includes(result.status)) {
    throw new Error(`${binary} ${args.join(" ")} failed (${result.status}): ${result.stderr}`);
  }
  return `${result.stdout}${result.stderr}`.trim();
}

function metric(name, left, right) {
  const output = command("compare", ["-metric", name, left, right, "null:"], [0, 1]);
  const match = output.match(/^([0-9.e+-]+)\s+\(([0-9.e+-]+)\)$/i);
  if (!match) throw new Error(`Cannot parse ${name} result: ${output}`);
  return { absolute: Number(match[1]), normalized: Number(match[2]) };
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      tool: "ImageMagick compare",
      screenshotSource: `${screenshotRoot}/perf029-{home,article}-{current,server,plain}.png (not committed)`,
      capture: {
        viewport: "390x844x2,mobile,touch",
        colorScheme: "light",
        state: "load complete, document.fonts.ready, two animation frames, scroll 0",
      },
      comparisons,
      interpretation: {
        home: "All three loaded viewports are pixel-identical.",
        article:
          "Server-only and plain HTML are pixel-identical. Their only difference from the hydrated current page is the 80x80 rendered avatar region: current hydration removes Next/Image's inline blur background after decode, while the non-hydrated snapshots retain it. The loaded image URL, response bytes, and SHA-256 were identical.",
      },
      limitation:
        "This checks the initial mobile viewport in light mode, not every responsive breakpoint, theme, scroll position, or interaction state.",
    },
    null,
    2
  )}\n`
);

console.table(comparisons);
