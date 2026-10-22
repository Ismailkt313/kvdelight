"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/useReducedMotion";
import StageBoundary from "@/components/three/StageBoundary";
import StageFallback from "@/components/three/StageFallback";
import { note, reportError } from "@/lib/diagnostics";
import { paint } from "@/lib/domPaint";
import { BEATS, TIMELINE, bell, smoothstep } from "@/lib/creamChoreography";

/**
 * The still that holds the frame while the stage's chunk is in flight.
 *
 * The supplied cross-section is the right hold for this chapter — one bun, cut,
 * cream visible — and it is dimmed and scrimmed so the 3D bun replacing it is a
 * dissolve rather than a swap. It is also the only photograph of a single cream
 * bun in the brand set; `cream-bun-hero.webp` shows four and would have put a
 * second product on screen.
 */
function StagePoster() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <img
        src="/assets/product/cream-bun-cross-section.webp"
        alt=""
        width={1536}
        height={1024}
        loading="lazy"
        decoding="async"
        className="absolute inset-x-0 top-1/2 h-auto w-full -translate-y-1/2 object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-[radial-gradient(88%_68%_at_50%_42%,rgba(44,27,14,0.4)_0%,rgba(22,13,6,0.66)_55%,rgba(12,7,3,0.92)_100%)]" />
    </div>
  );
}

const CreamStage = dynamic(() => import("@/components/three/CreamStage"), {
  ssr: false,
  loading: () => <StagePoster />,
});

/**
 * Chapter three — the cream bun.
 *
 * Built to the same pattern as the first two chapters, and deliberately last in
 * the film: the bread chapter shows the loaf cut and packed, the buns chapter
 * shows a bun opened and packed, and this one closes the loop by filling a bun
 * before it is packed. It is a scroll-scrubbed WebGL scene with a photographed
 * still for the frames either side of it, a static document for reduced motion,
 * and an error boundary that falls back to the real four-pack.
 */
