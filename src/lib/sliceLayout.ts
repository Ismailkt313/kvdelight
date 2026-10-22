import { clamp01, knifePose, seamGaps, smoothstep, SLICE_COUNT, TIMELINE } from "@/lib/choreography";
import { LOAF } from "@/lib/slices";

/**
 * Where each slab sits for a given chapter progress.
 *
 * Pure maths, deliberately kept out of the component: the stage writes these
 * transforms onto its meshes, and the offline render check reads the same
 * function, so what is verified is exactly what ships.
 */

export type SliceTransform = {
  /** Offset along the loaf's length from where the slab was built. */
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
};

export type SliceLayout = {
  transforms: SliceTransform[];
  /** Full width of the arrangement in loaf units — the camera fits to this. */
  width: number;
  /** Full depth, so a foreshortened fan can still be framed. */
  depth: number;
  /** 0 → 1 per slice: how far that slice has been let go. */
  released: number[];
  /** Total gap opened across all seams. */
  totalGap: number;
};

export const SPREAD_GAP = 0.33;

/**
 * Radius of the arc the slices are fanned along. A straight line of ten slabs
 * is a very wide, very flat thing to photograph — a letterbox across the frame.
 * Curving the arrangement turns it into a fanned deck: compact in width, with
 * real depth and each slice showing a little of its own face.
 */
const ARC_RADIUS = 8;

const COUNT = SLICE_COUNT;
const A = LOAF.length / 2;
const HALF_SLICE = A / COUNT;
const BUILT_CENTRE = (i: number) => (-1 + ((i + 0.5) * 2) / COUNT) * A;

function totalGapOf(gaps: number[]) {
  return gaps.reduce((a, v) => a + v, 0);
}

export function layoutSlices(p: number, spreadScale = 1): SliceLayout {
  const gaps = seamGaps(p, spreadScale);

  // Lay the slabs out from the left, holding a real gap at each seam.
  const centres: number[] = [BUILT_CENTRE(0)];
  for (let i = 1; i < COUNT; i++) {
    centres.push(centres[i - 1] + HALF_SLICE + gaps[i - 1] + HALF_SLICE);
  }

  // Keep the arrangement centred on the origin.
  const mid = (centres[0] + centres[COUNT - 1]) / 2;
  const centreIndex = (COUNT - 1) / 2;

  // Bend the line into an arc. `release` keeps the arc from bending while the
  // loaf is still whole and the knife is in it — a cut loaf is straight until
  // it opens.
  const totalGap = totalGapOf(gaps);
  const bend = clamp01((totalGap - 0.32) / 2.2);
  // Angles along the arc come from the straight layout; `bend` only decides how
  // much of the curvature is *applied*. Scaling the angles themselves would
  // collapse every slab onto x = 0 while the loaf is still straight.
  const arcAngles = centres.map((c) => (c - mid) / ARC_RADIUS);
  const arcZRaw = arcAngles.map((a) => ARC_RADIUS * (Math.cos(a) - 1));
  const zMean = arcZRaw.reduce((a, v) => a + v, 0) / COUNT;

  // Blend from the straight layout to the arc. Interpolating the *positions*
  // rather than the angles keeps the straight case exactly identity — scaling
  // the angles instead leaves a sub-millimetre gap at each end when straight.
  const placeX = centres.map(
    (c, i) => c - mid + (ARC_RADIUS * Math.sin(arcAngles[i]) - (c - mid)) * bend,
  );
  const placeZ = arcZRaw.map((z) => (z - zMean) * bend);

  const transforms: SliceTransform[] = [];
  const released: number[] = [];

  for (let i = 0; i < COUNT; i++) {
    const own = Math.max(
      i > 0 ? gaps[i - 1] : 0,
      i < COUNT - 1 ? gaps[i] : 0,
    );
    const r = clamp01(own / SPREAD_GAP);
    released.push(r);

    // Outer slices lift and swing out further: a fan, not an even stack.
    const outward = Math.pow(Math.abs(i - centreIndex) / centreIndex, 1.5);

    // Everything is mirrored about the centre slice, so the arrangement stays
    // symmetric: an uneven fan reads as a pile of slices, not an arrangement.
    const off = i - centreIndex;

    const angle = arcAngles[i];

    transforms.push({
      x: placeX[i] - BUILT_CENTRE(i),
      y: 0.115 * Math.pow(r, 1.25) * outward,
      z: placeZ[i],
      rx: 0.06 * Math.cos(off * 0.9) * r,
      ry: angle * bend,
      rz: 0.09 * Math.sin(off * 1.25) * r,
    });
  }

  // Horizontal extent of the arrangement *as rotated*: each slab contributes
  // its own width, foreshortened by its arc angle. This is what the camera fits
  // to, so the fan can never run off the side of the frame.
  let halfExtent = 0;
  let halfDepth = 0;
  for (let i = 0; i < COUNT; i++) {
    const t = transforms[i];
    // absolute centre on the arc — *not* the mesh offset, which is relative to
    // where the slab was built
    const centreX = placeX[i];
    const spanX =
      HALF_SLICE * Math.abs(Math.cos(t.ry)) +
      (LOAF.width / 2) * Math.abs(Math.sin(t.ry));
    const spanZ =
      HALF_SLICE * Math.abs(Math.sin(t.ry)) +
      (LOAF.width / 2) * Math.abs(Math.cos(t.ry));
    halfExtent = Math.max(halfExtent, Math.abs(centreX) + spanX);
    halfDepth = Math.max(halfDepth, Math.abs(placeZ[i]) + spanZ);
  }

  return {
    transforms,
    width: halfExtent * 2 + 0.2,
    depth: halfDepth * 2 + 0.2,
    released,
    totalGap,
  };
}

