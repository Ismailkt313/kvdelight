import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
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

      <Footer />
    </>
  );
}