export default function CreamChapter() {
  const sectionRef = useRef<HTMLElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const packRef = useRef<HTMLDivElement>(null);
  const packShadowRef = useRef<HTMLDivElement>(null);
  const packCopyRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reduced = useReducedMotion();
  const [motionFailed, setMotionFailed] = useState(false);
  const [stageWanted, setStageWanted] = useState(false);

  /** Nothing expensive is built until the chapter is actually approached. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver !== "function") {
      setStageWanted(true);
      return;
    }
    let io: IntersectionObserver | undefined;
    try {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setStageWanted(true);
            io?.disconnect();
          }
        },
        { rootMargin: "0px 0px -30% 0px" },
      );
      io.observe(el);
    } catch {
      setStageWanted(true);
    }
    return () => io?.disconnect();
  }, []);

  const onReady = useCallback(() => {
    try {
      ScrollTrigger.refresh();
      note("cream:choreography", "scroll triggers refreshed");
    } catch (error) {
      reportError("cream:choreography:refresh-on-ready", error);
    }
  }, []);

  useEffect(() => {
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section) return;

    const packEl = packRef.current;
    const packCopyEl = packCopyRef.current;
    const packShadowEl = packShadowRef.current;
    const veilEl = veilRef.current;
    if (!packEl || !packCopyEl || !packShadowEl || !veilEl) {
      note("cream:choreography", "skipped: a motion ref was not mounted");
      return;
    }

    const beatEls = beatRefs.current.filter(Boolean) as HTMLDivElement[];
    if (beatEls.length !== BEATS.length) {
      note("cream:choreography", `skipped: ${beatEls.length}/${BEATS.length} captions`);
      return;
    }

    const update = (p: number) => {
      for (let i = 0; i < BEATS.length; i++) {
        const [a, b] = BEATS[i].window;
        const vis = bell(p, a, b);
        paint(beatEls[i], { opacity: vis, translateY: (1 - vis) * 24 });
      }

      // A short dissolve in from the soft buns' bright eight-pack.
      paint(veilEl, { opacity: 0.78 * (1 - smoothstep(0, 0.035, p)) });

      const packIn = smoothstep(TIMELINE.packIn, TIMELINE.packInEnd, p);
      paint(packEl, {
        opacity: packIn,
        translateY: (1 - packIn) * 46,
        scale: 1.05 - packIn * 0.05,
      });

      paint(packShadowEl, {
        opacity: packIn * 0.85,
        scaleX: 0.72 + packIn * 0.28,
        centreX: true,
      });

      const copyIn = smoothstep(TIMELINE.packCopy, TIMELINE.packCopyEnd, p);
      paint(packCopyEl, { opacity: copyIn, translateY: (1 - copyIn) * 20 });
    };

    try {
      update(0);
    } catch (error) {
      reportError("cream:choreography:initial-paint", error);
      setMotionFailed(true);
      return;
    }

    /* One-pole smoothing, identical to the other chapters: the stage reads the
     * ref directly, so the DOM and the film share one notion of "now". */
    let raf = 0;
    let target = 0;
    let shown = 0;

    const step = () => {
      raf = 0;
      const delta = target - shown;
      try {
        if (Math.abs(delta) < 0.0005) {
          shown = target;
        } else {
          shown += delta * 0.18;
        }
        progressRef.current = shown;
        update(shown);
      } catch (error) {
        reportError("cream:choreography:frame", error);
        setMotionFailed(true);
        return;
      }
      if (shown !== target) raf = requestAnimationFrame(step);
    };

    const seek = (v: number) => {
      target = v;
      if (!raf) raf = requestAnimationFrame(step);
    };

    let st: ScrollTrigger | undefined;
    try {
      st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate(self) {
          seek(self.progress);
        },
      });
    } catch (error) {
      reportError("cream:choreography:scrolltrigger", error);
      setMotionFailed(true);
      return;
    }

    // A reload that lands mid-chapter never sees a scroll event.
    try {
      const start = st.progress;
      if (start > 0) {
        shown = start;
        target = start;
        progressRef.current = start;
        update(start);
      }
    } catch (error) {
      reportError("cream:choreography:initial-seek", error);
    }

    const refresh = () => {
      try {
        ScrollTrigger.refresh();
      } catch (error) {
        reportError("cream:choreography:refresh", error);
      }
    };
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh).catch(() => {});

    return () => {
      window.removeEventListener("load", refresh);
      cancelAnimationFrame(raf);
      try {
        st?.kill();
      } catch {
        /* ignore */
      }
    };
  }, [reduced]);

  /* -------------------------------------------------- reduced-motion view -- */
  if (reduced || motionFailed) {
    return (
      <section id="cream-buns" aria-labelledby="cream-heading" className="relative">
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-20 sm:px-8 sm:pt-24">
          <p className="eyebrow">Chapter three — Cream Buns</p>
          <h2
            id="cream-heading"
            className="display mt-4 text-[clamp(2rem,7vw,3.4rem)] leading-[0.95]"
          >
            One cream bun — opened, filled, closed, then packed four to a pack
          </h2>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-cream-dim">
            {motionFailed
              ? "The animated film could not start on this device, so the story is below in full."
              : "The animated film is paused because your device asks for reduced motion; the story is below in full."}
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-4 px-5 sm:grid-cols-2 sm:px-8">
          <div className="overflow-hidden rounded-sm border border-cream/10 bg-ink-soft p-3">
            <img
              src="/assets/product/cream-bun-cross-section.webp"
              alt="A KV Delight cream bun cut in half, thick cream piped between the two halves."
              className="mx-auto h-auto w-full"
              width={1536}
              height={1024}
            />
          </div>
          <div className="overflow-hidden rounded-sm border border-cream/10 bg-ink-soft p-3">
            <img
              src="/assets/brand/packaging-cream-bun-4pack.webp"
              alt="KV Delight cream buns, four to a pack."
              className="mx-auto h-auto w-full"
              width={1024}
              height={1536}
            />
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
          <ol className="mt-12 space-y-10">
            {BEATS.map((b) => (
              <li key={b.index} className="border-t border-cream/10 pt-5">
                <p className="eyebrow">
                  {b.index} — {b.kicker}
                </p>
                <h3 className="display mt-3 whitespace-pre-line text-3xl">{b.title}</h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-dim">
                  {b.body}
                </p>
              </li>
            ))}
            <li className="border-t border-cream/10 pt-5">
              <p className="eyebrow">05 — Sealed</p>
              <h3 className="display mt-3 text-3xl">Cream Buns — Four pack</h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-dim">
                The same buns, exactly as supplied in the sealed four-pack.
              </p>
            </li>
          </ol>
        </div>
      </section>
    );
  }

  /* -------------------------------------------------------- motion view --- */
  return (
    <section
      id="cream-buns"
      ref={sectionRef}
      aria-labelledby="cream-heading"
      className="relative h-[360svh] sm:h-[380svh]"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(88%_68%_at_50%_40%,#2c1a0d_0%,#170e07_56%,#0c0703_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />

        <div className="absolute inset-0">
          {stageWanted ? (
            <div className="stage-enter absolute inset-0">
              <StageBoundary
                fallback={
                  <StageFallback
                    src="/assets/brand/packaging-cream-bun-4pack.webp"
                    alt="KV Delight cream buns, four to a pack."
                    width={1024}
                    height={1536}
                    subject="the cream buns"
                  />
                }
              >
                <CreamStage
                  progressRef={progressRef}
                  active
                  reducedMotion={false}
                  quality="auto"
                  onReady={onReady}
                />
              </StageBoundary>
            </div>
          ) : (
            <StagePoster />
          )}
        </div>

        {/* hand-off dissolve from the previous chapter */}
        <div
          ref={veilRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 bg-ink opacity-0"
        />

        {/* floor shadow beneath the pack */}
        <div
          ref={packShadowRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[24svh] left-1/2 h-14 w-[56vw] max-w-[520px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,0,0,0.75),rgba(0,0,0,0))] opacity-0 blur-md sm:bottom-[22svh]"
        />

        {/* packaging hand-off — the supplied four-pack, unchanged */}
        <div
          ref={packRef}
          className="pointer-events-none absolute inset-0 flex items-center justify-center pb-[26svh] opacity-0 will-change-transform sm:pb-[24svh]"
        >
          <img
            src="/assets/brand/packaging-cream-bun-4pack.webp"
            alt="KV Delight cream buns in their sealed four-pack."
            loading="lazy"
            decoding="async"
            width={1024}
            height={1536}
            className="h-auto w-[70vw] max-h-[46svh] object-contain drop-shadow-[0_36px_60px_rgba(0,0,0,0.6)] sm:w-auto sm:max-h-[58svh] sm:max-w-[70vw]"
          />
        </div>

        {/* chapter title, always readable for assistive tech */}
        <h2 id="cream-heading" className="sr-only">
          KV Delight cream buns — one bun opened, filled with cream, closed and
          sealed four to a pack
        </h2>
        <p className="sr-only">
          The sequence runs in five scenes: a single closed cream bun in warm
          light; the top half lifting back along its seam; a piping nozzle
          descending to fill the bun with cream; the halves closing over the
          cream with a little showing at the seam; and the sealed four-pack
          arriving as the bun leaves the frame.
        </p>

        {/* captions, bottom-left, in the same strip as the other two chapters */}
        <div className="absolute inset-0 z-20 flex items-end" aria-hidden="true">
          <div className="mx-auto w-full max-w-[1500px] px-5 pb-[max(1.1rem,env(safe-area-inset-bottom))] sm:px-10 sm:pb-[6svh]">
            <div className="relative h-[32svh] w-full max-w-[34rem] sm:h-[30svh]">
              {BEATS.map((beat, i) => (
                <div
                  key={beat.index}
                  ref={(el) => {
                    beatRefs.current[i] = el;
                  }}
                  className="absolute inset-0 flex flex-col justify-end opacity-0 will-change-transform"
                >
                  <p className="eyebrow">
                    {beat.index} — {beat.kicker}
                  </p>
                  <p className="display mt-3 whitespace-pre-line text-[clamp(2.05rem,9vw,2.9rem)] leading-[0.9] sm:mt-4 sm:text-[clamp(2rem,3.3vw,3.2rem)] [@media(max-height:600px)]:text-[clamp(1.5rem,4.4vw,2.1rem)]">
                    {beat.title}
                  </p>
                  <p className="mt-3 max-w-sm text-[0.82rem] leading-relaxed text-cream-dim sm:mt-4 sm:text-[0.9rem] [@media(max-height:520px)]:hidden">
                    {beat.body}
                  </p>
                </div>
              ))}

              {/* the sealed caption, in the same strip, faded in on its own */}
              <div
                ref={packCopyRef}
                className="pointer-events-none absolute inset-0 flex flex-col justify-end opacity-0 will-change-transform"
              >
                <p className="eyebrow">05 — Sealed</p>
                <p className="display mt-3 text-[clamp(2.05rem,9vw,2.9rem)] leading-[0.9] text-gold sm:mt-4 sm:text-[clamp(2rem,3.3vw,3.2rem)] [@media(max-height:600px)]:text-[clamp(1.5rem,4.4vw,2.1rem)]">
                  Cream Buns
                </p>
                <p className="mt-2 text-[0.62rem] uppercase tracking-[0.3em] text-cream/70">
                  Four to a pack
                </p>
                <p className="mt-3 max-w-sm text-[0.82rem] leading-relaxed text-cream-dim sm:mt-4 sm:text-[0.9rem] [@media(max-height:520px)]:hidden">
                  Soft bun, piped cream, sealed four to a pack — the last frame of
                  the film.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
