import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import matter from "gray-matter";

import { rustFailureEvidenceCases } from "../data/rust-failure-evidence.mjs";
import { rustFailureAtlasEntries } from "../data/rust-failure-atlas.mjs";
import {
  canonicalRustFailureCaseId,
  hasReviewedDistinctIntent,
  isCanonicalRustFailureCase,
  rustFailureCanonicalCases,
  rustFailureDistinctIntentReviews,
} from "../data/rust-failure-intent-review.mjs";
import { rustFailureTrails } from "../data/rust-failure-trails.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failureDirectory = path.join(root, "data", "rust-failures");

const commonWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "by",
  "can",
  "does",
  "for",
  "from",
  "has",
  "in",
  "into",
  "is",
  "it",
  "not",
  "of",
  "on",
  "or",
  "rust",
  "that",
  "the",
  "this",
  "to",
  "when",
  "with",
]);

// These families are an editorial coverage map, not an automatic claim that a
// matching case is technically complete. Low counts tell us where a human
// review should look next.
export const rustFailureCoverageFamilies = [
  {
    slug: "ownership-borrowing",
    label: "Ownership and borrowing",
    pattern: /borrow|move|ownership|lifetime/i,
    floor: 35,
  },
  {
    slug: "traits-generics",
    label: "Traits and generics",
    pattern: /trait|generic|associated type|impl /i,
    floor: 35,
  },
  {
    slug: "macros-diagnostics",
    label: "Macros and diagnostics",
    pattern: /macro|diagnostic|span|token/i,
    floor: 18,
  },
  {
    slug: "iterators-collections",
    label: "Iterators and collections",
    pattern: /iterator|hashmap|btreemap|vec|collection|slice/i,
    floor: 30,
  },
  {
    slug: "unicode-text",
    label: "Unicode, strings, and byte boundaries",
    pattern: /utf-?8|unicode|string|str\b|character|byte boundary/i,
    floor: 16,
  },
  {
    slug: "io-buffering",
    label: "I/O, buffering, and partial progress",
    pattern: /\bio\b|read|write|buffer|flush|seek/i,
    floor: 25,
  },
  {
    slug: "filesystem-paths",
    label: "Filesystems and paths",
    pattern: /file|filesystem|path|directory|symlink|permission/i,
    floor: 18,
  },
  {
    slug: "cargo-features",
    label: "Cargo, features, and dependency resolution",
    pattern: /cargo|feature|dependency|workspace|lockfile|resolver/i,
    floor: 22,
  },
  {
    slug: "build-link",
    label: "Build scripts, code generation, and linking",
    pattern: /build script|build\.rs|linker|linking|codegen|incremental/i,
    floor: 18,
  },
  {
    slug: "ffi-abi",
    label: "FFI, ABI, and native ownership",
    pattern: /ffi|abi|extern|libc|foreign|c string|cstr/i,
    floor: 20,
  },
  {
    slug: "targets-cfg",
    label: "Targets, cfg, and cross-compilation",
    pattern: /target|cross.compil|\bcfg\b|wasm|windows|unix|musl/i,
    floor: 24,
  },
  {
    slug: "async-cancellation",
    label: "Async cancellation and task ownership",
    pattern: /async|await|future|task|cancel|runtime|waker|poll/i,
    floor: 28,
  },
  {
    slug: "channels-backpressure",
    label: "Channels and backpressure",
    pattern: /channel|sender|receiver|backpressure|queue/i,
    floor: 15,
  },
  {
    slug: "locks-poisoning",
    label: "Locks, guards, and poisoning",
    pattern: /mutex|rwlock|lock|guard|poison/i,
    floor: 18,
  },
  {
    slug: "atomics-memory-order",
    label: "Atomics and memory ordering",
    pattern: /atomic|ordering|acquire|release|compare.exchange/i,
    floor: 12,
  },
  {
    slug: "pinning",
    label: "Pinning and self-referential state",
    pattern: /\bpin\b|unpin|self.referential|projection/i,
    floor: 10,
  },
  {
    slug: "unsafe-provenance",
    label: "Unsafe, aliasing, and provenance",
    pattern: /unsafe|alias|provenance|raw pointer|nonnull/i,
    floor: 24,
  },
  {
    slug: "initialization-drop",
    label: "Initialization, Drop, and panic safety",
    pattern: /initiali[sz]|drop|destructor|panic safety|maybeuninit|manuallydrop/i,
    floor: 24,
  },
  {
    slug: "layout-alignment",
    label: "Layout, alignment, and representation",
    pattern: /layout|align|repr|size.of|packed|niche/i,
    floor: 18,
  },
  {
    slug: "panics-unwinding",
    label: "Panics and unwinding",
    pattern: /panic|unwind|catch.unwind|abort/i,
    floor: 16,
  },
  {
    slug: "msrv-editions",
    label: "MSRV, editions, and migrations",
    pattern: /msrv|rust.version|edition|migration|upgrade/i,
    floor: 18,
  },
  {
    slug: "profiles-tests",
    label: "Profiles, tests, and build configuration",
    pattern: /profile|debug|release|test harness|doctest|cfg.test/i,
    floor: 16,
  },
  {
    slug: "no-std-embedded",
    label: "no_std, embedded, and constrained targets",
    pattern: /no_std|embedded|allocator|bare.metal|panic handler/i,
    floor: 10,
  },
  {
    slug: "networking",
    label: "Networking and socket behaviour",
    pattern: /tcp|udp|socket|network|listener|stream/i,
    floor: 12,
  },
  {
    slug: "time",
    label: "Time, duration, and clocks",
    pattern: /duration|instant|systemtime|clock|timeout/i,
    floor: 12,
  },
  {
    slug: "numeric",
    label: "Numeric overflow and floating point",
    pattern: /overflow|integer|float|f32|f64|nan|shift|arithmetic/i,
    floor: 18,
  },
];

