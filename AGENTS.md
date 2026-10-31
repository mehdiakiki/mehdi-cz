<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commit authorship preference

- The user must be the sole author of commits created for this repository.
  Use the repository's configured Git name and email.
- Do not add Codex, OpenAI, or other assistant attribution to commit authors,
  co-authors, sign-offs, commit messages, or automated credit trailers.
- When creating commits through an API, explicitly use the user's Git identity
  instead of relying on the authenticated service's default author.
- Keep this preference across future sessions in this repository.
- Article bylines and author metadata must credit Mehdi Akiki alone. Do not add assistant names or co-author credits to articles, feeds, social metadata, or structured author data.

## Editorial preferences

- Use short sentences and familiar words that are easy for non-native English readers.
- Keep a natural, conversational voice. Explain unfamiliar terms and use concrete problems.
- Do not invent a personal history or manufacture grammar mistakes to suggest an identity.
- The next thirty proposed articles focus on established SQL databases and database internals.
- Every executable example in that series must be Rust. Put SQL in Rust query calls as needed.
- Write for human readers. Help a person understand a problem, make a decision, or fix something. Preserve the author's voice and judgment, with natural variation in structure and length.
- Use plain, accurate titles. Avoid keyword stuffing, filler, repetitive article templates, and splitting one useful answer into several thin pages.
- Ground personal observations in the author's actual experience. Use clearly described reproductions or hypothetical examples when there is no personal account.
- Assume readers can use AI to write and revise code. Give articles value through explicit requirements, competing explanations, counterexamples, observed evidence, and the tradeoffs of a repair. Treat AI suggestions as proposals to investigate; avoid unsupported claims about what AI can or cannot do.
- Prioritize Rust debugging across application and database boundaries, cancellation and uncertain outcomes, memory budgets and backpressure, deliberate failure testing, build diagnosis, and integration with existing systems. Give the first three themes the most attention.

## Site growth direction

- The long-term ambition is to become one of the most visited Rust websites. The next traffic milestone is 1,000 per day; the author reported almost 200 per day on October 27, 2026. Keep comparisons on the same analytics metric.
- Keep the established publication cadence and editorial review. Use traffic as feedback about reader needs while protecting the usefulness and human voice of each article.
- Audience growth should also help interested readers find the author's engineering work and start relevant conversations about roles, projects, and collaboration. Track those opportunities alongside traffic.
- The accepted direction and candidate follow-ups are in [the Rust editorial direction](docs/editorial/rust-reader-growth-direction-2026-10-27.md).
- The long-term reference-site ambition includes software engineering and development. Build outward from the existing Rust and database expertise. Research recurring reader problems, competing answers and current site coverage before proposing each batch. Keep traffic potential separate from observed search or analytics data. The October 28 priorities and evidence are in [the reader-demand brief](docs/editorial/sql-rust-demand-research-2026-10-28.json).
