import { Suspense } from "react";
import { connection } from "next/server";

const slugs = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf"];

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export default function PartialProduct({ params }) {
  return (
    <main>
      <Suspense fallback={<p>Loading static content…</p>}>
        <SlugContent params={params} />
      </Suspense>
      <Suspense fallback={<p>Loading dynamic content…</p>}>
        <DynamicContent />
      </Suspense>
    </main>
  );
}

async function SlugContent({ params }) {
  const { slug } = await params;
  return <h1 data-slug-content>{slug}</h1>;
}

async function DynamicContent() {
  await connection();
  return <p data-dynamic-content>Dynamic content</p>;
}
