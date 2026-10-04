const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
const {
  applyNextSupportedBrowserPolyfills,
} = require("./lib/next-supported-browser-polyfills-webpack.js");

const repositoryRoot = __dirname;

// You might need to insert additional domains in script-src if you are using external services
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' giscus.app analytics.mehdi.cz app.cal.com;
  style-src 'self' 'unsafe-inline';
  img-src * blob: data:;
  media-src *.s3.amazonaws.com;
  connect-src *;
  font-src 'self';
  worker-src 'self' blob:;
  frame-src giscus.app cal.com *.cal.com
`;

const securityHeaders = [
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy.replace(/\n/g, ""),
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const output = process.env.EXPORT ? "export" : undefined;
const basePath = process.env.BASE_PATH || undefined;
const unoptimized = process.env.UNOPTIMIZED ? true : undefined;
const distDir = process.env.NEXT_DIST_DIR || undefined;
const inlineCss = process.env.PERF048_INLINE_CSS === "true";
const ignoreExperimentTypeErrors = process.env.PERF_EXPERIMENT_IGNORE_TYPE_ERRORS === "true";
const cssChunkingMode = process.env.PERF052_CSS_CHUNKING;

function getPerf052CssChunking() {
  if (!cssChunkingMode) return undefined;
  if (cssChunkingMode !== "graph") {
    throw new Error(`Unsupported PERF052_CSS_CHUNKING value: ${cssChunkingMode}`);
  }

  const requestCost = Number(process.env.PERF052_REQUEST_COST);
  const weightDistribution = Number(process.env.PERF052_WEIGHT_DISTRIBUTION);
  if (!Number.isFinite(requestCost) || requestCost < 0) {
    throw new Error("PERF052_REQUEST_COST must be a finite non-negative number");
  }
  if (!Number.isFinite(weightDistribution) || weightDistribution < 0) {
    throw new Error("PERF052_WEIGHT_DISTRIBUTION must be a finite non-negative number");
  }

  return { type: "graph", requestCost, weightDistribution };
}

/**
 * @type {import('next/dist/next-server/server/config').NextConfig}
 **/
module.exports = () => {
  const plugins = [withBundleAnalyzer];
  const perf052CssChunking = getPerf052CssChunking();
  return plugins.reduce((acc, next) => next(acc), {
    output,
    basePath,
    distDir,
    outputFileTracingRoot: repositoryRoot,
    turbopack: {
      root: repositoryRoot,
    },
    reactStrictMode: true,
    pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
    // Enhanced performance configuration
    compress: true,
    poweredByHeader: false,
    generateEtags: true,
    // Some research fixtures intentionally contain compiler errors. This is
    // opt-in for isolated measurements only; ordinary builds keep the gate.
    typescript: {
      ignoreBuildErrors: ignoreExperimentTypeErrors,
    },

    // Experimental features for better performance
    experimental: {
      optimizePackageImports: ["react-icons", "lucide-react"],
      inlineCss,
      ...(perf052CssChunking ? { cssChunking: perf052CssChunking } : undefined),
    },

    webpack(config, { isServer, webpack }) {
      if (!isServer) {
        applyNextSupportedBrowserPolyfills(config, webpack);
      }
      return config;
    },

    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "picsum.photos",
        },
        {
          protocol: "https",
          hostname: "github.com",
        },
        {
          protocol: "https",
          hostname: "avatars.githubusercontent.com",
        },
        {
          protocol: "https",
          hostname: "images.unsplash.com",
        },
      ],
      formats: ["image/webp", "image/avif"],
      deviceSizes: [384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [32, 48, 64, 96, 128, 192, 256],
      qualities: [75, 80, 85, 90],
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
      minimumCacheTTL: 31536000, // 1 year cache for images
      unoptimized,
    },

    async headers() {
      return [
        {
          source: "/(.*)",
          headers: securityHeaders,
        },
        // Cache static assets aggressively
        {
          source: "/static/(.*)",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        // Cache font files
        {
          source: "/(.*).woff2",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        // Cache images
        {
          source: "/(.*)\\.(jpg|jpeg|png|webp|avif|gif|svg)",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
      ];
    },
  });
};
