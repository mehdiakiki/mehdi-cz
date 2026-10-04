import Link from "@/components/Link";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "How I Work",
  description:
    "How Mehdi Akiki combines systems engineering, product judgment, and deliberate use of AI to build dependable software.",
});

const engineeringPrinciples = [
  {
    title: "Shorten the feedback loop",
    description:
      "I use models and agents to accelerate exploration, implementation, testing, review, and documentation when they improve the feedback loop.",
  },
  {
    title: "Keep judgment accountable",
    description:
      "Architecture, data boundaries, security, performance, and failure behavior still need decisions that can be explained and defended without appealing to the model.",
  },
  {
    title: "Match complexity to the problem",
    description:
      "A prompt, retrieval system, deterministic workflow, or agent are different tools. I prefer the simplest one that satisfies the actual product requirement.",
  },
  {
    title: "Build verification into the loop",
    description:
      "Tests, types, benchmarks, evaluations, reviewable diffs, permissions, and production telemetry turn generated output into evidence an engineer can trust.",
  },
];

const evidence = [
  {
    title: "Foundational product engineering",
    description:
      "At Inferal, I work across the core engine, ontology system, and Relay—the data-synchronization capability I built from the ground up.",
    href: "/work/inferal",
    linkLabel: "Inferal experience",
  },
  {
    title: "Systems that have to operate",
    description:
      "I founded MonitorMe and carried the open-source observability framework into several client environments through installation and configuration.",
    href: "/work/monitorme",
    linkLabel: "MonitorMe case study",
  },
  {
    title: "Hands-on systems depth",
    description:
      "Financial and healthcare systems, ten merged Rust compiler changes, contributions to Deno and rust-analyzer, and the Bitarena crate demonstrate the underlying engineering range.",
    href: "/open-source",
    linkLabel: "Open-source evidence",
  },
];

const aiNotes = [
  {
    title: "When You Do Not Need an AI Agent",
    description: "Choosing a simpler, more predictable system when autonomy adds no real value.",
    href: "/blog/when-you-dont-need-an-ai-agent",
  },
  {
    title: "RAG vs AI Agents vs Workflow Automation",
    description: "Matching the architecture to the product problem, operating cost, and risk.",
    href: "/blog/rag-vs-agents-vs-workflow-automation-startups",
  },
  {
    title: "Give Every Agent Tool Call a Deadline",
    description:
      "Treating tool execution as a production dependency with explicit failure behavior.",
    href: "/blog/agent-tool-call-deadline",
  },
];

export default function HowIWork() {
  return (
    <>
      <header className="max-w-4xl pt-8 pb-14 md:pt-12 md:pb-20">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
          Engineering practice
        </p>
        <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          AI accelerates the work. Engineering judgment owns the outcome.
        </h1>
        <p className="mt-6 max-w-3xl text-xl leading-9 text-gray-600 dark:text-gray-300">
          I use AI deliberately to examine more possibilities and shorten feedback loops. It is not
          a substitute for understanding the system, making the hard decision, or being accountable
          for what reaches production.
        </p>
      </header>

      <section
        className="border-y border-gray-200 py-14 dark:border-gray-800"
        aria-labelledby="working-model"
      >
        <div className="max-w-3xl">
          <h2
            id="working-model"
            className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            My working model
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400">
            Better models expand what an engineer can attempt. They do not remove the need for clear
            boundaries, domain knowledge, verification, or operational discipline.
          </p>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400">
            Coding remains part of my routine. I write the code for my contributions to the Rust
            compiler, Deno, and rust-analyzer, and I design and maintain Bitarena. This ongoing
            practice keeps my judgment current through implementation, tests, performance
            measurement, and maintainer review.
          </p>
        </div>

        <div className="mt-10 grid gap-x-8 gap-y-9 sm:grid-cols-2">
          {engineeringPrinciples.map((principle) => (
            <article
              key={principle.title}
              className="border-t border-gray-200 pt-5 dark:border-gray-800"
            >
              <h3 className="text-xl font-bold text-gray-950 dark:text-gray-100">
                {principle.title}
              </h3>
              <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">
                {principle.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="underlying-depth">
        <div className="max-w-3xl">
          <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
            Evidence in practice
          </p>
          <h2
            id="underlying-depth"
            className="mt-3 text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            The operating model is grounded in shipped systems
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400">
            These principles come from work where abstractions meet operational constraints,
            unfamiliar codebases, and product consequences.
          </p>
        </div>

        <div className="mt-10 divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {evidence.map((item) => (
            <article
              key={item.title}
              className="grid gap-4 py-7 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] md:gap-10"
            >
              <h3 className="text-xl font-bold text-gray-950 dark:text-gray-100">{item.title}</h3>
              <div>
                <p className="leading-7 text-gray-600 dark:text-gray-400">{item.description}</p>
                <Link
                  href={item.href}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-3 inline-block font-semibold"
                >
                  {item.linkLabel} &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="border-y border-gray-200 py-14 dark:border-gray-800"
        aria-labelledby="ai-reasoning"
      >
        <div className="grid gap-10 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.5fr)]">
          <div>
            <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
              Technical writing
            </p>
            <h2
              id="ai-reasoning"
              className="mt-3 text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
            >
              How I reason about AI systems
            </h2>
          </div>
          <div className="space-y-7">
            {aiNotes.map((note) => (
              <article key={note.href}>
                <Link
                  href={note.href}
                  className="hover:text-primary-600 dark:hover:text-primary-400 text-lg font-bold text-gray-950 dark:text-gray-100"
                >
                  {note.title} &rarr;
                </Link>
                <p className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
                  {note.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="useful-contexts">
        <div className="max-w-3xl">
          <h2
            id="useful-contexts"
            className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-100"
          >
            Where this combination matters
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400">
            I am interested in teams where AI supports a real product or engineering workflow. That
            includes systems-heavy products, agent infrastructure, developer tools, data platforms,
            and consequential backend or platform work.
          </p>
        </div>

        <div className="mt-9 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-7 dark:bg-gray-900/60">
            <p className="text-primary-700 dark:text-primary-400 text-sm font-semibold tracking-wide uppercase">
              Engineering teams
            </p>
            <p className="mt-3 leading-8 text-gray-600 dark:text-gray-400">
              Roles where systems depth, product judgment, and AI-assisted execution can reinforce
              one another over the life of a product.
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-7 dark:bg-gray-900/60">
            <p className="text-primary-700 dark:text-primary-400 text-sm font-semibold tracking-wide uppercase">
              Founders and CTOs
            </p>
            <p className="mt-3 leading-8 text-gray-600 dark:text-gray-400">
              Focused work where the challenge is choosing the right architecture, establishing a
              foundation, or making an AI-enabled production path dependable.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-5 border-t border-gray-200 pt-8 text-center dark:border-gray-800">
          <Link
            href="/contact"
            className="hover:bg-primary-600 dark:hover:bg-primary-400 rounded-md bg-gray-950 px-5 py-3 font-semibold text-white transition-colors dark:bg-white dark:text-gray-950"
          >
            Start with the context
          </Link>
          <Link
            href="/work"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
          >
            Review my work &rarr;
          </Link>
        </div>
      </section>
    </>
  );
}
