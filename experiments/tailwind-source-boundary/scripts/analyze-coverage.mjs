import { readFile, writeFile } from 'node:fs/promises';
import postcss from 'postcss';
const out = 'experiments/tailwind-source-boundary/results';
const input = JSON.parse(await readFile(`${out}/coverage.json`, 'utf8'));
const sheets = JSON.parse(await readFile(`${out}/coverage-stylesheets.json`, 'utf8'));
const rows = input.rows.map(row => ({ ...row, css: row.css.map(sheet => {
  const text = sheets[sheet.path]; const root = postcss.parse(text);
  const ranges = new Set(sheet.usedRanges.map(([s,e]) => `${s}:${e}`));
  const rules = []; root.walkRules(rule => {
    const start = rule.source.start.offset, end = rule.source.end.offset;
    if (ranges.has(`${start}:${end}`)) rules.push({ start, end, selector: rule.selector, bytes: Buffer.byteLength(text.slice(start,end)) });
  });
  // Group-rule ranges returned by CDP begin at the layer name, not a CSS rule.
  // Intersect exact AST rule offsets; never sum enclosing @layer ranges.
  return { ...sheet, naiveOverlappingBytes: sheet.usedRuleBytes, usedRuleBytes: rules.reduce((n,r) => n+r.bytes,0), matchedRules: rules.length, rules,
    excludedGroupRanges: sheet.usedRanges.length - rules.length };
}) }));
await writeFile(`${out}/coverage-analysis.json`, JSON.stringify({ browser: input.browser, method: 'Exact PostCSS style-rule offset intersection excludes overlapping layer/group ranges; matched anywhere in document, not proof of paint criticality.', rows }, null, 2) + '\n');
console.log(rows.map(r => ({ profile:r.profile, route:r.route, state:r.state, used:r.css[0]?.usedRuleBytes, percent: +(100*r.css[0]?.usedRuleBytes/r.css[0]?.totalBytes).toFixed(1), rules:r.css[0]?.matchedRules })));
