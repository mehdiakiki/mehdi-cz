import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Cdp, routes, sleep } from '../../tailwind-source-boundary/scripts/cdp.mjs';

const outputDirectory = 'experiments/font-fallback-metrics/results';
const artifactDirectory = '.next-perf050';
const stylesheetPath = `${artifactDirectory}/static/css/ebc471532293f512.css`;
const fontPath = `${artifactDirectory}/static/media/5a0c43ffa288c21a-s.p.woff2`;
const origin = process.env.PERF056_ORIGIN || 'http://127.0.0.1:3150';
const control = {
  ascentOverride: 88.78,
  descentOverride: 26.34,
  lineGapOverride: 0,
  sizeAdjust: 110.84,
};

const sha256 = value => createHash('sha256').update(value).digest('hex');
const round = (value, digits = 6) => Number(value.toFixed(digits));

const collectExpression = `async () => {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.fontKerning = 'normal';
  const viewport = { width: innerWidth, height: innerHeight };
  const specimens = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement;
    if (!element || element.closest('script,style,svg,canvas,noscript,[hidden]')) continue;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) continue;
    if (!style.fontFamily.includes('space_grotesk')) continue;
    const text = node.textContent.replace(/\\s+/g, ' ').trim();
    if (!text) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()];
    if (!rects.some(rect => rect.width && rect.height && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth)) continue;
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = style.fontWeight;
    const fontStyle = style.fontStyle;
    const fontStretch = style.fontStretch;
    const letterSpacing = style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing);
    context.font = [fontStyle, fontWeight, fontSize + 'px', 'space_grotesk'].join(' ');
    const primaryAdvance = context.measureText(text).width;
    context.font = [fontStyle, fontWeight, fontSize + 'px', 'Arial'].join(' ');
    const arialAdvance = context.measureText(text).width;
    specimens.push({
      text, fontSize, fontWeight, fontStyle, fontStretch, letterSpacing,
      primaryAdvance, arialAdvance, lineCount: rects.length,
      element: element.tagName.toLowerCase(),
    });
  }
  return { viewport, specimens };
}`;

const lineCountExpression = metrics => `async () => {
  const metrics = ${JSON.stringify(metrics)};
  const family = 'PERF056_' + String(metrics.sizeAdjust).replace('.', '_');
  const declaration = document.createElement('style');
  declaration.textContent = '@font-face{font-family:"' + family + '";src:local("Arial");font-style:normal;font-weight:1 1000;ascent-override:' + metrics.ascentOverride + '%;descent-override:' + metrics.descentOverride + '%;line-gap-override:' + metrics.lineGapOverride + '%;size-adjust:' + metrics.sizeAdjust + '%}';
  document.head.append(declaration);
  document.documentElement.style.setProperty('--font-space-grotesk', family);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const rows = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement;
    if (!element || element.closest('script,style,svg,canvas,noscript,[hidden]')) continue;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) continue;
    if (style.fontFamily !== family && !style.fontFamily.startsWith(family + ',')) continue;
    const text = node.textContent.replace(/\\s+/g, ' ').trim();
    if (!text) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    const rects = [...range.getClientRects()];
    if (!rects.some(rect => rect.width && rect.height && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth)) continue;
    const box = element.getBoundingClientRect();
    rows.push({text, element: element.tagName.toLowerCase(), lineCount: rects.length,
      box: {x: box.x, y: box.y, width: box.width, height: box.height},
      scrollWidth: element.scrollWidth, clientWidth: element.clientWidth});
  }
  document.documentElement.style.removeProperty('--font-space-grotesk');
  declaration.remove();
  return rows;
}`;

await mkdir(outputDirectory, { recursive: true });
const [stylesheet, font] = await Promise.all([readFile(stylesheetPath), readFile(fontPath)]);
const cdp = new Cdp();
await cdp.connect();
const routeRows = [];

