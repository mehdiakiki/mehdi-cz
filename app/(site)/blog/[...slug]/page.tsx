import { components } from "@/components/MDXComponents";
import ArticleStyles from "@/components/ArticleStyles";
import { MDXLayoutRenderer } from "pliny/mdx-components";
import { sortPosts, coreContent, allCoreContent } from "pliny/utils/contentlayer";
import { allBlogs, allAuthors } from "contentlayer/generated";
import type { Authors, Blog } from "contentlayer/generated";
import PostSimple from "@/layouts/PostSimple";
import PostLayout from "@/layouts/PostLayout";
import PostBanner from "@/layouts/PostBanner";
import { Metadata } from "next";
import siteMetadata from "@/data/siteMetadata";
import { notFound } from "next/navigation";
import OpportunitiesCard from "@/components/OpportunitiesCard";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";
import { authorityOpportunities } from "@/data/authority-opportunities.mjs";
import { getContentCluster } from "@/data/content-clusters.mjs";
import { filterVisiblePosts, publicationStatus } from "lib/publication.mjs";
import { selectPrerenderEntries } from "lib/prerender-budget.mjs";
import { isNotePost } from "lib/content-format.mjs";
import { articleStyleRequirements } from "lib/article-style-requirements.mjs";

const defaultLayout = "PostLayout";
const layouts = {
  PostSimple,
  PostLayout,
  PostBanner,
};
const opportunityBySlug = new Map(authorityOpportunities.map((item) => [item.slug, item]));

export const dynamicParams = true;
export const revalidate = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata | undefined> {
  const { slug: slugParts } = await params;
  const slug = decodeURI(slugParts.join("/"));
  const post = filterVisiblePosts<Blog>(allBlogs).find((p) => p.slug === slug);
  const authorList = post?.authors || ["default"];
  const authorDetails = authorList.map((author) => {
    const authorResults = allAuthors.find((p) => p.slug === author);
    return coreContent(authorResults as Authors);
  });
  if (!post) {
    return;
  }

  const publishedAt = new Date(post.date).toISOString();
  const modifiedAt = new Date(post.lastmod || post.date).toISOString();
  const authors = authorDetails.map((author) => author.name);
  let imageList = [siteMetadata.socialBanner];
  if (post.images) {
    imageList = typeof post.images === "string" ? [post.images] : post.images;
  }
  const ogImages = imageList.map((img) => {
    return {
      url: img.includes("http") ? img : siteMetadata.siteUrl + img,
    };
  });

  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      siteName: siteMetadata.title,
      locale: "en_US",
      type: "article",
      publishedTime: publishedAt,
      modifiedTime: modifiedAt,
      url: "./",
      images: ogImages,
      authors: authors.length > 0 ? authors : [siteMetadata.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
      images: imageList,
    },
  };
}

export const generateStaticParams = async () => {
  return selectPrerenderEntries(filterVisiblePosts<Blog>(allBlogs)).map((p) => ({
    slug: p.slug.split("/").map((name) => decodeURI(name)),
  }));
};

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug: slugParts } = await params;
  const slug = decodeURI(slugParts.join("/"));
  const visibleBlogs = filterVisiblePosts<Blog>(allBlogs);
  const post = visibleBlogs.find((candidate) => candidate.slug === slug);
  if (!post) {
    return notFound();
  }

  const note = isNotePost(post);
  const peerPosts = visibleBlogs.filter((candidate) => isNotePost(candidate) === note);
  const sortedCoreContents = allCoreContent(sortPosts(peerPosts));
  const postIndex = sortedCoreContents.findIndex((p) => p.slug === slug);
  if (postIndex === -1) {
    return notFound();
  }

  const prev = sortedCoreContents[postIndex + 1];
  const next = sortedCoreContents[postIndex - 1];
  const status = publicationStatus(post);
  const cluster = getContentCluster(post.cluster);
  const currentOpportunity = opportunityBySlug.get(post.slug);
  const currentTags = new Set(post.tags || []);
  const relatedPosts = cluster
    ? visibleBlogs
        .filter((candidate) => candidate.cluster === cluster.slug && candidate.slug !== post.slug)
        .sort((left, right) => {
          const leftSameSubcluster =
            currentOpportunity &&
            opportunityBySlug.get(left.slug)?.subcluster === currentOpportunity.subcluster
              ? 1
              : 0;
          const rightSameSubcluster =
            currentOpportunity &&
            opportunityBySlug.get(right.slug)?.subcluster === currentOpportunity.subcluster
              ? 1
              : 0;
          if (leftSameSubcluster !== rightSameSubcluster) {
            return rightSameSubcluster - leftSameSubcluster;
          }

          const leftTagOverlap = (left.tags || []).filter((tag) => currentTags.has(tag)).length;
          const rightTagOverlap = (right.tags || []).filter((tag) => currentTags.has(tag)).length;
          if (leftTagOverlap !== rightTagOverlap) return rightTagOverlap - leftTagOverlap;

          return new Date(right.date).getTime() - new Date(left.date).getTime();
        })
        .slice(0, 4)
        .map((candidate) => ({ slug: candidate.slug, title: candidate.title }))
    : [];
  const authorList = post?.authors || ["default"];
  const authorDetails = authorList.map((author) => {
    const authorResults = allAuthors.find((p) => p.slug === author);
    return coreContent(authorResults as Authors);
  });
  const mainContent = coreContent(post);
  const requiredStyles = articleStyleRequirements(post.body.code);
  const jsonLd = { ...post.structuredData };
  jsonLd["author"] = authorDetails.map((author) => {
    return {
      "@type": "Person",
      name: author.name,
    };
  });
  if (note) {
    jsonLd["isPartOf"] = {
      "@type": "CollectionPage",
      name: "Engineering Notes",
      url: `${siteMetadata.siteUrl}/notes`,
    };
  } else if (cluster) {
    jsonLd["isPartOf"] = {
      "@type": "CollectionPage",
      name: cluster.title,
      url: `${siteMetadata.siteUrl}/blog/topics/${cluster.slug}`,
    };
  }

  const Layout = layouts[post.layout || defaultLayout];

  // Create breadcrumb items for the post
  const breadcrumbItems = [
    { name: "Home", url: siteMetadata.siteUrl },
    {
      name: note ? "Notes" : "Writing",
      url: `${siteMetadata.siteUrl}${note ? "/notes" : "/blog"}`,
    },
    ...(cluster
      ? [
          {
            name: cluster.title,
            url: `${siteMetadata.siteUrl}/blog/topics/${cluster.slug}`,
          },
        ]
      : []),
    { name: post.title, url: `${siteMetadata.siteUrl}/${post.path}` },
  ];

  return (
    <>
      <ArticleStyles {...requiredStyles} />
      <ArticleJsonLd
        title={post.title}
        description={post.summary || ""}
        date={post.date}
        lastmod={post.lastmod}
        url={`${siteMetadata.siteUrl}/${post.path}`}
        tags={post.tags || []}
        images={post.images ? (typeof post.images === "string" ? [post.images] : post.images) : []}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Layout content={mainContent} authorDetails={authorDetails} next={next} prev={prev}>
        {status !== "published" && (
          <aside className="mb-8 rounded-md border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <strong className="font-semibold">Local {status} preview.</strong> This article is not
            included in production pages, search, RSS, or the sitemap.
          </aside>
        )}
        <MDXLayoutRenderer code={post.body.code} components={components} toc={post.toc} />
        {!note && (
          <OpportunitiesCard
            clusterSlug={cluster?.slug}
            currentSlug={post.slug}
            relatedPosts={relatedPosts}
          />
        )}
      </Layout>
    </>
  );
}
