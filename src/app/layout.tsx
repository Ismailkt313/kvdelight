import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import DiagnosticsBoot from "@/components/site/DiagnosticsBoot";
import { OrganizationSchema, WebSiteSchema } from "@/lib/structuredData";

/**
 * Self-hosted clones of the two original typefaces (Cormorant Garamond and
 * Inter, both variable, latin subset). `next/font/local` keeps the same CSS
 * variables as before, so globals.css and the design are untouched — it just
 * removes the build-time request to fonts.googleapis.com.
 *
 * Files come from the `@fontsource-variable` builds (SIL OFL, see FONT-LICENCES.md).
 */
const display = localFont({
  src: "./fonts/cormorant-garamond-latin-var.woff2",
  weight: "300 700",
  style: "normal",
  variable: "--font-cormorant",
  display: "swap",
  fallback: ["Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
});

const sans = localFont({
  src: "./fonts/inter-latin-var.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
});

/** Canonical production URL — set NEXT_PUBLIC_SITE_URL in production env. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kvdelight.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "KV Delight — Sandwich Bread, Soft Buns & Cream Buns",
    template: "%s | KV Delight",
  },
  description:
    "KV Delight makes sandwich bread, soft buns, and cream-filled buns. Browse our three bakery product lines and connect with Sameer KV to enquire about products.",

  keywords: [
    "KV Delight",
    "KVDelight",
    "K V Delight",
    "KV Delight Bread",
    "KV Delight Soft Buns",
    "KV Delight Cream Bun",
    "Sandwich Bread",
    "Soft Buns",
    "Cream Buns",
    "Bakery Products",
    "Sameer KV",
  ],
  authors: [{ name: "Sameer KV" }],
  creator: "Sameer KV",
  publisher: "KV Delight",

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: [
      { url: "/assets/brand/kv-delight-mark.webp", type: "image/webp" },
    ],
    apple: "/assets/brand/kv-delight-mark.webp",
    shortcut: "/assets/brand/kv-delight-mark.webp",
  },
  manifest: "/site.webmanifest",

  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "KV Delight",
    locale: "en_IN",
    title: "KV Delight — Sandwich Bread, Soft Buns & Cream Buns",
    description:
      "KV Delight makes sandwich bread, soft buns, and cream-filled buns. Browse our three bakery product lines and connect with us to enquire about products.",
    images: [
      {
        url: "/assets/product/bread-hero-scene.webp",
        width: 1536,
        height: 1024,
        alt: "A golden KV Delight sandwich bread loaf on a wooden board, with wheat and butter.",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "KV Delight — Sandwich Bread, Soft Buns & Cream Buns",
    description:
      "KV Delight makes sandwich bread, soft buns, and cream-filled buns. Connect with us to enquire about products.",
    images: ["/assets/product/bread-hero-scene.webp"],
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

  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#120b06",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="film-grain vignette antialiased">
        <OrganizationSchema />
        <WebSiteSchema />
        <DiagnosticsBoot />
        {children}
      </body>
    </html>
  );
}
