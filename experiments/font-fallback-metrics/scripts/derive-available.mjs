import { readFile, writeFile } from 'node:fs/promises';
import { Cdp, routes } from '../../tailwind-source-boundary/scripts/cdp.mjs';

const outputDirectory = 'experiments/font-fallback-metrics/results';
const origin = process.env.PERF056_ORIGIN || 'http://127.0.0.1:3150';
const base = { ascentOverride: 91.67, descentOverride: 27.20, lineGapOverride: 0, sizeAdjust: 107.35 };
const derivationRoutes = new Set(['home', 'prose', 'atlas']);
const deltas = Array.from({ length: 97 }, (_, index) => Number((-12 + index * 0.25).toFixed(2)));

const searchExpression = `async () => {
  await document.fonts.ready;
  const deltas = ${JSON.stringify(deltas)};
  const base = ${JSON.stringify(base)};
  const eligible = new Map();
  const snapshot = onlyEligible => {
    const rows = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let nodeIndex = -1;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      nodeIndex += 1;
      const element = node.parentElement;
      if (!element || element.closest('script,style,svg,canvas,noscript,[hidden]')) continue;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) continue;
      const text = node.textContent.replace(/\\s+/g, ' ').trim();
      if (!text) continue;
      if (!onlyEligible && !style.fontFamily.includes('space_grotesk')) continue;
      if (onlyEligible && !eligible.has(nodeIndex)) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      const rects = [...range.getClientRects()];
      if (!rects.length) continue;
      const bounds = range.getBoundingClientRect();
      if (!onlyEligible && !rects.some(rect => rect.width && rect.height && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth)) continue;
      rows.push({ nodeIndex, text, tag: element.tagName.toLowerCase(),
        top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right,
        width: bounds.width, height: bounds.height, lineCount: rects.length,
        overflow: element.scrollWidth > element.clientWidth + 1 });
    }
    return rows;
  };
  const primary = snapshot(false);
  for (const row of primary) eligible.set(row.nodeIndex, row);
  const trials = [];
  for (const delta of deltas) {
    const family = 'PERF056B_' + String(delta).replace('-', 'n').replace('.', '_');
    const declaration = document.createElement('style');
    declaration.textContent = '@font-face{font-family:"' + family + '";src:local("Arial"),local("Liberation Sans");ascent-override:' + (base.ascentOverride + delta) + '%;descent-override:' + (base.descentOverride - delta) + '%;line-gap-override:0%;size-adjust:' + base.sizeAdjust + '%}';
    document.head.append(declaration);
    document.documentElement.style.setProperty('--font-space-grotesk', family);
    await document.fonts.load('400 16px "' + family + '"');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const fallback = snapshot(true);
    const byIndex = new Map(fallback.map(row => [row.nodeIndex, row]));
    let squared = 0, dimensions = 0, changedLineCounts = 0, addedOverflow = 0, aligned = 0;
    for (const expected of primary) {
      const actual = byIndex.get(expected.nodeIndex);
      if (!actual || actual.text !== expected.text || actual.tag !== expected.tag) continue;
      squared += (actual.top - expected.top) ** 2 + (actual.bottom - expected.bottom) ** 2;
      dimensions += 2; aligned += 1;
      if (actual.lineCount !== expected.lineCount) changedLineCounts += 1;
      if (actual.overflow && !expected.overflow) addedOverflow += 1;
    }
    const face = [...document.fonts].find(item => item.family === family);
    trials.push({ delta, squared, dimensions, rmse: Math.sqrt(squared / dimensions),
      eligible: primary.length, aligned, changedLineCounts, addedOverflow,
      faceStatus: face?.status || null });
    document.documentElement.style.removeProperty('--font-space-grotesk');
    declaration.remove();
  }
  return { primary, trials };
}`;

