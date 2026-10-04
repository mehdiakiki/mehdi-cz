import { Authors, allAuthors } from "contentlayer/generated";
import { MDXLayoutRenderer } from "pliny/mdx-components";
import { coreContent } from "pliny/utils/contentlayer";
import AuthorLayout from "@/layouts/AuthorLayout";
import { PersonJsonLd } from "@/components/JsonLd";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "About",
  description:
    "About Mehdi Akiki's work across startup engineering, distributed systems, financial software, developer tooling, and open source.",
});

export default function About() {
  const author = allAuthors.find((person) => person.slug === "default") as Authors;
  const content = coreContent(author);

  return (
    <>
      <PersonJsonLd />
      <AuthorLayout content={content}>
        <MDXLayoutRenderer code={author.body.code} />
      </AuthorLayout>
    </>
  );
}
