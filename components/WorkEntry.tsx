import Link from "./Link";
import type { WorkItem } from "@/data/workData";

interface WorkEntryProps {
  item: WorkItem;
}

const rows: { key: "problem" | "depth" | "decision"; label: string }[] = [
  { key: "problem", label: "Problem" },
  { key: "depth", label: "How far down" },
  { key: "decision", label: "What I changed or decided" },
];

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
        <p className="text-primary-600 dark:text-primary-400 mt-2 text-sm font-medium">
          {item.context}
        </p>
      </header>

      <div>
        <dl className="space-y-4">
          {rows.map((row) => (
            <div key={row.key}>
              <dt className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                {row.label}
              </dt>
              <dd className="mt-1 text-lg leading-8 text-gray-700 dark:text-gray-300">
                {item[row.key]}
              </dd>
            </div>
          ))}
        </dl>

        {item.constrained && (
          <p className="mt-4 border-l-2 border-gray-300 pl-4 leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
            {item.constrained}
          </p>
        )}

        {item.evidence.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {item.evidence.map((link) => (
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
