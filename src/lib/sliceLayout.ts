import { clamp01, knifePose, seamGaps, smoothstep, SLICE_COUNT } from "@/lib/choreography";
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
    return { camZ: 10.6, camY: 0.95, lookY: -0.3, yShift: -0.5, spreadScale: 0.4 };
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

/* ------------------------------------------------------------- framing --- */

/**
 * Desktop puts the captions in the left third, so the bread composition is
 * nudged right to sit clear of them. Expressed as a fraction of the visible
 * half-width and consumed by the camera fit, so the two never disagree.
 */
export function captionShift(p: number, aspect: number): number {
  if (aspect < 0.8) return 0; // portrait: captions sit below the stage
  const base = aspect < 1.15 ? 0.08 : 0.22;
  // Only while the loaf is whole and being cut, where the caption sits beside
  // it. The spread drops its caption to the bottom of the frame and takes the
  // full width back.
  return base * smoothstep(0.04, 0.3, p) * (1 - smoothstep(0.5, 0.6, p));
}

/**
 * How much of the frame width the bread may use. The caption shift is spent out
 * of this budget — fitting to 86% of the width and *then* sliding right is what
 * used to push the last slices off the edge of the screen.
 */
export function frameWidthFraction(p: number, aspect: number): number {
  return Math.max(0.42, 0.9 - captionShift(p, aspect));
}
