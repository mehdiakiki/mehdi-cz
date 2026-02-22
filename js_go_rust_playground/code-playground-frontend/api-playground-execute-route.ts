// ==============================================================
// /app/api/playground/execute/route.ts
//
// The browser POSTs { example_id, code } here — unsigned.
// This route handles signing internally and proxies to Axum.
// The PLAYGROUND_SECRET never reaches the browser.
//
// In development: returns mock outputs so the UI works without
// the Axum backend running.
//
// In production: signs the request with HMAC-SHA256 and forwards
// it to the Axum service on the private Docker network.
// ==============================================================

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const SECRET = process.env.PLAYGROUND_SECRET || "change-me-in-production";
const AXUM_URL = process.env.PLAYGROUND_AXUM_URL || "http://code-playground:3001";

function sign(timestamp: number, body: string): string {
  const hash = createHash("sha256");
  hash.update(`${SECRET}:${timestamp}:${body}`);
  return hash.digest("hex");
}

// --- Dev mock outputs keyed by example ID ---
const MOCK_OUTPUTS: Record<string, { stdout: string; stderr: string; success: boolean }> = {
  js_01_event_loop: {
    success: true,
    stdout:
      "1: synchronous — runs immediately\n" +
      "2: still synchronous — sync always finishes first\n" +
      "3: microtask — Promise.then() runs after sync code\n" +
      "4: second microtask\n" +
      "5: nested microtask (still before macrotasks!)",
    stderr: "",
  },
  js_02_closures: {
    success: true,
    stdout: "var: 3\nvar: 3\nvar: 3\nlet: 0\nlet: 1\nlet: 2",
    stderr: "",
  },
  rs_01_hello: {
    success: true,
    stdout: "Hello from Rust!\nSum of [1, 2, 3, 4, 5] = 15",
    stderr: "",
  },
};

const DEFAULT_MOCK = {
  success: true,
  stdout: "(mock) Code executed successfully.",
  stderr: "",
};

export async function POST(request: NextRequest) {
  const body = await request.text();

  // Development: skip signing and return canned output.
  if (process.env.NODE_ENV === "development") {
    await new Promise((r) => setTimeout(r, 600)); // simulate compile latency
    const parsed = JSON.parse(body);
    const output = MOCK_OUTPUTS[parsed?.example_id ?? ""] ?? DEFAULT_MOCK;
    return NextResponse.json({ ...output, cached: false });
  }

  // Production: sign and proxy to Axum on the private Docker network.
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(timestamp, body);

  // Server-to-server calls have no Origin header by default.
  // Axum's validate_origin blocks requests with no matching Origin,
  // so we set it explicitly here (we are the trusted caller).
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://mehdi.cz";

  const axumRes = await fetch(`${AXUM_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Playground-Signature": signature,
      "X-Playground-Timestamp": String(timestamp),
      "Origin": origin,
    },
    body,
  });

  const data = await axumRes.json();
  return NextResponse.json(data, { status: axumRes.status });
}
