"use client";

import { useEffect, useRef } from "react";

const CHAPTERS = [
  { label: "Bread", state: "live" },
  { label: "Soft Buns", state: "soon" },
  { label: "Cream Buns", state: "soon" },
] as const;

/** Thin cinematic progress rail. Desktop only; decorative for assistive tech. */
export default function ProgressRail() {
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = fillRef.current;
        if (!el) return;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        el.style.transform = `scaleY(${Math.min(1, Math.max(0.02, p))})`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-4 lg:flex"
    >
      <div className="relative h-40 w-px bg-cream/15">
        <span
          ref={fillRef}
          className="absolute inset-x-0 top-0 block h-full origin-top bg-gold/80"
          style={{ transform: "scaleY(0.02)" }}
        />
      </div>
      <ul className="flex flex-col items-end gap-3">
        {CHAPTERS.map((c, i) => (
          <li
            key={c.label}
            className={`text-[0.55rem] uppercase tracking-[0.28em] ${
              c.state === "live" ? "text-cream" : "text-cream/25"
            }`}
          >
            {String(i + 1).padStart(2, "0")} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
