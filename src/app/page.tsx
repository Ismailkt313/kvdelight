import Header from "@/components/site/Header";
import BrandMark from "@/components/site/BrandMark";
import Hero from "@/components/site/Hero";
import ProgressRail from "@/components/site/ProgressRail";
import BreadChapter from "@/components/story/BreadChapter";
import BunsChapter from "@/components/story/BunsChapter";
import CreamChapter from "@/components/story/CreamChapter";
import FounderSection from "@/components/site/FounderSection";

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
        <BunsChapter />

        <CreamChapter />
        <FounderSection />
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
            Bread · Soft Buns · Cream Buns — three chapters, one take
          </p>
        </div>
      </footer>
    </>
  );
}
