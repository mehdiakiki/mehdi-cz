// A control API decision model, not an HTTP server or a complete auth system.
import assert from "node:assert/strict";
import { timingSafeEqual } from "node:crypto";

type ControlRequest = { token?: string; jobId: string; action: string; host: string };
type Grant = { token: string; jobId: string; actions: ReadonlySet<string> };
type Incoming = { authorization?: string; host: string; body: unknown };
type Result = { status: number; body: string };

export function authorizeControl(request: ControlRequest, grant: Grant): boolean {
  if (!grant.token || !request.token) return false;
  const supplied = Buffer.from(request.token ?? "", "utf8");
  const expected = Buffer.from(grant.token, "utf8");
  const tokenMatches = supplied.length === expected.length &&
    timingSafeEqual(supplied, expected);
  return tokenMatches && request.jobId === grant.jobId && grant.actions.has(request.action);
}

// An in-process handler for already parsed HTTP-shaped input. The server's
// configuration supplies grant; neither body nor Host chooses that record.
export function handleControl(
  request: Incoming,
  grant: Grant,
  inspect: (jobId: string) => string,
): Result {
  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { status: 400, body: "invalid request" };
  }
  const value = body as Record<string, unknown>;
  if (Object.keys(value).sort().join(",") !== "action,jobId" ||
      typeof value.jobId !== "string" || typeof value.action !== "string") {
    return { status: 400, body: "invalid request" };
  }
  const match = /^Bearer ([^\s]+)$/.exec(request.authorization ?? "");
  if (!authorizeControl({ token: match?.[1], jobId: value.jobId,
    action: value.action, host: request.host }, grant)) {
    return { status: 403, body: "operation denied" };
  }
  if (value.action !== "job.inspect") return { status: 403, body: "operation denied" };
  return { status: 200, body: inspect(grant.jobId) };
}

const grant: Grant = {
  token: "dummy-control-token-kept-outside-the-agent", jobId: "job-a",
  actions: new Set(["job.inspect"]),
};
assert.equal(authorizeControl({ host: "localhost", jobId: "job-a", action: "job.inspect" }, { ...grant, token: "" }), false);
assert.equal(authorizeControl({ host: "localhost", jobId: "job-a", action: "sandbox.disable" }, grant), false);
assert.equal(authorizeControl({ host: "localhost", token: grant.token, jobId: "job-b", action: "job.inspect" }, grant), false);
assert.equal(authorizeControl({ host: "localhost", token: grant.token, jobId: "job-a", action: "sandbox.disable" }, grant), false);
assert.equal(authorizeControl({ host: "localhost", token: grant.token, jobId: "job-a", action: "job.inspect" }, grant), true);
const effects: string[] = [];
const inspect = (jobId: string) => { effects.push(jobId); return "dummy job status"; };
const body = { jobId: "job-a", action: "job.inspect" };
const request = { authorization: `Bearer ${grant.token}`, host: "localhost", body };
assert.equal(handleControl({ ...request, authorization: undefined }, grant, inspect).status, 403);
assert.equal(handleControl({ ...request, authorization: "Bearer wrong-token" }, grant, inspect).status, 403);
assert.equal(handleControl({ ...request, body: { ...body, jobId: "job-b" } }, grant, inspect).status, 403);
assert.equal(handleControl({ ...request, body: { ...body, action: "sandbox.disable" } }, grant, inspect).status, 403);
assert.equal(handleControl({ ...request, body: { ...body, admin: true } }, grant, inspect).status, 400);
assert.deepEqual(effects, []);
assert.deepEqual(handleControl(request, grant, inspect), { status: 200, body: "dummy job status" });
assert.deepEqual(effects, ["job-a"]);
console.log("HTTP-shaped handler: missing/wrong credential, wrong job, forbidden action, and extra fields caused no inspection. Allowed request inspected job-a once.");
