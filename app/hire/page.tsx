import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Hire Mehdi Akiki | Full-Stack Engineer with Systems Depth",
  description:
    "Hire experienced software engineer Mehdi Akiki for full-stack development, systems engineering, AI integration. Available for project-based, hourly, or contract work.",
});

export default function HireMe() {
  return (
    <>
      <div className="space-y-4 pb-8 pt-6 text-center md:pt-10">
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          Hire Mehdi Akiki — Full-Stack Engineer with Systems Depth
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 md:text-xl">
          I build production-grade software for teams that need more than a developer — someone who
          understands the system, owns the problem, and ships work that holds up under real load.
        </p>
      </div>

      <div className="container mx-auto max-w-4xl space-y-10 px-4">
        {/* About Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold md:text-3xl">About</h2>
          <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            I've spent years working across the full stack, from React frontends to Rust backends,
            with production experience in financial infrastructure and open-source contributions to
            codebases like Rust, Deno, and Mozilla. I take on freelance work selectively — projects
            where the technical bar is high and the outcome actually matters.
          </p>
        </section>

        {/* What I Can Do For You */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold md:text-3xl">What I Can Do For You</h2>
          <ul className="space-y-3 text-lg">
            <li className="flex items-start">
              <span className="mr-3 mt-1 text-primary-500">✓</span>
              <span>
                <strong>Full-Stack Development:</strong> End-to-end application development — React,
                Next.js, TypeScript on the front end; Python, Go, Rust, Java on the back. I care
                about architecture, not just delivery.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1 text-primary-500">✓</span>
              <span>
                <strong>Systems & Backend Engineering:</strong> Distributed systems, microservices,
                RESTful and GraphQL APIs, low-latency services. I've built systems where performance
                and correctness aren't negotiable — trading infrastructure, real-time data pipelines,
                observability tooling.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1 text-primary-500">✓</span>
              <span>
                <strong>AI Engineering:</strong> Not prompting, engineering. I design and build AI
                systems that are reliable in production: multi-step agent pipelines with tool use and
                memory, RAG architectures with proper chunking strategies, retrieval tuning, and
                re-ranking, LLM orchestration with attention to latency, cost, and failure modes, and
                evaluation pipelines so you know when the system is actually working. If you're
                moving from a prototype that sometimes works to a system that consistently works,
                that's the problem I'm interested in.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1 text-primary-500">✓</span>
              <span>
                <strong>Tech Stack Migration & Modernization:</strong> Legacy system migrations,
                framework upgrades, incremental rewrites that don't stop the business. I've navigated
                codebases where the cost of being wrong is high.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1 text-primary-500">✓</span>
              <span>
                <strong>Architecture Review & Consulting:</strong> Codebase audits, bottleneck
                identification, architectural recommendations with tradeoffs clearly laid out — not
                just a report, but actionable next steps.
              </span>
            </li>
          </ul>
        </section>

        {/* Engagement Models */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold md:text-3xl">How We Can Work Together</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
              <h3 className="mb-3 text-xl font-semibold">Hourly</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Best for ongoing engineering support, consulting, or work where requirements are
                still taking shape. You get flexibility; I stay close to the problem.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
              <h3 className="mb-3 text-xl font-semibold">Project-Based</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Fixed scope, clear deliverables, defined timeline. Best when you know what you need
                and want someone to own it completely.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
              <h3 className="mb-3 text-xl font-semibold">Contract</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Long-term part-time or full-time engagement for teams that need a dedicated engineer
                without a full-time hire. I embed in your workflow and build alongside you.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="space-y-4 rounded-lg bg-gray-50 p-8 text-center dark:bg-gray-900">
          <h2 className="text-2xl font-bold md:text-3xl">Let's Work Together</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Book a 30-minute discovery call or send me a message to discuss your project.
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
            <span className="text-gray-400">or</span>
            <a
              href="/contact"
              className="inline-block rounded-lg border border-gray-300 px-8 py-3 text-lg font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Send a Message
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