function words(value) {
  return value.match(/[\p{L}\p{N}_'-]+/gu) || [];
}

function searchableEntry(entry) {
  return [
    entry.symptom,
    entry.likelyCause,
    entry.firstCheck,
    ...(entry.searchTerms || []),
    ...(entry.evidence || []),
  ].join(" ");
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor((ordered.length - 1) * fraction)];
}

function normalizedTokens(value) {
  return new Set(
    value
      .toLocaleLowerCase("en")
      .match(/[a-z0-9_]+/g)
      ?.filter((token) => token.length > 2 && !commonWords.has(token)) || []
  );
}

function similarity(left, right) {
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection || 1);
}

function duplicatePairs(entries) {
  const tokenized = entries.map((entry) => ({
    id: entry.id,
    tokens: normalizedTokens(`${entry.symptom} ${entry.likelyCause} ${entry.firstCheck}`),
  }));
  const pairs = [];

  for (let leftIndex = 0; leftIndex < tokenized.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < tokenized.length; rightIndex += 1) {
      const score = similarity(tokenized[leftIndex].tokens, tokenized[rightIndex].tokens);
      if (
        score >= 0.35 &&
        canonicalRustFailureCaseId(tokenized[leftIndex].id) !==
          canonicalRustFailureCaseId(tokenized[rightIndex].id) &&
        !hasReviewedDistinctIntent(tokenized[leftIndex].id, tokenized[rightIndex].id)
      ) {
        pairs.push({
          left: tokenized[leftIndex].id,
          right: tokenized[rightIndex].id,
          score: Number(score.toFixed(2)),
        });
      }
    }
  }

  return pairs.sort((left, right) => right.score - left.score);
}

function countBy(items, key) {
  return Object.fromEntries(
    [...new Set(items.map(key))]
      .sort()
      .map((value) => [value, items.filter((item) => key(item) === value).length])
  );
}

