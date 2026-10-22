# KV Delight — scroll-controlled product film

Foundation + **bread chapter** + **soft buns chapter**. Cream buns are queued as
the next sequence and are intentionally not built yet.

```
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · GSAP ScrollTrigger · three.js
```

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
npm run typecheck
```

## What exists

| Path | Purpose |
|---|---|
| `src/app/page.tsx` | Page composition: bread chapter, soft buns chapter, cream-buns placeholder, footer. |
| `src/components/story/BreadChapter.tsx` | The whole bread sequence: pinned stage, GSAP ScrollTrigger scrub, caption beats, packaging hand-off, reduced-motion variant. |
| `src/components/three/LoafStage.tsx` | three.js stage: camera choreography, lighting, pointer parallax, responsive framing, render-loop pausing. |
| `src/lib/loaf.ts` | **Procedural loaf**: geometry (superellipsoid pan-loaf with crown humps and crust noise), vertex-colour crust, canvas-generated grain + contact-shadow textures, crust material. |
| `src/lib/useReducedMotion.ts` | Live `prefers-reduced-motion` hook (`useSyncExternalStore`). |
| `src/components/story/BunsChapter.tsx` | Soft buns film: the supplied eight-pack rises, tilts in perspective and settles while captions hand over. |
| `src/lib/choreography.ts` | Shared timing/pose maths, including `BREAD_HANDOFF` and `createPoseWriter`. |
| `src/components/site/Header.tsx`, `ProgressRail.tsx` | Brand header (with scroll scrim) and numbered progress rail. |
| `public/assets/` | Supplied assets only — see `public/assets/CREDITS.md`. |

## Chapter 1 — bread (one pinned stage, `h-[460svh]`)

Section progress `p` is written by ScrollTrigger into a ref and read by the
render loop, so GSAP drives the DOM while three.js stays on `requestAnimationFrame`.

| `p` | Beat | What happens |
|---|---|---|
| 0.00 | 01 · Unwrapped | Loaf in focus, "Every Bite Brings Delight", scroll cue. |
| 0.16 → 0.74 | 02 · In the round | One genuine **360° Y rotation**, eased in/out, with a slight turntable pitch so the crust top stays readable. |
| 0.55 → 0.78 | 03 · Hand-off | Loaf squares up to camera, unwinds its side drift and shrinks to the shared hand-off scale. |
| 0.715 → 0.80 | — | Loaf cross-dissolves **while shrinking** into the pack silhouette. |
| 0.725 → 0.97 | 04 · Sealed | The pack grows out of the loaf's final scale, rises 40px and settles, over a floor shadow + warm bloom. Copy arrives 0.87 → 0.97. |

The loaf and the pack are two different renderers, so their shared beats live in
`BREAD_HANDOFF` (`src/lib/choreography.ts`) and are read by both. One rule makes
the merge read as one object: they share the same centre anchor, and the pack
starts at exactly the scale the loaf finishes on.

> **Gotcha worth knowing:** several `gsap.quickSetter(el, "scale" | "y" | "rotate")`
> on the *same* node each keep their own transform cache and silently clobber one
> another. All pack poses are therefore written by a single `createPoseWriter`.

## Chapter 2 — soft buns (`h-[340svh]`)

A shorter, calmer film built from the supplied eight-pack photograph:

| `p` | Beat | What happens |
|---|---|---|
| 0.00 | 01 · The tray | Pack already present at 55% opacity, top of the stage, caption below. |
| 0.00 → 0.30 | — | Pack rises 38px, fades to full, scales 0.90 → 1.00. |
| 0.12 → 0.92 | — | Slow perspective `rotateY` sweep (up to −13° and back) with a gentle side drift. This is a flat photograph moved in 3D — deliberately not a claim of 360° rotation. |
| 0.36 → 0.62 | 02 · Sealed | Copy hands over; glow and floor shadow ramp. |
| 0.68 → 1.00 | 03 · Soft Buns | Closing caption; chapter hands off to the cream-buns placeholder. |

## Honest note about the 3D

The loaf is **real geometry**, generated in code — not a flat image pretending to
be 3D. It rotates a true 360°, so every angle is genuinely new. What it is *not*
is a photogrammetry-grade asset: the crust is vertex colour + a generated grain
map, so it reads as a stylised, cinematic hero rather than a photograph. If you
later supply a `.glb` or an ai-generated turntable sequence, only
`LoafStage`/`lib/loaf.ts` change — the scroll choreography is untouched.

## Accessibility & performance

- `prefers-reduced-motion: reduce` swaps the whole chapter for a readable,
  static, image-led document (no pinning, no scrub, no WebGL).
- The chapter has an `sr-only` `h1`; captions are real text, not canvas.
- Skip link, visible focus rings, `<nav aria-label>`; coming-soon chapters are
  `aria-disabled` spans, not dead links.
- Render loop pauses via `IntersectionObserver` when the stage is off-screen and
  is skipped entirely when the chapter is inactive; DPR capped at 1.75 (1.5 mobile).
- Fonts are self-hosted by `next/font` (no third-party requests). All imagery is
  supplied brand art, converted to WebP, with intrinsic `width`/`height` set.
- WebGL failure falls back to the supplied hero photograph — never a stock image.

## Known follow-ups

1. The five coffee-website style screenshots are still missing (`public/assets/style/`).
2. Original master logo (transparent PNG/SVG) still needed; the redrawn reference is used meanwhile.
3. No isolated bread-slice asset yet → the "slices" beat is represented by the
   pack's slice window rather than an invented shot.
4. The cream-bun chapter reuses `BunsChapter`'s contract (hero → cross-section → 4-pack).
