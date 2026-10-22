# KV Delight — scroll-controlled product film

Foundation + **bread chapter, rebuilt as a slice film** + **chapter two, the
soft bun**. Cream buns are still a placeholder and are intentionally not built
yet.

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
| `src/app/page.tsx` | Page composition: hero, bread chapter, next-chapter placeholders, footer. |
| `src/components/site/Hero.tsx` | The opening act: crest, wordmark, headline, one whole loaf — before any of the film runs. |
| `src/components/site/BrandMark.tsx` | The supplied mark on a cream oval, at one ratio, from one asset. |
| `src/components/story/BreadChapter.tsx` | The chapter's DOM and scroll driver: five caption beats, the packaging hand-off, reduced-motion document. |
| `src/components/three/LoafStage.tsx` | three.js stage: lighting, environment, slice meshes, knife, camera, render loop. |
| `src/components/story/BunsChapter.tsx` | Chapter two's DOM and scroll driver: four caption beats plus the sealed pack, reduced-motion document. |
| `src/components/three/BunStage.tsx` | The bun's three.js stage: lights, crust/crumb materials, press and split transforms, camera, on-demand render loop. |
| `src/lib/bun.ts` | **Pre-separated bun halves**: two closed solids, each with a crust shell and a crumb cut face. No runtime cutting. |
| `src/lib/bunChoreography.ts` | Bun timings, press/split maths, camera framing and the screen-space guarantee that keeps the bun off the captions. |
| `src/lib/slices.ts` | **Sliced loaf geometry**: ten closed slabs, each with a crust shell, crumb cut faces and a crust rim. |
| `src/lib/knife.ts` | Serrated bread knife, built from geometry (extruded profile + handle + rivets). |
| `src/lib/breadTextures.ts` | Canvas-generated crumb colour/bump maps and blade grain. No image files. |
| `src/lib/choreography.ts` | Scene timings, caption windows, knife + seam schedules. Shared by DOM and WebGL. |
| `src/lib/sliceLayout.ts` | Slice transforms, arc fan, yaw, camera framing, caption clearance. Pure maths. |
| `src/lib/loaf.ts` | The original whole-loaf geometry, its `fbm` noise (reused by the slices) and the crust material. |
| `src/components/site/Header.tsx` | The compact sticky masthead. Hidden at the top of the page; revealed when the hero's own lockup leaves the screen. |
| `src/components/site/ProgressRail.tsx` | Numbered progress rail, wide screens only. |
| `public/assets/hero/` | Two **derived** atmosphere plates cut from `bread-hero-scene`: the kitchen window and the flour-dusted table. |
| `public/assets/` | Supplied assets only — see `public/assets/CREDITS.md`. |

## The opening act

### One logo at a time

The hero owns the brand at the top of the page: one large crest, one wordmark,
one headline. The sticky header is **not on screen there** — it would be a second
copy of the same mark a few hundred pixels away. `Header` watches `#hero-brand`
with an `IntersectionObserver` and slides in only when that lockup has left the
top, so the bar arrives exactly as the hero's identity leaves.

An observer rather than a scroll offset is deliberate: a pixel threshold has to
guess the hero's height and drifts on phones, where `100svh` changes as the URL
bar collapses. While hidden the header is `inert` (rendered in the server HTML,
not applied after hydration), so its links are not tab stops behind an invisible
bar. With JavaScript off the observer never runs, so a `<noscript>` rule pins it
open — it is the only navigation on the page.

The page used to open *inside* the bread chapter, so the first frame was the 3D
loaf filling the screen with the headline laid over it. `Hero.tsx` now owns the
first screen: crest, wordmark, headline, one line of support, and the supplied
loaf photograph — and the cutting film only begins after it scrolls away.

The backdrop is the brand's own photography, not stock: the window light and the
flour-dusted table in `public/assets/hero/` are crops of `bread-hero-scene`, the
same still the bread chapter falls back to — the same room, the same light, the
same table the loaf is standing on. Both are masked into the ink and carry no
baked-in copy (the crops are taken left of and below the poster's typeset
headline), so nothing repeats and nothing competes with the product.

