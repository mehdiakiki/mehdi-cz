import { readFileSync, writeFileSync } from "node:fs";

import { previewContactExport } from "./session-01/candidate/importer.ts";

const csv = readFileSync(new URL("./fixtures/contacts.csv", import.meta.url), "utf8");
const preview = previewContactExport(csv);
const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Recorded contact import preview</title>
<style>body{font:16px system-ui;max-width:800px;margin:40px auto;padding:0 20px}table{border-collapse:collapse}td,th{padding:12px;border:1px solid #ccc;text-align:left}td{white-space:pre-wrap}</style>
</head><body>${preview.html}</body></html>
`;
writeFileSync(new URL("./preview.html", import.meta.url), html);
console.log(JSON.stringify(preview.result, null, 2));
