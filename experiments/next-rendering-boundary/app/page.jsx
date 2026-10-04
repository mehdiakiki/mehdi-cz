const cases = [
  ["/server", "Server Component", "SSR HTML plus the inline RSC tree."],
  ["/client-props", "Client component with props", "SSR HTML plus serialized client props."],
  ["/client-fetch", "Client fetch", "A small shell followed by JavaScript and one JSON request."],
  ["/document", "Plain HTML response", "One HTML representation without React hydration."],
];

export default function Home() {
  return (
    <main>
      <h1>Rendering boundary reproduction</h1>
      <p className="summary">
        Every route represents the same 360-record archive using a different delivery contract.
      </p>
      <ul className="archive">
        {cases.map(([href, title, description]) => (
          <li key={href}>
            <article>
              <h2>
                <a href={href}>{title}</a>
              </h2>
              <p>{description}</p>
            </article>
          </li>
        ))}
      </ul>
    </main>
  );
}
