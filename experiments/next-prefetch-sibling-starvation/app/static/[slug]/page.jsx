const slugs = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf"];

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export default async function StaticProduct({ params }) {
  const { slug } = await params;
  return (
    <main>
      <h1 data-slug-content>{slug}</h1>
      <p>{`${slug}:`.repeat(1_024)}</p>
    </main>
  );
}
