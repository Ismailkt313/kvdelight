import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "KV Delight — Every Bite Brings Delight",
  description:
    "A scroll-controlled product film: follow a single KV Delight loaf from the oven to its sealed pack.",
  icons: { icon: "/assets/brand/kv-delight-logo-reference.png" },
  openGraph: {
    title: "KV Delight — Every Bite Brings Delight",
    description:
      "A scroll-controlled product film: follow a single KV Delight loaf from the oven to its sealed pack.",
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
