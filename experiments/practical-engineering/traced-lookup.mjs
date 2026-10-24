export function createOrderLookup({ tracer, pool, errorStatus }) {
  function inSpan(name, work) {
    return tracer.startActiveSpan(name, async (span) => {
      try { return await work(); }
      catch (error) { span.setStatus({ code: errorStatus }); throw error; }
      finally { span.end(); }
    });
  }
  return async function lookupOrder(orderId, tenantId) {
    return inSpan("orders.lookup", async () => {
      const client = await inSpan("db.pool.acquire", () => pool.connect());
      try {
        return await inSpan("db.query", () => client.query(
          "SELECT id, status FROM orders WHERE id = $1 AND tenant_id = $2",
          [orderId, tenantId],
        ));
      } finally { client.release(); }
    });
  };
}
