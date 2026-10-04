// app/blog/tags/[tag]/page/[page]/page.tsx
import ListLayoutWithTags from "@/layouts/ListLayoutWithTags";
import { allCoreContent, sortPosts } from "pliny/utils/contentlayer";
import { allBlogs, type Blog } from "contentlayer/generated";
import { genPageMetadata } from "app/seo";
import { slug } from "github-slugger";
import { filterVisiblePosts } from "lib/publication.mjs";
import { filterWritingPosts } from "lib/content-format.mjs";

const POSTS_PER_PAGE = 5;

export const generateStaticParams = () => {
  const posts = allCoreContent(sortPosts(filterWritingPosts(filterVisiblePosts<Blog>(allBlogs))));
  const tags = Array.from(new Set(posts.flatMap((p) => p.tags)));

  const params: Array<{ tag: string; page: string }> = [];
  for (const tag of tags) {
    const taggedPosts = posts.filter((post) => post.tags.map((t) => slug(t)).includes(slug(tag)));
    const totalPages = Math.ceil(taggedPosts.length / POSTS_PER_PAGE);

    for (let i = 1; i <= totalPages; i++) {
      params.push({
        tag: slug(tag),
        page: i.toString(),
      });
    }
  }

  return params;
};

export const metadata = genPageMetadata({ title: "Tagged Posts" });

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string; page: string }>;
}) {
  const { tag, page } = await params;
  const pageNumber = parseInt(page);

  const posts = allCoreContent(sortPosts(filterWritingPosts(filterVisiblePosts<Blog>(allBlogs))));
  const filteredPosts = posts.filter((post) => post.tags.map((t) => slug(t)).includes(tag));

  const initialDisplayPosts = filteredPosts.slice(
    POSTS_PER_PAGE * (pageNumber - 1),
    POSTS_PER_PAGE * pageNumber
  );

  const pagination = {
    currentPage: pageNumber,
    totalPages: Math.ceil(filteredPosts.length / POSTS_PER_PAGE),
  };

  // Find the original tag name (not slugified)
  const originalTag =
    Array.from(new Set(posts.flatMap((p) => p.tags))).find((t) => slug(t) === tag) || tag;

  return (
    <ListLayoutWithTags
      posts={filteredPosts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      title={`Posts tagged "${originalTag}"`}
      basePath={`/blog/tags/${tag}`}
    />
  );
}
