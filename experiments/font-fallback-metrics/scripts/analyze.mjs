import { readFile, writeFile } from 'node:fs/promises';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const outputDirectory = 'experiments/font-fallback-metrics/results';
const input = JSON.parse(await readFile(`${outputDirectory}/measurement.json`, 'utf8'));
const median = values => {
  const sorted = values.toSorted((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
};
let seed = 50056;
const random = () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
};
const interval = values => {
  const samples = Array.from({ length: 10000 }, () => median(values.map(() => values[Math.floor(random() * values.length)]))).sort((a, b) => a - b);
  return [samples[249], samples[9749]];
};

const groups = [];
for (const profile of [...new Set(input.rows.map(row => row.profile))]) for (const route of [...new Set(input.rows.map(row => row.route))]) {
  const rows = input.rows.filter(row => row.profile === profile && row.route === route);
  const pairs = [];
  for (const repetition of [...new Set(rows.map(row => row.repetition))]) {
    const control = rows.find(row => row.repetition === repetition && row.variant === 'control');
    const candidate = rows.find(row => row.repetition === repetition && row.variant === 'candidate');
    if (control && candidate) pairs.push({ control, candidate });
  }
  if (!pairs.length) continue;
  const metrics = {};
  for (const key of ['lcp', 'fcp', 'load', 'domContentLoaded', 'cls']) {
    const differences = pairs.map(pair => pair.candidate[key] - pair.control[key]);
    metrics[key] = {
      controlMedian: median(pairs.map(pair => pair.control[key])),
      candidateMedian: median(pairs.map(pair => pair.candidate[key])),
      pairedMedian: median(differences), bootstrap95: interval(differences),
      improved: differences.filter(value => value < 0).length,
      tied: differences.filter(value => value === 0).length,
      differences,
    };
  }
  const lcpAllowance = Math.max(32, metrics.lcp.controlMedian * 0.03);
  groups.push({
    profile, route, pairs: pairs.length, metrics,
    gates: {
      lcpAllowance,
      lcpMedianPass: metrics.lcp.pairedMedian <= lcpAllowance,
      lcpIntervalPass: metrics.lcp.bootstrap95[0] <= lcpAllowance,
      clsReduction: metrics.cls.controlMedian
        ? 1 - metrics.cls.candidateMedian / metrics.cls.controlMedian
        : metrics.cls.candidateMedian === 0 ? 1 : -Infinity,
      clsMedianPass: profile === 'mobile'
        ? metrics.cls.candidateMedian === 0
        : metrics.cls.controlMedian > 0 && metrics.cls.candidateMedian <= metrics.cls.controlMedian * 0.25,
    },
  });
}

const assets = {};
for (const variant of ['control', 'candidate']) {
  const contents = await readFile(`${outputDirectory}/assets/${variant}.css`);
  assets[variant] = {
    raw: contents.length, gzip: gzipSync(contents).length,
    brotli: brotliCompressSync(contents).length,
    sha256: createHash('sha256').update(contents).digest('hex'),
  };
}
const candidateRows = input.rows.filter(row => row.variant === 'candidate');
const fontRowsPass = input.rows.every(row => {
  const requests = row.resources.filter(resource => resource.path.endsWith('.woff2'));
  const primary = row.fontFaces.filter(face => face.family === 'space_grotesk');
  return requests.length === 1 && requests[0].transfer > 0 && row.fontsStatus === 'loaded' && row.primaryReady && primary.length === 4 && primary.every(face => face.status === 'loaded');
});
const resourceParity = groups.every(group => {
  const rows = input.rows.filter(row => row.profile === group.profile && row.route === group.route);
  const byRepetition = Map.groupBy(rows, row => row.repetition);
  return [...byRepetition.values()].every(pair => {
    const control = pair.find(row => row.variant === 'control');
    const candidate = pair.find(row => row.variant === 'candidate');
    return control.resources.length === candidate.resources.length &&
      control.resources.filter(resource => resource.path.endsWith('.woff2')).reduce((sum, resource) => sum + resource.transfer, 0) ===
      candidate.resources.filter(resource => resource.path.endsWith('.woff2')).reduce((sum, resource) => sum + resource.transfer, 0);
  });
});
const gates = {
  lcp: groups.every(group => group.gates.lcpMedianPass && group.gates.lcpIntervalPass),
  desktopCls: groups.filter(group => group.profile === 'desktop').every(group => group.gates.clsMedianPass) &&
    candidateRows.filter(row => row.profile === 'desktop').every(row => row.cls <= 0.00025),
  mobileCls: candidateRows.filter(row => row.profile === 'mobile').every(row => row.cls === 0),
  fontCompletion: fontRowsPass,
  resourceParity,
  runtime: input.rows.every(row => row.errors.length === 0 && row.heading),
};
gates.pass = Object.values(gates).every(Boolean);

const summary = {
  capturedAt: new Date().toISOString(), browser: input.browser,
  sampleCount: input.rows.length,
  method: 'Median of within-repetition candidate-minus-control deltas; 10,000 deterministic paired bootstrap resamples and percentile 95% intervals. Small lab samples, no field claim.',
  candidate: input.candidate, groups, assets, gates,
  nonzeroCls: input.rows.filter(row => row.cls > 0).map(row => ({ profile: row.profile, route: row.route, repetition: row.repetition, variant: row.variant, cls: row.cls })),
};
await writeFile(`${outputDirectory}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ groups: groups.map(group => ({
  profile: group.profile, route: group.route, pairs: group.pairs,
  lcpDelta: group.metrics.lcp.pairedMedian, lcp95: group.metrics.lcp.bootstrap95,
  controlCls: group.metrics.cls.controlMedian, candidateCls: group.metrics.cls.candidateMedian,
  clsReduction: group.gates.clsReduction,
})), assets, gates }, null, 2));

