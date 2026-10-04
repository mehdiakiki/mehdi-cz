import Link from "@/components/Link";
import { getContentCluster, type ContentClusterSlug } from "@/data/content-clusters.mjs";
import type { RelatedWritingItem } from "lib/related-writing.mjs";

type InvestigationContext = {
  title: string;
  href: string;
  parts: Array<{ href: string; title: string; current: boolean }>;
};

type OpportunitiesCardProps = {
  clusterSlug?: ContentClusterSlug;
  currentSlug?: string;
  relatedPosts?: RelatedWritingItem[];
  investigation?: InvestigationContext;
};

const kindLabels: Record<RelatedWritingItem["kind"], string> = {
  investigation: "Investigation",
  article: "Article",
};

function InvestigationParts({
  investigation,
  currentSlug,
}: {
  investigation: InvestigationContext;
  currentSlug?: string;
}) {
  return (
    <div>
      <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.14em] uppercase">
        Investigation
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
        <Link
          href={investigation.href}
          className="hover:text-primary-600 dark:hover:text-primary-400"
          data-umami-event="article-investigation-click"
          data-umami-event-source={currentSlug || "article"}
        >
          {investigation.title}
        </Link>
      </h2>
      <ol className="mt-5 list-decimal space-y-2 pl-6 leading-6 text-gray-500 marker:text-gray-400 dark:text-gray-400">
        {investigation.parts.map((part) => (
          <li key={part.href}>
            {part.current ? (
              <span aria-current="page" className="font-semibold text-gray-950 dark:text-gray-100">
                {part.title}
              </span>
            ) : (
              <Link
                href={part.href}
                className="hover:text-primary-600 dark:hover:text-primary-400 font-medium text-gray-700 dark:text-gray-300"
                data-umami-event="article-investigation-part-click"
                data-umami-event-source={currentSlug || "article"}
              >
                {part.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ContinueReading({
  relatedPosts,
  currentSlug,
  clusterSlug,
}: {
  relatedPosts: RelatedWritingItem[];
  currentSlug?: string;
  clusterSlug?: string;
}) {
  return (
    <div>
      <h3 className="font-bold text-gray-950 dark:text-gray-100">Continue reading</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {relatedPosts.map((post) => (
          <li key={post.href} className="border-l-2 border-gray-200 pl-4 dark:border-gray-700">
            <p className="text-xs font-semibold tracking-[0.12em] text-gray-500 uppercase dark:text-gray-400">
              {kindLabels[post.kind]}
            </p>
            <Link
              href={post.href}
              className="hover:text-primary-600 dark:hover:text-primary-400 leading-6 font-medium text-gray-800 dark:text-gray-200"
              data-umami-event="article-related-click"
              data-umami-event-source={currentSlug || "article"}
              data-umami-event-destination={post.href}
              data-umami-event-kind={post.kind}
              {...(clusterSlug ? { "data-umami-event-cluster": clusterSlug } : {})}
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const OpportunitiesCard = ({
  clusterSlug,
  currentSlug,
  relatedPosts = [],
  investigation,
}: OpportunitiesCardProps) => {
  const cluster = getContentCluster(clusterSlug);

  return (
    <aside className="not-prose my-12 space-y-9 border-t border-gray-200 pt-9 dark:border-gray-800">
      {investigation && investigation.parts.length > 1 && (
        <InvestigationParts investigation={investigation} currentSlug={currentSlug} />
      )}

      {relatedPosts.length > 0 && (
        <ContinueReading
          relatedPosts={relatedPosts}
          currentSlug={currentSlug}
          clusterSlug={cluster?.slug}
        />
      )}

      {cluster ? (
        <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-900">
          <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.14em] uppercase">
            Series
          </p>
          <h3 className="mt-2 text-xl font-bold text-gray-950 dark:text-gray-100">
            <Link
              href={`/blog/topics/${cluster.slug}`}
              className="hover:text-primary-600 dark:hover:text-primary-400"
              data-umami-event="article-cluster-click"
              data-umami-event-source={currentSlug || "article"}
              data-umami-event-cluster={cluster.slug}
            >
              {cluster.title}
            </Link>
          </h3>
          <p className="mt-3 max-w-3xl leading-7 text-gray-600 dark:text-gray-300">
            {cluster.description}
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
      ) : (
        <div>
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
        </div>
      )}
    </aside>
  );
};

export default OpportunitiesCard;
