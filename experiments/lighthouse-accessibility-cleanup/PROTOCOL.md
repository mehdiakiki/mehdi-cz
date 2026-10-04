# PERF-058 — Remaining Lighthouse accessibility cleanup

## Hypothesis

The remaining representative Lighthouse failures come from four local causes: low-contrast Prism comments, a dark-theme inline-code color just below the threshold, 20 px-high article tags, and skipped heading ranks on About and the sampled article. Correcting those roles should take `/about` and `/blog/BufReader-rust` to 100 Accessibility in both themes without changing behavior.

## Baseline

- Production artifact: `.next-perf057`.
- `/about`: 98 Accessibility; `heading-order` fails because the page title's `h1` is followed by the author name as `h3`.
- `/blog/BufReader-rust`: 91 Accessibility; `color-contrast`, `heading-order`, and `target-size` fail.
- Prism comments measure 3.09:1 on the light code-block background and 4.33:1 in dark mode. Dark inline code measures 4.39:1. Article tags render 20 px high, and the article begins at `h3` beneath its `h1` title.

## Candidate

- Raise the muted comment color to `rgb(148, 163, 163)`, measured at 5.61:1 on the light code surface and 7.84:1 on the dark surface.
- Override dark prose inline code with `indigo-400`, measured at 6.43:1.
- Give tag links a minimum 24×24 CSS-pixel target.
- Change the About author heading to `h2` and normalize the sampled article's `h3`/`h4` hierarchy to `h2`/`h3`.

## Acceptance gates

1. Lighthouse Accessibility is 100 on `/about` and `/blog/BufReader-rust` in light and dark modes, with no `color-contrast`, `heading-order`, or `target-size` failure.
2. The tag targets measure at least 24×24 CSS pixels at the mobile breakpoint.
3. The generated content-addressed Prism asset matches its source, focused lint and source invariants pass, and the production build succeeds.
4. A final browser trace reports CLS 0, the accessibility tree retains the article structure, and no console errors appear.
