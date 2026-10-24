export const PROCESSING_CONTRACT = "2026-11-processing";

export function presentOrder(order, contract) {
  if (!["pending", "paid", "processing"].includes(order.status)) {
    throw new Error("Unexpected domain status");
  }
  const headers = {
    "Cache-Control": "private, no-store",
    Vary: "X-Order-Status-Contract",
  };
  if (order.status === "processing" && contract !== PROCESSING_CONTRACT) {
    return {
      status: 409,
      headers,
      body: { error: { code: "CLIENT_UPDATE_REQUIRED", message: "Update the app to view this order." } },
    };
  }
  return { status: 200, headers, body: { id: order.id, status: order.status } };
}

// actorId is supplied by trusted authentication middleware, never the JSON body.
export function handleOrder({ actorId, order, contract }) {
  if (!actorId || order.ownerId !== actorId) {
    return { status: 403, headers: { "Cache-Control": "private, no-store" }, body: { error: { code: "FORBIDDEN", message: "Order unavailable." } } };
  }
  return presentOrder(order, contract);
}
