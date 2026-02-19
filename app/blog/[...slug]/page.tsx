import "css/prism.css";
import "katex/dist/katex.css";

import { components } from "@/components/MDXComponents";
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
import dynamic from "next/dynamic";
const OpportunitiesCard = dynamic(() => import("@/components/OpportunitiesCard"));
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";

const defaultLayout = "PostLayout";
const layouts = {
  PostSimple,
  PostLayout,
  PostBanner,
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}): Promise<Metadata | undefined> {
  const slug = decodeURI(params.slug.join("/"));
  const post = allBlogs.find((p) => p.slug === slug);
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
  return allBlogs.map((p) => ({ slug: p.slug.split("/").map((name) => decodeURI(name)) }));
};

export default async function Page({ params }: { params: { slug: string[] } }) {
  const slug = decodeURI(params.slug.join("/"));
  // Filter out drafts in production
  const sortedCoreContents = allCoreContent(sortPosts(allBlogs));
  const postIndex = sortedCoreContents.findIndex((p) => p.slug === slug);
  if (postIndex === -1) {
    return notFound();
  }

  const prev = sortedCoreContents[postIndex + 1];
  const next = sortedCoreContents[postIndex - 1];
  const post = allBlogs.find((p) => p.slug === slug) as Blog;
  const authorList = post?.authors || ["default"];
  const authorDetails = authorList.map((author) => {
    const authorResults = allAuthors.find((p) => p.slug === author);
    return coreContent(authorResults as Authors);
  });
  const mainContent = coreContent(post);
  const jsonLd = post.structuredData;
  jsonLd["author"] = authorDetails.map((author) => {
    return {
      "@type": "Person",
      name: author.name,
    };
  });

  const Layout = layouts[post.layout || defaultLayout];

  // Create breadcrumb items for the post
  const breadcrumbItems = [
    { name: "Home", url: siteMetadata.siteUrl },
    { name: "Blog", url: `${siteMetadata.siteUrl}/blog` },
    { name: post.title, url: `${siteMetadata.siteUrl}/${post.path}` },
  ];

  return (
    <>
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
        <MDXLayoutRenderer code={post.body.code} components={components} toc={post.toc} />
        <OpportunitiesCard />
      </Layout>
    </>
  );
}
