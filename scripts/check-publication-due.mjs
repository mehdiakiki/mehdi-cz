import { appendFile, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { authorityUpgradeBaselines } from "../data/authority-upgrade-baselines.mjs";
import { articleReviewHash, hasValidReviewHash } from "../lib/content-review.mjs";
import { publicationStatus } from "../lib/publication.mjs";
import { authorityCalendar } from "../lib/authority-schedule.mjs";
import { campaignUpgradeDeadlinesPaused, heldArticleSlugs } from "../data/publication-hold.mjs";

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function optionalBoolean(value, field, filePath) {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${filePath}: ${field} must be true or false`);
}

export function parsePublicationFrontmatter(source, filePath = "post.mdx") {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    throw new Error(`${filePath}: missing frontmatter`);
  }

  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*?)\s*$/);
    if (field) {
      values[field[1]] = unquote(field[2]);
    }
  }

  if (!values.date) {
    throw new Error(`${filePath}: missing required date`);
  }

  const date = new Date(values.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${filePath}: invalid publication date ${JSON.stringify(values.date)}`);
  }

  return {
    title: values.title || path.basename(filePath, path.extname(filePath)),
    date: values.date,
    draft: optionalBoolean(values.draft, "draft", filePath),
    reviewed: optionalBoolean(values.reviewed, "reviewed", filePath),
    reviewedHash: values.reviewedHash,
    campaign: values.campaign,
    opportunity: values.opportunity,
    sourceHash: articleReviewHash(source),
  };
}

async function findMdxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findMdxFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(entryPath);
    }
  }

  return files;
}

export async function readPublicationManifest(contentDirectory) {
  const files = await findMdxFiles(contentDirectory);

  return Promise.all(
    files.map(async (filePath) => {
      const source = await readFile(filePath, "utf8");
      const frontmatter = parsePublicationFrontmatter(source, filePath);
      const relativePath = path.relative(contentDirectory, filePath).split(path.sep).join("/");
      const slug = relativePath.replace(/\.mdx$/, "");

      return {
        ...frontmatter,
        slug,
        path: `/blog/${slug}`,
        filePath,
      };
    })
  );
}

export function sitemapPaths(xml) {
  const paths = new Set();

  for (const match of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    try {
      const pathname = new URL(match[1]).pathname.replace(/\/$/, "") || "/";
      paths.add(pathname);
    } catch {
      // Ignore malformed external data. Missing due paths will trigger a rebuild.
    }
  }

  return paths;
}

export function missingDuePublications(posts, liveSitemap, now = new Date()) {
  const livePaths = sitemapPaths(liveSitemap);

  return posts.filter(
    (post) =>
      publicationStatus(post, now) === "published" && !livePaths.has(post.path.replace(/\/$/, ""))
  );
}

/**
 * Return campaign actions whose slot has passed and whose work is incomplete.
 * Slots of held articles, and upgrade slots while upgrade deadlines are paused,
 * are never returned.
 */
export function overdueAuthorityActions(
  posts,
  now = new Date(),
  { held = heldArticleSlugs, upgradeDeadlinesPaused = campaignUpgradeDeadlinesPaused } = {}
) {
  const postsBySlug = new Map(posts.map((post) => [post.slug, post]));

  return (
    authorityCalendar
      .filter((entry) => new Date(entry.scheduledFor).getTime() <= now.getTime())
      .filter((entry) => !held.has(entry.slug))
      .filter((entry) => !(upgradeDeadlinesPaused && entry.action !== "publish"))
      .flatMap((entry) => {
        const post = postsBySlug.get(entry.slug);
        const base = {
          id: entry.id,
          action: entry.action,
          slug: entry.slug,
          scheduledFor: entry.scheduledFor,
        };

        if (!post) return [{ ...base, reason: "source file is missing" }];

        if (entry.action === "publish") {
          const status = publicationStatus(post, now);
          if (status !== "published") {
            return [{ ...base, reason: `article is ${status}` }];
          }
          if (
            post.campaign !== "authority-2026" ||
            post.opportunity !== entry.id ||
            entry.validation !== "validated" ||
            entry.publishDecision !== "approved" ||
            !hasValidReviewHash(post)
          ) {
            return [{ ...base, reason: "article is not fully validated and review-bound" }];
          }
          return [];
        }

        const baselineHash = authorityUpgradeBaselines[entry.id];
        if (!baselineHash) return [{ ...base, reason: "upgrade baseline is missing" }];
        if (post.sourceHash === baselineHash) {
          return [{ ...base, reason: "upgrade has not changed from its baseline" }];
        }
        if (
          post.campaign !== "authority-2026" ||
          post.opportunity !== entry.id ||
          entry.validation !== "validated" ||
          entry.publishDecision !== "approved" ||
          !hasValidReviewHash(post)
        ) {
          return [{ ...base, reason: "upgrade revision is not fully validated and review-bound" }];
        }

        return [];
      })
  );
}

