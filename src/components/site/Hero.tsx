"use client";

import { useEffect, useRef } from "react";
import BrandMark from "@/components/site/BrandMark";
import { paint } from "@/lib/domPaint";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * The opening act.
 *
 * One screen, one loaf, one photograph. The scene is the brand's own art — the
 * kitchen window and the flour-dusted board cut from `bread-hero-scene`, plus
 * the loaf itself — and the loaf is masked so it has no rectangle around it.
 * There is deliberately no second recognisable loaf anywhere: the only bread in
 * the hero is the one the page is about.
 *
 * **Why the phone layout is its own composition, not a shrunk desktop.** On a
 * phone the hero is a single vertical scene with no frame inside it: the copy
 * sits at the top on the light, the loaf fills every pixel that is left — edge
 * to edge, so there is no image edge to see — and its top and bottom melt into
 * the same ink the page uses. The product row is the flexible one (`flex-1`),
 * so the scene absorbs whatever the viewport has left after the copy, rather
 * than leaving a fixed gap that reads as blank page. Desktop keeps the editorial
 * split: words left, product right.
 *
 * **The hand-off.** This section ends where the bread chapter begins, and that
 * chapter opens on a fully lit 3D loaf. If the photograph were still on screen
 * at that moment there would be two loaves in one viewport, so the photograph is
 * scrolled off its own way out: as the hero leaves, the loaf fades and drifts up,
 * gone before the film is framed. The effect is scroll-linked and written with
 * direct style writes (see `lib/domPaint`), not a tween, so it cannot drift out
 * of step with the page.
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
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[radial-gradient(128%_96%_at_62%_58%,#3a2411_0%,#241608_42%,#150d07_70%,#0a0603_100%)]"
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
        {/* One key light, in the same place on every screen: behind the loaf on
            a phone, behind the product column on desktop. It is what ties the
            copy's warm highlights to the product's lighting. */}
        <div className="absolute inset-0 bg-[radial-gradient(56%_30%_at_52%_70%,rgba(230,180,92,0.20),transparent_74%)] lg:bg-[radial-gradient(50%_44%_at_66%_52%,rgba(230,180,92,0.22),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(62%_44%_at_6%_98%,rgba(157,20,24,0.18),transparent_74%)]" />
        {/* Scrims: the top protects the crest and the copy (and the header, once
            it arrives); the bottom returns the scene to the page's ink. */}
        <div className="absolute inset-x-0 top-0 h-[56%] bg-[linear-gradient(to_bottom,#0a0603_0%,rgba(10,6,3,0.86)_22%,rgba(10,6,3,0.52)_42%,rgba(10,6,3,0.18)_56%,transparent_100%)] sm:h-64 sm:bg-gradient-to-b sm:from-ink/80 sm:via-ink/40 sm:to-transparent" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(100deg,rgba(10,6,3,0.82)_0%,rgba(10,6,3,0.4)_36%,transparent_62%)] lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(to_top,#0a0603_0%,rgba(10,6,3,0.88)_26%,rgba(10,6,3,0.45)_58%,transparent_100%)] sm:h-40 sm:bg-gradient-to-t sm:from-ink sm:via-ink/70 sm:to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.85rem,env(safe-area-inset-top))] sm:px-8 sm:pt-8 lg:px-10 lg:pt-12">
        <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-10">
          {/* -------------------------------------------------------- copy -- */}
          <div className="order-1 flex shrink-0 flex-col items-center text-center lg:items-start lg:text-left">
            {/* The hero owns the mark: `#hero-brand` is the marker the header
                watches, and while it is on screen the header stays away. */}
            <div
              id="hero-brand"
              className="flex scroll-mt-24 flex-col items-center lg:flex-row lg:items-center lg:gap-5"
            >
              <BrandMark
                className="h-[3.5rem] sm:h-[4.6rem] lg:h-[5.6rem] [@media(max-height:640px)]:h-[2.9rem]"
                priority
              />
              <div className="mt-1.5 sm:mt-2 lg:mt-0">
                <p className="wordmark text-[0.66rem] sm:text-[0.76rem] lg:text-[0.84rem]">
                  KV Delight
                </p>
                <p className="tagline mt-1 text-[0.44rem] text-cream/60 sm:text-[0.5rem]">
                  Sandwich Bread · White Bread
                </p>
              </div>
            </div>

            <div className="rule-gold mt-3 h-px w-12 sm:mt-4 sm:w-14" />

            <p className="eyebrow mt-2.5 text-gold/85 sm:mt-3">Chapter one — Bread</p>

            <h1
              id="hero-heading"
              className="display mt-2 text-[clamp(2.45rem,11.4vw,3.4rem)] leading-[0.94] tracking-[-0.01em] [text-shadow:0_2px_30px_rgba(8,4,1,0.55)] [@media(max-height:640px)]:text-[2rem] lg:mt-3 lg:text-[clamp(3.2rem,4.6vw,4.9rem)]"
            >
              Every Bite
              <br />
              <em className="not-italic text-gold">Brings Delight</em>
            </h1>

            <p className="tagline mt-2.5 text-[0.46rem] text-cream/70 sm:mt-3.5 sm:text-[0.54rem]">
              Softness · Freshness · Happiness
            </p>

            <p className="mt-2 max-w-[30ch] text-[0.8rem] leading-[1.55] text-cream-dim sm:mt-3 sm:max-w-[34ch] sm:text-[0.9rem] lg:max-w-[36ch] [@media(max-height:640px)]:hidden">
              One loaf, filmed in a single unbroken take — whole crown, knife,
              sealed pack.
            </p>
          </div>

          {/* ----------------------------------------------------- product -- */}
          {/*
            The flexible row: on a phone it takes whatever height the copy did
            not, and the loaf is centred in it, so leftover space is split above
            and below the bread instead of collecting in one gap.

            The frame is 124% wide on a phone — the photograph's own loaf ends at
            ~88% of its width, so the extra width bleeds off both edges of the
            screen (clipped by the section) while the whole loaf stays visible.
            That is what removes the "photograph pasted onto a background" read:
            there is no image edge inside the viewport at all, and the vertical
            mask fades what is left into the ink.

            From `sm` it returns to a box with the photograph's own ratio and
            `object-contain`, so a short viewport letterboxes the loaf rather
            than distorting it; from `lg` it is the product column of the split.
          */}
          <div
            ref={loafRef}
            className="order-2 mt-2 flex flex-1 items-center justify-center sm:mt-2 sm:flex-none sm:block lg:mt-0"
            style={{ transformOrigin: "50% 80%" }}
          >
            <div className="relative mx-auto aspect-[941/569] w-[124%] max-w-none sm:max-h-[42svh] sm:w-full lg:max-h-[62svh]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-[6%] bottom-[-4%] top-[6%] -z-10 bg-[radial-gradient(closest-side,rgba(214,150,70,0.26),rgba(214,150,70,0)_78%)]"
              />
              <img
                src="/assets/product/bread-hero-loaf-crop.webp"
                alt="A whole KV Delight sandwich loaf, golden-crusted and dusted with flour, on a wooden board with wheat and a jug of milk."
                width={941}
                height={569}
                fetchPriority="high"
                decoding="async"
                draggable={false}
                className="loaf-plate h-full w-full object-cover object-[50%_46%] sm:object-contain sm:object-center"
              />
            </div>
            <span className="sr-only">The loaf, before the film begins.</span>
          </div>
        </div>

        {/* ------------------------------------------------------- scroll cue -- */}
        <div className="relative z-10 mt-1 flex shrink-0 justify-center sm:mt-2 lg:justify-start">
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
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-ink/80 sm:h-20"
      />
    </section>
  );
}
