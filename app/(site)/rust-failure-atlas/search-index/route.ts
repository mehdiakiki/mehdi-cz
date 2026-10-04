import { getRustFailureSearchIndex } from "lib/rust-failure-atlas";

export const dynamic = "force-static";

export function GET() {
  return Response.json(getRustFailureSearchIndex(), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
