import { readFile, writeFile } from 'node:fs/promises';
import { Cdp, routes } from '../../tailwind-source-boundary/scripts/cdp.mjs';

const outputDirectory = 'experiments/font-fallback-metrics/results';
const origin = process.env.PERF056_ORIGIN || 'http://127.0.0.1:3150';
const sizeStart = Number(process.env.PERF056_SIZE_START || 90);
const sizeEnd = Number(process.env.PERF056_SIZE_END || 115);
const sizeStep = Number(process.env.PERF056_SIZE_STEP || 0.25);
const localSources = (process.env.PERF056_LOCAL_SOURCES || 'Arial,Liberation Sans').split(',');
const metricMode = process.env.PERF056_METRIC_MODE || 'preserve-space-grotesk';
const fontTopology = process.env.PERF056_FONT_TOPOLOGY || 'single';
const resultName = process.env.PERF056_RESULT_NAME || 'geometry-fallback-derivation.json';
const tieTarget = Number(process.env.PERF056_TIE_TARGET || 110.84);
const sizes = Array.from(
  { length: Math.round((sizeEnd - sizeStart) / sizeStep) + 1 },
  (_, index) => Number((sizeStart + index * sizeStep).toFixed(2)),
);
const effective = {
  ascent: 88.78 * 1.1084,
  descent: 26.34 * 1.1084,
  lineGap: 0,
};
const metricsForSize = sizeAdjust => metricMode === 'native'
  ? { sizeAdjust }
  : {
      ascentOverride: Number((effective.ascent / (sizeAdjust / 100)).toFixed(2)),
      descentOverride: Number((effective.descent / (sizeAdjust / 100)).toFixed(2)),
      lineGapOverride: 0,
      sizeAdjust,
    };

