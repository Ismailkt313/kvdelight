import Link from "next/link";
import BrandMark from "@/components/site/BrandMark";

const chapters = [
  { id: "bread", label: "Bread", state: "current" as const },
  { id: "buns", label: "Soft Buns", state: "soon" as const },
  { id: "cream-buns", label: "Cream Buns", state: "soon" as const },
];

/**
 * Fixed masthead.
 *
 * The crest is the supplied mark printed on a cream oval (`BrandMark`) — the
 * same treatment the brand's own hero photograph uses, and the reason it stays
 * legible here: brand red on ink is 3.7:1, on cream it is 4.7:1. No tile, no
 * glow, no recolour of the artwork itself.
 *
 * At small sizes the badge reads as a seal rather than as spelled-out type, so
 * the cream wordmark beside it carries the name.
 *
 * On phones the nav is hidden rather than squeezed: three tracked-out labels
 * plus a lockup overflow 375 px, and the chapters are already named in full in
 * the "Next in the film" section below.
 */
export default function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      {/* Scrim only — keeps cream type readable over the hero photograph. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/85 via-ink/35 to-transparent sm:h-32"
      />

      <div className="relative mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-6">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-2.5 sm:gap-3.5"
          aria-label="KV Delight — home"
        >
          <BrandMark className="h-10 sm:h-12" priority />
          <span className="flex flex-col gap-1.5">
            <span className="wordmark text-[0.62rem] sm:text-[0.7rem]">
              KV Delight
            </span>
            <span className="tagline hidden text-[0.46rem] text-cream/45 sm:block">
              Every Bite Brings Delight
            </span>
          </span>
        </Link>

        <nav aria-label="Product chapters" className="pointer-events-auto hidden sm:block">
          <ul className="flex items-center gap-7">
            {chapters.map((c) => (
              <li key={c.id}>
                {c.state === "current" ? (
                  <a
                    href="#bread"
                    className="relative inline-flex py-2 text-[0.66rem] uppercase tracking-[0.28em] text-cream transition-colors hover:text-gold"
                  >
                    {c.label}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-0.5 h-px bg-gold/70"
                    />
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    title="Next in the film — not built yet"
                    className="inline-flex py-2 text-[0.66rem] uppercase tracking-[0.28em] text-cream/25"
                  >
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
