# Chrome DevTools pull-request draft: isolate forced-reflow attribution by thread

Base: `ChromeDevTools/devtools-frontend@2a5562dea4bfa759c15700d2311fc623c1b684d1`

## Title

`fix(trace): keep forced-reflow invocation stacks per thread`

## Summary

- Key nested-event, JavaScript-invocation, and task-reflow state by process and thread.
- Prevent background V8 parsing from making unrelated main-thread style and layout look JavaScript-forced.
- Add a focused regression test while retaining the existing genuine forced-reflow fixture.

## Reproduction

`WarningsHandler` currently keeps one `allEventsStack`, `jsInvokeStack`, and `taskReflowEvents` for the complete trace. `isJSInvocationEvent` intentionally accepts every event whose name starts with `v8` or `V8`. If `v8.parseOnBackground` spans `UpdateLayoutTree` and `Layout` on the renderer main thread, the global invocation stack is non-empty and both rendering events enter `taskReflowEvents` even though they have a different `tid` and no JavaScript ancestor.

The attached test reduces the ordering to five complete events. On the current handler it reports 37 ms of forced reflow. With state keyed by `pid:tid`, it reports none. The existing `large-layout-small-recalc.json.gz` test continues to cover genuine style and layout nested beneath same-thread JavaScript.

An independent executable version of both algorithms lives in `experiments/devtools-forced-reflow-attribution/` in the originating performance case study. It has a second explicit control proving that the per-thread model retains a genuine 37 ms same-thread warning.

## Production evidence

A clean, single-target Chromium trace of a Next.js 16.3.4 page reported 37 ms of unattributed forced reflow: 11.264 ms in `UpdateLayoutTree` and 25.780 ms in `Layout`. Both occurred on renderer thread 1 without a JavaScript ancestor. At the same timestamps, `v8.parseOnBackground` events lasting 130.188 and 132.300 ms were active on threads 12 and 13. A long article reproduced the same shape with 62 ms reported as unattributed.

These values establish the original symptom but are not claimed as page savings. The patch changes trace attribution only; it does not remove browser rendering work.

## Validation

Local framework-independent proof:

```text
node --test experiments/devtools-forced-reflow-attribution/reproduction.test.mjs
tests 2
pass 2
fail 0

crossThreadBackgroundParse
current:  2 events, 37,000 us
proposed: 0 events,      0 us

sameThreadJavaScript
current:  2 events, 37,000 us
proposed: 2 events, 37,000 us
```

The submission-ready DevTools diff is stored beside this draft as `chrome-devtools-forced-reflow-thread-attribution.patch`. It still needs to be applied and run in a DevTools checkout before submission.
