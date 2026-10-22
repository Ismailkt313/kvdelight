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
import { BEATS, TIMELINE, bell, smoothstep } from "@/lib/bunChoreography";

/**
 * Held for the moment the stage's chunk is in flight, and while the chapter is
 * still out of view.
 *
 * It is deliberately empty of product. The bread chapter's poster is its still
 * because the still *is* the loaf; here the opening frame is a bun in the dark,
 * and no supplied photograph of a single bun exists. Showing the eight-pack at
 * p = 0 would be the wrong product in the hero slot, so this is just the light.
 */
function StagePoster() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-[radial-gradient(62%_48%_at_50%_46%,rgba(96,58,26,0.5)_0%,rgba(44,26,13,0.42)_45%,rgba(14,8,4,0.9)_100%)]"
    />
  );
}

const BunStage = dynamic(() => import("@/components/three/BunStage"), {
  ssr: false,
  loading: () => <StagePoster />,
});

export default function BunsChapter() {
  const sectionRef = useRef<HTMLElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const packRef = useRef<HTMLDivElement>(null);
  const packShadowRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const packCopyRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const reduced = useReducedMotion();
  const [motionFailed, setMotionFailed] = useState(false);
  const [stageWanted, setStageWanted] = useState(false);

  /**
   * Nothing expensive is built until the chapter is approached.
   *
   * The section sits a full screen below the hero, so an unstyled observer would
   * fire on the first frame of the page load. The -30% bottom margin means the
   * visitor has to have actually started scrolling, which still leaves a screen
   * of run-up for the chunk and the scene.
   */
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
      note("buns:choreography", "scroll triggers refreshed");
    } catch (error) {
      reportError("buns:choreography:refresh-on-ready", error);
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
      note("buns:choreography", "skipped: a motion ref was not mounted");
      return;
    }

    const beatEls = beatRefs.current.filter(Boolean) as HTMLDivElement[];
    if (beatEls.length !== BEATS.length) {
      note("buns:choreography", `skipped: ${beatEls.length}/${BEATS.length} captions`);
      return;
    }

    // Plain `style` writes, never `gsap.quickSetter` — see `lib/domPaint`.
    const update = (p: number) => {
      for (let i = 0; i < BEATS.length; i++) {
        const [a, b] = BEATS[i].window;
        const vis = bell(p, a, b);
        paint(beatEls[i], { opacity: vis, translateY: (1 - vis) * 24 });
      }

      const packIn = smoothstep(TIMELINE.packIn, TIMELINE.packInEnd, p);
      paint(packEl, {
        opacity: packIn,
        translateY: (1 - packIn) * 46,
        scale: 1.06 - packIn * 0.06,
      });

      paint(packShadowEl, {
        opacity: packIn * 0.85,
        scaleX: 0.72 + packIn * 0.28,
        centreX: true,
      });

      // The bread chapter ends on a bright sealed pack; this one opens on a bun
      // in near-darkness. Without a beat of black the cut between them reads as
      // a fault, so the frame fades up from ink over the first few percent.
      paint(veilEl, { opacity: 0.92 * (1 - smoothstep(0, 0.045, p)) });

      const copyIn = smoothstep(TIMELINE.packCopy, TIMELINE.packCopyEnd, p);
      paint(packCopyEl, { opacity: copyIn, translateY: (1 - copyIn) * 20 });
    };

    try {
      update(0);
    } catch (error) {
      reportError("buns:choreography:initial-paint", error);
      setMotionFailed(true);
      return;
    }

    /*
     * One-pole smoothing toward the scroll position.
     *
     * ScrollTrigger reports the raw position; without this the camera dolly
     * steps with every wheel notch. It cannot be left to `scrub` because the
     * geometry reads this ref directly and a GSAP tween would give the DOM and
     * the stage two different notions of "now".
     */
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
        reportError("buns:choreography:frame", error);
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
      reportError("buns:choreography:scrolltrigger", error);
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
      reportError("buns:choreography:initial-seek", error);
    }

    const refresh = () => {
      try {
        ScrollTrigger.refresh();
      } catch (error) {
        reportError("buns:choreography:refresh", error);
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
      <section id="buns" aria-labelledby="buns-heading" className="relative">
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-20 sm:px-8 sm:pt-24">
          <p className="eyebrow">Chapter two — Soft Buns</p>
          <h2
            id="buns-heading"
            className="display mt-4 text-[clamp(2rem,7vw,3.4rem)] leading-[0.95]"
          >
            One soft bun — pressed, split, then packed eight to a bag
          </h2>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-cream-dim">
            {motionFailed
              ? "The animated film could not start on this device, so the story is below in full."
              : "The animated film is paused because your device asks for reduced motion; the story is below in full."}
          </p>
        </div>

        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="overflow-hidden rounded-sm border border-cream/10 bg-ink-soft p-4">
            <img
              src="/assets/brand/packaging-buns-8pack.webp"
              alt="KV Delight soft buns, eight in a clear film pack."
              className="mx-auto h-auto w-full max-w-2xl"
              width={1536}
              height={1024}
            />
          </div>

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
              <h3 className="display mt-3 text-3xl">Soft Buns — Eight pack</h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-dim">
                The same buns, exactly as supplied in the sealed eight-pack.
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
      id="buns"
      ref={sectionRef}
      aria-labelledby="buns-heading"
      className="relative h-[480svh]"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* atmosphere — the same warm oven light the bread chapter opens on */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(88%_68%_at_50%_40%,#2c1a0d_0%,#170e07_56%,#0c0703_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />
        {/* and the hand-off into the cream buns section, with no hard edge */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-ink/80" />

        <div className="absolute inset-0">
          {stageWanted ? (
            <div className="stage-enter absolute inset-0">
              <StageBoundary
                fallback={
                  <StageFallback
                    src="/assets/brand/packaging-buns-8pack.webp"
                    alt="KV Delight soft buns, eight in a clear film pack."
                    width={1536}
                    height={1024}
                    subject="the soft buns"
                  />
                }
              >
                <BunStage
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

        {/* opening fade, so the cut from the bread chapter is a dissolve */}
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

        {/* packaging hand-off — the supplied eight-pack, unchanged */}
        <div
          ref={packRef}
          className="pointer-events-none absolute inset-0 flex items-center justify-center pb-[26svh] opacity-0 will-change-transform sm:pb-[24svh]"
        >
          <img
            src="/assets/brand/packaging-buns-8pack.webp"
            alt="KV Delight soft buns in their sealed eight-pack."
            width={1536}
            height={1024}
            className="h-auto w-[86vw] max-h-[46svh] object-contain drop-shadow-[0_36px_60px_rgba(0,0,0,0.6)] sm:w-auto sm:max-h-[58svh] sm:max-w-[76vw]"
          />
        </div>

        {/* chapter title, always readable for assistive tech */}
        <h2 id="buns-heading" className="sr-only">
          KV Delight soft buns — one bun, pressed, split in two, then sealed
          eight to a pack
        </h2>
        <p className="sr-only">
          The sequence runs in five scenes: a single soft bun in the dark,
          moving into the light; a press that squashes it and lets it come back;
          the bun parting along its seam into two halves, showing pale crumb
          inside a golden crust; the halves closing again; and the sealed
          eight-pack arriving as the bun leaves.
        </p>

        {/*
          Captions, bottom-left, in the same strip as the bread chapter.
          `bunChoreography.bunScreenRect` keeps the bun out of this strip on
          every viewport and at every progress value.
        */}
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
                  Soft Buns
                </p>
                <p className="mt-2 text-[0.62rem] uppercase tracking-[0.3em] text-cream/70">
                  Eight to a pack
                </p>
                <p className="mt-3 max-w-sm text-[0.82rem] leading-relaxed text-cream-dim sm:mt-4 sm:text-[0.9rem] [@media(max-height:520px)]:hidden">
                  The same buns, wrapped and sealed — the end of the chapter, and
                  the start of the next.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
