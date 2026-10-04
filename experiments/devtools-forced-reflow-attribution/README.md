# Chrome DevTools forced-reflow thread-attribution reproduction

This framework-independent fixture preserves a false forced-reflow attribution found while tracing a Next.js 16.3.4 production site. Chrome's trace contains ordinary main-thread `UpdateLayoutTree` and `Layout` work while `v8.parseOnBackground` runs on V8 helper threads. The site trace contains no JavaScript ancestor for either main-thread rendering event.

The current DevTools warning handler nevertheless reports both events as forced. Its JavaScript-invocation and event stacks are global, so a `v8*` event on one thread can make rendering work on another thread appear to occur inside JavaScript.

The proposed model keys all three pieces of task state by process and thread. The control scenario proves that it still reports style and layout genuinely nested beneath a same-thread `FunctionCall`.

## Run

```bash
node --test experiments/devtools-forced-reflow-attribution/reproduction.test.mjs
node experiments/devtools-forced-reflow-attribution/report.mjs
```

Expected report:

```text
crossThreadBackgroundParse: {"current":{"count":2,"durationUs":37000,"names":["UpdateLayoutTree","Layout"]},"proposed":{"count":0,"durationUs":0,"names":[]}}
sameThreadJavaScript: {"current":{"count":2,"durationUs":37000,"names":["UpdateLayoutTree","Layout"]},"proposed":{"count":2,"durationUs":37000,"names":["UpdateLayoutTree","Layout"]}}
```

The fixture deliberately uses synthetic timestamps and identifiers. The production trace evidence and exact measured durations are kept in a private investigation log; no user trace, URL, or application bundle is required to reproduce the handler defect.

The submission-ready DevTools diff and issue/PR draft are in `docs/upstream/`. This experiment is evidence for a tooling attribution fix, not evidence that initial browser layout is free or that the site improved by 37 ms.
