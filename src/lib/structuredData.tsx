/**
 * Structured data for KV Delight.
 *
 * Renders two JSON-LD blocks:
 *  1. Organization - the brand identity and contact.
 *  2. WebSite      - site-level identity and search action.
 *
 * These are server components, so they render in the initial HTML and are
 * visible to crawlers without JavaScript execution.
 *
 * IMPORTANT: Only verified, publicly available facts are included.
 * No addresses, hours, ratings, or reviews have been fabricated.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kvdelight.vercel.app";

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "KV Delight",
    alternateName: ["KVDelight", "K V Delight"],
    url: SITE_URL,
    logo: SITE_URL + "/assets/brand/kv-delight-logo-reference.webp",
    description:
      "KV Delight is a bakery brand producing sandwich bread, soft buns, and cream-filled buns. Founded by Sameer KV.",
    founder: {
      "@type": "Person",
      name: "Sameer KV",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+919495146738",
      contactType: "customer service",
      contactOption: "WhatsApp",
      availableLanguage: ["English", "Malayalam"],
    },
    knowsAbout: [
      "Bakery Products",
      "Sandwich Bread",
      "Soft Buns",
      "Cream Buns",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "KV Delight Bakery Products",
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "KV Delight Sandwich Bread",
          url: SITE_URL + "/products/bread",
        },
        {
          "@type": "OfferCatalog",
          name: "KV Delight Soft Buns",
          url: SITE_URL + "/products/soft-buns",
        },
        {
          "@type": "OfferCatalog",
          name: "KV Delight Cream Buns",
          url: SITE_URL + "/products/cream-buns",
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "KV Delight",
    alternateName: ["KVDelight", "K V Delight"],
    url: SITE_URL,
    inLanguage: "en-IN",
    description:
      "Official website of KV Delight — browse sandwich bread, soft buns, and cream buns, and enquire via WhatsApp.",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ProductSchemaProps {
  name: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  url: string;
  category?: string;
}

export function ProductSchema({
  name,
  description,
  imageUrl,
  imageAlt,
  imageWidth,
  imageHeight,
  url,
  category = "Food > Bakery Products",
}: ProductSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    category,
    image: {
      "@type": "ImageObject",
      url: SITE_URL + imageUrl,
      width: imageWidth,
      height: imageHeight,
      description: imageAlt,
    },
    brand: {
      "@type": "Brand",
      name: "KV Delight",
    },
    manufacturer: {
      "@type": "Organization",
      name: "KV Delight",
    },
    url: SITE_URL + url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbSchema({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: SITE_URL + item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export interface FAQItem {
  question: string;
  answer: string;
}

export function FAQPageSchema({ faqs }: { faqs: FAQItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ItemListSchema({
  items,
}: {
  items: Array<{ name: string; url: string; description?: string; image?: string }>;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "KV Delight Bakery Products",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: SITE_URL + item.url,
      ...(item.description ? { description: item.description } : {}),
      ...(item.image ? { image: SITE_URL + item.image } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
