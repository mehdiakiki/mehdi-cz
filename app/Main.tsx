import Link from "@/components/Link";
import Tag from "@/components/Tag";
import siteMetadata from "@/data/siteMetadata";
import { formatDate } from "pliny/utils/formatDate";
import { WebsiteJsonLd } from "@/components/JsonLd";

const MAX_DISPLAY = 4;

export default function Home({ posts }) {
  return (
    <>
      <WebsiteJsonLd />
      <div>
        <div className="space-y-2 pt-6 pb-8 md:space-y-5">
          <h2 className="text-center text-2xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-3xl sm:leading-10 md:text-4xl md:leading-14 dark:text-gray-100">
            What I write about
          </h2>
        </div>

        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {!posts.length && "No posts found."}
          {posts.slice(0, MAX_DISPLAY).map((post: any) => {
            const { slug, date, title, summary, tags } = post;
            return (
              <li key={slug} className="py-6">
                <article className="space-y-2">
                  <div className="space-y-2 xl:space-y-0">
                    <dl>
                      <dt className="sr-only">Published on</dt>
                      <dd className="text-sm text-gray-500 dark:text-gray-400">
                        <time dateTime={date}>{formatDate(date, siteMetadata.locale)}</time>
                      </dd>
                    </dl>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <h2 className="text-xl leading-8 font-bold tracking-tight">
                          <Link href={`/blog/${slug}`} className="text-gray-900 dark:text-gray-100">
                            {title}
                          </Link>
                        </h2>
                        <div className="flex flex-wrap space-x-2">
                          {tags.map((tag: any) => (
                            <Tag key={tag} text={tag} />
                          ))}
                        </div>
                      </div>
                      <div className="prose max-w-none text-gray-500 dark:text-gray-400">
                        {summary}
                      </div>
                    </div>
                    <div className="text-base leading-6 font-medium">
                      <Link
                        href={`/blog/${slug}`}
                        className="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                        aria-label={`Read more: "${title}"`}
                      >
                        Read more &rarr;
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
      {posts.length > MAX_DISPLAY && (
        <div className="flex justify-center text-base leading-6 font-medium">
          <Link
            href="/blog"
            className="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
            aria-label="All posts"
          >
            All Posts &rarr;
          </Link>
        </div>
      )}
    </>
  );
}
