import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import matter from "gray-matter";

import { authorityOpportunities } from "../data/authority-opportunities.mjs";
import {
  authorityUpgradeBaselines,
  authorityUpgradePublishedDates,
} from "../data/authority-upgrade-baselines.mjs";
import {
  authorityCampaign,
  contentClusterSlugs,
  getContentCluster,
} from "../data/content-clusters.mjs";
import { articleReviewHash, hasValidReviewHash } from "../lib/content-review.mjs";
import { publicationStatus } from "../lib/publication.mjs";
import {
  authorityCalendar,
  campaignStart,
  calendarEntryForOpportunity,
  validateAuthorityCalendar,
} from "../lib/authority-schedule.mjs";

const supportedCampaigns = new Set(["authority-2026", "editorial"]);

export function markdownWordCount(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_[\](){}|~-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function parseCampaignPost(source, filePath = "post.mdx") {
  const parsed = matter(source);
  const data = parsed.data;
  const slug = path.basename(filePath).replace(/\.mdx$/, "");
  const date = data.date instanceof Date ? data.date.toISOString() : data.date;
  const lastmod = data.lastmod instanceof Date ? data.lastmod.toISOString() : data.lastmod;

  return {
    slug,
    filePath,
    title: data.title || slug,
    date,
    lastmod,
    draft: data.draft,
    reviewed: data.reviewed,
    reviewedHash: data.reviewedHash,
    cluster: data.cluster,
    campaign: data.campaign,
    opportunity: data.opportunity,
    summary: data.summary,
    wordCount: markdownWordCount(parsed.content),
    sourceHash: articleReviewHash(source),
    hasPlaceholders: /\b(?:TODO|TBD|PLACEHOLDER)\b/i.test(
      [data.title, data.summary, parsed.content].filter(Boolean).join("\n")
    ),
  };
}

async function findMdxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await findMdxFiles(entryPath)));
    if (entry.isFile() && entry.name.endsWith(".mdx")) files.push(entryPath);
  }

  return files;
}

export async function readCampaignPosts(contentDirectory) {
  const files = await findMdxFiles(contentDirectory);
  return Promise.all(
    files.map(async (filePath) => parseCampaignPost(await readFile(filePath, "utf8"), filePath))
  );
}

