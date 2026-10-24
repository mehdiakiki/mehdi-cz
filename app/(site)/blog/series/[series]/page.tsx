import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allBlogs } from "contentlayer/generated";
import { availableEditorialSeries, publishedSeriesParts } from "lib/editorial-navigation.mjs";
import Link from "@/components/Link";
import { BreadcrumbJsonLd, JsonLd } from "@/components/JsonLd";
import siteMetadata from "@/data/siteMetadata";

type PageProps = { params: Promise<{ series: string }> };
export const dynamicParams = false;
export const revalidate = false;

function availableSeries(slug: string) {
  return availableEditorialSeries(allBlogs).find((item) => item.slug === slug);
}

export function generateStaticParams() {
  return availableEditorialSeries(allBlogs).map((item) => ({ series: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata | undefined> {
  const { series: slug } = await params;
  const series = availableSeries(slug);
  if (!series) return;
  return {
    title: series.title,
    description: series.description,
    alternates: { canonical: `/blog/series/${series.slug}` },
    openGraph: {
      title: series.title,
      description: series.description,
      url: `/blog/series/${series.slug}`,
      type: "website",
    },
  };
}

export default async function EditorialSeriesPage({ params }: PageProps) {
  const { series: slug } = await params;
  const series = availableSeries(slug);
  if (!series) notFound();
  const parts = publishedSeriesParts(series, allBlogs);
  const url = `${siteMetadata.siteUrl}/blog/series/${series.slug}`;
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Writing", url: `${siteMetadata.siteUrl}/blog` },
          { name: series.title, url },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: series.title,
          description: series.description,
          url,
          hasPart: parts.map((post) => ({
            "@type": "Article",
            name: post.title,
            url: `${siteMetadata.siteUrl}/blog/${post.slug}`,
          })),
        }}
      />
      <header className="max-w-3xl py-12">
        <Link href="/blog">Writing</Link>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">{series.title}</h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
          {series.introduction}
        </p>
      </header>
      <ol className="list-decimal divide-y divide-gray-200 pl-6 dark:divide-gray-800">
        {parts.map((post) => (
          <li key={post.slug} className="py-6 pl-2">
            <article>
              <h2 className="text-xl font-semibold">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">{post.summary}</p>
              <time dateTime={post.date} className="mt-2 block text-sm text-gray-500">
                {new Date(post.date).toLocaleDateString("en-GB", {
                  timeZone: "UTC",
                  dateStyle: "long",
                })}
              </time>
            </article>
          </li>
        ))}
      </ol>
    </>
  );
}