try {
  for (const [route, pathname] of routes) {
    const page = await cdp.page('desktop', false);
    try {
      await page.navigate(origin + pathname);
      const result = await page.evaluate(`(${collectExpression})()`);
      if (!result.specimens.length) throw new Error(`No eligible specimens for ${route}`);
      routeRows.push({ route, pathname, ...result });
      console.log(`${route}: ${result.specimens.length} visible text runs`);
    } finally {
      await page.close();
    }
  }

  const grouped = new Map();
  for (const route of routeRows) for (const specimen of route.specimens) {
    const key = JSON.stringify([
      specimen.text, specimen.fontSize, specimen.fontWeight,
      specimen.fontStyle, specimen.fontStretch, specimen.letterSpacing,
    ]);
    const previous = grouped.get(key);
    if (previous) {
      previous.occurrences += 1;
      previous.routes.push(route.route);
    } else {
      grouped.set(key, { ...specimen, occurrences: 1, routes: [route.route] });
    }
  }
  const corpus = [...grouped.values()];
  const numerator = corpus.reduce((sum, row) => sum + row.occurrences * row.arialAdvance * row.primaryAdvance, 0);
  const denominator = corpus.reduce((sum, row) => sum + row.occurrences * row.arialAdvance ** 2, 0);
  const unroundedScale = numerator / denominator;
  const sizeAdjust = round(unroundedScale * 100, 2);
  const candidateScale = sizeAdjust / 100;
  const controlScale = control.sizeAdjust / 100;
  const effectiveAscent = control.ascentOverride * controlScale;
  const effectiveDescent = control.descentOverride * controlScale;
  const effectiveLineGap = control.lineGapOverride * controlScale;
  const candidate = {
    ascentOverride: round(effectiveAscent / candidateScale, 2),
    descentOverride: round(effectiveDescent / candidateScale, 2),
    lineGapOverride: round(effectiveLineGap / candidateScale, 2),
    sizeAdjust,
  };
  const score = scale => {
    const errors = corpus.map(row => ({
      ...row,
      error: row.arialAdvance * scale - row.primaryAdvance,
    }));
    const count = errors.reduce((sum, row) => sum + row.occurrences, 0);
    const squared = errors.reduce((sum, row) => sum + row.occurrences * row.error ** 2, 0);
    return {
      weightedRmse: Math.sqrt(squared / count),
      maximumAbsoluteError: Math.max(...errors.map(row => Math.abs(row.error))),
      errors,
    };
  };
  const controlScore = score(controlScale);
  const candidateScore = score(candidateScale);

  const lineCounts = [];
  for (const [route, pathname] of routes) {
    const page = await cdp.page('desktop', false);
    try {
      await page.navigate(origin + pathname);
      const primary = await page.evaluate(`(${collectExpression})()`);
      const controlFallback = await page.evaluate(`(${lineCountExpression(control)})()`);
      const candidateFallback = await page.evaluate(`(${lineCountExpression(candidate)})()`);
      lineCounts.push({ route, pathname, primary: primary.specimens, controlFallback, candidateFallback });
    } finally {
      await page.close();
    }
  }

  const lineCountChecks = lineCounts.map(row => {
    if (row.controlFallback.length !== row.candidateFallback.length) {
      return { route: row.route, aligned: false, changedLineCounts: null, extraOverflow: null };
    }
    const aligned = row.controlFallback.every((entry, index) =>
      entry.text === row.candidateFallback[index].text &&
      entry.element === row.candidateFallback[index].element);
    const changedLineCounts = aligned
      ? row.controlFallback.filter((entry, index) => entry.lineCount !== row.candidateFallback[index].lineCount).length
      : null;
    const overflowCount = entries => entries.filter(entry => entry.scrollWidth > entry.clientWidth + 1).length;
    return {
      route: row.route,
      aligned,
      changedLineCounts,
      controlOverflow: overflowCount(row.controlFallback),
      candidateOverflow: overflowCount(row.candidateFallback),
      extraOverflow: overflowCount(row.candidateFallback) > overflowCount(row.controlFallback),
    };
  });

  const result = {
    capturedAt: new Date().toISOString(), browser: cdp.version,
    artifact: {
      directory: artifactDirectory,
      stylesheet: { path: stylesheetPath, bytes: stylesheet.length, sha256: sha256(stylesheet) },
      font: { path: fontPath, bytes: font.length, sha256: sha256(font) },
    },
    method: 'Visible desktop text nodes on five fixed routes; deduplicate identical text/style specimens and minimize occurrence-weighted squared single-line glyph-advance error against unadjusted local Arial. Preserve effective vertical metrics and round CSS descriptors to two decimals.',
    formula: 'scale = sum(occurrences * ArialAdvance * primaryAdvance) / sum(occurrences * ArialAdvance^2)',
    control,
    candidate,
    eligibility: {
      requiredRmseImprovement: 0.20,
      rmseImprovement: 1 - candidateScore.weightedRmse / controlScore.weightedRmse,
      maximumErrorDidNotGrow: candidateScore.maximumAbsoluteError <= controlScore.maximumAbsoluteError,
      lineCountsPass: lineCountChecks.every(row => row.aligned && row.changedLineCounts === 0 && !row.extraOverflow),
    },
    scores: {
      control: { weightedRmse: controlScore.weightedRmse, maximumAbsoluteError: controlScore.maximumAbsoluteError },
      candidate: { weightedRmse: candidateScore.weightedRmse, maximumAbsoluteError: candidateScore.maximumAbsoluteError },
    },
    corpus,
    lineCounts,
    lineCountChecks,
    routeRows,
  };
  result.eligibility.rmsePass = result.eligibility.rmseImprovement >= result.eligibility.requiredRmseImprovement;
  result.eligibility.pass = result.eligibility.rmsePass && result.eligibility.maximumErrorDidNotGrow && result.eligibility.lineCountsPass;
  await writeFile(`${outputDirectory}/derivation.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ candidate, scores: result.scores, eligibility: result.eligibility }, null, 2));
} finally {
  cdp.close();
}