export function auditAuthorityCampaign(posts, now = new Date()) {
  const invalidClusters = posts.filter(
    (post) => post.cluster && !contentClusterSlugs.includes(post.cluster)
  );
  const clusteredPosts = posts.filter((post) => contentClusterSlugs.includes(post.cluster));
  const postSlugs = new Set(posts.map((post) => post.slug));
  const postsBySlug = new Map(posts.map((post) => [post.slug, post]));
  const opportunityById = new Map(
    authorityOpportunities.map((opportunity) => [opportunity.id, opportunity])
  );
  const opportunityBySlug = new Map(
    authorityOpportunities
      .filter((opportunity) => opportunity.slug)
      .map((opportunity) => [opportunity.slug, opportunity])
  );
  const mappedCampaignPosts = posts.filter((post) => opportunityBySlug.has(post.slug));
  const unrelatedClusteredPosts = clusteredPosts
    .filter((post) => !opportunityBySlug.has(post.slug))
    .map((post) => ({ slug: post.slug, cluster: post.cluster }));
  const campaignBoundary = new Date(`${campaignStart}T00:00:00+01:00`).getTime();
  const isNewClusteredPost = (post) => {
    const date = new Date(post.date).getTime();
    return (
      contentClusterSlugs.includes(post.cluster) && !Number.isNaN(date) && date >= campaignBoundary
    );
  };
  const isChangedUpgrade = (post, opportunity = opportunityBySlug.get(post.slug)) =>
    opportunity?.stage === "upgrade" &&
    authorityUpgradeBaselines[opportunity.id] !== post.sourceHash;
  const requiresAuthorityGate = (post) => {
    const opportunity = opportunityBySlug.get(post.slug);
    return (
      post.campaign === "authority-2026" ||
      Boolean(post.opportunity) ||
      (opportunity?.stage !== "upgrade" && Boolean(opportunity)) ||
      isChangedUpgrade(post, opportunity)
    );
  };
  const duplicateIds = authorityOpportunities
    .filter(
      (opportunity, index, all) =>
        all.findIndex((candidate) => candidate.id === opportunity.id) !== index
    )
    .map((opportunity) => opportunity.id);
  const duplicateTitles = authorityOpportunities
    .filter(
      (opportunity, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.workingTitle.trim().toLowerCase() ===
            opportunity.workingTitle.trim().toLowerCase()
        ) !== index
    )
    .map((opportunity) => opportunity.workingTitle);
  const titleStructureErrors = authorityOpportunities.flatMap((opportunity) => {
    const title = opportunity.workingTitle.trim();
    const reasons = [];
    if (title.length < 25) reasons.push("title is too vague to stand on its own");
    if (title.length > 90) reasons.push("title is too long to scan reliably");
    if (/\b(?:TODO|TBD|PLACEHOLDER)\b/i.test(title)) reasons.push("title contains a placeholder");
    return reasons.map((reason) => ({ id: opportunity.id, title, reason }));
  });
  const duplicateSlugs = authorityOpportunities
    .filter(
      (opportunity, index, all) =>
        all.findIndex((candidate) => candidate.slug === opportunity.slug) !== index
    )
    .map((opportunity) => opportunity.slug);
  const missingSourceSlugs = authorityOpportunities
    .filter((opportunity) => opportunity.stage !== "brief" && !postSlugs.has(opportunity.slug))
    .map((opportunity) => ({ id: opportunity.id, slug: opportunity.slug }));
  const sourceMappingErrors = authorityOpportunities
    .filter((opportunity) => opportunity.stage !== "brief")
    .flatMap((opportunity) => {
      const post = postsBySlug.get(opportunity.slug);
      if (!post || post.cluster === opportunity.cluster) return [];
      return [
        {
          id: opportunity.id,
          slug: opportunity.slug,
          expectedCluster: opportunity.cluster,
          actualCluster: post.cluster,
        },
      ];
    });
  const upgradeIds = new Set(
    authorityOpportunities
      .filter((opportunity) => opportunity.stage === "upgrade")
      .map((item) => item.id)
  );
  const upgradeBaselineErrors = [
    ...[...upgradeIds]
      .filter((id) => !/^[a-f0-9]{64}$/.test(authorityUpgradeBaselines[id] || ""))
      .map((id) => ({ id, reason: "missing or invalid baseline hash" })),
    ...Object.keys(authorityUpgradeBaselines)
      .filter((id) => !upgradeIds.has(id))
      .map((id) => ({ id, reason: "baseline does not belong to an upgrade" })),
    ...[...upgradeIds]
      .filter((id) => Number.isNaN(new Date(authorityUpgradePublishedDates[id]).getTime()))
      .map((id) => ({ id, reason: "missing or invalid original publication date" })),
    ...Object.keys(authorityUpgradePublishedDates)
      .filter((id) => !upgradeIds.has(id))
      .map((id) => ({ id, reason: "original date does not belong to an upgrade" })),
  ];
  const upgradeOriginalDateErrors = authorityOpportunities
    .filter((opportunity) => opportunity.stage === "upgrade")
    .flatMap((opportunity) => {
      const post = postsBySlug.get(opportunity.slug);
      if (!post) return [];
      const expected = new Date(authorityUpgradePublishedDates[opportunity.id]).getTime();
      const actual = new Date(post.date).getTime();
      return actual === expected
        ? []
        : [
            {
              id: opportunity.id,
              slug: post.slug,
              expected: authorityUpgradePublishedDates[opportunity.id],
              actual: post.date,
            },
          ];
    });
  const upgradeRevisionErrors = authorityOpportunities
    .filter((opportunity) => opportunity.stage === "upgrade")
    .flatMap((opportunity) => {
      const post = postsBySlug.get(opportunity.slug);
      if (!post) return [];

      if (post.sourceHash === authorityUpgradeBaselines[opportunity.id]) {
        const errors = [];
        if (opportunity.publishDecision === "approved") {
          errors.push("approved upgrade has no substantive revision");
        }
        if (post.campaign || post.opportunity || post.reviewed !== undefined) {
          errors.push("upgrade workflow metadata was added without a substantive revision");
        }
        return errors.length > 0 ? [{ id: opportunity.id, slug: post.slug, errors }] : [];
      }

      const errors = [];
      const calendarEntry = calendarEntryForOpportunity(opportunity.id);
      const lastmod = new Date(post.lastmod).getTime();
      if (post.draft !== false) errors.push("upgrade must remain public with draft:false");
      if (post.campaign !== "authority-2026") {
        errors.push("upgrade is missing authority-2026 campaign marker");
      }
      if (post.opportunity !== opportunity.id) errors.push("upgrade opportunity mismatch");
      if (opportunity.validation !== "validated") errors.push("upgrade research is not validated");
      if (opportunity.publishDecision !== "approved") errors.push("upgrade is not approved");
      if (!hasValidReviewHash(post)) errors.push("upgrade review hash is missing or stale");
      if (Number.isNaN(lastmod)) {
        errors.push("upgrade is missing a valid lastmod");
      } else if (calendarEntry && lastmod < new Date(calendarEntry.scheduledFor).getTime()) {
        errors.push("upgrade lastmod precedes its campaign action");
      }

      return errors.length > 0 ? [{ id: opportunity.id, slug: post.slug, errors }] : [];
    });
  const workflowStateErrors = authorityOpportunities.flatMap((opportunity) => {
    const errors = [];
    if (!new Set(["pending", "validated", "rejected"]).has(opportunity.validation)) {
      errors.push("unknown validation state");
    }
    if (!new Set(["hold", "approved", "merge", "kill"]).has(opportunity.publishDecision)) {
      errors.push("unknown publication decision");
    }
    if (opportunity.publishDecision === "approved" && opportunity.validation !== "validated") {
      errors.push("approval requires validated research");
    }
    if (
      opportunity.validation === "rejected" ||
      opportunity.publishDecision === "kill" ||
      opportunity.publishDecision === "merge"
    ) {
      errors.push("calendar slot requires a validated replacement");
    }
    if (opportunity.validation === "validated") {
      if (
        !Array.isArray(opportunity.canonicalSources) ||
        opportunity.canonicalSources.length === 0 ||
        opportunity.canonicalSources.some(
          (source) => typeof source !== "string" || !/^https?:\/\//.test(source)
        )
      ) {
        errors.push("validated opportunity is missing canonicalSources");
      }
    }

    return errors.length > 0 ? [{ id: opportunity.id, errors }] : [];
  });
  const unsafeCampaignPublications = posts
    .filter(
      (post) =>
        requiresAuthorityGate(post) &&
        ["scheduled", "published"].includes(publicationStatus(post, now))
    )
    .filter((post) => {
      const opportunity = opportunityBySlug.get(post.slug);
      return (
        !opportunity ||
        post.campaign !== "authority-2026" ||
        post.opportunity !== opportunity.id ||
        opportunity.validation !== "validated" ||
        opportunity.publishDecision !== "approved" ||
        !hasValidReviewHash(post)
      );
    })
    .map((post) => {
      const opportunity = opportunityBySlug.get(post.slug);
      let reason = "no opportunity record exists";
      if (opportunity) {
        if (opportunity.validation !== "validated" || opportunity.publishDecision !== "approved") {
          reason = "opportunity is not validated and approved";
        } else if (post.campaign !== "authority-2026" || post.opportunity !== opportunity.id) {
          reason = "authority metadata is missing or mismatched";
        } else {
          reason = "review hash is missing or stale";
        }
      }

      return { slug: post.slug, opportunity: opportunity?.id, reason };
    });
  const campaignPostErrors = posts
    .filter(
      (post) =>
        Boolean(post.campaign) ||
        Boolean(post.opportunity) ||
        requiresAuthorityGate(post) ||
        isNewClusteredPost(post)
    )
    .flatMap((post) => {
      const expectedOpportunity = opportunityBySlug.get(post.slug);
      const claimedOpportunity = post.opportunity
        ? opportunityById.get(post.opportunity)
        : undefined;
      const authorityGate = requiresAuthorityGate(post);
      const errors = [];

      if (!supportedCampaigns.has(post.campaign)) {
        errors.push(post.campaign ? "unknown campaign marker" : "missing campaign marker");
      }
      if (authorityGate && post.campaign !== "authority-2026") {
        errors.push("missing authority-2026 campaign marker");
      }
      if (authorityGate && !post.opportunity) errors.push("missing opportunity frontmatter");
      if (post.campaign === "editorial" && post.opportunity) {
        errors.push("editorial additions must not claim an authority opportunity");
      }
      if (post.opportunity && !claimedOpportunity) errors.push("unknown opportunity frontmatter");
      if (claimedOpportunity && claimedOpportunity.slug !== post.slug) {
        errors.push("opportunity slug mismatch");
      }
      if (expectedOpportunity && post.opportunity && expectedOpportunity.id !== post.opportunity) {
        errors.push("wrong opportunity claimed for known slug");
      }
      if (expectedOpportunity && expectedOpportunity.cluster !== post.cluster) {
        errors.push("opportunity cluster mismatch");
      }
      if (post.draft !== true && post.draft !== false) errors.push("draft must be explicit");
      if (post.reviewed !== true && post.reviewed !== false) {
        errors.push("reviewed must be explicit");
      }
      if (post.reviewed === true && !hasValidReviewHash(post)) {
        errors.push("reviewed content hash is missing or stale");
      }
      if (post.reviewed === true && post.wordCount < 700)
        errors.push("reviewed article is under 700 words");
      if (post.reviewed === true && post.hasPlaceholders)
        errors.push("reviewed article has placeholders");
      if (post.reviewed === true && !post.summary) errors.push("reviewed article has no summary");

      return errors.length > 0 ? [{ slug: post.slug, errors }] : [];
    });
  const calendarDateMismatches = posts
    .filter((post) => post.opportunity)
    .flatMap((post) => {
      const entry = calendarEntryForOpportunity(post.opportunity);
      if (!entry || entry.action !== "publish") return [];

      const actual = new Date(post.date).getTime();
      const expected = new Date(entry.scheduledFor).getTime();
      return actual !== expected
        ? [
            {
              slug: post.slug,
              opportunity: post.opportunity,
              expected: entry.scheduledFor,
              actual: post.date,
            },
          ]
        : [];
    });

  const clusters = Object.fromEntries(
    contentClusterSlugs.map((slug) => {
      const cluster = getContentCluster(slug);
      const target = authorityCampaign.clusters[slug];
      const opportunities = authorityOpportunities.filter(
        (opportunity) => opportunity.cluster === slug
      );
      const clusterPosts = mappedCampaignPosts.filter(
        (post) => opportunityBySlug.get(post.slug)?.cluster === slug
      );
      const statusCounts = {
        published: 0,
        scheduled: 0,
        held: 0,
        draft: 0,
        unapproved: 0,
        invalid: 0,
      };

      for (const post of clusterPosts) {
        statusCounts[publicationStatus(post, now)] += 1;
      }

      return [
        slug,
        {
          title: cluster.title,
          targets: target,
          opportunities: opportunities.length,
          opportunityGap: Math.max(0, target.opportunities - opportunities.length),
          stages: {
            upgrade: opportunities.filter((item) => item.stage === "upgrade").length,
            draft: opportunities.filter((item) => item.stage === "draft").length,
            brief: opportunities.filter((item) => item.stage === "brief").length,
          },
          completedUpgrades: opportunities.filter((opportunity) => {
            if (opportunity.stage !== "upgrade") return false;
            const post = postsBySlug.get(opportunity.slug);
            return (
              post &&
              post.sourceHash !== authorityUpgradeBaselines[opportunity.id] &&
              !upgradeRevisionErrors.some((error) => error.id === opportunity.id)
            );
          }).length,
          mappedPages: clusterPosts.length,
          gapToCanonicalTarget: Math.max(0, target.canonicalPages - clusterPosts.length),
          status: statusCounts,
          qualityFlags: {
            under700Words: clusterPosts
              .filter((post) => post.wordCount < 700)
              .map((post) => post.slug),
            missingSummary: clusterPosts.filter((post) => !post.summary).map((post) => post.slug),
            draftWithoutReviewGate: clusterPosts
              .filter((post) => post.draft === true && post.reviewed !== false)
              .map((post) => post.slug),
          },
        },
      ];
    })
  );

  return {
    targets: {
      opportunities: authorityCampaign.opportunityTarget,
      canonicalPages: authorityCampaign.canonicalPageTarget,
      checkpointPages: authorityCampaign.checkpointPageTarget,
      yearEnd: authorityCampaign.yearEnd,
    },
    mappedPages: mappedCampaignPosts.length,
    opportunityBacklog: authorityOpportunities.length,
    gapToCanonicalTarget: Math.max(
      0,
      authorityCampaign.canonicalPageTarget - mappedCampaignPosts.length
    ),
    unrelatedClusteredPosts,
    invalidClusters: invalidClusters.map((post) => ({
      slug: post.slug,
      cluster: post.cluster,
    })),
    backlogErrors: {
      duplicateIds,
      duplicateTitles,
      titleStructureErrors,
      duplicateSlugs,
      missingSourceSlugs,
      sourceMappingErrors,
      upgradeBaselineErrors,
      upgradeOriginalDateErrors,
      upgradeRevisionErrors,
      workflowStateErrors,
      unsafeCampaignPublications,
      campaignPostErrors,
      calendarErrors: validateAuthorityCalendar(authorityCalendar),
      calendarDateMismatches,
      wrongClusterCounts: contentClusterSlugs
        .filter(
          (slug) =>
            authorityOpportunities.filter((item) => item.cluster === slug).length !==
            authorityCampaign.clusters[slug].opportunities
        )
        .map((slug) => ({
          cluster: slug,
          expected: authorityCampaign.clusters[slug].opportunities,
          actual: authorityOpportunities.filter((item) => item.cluster === slug).length,
        })),
    },
    clusters,
  };
}

