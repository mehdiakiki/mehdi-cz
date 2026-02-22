// ==============================================================
// Add to your next.config.js (or next.config.ts)
// ==============================================================
// Route /api/playground/* to the Axum service.
// The /api/playground/sign route stays in Next.js (server-side).
// ==============================================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your existing config ...

  async rewrites() {
    return [
      {
        // The signing route stays in Next.js — do NOT proxy it.
        // It lives at /app/api/playground/sign/route.ts
        source: "/api/playground/sign",
        destination: "/api/playground/sign",
      },
      {
        // Everything else goes to the Axum service.
        source: "/api/playground/:path*",
        destination: "http://code-playground:3001/api/playground/:path*",
        // For local dev (not Docker): http://localhost:3001/api/playground/:path*
      },
    ];
  },
};

module.exports = nextConfig;
