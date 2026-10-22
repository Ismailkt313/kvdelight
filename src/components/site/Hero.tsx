import BrandMark from "@/components/site/BrandMark";

/**
 * The opening act.
 *
 * The film used to start inside the bread chapter, which meant the first thing a
 * visitor saw was the 3D loaf already filling the frame, with the headline laid
 * over it. This is the branded screen that comes first: the supplied mark, the
 * wordmark, the headline and one whole loaf — and only after this scrolls away
 * does the chapter's cutting film begin.
 *
 * Composition rules that the rest of the page inherits:
 *   - the badge is never put on a tile, never recoloured, never glow-treated;
 *   - the headline is never covered by bread. On desktop the copy owns the left
 *     half and the loaf owns the right; on phones they stack in that order, so
 *     the photograph starts below the last line of type;
 *   - everything is sized in `svh` + `clamp()` so it fits the *smallest* viewport
 *     (browser chrome expanded, notch insets) rather than the largest.
 */
export default function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* atmosphere — warm oven light behind the loaf, ink at the edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_95%_at_76%_34%,#3a2411_0%,#22150a_38%,#150d06_62%,#0b0704_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_78%_46%,rgba(230,180,92,0.16),transparent_70%)]"
      />
      {/* The brand red, used as light rather than as ink: at 3.7:1 on ink it is
          unreadable as text, but as a low warm glow it ties the hero to the badge. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_50%_at_8%_92%,rgba(157,20,24,0.16),transparent_72%)]"
      />

      <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col justify-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-20 sm:px-8 sm:pt-28 lg:px-10">
        <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-14">
          {/* ---------------------------------------------------------- copy -- */}
          <div className="order-1 max-w-xl">
            {/* brand lockup — mark first, always */}
            <div className="flex items-center gap-3.5">
              <BrandMark
                className="h-14 sm:h-[4.6rem] lg:h-[5.4rem]"
                priority
              />
              <div className="min-w-0">
                <p className="wordmark text-[0.7rem] sm:text-[0.8rem] lg:text-[0.92rem]">
                  KV Delight
                </p>
                {/* The product name, not a second tagline: the headline below
                    already says "Every Bite Brings Delight". */}
                <p className="tagline mt-2.5 text-[0.5rem] text-cream/55 sm:text-[0.55rem]">
                  Sandwich Bread · White Bread
                </p>
              </div>
            </div>

            <div className="rule-gold mt-6 h-px w-16 sm:mt-7" />

            <p className="eyebrow mt-5 text-gold/85 sm:mt-6">
              Chapter one — Bread
            </p>

            <h1
              id="hero-heading"
              className="display mt-4 text-[clamp(2.65rem,12vw,4.1rem)] leading-[0.93] sm:mt-5 lg:text-[clamp(3.6rem,5.2vw,5.4rem)]"
            >
              Every Bite
              <br />
              <em className="not-italic text-gold">Brings Delight</em>
            </h1>

            <p className="tagline mt-6 text-[0.52rem] text-cream-dim sm:mt-7 sm:text-[0.6rem]">
              Softness · Freshness · Happiness
            </p>

            <p className="mt-4 max-w-[36ch] text-[0.86rem] leading-relaxed text-cream-dim sm:mt-5 sm:max-w-[40ch] sm:text-[0.95rem]">
              One loaf, filmed in a single unbroken take — whole crown, knife,
              sealed pack.
            </p>

            <a
              href="#bread"
              className="group mt-7 inline-flex items-center gap-3 sm:mt-9"
            >
              <span className="eyebrow text-cream/80 transition-colors group-hover:text-gold">
                Scroll to explore
              </span>
              <span className="h-px w-10 bg-gradient-to-r from-gold-deep to-transparent transition-colors group-hover:from-gold" />
            </a>
          </div>

          {/* ------------------------------------------------------- product -- */}
          {/* Order last on phones: the headline is fully read before any bread. */}
          <figure className="order-2 relative lg:-mr-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-6%] bottom-[-4%] top-[12%] -z-10 bg-[radial-gradient(closest-side,rgba(201,138,63,0.24),rgba(201,138,63,0)_72%)]"
            />
            <img
              src="/assets/product/bread-hero-loaf-crop.webp"
              alt="A whole KV Delight sandwich loaf, golden-crusted and dusted with flour, on a wooden board with wheat and a jug of milk."
              width={941}
              height={569}
              // The hero is the first paint the visitor judges the brand by, and
              // it is above the fold: fetch it early and at high priority.
              fetchPriority="high"
              decoding="async"
              draggable={false}
              className="loaf-plate h-auto w-full max-h-[38svh] object-contain object-center sm:max-h-none"
            />
            <figcaption className="sr-only">
              The loaf, before the film begins.
            </figcaption>
          </figure>
        </div>
      </div>

      {/* hand-off to the film: no hard seam between the hero and the stage */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-ink/60 to-ink"
      />
    </section>
  );
}
