import ListLayoutWithTags from "@/layouts/ListLayoutWithTags";
import { allCoreContent, sortPosts } from "pliny/utils/contentlayer";
import { allBlogs, type Blog } from "contentlayer/generated";
import { genPageMetadata } from "app/seo";
import { filterVisiblePosts } from "lib/publication.mjs";
import { filterWritingPosts } from "lib/content-format.mjs";

const POSTS_PER_PAGE = 5;

export const generateStaticParams = async () => {
  const totalPages = Math.ceil(
    filterWritingPosts(filterVisiblePosts<Blog>(allBlogs)).length / POSTS_PER_PAGE
  );
  const paths = Array.from({ length: totalPages }, (_, i) => ({ page: (i + 1).toString() }));

  return paths;
};

export const metadata = genPageMetadata({
  title: "Writing Archive",
  description: "The complete archive of engineering notes and tutorials by Mehdi Akiki.",
});

export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const posts = allCoreContent(sortPosts(filterWritingPosts(filterVisiblePosts<Blog>(allBlogs))));
  const pageNumber = parseInt(page);

  const initialDisplayPosts = posts.slice(
    POSTS_PER_PAGE * (pageNumber - 1),
    POSTS_PER_PAGE * pageNumber
  );

  const pagination = {
    currentPage: pageNumber,
    totalPages: Math.ceil(posts.length / POSTS_PER_PAGE),
  };

  return (
    <ListLayoutWithTags
      posts={posts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      title="Writing archive"
      basePath="/blog"
    />
  );
}
