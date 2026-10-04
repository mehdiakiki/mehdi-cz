export const dynamic = "force-dynamic";

export function GET() {
  return new Response("route-handler-content ".repeat(400), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      vary: "perf029-control",
    },
  });
}

