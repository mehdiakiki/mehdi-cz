import { gzipSync } from "node:zlib";

import { getRustFailureSearchIndex } from "lib/rust-failure-atlas";

export const dynamic = "force-static";

export function GET() {
  const body = gzipSync(JSON.stringify(getRustFailureSearchIndex()), { level: 9 });

  return new Response(new Uint8Array(body), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/gzip",
    },
  });
}
