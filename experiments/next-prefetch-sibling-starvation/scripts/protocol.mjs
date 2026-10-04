export const slugOrder = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf"];

export function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), String(value)])
  );
}

export function classifyRequest(request) {
  if (!request.url.includes("_rsc=")) return "other";
  if (request.segmentPrefetch === "/_tree") return "route-tree";
  if (request.segmentPrefetch) return "segment";
  if (request.routerPrefetch) return "route-payload";
  if (request.stage === "prefetch" || request.stage === "retry") return "full-prefetch";
  return "navigation";
}

export function summarizeRequests(requests, stage = null) {
  const selected = stage ? requests.filter((request) => request.stage === stage) : requests;
  const counts = {
    total: selected.length,
    routeTree: 0,
    segment: 0,
    routePayload: 0,
    fullPrefetch: 0,
    navigation: 0,
    other: 0,
    completed: 0,
    failed: 0,
    encodedBytes: 0,
    decodedBodyBytes: 0,
  };

  for (const request of selected) {
    const classification = classifyRequest(request);
    counts[
      classification === "route-tree"
        ? "routeTree"
        : classification === "route-payload"
          ? "routePayload"
          : classification === "full-prefetch"
            ? "fullPrefetch"
            : classification
    ] += 1;
    if (request.finishedMs !== null) counts.completed += 1;
    if (request.failed) counts.failed += 1;
    counts.encodedBytes += request.encodedDataLength || 0;
    counts.decodedBodyBytes += request.bodyBytes || 0;
  }

  return counts;
}

export function requestedPaths(requests, stage, classification) {
  return new Set(
    requests
      .filter((request) => request.stage === stage && classifyRequest(request) === classification)
      .map((request) => new URL(request.url).pathname)
  );
}

export function missingPaths(routeKind, count, paths) {
  return slugOrder
    .slice(0, count)
    .map((slug) => `/${routeKind}/${slug}`)
    .filter((pathname) => !paths.has(pathname));
}
