# Pin Playground

An interactive Rust playground embedded in a Next.js blog, built as a companion to the article *"Pin Explained: How I Finally Stopped Memorizing and Started Understanding."*

Readers can edit and run 8 progressive examples that demonstrate Pin's mechanics — from memory corruption without Pin, to safe pinning patterns, to deliberate contract violations.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Docker Compose                                            │
│                                                            │
│  ┌─────────────┐           ┌──────────────────────────┐    │
│  │  Next.js     │──/sign──▶│  (handled by Next.js)    │    │
│  │  :3000       │           │  signs request with HMAC │    │
│  │              │──/exec──▶│                          │    │
│  └─────────────┘           └──────────────────────────┘    │
│         │                                                  │
│         │  /api/playground/*                               │
│         ▼                                                  │
│  ┌──────────────────────────┐        ┌──────────┐          │
│  │  pin-playground (Axum)   │───────▶│  /data/  │          │
│  │  :3001                   │  disk  │  cache   │          │
│  │                          │        └──────────┘          │
│  │  ✓ HMAC validation       │                              │
│  │  ✓ Origin checking       │                              │
│  │  ✓ Rate limiting         │                              │
│  │  ✓ Code sanitization     │                              │
│  │  ✓ Similarity checking   │                              │
│  │  ✓ Two-tier caching      │                              │
│  └──────────┬───────────────┘                              │
│             │ HTTPS (cache miss only)                      │
└─────────────│──────────────────────────────────────────────┘
              ▼
    play.rust-lang.org/execute
```

## Security Model

The service is designed for a publicly accessible VPS. Every request passes through 7 security layers:

| Layer | What | Why |
|-------|------|-----|
| 1. Origin validation | Checks `Origin` / `Referer` header | Blocks requests not from your domain |
| 2. HMAC signature | SHA-256(secret + timestamp + body) | Only your frontend can forge valid requests |
| 3. Replay protection | Signatures expire after 5 minutes | Captured requests cannot be reused |
| 4. Rate limiting | 10 req/min/IP, sliding window | Prevents abuse and protects the Playground API |
| 5. Code sanitization | Blocks `std::net`, `std::fs`, `std::process`, etc. | Filters obviously dangerous code |
| 6. Similarity check | Code must be ≥30% similar to known example | Prevents use as a generic Playground proxy |
| 7. Response caching | Default examples cached forever, edits for 1hr | Minimizes external API calls |

**The signing flow:**

```
Browser                    Next.js (server)              Axum
  │                             │                          │
  │──POST /api/playground/sign──▶                          │
  │  (body = execute payload)   │                          │
  │                             │  HMAC(secret, ts+body)   │
  │◀──{ signature, timestamp }──│                          │
  │                             │                          │
  │──POST /api/playground/execute──────────────────────────▶
  │  Headers: X-Playground-Signature, X-Playground-Timestamp
  │                             │                          │
  │                             │     validates HMAC ──────│
  │                             │     checks origin ──────│
  │                             │     rate limits ────────│
  │                             │     sanitizes code ─────│
  │                             │     checks similarity ──│
  │                             │     cache lookup ───────│
  │◀───────────────── { stdout, stderr, cached } ─────────│
```

The PLAYGROUND_SECRET never reaches the browser. The Next.js API route signs the request server-side. Even if an attacker reads the client-side JavaScript, they cannot forge requests.

### Security headers

Every response includes:

- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `Content-Security-Policy: default-src 'none'` — blocks resource loading
- `Referrer-Policy: strict-origin-when-cross-origin` — minimal referrer info
- `Permissions-Policy: interest-cohort=()` — opts out of tracking

## Caching Strategy

### Why not Redis?

| Factor | Redis | DashMap + disk |
|--------|-------|----------------|
| Latency | ~500µs (TCP round-trip) | ~50ns (in-process) |
| Entries | < 100 | < 100 |
| Persistence | Yes | Yes (JSON file) |
| Failure modes | Network, auth, OOM, eviction | Disk write |
| Extra container | Yes | No |
| Memory overhead | ~50MB (Redis process) | ~0 (part of binary) |

For < 100 cache entries, DashMap is 10,000x faster and adds zero operational complexity. Redis would be justified if we had multiple replicas sharing state or thousands of entries.

### Two-tier design

```
Request → DashMap (in-memory, ~50ns)
             │
             ├── HIT → return immediately
             │
             └── MISS → proxy to play.rust-lang.org
                           │
                           └── store in DashMap
                               └── if default example: also persist to /data/cache.json
```

- **Default examples**: cached permanently in memory + persisted to disk. Survive restarts.
- **Modified code**: cached in memory with 1-hour TTL. Not persisted (privacy).
- **First boot**: warms cache from play.rust-lang.org (takes ~10 seconds).
- **Subsequent boots**: loads from disk file instantly. No external calls needed.
- **Atomic writes**: cache file is written to `.tmp` then renamed — prevents corruption on crash.

## Project Structure

```
pin-playground/
├── Cargo.toml
├── Dockerfile                      # Multi-stage → ~20MB final image
├── docker-compose.snippet.yml      # Drop into your existing compose
├── src/
│   ├── main.rs                     # Axum routes, middleware, startup
│   ├── examples.rs                 # 8 examples compiled into binary
│   ├── cache.rs                    # DashMap + disk persistence
│   ├── rate_limit.rs               # Sliding window per-IP
│   └── security.rs                 # HMAC, origin check, sanitization
└── examples/
    ├── 01_the_crime_scene.rs       # Self-ref struct corrupts after swap
    ├── 02_the_bouncer.rs           # Pin prevents swap (compile error)
    ├── 03_unpin_escape.rs          # Unpin types pass through freely
    ├── 04_box_pin_vs_stack_pin.rs  # Heap vs stack pinning
    ├── 05_as_mut_reborrow.rs       # Most common Pin mistake
    ├── 06_structural_pinning.rs    # Field projection with Pin
    ├── 07_poll_by_hand.rs          # Manual Future::poll loop
    └── 08_the_disaster.rs          # Deliberate UB via unsafe

pin-playground-frontend/
├── PinPlayground.tsx               # React component
├── api-playground-sign-route.ts    # Next.js API route (HMAC signing)
└── next.config.snippet.js          # API proxy rewrite
```

## Setup

### 1. Generate a secret

```bash
openssl rand -hex 32
# e.g.: a3f8b2c1d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5061728394a5b6c7d8e
```

Add to your `.env`:

```env
PLAYGROUND_SECRET=a3f8b2c1d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5061728394a5b6c7d8e
```

### 2. Add the Rust service

Copy `pin-playground/` next to your Next.js project. Add the service from `docker-compose.snippet.yml`. Set `ALLOWED_ORIGINS` to your actual domain.

### 3. Add the signing route

Copy `api-playground-sign-route.ts` to `/app/api/playground/sign/route.ts` in your Next.js project.

### 4. Add the component

Copy `PinPlayground.tsx` to your components directory. Import in your article page:

```tsx
import PinPlayground from "@/components/PinPlayground";

export default function PinArticlePage() {
  return (
    <article>
      {/* Your article */}
      <PinPlayground />
    </article>
  );
}
```

### 5. Configure proxy

Add the rewrite from `next.config.snippet.js`, or use the nginx config from `docker-compose.snippet.yml`.

### 6. Build and run

```bash
docker compose up --build
```

Verify: `curl http://localhost:3001/api/playground/health`