export async function checkLivePublications({
  posts,
  siteUrl,
  now = new Date(),
  fetchImpl = fetch,
}) {
  const sitemapUrl = new URL("/sitemap.xml", siteUrl);

  try {
    const response = await fetchImpl(sitemapUrl, {
      headers: { "cache-control": "no-cache", connection: "close" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        shouldDeploy: false,
        checkFailed: true,
        reason: `live sitemap returned HTTP ${response.status}`,
        missing: [],
      };
    }

    const missing = missingDuePublications(posts, await response.text(), now);
    return {
      shouldDeploy: missing.length > 0,
      checkFailed: false,
      reason:
        missing.length > 0
          ? `${missing.length} due publication${missing.length === 1 ? " is" : "s are"} missing`
          : "all due publications are live",
      missing,
    };
  } catch (error) {
    return {
      shouldDeploy: false,
      checkFailed: true,
      reason: `live sitemap check failed: ${error instanceof Error ? error.message : String(error)}`,
      missing: [],
    };
  }
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const posts = await readPublicationManifest(path.join(repositoryRoot, "data", "blog"));
  const now = new Date();
  const overdue = overdueAuthorityActions(posts, now);

  if (process.argv.includes("--status")) {
    const counts = { published: 0, scheduled: 0, held: 0, draft: 0, unapproved: 0, invalid: 0 };
    for (const post of posts) {
      counts[publicationStatus(post, now)] += 1;
    }

    const scheduled = posts
      .filter((post) => publicationStatus(post, now) === "scheduled")
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

    const nextActions = authorityCalendar
      .filter((entry) => new Date(entry.scheduledFor).getTime() > now.getTime())
      .slice(0, 10)
      .map(({ id, action, slug, scheduledFor }) => ({ id, action, slug, scheduledFor }));

    console.log(
      JSON.stringify(
        { checkedAt: now.toISOString(), counts, overdue, nextActions, scheduled },
        null,
        2
      )
    );
    return;
  }

  const siteUrl = argumentValue("--site-url") || "https://www.mehdi.cz";
  const result = await checkLivePublications({ posts, siteUrl, now });
  const githubOutput = argumentValue("--github-output");

  if (githubOutput) {
    await appendFile(githubOutput, `deploy=${result.shouldDeploy}\n`, "utf8");
    await appendFile(githubOutput, `check_failed=${result.checkFailed}\n`, "utf8");
    await appendFile(githubOutput, `overdue=${overdue.length > 0}\n`, "utf8");
    await appendFile(githubOutput, `overdue_count=${overdue.length}\n`, "utf8");
  }

  if (overdue.length > 0) {
    console.log(
      `::warning title=Overdue authority work::${overdue.length} due campaign action${overdue.length === 1 ? " is" : "s are"} incomplete`
    );
  }

  console.log(
    JSON.stringify(
      {
        checkedAt: now.toISOString(),
        siteUrl,
        shouldDeploy: result.shouldDeploy,
        checkFailed: result.checkFailed,
        reason: result.reason,
        overdue,
        missing: result.missing.map((post) => ({
          title: post.title,
          path: post.path,
          date: post.date,
        })),
      },
      null,
      2
    )
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
