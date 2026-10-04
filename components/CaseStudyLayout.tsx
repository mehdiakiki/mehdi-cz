import type { ReactNode } from "react";
import Link from "./Link";

interface CaseStudyLink {
  label: string;
  href: string;
}

interface CaseStudyLayoutProps {
  eyebrow: string;
  title: string;
  summary: string;
  links?: CaseStudyLink[];
  children: ReactNode;
}

export default function CaseStudyLayout({
  eyebrow,
  title,
  summary,
  links = [],
  children,
}: CaseStudyLayoutProps) {
  return (
    <article className="pb-16">
      <header className="max-w-4xl pt-8 pb-12 md:pt-12 md:pb-16">
        <Link
          href="/work"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-semibold"
        >
          &larr; Work
        </Link>
        <p className="text-primary-600 dark:text-primary-400 mt-10 text-sm font-semibold tracking-[0.16em] uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          {title}
        </h1>
        <p className="mt-6 max-w-3xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          {summary}
        </p>
        {links.length > 0 && (
          <div className="mt-7 flex flex-wrap gap-5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
              >
                {link.label} &rarr;
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="prose dark:prose-invert prose-headings:tracking-tight prose-a:text-primary-700 prose-a:no-underline hover:prose-a:text-primary-800 dark:prose-a:text-primary-400 dark:hover:prose-a:text-primary-300 max-w-4xl">
        {children}
      </div>
    </article>
  );
}
