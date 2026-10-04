import {
  investigationHref,
  investigationPartOf,
  investigations,
  writingRank,
  writingThemeOf,
  writingTier,
} from "../data/writing-tiers.mjs";

const maximumInvestigations = 2;

function isNote(post) {
  return post?.format === "note";
}

function tagOverlap(left, right) {
  const tags = new Set(left.tags || []);
  return (right.tags || []).filter((tag) => tags.has(tag)).length;
}

function investigationIsAvailable(investigation, availableSlugs) {
  return investigation.parts.length === 0 || availableSlugs.has(investigation.parts[0]);
}

function investigationItem(investigation) {
  return {
    href: investigationHref(investigation),
    title: investigation.title,
    kind: "investigation",
  };
}

/**
 * Pick what a reader sees after a post: investigations and articles from the
 * same theme first, then articles from the same cluster. Reference posts and
 * other parts of the reader's current investigation are never recommended.
 *
 * `candidates` must contain only posts that may be shown.
 */
export function selectRelatedWriting(post, candidates, { limit = 4, subclusterOf } = {}) {
  const ownInvestigation = investigationPartOf(post)?.investigation;
  const ownTheme = writingThemeOf(post);
  const themes = ownInvestigation ? ownInvestigation.themes : ownTheme ? [ownTheme] : [];
  const availableSlugs = new Set(candidates.map((candidate) => candidate.slug));
  const ownSubcluster = subclusterOf?.(post.slug);

  const relatedInvestigations = investigations
    .filter((investigation) => investigation !== ownInvestigation)
    .filter((investigation) => themes.some((theme) => investigation.themes.includes(theme)))
    .filter((investigation) => investigationIsAvailable(investigation, availableSlugs))
    .sort(
      (left, right) =>
        Number(themes.includes(right.themes[0])) - Number(themes.includes(left.themes[0])) ||
        investigations.indexOf(left) - investigations.indexOf(right)
    )
    .slice(0, maximumInvestigations)
    .map(investigationItem);

  const relatedArticles = candidates
    .filter((candidate) => candidate.slug !== post.slug && !isNote(candidate))
    .filter((candidate) => writingTier(candidate) === "article")
    .map((candidate) => {
      const sameTheme = themes.includes(writingThemeOf(candidate));
      const sameCluster = Boolean(post.cluster) && candidate.cluster === post.cluster;
      const sameSubcluster =
        sameCluster && Boolean(ownSubcluster) && subclusterOf?.(candidate.slug) === ownSubcluster;
      return {
        candidate,
        relevance: (sameTheme ? 4 : 0) + (sameCluster ? 2 : 0) + (sameSubcluster ? 1 : 0),
        overlap: tagOverlap(post, candidate),
      };
    })
    .filter(({ relevance }) => relevance > 0)
    .sort(
      (left, right) =>
        right.relevance - left.relevance ||
        right.overlap - left.overlap ||
        writingRank(left.candidate) - writingRank(right.candidate) ||
        new Date(right.candidate.date).getTime() - new Date(left.candidate.date).getTime()
    )
    .map(({ candidate }) => ({
      href: `/blog/${candidate.slug}`,
      title: candidate.title,
      kind: "article",
    }));

  const related = [...relatedInvestigations, ...relatedArticles].slice(0, limit);
  if (related.length > 0) return related;

  return investigations
    .filter((investigation) => investigation !== ownInvestigation)
    .filter((investigation) => investigationIsAvailable(investigation, availableSlugs))
    .slice(0, limit)
    .map(investigationItem);
}

/**
 * Previous and next for a post page. Investigation parts step through their
 * series, articles step through investigations and articles, and reference
 * posts and notes keep plain date order among their peers.
 *
 * `sortedPeers` is newest first and contains the post itself.
 */
export function selectAdjacentWriting(post, sortedPeers) {
  const part = investigationPartOf(post);
  if (part) {
    const bySlug = new Map(sortedPeers.map((peer) => [peer.slug, peer]));
    const parts = part.investigation.parts.filter((slug) => bySlug.has(slug));
    const index = parts.indexOf(post.slug);
    return {
      prev: index > 0 ? bySlug.get(parts[index - 1]) : undefined,
      next: index >= 0 && index < parts.length - 1 ? bySlug.get(parts[index + 1]) : undefined,
    };
  }

  const tier = writingTier(post);
  const peers =
    tier === "article" && !isNote(post)
      ? sortedPeers.filter((peer) => writingTier(peer) !== "reference")
      : sortedPeers;
  const index = peers.findIndex((peer) => peer.slug === post.slug);
  if (index === -1) return { prev: undefined, next: undefined };
  return { prev: peers[index + 1], next: peers[index - 1] };
}
