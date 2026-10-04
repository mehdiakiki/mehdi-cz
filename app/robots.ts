import { MetadataRoute } from "next";
import siteMetadata from "@/data/siteMetadata";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteMetadata.siteUrl;
  const isProduction = process.env.NODE_ENV === "production";

  // Block everything in development/staging
  if (!isProduction) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  // Production rules
  return {
    rules: [
      // General rules for all search engines
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/", // Block API endpoints
          "/_next/", // Block Next.js internals
          "/admin/", // Block admin areas (if any)
          "/private/", // Block private content
          "/draft/", // Block draft content
          "*.json", // Block JSON files
          "/search.json", // Block search index
          "/404", // Block error pages
          "/500",
        ],
        crawlDelay: 1, // 1 second delay between requests
      },
      // Special rules for Google
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/_next/", "/admin/", "/private/", "/draft/"],
        // No crawl delay for Google - they're efficient
      },
      // OpenAI's search crawler can surface public pages in ChatGPT search.
      // This is independent from GPTBot, which controls model-training crawls.
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: ["/api/", "/_next/", "/admin/", "/private/", "/draft/"],
      },
      // Block aggressive crawlers that might impact performance
      {
        userAgent: "AhrefsBot",
        disallow: "/",
      },
      {
        userAgent: "SemrushBot",
        disallow: "/",
      },
      {
        userAgent: "MJ12bot",
        disallow: "/",
      },
      // Allow important bots
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/", "/_next/", "/admin/", "/private/"],
        crawlDelay: 2,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
