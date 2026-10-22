import Link from "next/link";
import BrandMark from "@/components/site/BrandMark";
import { SECTIONS } from "@/lib/sections";

/**
 * Layout shared by all product landing pages.
 *
 * Provides a lightweight, static header that does not require the main
 * homepage observer logic. This header is always visible (not deferred
 * by IntersectionObserver like the homepage header), since product pages
 * are standalone documents, not sections of a scroll film.
 */
export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Product section header */}
      <header className="fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink/90 via-ink/55 to-transparent"
        />
        <div className="relative mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-3 px-4 sm:h-16 sm:gap-6 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="-ml-1 flex min-h-[2.75rem] items-center gap-2.5 rounded-sm px-1"
            aria-label="KV Delight — back to homepage"
          >
            <BrandMark className="h-[1.75rem] sm:h-8" />
            <span className="wordmark hidden text-[0.6rem] sm:inline sm:text-[0.64rem]">
              KV Delight
            </span>
          </Link>

          <nav aria-label="Product pages">
            <ul className="flex items-center gap-2 sm:gap-4 lg:gap-6">
              <li>
                <Link
                  href="/products/bread"
                  className="group relative inline-flex min-h-[2.75rem] items-center rounded-sm px-2 text-[0.54rem] uppercase tracking-[0.16em] text-cream/75 transition-colors hover:text-gold sm:px-1 sm:text-[0.6rem] sm:tracking-[0.22em]"
                >
                  Bread
                </Link>
              </li>
              <li>
                <Link
                  href="/products/soft-buns"
                  className="group relative inline-flex min-h-[2.75rem] items-center rounded-sm px-2 text-[0.54rem] uppercase tracking-[0.16em] text-cream/75 transition-colors hover:text-gold sm:px-1 sm:text-[0.6rem] sm:tracking-[0.22em]"
                >
                  Soft Buns
                </Link>
              </li>
              <li>
                <Link
                  href="/products/cream-buns"
                  className="group relative inline-flex min-h-[2.75rem] items-center rounded-sm px-2 text-[0.54rem] uppercase tracking-[0.16em] text-cream/75 transition-colors hover:text-gold sm:px-1 sm:text-[0.6rem] sm:tracking-[0.22em]"
                >
                  Cream Buns
                </Link>
              </li>
              <li aria-hidden="true" className="text-cream/20">|</li>
              <li>
                <Link
                  href="/"
                  className="group relative inline-flex min-h-[2.75rem] items-center rounded-sm px-2 text-[0.54rem] uppercase tracking-[0.16em] text-gold/85 transition-colors hover:text-cream sm:px-1 sm:text-[0.6rem] sm:tracking-[0.22em]"
                >
                  3D Story
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="relative border-t border-cream/10 bg-ink-deep py-8 text-center">
        <p className="text-[0.72rem] text-cream/50">
          <Link href="/" className="hover:text-gold transition-colors">KV Delight</Link>
          {" "}· Sandwich Bread · Soft Buns · Cream Buns
        </p>
        <p className="mt-1.5 text-[0.6rem] uppercase tracking-[0.26em] text-gold/50">
          Made with care
        </p>
      </footer>
    </>
  );
}
