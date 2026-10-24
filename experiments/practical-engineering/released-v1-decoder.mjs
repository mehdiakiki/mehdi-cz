// Retained fictional V1 client. Do not add processing support to make rollout pass.
export function decodeReleasedV1(statusCode, body) {
  if (statusCode >= 400) {
    if (typeof body?.error?.message !== "string") throw new Error("Invalid error envelope");
    return { screen: "error", message: body.error.message };
  }
  if (typeof body?.id !== "string" || !["pending", "paid"].includes(body.status)) {
    throw new Error("Unsupported V1 order response");
  }
  return { screen: "order", id: body.id, label: body.status };
}
