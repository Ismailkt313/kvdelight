import Header from "@/components/site/Header";
import BrandMark from "@/components/site/BrandMark";
import Hero from "@/components/site/Hero";
import ProgressRail from "@/components/site/ProgressRail";
import BreadChapter from "@/components/story/BreadChapter";

const UPCOMING = [
  {
    id: "buns",
    index: "02",
    title: "Soft Buns",
    note: "Same scroll-film grammar, applied to the eight-pack.",
    img: "/assets/brand/packaging-buns-8pack.webp",
    alt: "KV Delight soft buns, eight in a clear film pack.",
    w: 1536,
    h: 1024,
  },
  {
    id: "cream-buns",
    index: "03",
    title: "Cream Buns",
    note: "The cross-section reveal is already storyboarded.",
    img: "/assets/product/cream-bun-hero.webp",
    alt: "Four KV Delight cream buns on a warm, softly lit surface.",
    w: 1536,
    h: 1024,
  },
];

export default function Home() {
  return (
    <>
      <a
        href="#bread"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-sm focus:bg-cream focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to the bread chapter
      </a>

      <Header />
      <ProgressRail />

      <main>
        <Hero />
        <BreadChapter />

        {/* Next chapters — placeholders only, not built in this pass. */}
        <section
          aria-labelledby="next-heading"
          className="relative mx-auto max-w-[1500px] px-5 py-24 sm:px-10 sm:py-32 lg:pr-24"
        >
          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-cream/10 pt-8">
            <h2 id="next-heading" className="display text-3xl sm:text-5xl">
              Next in the film
            </h2>
            <p className="eyebrow">In production — not yet built</p>
          </div>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {UPCOMING.map((item) => (
              <li
                key={item.id}
                className="group relative overflow-hidden rounded-sm border border-cream/10 bg-ink-soft"
              >
                <div className="relative aspect-[3/2] overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.alt}
                    width={item.w}
                    height={item.h}
                    loading="lazy"
                    className="h-full w-full object-cover opacity-60 grayscale-[35%] transition duration-700 group-hover:scale-[1.02] group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                  <div>
                    <p className="eyebrow">{item.index}</p>
                    <h3 className="display mt-1 text-2xl sm:text-3xl">{item.title}</h3>
                    <p className="mt-2 max-w-xs text-xs leading-relaxed text-cream-dim">
                      {item.note}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.55rem] uppercase tracking-[0.28em] text-cream/30">
                    Soon
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-cream/10 bg-ink-deep px-5 py-10 sm:px-10">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10" />
            <span className="flex flex-col gap-1.5">
              <span className="wordmark text-[0.58rem]">KV Delight</span>
              <span className="tagline text-[0.46rem] text-cream/40">
                Every Bite Brings Delight
              </span>
            </span>
          </div>
          <p className="text-[0.62rem] uppercase tracking-[0.24em] text-cream/35">
            Chapter one · bread, from whole loaf to sealed pack
          </p>
        </div>
      </footer>
    </>
  );
}
