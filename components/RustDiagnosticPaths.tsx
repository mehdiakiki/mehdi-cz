import Link from "@/components/Link";
import type { AvailableRustDiagnosticPath } from "@/data/rust-diagnostic-paths.mjs";

export default function RustDiagnosticPaths({ paths }: { paths: AvailableRustDiagnosticPath[] }) {
  if (!paths.length) return null;
  return (
    <section
      id="start-with-a-symptom"
      className="py-12 md:py-16"
      aria-labelledby="diagnostic-paths-heading"
    >
      <h2
        id="diagnostic-paths-heading"
        className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
      >
        Start with the problem in front of you
      </h2>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-600 dark:text-gray-300">
        Choose a symptom, make the first check, then follow the explanation or a smaller failing
        case.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {paths.map((path) => (
          <section
            key={path.slug}
            className="rounded-lg border border-gray-200 p-5 dark:border-gray-800"
            aria-labelledby={`diagnose-${path.slug}`}
          >
            <h3
              id={`diagnose-${path.slug}`}
              className="text-xl font-semibold text-gray-950 dark:text-gray-100"
            >
              {path.title}
            </h3>
            <p className="mt-3 leading-7 text-gray-600 dark:text-gray-300">{path.firstCheck}</p>
            <ul className="mt-4 space-y-3">
              {path.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                    data-umami-event="atlas-diagnostic-open"
                    data-umami-event-path={path.slug}
                    data-umami-event-kind={link.kind}
                    data-umami-event-destination={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-6 leading-7 text-gray-600 dark:text-gray-300">
        To follow new engineering articles,{" "}
        <a
          href="/feed.xml"
          type="application/rss+xml"
          className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
          data-umami-event="atlas-feed-open"
        >
          subscribe with RSS
        </a>
        .
      </p>
    </section>
  );
}
