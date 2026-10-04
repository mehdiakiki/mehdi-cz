# PERF-057 — Primary-color contrast repair

## Hypothesis

The pink `primary-500` role is suitable for accents but not ordinary light-theme text or white-on-pink controls. Moving light-theme text to `primary-700`, dark-theme text to `primary-400`, tinted-surface text to `primary-700`, and filled controls to at least `primary-600` will remove the site-wide Lighthouse contrast failure without changing layout or behavior.

## Baseline

- Browser: Chrome DevTools Lighthouse against the retained `.next-perf050` production artifact.
- Measured ratios: `primary-500`/white 3.58:1; `primary-600`/white 4.54:1; `primary-600`/`gray-50` 4.34:1; `primary-700`/`gray-50` 5.65:1.
- Representative Accessibility scores: `/` 100, `/blog` 95, `/about` 94, `/contact` 96, and `/blog/BufReader-rust` 91. The last route also has unrelated syntax-comment, heading-order, and target-size findings.

## Acceptance gates

1. Lighthouse reports no primary-color node in `color-contrast` findings on `/`, `/blog`, `/about`, `/contact`, `/blog/BufReader-rust`, `/rust`, and `/rust-failure-atlas` in light mode. Unrelated syntax colors may remain on the representative article.
2. The same representative routes report no primary-color contrast failure in dark mode.
3. Header navigation, tags, prose links, newsletter/contact controls, selected search/filter states, and tinted callouts retain visible hover/focus states.
4. A production build and focused source checks pass, and a browser trace reports CLS 0 with no new console errors.

## Decision rule

Keep the change only if all primary-color contrast findings disappear. Record unrelated accessibility findings separately instead of broadening this task.