const searchExpression = `async () => {
  await document.fonts.ready;
  const sizes = ${JSON.stringify(sizes)};
  const effective = ${JSON.stringify(effective)};
  const localSources = ${JSON.stringify(localSources)};
  const metricMode = ${JSON.stringify(metricMode)};
  const fontTopology = ${JSON.stringify(fontTopology)};
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
        left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom,
        lineCount: rects.length, overflow: element.scrollWidth > element.clientWidth + 1 });
    }
    return rows;
  };
  const score = (primary, fallback) => {
    const byIndex = new Map(fallback.map(row => [row.nodeIndex, row]));
    let squared = 0, dimensions = 0, aligned = 0, changedLineCounts = 0, addedOverflow = 0;
    for (const expected of primary) {
      const actual = byIndex.get(expected.nodeIndex);
      if (!actual || actual.text !== expected.text || actual.tag !== expected.tag) continue;
      squared += (actual.left - expected.left) ** 2 + (actual.top - expected.top) ** 2 +
        (actual.right - expected.right) ** 2 + (actual.bottom - expected.bottom) ** 2;
      dimensions += 4; aligned += 1;
      if (actual.lineCount !== expected.lineCount) changedLineCounts += 1;
      if (actual.overflow && !expected.overflow) addedOverflow += 1;
    }
    return { squared, dimensions, rmse: Math.sqrt(squared / dimensions), eligible: primary.length,
      aligned, changedLineCounts, addedOverflow };
  };

  const primary = snapshot(false);
  for (const row of primary) eligible.set(row.nodeIndex, row);
  document.documentElement.style.setProperty('--font-space-grotesk', 'system-ui');
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const control = score(primary, snapshot(true));
  document.documentElement.style.removeProperty('--font-space-grotesk');

  const trials = [];
  for (const sizeAdjust of sizes) {
    const metrics = metricMode === 'native' ? { sizeAdjust } : {
      ascentOverride: Number((effective.ascent / (sizeAdjust / 100)).toFixed(2)),
      descentOverride: Number((effective.descent / (sizeAdjust / 100)).toFixed(2)),
      lineGapOverride: 0, sizeAdjust,
    };
    const family = 'PERF056C_' + String(sizeAdjust).replace('.', '_');
    const declaration = document.createElement('style');
    const source = localSources.map(name => 'local("' + name + '")').join(',');
    const vertical = metricMode === 'native' ? '' : 'ascent-override:' + metrics.ascentOverride.toFixed(2) + '%;descent-override:' + metrics.descentOverride.toFixed(2) + '%;line-gap-override:0.00%;';
    const weightedFaces = [
      ['400', 'Noto Sans Regular'], ['500', 'Noto Sans Medium'],
      ['600 700', 'Noto Sans Bold'], ['800 900', 'Noto Sans Black'],
    ];
    declaration.textContent = fontTopology === 'noto-weighted'
      ? weightedFaces.map(([weight, name]) => '@font-face{font-family:"' + family + '";src:local("' + name + '");font-weight:' + weight + ';size-adjust:' + metrics.sizeAdjust.toFixed(2) + '%}').join('')
      : '@font-face{font-family:"' + family + '";src:' + source + ';' + vertical + 'size-adjust:' + metrics.sizeAdjust.toFixed(2) + '%}';
    document.head.append(declaration);
    document.documentElement.style.setProperty('--font-space-grotesk', family);
    if (fontTopology === 'noto-weighted') {
      for (const weight of [400, 500, 600, 700, 800]) await document.fonts.load(weight + ' 16px "' + family + '"');
    } else await document.fonts.load('400 16px "' + family + '"');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const trial = score(primary, snapshot(true));
    const faces = [...document.fonts].filter(item => item.family === family);
    trials.push({ ...trial, metrics, faceStatus: faces.length && faces.every(face => face.status === 'loaded') ? 'loaded' : faces.map(face => face.status).join(',') || null });
    document.documentElement.style.removeProperty('--font-space-grotesk');
    declaration.remove();
  }
  return { primary, control, trials };
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
      console.log(`${route}: control RMSE ${result.control.rmse.toFixed(3)}, ${result.primary.length} specimens x ${result.trials.length} sizes`);
    } finally {
      await page.close();
    }
  }
} finally {
  cdp.close();
}

const candidates = sizes.map(sizeAdjust => {
  const routeScores = routeResults.map(route => ({
    route: route.route,
    ...route.trials.find(trial => trial.metrics.sizeAdjust === sizeAdjust),
  }));
  const squared = routeScores.reduce((sum, score) => sum + score.squared, 0);
  const dimensions = routeScores.reduce((sum, score) => sum + score.dimensions, 0);
  return {
    metrics: metricsForSize(sizeAdjust),
    maximumRouteRmse: Math.max(...routeScores.map(score => score.rmse)),
    pooledRmse: Math.sqrt(squared / dimensions), squared, dimensions,
    changedLineCounts: routeScores.reduce((sum, score) => sum + score.changedLineCounts, 0),
    addedOverflow: routeScores.reduce((sum, score) => sum + score.addedOverflow, 0),
    allFacesLoaded: routeScores.every(score => score.faceStatus === 'loaded'),
    routeScores,
  };
});
const controlSquared = routeResults.reduce((sum, route) => sum + route.control.squared, 0);
const controlDimensions = routeResults.reduce((sum, route) => sum + route.control.dimensions, 0);
const control = {
  family: 'system-ui',
  maximumRouteRmse: Math.max(...routeResults.map(route => route.control.rmse)),
  pooledRmse: Math.sqrt(controlSquared / controlDimensions),
  squared: controlSquared, dimensions: controlDimensions,
  routeScores: routeResults.map(route => ({ route: route.route, ...route.control })),
};
const eligibleCandidates = candidates.filter(candidate =>
  candidate.changedLineCounts === 0 && candidate.addedOverflow === 0 && candidate.allFacesLoaded);
const compareCandidates = (left, right) =>
  left.maximumRouteRmse - right.maximumRouteRmse ||
  left.squared - right.squared ||
  Math.abs(left.metrics.sizeAdjust - tieTarget) - Math.abs(right.metrics.sizeAdjust - tieTarget) ||
  left.metrics.sizeAdjust - right.metrics.sizeAdjust;
const winner = eligibleCandidates.toSorted(compareCandidates)[0];
if (!winner) throw new Error('No candidate preserved line counts and overflow');
const identity = candidates.find(candidate => candidate.metrics.sizeAdjust === tieTarget);
const identityStatePass = Boolean(identity && identity.routeScores.every(identityRoute => {
  const controlRoute = control.routeScores.find(route => route.route === identityRoute.route);
  return identityRoute.changedLineCounts === controlRoute.changedLineCounts &&
    identityRoute.addedOverflow === controlRoute.addedOverflow;
}));
const identityPass = metricMode !== 'native' || Boolean(identity &&
  Math.abs(identity.maximumRouteRmse - control.maximumRouteRmse) <= 0.01 &&
  Math.abs(identity.pooledRmse - control.pooledRmse) <= 0.01 && identityStatePass);
const everyRouteNoWorse = winner.routeScores.every(candidateRoute => {
  const controlRoute = control.routeScores.find(route => route.route === candidateRoute.route);
  return candidateRoute.rmse <= controlRoute.rmse;
});
const eligibility = {
  requiredImprovement: 0.50,
  maximumRouteRmseImprovement: 1 - winner.maximumRouteRmse / control.maximumRouteRmse,
  pooledRmseImprovement: 1 - winner.pooledRmse / control.pooledRmse,
  everyRouteNoWorse,
  lineCountsPass: winner.changedLineCounts === 0,
  overflowPass: winner.addedOverflow === 0,
  facesLoaded: winner.allFacesLoaded,
  identityStatePass,
  identityPass,
};
eligibility.pass = eligibility.maximumRouteRmseImprovement >= eligibility.requiredImprovement &&
  eligibility.pooledRmseImprovement >= eligibility.requiredImprovement && eligibility.identityPass &&
  eligibility.everyRouteNoWorse && eligibility.lineCountsPass && eligibility.overflowPass && eligibility.facesLoaded;

const prior = JSON.parse(await readFile(`${outputDirectory}/available-fallback-derivation.json`, 'utf8'));
const result = {
  capturedAt: new Date().toISOString(), browser: prior.browser,
  method: `Fixed ${sizeStart}..${sizeEnd} size-adjust sweep in ${sizeStep}-point steps using ${metricMode} vertical metrics. Discard line-count/overflow failures, then minimize maximum per-route primary-vs-fallback left/top/right/bottom RMSE across five routes.`,
  localSources, metricMode, fontTopology, sizeRange: { start: sizeStart, end: sizeEnd, step: sizeStep }, tieTarget, effectiveMetrics: effective,
  control, identity, winner, eligibility, candidates, routeResults,
};
await writeFile(`${outputDirectory}/${resultName}`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ control, winner, eligibility }, null, 2));