The badge needed a decision. `kv-delight-logo-reference.png` is **red and gold
ink with no plate**: the white behind it is the page it was exported on, and its
oval ring is an *open arc* (measurably so — a 56 px morphological close still
leaves the interior connected to the outside), so there is no keying operation
that can enclose it. What the brand does with its own mark, in
`bread-hero-scene.png`, is print it on a cream oval — so that is what `BrandMark`
is: a cream oval **behind** the untouched artwork. Brand red goes from 3.7:1 on
ink to 4.7:1 on cream, nothing is recoloured, redrawn or cropped, and there is no
white tile, shadow or glow. `kv-delight-mark.{png,webp}` is the derived
transparent art (original file untouched).

Copy order on a phone is deliberate: branding → headline → support → bread. The
loaf never sits under a line of type, at any width.

## The bread chapter (`h-[520svh]`, one pinned stage)

Section progress `p` is written by ScrollTrigger into a ref and read by the
render loop, so GSAP drives the DOM while three.js stays on `requestAnimationFrame`.
Captions and geometry read the same windows, so they cannot drift apart.

ScrollTrigger only reports the raw scroll position, so the ref holds a value that
is *filtered* toward it by a one-pole smoothing loop (18% per frame). That is why
the dolly eases after the finger instead of stepping with each wheel notch —
`scrub` cannot do it here, because there is no timeline for it to interpolate.

The stage is **not mounted at page load**. An `IntersectionObserver` with a
-30% bottom margin waits until the hero has actually been scrolled before
importing `LoafStage`; `StagePoster` (the same photograph the hero used) holds
the frame, and the canvas fades in over 900 ms. On a phone this keeps the WebGL
context, four procedural textures and ten slab geometries off the critical path
entirely.

### The framing contract

`sliceLayout.ts` decides where the bread lands, and both the camera fit and the
DOM caption column read the same numbers:

- `CAPTION_BOX` — the strip the captions occupy (`top: 0.72` of the viewport).
- `captionShift` / `frameWidthFraction` — the bread's box, as fractions of the
  frame, sliding right of the caption column on landscape and centred on
  portrait.
- `fitScale` — fits the arrangement to that box *as projected*, compensating for
  the near slices of a fanned deck, which sit in front of the measurement plane
  and would otherwise clip the frame edge.
- `breadScreenRect(p, aspect)` — the same projection, exposed so the invariant is
  checkable without a browser.

Checked at ten viewports (320×680 through 2560×1080, portrait and landscape) and
101 progress values each: the bread never enters the caption box and never leaves
the frame. That is arithmetic, not a tuned margin — it holds for a headline that
has not been written yet.

### No seams before the cut

Ten closed slabs laid flush still rasterise a hairline between each pair, which
reads as "pre-sliced" on the opening frame. `seamGaps` therefore returns a
negative gap — `SEAM_OVERLAP`, 0.006 loaf units — for every seam the blade has
not reached, so neighbouring slabs interpenetrate by a hair and the crust is
continuous until the cut. It collapses to zero the moment that seam opens.

| `p` | Scene | What happens |
|---|---|---|
| 0.00 → 0.15 | **A · Whole loaf** | One complete, unsliced loaf at a three-quarter angle. Nothing is cut yet, and nothing *looks* cut: see "no seams before the cut" below. |
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
> - **Do not use `gsap.quickSetter` for transforms.** GSAP resolves the `scale`
>   alias to the literal string `"scaleX,scaleY"`, and `quickSetter` applies that
>   alias without the comma guard `getSetter` has. On browsers that do not take
>   GSAP's CSS path it falls through to `setAttribute("scaleX,scaleY", …)`, which
>   WebKit rejects with `InvalidCharacterError: Invalid qualified name`. That is
>   what crashed the site on iPhone; Chrome silently creates a junk attribute, so
>   it never showed on desktop. All poses now go through `lib/domPaint.ts`, which
>   writes `el.style` directly — no aliases, no per-node transform cache, nothing
>   that can throw.
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
- The only `h1` is the hero's; the chapter is an `h2` section with an `sr-only`
  paragraph describing all five scenes for anyone who cannot see the film.
  Captions are real text.