function printReport(report) {
  console.log(
    `Authority campaign: ${report.mappedPages}/${report.targets.canonicalPages} canonical pages mapped; ${report.opportunityBacklog}/${report.targets.opportunities} opportunity briefs defined for ${report.targets.yearEnd}; first quality checkpoint at ${report.targets.checkpointPages} pages.`
  );
  console.log("");

  for (const [slug, cluster] of Object.entries(report.clusters)) {
    console.log(`${cluster.title} (${slug})`);
    console.log(
      `  mapped ${cluster.mappedPages}/${cluster.targets.canonicalPages}; first checkpoint ${cluster.targets.checkpointPages}; opportunity backlog target ${cluster.targets.opportunities}`
    );
    console.log(
      `  opportunities ${cluster.opportunities}/${cluster.targets.opportunities}: ${cluster.stages.upgrade} upgrades, ${cluster.stages.draft} drafts, ${cluster.stages.brief} briefs`
    );
    console.log(
      `  upgrade revisions complete ${cluster.completedUpgrades}/${cluster.stages.upgrade}`
    );
    console.log(
      `  published ${cluster.status.published}; scheduled ${cluster.status.scheduled}; held ${cluster.status.held}; drafts ${cluster.status.draft}; unapproved ${cluster.status.unapproved}`
    );
    console.log(
      `  review flags: ${cluster.qualityFlags.under700Words.length} under 700 words; ${cluster.qualityFlags.missingSummary.length} missing summaries; ${cluster.qualityFlags.draftWithoutReviewGate.length} drafts missing reviewed:false`
    );
  }

  if (report.invalidClusters.length > 0) {
    console.log("");
    console.log(`Unknown cluster values: ${JSON.stringify(report.invalidClusters)}`);
  }

  if (report.unrelatedClusteredPosts.length > 0) {
    console.log("");
    console.log(
      `Cluster articles outside the 200-item campaign: ${JSON.stringify(report.unrelatedClusteredPosts)}`
    );
  }

  const backlogErrorCount = Object.values(report.backlogErrors).reduce(
    (sum, errors) => sum + errors.length,
    0
  );
  if (backlogErrorCount > 0) {
    console.log("");
    console.log(`Backlog errors: ${JSON.stringify(report.backlogErrors)}`);
  }
}

async function main() {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const posts = await readCampaignPosts(path.join(repositoryRoot, "data", "blog"));
  const report = auditAuthorityCampaign(posts);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  const hasBacklogErrors = Object.values(report.backlogErrors).some((errors) => errors.length > 0);
  if (report.invalidClusters.length > 0 || hasBacklogErrors) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
