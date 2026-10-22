import type { MetadataRoute } from "next";

/**
 * robots.txt - production fully open to crawlers.
 * Never block CSS, JS, images, or WebGL assets.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kvdelight.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: siteUrl + "/sitemap.xml",
    host: siteUrl,
  };
}
