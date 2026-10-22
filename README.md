# KV Delight — scroll-controlled product film

Foundation + **bread chapter, rebuilt as a slice film**. Soft buns and cream
buns are still placeholders and are intentionally not built yet.

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

Fonts are self-hosted (`next/font/local`) — see `src/app/fonts/FONT-LICENCES.md`.
Nothing is fetched from a third party at build time or at runtime.

## What exists

| Path | Purpose |
|---|---|
| `src/app/page.tsx` | Page composition: bread chapter, next-chapter placeholders, footer. |
| `src/components/story/BreadChapter.tsx` | The chapter's DOM and scroll driver: five caption beats, the packaging hand-off, reduced-motion document. |
| `src/components/three/LoafStage.tsx` | three.js stage: lighting, environment, slice meshes, knife, camera, render loop. |
| `src/lib/slices.ts` | **Sliced loaf geometry**: ten closed slabs, each with a crust shell, crumb cut faces and a crust rim. |
| `src/lib/knife.ts` | Serrated bread knife, built from geometry (extruded profile + handle + rivets). |
| `src/lib/breadTextures.ts` | Canvas-generated crumb colour/bump maps and blade grain. No image files. |
| `src/lib/choreography.ts` | Scene timings, caption windows, knife + seam schedules. Shared by DOM and WebGL. |
| `src/lib/sliceLayout.ts` | Slice transforms, arc fan, yaw, camera framing, caption clearance. Pure maths. |
| `src/lib/loaf.ts` | The original whole-loaf geometry, its `fbm` noise (reused by the slices) and the crust material. |
| `src/components/site/Header.tsx`, `ProgressRail.tsx` | Brand header and numbered progress rail. Unchanged. |
| `public/assets/` | Supplied assets only — see `public/assets/CREDITS.md`. |

## The bread chapter (`h-[560svh]`, one pinned stage)

Section progress `p` is written by ScrollTrigger into a ref and read by the
render loop, so GSAP drives the DOM while three.js stays on `requestAnimationFrame`.
Captions and geometry read the same windows, so they cannot drift apart.

| `p` | Scene | What happens |
|---|---|---|
| 0.00 → 0.15 | **A · Whole loaf** | One complete, unsliced loaf at a three-quarter angle: "Every Bite Brings Delight", scroll cue. |
| 0.15 → 0.42 | **B · The cut** | The serrated knife drops into seam 1, saws through, lifts, repeats. Nine seams, left to right. Each seam's crack opens *as* the blade reaches it. |
| 0.42 → 0.60 | **C · Slices separate** | The slabs let go one at a time, each lifting and swinging slightly as its seams widen. Pale crumb, golden crust, a thin baked rim on every cut face. |
| 0.56 → 0.74 | **D · Spread** | The arrangement bends into an arc fan while the camera rises to a three-quarter view. |
| 0.74 → 0.82 | **D · Hold** | The composition is still — a held beat to read the crumb and the fan. |
| 0.82 → 0.90 | **E · Regroup** | Gaps collapse, the slices lift and fade out. |
| 0.86 → 1.00 | **E · Packaged** | The supplied KV Delight Sandwich Bread pack fades in, rises and settles; its caption arrives last. |

### How the slicing actually works

**The slices are pre-separated meshes, not runtime boolean cutting.** There is no
CSG, no clipping plane and no fracture solver. `createSliceGeometries` builds the
loaf once as ten independent closed slabs; the knife pass is *staged* — a seam
opens from a hairline crack to a visible gap exactly as the blade reaches it.

That is a deliberate trade. Because every slab is closed geometry with its own
crust shell, crumb face and crust rim, the loaf can be pulled apart in any
direction and every newly exposed surface is genuine geometry — which is why the
separation holds up from any angle, unlike a shader trick or a flat image. What
it is *not* is a simulation of a knife severing dough: nothing is being cut at
runtime.

Each slab is one mesh with two material groups (0 = crust, 1 = crumb), so the
cut faces get a different material without a second draw object.

> **Gotchas worth knowing**
> - The cut-face rim must use the *same displaced* surface function as the crust
>   shell (`crustPoint`), or every cut face sits up to 0.014 units inside its own
>   crust and shows a hairline crack.
> - Crust colour is driven by **height up the loaf**, not by the surface normal.
>   A squircle wall is vertical, so a normal-driven ramp puts `ny ≈ 0` along the
>   whole side and floods the loaf with the pale "touched the tin" colour.
> - Several `gsap.quickSetter(el, "scale" | "y" | "rotate")` on the *same* node
>   each keep their own transform cache and silently clobber one another, so the
>   pack poses are written by one series of setters inside one `update()`.
> - The spread does **not** do a full 360°: a long loaf pointed at the camera
>   collapses into a tunnel. It sweeps 40° to a three-quarter instead.

## Device safety and the mobile tier

The stage is wrapped in layers so a graphics failure can never take the page
down — this was the iPhone XS crash: a throw inside scene setup reached React's
boundary, and there was no boundary, so the entire route died.

1. **`StageBoundary`** (`components/three/StageBoundary.tsx`) — class boundary
   around the 3D stage only. React routes errors thrown in `useEffect` to the
   nearest boundary, so this catches what `LoafStage`'s own try/catch cannot.
2. **`LoafStage`** — one guarded `createBreadScene()` call. Nothing is built
   outside the try. On failure it disposes whatever was already created and
   renders `StageFallback`.
3. **`StageFallback`** — the supplied bread photograph, unchanged. Captions, the
   pack hand-off, the header and the footer keep working around it, because they
   are DOM and live outside the stage.
