import { createRecords, RECORD_COUNT } from "../../lib/records";

export const dynamic = "force-static";

const escapeHtml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function GET() {
  const records = createRecords();
  const archive = records
    .map(
      (record) => `<li><article data-record-id="${record.id}">
<h2>${escapeHtml(record.title)}</h2>
<p>${escapeHtml(record.body)}</p>
<a href="${record.href}">Open record ${record.id}</a>
<span class="fingerprint"> ${record.fingerprint}</span>
</article></li>`
    )
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Plain HTML archive</title><style>
body{margin:0;background:#f7f7f5;color:#17212b;font-family:system-ui,sans-serif}
main{width:min(72rem,calc(100% - 2rem));margin:0 auto;padding:2rem 0 5rem}
.archive{display:grid;gap:.75rem;margin:0;padding:0;list-style:none}
article{border:1px solid #c9d0d6;border-radius:.5rem;background:white;padding:1rem}
article h2{margin:0 0 .5rem;font-size:1.05rem}article p{line-height:1.5}
.fingerprint{font-size:.75rem;color:#52606d}
</style></head><body><main><nav><a href="/">All cases</a></nav>
<h1>Plain server HTML archive</h1><p>All ${RECORD_COUNT} records arrive in one HTML representation without React hydration.</p>
<ol class="archive" data-record-count="${RECORD_COUNT}">${archive}</ol>
</main></body></html>`;

  return new Response(html, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
