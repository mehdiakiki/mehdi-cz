const params = new URLSearchParams(location.search);
const hoverMs = Number(params.get("hover-ms") || 1_000);
const startMs = Number(params.get("start-ms") || 500);
const settleMs = Number(params.get("settle-ms") || 750);
const action = params.get("action") || "navigate";
const intent = params.get("intent") || "pointer";
const target = document.querySelector(
  'a[data-prerender-on-intent][href$="/article"],a[data-prefetch-on-intent][href$="/article"]'
);

addEventListener("pageshow", (event) => {
  document.documentElement.dataset.perf031AutorunPageshowPersisted = String(event.persisted);
});

if (target) {
  const targetUrl = new URL(target.href);
  if (action === "navigate") targetUrl.searchParams.set("perf031-measure", "1");
  if (params.has("run-id")) targetUrl.searchParams.set("perf031-run", params.get("run-id"));
  const headOrder = params.get("perf037-head-order");
  if (["original", "css-first", "resources-first"].includes(headOrder)) {
    targetUrl.searchParams.set("perf037-head-order", headOrder);
  }
  const assetPolicy = params.get("perf038-cache");
  if (["mutable", "hashed-stale", "hashed-immutable"].includes(assetPolicy)) {
    targetUrl.searchParams.set("perf038-cache", assetPolicy);
  }
  const avatarSizePolicy = params.get("perf039-avatar-size");
  if (["legacy-responsive", "fixed-40"].includes(avatarSizePolicy)) {
    targetUrl.searchParams.set("perf039-avatar-size", avatarSizePolicy);
  }
  target.href = targetUrl.href;
  const recordSourceState = () => {
    const prefetchTiming = performance.getEntriesByName(target.href).at(-1);
    const value = {
      policy: document.documentElement.dataset.perf031Policy || "document-prefetch",
      intent,
      dwellMs: Number(document.documentElement.dataset.perf032AppliedDwellMs || 0),
      stagedPolicy: document.documentElement.dataset.perf033AppliedPolicy || "dwell-only",
      commitCancelBeforeMs: Number(
        document.documentElement.dataset.perf033AppliedCancelBeforeMs || 0
      ),
      started: Number(document.documentElement.dataset.perf031Started || 0),
      cancelled: Number(document.documentElement.dataset.perf031Cancelled || 0),
      touchPrefetches: Number(document.documentElement.dataset.perf032TouchPrefetches || 0),
      stagedPrefetches: Number(document.documentElement.dataset.perf033StagedPrefetches || 0),
      promotions: Number(document.documentElement.dataset.perf033Promotions || 0),
      commitRuleRemovals: Number(document.documentElement.dataset.perf033CommitRuleRemovals || 0),
      commitKeeps: Number(document.documentElement.dataset.perf033CommitKeeps || 0),
      commitsWithoutPromotion: Number(
        document.documentElement.dataset.perf033CommitsWithoutPromotion || 0
      ),
      commitPrerenderAge: Number(document.documentElement.dataset.perf033CommitPrerenderAge || 0),
      commitPrefetchCompletionAge: Number(
        document.documentElement.dataset.perf033CommitPrefetchCompletionAge || 0
      ),
      promotionGate: document.documentElement.dataset.perf034AppliedPromotion || "eager",
      promotionSettleMs: Number(document.documentElement.dataset.perf034AppliedSettleMs || 0),
      promotionGateDeferrals: Number(
        document.documentElement.dataset.perf034PromotionGateDeferrals || 0
      ),
      prefetch: prefetchTiming
        ? {
            initiatorType: prefetchTiming.initiatorType,
            duration: prefetchTiming.duration,
            transferSize: prefetchTiming.transferSize,
            encodedBodySize: prefetchTiming.encodedBodySize,
            decodedBodySize: prefetchTiming.decodedBodySize,
          }
        : null,
    };
    localStorage.setItem("perf031-source-state", JSON.stringify(value));
    document.documentElement.dataset.perf031AutorunState = JSON.stringify(value);
  };
  setTimeout(() => {
    if (intent === "focus") target.focus();
    else if (intent === "touch") {
      target.dispatchEvent(
        new PointerEvent("pointerover", {
          bubbles: true,
          pointerType: "touch",
        })
      );
      target.dispatchEvent(new Event("touchstart", { bubbles: true }));
    } else
      target.dispatchEvent(
        new PointerEvent("pointerover", {
          bubbles: true,
          pointerType: "mouse",
        })
      );
    setTimeout(() => {
      if (action === "cancel") {
        if (intent === "focus") target.blur();
        else if (intent === "pointer")
          target.dispatchEvent(
            new PointerEvent("pointerout", {
              bubbles: true,
              pointerType: "mouse",
              relatedTarget: document.body,
            })
          );
        setTimeout(recordSourceState, settleMs);
        return;
      }
      localStorage.setItem(
        "perf031-click-epoch",
        String(performance.timeOrigin + performance.now())
      );
      target.click();
      recordSourceState();
    }, hoverMs);
  }, startMs);
}
