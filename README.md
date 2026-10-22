# KV Delight — scroll-controlled product film

**Three chapters in one scroll film**: the bread loaf cut and packed, the soft bun
pressed, split and packed, and the cream bun opened, piped, closed and packed.
One transparent chapter header, one logo on screen at a time, and no section that
scrolls without telling you something.

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
| `src/app/page.tsx` | Page composition: hero, the three chapters, footer. |
| `src/components/site/Hero.tsx` | The opening act: crest, wordmark, headline, one whole loaf — before any of the film runs. |
| `src/components/site/BrandMark.tsx` | The supplied mark on a cream oval, at one ratio, from one asset. |
| `src/components/story/BreadChapter.tsx` | Chapter one's DOM and scroll driver: five caption beats, the packaging hand-off, reduced-motion document. |
| `src/components/three/LoafStage.tsx` | three.js stage: lighting, environment, slice meshes, knife, camera, render loop. |
| `src/components/story/BunsChapter.tsx` | Chapter two's DOM and scroll driver: four caption beats plus the sealed pack, reduced-motion document. |
| `src/components/three/BunStage.tsx` | The bun's three.js stage: lights, crust/crumb materials, press and split transforms, camera, on-demand render loop. |
| `src/lib/bun.ts` | **Pre-separated bun halves**: two closed solids, each with a crust shell and a crumb cut face. No runtime cutting. |
| `src/lib/bunChoreography.ts` | Bun timings, press/split maths, camera framing and the screen-space guarantee that keeps the bun off the captions. |
| `src/components/story/CreamChapter.tsx` | Chapter three's DOM and scroll driver: four caption beats, the four-pack hand-off, reduced-motion document. |
| `src/components/three/CreamStage.tsx` | The cream bun's three.js stage: elongated shell halves, the hinged lid, the piped rope and its draw range, steel nozzle and stream, the clip plane and section face, camera, on-demand render loop. |
| `src/lib/creamBun.ts` | The cream bun's own geometry: superellipse plan swept by a dome profile, built halves with crumb faces, cream rope, seam layer, section face. |
| `src/lib/creamChoreography.ts` | Cream timings, the hinge/fill/close/cut schedule, the nozzle's run along the long axis, camera framing solved against the real projection. |
| `src/lib/sections.ts` | The chapter list — one source of truth for the ids in the page and the labels in the header. |
| `src/lib/slices.ts` | **Sliced loaf geometry**: ten closed slabs, each with a crust shell, crumb cut faces and a crust rim. |
| `src/lib/knife.ts` | Serrated bread knife, built from geometry (extruded profile + handle + rivets). |
| `src/lib/breadTextures.ts` | Canvas-generated crumb colour/bump maps and blade grain. No image files. |
| `src/lib/choreography.ts` | Scene timings, caption windows, knife + seam schedules. Shared by DOM and WebGL. |
| `src/lib/sliceLayout.ts` | Slice transforms, arc fan, yaw, camera framing, caption clearance. Pure maths. |
| `src/lib/loaf.ts` | The original whole-loaf geometry, its `fbm` noise (reused by the slices) and the crust material. |
| `src/components/site/Header.tsx` | The chapter bar: transparent overlay, three direct links, active-section mark. Hidden at the top of the page; revealed when the hero's own lockup leaves the screen. |
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

## The bread chapter (`h-[460svh]`, one pinned stage)

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

## The chapter bar

Three chapters, three links, no hamburger — on every screen size.

```
BREAD      SOFT BUNS      CREAM BUNS
```

At 375 px the three labels plus the crest measure ~315 px against 375 px of
viewport, so the direct links fit without a second row; below that (320 px) they
still fit, and the type steps down rather than wrapping. Nothing is hidden behind
a button, because a visitor on a phone should not need two taps to learn what the
page contains.

The bar itself is not a bar. There is no plate, no border and no background
colour: an ink gradient behind the type fades to nothing by 112 px, so the header
reads as part of the frame. It is `inert` and off-screen at the top of the page,
fades in when the hero's own lockup (`#hero-brand`) leaves the viewport, and fades
back out if you scroll home — which is what keeps exactly one logo on screen at a
time.

