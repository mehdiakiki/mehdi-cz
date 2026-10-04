import { MetadataRoute } from "next";
import { allBlogs, allRustFailures, type Blog, type RustFailure } from "contentlayer/generated";
import { slug } from "github-slugger";
import siteMetadata from "@/data/siteMetadata";
import { contentClusters } from "@/data/content-clusters.mjs";
import {
  isRustFailureAtlasLaunched,
  rustFailureAreas,
  rustFailureAtlasEntries,
} from "@/data/rust-failure-atlas.mjs";
import { isCanonicalRustFailureCase } from "@/data/rust-failure-intent-review.mjs";
import { filterVisiblePosts } from "lib/publication.mjs";
import { filterNotePosts, filterWritingPosts } from "lib/content-format.mjs";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteMetadata.siteUrl;
  const publishedBlogs = filterVisiblePosts<Blog>(allBlogs);
  const publishedWriting = filterWritingPosts(publishedBlogs);
  const publishedNotes = filterNotePosts(publishedBlogs);
  const publishedRustFailures = filterVisiblePosts<RustFailure>(allRustFailures);
  const latestModified = (posts: Array<{ date: string; lastmod?: string }>) => {
    const latest = posts.reduce<number | undefined>((current, post) => {
      const timestamp = new Date(post.lastmod || post.date).getTime();
      if (Number.isNaN(timestamp)) return current;
      return current === undefined ? timestamp : Math.max(current, timestamp);
    }, undefined);
    return latest === undefined ? undefined : new Date(latest);
  };
  const latestBlogModification = latestModified(publishedWriting);
  const latestNotesModification = latestModified(publishedNotes);
  const latestRustModification = latestModified([
    ...publishedWriting.filter((post) => post.cluster === "rust-under-the-hood"),
    ...publishedRustFailures,
  ]);

  // Static pages with strategic priorities
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      ...(latestBlogModification ? { lastModified: latestBlogModification } : {}),
      changeFrequency: "weekly",
      priority: 1.0, // Homepage gets highest priority
    },
    {
      url: `${siteUrl}/blog`,
      ...(latestBlogModification ? { lastModified: latestBlogModification } : {}),
      changeFrequency: "daily",
      priority: 0.9, // Blog index is very important
    },
    {
      url: `${siteUrl}/blog/roadmap`,
      ...(latestBlogModification ? { lastModified: latestBlogModification } : {}),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/rust`,
      ...(latestRustModification ? { lastModified: latestRustModification } : {}),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...(isRustFailureAtlasLaunched()
      ? [
          {
            url: `${siteUrl}/rust-failure-atlas`,
            ...(latestRustModification ? { lastModified: latestRustModification } : {}),
            changeFrequency: "weekly" as const,
            priority: 0.9,
          },
          ...rustFailureAreas.map((area) => ({
            url: `${siteUrl}/rust-failure-atlas/area/${area.slug}`,
            ...(latestRustModification ? { lastModified: latestRustModification } : {}),
            changeFrequency: "monthly" as const,
            priority: 0.7,
          })),
        ]
      : []),
    {
      url: `${siteUrl}/notes`,
      ...(latestNotesModification ? { lastModified: latestNotesModification } : {}),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/work`,
      changeFrequency: "monthly",
      priority: 0.9, // Work/portfolio page
    },
    {
      url: `${siteUrl}/work/inferal`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/work/inferal/relay`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/work/monitorme`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/work/bitarena`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/open-source`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/how-i-work`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/contact`,
      changeFrequency: "monthly",
      priority: 0.7, // Contact page
    },
  ];

  const clusterRoutes: MetadataRoute.Sitemap = contentClusters.map((cluster) => {
    const lastModified = latestModified(
      publishedBlogs.filter((post) => post.cluster === cluster.slug)
    );
    return {
      url: `${siteUrl}/blog/topics/${cluster.slug}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly",
      priority: 0.8,
    };
  });

  // Dynamic blog posts with proper SEO metadata
  const blogRoutes: MetadataRoute.Sitemap = publishedBlogs
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((post) => {
      const postDate = new Date(post.lastmod || post.date);
      const daysSincePost = Math.floor((Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24));

      // Recent posts get higher priority and more frequent updates
      let priority = 0.7;
      let changeFrequency:
        "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never" = "monthly";

      if (daysSincePost < 7) {
        priority = 0.8;
        changeFrequency = "weekly";
      } else if (daysSincePost < 30) {
        priority = 0.7;
        changeFrequency = "monthly";
      } else if (daysSincePost < 365) {
        priority = 0.6;
        changeFrequency = "yearly";
      } else {
        priority = 0.5;
        changeFrequency = "never";
      }

      return {
        url: `${siteUrl}/${post.path}`,
        lastModified: postDate,
        changeFrequency,
        priority,
      };
    });

  const canonicalFailureSlugs = new Set(
    rustFailureAtlasEntries
      .filter((entry) => entry.caseSlug && isCanonicalRustFailureCase(entry.id))
      .map((entry) => entry.caseSlug)
  );
  const rustFailureRoutes: MetadataRoute.Sitemap = publishedRustFailures
    .filter((failure) => canonicalFailureSlugs.has(failure.slug))
    .map((failure) => ({
      url: `${siteUrl}/${failure.path}`,
      lastModified: new Date(failure.lastmod || failure.date),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  // Tag pages (if you have individual tag pages)
  const tagRoutes: MetadataRoute.Sitemap = [];
  const uniqueTags = [...new Set(publishedWriting.flatMap((post) => post.tags || []))];

  uniqueTags.forEach((tag) => {
    if (tag) {
      const taggedPosts = publishedWriting.filter((post) => post.tags?.includes(tag));
      const lastModified = latestModified(taggedPosts);
      tagRoutes.push({
        url: `${siteUrl}/blog/tags/${slug(tag)}/page/1`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  });

  // Blog pagination pages
  const postsPerPage = 5; // Adjust based on your pagination
  const totalPages = Math.ceil(publishedWriting.length / postsPerPage);
  const paginationRoutes: MetadataRoute.Sitemap = [];

  for (let page = 2; page <= totalPages; page++) {
    paginationRoutes.push({
      url: `${siteUrl}/blog/page/${page}`,
      ...(latestBlogModification ? { lastModified: latestBlogModification } : {}),
      changeFrequency: "weekly",
      priority: 0.4,
    });
  }

  return [
    ...staticPages,
    ...clusterRoutes,
    ...rustFailureRoutes,
    ...blogRoutes,
    ...tagRoutes,
    ...paginationRoutes,
  ];
}
