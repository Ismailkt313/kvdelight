"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BrandMark from "@/components/site/BrandMark";

const CHAPTERS = [
  { id: "bread", label: "Bread", live: true },
  { id: "buns", label: "Soft Buns", live: true },
  { id: "cream-buns", label: "Cream Buns", live: false },
] as const;

/**
 * The compact sticky masthead.
 *
 * It is **not** on screen at the top of the page. The hero owns the brand there:
 * one large crest, one wordmark. The moment the hero's own lockup scrolls out of
 * the top, this slides down and takes over — so there is never a second logo
 * competing with the first, and never a gap where the brand disappears.
 *
 * The trigger is an IntersectionObserver on `#hero-brand` rather than a scroll
 * offset. A scroll threshold would have to guess the hero's height and would
 * drift on phones, where `100svh` changes as the URL bar collapses; observing
 * the actual element means the reveal follows the actual layout, at any zoom or
 * font size. It also survives a reload that lands mid-page, because the
 * observer reports the initial state immediately.
 *
 * While it is hidden the whole header is `inert`, so its links cannot be reached
 * by keyboard or screen reader — a hidden-but-focusable nav is worse than no nav.
 */
export default function Header() {
  const [revealed, setRevealed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const brand = document.getElementById("hero-brand");

    // No hero on this route (or no observer): the header is simply always there.
    if (!brand || typeof IntersectionObserver !== "function") {
      setRevealed(true);
      return;
    }

    let io: IntersectionObserver | undefined;
    try {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          // Fully past the top (or never in view because we loaded mid-page).
          setRevealed(!entry.isIntersecting);
        },
        { threshold: 0 },
      );
      io.observe(brand);
    } catch {
      setRevealed(true);
    }
    return () => io?.disconnect();
  }, []);

  // Nothing inside a hidden bar may be reachable by keyboard. `inert` is
  // rendered by React on the element itself, so it is already correct in the
  // server HTML rather than only after hydration.
  useEffect(() => {
    if (!revealed) setMenuOpen(false);
  }, [revealed]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    // The panel is a short list, not a modal: it closes when you pick something.
    firstItemRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  };

  return (
    <header
      ref={headerRef}
      inert={!revealed}
      className={`site-header fixed inset-x-0 top-0 z-50 transition-[transform,opacity] duration-500 ease-[var(--ease-cine)] motion-reduce:transition-none ${
        revealed
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0"
      }`}
    >
      <div className="border-b border-cream/10 bg-ink/85 backdrop-blur-md supports-[backdrop-filter]:bg-ink/70">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-4 sm:h-[3.75rem] sm:px-8 lg:px-10">
          <Link
            href="#top"
            className="-mx-1 flex min-h-[2.75rem] items-center gap-2.5 rounded-sm px-1 sm:gap-3"
            aria-label="KV Delight — back to the top of the page"
          >
            <BrandMark className="h-[1.9rem] sm:h-[2.1rem]" />
            <span className="wordmark text-[0.6rem] sm:text-[0.66rem]">
              KV Delight
            </span>
          </Link>

          <nav aria-label="Product chapters" className="hidden sm:block">
            <ul className="flex items-center gap-6 lg:gap-8">
              {CHAPTERS.map((chapter) => (
                <li key={chapter.id}>
                  {chapter.live ? (
                    <a
                      href={`#${chapter.id}`}
                      className="group relative inline-flex min-h-[2.75rem] items-center text-[0.64rem] uppercase tracking-[0.26em] text-cream/90 transition-colors hover:text-gold"
                    >
                      {chapter.label}
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-2 h-px origin-left scale-x-0 bg-gold/70 transition-transform duration-300 group-hover:scale-x-100"
                      />
                    </a>
                  ) : (
                    <span
                      aria-disabled="true"
                      title="Next in the film — not built yet"
                      className="inline-flex min-h-[2.75rem] items-center text-[0.64rem] uppercase tracking-[0.26em] text-cream/30"
                    >
                      {chapter.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="chapter-menu"
            aria-label={menuOpen ? "Close chapters menu" : "Open chapters menu"}
            className="-mr-1 flex h-11 w-11 items-center justify-center rounded-sm text-cream sm:hidden"
          >
            <span aria-hidden="true" className="relative block h-3 w-5">
              <span
                className={`absolute left-0 block h-px w-full bg-current transition-transform duration-300 ${
                  menuOpen ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 block h-px w-full bg-current transition-opacity duration-200 ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 block h-px w-full bg-current transition-transform duration-300 ${
                  menuOpen ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Without JavaScript the observer never runs, so the bar would stay
          hidden forever — and it is the only navigation on the page. */}
      <noscript>
        <style>{`.site-header{transform:none !important;opacity:1 !important}`}</style>
      </noscript>

      {/* Phone nav. Rendered only while open, so nothing inside it is focusable
          when it is closed and the bar is not a trap. */}
      {menuOpen ? (
        <nav
          id="chapter-menu"
          aria-label="Product chapters"
          className="menu-enter border-b border-cream/10 bg-ink/95 backdrop-blur-md sm:hidden"
        >
          <ul className="mx-auto max-w-[1500px] px-4 py-2">
            {CHAPTERS.map((chapter, index) => (
              <li key={chapter.id} className="border-b border-cream/8 last:border-0">
                {chapter.live ? (
                  <a
                    ref={index === 0 ? firstItemRef : undefined}
                    href={`#${chapter.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-[3rem] items-center justify-between gap-4 py-1 text-[0.68rem] uppercase tracking-[0.26em] text-cream"
                  >
                    {chapter.label}
                    <span aria-hidden="true" className="text-gold/70">
                      →
                    </span>
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className="flex min-h-[3rem] items-center justify-between gap-4 py-1 text-[0.68rem] uppercase tracking-[0.26em] text-cream/30"
                  >
                    {chapter.label}
                    <span aria-hidden="true" className="text-[0.55rem] tracking-[0.2em]">
                      Soon
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {/* Tapping anywhere off the panel dismisses it. Decorative, so it carries
          no role and no focus stop of its own; Escape does the same job for
          keyboard users. */}
      {menuOpen ? (
        <div
          aria-hidden="true"
          onClick={closeMenu}
          className="fixed inset-0 -z-10 h-screen w-screen bg-ink/20 sm:hidden"
        />
      ) : null}
    </header>
  );
}