## Design Decisions (Interview Talking Points)

### "Why did you build a proxy service instead of just using the Playground directly from the browser?"

Three reasons. First, the Playground API has no CORS headers, so browsers block direct calls. Second, I wanted to add caching, rate limiting, and code validation — you cannot do that from the client. Third, the signing flow ensures only my frontend can use the service; without it, anyone could use my VPS as a free Playground proxy.

### "Why DashMap over RwLock<HashMap>?"

DashMap is a sharded concurrent hashmap. For a cache with concurrent reads on different keys, DashMap never blocks — each shard has its own lock. `RwLock<HashMap>` serializes all reads behind one lock. The tradeoff: DashMap uses more memory (per-shard overhead), but for < 100 entries this is negligible. I chose the data structure that optimizes for the access pattern (many concurrent reads, rare writes).

### "Why not Redis?"

Redis adds a container, a TCP hop (~500µs), serialization, and a new failure mode — for < 100 cache entries. DashMap lookup is ~50ns. I only need persistence across restarts, not across machines, so a JSON file on a Docker volume is sufficient. If I had multiple replicas, Redis would be the right call. This is about choosing the right tool for the actual scale.

### "How do you prevent abuse?"

Seven layers: origin validation, HMAC signing with expiring timestamps, per-IP rate limiting, code sanitization (blocking network/filesystem imports), similarity checking (code must resemble a known example), response caching (reduces external calls), and nginx rate limiting as a defense-in-depth layer. Any one of these can stop an attack; together they make abuse impractical.

### "Why HMAC instead of JWT or API keys?"

HMAC is simpler and sufficient. The signing route runs server-side in Next.js, so the secret never reaches the browser. JWTs would add claims, expiry parsing, and a JWT library for no benefit — we just need to verify "this request came from our frontend." An API key in the browser would be extractable from the JS bundle.

### "What happens if play.rust-lang.org goes down?"

Default examples serve from cache (disk-persisted). Modified code returns a 502 with a clear error message. The health endpoint reports the issue. The service degrades gracefully — most visitors only run the defaults, so they never notice.

### "Why include_str! instead of reading from disk?"

Examples are compiled into the binary at build time. No filesystem reads at runtime, no missing files in the container, the binary is fully self-contained. The tradeoff: changing an example requires a rebuild. For 8 small files that change rarely, this is correct.

### "Why the constant-time comparison for HMAC?"

Timing attacks. If we used `==` to compare signatures, an attacker could measure response times to guess the correct signature byte-by-byte. Constant-time comparison takes the same amount of time regardless of which byte differs. It is overkill for this use case, but it costs nothing and demonstrates security awareness.

## Resource Usage

| Metric | Value |
|--------|-------|
| Binary size | ~5MB (release, stripped, LTO) |
| Memory at rest | ~2-4MB |
| Memory under load | ~8-10MB (with cache) |
| Docker image | ~20MB |
| CPU at rest | Near zero |
| Startup time | < 1s (from disk cache) |
| First boot warmup | ~10s (8 examples × 1s each) |

## License

MIT
