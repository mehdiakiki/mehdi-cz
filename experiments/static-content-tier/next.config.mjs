import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));

export default {
  outputFileTracingRoot: fixtureRoot,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/generated/cache-fresh/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp", "image/avif"],
    qualities: [75, 80, 85, 90],
    minimumCacheTTL: 31536000,
  },
};
