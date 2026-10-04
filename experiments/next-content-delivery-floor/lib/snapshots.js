import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const pages = new Set(["home", "article"]);

export function readSnapshot(page) {
  if (!pages.has(page)) {
    throw new Error(`Unknown snapshot: ${page}`);
  }

  return JSON.parse(
    fs.readFileSync(path.join(fixtureRoot, "generated", `${page}.json`), "utf8")
  );
}

export const snapshotPages = [...pages];

