import { readSnapshot, snapshotPages } from "../../../lib/snapshots";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return snapshotPages.map((page) => ({ page }));
}

export async function GET(_request, { params }) {
  const { page } = await params;
  if (!snapshotPages.includes(page)) {
    return new Response("Not found", { status: 404 });
  }

  const snapshot = readSnapshot(page);
  const html = [
    "<!doctype html>",
    `<html lang="${snapshot.html.lang}" class="${snapshot.html.className}">`,
    `<head>${snapshot.head}</head>`,
    `<body class="${snapshot.bodyClassName}">${snapshot.body}</body>`,
    "</html>",
  ].join("");

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

