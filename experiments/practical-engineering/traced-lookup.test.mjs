import assert from "node:assert/strict";
import test from "node:test";
import { createOrderLookup } from "./traced-lookup.mjs";

function fixture({ connectionError, queryError } = {}) {
  const events = [];
  const tracer = { startActiveSpan(name, callback) {
    events.push(`start:${name}`);
    return callback({ setStatus: ({ code }) => events.push(`error:${name}:${code}`), end: () => events.push(`end:${name}`) });
  } };
  const pool = { async connect() {
    events.push("connect");
    await Promise.resolve();
    if (connectionError) throw connectionError;
    return { async query(sql, parameters) {
      assert.match(sql, /tenant_id = \$2/);
      assert.deepEqual(parameters, ["order-7", "tenant-a"]);
      events.push("query");
      await Promise.resolve();
      if (queryError) throw queryError;
      events.push("query:resolved");
      return { rows: [{ id: "order-7", status: "paid" }] };
    }, release() { events.push("release"); } };
  } };
  return { events, lookup: createOrderLookup({ tracer, pool, errorStatus: 2 }) };
}

test("connection acquisition ends before the query; lookup ends after release", async () => {
  const { events, lookup } = fixture();
  assert.equal((await lookup("order-7", "tenant-a")).rows[0].id, "order-7");
  assert.deepEqual(events, ["start:orders.lookup", "start:db.pool.acquire", "connect", "end:db.pool.acquire", "start:db.query", "query", "query:resolved", "end:db.query", "release", "end:orders.lookup"]);
});

test("query failure marks both spans, releases the connection, and rethrows", async () => {
  const failure = new Error("synthetic query failure");
  const { events, lookup } = fixture({ queryError: failure });
  await assert.rejects(lookup("order-7", "tenant-a"), (error) => error === failure);
  assert.ok(events.includes("error:db.query:2"));
  assert.ok(events.includes("error:orders.lookup:2"));
  assert.ok(events.indexOf("end:db.query") < events.indexOf("release"));
  assert.equal(events.at(-1), "end:orders.lookup");
});

test("connection failure ends both started spans without a fake release", async () => {
  const { events, lookup } = fixture({ connectionError: new Error("pool unavailable") });
  await assert.rejects(lookup("order-7", "tenant-a"), /pool unavailable/);
  assert.ok(events.includes("end:db.pool.acquire"));
  assert.equal(events.includes("release"), false);
  assert.equal(events.includes("start:db.query"), false);
  assert.equal(events.at(-1), "end:orders.lookup");
});
