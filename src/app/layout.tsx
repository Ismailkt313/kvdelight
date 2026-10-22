import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "KV Delight — Every Bite Brings Delight",
  description:
    "A scroll-controlled product film: follow a single KV Delight loaf from the oven, through the knife, into its sealed pack.",
  icons: { icon: "/assets/brand/kv-delight-logo-reference.png" },
  openGraph: {
    title: "KV Delight — Every Bite Brings Delight",
    description:
      "A scroll-controlled product film: follow a single KV Delight loaf from the oven, through the knife, into its sealed pack.",
    images: ["/assets/product/bread-hero-scene.png"],
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
      <body className="film-grain vignette antialiased">{children}</body>
    </html>
  );
}
