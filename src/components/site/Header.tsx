"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BrandMark from "@/components/site/BrandMark";
import { SECTIONS, type SectionId } from "@/lib/sections";

/**
 * The sticky chapter bar.
 *
 * Three rules decided its shape:
 *
 * 1. **No chrome.** It is a transparent plate: no card, no bar, no border. All
 *    that sits behind the type is a short ink gradient that fades to nothing, so
 *    the header reads as part of the film rather than a strip laid over it.
 * 2. **No hamburger.** All three chapters are links, on every screen size. Three
 *    short labels fit a 375 px row — measured, not assumed — so hiding them
 *    behind a button was costing a tap for nothing.
 * 3. **Never two logos.** The hero owns the mark at the top of the page; this
 *    bar fades in only once that lockup has left the screen, and fades back out
 *    if you scroll home again.
 *
 * The revealed state is driven by an `IntersectionObserver` on `#hero-brand`
 * rather than a scroll offset, which would have to guess a `100svh` that moves
 * as the browser chrome collapses.
 */
export default function Header() {
  const [revealed, setRevealed] = useState(false);
  const [active, setActive] = useState<SectionId | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const brand = document.getElementById("hero-brand");
    if (!brand || typeof IntersectionObserver !== "function") {
      setRevealed(true);
      return;
    }

    let io: IntersectionObserver | undefined;
    try {
      io = new IntersectionObserver(
        (entries) => setRevealed(!entries[entries.length - 1].isIntersecting),
        { threshold: 0 },
      );
      io.observe(brand);
    } catch {
      setRevealed(true);
    }
    return () => io?.disconnect();
  }, []);

  /**
   * Which chapter is on screen.
   *
   * The root is inset to a band across the middle of the viewport, so the answer
   * is "the section crossing the reading line", not "the first section in the
   * document that is technically intersecting". Every chapter is several screens
   * tall, so exactly one of them fills that band at any moment.
   */
  useEffect(() => {
    if (typeof IntersectionObserver !== "function") return;
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (!els.length) return;

    const ratios = new Map<string, number>();
    let io: IntersectionObserver | undefined;
    try {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) ratios.set(entry.target.id, entry.intersectionRatio);
          let best: SectionId | null = null;
          let bestRatio = 0.02;
          for (const { id } of SECTIONS) {
            const ratio = ratios.get(id) ?? 0;
            if (ratio > bestRatio) {
              best = id;
              bestRatio = ratio;
            }
          }
          setActive(best);
        },
        { rootMargin: "-34% 0px -34% 0px", threshold: [0, 0.2, 0.5, 0.8, 1] },
      );
      els.forEach((el) => io?.observe(el));
    } catch {
      io = undefined;
    }
    return () => io?.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      inert={!revealed}
      className={`site-header fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-[transform,opacity] duration-500 ease-[var(--ease-cine)] motion-reduce:transition-none ${
        revealed ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      {/* Not a bar — a fade. Ink at the very top, gone by 112 px. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/80 via-ink/30 to-transparent"
      />

      <div className="relative mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-3 px-4 sm:h-16 sm:gap-6 sm:px-8 lg:px-10">
        <Link
          href="#top"
          className="-ml-1 flex min-h-[2.75rem] items-center gap-2.5 rounded-sm px-1"
          aria-label="KV Delight — back to the top"
        >
          <BrandMark className="h-[1.75rem] sm:h-8" />
          <span className="wordmark hidden text-[0.6rem] sm:inline sm:text-[0.64rem]">
            KV Delight
          </span>
        </Link>

        <nav aria-label="Product chapters">
          <ul className="flex items-center gap-1 sm:gap-3 lg:gap-5">
            {SECTIONS.map((section) => {
              const isActive = active === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={`group relative inline-flex min-h-[2.75rem] items-center rounded-sm px-2 text-[0.54rem] uppercase tracking-[0.16em] transition-colors sm:px-1 sm:text-[0.6rem] sm:tracking-[0.22em] ${
                      isActive ? "text-gold" : "text-cream/70 hover:text-cream"
                    }`}
                  >
                    {section.nav}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-2 bottom-1.5 h-px origin-left bg-gold/80 transition-transform duration-300 sm:inset-x-1 ${
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Without JavaScript the observer never runs; this bar is the only
          navigation on the page, so a noscript rule pins it open. */}
      <noscript>
        <style>{`.site-header{transform:none !important;opacity:1 !important}`}</style>
      </noscript>
    </header>
  );
}
