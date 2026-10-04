import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const screenshotRoot = path.resolve(process.argv[2] || "/tmp");
const outputPath = path.resolve(
  process.argv[3] || path.join(fixtureRoot, "results/visual-parity.json")
);

function dimensions(filename) {
  const result = spawnSync("identify", ["-format", "%w %h", filename], {
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr || `identify failed: ${filename}`);
  const [width, height] = result.stdout.trim().split(/\s+/).map(Number);
  return { width, height, pixels: width * height };
}

function absoluteError(reference, candidate, diff) {
  const result = spawnSync("compare", ["-metric", "AE", reference, candidate, diff], {
    encoding: "utf8",
  });
  if (![0, 1].includes(result.status)) {
    throw new Error(result.stderr || `compare failed: ${reference} ${candidate}`);
  }
  const match = `${result.stderr}${result.stdout}`.match(/^([0-9.e+-]+)/i);
  if (!match) throw new Error(`Cannot parse ImageMagick AE output: ${result.stderr}`);
  return Number(match[1]);
}

function compare(referenceName, candidateName, diffName) {
  const reference = path.join(screenshotRoot, referenceName);
  const candidate = path.join(screenshotRoot, candidateName);
  const diff = path.join(screenshotRoot, diffName);
  for (const filename of [reference, candidate]) {
    if (!fs.existsSync(filename)) throw new Error(`Missing screenshot: ${filename}`);
  }
  const size = dimensions(reference);
  const affectedPixels = absoluteError(reference, candidate, diff);
  return {
    reference: referenceName,
    candidate: candidateName,
    ...size,
    affectedPixels,
    affectedPercent: Math.round((affectedPixels / size.pixels) * 100_000) / 1_000,
  };
}

const comparisons = [
  compare(
    "perf030-home-current.png",
    "perf030-home-full.png",
    "perf030-home-current-full-final-diff.png"
  ),
  compare(
    "perf030-home-full.png",
    "perf030-home-pruned-fixed.png",
    "perf030-home-full-pruned-final-diff.png"
  ),
  compare(
    "perf030-article-current.png",
    "perf030-article-full.png",
    "perf030-article-current-full-final-diff.png"
  ),
  compare(
    "perf030-article-full.png",
    "perf030-article-pruned.png",
    "perf030-article-full-pruned-final-diff.png"
  ),
  compare(
    "perf030-home-full.png",
    "perf030-home-shared.png",
    "perf030-home-full-shared-final-diff.png"
  ),
  compare(
    "perf030-article-full.png",
    "perf030-article-shared.png",
    "perf030-article-full-shared-final-diff.png"
  ),
];
const discardedCandidate = compare(
  "perf030-home-full.png",
  "perf030-home-pruned.png",
  "perf030-home-discarded-pruning-diff.png"
);
const responsiveChecks = [
  {
    profile: "desktop-light",
    ...compare(
      "perf030-home-full-desktop.png",
      "perf030-home-shared-desktop.png",
      "perf030-home-desktop-final-diff.png"
    ),
  },
  {
    profile: "desktop-light",
    ...compare(
      "perf030-article-full-desktop.png",
      "perf030-article-shared-desktop.png",
      "perf030-article-desktop-final-diff.png"
    ),
  },
  {
    profile: "mobile-dark",
    ...compare(
      "perf030-home-full-dark.png",
      "perf030-home-shared-dark.png",
      "perf030-home-dark-final-diff.png"
    ),
  },
  {
    profile: "mobile-dark",
    ...compare(
      "perf030-article-full-dark.png",
      "perf030-article-shared-dark.png",
      "perf030-article-dark-final-diff.png"
    ),
  },
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      profile: {
        viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
        colorScheme: "light",
        state: "top viewport after load; localStorage theme=light",
      },
      comparisons,
      responsiveChecks,
      discardedCandidate: {
        ...discardedCandidate,
        cause:
          "The first pruning universe omitted html/body class attributes and removed the generated font-variable selector.",
        resolution:
          "Include the html and body class attributes before selector pruning, then recapture.",
      },
      limitations: [
        "Production/full/route-pruned/shared parity covers the loaded light mobile top viewport; shared/full parity additionally covers light desktop and dark mobile top viewports.",
        "These sampled top viewports do not replace full-page visual regression across every breakpoint and state.",
        "Raw screenshots and diff images are intentionally not committed.",
      ],
    },
    null,
    2
  )}\n`
);

console.table(
  comparisons.map((entry) => ({
    reference: entry.reference,
    candidate: entry.candidate,
    "affected pixels": entry.affectedPixels,
    "affected %": entry.affectedPercent,
  }))
);
console.log(
  "Discarded first pruning attempt:",
  discardedCandidate.affectedPixels,
  `pixels (${discardedCandidate.affectedPercent}%)`
);
