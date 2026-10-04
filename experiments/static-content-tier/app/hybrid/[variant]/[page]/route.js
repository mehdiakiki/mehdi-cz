import {
  avatarSizePolicies,
  assetPolicies,
  contentVariants,
  headOrders,
  renderContentDocument,
} from "../../../../lib/render-document.mjs";
import { compressedHtmlResponse } from "../../../../lib/respond.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const contentCacheControl = "public, max-age=60, stale-while-revalidate=86400";

export async function GET(request, { params }) {
  const { variant, page } = await params;
  if (!contentVariants.includes(variant) || !["home", "article"].includes(page)) {
    return new Response("Not found", { status: 404 });
  }
  const searchParams = new URL(request.url).searchParams;
  const autorun = searchParams.get("perf031-autorun") === "1";
  const measure = searchParams.get("perf031-measure") === "1";
  const requestedDwellMs = searchParams.has("perf032-dwell-ms")
    ? Number(searchParams.get("perf032-dwell-ms"))
    : Number.NaN;
  const prerenderDwellMs = [0, 75, 150, 250].includes(requestedDwellMs)
    ? requestedDwellMs
    : undefined;
  const requestedStagedPolicy = searchParams.get("perf033-mode");
  const stagedPolicy = ["keep", "cancel", "adaptive"].includes(requestedStagedPolicy)
    ? requestedStagedPolicy
    : undefined;
  const requestedCommitCancelBeforeMs = searchParams.has("perf033-cancel-before-ms")
    ? Number(searchParams.get("perf033-cancel-before-ms"))
    : Number.NaN;
  const commitCancelBeforeMs = [150, 250, 350, 500].includes(requestedCommitCancelBeforeMs)
    ? requestedCommitCancelBeforeMs
    : undefined;
  const requestedPromotionGate = searchParams.get("perf034-promotion");
  const promotionGate = ["complete", "settled"].includes(requestedPromotionGate)
    ? requestedPromotionGate
    : undefined;
  const requestedPromotionSettleMs = searchParams.has("perf034-settle-ms")
    ? Number(searchParams.get("perf034-settle-ms"))
    : Number.NaN;
  const promotionSettleMs = [75, 150, 250].includes(requestedPromotionSettleMs)
    ? requestedPromotionSettleMs
    : undefined;
  const requestedHeadOrder = searchParams.get("perf037-head-order");
  const headOrder =
    measure && headOrders.includes(requestedHeadOrder) ? requestedHeadOrder : undefined;
  const requestedAssetPolicy = searchParams.get("perf038-cache");
  const assetPolicy = assetPolicies.includes(requestedAssetPolicy)
    ? requestedAssetPolicy
    : undefined;
  const requestedAvatarSizePolicy = searchParams.get("perf039-avatar-size");
  const avatarSizePolicy =
    measure && avatarSizePolicies.includes(requestedAvatarSizePolicy)
      ? requestedAvatarSizePolicy
      : undefined;
  return compressedHtmlResponse(
    request,
    renderContentDocument(page, variant, {
      autorun,
      measure,
      prerenderDwellMs,
      stagedPolicy,
      commitCancelBeforeMs,
      promotionGate,
      promotionSettleMs,
      headOrder,
      assetPolicy,
      avatarSizePolicy,
    }),
    {
      "cache-control": contentCacheControl,
    }
  );
}
