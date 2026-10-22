"use client";

import { useEffect, useRef } from "react";
import BrandMark from "@/components/site/BrandMark";
import { paint } from "@/lib/domPaint";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * The opening act.
 *
 * One screen, one loaf. The scene is the brand's own photography — the kitchen
 * window and the flour-dusted table cut from `bread-hero-scene` — and the loaf
 * is the supplied crop sitting *in* that light, masked so it has no rectangle
 * around it. There is deliberately no second recognisable loaf anywhere: the
 * only bread in the hero is the one the page is about.
 *
 * The hand-off is the part that matters. This section ends where the bread
 * chapter begins, and the bread chapter opens on a fully lit 3D loaf. If the
 * photograph were still on screen at that moment there would be two loaves in
 * one viewport, so the photograph is scrolled off its own way out: as the hero
 * leaves, the loaf fades and drifts up, gone before the film is framed. The
 * effect is scroll-linked and written with direct style writes (see
 * `lib/domPaint`), not a tween, so it cannot drift out of step with the page.
 */
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const loafRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const loaf = loafRef.current;
    if (!section || !loaf) return;

    let raf = 0;
    const write = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const height = rect.height || 1;
      const travelled = Math.min(1, Math.max(0, -rect.top / height));
      // Start the exit late enough that the hero is still a hero, and finish it
      // before the bread chapter's stage is showing anything.
      const exit = Math.min(1, Math.max(0, (travelled - 0.24) / 0.3));
      paint(loaf, {
        opacity: 1 - exit,
        translateY: -exit * height * 0.05,
        scale: 1 + exit * 0.05,
      });
    };

    const request = () => {
      if (!raf) raf = requestAnimationFrame(write);
    };

    write();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, [reduced]);

  return (
    <section
      id="top"
      ref={sectionRef}
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* ------------------------------------------------------- atmosphere -- */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[radial-gradient(120%_94%_at_72%_24%,#3d2612_0%,#241608_40%,#150d07_68%,#0a0603_100%)]"
      >
        {/* Kitchen window, upper left: the light the loaf is photographed in. */}
        <img
          src="/assets/hero/window-light.webp"
          alt=""
          width={620}
          height={1447}
          draggable={false}
          decoding="async"
          fetchPriority="high"
          className="hero-window"
        />
        {/* The table itself, along the bottom edge — the same board the loaf
            stands on, so the product and the ground share one photograph. */}
        <img
          src="/assets/hero/table-band.webp"
          alt=""
          width={1200}
          height={383}
          draggable={false}
          decoding="async"
          className="hero-table"
        />
        <div className="absolute inset-0 bg-[radial-gradient(50%_44%_at_66%_52%,rgba(230,180,92,0.22),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(62%_44%_at_6%_98%,rgba(157,20,24,0.18),transparent_74%)]" />
        {/* Scrims: the top protects the crest (and the header, once it arrives),
            the left keeps the headline off the brightest table on wide screens. */}
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-ink/80 via-ink/40 to-transparent sm:h-64" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(100deg,rgba(10,6,3,0.82)_0%,rgba(10,6,3,0.4)_36%,transparent_62%)] lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
      </div>

      <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col justify-center px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pb-6 sm:pt-8 lg:px-10 lg:pb-8 lg:pt-12">
        <div className="grid items-center gap-5 sm:gap-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10">
          {/* -------------------------------------------------------- copy -- */}
          <div className="order-1 flex flex-col items-center text-center lg:items-start lg:text-left">
            {/* The hero owns the mark: `#hero-brand` is the marker the header
                watches, and while it is on screen the header stays away. */}
            <div
              id="hero-brand"
              className="flex scroll-mt-24 flex-col items-center lg:flex-row lg:items-center lg:gap-5"
            >
              <BrandMark
                className="h-[4.6rem] sm:h-[5rem] lg:h-[5.6rem] [@media(max-height:640px)]:h-[3.4rem]"
                priority
              />
              <div className="mt-2 lg:mt-0">
                <p className="wordmark text-[0.72rem] sm:text-[0.78rem] lg:text-[0.84rem]">
                  KV Delight
                </p>
                <p className="tagline mt-1.5 text-[0.48rem] text-cream/60 sm:text-[0.52rem]">
                  Sandwich Bread · White Bread
                </p>
              </div>
            </div>

            <div className="rule-gold mt-4 h-px w-14 sm:mt-5" />

            <p className="eyebrow mt-3.5 text-gold/85 sm:mt-4">Chapter one — Bread</p>

            <h1
              id="hero-heading"
              className="display mt-2.5 text-[clamp(2.3rem,10.4vw,3.5rem)] leading-[0.92] [text-shadow:0_2px_30px_rgba(8,4,1,0.55)] [@media(max-height:640px)]:text-[2rem] lg:mt-3 lg:text-[clamp(3.2rem,4.6vw,4.9rem)]"
            >
              Every Bite
              <br />
              <em className="not-italic text-gold">Brings Delight</em>
            </h1>

            <p className="tagline mt-3.5 text-[0.48rem] text-cream/70 sm:mt-4 sm:text-[0.54rem]">
              Softness · Freshness · Happiness
            </p>

            <p className="mt-2.5 max-w-[32ch] text-[0.84rem] leading-relaxed text-cream-dim sm:mt-3 sm:text-[0.9rem] lg:max-w-[36ch] [@media(max-height:640px)]:hidden">
              One loaf, filmed in a single unbroken take — whole crown, knife,
              sealed pack.
            </p>
          </div>

          {/* ----------------------------------------------------- product -- */}
          {/* One loaf, centred in the light on phones and holding the right of
              the frame on wide screens. The mask is elliptical and biased
              upward, so the photograph's own edges dissolve into the table
              instead of drawing a rectangle around the bread. */}
          <div
            ref={loafRef}
            className="order-2 relative -mx-6 mt-1 sm:mx-0 sm:mt-2 lg:-mr-6 lg:mt-0"
            style={{ transformOrigin: "50% 100%" }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[2%] bottom-[6%] top-[16%] -z-10 bg-[radial-gradient(closest-side,rgba(214,150,70,0.26),rgba(214,150,70,0)_76%)]"
            />
            {/* The box carries the aspect ratio and the height cap; the image
                only ever letterboxes inside it. Sizing the <img> directly with
                `w-full max-h-…` distorts the loaf the moment a short viewport
                makes the cap bind — which is exactly what a landscape phone
                does. */}
            <div className="relative mx-auto aspect-[941/569] w-full max-h-[40svh] sm:max-h-[42svh] lg:max-h-[62svh]">
              <img
                src="/assets/product/bread-hero-loaf-crop.webp"
                alt="A whole KV Delight sandwich loaf, golden-crusted and dusted with flour, on a wooden board with wheat and a jug of milk."
                width={941}
                height={569}
                fetchPriority="high"
                decoding="async"
                draggable={false}
                className="loaf-plate h-full w-full object-contain object-center"
              />
            </div>
            {/* No extra grade plate over the photograph: the `.loaf-plate`
                mask already dissolves its edges, and an unmasked radial wash
                would put a soft rectangle back around the loaf. */}
            <span className="sr-only">The loaf, before the film begins.</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------- scroll cue -- */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] justify-center px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 lg:justify-start lg:px-10">
        <a
          href="#bread"
          className="group inline-flex min-h-[2.75rem] items-center gap-3"
        >
          <span className="eyebrow text-cream/80 transition-colors group-hover:text-gold">
            Scroll to explore
          </span>
          <span
            aria-hidden="true"
            className="h-px w-9 bg-gradient-to-r from-gold-deep to-transparent transition-colors group-hover:from-gold"
          />
        </a>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-ink/50 to-ink"
      />
    </section>
  );
}
