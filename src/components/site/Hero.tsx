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
 * The header is hidden here. That is the point: at the top of the page there is
 * exactly **one** logo, the large one. `Header` watches `#hero-brand` and slides
 * the compact bar in only once this lockup has left the top of the screen.
 *
 * Composition rules that the rest of the page inherits:
 *   - the badge is never put on a tile, never recoloured, never glow-treated;
 *   - the headline is never covered by bread. Mobile is built first — copy, then
 *     the photograph beneath it, edge to edge — and the desktop split is the
 *     wide-screen version of the same order;
 *   - everything is sized in `svh` + `clamp()` so it fits the *smallest* viewport
 *     (browser chrome expanded, notch insets) rather than the largest.
 *
 * The background is built from the brand's own photography, not stock: the
 * window light and the flour-dusted table are crops of `bread-hero-scene`, the
 * same still the bread chapter falls back to. That is what ties the backdrop to
 * the product — it is the same room, the same light, the same table.
 */
export default function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* ------------------------------------------------------- atmosphere -- */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[radial-gradient(118%_92%_at_74%_26%,#3a2411_0%,#22150a_42%,#140d07_70%,#0a0603_100%)]"
      >
        {/* Kitchen window, upper left: the light the loaf is photographed in. */}
        <img
          src="/assets/hero/window-light.webp"
          alt=""
          width={620}
          height={948}
          draggable={false}
          decoding="async"
          fetchPriority="high"
          className="hero-window"
        />
        {/* The table itself along the bottom edge. */}
        <img
          src="/assets/hero/table-band.webp"
          alt=""
          width={1200}
          height={383}
          draggable={false}
          decoding="async"
          className="hero-table"
        />
        {/* Warm pool behind the product — the same gold as the crust. */}
        <div className="absolute inset-0 bg-[radial-gradient(52%_46%_at_74%_44%,rgba(230,180,92,0.2),transparent_72%)]" />
        {/* The brand red, used as light rather than as ink: at 3.7:1 on ink it is
            unreadable as text, but as a low warm glow it ties the hero to the badge. */}
        <div className="absolute inset-0 bg-[radial-gradient(64%_46%_at_8%_96%,rgba(157,20,24,0.2),transparent_74%)]" />
        {/* Scrims. The top one protects the crest (and the header, once it
            arrives) from the window light; the left one keeps the headline off
            the brightest part of the table on wide screens. */}
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-ink/85 via-ink/45 to-transparent sm:h-72" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(100deg,rgba(10,6,3,0.8)_0%,rgba(10,6,3,0.42)_36%,transparent_64%)] lg:block" />
        {/* Ink rising from the bottom, so the hero melts into the film. */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-ink via-ink/75 to-transparent" />
      </div>

      <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col justify-center px-5 pb-4 pt-[max(1.1rem,env(safe-area-inset-top))] sm:px-8 sm:pb-8 sm:pt-10 lg:px-10 lg:pb-10 lg:pt-14">
        <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:gap-12">
          {/* -------------------------------------------------------- copy -- */}
          <div className="order-1 flex flex-col items-center text-center lg:items-start lg:text-left">
            {/* Brand lockup. `#hero-brand` is the marker the header watches:
                while this is on screen, the header stays out of the way. */}
            <div
              id="hero-brand"
              className="flex scroll-mt-24 flex-col items-center lg:flex-row lg:items-center lg:gap-4"
            >
              <BrandMark
                className="h-[5.25rem] sm:h-[5.75rem] lg:h-[6rem] [@media(max-height:640px)]:h-[3.6rem]"
                priority
              />
              <div className="mt-2.5 lg:mt-0">
                <p className="wordmark text-[0.72rem] sm:text-[0.78rem] lg:text-[0.84rem]">
                  KV Delight
                </p>
                <p className="tagline mt-2 text-[0.48rem] text-cream/60 sm:text-[0.52rem]">
                  Sandwich Bread · White Bread
                </p>
              </div>
            </div>

            <div className="rule-gold mt-5 h-px w-14 sm:mt-6" />

            <p className="eyebrow mt-4 text-gold/85 sm:mt-5">Chapter one — Bread</p>

            <h1
              id="hero-heading"
              className="display mt-3 text-[clamp(2.3rem,10.4vw,3.5rem)] leading-[0.92] [text-shadow:0_2px_30px_rgba(8,4,1,0.55)] [@media(max-height:640px)]:text-[2rem] lg:mt-4 lg:text-[clamp(3.3rem,4.7vw,5rem)]"
            >
              Every Bite
              <br />
              <em className="not-italic text-gold">Brings Delight</em>
            </h1>

            <p className="tagline mt-4 text-[0.48rem] text-cream/70 sm:mt-5 sm:text-[0.54rem]">
              Softness · Freshness · Happiness
            </p>

            <p className="mt-3 max-w-[34ch] text-[0.85rem] leading-relaxed text-cream-dim sm:mt-4 sm:text-[0.92rem] lg:max-w-[38ch] [@media(max-height:640px)]:hidden">
              One loaf, filmed in a single unbroken take — whole crown, knife,
              sealed pack.
            </p>
          </div>

          {/* ----------------------------------------------------- product -- */}
          {/* Second in the column on phones: the headline is fully read before
              any bread, and the photograph runs edge to edge beneath it. */}
          <figure className="order-2 relative -mx-5 sm:mx-0 lg:-mr-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-4%] bottom-[2%] top-[18%] -z-10 bg-[radial-gradient(closest-side,rgba(201,138,63,0.22),rgba(201,138,63,0)_74%)]"
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
              className="loaf-plate mx-auto h-auto w-full max-h-[29svh] object-contain object-center sm:max-h-[32svh] lg:max-h-[58svh]"
            />
            {/* Deepens the plate's own edges so the photograph sits *in* the
                room rather than on top of it. Purely a grade; the asset and
                its crop are untouched. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(112%_108%_at_52%_48%,transparent_44%,rgba(10,6,3,0.38)_78%,rgba(10,6,3,0.62)_100%)]"
            />
            <figcaption className="sr-only">
              The loaf, before the film begins.
            </figcaption>
          </figure>
        </div>
      </div>

      {/* ------------------------------------------------------- scroll cue -- */}
      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-5 pb-[max(0.9rem,env(safe-area-inset-bottom))] text-center sm:px-8 lg:px-10 lg:text-left">
        <a
          href="#bread"
          className="group inline-flex min-h-[2.75rem] items-center gap-3 lg:min-h-0"
        >
          <span className="eyebrow text-cream/80 transition-colors group-hover:text-gold">
            Scroll to explore
          </span>
          <span
            aria-hidden="true"
            className="h-px w-10 bg-gradient-to-r from-gold-deep to-transparent transition-colors group-hover:from-gold"
          />
        </a>
      </div>

      {/* hand-off to the film: no hard seam between the hero and the stage */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-ink/55 to-ink"
      />
    </section>
  );
}
