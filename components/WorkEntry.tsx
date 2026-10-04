import Link from "./Link";
import type { WorkItem } from "@/data/workData";

interface WorkEntryProps {
  item: WorkItem;
}

export default function WorkEntry({ item }: WorkEntryProps) {
  return (
    <article
      id={item.id}
      className="grid scroll-mt-8 gap-5 border-t border-gray-200 py-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] md:gap-10 dark:border-gray-800"
    >
      <header>
        <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {item.title}
        </h3>
        <p className="text-primary-600 dark:text-primary-400 mt-1 text-sm font-medium tracking-wide uppercase">
          {item.role}
        </p>
      </header>

      <div>
        <p className="text-lg leading-8 text-gray-700 dark:text-gray-300">{item.summary}</p>

        <ul className="mt-5 space-y-3 text-gray-600 dark:text-gray-400">
          {item.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-3 leading-7">
              <span
                aria-hidden="true"
                className="bg-primary-500 mt-3 h-1.5 w-1.5 shrink-0 rounded-full"
              />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2" aria-label={`${item.title} areas`}>
          {item.areas.map((area) => (
            <span
              key={area}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-400"
            >
              {area}
            </span>
          ))}
        </div>

        {item.links && item.links.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {item.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              >
                {link.label} &rarr;
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