export function auditRustFailureAtlas() {
  const articleFiles = readdirSync(failureDirectory).filter((file) => file.endsWith(".mdx"));
  const articles = articleFiles.map((file) => {
    const source = readFileSync(path.join(failureDirectory, file), "utf8");
    const parsed = matter(source);
    const headings = [...parsed.content.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
    return {
      file,
      data: parsed.data,
      bodyWords: words(parsed.content).length,
      headings,
    };
  });
  const evidenceById = new Map(rustFailureEvidenceCases.map((item) => [item.id, item]));
  const trailedIds = new Set(rustFailureTrails.flatMap((trail) => trail.caseIds));
  const articleById = new Map(articles.map((article) => [article.data.caseId, article]));
  const dedicatedEntries = rustFailureAtlasEntries.filter((entry) => entry.caseSlug);
  const wordCounts = articles.map((article) => article.bodyWords);
  const headingCounts = new Map();

  for (const article of articles) {
    for (const heading of article.headings) {
      headingCounts.set(heading, (headingCounts.get(heading) || 0) + 1);
    }
  }

  const exactSearchTerms = new Map();
  for (const entry of rustFailureAtlasEntries) {
    for (const term of entry.searchTerms || []) {
      const normalized = term.trim().toLocaleLowerCase("en");
      exactSearchTerms.set(normalized, [...(exactSearchTerms.get(normalized) || []), entry.id]);
    }
  }

  const coverage = rustFailureCoverageFamilies.map((family) => {
    const matches = rustFailureAtlasEntries
      .filter((entry) => family.pattern.test(searchableEntry(entry)))
      .map((entry) => entry.id);
    return {
      slug: family.slug,
      label: family.label,
      count: matches.length,
      floor: family.floor,
      status: matches.length >= family.floor ? "covered" : "review",
      sample: matches.slice(0, 5),
    };
  });

  return {
    inventory: {
      records: rustFailureAtlasEntries.length,
      canonicalRecords: rustFailureAtlasEntries.filter((entry) =>
        isCanonicalRustFailureCase(entry.id)
      ).length,
      dedicatedArticles: articles.length,
      canonicalDedicatedArticles: dedicatedEntries.filter((entry) =>
        isCanonicalRustFailureCase(entry.id)
      ).length,
      executableEvidence: rustFailureEvidenceCases.length,
      canonicalExecutableEvidence: rustFailureEvidenceCases.filter((item) =>
        isCanonicalRustFailureCase(item.id)
      ).length,
      mechanismTrails: rustFailureTrails.length,
      areaDistribution: countBy(rustFailureAtlasEntries, (entry) => entry.area),
      evidenceRunners: countBy(rustFailureEvidenceCases, (item) => item.runner || "rustc"),
    },
    articleDepth: {
      minimumWords: Math.min(...wordCounts),
      medianWords: percentile(wordCounts, 0.5),
      p90Words: percentile(wordCounts, 0.9),
      maximumWords: Math.max(...wordCounts),
      under800Words: articles
        .filter((article) => article.bodyWords < 800)
        .map((article) => article.data.caseId),
      over1400Words: articles
        .filter((article) => article.bodyWords > 1400)
        .map((article) => article.data.caseId),
    },
    answerQuality: {
      missingArticle: dedicatedEntries
        .filter((entry) => !articleById.has(entry.id))
        .map((entry) => entry.id),
      shortSummary: articles
        .filter((article) => article.data.summary.length < 100)
        .map((article) => article.data.caseId),
      longSummary: articles
        .filter((article) => article.data.summary.length > 220)
        .map((article) => article.data.caseId),
      weakSearchLanguage: rustFailureAtlasEntries
        .filter(
          (entry) => new Set(entry.searchTerms.map((term) => term.toLocaleLowerCase("en"))).size < 3
        )
        .map((entry) => entry.id),
      repeatedSearchTerms: [...exactSearchTerms]
        .map(([term, caseIds]) => ({
          term,
          caseIds: [...new Set(caseIds.map(canonicalRustFailureCaseId))],
        }))
        .filter(({ caseIds }) => caseIds.length > 1),
      possibleDuplicateCases: duplicatePairs(rustFailureAtlasEntries),
      repeatedHeadings: [...headingCounts]
        .filter(([, count]) => count >= 5)
        .sort((left, right) => right[1] - left[1])
        .map(([heading, count]) => ({ heading, count })),
      canonicalConsolidations: rustFailureCanonicalCases,
      reviewedDistinctIntents: rustFailureDistinctIntentReviews,
    },
    evidence: {
      dedicatedWithoutExecutableEvidence: dedicatedEntries
        .filter((entry) => !evidenceById.has(entry.id))
        .map((entry) => entry.id),
      untrailedDedicatedCases: dedicatedEntries
        .filter((entry) => !trailedIds.has(entry.id))
        .map((entry) => entry.id),
    },
    coverage,
    coverageGaps: coverage.filter((family) => family.status === "review"),
  };
}

function printAudit(audit) {
  console.log("Rust Failure Atlas editorial audit");
  console.log(
    `${audit.inventory.records} reviewed records (${audit.inventory.canonicalRecords} canonical) · ${audit.inventory.dedicatedArticles} dedicated articles · ${audit.inventory.executableEvidence} executable fixtures`
  );
  console.log(
    `Body depth: ${audit.articleDepth.minimumWords} min · ${audit.articleDepth.medianWords} median · ${audit.articleDepth.p90Words} p90 · ${audit.articleDepth.maximumWords} max`
  );
  console.log(
    `Navigation: ${audit.evidence.untrailedDedicatedCases.length} dedicated cases are not assigned to a mechanism trail`
  );
  console.log(
    `Evidence boundary: ${audit.inventory.canonicalExecutableEvidence} canonical executable fixtures · ${audit.evidence.dedicatedWithoutExecutableEvidence.length} reviewed case files use a non-portable evidence plan`
  );
  console.log(
    `Review queue: ${audit.answerQuality.possibleDuplicateCases.length} similarity pairs · ${audit.answerQuality.repeatedSearchTerms.length} repeated search terms · ${audit.coverageGaps.length} under-covered families`
  );
  console.log("\nCoverage map");
  for (const family of audit.coverage) {
    const marker = family.status === "covered" ? "✓" : "!";
    console.log(`${marker} ${family.label}: ${family.count}/${family.floor}`);
  }
  if (audit.coverageGaps.length > 0) {
    console.log("\nHighest-priority coverage review");
    for (const family of audit.coverageGaps) {
      console.log(
        `- ${family.label}: ${family.count} matching cases (review floor ${family.floor})`
      );
    }
  }
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  const audit = auditRustFailureAtlas();
  if (process.argv.includes("--json")) console.log(JSON.stringify(audit, null, 2));
  else printAudit(audit);
}
