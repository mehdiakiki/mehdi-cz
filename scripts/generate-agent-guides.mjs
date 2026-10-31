import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { guidePaths, reviewedGuide, guideIndex, llmsText } from "../lib/agent-guides.mjs";

const catalog = JSON.parse(await readFile("data/agent-guides.json", "utf8"));
const now = new Date();
const guides = [];
await mkdir("public/blog", { recursive: true });
await mkdir("public/rust", { recursive: true });
for (const guide of catalog.guides) {
  const paths = guidePaths(guide.slug);
  const source = await readFile(`data/blog/${guide.slug}.mdx`, "utf8");
  const reviewed = reviewedGuide(catalog, guide, source, now);
  const destination = `public${paths.markdown}`;
  if (reviewed) {
    await writeFile(destination, reviewed.markdown);
    guides.push(reviewed);
  } else {
    // Only remove this generator's own allowlisted output after a review or
    // publication change. An old copy must not survive a later rebuild.
    await rm(destination, { force: true });
  }
}
await writeFile("public/rust/guide-index", JSON.stringify(guideIndex(catalog, guides)) + "\n");
await writeFile("public/llms.txt", llmsText(catalog, guides));
console.log(`Exported ${guides.length} reviewed articles and their discovery files.`);
