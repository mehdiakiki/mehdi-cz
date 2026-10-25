"""Puts deliberate type errors into a copy of the site snapshot.

Usage: python3 -I inject-errors.py COPY_DIRECTORY
Each changed file is written to a new file that then replaces the old path.
A pattern replaces its first match; a plain string must occur exactly once.
"""

import os
import re
import sys

ERRORS = [
    ("wrong literal for a union type", "app/seo.tsx", [
        ('type: "website",', 'type: "blog",'),
    ]),
    ("missing required JSX prop", "components/Tag.tsx", [
        ("      href={`/blog/tags/${slug(text)}/page/1`}\n", ""),
    ]),
    ("wrong number of arguments", "app/sitemap.ts", [
        ("${slug(tag)}/page/1", "${slug(tag, false, 1)}/page/1"),
    ]),
    ("possibly undefined (strictNullChecks)", "app/sitemap.ts", [
        ("      url: `${siteUrl}/blog`,\n"
         "      ...(latestBlogModification ? { lastModified: latestBlogModification } : {}),",
         "      url: `${siteUrl}/blog`,\n"
         "      lastModified: latestBlogModification.toISOString(),"),
    ]),
    ("misspelled property", "app/sitemap.ts", [
        ('post.cluster === "rust-under-the-hood"', 'post.clustr === "rust-under-the-hood"'),
    ]),
    ("string outside a union, inside an array type", "app/sitemap.ts", [
        ('        changeFrequency: "weekly",\n        priority: 0.7,',
         '        changeFrequency: "every week",\n        priority: 0.7,'),
    ]),
    ("wrong argument type", "app/sitemap.ts", [
        ("Math.max(current, timestamp)", "Math.max(current, String(timestamp))"),
    ]),
    ("misspelled import name", "lib/rust-failure-atlas.ts", [
        ("import { getRustFailureArea, rustFailureAtlasEntries }",
         "import { getRustFailureAreas, rustFailureAtlasEntries }"),
        ("const failureArea = getRustFailureArea(entry.area);",
         "const failureArea = getRustFailureAreas(entry.area);"),
    ]),
    ("misspelled module path", "lib/rust-failure-atlas.ts", [
        ('"@/data/rust-failure-evidence.mjs"', '"@/data/rust-failure-evidences.mjs"'),
    ]),
    ("comparison that can never be true", "lib/rust-failure-atlas.ts", [
        ('publicationStatus(destination!) !== "published"', 'publicationStatus(destination!) !== "publish"'),
    ]),
    ("wrong value for a literal type", "lib/rust-failure-atlas.ts", [
        ("    version: 1,\n", "    version: 2,\n"),
    ]),
    ("possibly undefined after removing ?.", "lib/rust-failure-atlas.ts", [
        ("destination?.title || entry.plannedTitle", "destination.title || entry.plannedTitle"),
    ]),
    ("generic constraint not satisfied", "lib/rust-failure-atlas.ts", [
        ("const visiblePosts = filterVisiblePosts<Blog>(allBlogs);",
         "const visiblePosts = filterVisiblePosts<{ title: string; slug: string }>(allBlogs);"),
    ]),
    ("missing property in an object literal", "data/openSourceData.ts", [
        (re.compile(r"\n    number: \d+,"), ""),
    ]),
    ("excess property in an object literal", "data/openSourceData.ts", [
        ("export const denoContributions: Contribution[] = [\n  {\n",
         "export const denoContributions: Contribution[] = [\n  {\n    year: 2026,\n"),
    ]),
    ("forgotten await on Next.js params", "app/(site)/blog/[...slug]/page.tsx", [
        ("export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {\n"
         "  const { slug: slugParts } = await params;",
         "export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {\n"
         "  const { slug: slugParts } = params;"),
    ]),
    ("JSDoc type in a checked JavaScript file", "data/publication-hold.mjs", [
        ("/**\n * Scheduled article publishing", "// @ts-check\n/**\n * Scheduled article publishing"),
        (" * This does not pause scheduled publication of new articles.\n */\n"
         "export const campaignUpgradeDeadlinesPaused = true;",
         " * This does not pause scheduled publication of new articles.\n * @type {boolean}\n */\n"
         'export const campaignUpgradeDeadlinesPaused = "yes";'),
    ]),
]


def main():
    root = sys.argv[1]
    for number, (kind, name, replacements) in enumerate(ERRORS, 1):
        path = os.path.join(root, name)
        with open(path) as f:
            text = f.read()
        for old, new in replacements:
            if isinstance(old, re.Pattern):
                text, count = old.subn(new, text, count=1)
            else:
                count = text.count(old)
                text = text.replace(old, new)
            if count != 1:
                sys.exit(f"error {number} ({kind}): expected one match in {name}, found {count}")
        with open(path + ".new", "w") as f:
            f.write(text)
        os.replace(path + ".new", path)
        print(f"{number:>2}. {name}: {kind}")


if __name__ == "__main__":
    main()