- Skip link, visible focus rings, `<nav aria-label>`; coming-soon chapters are
  `aria-disabled` spans, not dead links.
- The stage is not mounted until the chapter is approached, and its render loop
  pauses via `IntersectionObserver` when off-screen; DPR capped at 1.75 desktop,
  1 mobile.
- Geometry is generated once and disposed on unmount. Materials switch to
  transparent only for the hand-off fade, so slabs sort crisply while being
  studied. Crumb/blade textures are canvas-generated — no network requests.
- WebGL failure falls back to the supplied hero photograph — never a stock image.
- Framing is computed from the arrangement's real rotated extent *and* its
  projected magnification, so the fan fits the frame at every aspect ratio
  instead of being scaled by hand.

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
5. **The master logo is still the supplied raster.** `kv-delight-mark.webp` is
   derived from it (background removed, colours untouched) and the cream oval is
   CSS, not part of the file. A vector master would sharpen the 44 px crest, but
   the supplied art must not be redrawn. The hero photograph is also pre-sliced:
   the *3D* loaf is seam-free until the blade arrives, and the photograph was not
   retouched to match.
6. The five coffee-website style screenshots are still missing
   (`public/assets/style/`), and the `style/` directory does not exist yet.
7. Cream buns are an untouched placeholder, by instruction. Soft buns are built;
   its one honest compromise is that the "cut" is two closed solids modelled to
   meet, not a mesh severed at runtime — see `src/lib/bun.ts`.

### How chapter two was verified without a GPU

There is no headless browser here, so the bun film is checked as arithmetic and
geometry rather than by screenshots:

- `.tmp/check-bun.ts` (throwaway) asserted the half meshes are watertight and
  outward-wound, that the squash keeps the bun's volume within 3%, that the
  halves are closed at p = 0 and fully parted by p = 0.62, that exactly one
  caption is legible at any progress value, and that — at ten viewport sizes from
  320×680 to 2560×1080 — the projected bun never leaves the frame and never
  enters the caption strip. The projection is the *same* `viewFor` the stage
  calls, so the check cannot drift from the render.
- `.tmp/silhouette.ts` (throwaway) projected the real vertices through the real
  camera and printed the frame as ASCII, which is how the hinge pose was fixed:
  the cap's far edge was dipping behind the base and the two halves were merging
  into one blob.
- What this does **not** prove is how the crust and crumb read in colour, or how
  the film feels on a real iPhone. Open the site with `?diag=1` on the device to
  see the tier and any renderer error.

### The iPhone crash

Two separate faults, both confirmed on the device rather than guessed:

1. **`InvalidCharacterError: Invalid qualified name: 'scaleX,scaleY'`** — the
   real crash. `gsap.quickSetter(packEl, "scale")` resolved GSAP's `scale` alias
   to the string `"scaleX,scaleY"` and, on WebKit, applied it as an *attribute
   name*. A comma is illegal in a qualified name, so `setAttribute` threw, inside
   a passive effect, outside `StageBoundary` — straight to the route boundary and
   the page was replaced. Chrome takes a different GSAP branch, which is why only
   the phone failed. All motion now uses `lib/domPaint.ts` (plain `style`
   writes), reproduced and verified against a real DOM before fixing.
2. **`MediaQueryList.addEventListener`** — only exists from Safari 14; older iOS
   has just `addListener`. Fixed earlier with `addMediaListener()`, which prefers
   the modern form, falls back to `addListener`, then to a no-op. `ResizeObserver`
   (iOS 13.4+) and `IntersectionObserver` got the same treatment.

Neither was a WebGL problem; the 3D stage was never the culprit, and its fallback
had already been doing its job.

### Confirming on the phone

Open the site on the iPhone with **Settings → Safari → Advanced → Web Inspector**
on, connect it to a Mac, then use **Safari → Develop → [iPhone] → kvdelight.app**.
The console prints either `[KV Delight] WebGL notes: …` (running, possibly
without an environment map), `[KV Delight] bread stage failed to start: …`
(fell back to the still, with the cause), or `[KV Delight] WebGL context lost`.