/** Where the cut line for seam `i` sits along the loaf's length. */
export const seamX = (i: number) => (-1 + ((i + 1) * 2) / COUNT) * A;

/* ---------------------------------------------------------------- camera -- */

/** Where the loaf sits vertically inside the scene. Base of the loaf = floor. */
export const BASE_Y = -0.62;

export const LOAF_TOP = LOAF.height * 1.07;

const KNIFE_TOP = BASE_Y + LOAF_TOP + 0.3;
const KNIFE_BOARD = BASE_Y + 0.03;

/**
 * The loaf's turn.
 *
 * Slow while the blade is in it — the blade shares the turn, so the seam plane
 * never drifts — then a settling drift as the slices let go.
 *
 * The spread does **not** do a full 360°. A long loaf pointed straight at the
 * camera is its worst angle: the whole arrangement collapses into a tunnel. The
 * showcase instead sweeps 40° to a gentle three-quarter while the camera rises,
 * which is the angle that actually reads a fanned deck of slices.
 */
export function yawAt(p: number): number {
  const intro = -0.42 + 0.12 * smoothstep(0, 0.15, p);
  const cut = intro - 0.14 * smoothstep(0.15, 0.42, p);
  const settle = cut - 0.09 * smoothstep(0.42, 0.58, p);
  const show = smoothstep(0.56, 0.74, p) * 0.7;
  // and a final drift while the bread hands over to the pack
  const leave = smoothstep(0.84, 0.94, p) * 0.16;
  return settle + show + leave;
}

/* ---------------------------------------------------------------- camera -- */

export type View = {
  camZ: number;
  camY: number;
  lookY: number;
  yShift: number;
  spreadScale: number;
};

/** Base framing per aspect ratio, before the per-progress moves. */
export function baseView(aspect: number): View {
  if (aspect < 0.8) {
    // Phone: the caption owns the bottom of the frame, so the camera aims lower
    // than the loaf and the bread sits in the band above the copy.
    return { camZ: 10.6, camY: 0.95, lookY: -0.56, yShift: -0.5, spreadScale: 0.4 };
  }
  if (aspect < 1.15) {
    return { camZ: 8.2, camY: 1.0, lookY: -0.05, yShift: -0.22, spreadScale: 0.68 };
  }
  return { camZ: 6.9, camY: 1.0, lookY: 0.06, yShift: 0, spreadScale: 1 };
}

/**
 * Camera for a given progress and aspect. The spread lifts the camera and tips
 * it down onto the fan; everything else is a slow dolly.
 */
export function cameraFor(p: number, aspect: number) {
  const base = baseView(aspect);
  const open = smoothstep(0.52, 0.76, p);

  const camZ =
    base.camZ -
    Math.sin(clamp01(p / 0.85) * Math.PI) * 0.7 +
    smoothstep(0.8, 1, p) * 1.15;

  return {
    camZ,
    camY: base.camY - Math.sin(p * Math.PI) * 0.1 + base.yShift + open * 1.55,
    // aim low enough that the fan sits centred, rather than the camera
    // looming over it and leaving the bread in the bottom third
    lookY: base.lookY + base.yShift * 0.55 - open * 0.34,
    yShift: base.yShift,
    spreadScale: base.spreadScale,
  };
}

