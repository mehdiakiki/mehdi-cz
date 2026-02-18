import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Hire Full-Stack Software Developer | React, TypeScript, Rust, Go Expert",
  description:
    "Hire experienced software developer Mehdi Akiki for full-stack development, microservices, AI integration. Available for project-based, hourly, or contract work.",
});

export default function HireMe() {
  return (
    <>
      <div className="space-y-4 pb-8 pt-6 text-center md:pt-10">
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          Hire a Full-Stack Software Developer
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 md:text-xl">
          Build scalable systems and full-stack applications with an experienced software engineer.
          Fast delivery, modern tech stack, clean code.
        </p>
      </div>

      <div className="container mx-auto max-w-4xl space-y-10 px-4">
        {/* About Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold md:text-3xl">About Me</h2>
          <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            I'm Mehdi Akiki, a full-stack software developer and engineer with extensive experience
            building production-ready applications. I specialize in modern web technologies,
            microservices architecture, and AI-powered solutions.
          </p>
        </section>

        {/* What I Do */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold md:text-3xl">What I Can Do For You</h2>
          <ul className="space-y-3 text-lg">
            <li className="flex items-start">
              <span className="mr-3 mt-1 text-primary-500">✓</span>
              <span>
                <strong>Full-Stack Development:</strong> End-to-end application development using
                React, Next.js, TypeScript, Node.js, Python, Go, and Rust
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1 text-primary-500">✓</span>
              <span>
                <strong>Microservices & APIs:</strong> Design and build scalable backend systems,
                RESTful APIs, GraphQL, and distributed architectures
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1 text-primary-500">✓</span>
              <span>
                <strong>AI Integration:</strong> Implement LLM-powered features, RAG pipelines, and
                AI-assisted development workflows
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1 text-primary-500">✓</span>
              <span>
                <strong>Tech Stack Migration:</strong> Modernize legacy systems, migrate to new
                frameworks, and improve code quality
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1 text-primary-500">✓</span>
              <span>
                <strong>Code Audits & Consulting:</strong> Review architecture, identify
                bottlenecks, and provide actionable recommendations
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1 text-primary-500">✓</span>
              <span>
                <strong>Open Source Contributions:</strong> Experience contributing to Rust, Deno,
                Rust Analyzer, and other major projects
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
                Flexible hourly engagement for ongoing development, consulting, or support work.
                Ideal for evolving requirements.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
              <h3 className="mb-3 text-xl font-semibold">Project-Based</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Fixed-scope projects with clear deliverables and timeline. Best for well-defined
                features or complete applications.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
              <h3 className="mb-3 text-xl font-semibold">Contract</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Long-term partnerships for ongoing product development. Part-time or full-time
                availability.
              </p>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold md:text-3xl">Tech Stack</h2>
          <div className="flex flex-wrap gap-2">
            {[
              "React",
              "Next.js",
              "TypeScript",
              "JavaScript",
              "Node.js",
              "Python",
              "Go",
              "Rust",
              "PostgreSQL",
              "MongoDB",
              "Docker",
              "AWS",
              "Git",
              "REST APIs",
              "GraphQL",
            ].map((tech) => (
              <span
                key={tech}
                className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="space-y-4 rounded-lg bg-gray-50 p-8 text-center dark:bg-gray-900">
          <h2 className="text-2xl font-bold md:text-3xl">Let's Work Together</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            I'm open to <strong>freelance projects</strong> and{" "}
            <strong>U.S.-based full-time opportunities</strong> focused on building, scaling, or
            improving production software.
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Book a 30-minute discovery call to discuss your project.
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
      </div>
    </>
  );
}
