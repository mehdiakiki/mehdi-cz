import localFont from "next/font/local";
import Script from "next/script";
import siteMetadata from "@/data/siteMetadata";
import { Metadata } from "next";

const space_grotesk = localFont({
  src: [
    {
      path: "../public/static/fonts/space-grotesk-latin-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/static/fonts/space-grotesk-latin-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/static/fonts/space-grotesk-latin-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/static/fonts/space-grotesk-latin-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

export const rootMetadata: Metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: {
    default: siteMetadata.title,
    template: `%s | ${siteMetadata.title}`,
  },
  description: siteMetadata.description,
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
    url: "./",
    siteName: siteMetadata.title,
    images: [siteMetadata.socialBanner],
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "./",
    types: {
      "application/rss+xml": `${siteMetadata.siteUrl}/feed.xml`,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  twitter: {
    title: siteMetadata.title,
    card: "summary_large_image",
    images: [siteMetadata.socialBanner],
  },
};

export default function RootDocument({ children }: { children: React.ReactNode }) {
  const basePath = process.env.BASE_PATH || "";
  const umami = siteMetadata.analytics?.umamiAnalytics;

  return (
    <html
      lang={siteMetadata.language}
      className={`${space_grotesk.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        {/* Optimize favicon loading */}
        <link rel="icon" href={`${basePath}/static/favicons/favicon.ico`} sizes="32x32" />
        <link rel="icon" href={`${basePath}/static/favicons/favicon.svg`} type="image/svg+xml" />
        <link rel="apple-touch-icon" href={`${basePath}/static/favicons/apple-touch-icon.png`} />
        <link rel="manifest" href={`${basePath}/site.webmanifest`} />

        {/* Theme color optimization */}
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="msapplication-TileColor" content="#000000" />

        {/* Performance hints */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* RSS Feed */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="RSS Feed"
          href={`${basePath}/feed.xml`}
        />
      </head>
      <body className="bg-white pl-[calc(100vw-100%)] text-black antialiased dark:bg-gray-950 dark:text-white">
        {umami?.umamiWebsiteId ? (
          <Script
            src={umami.src}
            data-website-id={umami.umamiWebsiteId}
            data-performance="true"
            strategy="lazyOnload"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
