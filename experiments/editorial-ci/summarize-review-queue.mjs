import { readFile } from "node:fs/promises";
import { summarizeQueue } from "./review-queue.mjs";

const [snapshotPath] = process.argv.slice(2);
if (!snapshotPath) throw new Error("usage: summarize-review-queue.mjs SNAPSHOT.json");
const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
console.log(JSON.stringify({ kind: snapshot.kind, observedAt: snapshot.observedAt,
  rows: summarizeQueue(snapshot.records, Date.parse(snapshot.observedAt)) }, null, 2));
