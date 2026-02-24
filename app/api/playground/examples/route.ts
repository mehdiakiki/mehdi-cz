import { NextRequest, NextResponse } from "next/server";

const AXUM_URL = process.env.PLAYGROUND_AXUM_URL || "http://code-playground:3001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang");

  // In development without real backend: return empty list (UI will show nothing).
  // With FORCE_REAL_BACKEND or in production: proxy to Axum.
  if (process.env.NODE_ENV === "development" && !process.env.FORCE_REAL_BACKEND) {
    return NextResponse.json([]);
  }

  const url = new URL(`${AXUM_URL}/api/playground/examples`);
  if (lang) url.searchParams.set("lang", lang);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    console.error("[playground] Failed to reach Axum for examples:", err);
    return NextResponse.json([], { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
