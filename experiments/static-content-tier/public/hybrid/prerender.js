const root = document.documentElement;
const policy = root.dataset.perf031Policy;
const requestedDwellMs = Number(root.dataset.perf032DwellMs);
const dwellMs =
  policy === "dwell" ? (Number.isFinite(requestedDwellMs) ? requestedDwellMs : 150) : 0;
const stagedPolicy = ["keep", "cancel", "adaptive"].includes(root.dataset.perf033Policy)
  ? root.dataset.perf033Policy
  : "";
const requestedCommitCancelBeforeMs = Number(root.dataset.perf033CancelBeforeMs);
const commitCancelBeforeMs =
  ["cancel", "adaptive"].includes(stagedPolicy) && Number.isFinite(requestedCommitCancelBeforeMs)
    ? requestedCommitCancelBeforeMs
    : 250;
const promotionGate = ["complete", "settled"].includes(root.dataset.perf034Promotion)
  ? root.dataset.perf034Promotion
  : "";
const requestedPromotionSettleMs = Number(root.dataset.perf034SettleMs);
const promotionSettleMs =
  promotionGate === "settled" && Number.isFinite(requestedPromotionSettleMs)
    ? requestedPromotionSettleMs
    : 0;
const supportsSpeculationRules = Boolean(HTMLScriptElement.supports?.("speculationrules"));
const states = new Map();
const touchPrefetched = new Set();
const stagedPrefetched = new Map();
let started = 0;
let cancelled = 0;
let fallbacks = 0;
let touchPrefetches = 0;
let stagedPrefetches = 0;
let promotions = 0;
let commitRuleRemovals = 0;
let commitKeeps = 0;
let commitsWithoutPromotion = 0;
let promotionGateDeferrals = 0;

root.dataset.perf031Supported = String(supportsSpeculationRules);
root.dataset.perf032AppliedDwellMs = String(dwellMs);
root.dataset.perf033AppliedPolicy = stagedPolicy || "dwell-only";
root.dataset.perf033AppliedCancelBeforeMs = String(
  ["cancel", "adaptive"].includes(stagedPolicy) ? commitCancelBeforeMs : 0
);
root.dataset.perf034AppliedPromotion = promotionGate || "eager";
root.dataset.perf034AppliedSettleMs = String(promotionSettleMs);
root.dataset.perf031Lifecycle = document.prerendering ? "prerendering" : "active";
root.dataset.perf031ActivationStart = String(
  performance.getEntriesByType("navigation")[0]?.activationStart ?? 0
);
if (document.prerendering) {
  document.addEventListener(
    "prerenderingchange",
    () => {
      root.dataset.perf031Lifecycle = "activated";
      root.dataset.perf031ActivationStart = String(
        performance.getEntriesByType("navigation")[0]?.activationStart ?? 0
      );
    },
    { once: true }
  );
}

function updateCounters() {
  root.dataset.perf031Started = String(started);
  root.dataset.perf031Cancelled = String(cancelled);
  root.dataset.perf031Fallbacks = String(fallbacks);
  root.dataset.perf032TouchPrefetches = String(touchPrefetches);
  root.dataset.perf033StagedPrefetches = String(stagedPrefetches);
  root.dataset.perf033Promotions = String(promotions);
  root.dataset.perf033CommitRuleRemovals = String(commitRuleRemovals);
  root.dataset.perf033CommitKeeps = String(commitKeeps);
  root.dataset.perf033CommitsWithoutPromotion = String(commitsWithoutPromotion);
  root.dataset.perf034PromotionGateDeferrals = String(promotionGateDeferrals);
}

function candidate(event) {
  const link = event.target.closest?.("a[data-prerender-on-intent]");
  if (!(link instanceof HTMLAnchorElement)) return;
  const url = new URL(link.href, location.href);
  if (
    url.origin !== location.origin ||
    url.pathname === location.pathname ||
    !url.pathname.startsWith(`/hybrid/${root.dataset.perf030Variant}/`)
  )
    return;
  return { link, url };
}

function stateFor(link, url) {
  if (!states.has(link)) {
    states.set(link, {
      url,
      timer: undefined,
      prefetch: undefined,
      speculation: undefined,
      promotedAt: undefined,
      dwellReady: false,
      gateDeferred: false,
      committed: false,
    });
  }
  return states.get(link);
}

function start(link, url, promotion = false) {
  const state = stateFor(link, url);
  state.timer = undefined;
  if (state.speculation || state.committed) return;

  if (supportsSpeculationRules) {
    const rule = document.createElement("script");
    rule.type = "speculationrules";
    rule.textContent = JSON.stringify({
      prerender: [{ urls: [url.href], eagerness: "immediate" }],
    });
    rule.dataset.perf031Rule = url.pathname;
    document.head.append(rule);
    state.speculation = rule;
    if (promotion) {
      state.promotedAt = performance.now();
      promotions += 1;
    }
  } else {
    if (state.prefetch) return;
    const hint = document.createElement("link");
    hint.rel = "prefetch";
    hint.href = url.href;
    hint.as = "document";
    hint.dataset.perf031Fallback = url.pathname;
    document.head.append(hint);
    state.speculation = hint;
    fallbacks += 1;
  }
  started += 1;
  updateCounters();
}

