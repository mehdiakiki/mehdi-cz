// Fake transport only: no DNS query, socket, or HTTP request is made.
import assert from "node:assert/strict";
import type { RequestOptions } from "node:https";
import { isIP } from "node:net";
import { checkServerIdentity } from "node:tls";

type Destination = { address: string; serverName: string; path: string };
type Response = { statusCode: number; body: string };

// These are real Node HTTPS options, inspected by a fake transport below.
// A transport must pass them through unchanged; it must also bound time/output.
export function pinnedOptions(target: Destination): RequestOptions {
  if (!isIP(target.address)) throw new Error("connector requires a numeric IP");
  return {
    hostname: target.address,
    port: 443,
    method: "GET",
    path: target.path,
    servername: target.serverName,
    headers: { Host: target.serverName },
    rejectUnauthorized: true,
    checkServerIdentity: (_name, certificate) =>
      checkServerIdentity(target.serverName, certificate),
    agent: false,
  };
}

export async function requestThroughBroker(
  value: string,
  allowedHosts: ReadonlySet<string>,
  allowedAddresses: ReadonlySet<string>,
  resolve: (host: string) => Promise<string[]>,
  connect: (options: RequestOptions) => Promise<Response>,
): Promise<string> {
  const url = new URL(value);
  if (
    url.protocol !== "https:" || url.username || url.password ||
    (url.port !== "" && url.port !== "443") || !allowedHosts.has(url.hostname)
  ) throw new Error("destination denied before DNS");
  const addresses = await resolve(url.hostname);
  if (addresses.length === 0 || addresses.some((ip) => !isIP(ip) || !allowedAddresses.has(ip))) {
    throw new Error("resolved address denied");
  }
  const response = await connect(pinnedOptions({
    address: addresses[0], serverName: url.hostname,
    path: url.pathname + url.search,
  }));
  // Node's core HTTPS client does not follow redirects automatically. The
  // broker refuses them rather than forwarding an unchecked Location target.
  if (response.statusCode >= 300 && response.statusCode < 400) {
    throw new Error("redirect denied");
  }
  return response.body;
}

const dnsCalls: string[] = [];
const connections: RequestOptions[] = [];
const resolve = async (host: string) => {
  dnsCalls.push(host);
  return ["192.0.2.10"]; // Documentation-only address; no socket is opened.
};
const connect = async (options: RequestOptions) => {
  connections.push(options);
  return { statusCode: 200, body: "dummy response" };
};
const hosts = new Set(["reports.example"]);
const addresses = new Set(["192.0.2.10"]);
await assert.rejects(
  requestThroughBroker("https://dummy-canary.collector.invalid/", hosts, addresses, resolve, connect),
);
assert.deepEqual(dnsCalls, []);
assert.equal(connections.length, 0);
for (const answer of [[], ["192.0.2.11"], ["192.0.2.10", "192.0.2.11"], ["reports.example"]]) {
  await assert.rejects(requestThroughBroker(
    "https://reports.example/status", hosts, addresses,
    async () => answer, connect,
  ), /resolved address denied/);
}
assert.equal(connections.length, 0);
assert.equal(await requestThroughBroker("https://reports.example/status?format=text", hosts, addresses, resolve, connect), "dummy response");
const options = connections[0];
assert.equal(options.hostname, "192.0.2.10");
assert.equal(options.servername, "reports.example");
assert.deepEqual(options.headers, { Host: "reports.example" });
assert.equal(options.path, "/status?format=text");
assert.equal(options.rejectUnauthorized, true);
assert.equal(options.agent, false);
assert.equal(typeof options.checkServerIdentity, "function");
await assert.rejects(requestThroughBroker(
  "https://reports.example/status", hosts, addresses, resolve,
  async () => ({ statusCode: 302, body: "" }),
), /redirect denied/);
console.log("Denied hostname: zero lookups. Denied address: zero connections. Allowed request: numeric address plus original TLS/HTTP name. Redirect: denied.");
