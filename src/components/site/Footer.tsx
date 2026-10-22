import BrandMark from "@/components/site/BrandMark";
import { SECTIONS } from "@/lib/sections";

/**
 * The footer.
 *
 * The page already ends on the founder invitation, so the footer does not repeat
 * it. It is the sign-off and nothing else: the crest and the tagline centred, the
 * three chapters, then the copyright. No address, no email, no social row, no
 * legal paragraph, and — since the founder section immediately above carries the
 * WhatsApp call to action — no second copy of that button.
 *
 * The whole block is one centred column. Everything in it is centred at every
 * width, which is why there is no breakpoint that re-flows it: a phone and a
 * 1500 px screen show the same stack, only larger.
 *
 * The product links are plain `#id` anchors, so they use the page's own
 * navigation: the same ids the chapter bar highlights, and the same CSS smooth
 * scroll, which still fires the scroll events the 3D chapters scrub from.
 */

/** Built once at build time; the build is what stamps the year. */
const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer id="footer" className="relative isolate overflow-hidden bg-ink-deep">
      {/* One warm wash from above — the same key light as the rest of the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_-25%,rgba(230,180,92,0.10),transparent_62%)]"
      />
      {/* The border is a gradient hairline, not a bar: gold at the centre, ink at
          the edges, so the footer begins the way the chapters begin. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(230,180,92,0.35),transparent)]"
      />

      <div className="relative mx-auto max-w-[1500px] px-5 pb-8 pt-12 text-center sm:px-10 sm:pb-9 sm:pt-14 lg:pt-16">
        {/* Identity, centred: crest, name, tagline — one lockup, stacked. */}
        <a
          href="#top"
          aria-label="KV Delight — back to the top"
          className="mx-auto inline-flex flex-col items-center gap-3 rounded-sm py-1"
        >
          <BrandMark className="h-12 sm:h-14" />
          <span className="wordmark text-[0.64rem] sm:text-[0.68rem]">KV Delight</span>
        </a>

        <p className="tagline mx-auto mt-3.5 text-[0.56rem] text-cream-dim/90 sm:text-[0.58rem]">
          Softness · Freshness · Happiness
        </p>

        {/* The three chapters, in scroll order. */}
        <nav aria-labelledby="footer-products" className="mt-8 sm:mt-9">
          <h2 id="footer-products" className="eyebrow text-[0.58rem] text-gold/80">
            Products
          </h2>
          <ul className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5">
            {SECTIONS.map((section, index) => (
              <li key={section.id} className="flex items-center gap-x-1.5">
                {index > 0 && (
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold/45" />
                )}
                <a
                  href={`#${section.id}`}
                  className="inline-flex min-h-[44px] items-center rounded-sm px-1.5 text-[0.8rem] text-cream/80 transition-colors hover:text-cream focus-visible:text-cream sm:px-2.5 sm:text-[0.82rem]"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sign-off, centred and close together. */}
        <div className="mx-auto mt-8 max-w-[420px] border-t border-cream/10 pt-6 sm:mt-10">
          <p className="text-[0.72rem] tracking-[0.02em] text-cream/70">
            © {YEAR} KV Delight
          </p>
          <p className="mt-1.5 text-[0.58rem] uppercase tracking-[0.26em] text-gold/70">
            Made with care
          </p>
        </div>
      </div>
    </footer>
  );
}
