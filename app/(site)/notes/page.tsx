import { allBlogs, type Blog } from "contentlayer/generated";
import { allCoreContent, type CoreContent } from "pliny/utils/contentlayer";
import Link from "@/components/Link";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import siteMetadata from "@/data/siteMetadata";
import { genPageMetadata } from "app/seo";
import { filterNotePosts } from "lib/content-format.mjs";
import { filterVisiblePosts } from "lib/publication.mjs";

const description =
  "Short engineering notes by Mehdi Akiki: compact commands, implementation details, and practical observations kept separate from long-form technical writing.";

export const metadata = genPageMetadata({
  title: "Engineering Notes",
  description,
  alternates: {
    canonical: "/notes",
    types: { "application/rss+xml": `${siteMetadata.siteUrl}/notes.xml` },
  },
});

function NotesSection({
  id,
  title,
  description,
  notes,
}: {
  id: string;
  title: string;
  description: string;
  notes: CoreContent<Blog>[];
}) {
  if (notes.length === 0) return null;

  return (
    <section className="border-t border-gray-200 py-12 dark:border-gray-800" aria-labelledby={id}>
      <div className="max-w-3xl">
        <h2
          id={id}
          className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl dark:text-gray-100"
        >
          {title}
        </h2>
        <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">{description}</p>
      </div>

      <ul className="mt-7 grid gap-x-8 md:grid-cols-2">
        {notes.map((note) => (
          <li key={note.slug} className="border-b border-gray-200 py-5 dark:border-gray-800">
            <article>
              <h3 className="leading-7 font-bold">
                <Link
                  href={`/blog/${note.slug}`}
                  className="hover:text-primary-600 dark:hover:text-primary-400 text-gray-950 dark:text-gray-100"
                >
                  {note.title}
                </Link>
              </h3>
              {note.summary && (
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  {note.summary}
                </p>
              )}
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Notes() {
  const notes = allCoreContent(filterNotePosts(filterVisiblePosts<Blog>(allBlogs))).sort((a, b) =>
    a.title.localeCompare(b.title)
  );
  const shellNotes = notes.filter((note) => note.tags?.includes("bash"));
  const engineeringNotes = notes.filter((note) => !note.tags?.includes("bash"));

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteMetadata.siteUrl },
          { name: "Notes", url: `${siteMetadata.siteUrl}/notes` },
        ]}
      />

      <header className="max-w-4xl pt-8 pb-14 md:pt-12 md:pb-20">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
          Quick references
        </p>
        <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          Small things worth keeping
        </h1>
        <p className="mt-6 max-w-3xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          {notes.length} compact commands and observations collected while building software. They
          are intentionally short and written to be useful again without a long introduction.
        </p>
        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
          <Link
            href="/blog"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
          >
            Read the long-form writing &rarr;
          </Link>
          <Link
            href="/notes.xml"
            className="hover:text-primary-600 dark:hover:text-primary-400 font-semibold text-gray-600 dark:text-gray-300"
          >
            Notes RSS
          </Link>
        </div>
      </header>

      <NotesSection
        id="shell-unix-notes"
        title="Shell and Unix"
        description="Commands and shell behavior kept as a concise working reference."
        notes={shellNotes}
      />
      <NotesSection
        id="engineering-notes"
        title="Engineering and project work"
        description="Small observations about tools, communication, project evidence, and delivery."
        notes={engineeringNotes}
      />
    </>
  );
}
