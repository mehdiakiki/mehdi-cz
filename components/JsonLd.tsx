import siteMetadata from "@/data/siteMetadata";

interface JsonLdProps {
  data: Record<string, any>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 2),
      }}
    />
  );
}

// Website Schema for Homepage
export function WebsiteJsonLd() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteMetadata.title,
    description: siteMetadata.description,
    url: siteMetadata.siteUrl,
    author: {
      "@type": "Person",
      name: siteMetadata.author,
      url: siteMetadata.siteUrl,
    },
    publisher: {
      "@type": "Person",
      name: siteMetadata.author,
      url: siteMetadata.siteUrl,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteMetadata.siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLd data={websiteSchema} />;
}

// Person Schema for Author
export function PersonJsonLd() {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteMetadata.author,
    url: siteMetadata.siteUrl,
    sameAs: [siteMetadata.github, siteMetadata.linkedin, siteMetadata.x].filter(Boolean),
    jobTitle: "Software Developer",
    description:
      "Programming enthusiast sharing knowledge through tutorials and insights on software development.",
    image: `${siteMetadata.siteUrl}${siteMetadata.siteLogo}`,
  };

  return <JsonLd data={personSchema} />;
}

// Article Schema for Blog Posts
interface ArticleJsonLdProps {
  title: string;
  description: string;
  date: string;
  lastmod?: string;
  url: string;
  tags: string[];
  images?: string[];
}

export function ArticleJsonLd({
  title,
  description,
  date,
  lastmod,
  url,
  tags,
  images = [],
}: ArticleJsonLdProps) {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    image: images.length > 0 ? images : [`${siteMetadata.siteUrl}${siteMetadata.socialBanner}`],
    datePublished: date,
    dateModified: lastmod || date,
    author: {
      "@type": "Person",
      name: siteMetadata.author,
      url: siteMetadata.siteUrl,
    },
    publisher: {
      "@type": "Person",
      name: siteMetadata.author,
      url: siteMetadata.siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    keywords: tags.join(", "),
    url: url,
  };

  return <JsonLd data={articleSchema} />;
}

// Breadcrumb Schema for Blog Pages
interface BreadcrumbJsonLdProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={breadcrumbSchema} />;
}
