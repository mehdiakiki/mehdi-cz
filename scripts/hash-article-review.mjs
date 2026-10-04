import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { authorityOpportunities } from "../data/authority-opportunities.mjs";
import { articleReviewHash } from "../lib/content-review.mjs";

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

export function reviewFileForArguments({ id, file }, repositoryRoot) {
  if (id && file) throw new Error("Pass either --id or --file, not both");

  if (id) {
    const opportunity = authorityOpportunities.find((item) => item.id === id);
    if (!opportunity) throw new Error(`Unknown authority opportunity: ${id}`);
    return path.join(repositoryRoot, "data", "blog", `${opportunity.slug}.mdx`);
  }

  if (!file) throw new Error("Pass --id RUST-026 or --file data/blog/article.mdx");
  const resolved = path.resolve(repositoryRoot, file);
  const contentRoots = ["blog", "rust-failures"].map(
    (directory) => path.join(repositoryRoot, "data", directory) + path.sep
  );
  if (
    !contentRoots.some((contentRoot) => resolved.startsWith(contentRoot)) ||
    !resolved.endsWith(".mdx")
  ) {
    throw new Error("Review hashes are limited to MDX files under data/blog or data/rust-failures");
  }
  return resolved;
}

async function main() {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const filePath = reviewFileForArguments(
    { id: argumentValue("--id"), file: argumentValue("--file") },
    repositoryRoot
  );
  const hash = articleReviewHash(await readFile(filePath, "utf8"));

  console.log(`File: ${path.relative(repositoryRoot, filePath)}`);
  console.log(`reviewedHash: ${JSON.stringify(hash)}`);
  console.log("Re-run this command after any substantive article change.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
