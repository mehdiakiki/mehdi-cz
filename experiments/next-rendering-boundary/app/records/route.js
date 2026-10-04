import { createRecords } from "../../lib/records";

export const dynamic = "force-static";

export function GET() {
  return Response.json(createRecords(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
