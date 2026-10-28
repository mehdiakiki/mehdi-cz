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

## Editorial preferences

- Use short sentences and familiar words that are easy for non-native English readers.
- Keep a natural, conversational voice. Explain unfamiliar terms and use concrete problems.
- Do not invent a personal history or manufacture grammar mistakes to suggest an identity.
- The next thirty proposed articles focus on established SQL databases and database internals.
- Every executable example in that series must be Rust. Put SQL in Rust query calls as needed.
- The long-term reference-site ambition includes software engineering and development. Build outward from the existing Rust and database expertise. Research recurring reader problems, competing answers and current site coverage before proposing each batch. Keep traffic potential separate from observed search or analytics data. The October 28 priorities and evidence are in [the reader-demand brief](docs/editorial/sql-rust-demand-research-2026-10-28.json).