const cdp = new Cdp();
await cdp.connect();
const routeResults = [];
try {
  for (const [route, pathname] of routes) {
    const page = await cdp.page('desktop', false);
    try {
      await page.navigate(origin + pathname);
      const result = await page.evaluate(`(${searchExpression})()`);
      routeResults.push({ route, pathname, ...result });
      console.log(`${route}: ${result.primary.length} specimens x ${result.trials.length} deltas`);
    } finally {
      await page.close();
    }
  }
} finally {
  cdp.close();
}

const aggregate = routeNames => deltas.map(delta => {
  const trials = routeResults.filter(row => routeNames.has(row.route)).map(row => row.trials.find(trial => trial.delta === delta));
  const squared = trials.reduce((sum, trial) => sum + trial.squared, 0);
  const dimensions = trials.reduce((sum, trial) => sum + trial.dimensions, 0);
  return {
    delta, squared, dimensions, rmse: Math.sqrt(squared / dimensions),
    changedLineCounts: trials.reduce((sum, trial) => sum + trial.changedLineCounts, 0),
    addedOverflow: trials.reduce((sum, trial) => sum + trial.addedOverflow, 0),
    allFacesLoaded: trials.every(trial => trial.faceStatus === 'loaded'),
  };
});
const validationRoutes = new Set(routes.map(([route]) => route).filter(route => !derivationRoutes.has(route)));
const derivationScores = aggregate(derivationRoutes);
const validationScores = aggregate(validationRoutes);
const compareTrials = (left, right) => left.rmse - right.rmse || Math.abs(left.delta) - Math.abs(right.delta) || left.delta - right.delta;
const winner = derivationScores.toSorted(compareTrials)[0];
const derivationBase = derivationScores.find(row => row.delta === 0);
const validationBase = validationScores.find(row => row.delta === 0);
const validationWinner = validationScores.find(row => row.delta === winner.delta);
const candidate = {
  ascentOverride: Number((base.ascentOverride + winner.delta).toFixed(2)),
  descentOverride: Number((base.descentOverride - winner.delta).toFixed(2)),
  lineGapOverride: base.lineGapOverride,
  sizeAdjust: base.sizeAdjust,
  delta: winner.delta,
};
const eligibility = {
  requiredRmseImprovement: 0.50,
  derivationRmseImprovement: 1 - winner.rmse / derivationBase.rmse,
  validationRmseImprovement: 1 - validationWinner.rmse / validationBase.rmse,
  lineCountsPass: winner.changedLineCounts === 0 && validationWinner.changedLineCounts === 0,
  overflowPass: winner.addedOverflow === 0 && validationWinner.addedOverflow === 0,
  facesLoaded: winner.allFacesLoaded && validationWinner.allFacesLoaded,
};
eligibility.pass = eligibility.derivationRmseImprovement >= eligibility.requiredRmseImprovement &&
  eligibility.validationRmseImprovement >= eligibility.requiredRmseImprovement &&
  eligibility.lineCountsPass && eligibility.overflowPass && eligibility.facesLoaded;

const originalDerivation = JSON.parse(await readFile(`${outputDirectory}/derivation.json`, 'utf8'));
const result = {
  capturedAt: new Date().toISOString(), browser: originalDerivation.browser,
  method: 'Fixed -12..+12 ascent delta sweep in 0.25-point steps; subtract delta from descent to preserve total vertical metrics. Minimize visible text-range top/bottom RMSE on home, prose, and Atlas; validate on writing index and code.',
  localSources: ['Arial', 'Liberation Sans'], base, candidate,
  derivationRoutes: [...derivationRoutes], validationRoutes: [...validationRoutes],
  derivationBase, derivationWinner: winner,
  validationBase, validationWinner, eligibility,
  derivationScores, validationScores, routeResults,
};
await writeFile(`${outputDirectory}/available-fallback-derivation.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ candidate, derivationBase, derivationWinner: winner, validationBase, validationWinner, eligibility }, null, 2));

