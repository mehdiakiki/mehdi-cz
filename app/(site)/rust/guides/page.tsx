import type { Metadata } from "next";
import { allBlogs } from "contentlayer/generated";
import Link from "@/components/Link";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import catalog from "@/data/agent-guides.json";
import siteMetadata from "@/data/siteMetadata";
import { isPostPublished } from "lib/publication.mjs";

const pagePath = "/rust/guides";

export const metadata: Metadata = {
  title: "Rust and PostgreSQL troubleshooting",
  description:
    "Find a Rust database guide by the problem you see: waiting requests, uncertain writes, retained memory, slow downloads, or an agent's database tool.",
  alternates: { canonical: pagePath },
};

export default function RustGuides() {
  const posts = new Map(allBlogs.map((post) => [post.slug, post]));
  const now = new Date();
  const guides = catalog.guides.filter((guide) => {
    const post = posts.get(guide.slug);
    return (
      post &&
      isPostPublished(post, now) &&
      post.reviewed === true &&
      post.reviewedHash === guide.reviewedHash
    );
  });

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Rust", url: `${siteMetadata.siteUrl}/rust` },
          { name: "Database questions", url: `${siteMetadata.siteUrl}${pagePath}` },
        ]}
      />
      <div className="max-w-3xl py-10 md:py-14">
        <Link
          href="/rust"
          className="text-primary-600 dark:text-primary-400 text-sm font-medium"
        >
          Back to Rust
        </Link>
        <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
          Rust and PostgreSQL troubleshooting
        </h1>
        <p className="mt-5 text-lg leading-8 text-gray-600 dark:text-gray-400">
          A request is stuck, a write returns an error, or memory keeps growing. Start with the
          question closest to what you see. Each guide follows a small reproduction and explains
          what its result can tell you.
        </p>
      </div>

      <div className="max-w-3xl divide-y divide-gray-200 dark:divide-gray-800">
        {guides.map((guide) => (
          <section key={guide.slug} aria-labelledby={guide.slug} className="py-8 first:pt-0">
            <h2 id={guide.slug} className="text-2xl font-semibold tracking-tight">
              <Link
                href={`/blog/${guide.slug}`}
                className="hover:text-primary-600 dark:hover:text-primary-400"
              >
                {guide.question}
              </Link>
            </h2>
            <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">
              {guide.useWhen.join(" ")}
            </p>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
              <span className="font-medium">Keep in mind:</span> {guide.limitations[0]}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link
                href={`/blog/${guide.slug}`}
                className="text-primary-600 dark:text-primary-400 font-medium"
              >
                Read the guide &rarr;
              </Link>
              <a
                href={`/blog/${guide.slug}.md`}
                className="text-gray-500 underline underline-offset-4 dark:text-gray-400"
              >
                Markdown
              </a>
            </div>
          </section>
        ))}
      </div>

      <p className="max-w-3xl border-t border-gray-200 pt-8 pb-12 leading-7 text-gray-600 dark:border-gray-800 dark:text-gray-400">
        For other symptoms, try the{" "}
        <Link href="/rust-failure-atlas" className="text-primary-600 dark:text-primary-400">
          Rust Failure Atlas
        </Link>
        . You can also explore the{" "}
        <Link href="/rust" className="text-primary-600 dark:text-primary-400">
          Rust reading paths
        </Link>
        .
      </p>
    </>
  );
}
