import Link from "@/components/Link";
import { getContentCluster, type ContentClusterSlug } from "@/data/content-clusters.mjs";

type RelatedPost = {
  slug: string;
  title: string;
};

type OpportunitiesCardProps = {
  clusterSlug?: ContentClusterSlug;
  currentSlug?: string;
  relatedPosts?: RelatedPost[];
};

const OpportunitiesCard = ({
  clusterSlug,
  currentSlug,
  relatedPosts = [],
}: OpportunitiesCardProps) => {
  const cluster = getContentCluster(clusterSlug);

  if (!cluster) {
    return (
      <aside className="my-10 border-t border-gray-200 pt-8 dark:border-gray-800">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-wide uppercase">
          About the author
        </p>
        <p className="mt-3 max-w-2xl leading-7 text-gray-700 dark:text-gray-300">
          Mehdi Akiki builds and operates startup products, distributed systems, developer tools,
          and open-source software. Coding remains part of the work, including every open-source
          contribution.
        </p>
        <div className="mt-5 flex flex-wrap gap-5">
          <Link
            href="/work"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            data-umami-event="article-professional-cta"
            data-umami-event-source={currentSlug || "article"}
            data-umami-event-destination="work"
          >
            Selected work &rarr;
          </Link>
          <Link
            href="/open-source"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            data-umami-event="article-professional-cta"
            data-umami-event-source={currentSlug || "article"}
            data-umami-event-destination="open-source"
          >
            Open source &rarr;
          </Link>
          <Link
            href="/contact"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            data-umami-event="article-professional-cta"
            data-umami-event-source={currentSlug || "article"}
            data-umami-event-destination="contact"
          >
            Start a conversation &rarr;
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="my-12 border-t border-gray-200 pt-9 dark:border-gray-800">
      <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.14em] uppercase">
        Part of a technical series
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
        <Link
          href={`/blog/topics/${cluster.slug}`}
          className="hover:text-primary-600 dark:hover:text-primary-400"
          data-umami-event="article-cluster-click"
          data-umami-event-source={currentSlug || "article"}
          data-umami-event-cluster={cluster.slug}
        >
          {cluster.title}
        </Link>
      </h2>
      <p className="mt-3 max-w-3xl leading-7 text-gray-600 dark:text-gray-300">
        {cluster.description}
      </p>

      {relatedPosts.length > 0 && (
        <div className="mt-7">
          <h3 className="font-bold text-gray-950 dark:text-gray-100">Continue reading</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {relatedPosts.map((post) => (
              <li key={post.slug} className="border-l-2 border-gray-200 pl-4 dark:border-gray-700">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-primary-600 dark:hover:text-primary-400 leading-6 font-medium text-gray-800 dark:text-gray-200"
                  data-umami-event="article-related-click"
                  data-umami-event-source={currentSlug || "article"}
                  data-umami-event-destination={post.slug}
                  data-umami-event-cluster={cluster.slug}
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-900">
        <h3 className="text-xl font-bold text-gray-950 dark:text-gray-100">{cluster.cta.title}</h3>
        <p className="mt-3 max-w-3xl leading-7 text-gray-600 dark:text-gray-300">
          {cluster.cta.description}
        </p>
        <div className="mt-5 flex flex-wrap gap-5">
          <Link
            href={cluster.cta.primary.href}
            className="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
            data-umami-event="article-professional-cta"
            data-umami-event-source={currentSlug || "article"}
            data-umami-event-cluster={cluster.slug}
            data-umami-event-destination={cluster.cta.primary.href}
          >
            {cluster.cta.primary.label} &rarr;
          </Link>
          <Link
            href={cluster.cta.secondary.href}
            className="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
            data-umami-event="article-professional-cta"
            data-umami-event-source={currentSlug || "article"}
            data-umami-event-cluster={cluster.slug}
            data-umami-event-destination={cluster.cta.secondary.href}
          >
            {cluster.cta.secondary.label} &rarr;
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default OpportunitiesCard;
