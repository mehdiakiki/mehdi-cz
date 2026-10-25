import assert from "node:assert/strict";
import test from "node:test";
import { PROCESSING_CONTRACT, handleOrder, presentOrder } from "./mobile-rollout.mjs";
import { decodeReleasedV1 } from "./released-v1-decoder.mjs";

test("the retained V1 client demonstrates the unsafe direct rollout", () => {
  assert.throws(
    () => decodeReleasedV1(200, { id: "order-7", status: "processing" }),
    /Unsupported/
  );
});

test("existing states keep their V1 meaning with no capability header", () => {
  for (const status of ["pending", "paid"]) {
    const response = handleOrder({
      actorId: "alice",
      order: { id: "order-7", ownerId: "alice", status },
      contract: undefined,
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers["Cache-Control"], "private, no-store");
    assert.deepEqual(decodeReleasedV1(response.status, response.body), {
      screen: "order",
      id: "order-7",
      label: status,
    });
  }
});

test("old and unrecognized contracts use the old client's existing error path", () => {
  for (const contract of [undefined, "", "future-contract", "v2"]) {
    const response = handleOrder({
      actorId: "alice",
      order: { id: "order-7", ownerId: "alice", status: "processing" },
      contract,
    });
    assert.equal(response.status, 409);
    assert.equal(decodeReleasedV1(response.status, response.body).screen, "error");
    assert.equal(response.headers.Vary, "X-Order-Status-Contract");
  }
});

test("the explicit new contract can receive processing", () => {
  const response = handleOrder({
    actorId: "alice",
    order: { id: "order-7", ownerId: "alice", status: "processing" },
    contract: PROCESSING_CONTRACT,
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "processing");
});

test("a claimed contract never bypasses ownership authorization", () => {
  for (const actorId of ["bob", undefined, ""]) {
    const response = handleOrder({
      actorId,
      order: { id: "order-7", ownerId: "alice", status: "processing" },
      contract: PROCESSING_CONTRACT,
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.id, undefined);
  }
});

test("unexpected domain states fail instead of silently becoming paid", () => {
  assert.throws(
    () => presentOrder({ id: "order-7", status: "refunded" }, undefined),
    /Unexpected domain/
  );
});
