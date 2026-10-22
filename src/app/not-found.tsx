import Link from "next/link";
import BrandMark from "@/components/site/BrandMark";

/**
 * Branded 404 page.
 *
 * Next.js App Router serves this for any route that returns no match.
 * It uses the brand design language and provides clear navigation back
 * to the homepage and the three product pages.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-ink px-5 text-center">
      {/* Subtle warm background — same atmosphere as the chapter transitions */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_38%,rgba(230,180,92,0.07),transparent_70%)]"
      />

      <div className="relative z-10 max-w-lg">
        <Link href="/" aria-label="KV Delight — go to homepage" className="inline-block rounded-sm">
          <BrandMark className="h-14 sm:h-16 mx-auto" />
        </Link>

        <p className="eyebrow mt-6 text-gold/80">404</p>
        <h1 className="display mt-3 text-[clamp(2rem,6vw,3.5rem)] leading-[0.94] text-cream">
          Page not found
        </h1>
        <p className="mt-5 text-[0.9rem] leading-relaxed text-cream/65">
          The page you are looking for does not exist. Try the homepage or
          browse the KV Delight product pages below.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex min-h-[48px] items-center rounded-sm bg-gold px-6 text-[0.82rem] font-medium text-ink transition-colors hover:bg-gold-deep"
          >
            Go to Homepage
          </Link>
        </div>

        <nav aria-labelledby="notfound-products" className="mt-10">
          <h2 id="notfound-products" className="eyebrow text-cream/50">
            KV Delight Products
          </h2>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-1.5">
            <li>
              <Link
                href="/products/bread"
                className="inline-flex min-h-[44px] items-center rounded-sm px-3 text-[0.82rem] text-cream/70 transition-colors hover:text-gold"
              >
                Sandwich Bread
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center"><span className="h-1 w-1 rounded-full bg-gold/35" /></li>
            <li>
              <Link
                href="/products/soft-buns"
                className="inline-flex min-h-[44px] items-center rounded-sm px-3 text-[0.82rem] text-cream/70 transition-colors hover:text-gold"
              >
                Soft Buns
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center"><span className="h-1 w-1 rounded-full bg-gold/35" /></li>
            <li>
              <Link
                href="/products/cream-buns"
                className="inline-flex min-h-[44px] items-center rounded-sm px-3 text-[0.82rem] text-cream/70 transition-colors hover:text-gold"
              >
                Cream Buns
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </main>
  );
}