4. **`app/error.tsx`** and **`app/global-error.tsx`** — replace Next's bare
   "Application error" screen with brand art and a retry.

Hardening inside the stage:

- **No non-null assertions on canvases.** `safe2d()` returns `null` instead, and
  every texture generator degrades to `null` (materials then build without that
  map) rather than throwing. iOS returns `null` from `getContext("2d")` under
  memory pressure, and the four `getContext("2d")!` calls were a live
  `TypeError` waiting to happen.
- **Environment map is optional.** `PMREMGenerator` needs a half-float render
  target, the most likely thing to fail on an older mobile GPU. It is only
  attempted when the capability is present, and a failure returns no
  environment map instead of nothing at all.
- **Context loss is handled** — `webglcontextlost` swaps in the still.
- **No pre-flight probe canvas**: iOS keeps a small pool of WebGL contexts, so
  the guarded renderer construction *is* the detection.
- Textures are **cached per size across mounts**, so React StrictMode's double
  invoke and route re-entry do not regenerate several million `Math.sin` calls.

`quality="auto"` (`lib/quality.ts`) resolves on the client, so it cannot cause a
hydration mismatch. Touch-first, narrow, low-core or low-memory devices get:

| | high | low |
|---|---|---|
| pixel ratio cap | 1.75 | **1** |
| antialiasing | on | **off** |
| crust / crumb texture | 512² | **128²** (16× less pixel work) |
| tessellation | 30×9 | **18×5** (~2.9k triangles) |
| lights | 6 | **4** |
| materials | Physical (sheen/clearcoat) | **Standard** |
| environment map | on | **off** |

## Diagnostics (temporary)

The iPhone XS crash could not be reproduced off-device, so the app now reports on
itself. Open any URL with **`?diag=1`** to get an on-screen panel listing every
captured exception with its stack, shader compile/link logs, context loss and a
breadcrumb trail of the scene-setup steps (`renderer created`, `capabilities`,
`environment built/skipped`, `textures`, `geometry`, `prewarm`, `first frame`),
plus the WebGL capability dump and a **Copy** button. The same panel appears on
the error screens.

`lib/diagnostics.ts` also installs `window.error` and `unhandledrejection`
handlers, so errors that never reach React are recorded too — those were
previously invisible.

Remove the panel (and this section) once the device is confirmed healthy.

## Accessibility & performance

- `prefers-reduced-motion: reduce` swaps the chapter for a readable, static,
  image-and-text document (no pinning, no scrub, no WebGL).
- The chapter has an `sr-only` `h1`, and an `sr-only` paragraph that describes all
  five scenes for anyone who cannot see the film. Captions are real text.
- Skip link, visible focus rings, `<nav aria-label>`; coming-soon chapters are
  `aria-disabled` spans, not dead links.
- Render loop pauses via `IntersectionObserver` when the stage is off-screen; DPR
  capped at 1.75 (1.5 mobile, 1.4 on the low-quality path).
- Geometry is generated once and disposed on unmount. Materials switch to
  transparent only for the hand-off fade, so slabs sort crisply while being
  studied. Crumb/blade textures are canvas-generated — no network requests.
- WebGL failure falls back to the supplied hero photograph — never a stock image.
- Framing is computed from the arrangement's real rotated extent, so the fan is
  fitted to the frame at every aspect ratio instead of being scaled by hand.

## Known limitations

1. **The mobile crash is fixed by construction, not confirmed on the device.**
   There is no iPhone and no GPU in the development sandbox. What *is* verified:
   the build, the guards (every failure path returns `null` instead of throwing),
   the tier selection for an iPhone XS profile, and the boundary's fallback
   markup. What is *not* verified: which of the four candidate causes actually
   threw on the XS, and whether the full 3D scene now runs on it. See the note at
   the end of this file.
2. The knife is *simulated*: it plunges, saws and withdraws on a scroll schedule,
   and the seam it is working opens as it arrives. It does not test geometry
   against geometry.
3. No crumb particles or crumbs-on-the-board yet; the board itself is still the
   background gradient, not a modelled surface.
4. Slices are a fixed count (`SLICE_COUNT` in `choreography.ts`); changing it
   re-derives the knife stations and the fan.
5. Original master logo (transparent PNG/SVG) still needed; the redrawn reference
   is used meanwhile.
6. The five coffee-website style screenshots are still missing
   (`public/assets/style/`), and the `style/` directory does not exist yet.
7. Soft buns and cream buns are untouched placeholders, by instruction.

### The iPhone XS crash

Root cause: `useReducedMotion` subscribed with `mql.addEventListener("change")`.
`MediaQueryList.addEventListener` only exists from **Safari 14**; older iOS only
has the deprecated `addListener`. The call threw `TypeError: ... is not a
function` inside a React passive effect, and because that hook is used by
`BreadChapter` — which sits *outside* `StageBoundary` — the throw went straight
to the route error boundary and replaced the page. Desktop browsers have
supported the modern form for years, which is why only the phone failed, and why
the 3D stage was never the culprit.

`addMediaListener()` now prefers `addEventListener`, falls back to
`addListener`, and finally to a no-op. `ResizeObserver` (iOS 13.4+) and
`IntersectionObserver` gained the same treatment, falling back to `window.resize`
and "always visible" respectively.

### Confirming on the phone

Open the site on the iPhone with **Settings → Safari → Advanced → Web Inspector**
on, connect it to a Mac, then use **Safari → Develop → [iPhone] → kvdelight.app**.
The console prints either `[KV Delight] WebGL notes: …` (running, possibly
without an environment map), `[KV Delight] bread stage failed to start: …`
(fell back to the still, with the cause), or `[KV Delight] WebGL context lost`.