The active chapter is decided by an `IntersectionObserver` whose root is inset to
the middle third of the viewport: the answer is "the section crossing the reading
line", not "the first section that is technically on screen". Anchors are plain
`href="#id"` links over `scroll-behavior: smooth`, so the jump still fires the
scroll events ScrollTrigger's scrub depends on — the chapter's own film plays
through the jump instead of skipping it.

## Chapter two and chapter three

Both follow chapter one's contract, and both were built by it:

| | chapter two — soft buns | chapter three — cream buns |
|---|---|---|
| section | `#buns`, `h-[380svh] sm:h-[400svh]` | `#cream-buns`, `h-[400svh] sm:h-[430svh]` |
| product | one bun, pressed, split, closed | one *long* bun, hinged, piped, closed, cut |
| geometry | `lib/bun.ts` halves | `lib/creamBun.ts` — its own elongated shell |
| packaging | supplied eight-pack | supplied four-pack |
| fallback | the eight-pack still | the four-pack still |
| choreography | `lib/bunChoreography.ts` | `lib/creamChoreography.ts` |

### Why the cream bun is not chapter two's bun

It was, and that was wrong. Chapter two's shell is a round bun of radius 1 — a
hamburger shape — while the four-pack shows a roll roughly **2.3 : 1 long** with
cream along the seam. `lib/creamBun.ts` therefore builds its own shell: a
superellipse in plan (a rounded rectangle, exponent 2.9) swept along X and scaled
by a dome profile, so the flanks stay full up to about three quarters of the
height, the ends are rounded rather than pointed, and the base tucks in where it
meets the tray. Two things keep it honest:

- **The profile exponent matters.** A low exponent rounds the dome off almost
  immediately and the result reads as a lens or a macaron; `3.1 / 0.46` was the
  first attempt and looked exactly like that. `4.2 / 0.42` holds the shoulder and
  only then rounds over.
- **The seam sits below the widest point** (cut at 43 % of the height), which is
  where the cream line sits in the pack photograph, not at mid-height.

The bun is two pre-separated solids — bottom (0 → cut) and lid (cut + cream →
crown), each closed, each with a baked rim and a real crumb disc — plus a cream
layer between them. Nothing is boolean-cut at run time. The section in the last
beat is a **clip plane** through the closed bun plus a built section face at that
plane, so what you see cut is the same geometry you saw whole.

The cream is a tube along the long axis, revealed by `setDrawRange` station by
station as the nozzle advances, so the cream appears *behind* the tip at exactly
the rate the tip travels. It is squashed vertically (0.62) because a piped rope
is wider than it is tall, and ridged by a shallow scallop in its radius — no
fluid simulation, no physics.

### Chapter three's scenes

| `p` | scene | what happens |
|---|---|---|
| 0.00 → 0.10 | **A · The bun** | One long bun, three-quarter, closed, in the dark. |
| 0.10 → 0.26 | **B · The seam** | The lid hinges back along the long axis; the crumb opens up. |
| 0.27 → 0.52 | **C · The pipe** | The nozzle runs the length, laying a continuous rope behind it. |
| 0.53 → 0.64 | **D · Closed** | The lid comes down on the cream; the seam shows a white line. |
| 0.64 → 0.74 | **E · The turn** | One slow turn of the finished bun. |
| 0.74 → 0.84 | **F · The cut** | The near end is clipped away: crumb, cream band, section. |
| 0.86 → 1.00 | **G · The pack** | The supplied four-pack takes the frame; its caption arrives last. |

The camera solves its framing against the real projection rather than estimating
it: distance is fitted to both axes, the aim point is bisected until the
product's centre lands in the band above the caption strip, and if the content is
still outside the frame after a measurement the camera gives ground instead of
clipping the nozzle. Run `npx tsx` against `creamChoreography` to print the
projected rectangle at any progress and aspect; that is how caption clearance was
checked without a browser.

Three bugs in the first elongated build were found by rendering the geometry, not
by reading the code:

1. **The clip plane cut across the wrong axis.** `THREE.Plane` is in world space,
   and the bun is rotated by its yaw, so a plane at world X sliced the roll
   lengthwise instead of across. The plane now turns with the bun
   (`normal = (-cos yaw, 0, sin yaw)`), and the software renderer clips on model X
   for the same reason.
2. **The section face was offset twice** — built at the cut's X and then moved
   there again — so it floated outside the bun and showed as a hoop.
3. **The nozzle and rope were too small to read.** At this framing a real-scale
   tip disappears into the crumb; the collar is now 0.17 world units and the rope
   0.13 with a 0.62 squash, which is what makes the fill legible on a phone.

All three were invisible in the type checker, the build and the SSR markup, and
visible in a software rasteriser (z-buffer, the real geometry, the real poses and
camera, the stage's light directions) — the closest thing to a screenshot this
sandbox allows.

The crust map is generated once per page and shared by all three stages
(`getCrustTexture` in `lib/loaf.ts`, keyed by size) rather than three times.

### Blank space, root causes

The empty stretches in the earlier build had four distinct causes, and all four
were structural rather than cosmetic:

1. **Fixed section heights with dead progress bands.** `#bread` was `520svh` with
   a hold-and-regroup tail that had no caption and little motion, and `#buns` was
   `480svh` whose first fifth was a black veil over a bun lit at 0.22. Heights are
   now `460svh` / `380svh` / `400svh` — still 3.6, 3.0 and 3.2 screens of scroll,
   so no stage lost its distance to tell its story.
2. **A poster frame standing in for a product.** The buns chapter's opening veil
   is now 3.5% of the section instead of 4.5% of a dark screen, and the bun's key
   light starts at 0.62 instead of 0.22: the frame is never empty, only dim.
3. **A placeholder between products.** The "Next in the film — not yet built"
   block between the buns and the footer is gone; chapter three is the block.
4. **Hand-offs with no overlap.** Each chapter now dissolves in from the previous
   one's pack over its first 3.5%, and the hero's loaf fades out as the hero
   leaves rather than staying lit underneath the bread chapter's stage — so there
   are never two loaves in one viewport.

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
7. **Every "cut" is two closed solids modelled to meet, not a mesh severed at
   runtime** — the loaf's ten slabs (`lib/slices.ts`), the soft bun's halves and
   the cream bun's halves (`lib/creamBun.ts`) are all pre-separated geometry. The
   cream chapter's last beat is the one exception in kind: a clip plane through
   the closed bun plus a section face modelled at that plane. Nothing is
   boolean-sliced, and the page says "opened along its own seam" rather than
   implying otherwise.
8. **Chapter three is verified by build, projection maths, a software render and
   SSR markup — not on a screen.** There is no browser or GPU in the sandbox: the
   framing guarantee comes from running `creamChoreography`'s projection at
   375×812, 375×667, 414×896, 768×1024 and 1440×900, the DOM from the served
   HTML, and the geometry from a z-buffered software rasteriser that draws the
   real meshes through the real poses. What that cannot tell you is how the crust
   reads under ACES tone mapping, how the clip plane behaves on a real driver, or
   how any of it *feels* while scrolling — that needs a phone.
9. **Three WebGL stages** (loaf, bun, cream) each keep a context once they have
   been approached; each idles its render loop when off-screen, and the low tier
   drops their textures to 128² and removes antialiasing, but the contexts are not
   torn down and rebuilt. On a very old device that is the first thing to reclaim
   if memory becomes a problem.
10. The cream bun's nozzle is deliberately semi-metallic (0.55) and lit by a
    dedicated light: a fully metallic material without an environment map renders
    black. It reads as steel; it is not a physically exact steel.
11. The cream bun's crust is **vertex colour, not a photographed texture** — a
    baked-crust map was tried and rejected, because the shell's UVs run the long
    way round and the map smeared into stripes. The mottling is procedural
    (three incommensurate sine bands, plus a sub-millimetre displacement of the
    wall); it reads as baked at phone size and will look flat in a 4K close-up.

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
