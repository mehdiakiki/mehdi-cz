import { projectsData } from "@/data/projectsData";
import WorkCard from "@/components/WorkCard";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({ title: "Projects" });

export default function Projects() {
  return (
    <>
      <div className="space-y-2 pb-8 pt-6 text-center md:space-y-5">
        <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
          Work
        </h1>
        <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
          Projects & Open-Source Contributions
        </p>
      </div>
      <div className="container py-12">
        <div className="-m-4 flex flex-wrap">
          {projectsData.map((d) => (
            <WorkCard
              key={d.title}
              title={d.title}
              description={d.description}
              imgSrc={d.imgSrc}
              href={d.href}
              type={d.type}
            />
          ))}
        </div>
      </div>

      <section className="space-y-4 rounded-lg bg-gray-50 p-8 text-center dark:bg-gray-900">
        <h2 className="text-2xl font-bold md:text-3xl">Have a Project in Mind?</h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          I'm available for <strong>full-time</strong>, <strong>contract</strong>, and{" "}
          <strong>freelance</strong> work. Let's discuss how I can help.
        </p>
        <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
          <a
            href="https://cal.com/mehdicz/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-primary-500 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700"
          >
            Book a Discovery Call
          </a>
          <a
            href="/contact"
            className="inline-block rounded-lg border border-gray-300 px-8 py-3 text-lg font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Send a Message
          </a>
        </div>
      </section>
    </>
  );
}
