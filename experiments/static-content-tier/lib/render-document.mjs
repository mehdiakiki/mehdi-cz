import home from "../generated/home.json" with { type: "json" };
import article from "../generated/article.json" with { type: "json" };
import cacheAssets from "../generated/cache-assets.json" with { type: "json" };

export const snapshots = { home, article };
export const contentVariants = [
  "full",
  "pruned",
  "shared",
  "prerender-immediate",
  "prerender-dwell",
];
export const headOrders = ["original", "css-first", "resources-first"];
export const assetPolicies = ["mutable", "hashed-stale", "hashed-immutable"];
export const avatarSizePolicies = ["legacy-responsive", "fixed-40"];

const legacyAvatarSizes =
  "(max-width: 640px) 100vw, (max-width: 768px) 75vw, (max-width: 1024px) 50vw, 33vw";
const fixedAvatarSizes = "40px";
const avatarSource = "%2Fstatic%2Fimages%2Fmehdi_image_enhanced_square.webp";
const avatarCandidateWidths = {
  "legacy-responsive": [256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  "fixed-40": [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
};
const avatarSizesPattern = new RegExp(
  `(image)?sizes="(?:${legacyAvatarSizes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${fixedAvatarSizes})"`,
  "g"
);
const avatarSrcsetPattern = new RegExp(`((?:image)?srcset)="[^"]*${avatarSource}[^"]*"`, "g");

const prerenderPolicies = {
  "prerender-immediate": "immediate",
  "prerender-dwell": "dwell",
};

export const themeBootstrap = `(function(){try{var t=localStorage.getItem("theme"),d=t==="dark"||t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function splitSnapshotHead(head) {
  const preamble = head.match(/^<meta charset="[^"]*"><meta name="viewport"[^>]*>/)?.[0];
  if (!preamble) throw new Error("Snapshot head does not begin with charset and viewport metadata");
  const afterPreamble = head.slice(preamble.length);
  const hints = afterPreamble.match(/^(?:<link rel="preload"[^>]*>)+/)?.[0] ?? "";
  return {
    preamble,
    hints,
    metadata: afterPreamble.slice(hints.length),
  };
}

function rewriteAssetUrls(value, assetPolicy) {
  if (assetPolicy === "mutable") return value;
  return Object.entries(cacheAssets.policies[assetPolicy]).reduce(
    (rewritten, [source, target]) => rewritten.replaceAll(source, target),
    value
  );
}

function rewriteAvatarSizes(value, avatarSizePolicy) {
  if (!avatarSizePolicy) return value;
  const sizes = avatarSizePolicy === "fixed-40" ? fixedAvatarSizes : legacyAvatarSizes;
  const candidates = avatarCandidateWidths[avatarSizePolicy]
    .map((width) => `/_next/image?url=${avatarSource}&#x26;w=${width}&#x26;q=80 ${width}w`)
    .join(", ");
  return value
    .replace(avatarSizesPattern, (_match, imagePrefix = "") => {
      return `${imagePrefix}sizes="${sizes}"`;
    })
    .replace(avatarSrcsetPattern, (_match, attribute) => `${attribute}="${candidates}"`);
}

export function renderContentDocument(
  page,
  variant,
  {
    autorun = false,
    measure = false,
    prerenderDwellMs,
    stagedPolicy,
    commitCancelBeforeMs,
    promotionGate,
    promotionSettleMs,
    headOrder = "original",
    assetPolicy = "mutable",
    avatarSizePolicy,
  } = {}
) {
  const snapshot = snapshots[page];
  if (!snapshot) throw new Error(`Unknown page: ${page}`);
  if (!contentVariants.includes(variant)) throw new Error(`Unknown variant: ${variant}`);
  if (!headOrders.includes(headOrder)) throw new Error(`Unknown head order: ${headOrder}`);
  if (!assetPolicies.includes(assetPolicy)) throw new Error(`Unknown asset policy: ${assetPolicy}`);
  if (avatarSizePolicy && !avatarSizePolicies.includes(avatarSizePolicy)) {
    throw new Error(`Unknown avatar size policy: ${avatarSizePolicy}`);
  }

  const prerenderPolicy = prerenderPolicies[variant];
  const styleVariant = prerenderPolicy ? "shared" : variant;

  const styles = snapshot.styles[styleVariant]
    .map((href) => rewriteAssetUrls(href, assetPolicy))
    .map((href) => `<link rel="stylesheet" href="${escapeAttribute(href)}">`)
    .join("");
  let body = rewriteAvatarSizes(
    rewriteAssetUrls(snapshot.body, assetPolicy),
    avatarSizePolicy
  ).replaceAll("__PERF030_VARIANT__", variant);
  if (prerenderPolicy) {
    const contentLink = new RegExp(
      `<a\\b([^>]*\\bhref="/hybrid/${variant}/(?:home|article)"[^>]*)>`,
      "g"
    );
    body = body.replace(contentLink, (tag) =>
      tag.replace(' data-prefetch-on-intent=""', ' data-prerender-on-intent=""')
    );
  }
  const htmlClass = escapeAttribute(snapshot.html.className);
  const bodyClass = escapeAttribute(snapshot.bodyClassName);
  const policyAttribute = prerenderPolicy ? ` data-perf031-policy="${prerenderPolicy}"` : "";
  const dwellAttribute =
    prerenderPolicy === "dwell" && Number.isFinite(prerenderDwellMs)
      ? ` data-perf032-dwell-ms="${escapeAttribute(prerenderDwellMs)}"`
      : "";
  const stagedPolicyAttribute =
    prerenderPolicy === "dwell" && ["keep", "cancel", "adaptive"].includes(stagedPolicy)
      ? ` data-perf033-policy="${escapeAttribute(stagedPolicy)}"`
      : "";
  const commitCancelAttribute =
    prerenderPolicy === "dwell" &&
    ["cancel", "adaptive"].includes(stagedPolicy) &&
    Number.isFinite(commitCancelBeforeMs)
      ? ` data-perf033-cancel-before-ms="${escapeAttribute(commitCancelBeforeMs)}"`
      : "";
  const appliedPromotionGate =
    prerenderPolicy === "dwell" &&
    stagedPolicy === "adaptive" &&
    (promotionGate === "complete" ||
      (promotionGate === "settled" && Number.isFinite(promotionSettleMs)))
      ? promotionGate
      : undefined;
  const promotionGateAttribute = appliedPromotionGate
    ? ` data-perf034-promotion="${escapeAttribute(appliedPromotionGate)}"`
    : "";
  const promotionSettleAttribute =
    appliedPromotionGate === "settled"
      ? ` data-perf034-settle-ms="${escapeAttribute(promotionSettleMs)}"`
      : "";
  const policyModule = prerenderPolicy
    ? `<script type="module" src="${escapeAttribute(
        rewriteAssetUrls("/hybrid/prerender.js", assetPolicy)
      )}"></script>`
    : "";
  const autorunModule = autorun
    ? '<script type="module" src="/hybrid/prerender-autorun.js"></script>'
    : "";
  const measurementModule = measure
    ? '<script type="module" src="/hybrid/navigation-measurement.js"></script>'
    : "";
  const bootstrapModule = rewriteAssetUrls("/hybrid/bootstrap.js", assetPolicy);
  const scripts = `<script>${themeBootstrap}</script><script type="module" src="${escapeAttribute(bootstrapModule)}"></script>${policyModule}${autorunModule}${measurementModule}`;
  const snapshotHead = rewriteAvatarSizes(
    rewriteAssetUrls(snapshot.head, assetPolicy),
    avatarSizePolicy
  );
  let head = `${snapshotHead}${styles}${scripts}`;
  if (headOrder !== "original") {
    const split = splitSnapshotHead(snapshotHead);
    head =
      headOrder === "css-first"
        ? `${split.preamble}${split.hints}${styles}${split.metadata}${scripts}`
        : `${split.preamble}${split.hints}${styles}${scripts}${split.metadata}`;
  }

  return `<!doctype html><html lang="${escapeAttribute(snapshot.html.lang)}" class="${htmlClass}" data-perf030-variant="${variant}"${policyAttribute}${dwellAttribute}${stagedPolicyAttribute}${commitCancelAttribute}${promotionGateAttribute}${promotionSettleAttribute}><head>${head}</head><body class="${bodyClass}">${body}</body></html>`;
}
