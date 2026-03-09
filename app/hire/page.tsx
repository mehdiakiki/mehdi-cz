import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Hire Mehdi Akiki — Backend, AI, and Systems Engineer",
  description:
    "I help startups and technical teams build, fix, and harden backend systems and AI workflows where bad decisions create real cost later. Available for architecture reviews, scoped builds, and embedded contracts.",
});

export default function HireMe() {
  return (
    <>
      <div className="space-y-4 pb-8 pt-6 text-center md:pt-10">
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          Hire Mehdi Akiki — Backend, AI, and Systems Engineer
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 md:text-xl">
          I help startups and technical teams build, fix, and harden software where the hard parts
          actually matter: backend systems, AI workflows, performance, reliability, and migrations.
        </p>
        <p className="text-base text-gray-500 dark:text-gray-500">
          Best fit: startups shipping AI features, backend-heavy SaaS, legacy systems that need
          modernization, and teams that need senior technical judgment without a full-time hire.
        </p>
        <div className="pt-2">
          <a
            href="https://cal.com/mehdicz/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-primary-500 px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700"
          >
            Book a Technical Discovery Call
          </a>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl space-y-10 px-4">
        {/* What I Help With */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold md:text-3xl">What I Help With</h2>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Production AI Systems</h3>
              <p className="text-gray-700 dark:text-gray-300">
                I build AI features designed to work in production, not just in demos. That includes
                agent workflows with tool use and multi-step execution, RAG systems with proper
                retrieval and evaluation, and LLM pipelines designed around latency, cost, and
                failure handling. If you have an AI prototype that is inconsistent, expensive, or
                fragile, I can help turn it into something usable.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Backend and Systems Engineering</h3>
              <p className="text-gray-700 dark:text-gray-300">
                APIs, service architecture, distributed systems, real-time pipelines, low-latency
                services, observability tooling, and hard production bugs. This is the work behind
                the product that users do not see directly but absolutely feel when it is done
                badly.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Full-Stack Product Development</h3>
              <p className="text-gray-700 dark:text-gray-300">
                When needed, I can own features end to end. Frontend in React and Next.js, backend
                in Go, Python, Rust, or Java. I care less about checking framework boxes and more
                about building software that stays understandable as it grows.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Migration and Modernization</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Framework upgrades, backend rewrites with clear boundaries, replacing brittle
                workflows incrementally. Sometimes the right answer is not a rewrite. I will tell
                you the difference.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Architecture Review and Technical Rescue</h3>
              <p className="text-gray-700 dark:text-gray-300">
                If your team is stuck, slowed down, or about to make an expensive technical mistake,
                I can step in and assess quickly. You get practical recommendations, clear
                tradeoffs, and a path forward — not just a report.
              </p>
            </div>
          </div>
        </section>

        {/* Why Clients Work With Me */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold md:text-3xl">Why Clients Work With Me</h2>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            I am a strong fit when the product has meaningful backend or systems complexity, an AI
            feature needs to be made reliable, performance or correctness matters, or the codebase
            is messy and the cost of being wrong is high. I have worked across financial and
            systems-heavy software and contributed to demanding open-source ecosystems including
            Rust, Deno, and Mozilla-related codebases.
          </p>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            You are not hiring me to look busy. You are hiring me to understand the problem, make
            strong technical decisions, and ship work that holds up once real users and real traffic
            enter the picture.
          </p>
        </section>

        {/* Engagement Models */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold md:text-3xl">Engagement Options</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
              <h3 className="mb-3 text-xl font-semibold">Architecture Review</h3>
              <p className="text-gray-600 dark:text-gray-400">
                A focused engagement to assess a system, feature, or technical direction. Good for
                founders making early architecture decisions, teams planning an AI feature, or
                codebases with scaling and reliability concerns.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
              <h3 className="mb-3 text-xl font-semibold">Scoped Build</h3>
              <p className="text-gray-600 dark:text-gray-400">
                A defined project with clear deliverables. Best for a backend service, an AI
                workflow or internal tool, or a feature that needs senior ownership end to end.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
              <h3 className="mb-3 text-xl font-semibold">Embedded Contract</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Part-time or full-time contract work inside your team. Best for startups that need a
                strong engineer without a permanent hire, or situations where execution speed
                matters.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="space-y-4 rounded-lg bg-gray-50 p-8 text-center dark:bg-gray-900">
          <h2 className="text-2xl font-bold md:text-3xl">Let's Talk</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            If you have a project, a bottleneck, or a system that needs deeper engineering work,
            send me a message. I am selective about the work I take on, but if the problem is real
            and technically meaningful, I am interested.
          </p>
          <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
            <a
              href="https://cal.com/mehdicz/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-primary-500 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700"
            >
              Book a Technical Discovery Call
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
