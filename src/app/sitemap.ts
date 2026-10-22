import type { MetadataRoute } from "next";

/**
 * XML sitemap.
 *
 * Lists every canonical, publicly indexable URL.
 * All paths use the production host; no preview or localhost URLs.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kvdelight.vercel.app";

  const now = new Date();

  return [
    {
      url: siteUrl + "/",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: siteUrl + "/products/bread",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: siteUrl + "/products/soft-buns",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: siteUrl + "/products/cream-buns",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];
}