export type KnifeTransform = {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  rx: number;
};

/** Knife transform in loaf space, derived from the shared knife choreography. */
export function knifeTransform(p: number): KnifeTransform {
  const k = knifePose(p);
  if (!k.visible) return { visible: false, x: 0, y: 0, z: 0, rx: 0 };

  return {
    visible: true,
    x: seamX(k.station + k.travel),
    y:
      KNIFE_TOP +
      (KNIFE_BOARD - KNIFE_TOP) * k.plunge +
      k.saw * 0.016,
    z: -2.15 + 3.15 * smoothstep(0.22, 0.9, k.plunge),
    rx: -0.16 * k.plunge,
  };
}

/* ---------------------------------------------------------------- framing -- */

/** Vertical field of view, in degrees. Shared with the stage's camera. */
export const FOV = 34;

/**
 * Desktop framing is a *contract*, not a nudge.
 *
 * The captions own the left of the frame; the loaf owns a box on the right that
 * starts at `centre - width / 2` and ends at `centre + width / 2`. Because the
 * box is expressed as fractions of the visible frame, the camera fit and the DOM
 * caption column cannot drift apart — which is what used to let the loaf sit on
 * top of the headline on a 1440 px screen but clear it on a 1920 px one.
 *
 * Values are fractions of the frame width. `beside` 0.46 at `centre` 0.735 puts
 * the left edge of the bread at 50.5% — the caption column ends at ~42%.
 */
export const CAPTION_FRAME = {
  beside: { wide: 0.46, medium: 0.36 },
  centre: { wide: 0.735, medium: 0.68 },
  /**
   * Once the caption drops to the bottom, the bread takes the frame. Not 1.0:
   * the width used by the camera fit is measured in loaf units at z = 0, and the
   * near end of a fanned deck sits in front of that plane, so it projects about
   * 4% wider than the number suggests.
   */
  full: 0.8,
  /** Portrait: caption below the stage, bread across the frame. */
  portrait: 0.9,
} as const;

/** 1 while the caption sits beside the loaf; 0 once it drops to the bottom. */
export function captionBeside(p: number): number {
  // The captions move to the bottom *before* the bread is allowed out of its
  // box; the two must never cross while both are visible.
  return 1 - smoothstep(0.6, 0.68, p);
}

/**
 * Horizontal nudge of the bread composition, as a fraction of the visible
 * half-width. Portrait centres the loaf; landscape pushes it into its box.
 */
export function captionShift(p: number, aspect: number): number {
  if (aspect < 0.8) return 0;
  const frac = aspect < 1.15 ? CAPTION_FRAME.centre.medium : CAPTION_FRAME.centre.wide;
  return Math.max(0, 2 * frac - 1) * captionBeside(p);
}

/**
 * How much of the frame width the bread may use. The stage multiplies this by
 * the visible half-width, so `0.46` means the loaf spans 46% of the frame.
 */
export function frameWidthFraction(p: number, aspect: number): number {
  if (aspect < 0.8) return CAPTION_FRAME.portrait;
  const beside = captionBeside(p);
  const small = aspect < 1.15 ? CAPTION_FRAME.beside.medium : CAPTION_FRAME.beside.wide;
  return CAPTION_FRAME.full + (small - CAPTION_FRAME.full) * beside;
}


/**
 * Scale that fits the arrangement into the frame *as projected*.
 *
 * The width budget is measured in world units on the plane through the origin,
 * but a fanned deck has depth: its near slices sit in front of that plane and
 * therefore project wider than the flat measurement suggests. Compensating for
 * the magnification at the near edge is what stops the outermost slice of the
 * fan from being clipped on wide screens — and it only bites once the fan has
 * depth, so the whole loaf is not made smaller for it.
 */
