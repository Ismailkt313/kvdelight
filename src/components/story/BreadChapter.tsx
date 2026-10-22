"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { BEATS, TIMELINE, bell, smoothstep } from "@/lib/choreography";

const LoafStage = dynamic(() => import("@/components/three/LoafStage"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <span className="eyebrow animate-pulse">Preparing the oven…</span>
    </div>
  ),
});

export default function BreadChapter() {
  const sectionRef = useRef<HTMLElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const packRef = useRef<HTMLDivElement>(null);
  const packShadowRef = useRef<HTMLDivElement>(null);
  const packCopyRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reduced = useReducedMotion();

  const onReady = useCallback(() => {
    ScrollTrigger.refresh();
  }, []);

  useEffect(() => {
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section) return;

    const beatEls = beatRefs.current.filter(Boolean) as HTMLDivElement[];
    const setters = {
      y: beatEls.map((el) => gsap.quickSetter(el, "y", "px") as (v: number) => void),
      opacity: beatEls.map(
        (el) => gsap.quickSetter(el, "opacity") as (v: number) => void,
      ),
      packY: gsap.quickSetter(packRef.current!, "y", "px") as (v: number) => void,
      packOpacity: gsap.quickSetter(packRef.current!, "opacity") as (v: number) => void,
      packScale: gsap.quickSetter(packRef.current!, "scale") as (v: number) => void,
      copyOpacity: gsap.quickSetter(packCopyRef.current!, "opacity") as (v: number) => void,
      copyY: gsap.quickSetter(packCopyRef.current!, "y", "px") as (v: number) => void,
      cueOpacity: gsap.quickSetter(cueRef.current!, "opacity") as (v: number) => void,
      packShadow: gsap.quickSetter(packShadowRef.current!, "opacity") as (v: number) => void,
      packShadowScale: gsap.quickSetter(packShadowRef.current!, "scaleX") as (v: number) => void,
    };

    const update = (p: number) => {
      // Captions — driven by the same windows the geometry uses.
      BEATS.forEach((beat, i) => {
        const [a, b] = beat.window;
        const vis = bell(p, a, b);
        setters.opacity[i](vis);
        setters.y[i]((1 - vis) * 26);
      });

      // Packaging hand-off: the slices leave, the supplied pack arrives.
      const packIn = smoothstep(TIMELINE.packIn, TIMELINE.packInEnd, p);
      setters.packOpacity(packIn);
      setters.packY((1 - packIn) * 60);
      setters.packScale(1.07 - packIn * 0.07);
      setters.packShadow(packIn * 0.9);
      setters.packShadowScale(0.7 + packIn * 0.3);

      const copyIn = smoothstep(TIMELINE.packCopy, TIMELINE.packCopyEnd, p);
      setters.copyOpacity(copyIn);
      setters.copyY((1 - copyIn) * 22);

      // Opening cue
      setters.cueOpacity(1 - smoothstep(0, 0.045, p));
    };

    update(0);

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate(self) {
        const p = self.progress;
        progressRef.current = p;
        update(p);
      },
    });

    // Fonts and images change layout height — re-measure once they settle.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh).catch(() => {});

    return () => {
      window.removeEventListener("load", refresh);
      st.kill();
    };
  }, [reduced]);

  /* -------------------------------------------------- reduced-motion view -- */
  if (reduced) {
    return (
      <section id="bread" aria-labelledby="bread-heading" className="relative">
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-28 sm:px-8 sm:pt-36">
          <p className="eyebrow">Chapter one — Bread</p>
          <h1
            id="bread-heading"
            className="display mt-4 text-[13vw] leading-[0.9] sm:text-[6.5vw]"
          >
            Every Bite
            <br />
            <em className="not-italic text-gold">Brings Delight</em>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-cream-dim">
            One loaf, out of the tin and into the light — then sliced, slice by
            slice. The animated film is paused because your device asks for
            reduced motion; the story is below in full.
          </p>
        </div>

        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="overflow-hidden rounded-sm border border-cream/10 bg-ink-soft">
              <img
                src="/assets/product/bread-hero-loaf-crop.webp"
                alt="A freshly baked KV Delight loaf on a wooden board, with flour, wheat and butter around it."
                className="h-full w-auto object-cover"
                width={941}
                height={569}
              />
            </div>
            <div className="overflow-hidden rounded-sm border border-cream/10 bg-ink-soft">
              <img
                src="/assets/product/bread-hero-scene.webp"
                alt="The same KV Delight loaf in its full table scene, showing the crust and crumb."
                className="h-full w-full object-cover"
                width={1536}
                height={1024}
              />
            </div>
          </div>

          <ol className="mt-12 space-y-10">
            {BEATS.map((b) => (
              <li key={b.index} className="border-t border-cream/10 pt-5">
                <p className="eyebrow">
                  {b.index} — {b.kicker}
                </p>
                <h2 className="display mt-3 whitespace-pre-line text-3xl">
                  {b.title}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-dim">
                  {b.body}
                </p>
              </li>
            ))}
            <li className="border-t border-cream/10 pt-5">
              <p className="eyebrow">05 — Sealed</p>
              <h2 className="display mt-3 text-3xl">
                Sandwich Bread — White Bread
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-dim">
                The fully packaged loaf, exactly as supplied on the pack artwork.
              </p>
              <img
                src="/assets/brand/packaging-sandwich-bread.webp"
                alt="KV Delight Sandwich Bread white bread in its sealed green pack."
                className="mt-6 w-full max-w-sm rounded-sm border border-cream/10"
                width={1024}
                height={1536}
              />
            </li>
          </ol>
        </div>
      </section>
    );
  }

  /* -------------------------------------------------------- motion view --- */
  return (
    <section
      id="bread"
      ref={sectionRef}
      aria-labelledby="bread-heading"
      className="relative h-[560svh]"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* atmosphere */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_38%,#2a1a0d_0%,#160d06_55%,#0c0703_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />

        {/* the slice film: whole loaf → knife → slices → spread → pack */}
        <div className="absolute inset-0">
          <LoafStage
            progressRef={progressRef}
            active
            reducedMotion={false}
            onReady={onReady}
          />
        </div>

        {/* floor shadow beneath the pack */}
        <div
          ref={packShadowRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[6svh] left-1/2 h-16 w-[52vw] max-w-[420px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,0,0,0.72),rgba(0,0,0,0))] opacity-0 blur-md sm:bottom-[5svh] sm:h-20"
        />

        {/* packaging hand-off — the supplied pack shot, unchanged */}
        <div
          ref={packRef}
          className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4 opacity-0 will-change-transform sm:items-center sm:pb-0"
        >
          <img
            src="/assets/brand/packaging-sandwich-bread-cutout.webp"
            alt="KV Delight Sandwich Bread in its sealed green pack."
            className="h-[58svh] w-auto max-w-[88vw] translate-y-[-4svh] object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)] sm:h-[82svh] sm:translate-y-0"
            width={534}
            height={1448}
          />
        </div>

        {/* chapter title, always readable for assistive tech */}
        <h1 id="bread-heading" className="sr-only">
          KV Delight bread — a whole loaf, sliced, then sealed in its pack
        </h1>
        <p className="sr-only">
          The sequence runs in five scenes: a whole unsliced loaf; a serrated
          bread knife cutting nine cross-cuts; the slices separating one by one,
          revealing pale crumb inside a golden crust; the slices fanned apart in
          a slow three-quarter turn; then the slices leaving as the sealed KV
          Delight Sandwich Bread pack arrives.
        </p>

        {/* captions */}
        <div className="absolute inset-0 z-20 flex items-end pb-[16svh] sm:items-center sm:pb-0">
          <div className="mx-auto w-full max-w-[1500px] px-5 sm:px-10">
            <div className="relative h-[36svh] w-full max-w-[34rem] sm:h-[40svh]">
              {BEATS.map((beat, i) => (
                <div
                  key={beat.index}
                  ref={(el) => {
                    beatRefs.current[i] = el;
                  }}
                  className="absolute inset-0 flex flex-col justify-end opacity-0 will-change-transform sm:justify-center"
                >
                  <p className="eyebrow">
                    {beat.index} — {beat.kicker}
                  </p>
                  <p className="display mt-4 whitespace-pre-line text-[10.5vw] leading-[0.88] sm:text-[4.1vw]">
                    {beat.title}
                  </p>
                  <p className="mt-5 max-w-md text-[0.82rem] leading-relaxed text-cream-dim sm:text-sm">
                    {beat.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* final caption sits right of the pack on desktop, below it on mobile */}
        <div
          ref={packCopyRef}
          className="pointer-events-none absolute inset-x-0 top-[16svh] z-30 mx-auto max-w-[1500px] px-5 opacity-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:px-10 sm:pr-36 lg:pr-52"
        >
          <div className="sm:ml-auto sm:max-w-sm sm:text-right">
            <p className="eyebrow">05 — Sealed</p>
            <p className="display mt-3 text-3xl sm:text-4xl">Sandwich Bread</p>
            <p className="mt-1 text-[0.7rem] uppercase tracking-[0.3em] text-gold">
              White Bread
            </p>
            <p className="mt-4 text-[0.82rem] leading-relaxed text-cream-dim">
              The same loaf, cut and wrapped — wherever it is going next.
            </p>
          </div>
        </div>

        {/* opening cue */}
        <div
          ref={cueRef}
          className="absolute inset-x-0 bottom-6 z-30 flex flex-col items-center gap-2"
        >
          <span className="eyebrow">Scroll to explore</span>
          <span className="block h-10 w-px bg-gradient-to-b from-cream/60 to-transparent" />
        </div>
      </div>
    </section>
  );
}