function begin(link, url) {
  const state = stateFor(link, url);
  if (stagedPolicy) prefetchForStage(state, url);
  if (state.timer || state.speculation || state.committed) return;
  if (!promotionGate) {
    if (dwellMs === 0) start(link, url, Boolean(stagedPolicy));
    else state.timer = setTimeout(() => start(link, url, Boolean(stagedPolicy)), dwellMs);
    return;
  }
  if (dwellMs === 0) {
    state.dwellReady = true;
    scheduleGatedPromotion(link, state);
  } else {
    state.timer = setTimeout(() => {
      state.timer = undefined;
      state.dwellReady = true;
      scheduleGatedPromotion(link, state);
    }, dwellMs);
  }
}

function markGateDeferral(state) {
  if (state.gateDeferred) return;
  state.gateDeferred = true;
  promotionGateDeferrals += 1;
  updateCounters();
}

function scheduleGatedPromotion(link, state) {
  if (!promotionGate || !state.dwellReady || state.speculation || state.committed) return;
  if (!state.prefetch?.completedAt) {
    markGateDeferral(state);
    return;
  }
  const readyAt =
    promotionGate === "settled"
      ? state.prefetch.completedAt + promotionSettleMs
      : state.prefetch.completedAt;
  const remainingMs = Math.max(0, readyAt - performance.now());
  if (remainingMs > 0) {
    markGateDeferral(state);
    state.timer = setTimeout(() => start(link, state.url, true), remainingMs);
    return;
  }
  start(link, state.url, true);
}

function cancel(link) {
  const state = states.get(link);
  if (!state || state.committed) return;
  if (state.timer) clearTimeout(state.timer);
  const didStart = Boolean(state.speculation);
  state.speculation?.remove();
  states.delete(link);
  if (didStart) cancelled += 1;
  updateCounters();
}

function prefetchForTouch(url) {
  if (touchPrefetched.has(url.href)) return;
  const hint = document.createElement("link");
  hint.rel = "prefetch";
  hint.href = url.href;
  hint.as = "document";
  hint.dataset.perf032TouchPrefetch = url.pathname;
  document.head.append(hint);
  touchPrefetched.add(url.href);
  touchPrefetches += 1;
  updateCounters();
}

function prefetchForStage(state, url) {
  if (stagedPrefetched.has(url.href)) {
    state.prefetch = stagedPrefetched.get(url.href);
    return;
  }
  const hint = document.createElement("link");
  hint.rel = "prefetch";
  hint.href = url.href;
  hint.as = "document";
  hint.dataset.perf033StagedPrefetch = url.pathname;
  const prefetch = { hint, completedAt: undefined };
  hint.addEventListener(
    "load",
    () => {
      prefetch.completedAt = performance.now();
      root.dataset.perf033PrefetchCompletedAt = String(prefetch.completedAt);
      for (const [waitingLink, waitingState] of states) {
        if (waitingState.prefetch === prefetch) scheduleGatedPromotion(waitingLink, waitingState);
      }
    },
    { once: true }
  );
  stagedPrefetched.set(url.href, prefetch);
  state.prefetch = prefetch;
  document.head.append(hint);
  stagedPrefetches += 1;
  updateCounters();
}

document.addEventListener(
  "pointerover",
  (event) => {
    if (event.pointerType === "touch") return;
    const target = candidate(event);
    if (!target || target.link.contains(event.relatedTarget)) return;
    begin(target.link, target.url);
  },
  { passive: true }
);
document.addEventListener(
  "pointerout",
  (event) => {
    if (event.pointerType === "touch") return;
    const target = candidate(event);
    if (!target || target.link.contains(event.relatedTarget)) return;
    cancel(target.link);
  },
  { passive: true }
);
document.addEventListener("focusin", (event) => {
  const target = candidate(event);
  if (target) begin(target.link, target.url);
});
document.addEventListener("focusout", (event) => {
  const target = candidate(event);
  if (target && !target.link.contains(event.relatedTarget)) cancel(target.link);
});
document.addEventListener(
  "touchstart",
  (event) => {
    const target = candidate(event);
    if (!target) return;
    prefetchForTouch(target.url);
  },
  { passive: true }
);
document.addEventListener(
  "click",
  (event) => {
    const target = candidate(event);
    if (!target) return;
    const state = stateFor(target.link, target.url);
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = undefined;
    }
    if (stagedPolicy) {
      const prerenderAge = state.promotedAt ? Math.max(0, performance.now() - state.promotedAt) : 0;
      const prefetchCompletionAge = state.prefetch?.completedAt
        ? Math.max(0, performance.now() - state.prefetch.completedAt)
        : 0;
      root.dataset.perf033CommitPrerenderAge = String(prerenderAge);
      root.dataset.perf033CommitPrefetchCompletionAge = String(prefetchCompletionAge);
      const shouldRemove =
        stagedPolicy === "cancel"
          ? prerenderAge < commitCancelBeforeMs
          : stagedPolicy === "adaptive" &&
            (!state.prefetch?.completedAt || prefetchCompletionAge < commitCancelBeforeMs);
      if (state.speculation && shouldRemove) {
        state.speculation.remove();
        state.speculation = undefined;
        commitRuleRemovals += 1;
      } else if (state.speculation) commitKeeps += 1;
      else commitsWithoutPromotion += 1;
      updateCounters();
    }
    state.committed = true;
  },
  { capture: true }
);
addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  for (const state of states.values()) {
    if (state.timer) clearTimeout(state.timer);
    state.speculation?.remove();
  }
  states.clear();
});

updateCounters();