export function fitScale(p: number, aspect: number, layout: SliceLayout): number {
  const tanHalf = Math.tan((FOV * Math.PI) / 180 / 2);
  const cam = cameraFor(p, aspect);
  const halfH = tanHalf * cam.camZ;
  const halfW = halfH * aspect;

  const widthBudget = halfW * frameWidthFraction(p, aspect);
  const heightBudget = halfH * 0.86;
  const neededW = Math.max(0.001, layout.width / 2);
  const neededH = Math.max(0.001, LOAF.height * 0.62 + 0.55);

  let fit = Math.min(1.02, widthBudget / neededW, heightBudget / neededH);
  for (let k = 0; k < 2; k++) {
    // Near edge of the arrangement, in front of the camera.
    const zNear = (layout.depth / 2) * fit;
    const mag = cam.camZ / Math.max(1, cam.camZ - zNear);
    // Divided out of both budgets: height is magnified by the same lens.
    fit = Math.min(1.02, widthBudget / (neededW * mag), heightBudget / (neededH * mag));
  }
  return Number.isFinite(fit) && fit > 0 ? fit : 1;
}

/* ----------------------------------------------------------- screen rect -- */

export type ScreenRect = {
  /** Fractions of the viewport, 0 = left / top. */
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/**
 * Where the bread actually lands on screen at progress `p` and viewport aspect.
 *
 * This mirrors — line for line — the projection `LoafStage` performs: same
 * camera, same fit, same shift. It exists so that "the loaf never covers the
 * headline" is a checkable property of the shipped maths rather than something
 * eyeballed once on one monitor: projecting the bread box and comparing it with
 * `CAPTION_BOX` needs no browser at all.
 */
export function breadScreenRect(p: number, aspect: number): ScreenRect {
  const cam = cameraFor(p, aspect);
  const layout = layoutSlices(p, baseView(aspect).spreadScale);

  const tanHalf = Math.tan((FOV * Math.PI) / 180 / 2);
  const halfH = tanHalf * cam.camZ;
  const halfW = halfH * aspect;
  const fit = fitScale(p, aspect, layout);
  const centreX = captionShift(p, aspect) * halfW;

  // Camera basis, exactly as `camera.lookAt` builds it.
  const pos = { x: 0, y: cam.camY, z: cam.camZ };
  const fLen = Math.hypot(cam.lookY - pos.y, -pos.z) || 1;
  const f = { x: 0, y: (cam.lookY - pos.y) / fLen, z: -pos.z / fLen };
  const right = { x: -f.z, y: 0, z: f.x };
  const up = {
    x: right.y * f.z - right.z * f.y,
    y: right.z * f.x - right.x * f.z,
    z: right.x * f.y - right.y * f.x,
  };

  const halfX = (layout.width / 2) * fit;
  const halfZ = (layout.depth / 2) * fit;
  const topY = (BASE_Y + LOAF.height * 1.07) * fit;
  const bottomY = BASE_Y * fit;

  let left = Infinity;
  let right2 = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  for (const x of [centreX - halfX, centreX + halfX]) {
    for (const y of [bottomY, topY]) {
      for (const z of [-halfZ, halfZ]) {
        const d = { x: x - pos.x, y: y - pos.y, z: z - pos.z };
        const depth = d.x * f.x + d.y * f.y + d.z * f.z;
        if (depth <= 0.05) continue;
        const xv = d.x * right.x + d.y * right.y + d.z * right.z;
        const yv = d.x * up.x + d.y * up.y + d.z * up.z;
        const ndcX = xv / (depth * tanHalf * aspect);
        const ndcY = yv / (depth * tanHalf);
        left = Math.min(left, (ndcX + 1) / 2);
        right2 = Math.max(right2, (ndcX + 1) / 2);
        top = Math.min(top, (1 - ndcY) / 2);
        bottom = Math.max(bottom, (1 - ndcY) / 2);
      }
    }
  }

  return { left, right: right2, top, bottom };
}

/**
 * The DOM caption column, as fractions of the viewport. Must stay in sync with
 * the classes in `BreadChapter` — the framing check asserts the two never meet.
 */
export type Box = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/**
 * The strip the captions live in — the same on every viewport, because the DOM
 * anchors them to the bottom in `BreadChapter`.
 *
 * One rule for the whole film instead of a box that moves with the choreography:
 * the caption never changes place, so there is no moment where text and bread
 * can cross, and the composition stays identical from phone to ultrawide.
 */
export const CAPTION_BOX: Box = { left: 0, right: 1, top: 0.72, bottom: 1 };

/** The caption strip that applies at `p`, or null once the pack copy takes over. */
export function captionBox(p: number): Box | null {
  return p >= TIMELINE.holdEnd ? null : CAPTION_BOX;
}
