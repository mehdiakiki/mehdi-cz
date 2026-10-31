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
- Use Rust for executable examples in SQL and database articles. Put SQL in Rust query calls as needed.
- Write for human readers. Help a person understand a problem, make a decision, or fix something. Preserve the author's voice and judgment, with natural variation in structure and length.
- Use plain, accurate titles. Avoid keyword stuffing, filler, repetitive article templates, and splitting one useful answer into several thin pages.
- Ground personal observations in the author's actual experience. Use clearly described reproductions or hypothetical examples when there is no personal account.
- Assume readers can use AI to write and revise code. Give articles value through explicit requirements, competing explanations, counterexamples, observed evidence, and the tradeoffs of a repair. Treat AI suggestions as proposals to investigate; avoid unsupported claims about what AI can or cannot do.
- Assume readers can use AI to write the first implementation. Develop the judgment needed to specify correct behavior, investigate failures, compare repairs, and decide whether a change is ready to ship.
- Give each article a concrete question that generated code alone does not settle. Show useful evidence, competing explanations, and the limits of the conclusion. Keep setup instructions in service of that question.
- Treat AI-written code and tests as proposals. Derive the expected behavior from the requirement, and include a case that could expose a plausible wrong implementation. Do not claim that a task is beyond AI without evidence.

## Private planning

- Keep editorial strategy, traffic goals, analytics exports, audience research, and unpublished topic plans in the ignored `internal/editorial-strategy/` directory.
- Read `internal/editorial-strategy/AGENTS.md` for local planning context when it exists.
- In a linked worktree, check the main checkout's ignored directory for that local context.
- Do not copy private planning into tracked files, public pull-request descriptions, release notes, or CI artifacts. Public records should contain only the technical information needed to build, verify, and publish the site.
