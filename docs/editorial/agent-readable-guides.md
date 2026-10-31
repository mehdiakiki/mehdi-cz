# Agent access to the reviewed Rust guides

The collection covers pool waits, database timeouts, producer memory, uncertain commits, slow downloads, and a read-only PostgreSQL tool. Their article bodies stay unchanged. A person still gets the complete explanation, the Rust example, and the author's judgment at the existing URL.

The build generates a `.md` copy from each reviewed source. It removes frontmatter and adds the title, Mehdi Akiki's byline, dates, canonical URL, and immutable source link. It preserves the article body and code. The export accepts plain Markdown only. An MDX component needs a reviewed text alternative before export.

`/rust/guides` lets a person choose an investigation by its question. It uses the same catalog and shows only published articles with matching review hashes. Each entry includes a use case, one material limit, and links to the full HTML and Markdown versions. The participating articles link back to this page. Its URL is in the sitemap.

`/llms.txt` links to those copies. `/rust/guide-index` supplies named JSON fields for the reader's question, when the guide helps, useful observations, tested versions, evidence, and limits. This separate index leaves the site's compact search documents and failure-atlas wire format alone. The extensionless URL also fits the existing public crawl policy without opening private API paths.

`data/agent-guides.json` is the small, reviewed catalog. Every entry pins the source bytes and editorial review hash. Its source and Rust fixture links point to an immutable repository revision. When an article changes, review the text and companion metadata together, then refresh both hashes and provenance. The export omits drafts, held pages, future publications, invalid publication flags, and missing or stale review hashes, even in preview mode. It removes an old generated copy if that entry becomes ineligible.

The generator runs in the existing build before Next.js collects public files. The container already copies those public files. The runtime configuration also receives the small catalog needed for response headers. No endpoint reads a user-selected file or needs an unpublished MDX source at runtime.

Existing GitHub Actions run the publication cases and then request the built server. They check complete body parity, Markdown and JSON response types, canonical and alternate links, every cataloged guide path, and unknown or unexported-page 404s. They also check the question index, its visible limits, the article backlinks, and the sitemap. The hold test creates its own temporary hold; the HTTP checks also include any real held slugs. Task scenarios check that the metadata includes a useful observation and a material limitation. Those scenarios are deterministic contract checks. They are not evidence that a model retrieved the right page or made the right repair.

The discovery file is a convenience, not a promise of search placement or model citations. Keep normal HTML discovery, source quality, and the human explanation as the foundation.
