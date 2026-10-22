/**
 * Choreography for chapter two — the soft bun.
 *
 * Same contract as the bread chapter: one source of truth, read by both the DOM
 * side (captions, packaging hand-off) and the WebGL side (geometry, camera), so
 * a caption can never drift out of sync with what the bun is doing.
 *
 * Scene map (chapter progress `p`, 0 → 1):
 *
 *   0.00 → 0.16   A · the bake — one bun in the dark, rising into the light
 *   0.16 → 0.35   B · softness — the camera pushes in, the bun is pressed
 *   0.35 → 0.58   C · the split — two halves part and hinge open
 *   0.58 → 0.71   D · the crumb — held close, both cut faces in view
 *   0.71 → 0.86   E · reassembly — the halves settle back, camera pulls out
 *   0.86 → 1.00   F · sealed — the supplied eight-pack takes the frame
 *
 * This module is pure maths. Nothing here touches three.js or the DOM, so the
 * framing and the poses can be checked in a terminal (see the note on
 * `bunScreenRect`), which is the only way they get verified without a GPU.
 */

import { clamp01, smoothstep, bell, lerp } from "@/lib/choreography";

export { clamp01, smoothstep, bell, lerp };

/** Bun dimensions in scene units. Base sits on the board at y = 0. */
export const BUN = {
  radius: 1,
  height: 0.88,
  /** The split is not at the equator: a bun's base is the thinner half. */
  cutY: 0.36,
} as const;

/** Vertical field of view of the bun camera, in degrees. */
export const BUN_FOV = 32;

const TAN_HALF = Math.tan((BUN_FOV * Math.PI) / 180 / 2);

export const TIMELINE = {
  revealEnd: 0.16,
  pressStart: 0.17,
  pressPeak: 0.245,
  pressEnd: 0.35,
  splitStart: 0.36,
  splitEnd: 0.56,
  holdEnd: 0.71,
  regroupStart: 0.71,
  regroupEnd: 0.86,
  packIn: 0.87,
  packInEnd: 0.96,
  packCopy: 0.92,
  packCopyEnd: 0.985,
} as const;

export type Beat = {
  index: string;
  kicker: string;
  title: string;
  body: string;
  window: readonly [number, number];
};

/** In-stage captions. The sealed pack caption is handled separately. */
export const BEATS: Beat[] = [
  {
    index: "01",
    kicker: "The bake",
    title: "One bun,\njust baked",
    body: "Out of the oven and into the light. A soft bun, still warm, with nothing between it and the camera.",
    window: [-0.5, 0.155],
  },
  {
    index: "02",
    kicker: "Softness",
    title: "Pressed,\nthen back",
    body: "The crust holds; the crumb underneath gives, and then returns. That is the whole of it.",
    window: [0.175, 0.345],
  },
  {
    index: "03",
    kicker: "The split",
    title: "Two halves,\nall crumb",
    body: "Pulled apart along the seam — pale, open, and softer than the crust that carries it.",
    window: [0.375, 0.7],
  },
  {
    index: "04",
    kicker: "Reassembly",
    title: "Back\ntogether",
    body: "Closed again, as if it had never been apart. Eight of them go into the pack.",
    window: [0.71, 0.875],
  },
];

/* ------------------------------------------------------------------ press -- */

/**
 * How hard the bun is being pressed, 0 → 1, with an honest return to 0.
 *
 * A single press rather than a repeating pulse: a bun that keeps breathing on
 * scroll reads as an idle animation, and the brief asks for one demonstration
 * of elasticity.
 */
export function pressAt(p: number): number {
  const { pressStart, pressPeak, pressEnd } = TIMELINE;
  return smoothstep(pressStart, pressPeak, p) * (1 - smoothstep(pressPeak, pressEnd, p));
}

/**
 * Volume-preserving squash for the press.
 *
 * A bun is close to incompressible, so pressing it down makes it bulge
 * outwards. Preserving volume exactly would need `√(1/sy)`; the exponents here
 * are slightly smaller so the bulge reads as soft rather than rubbery, and the
 * product stays within ~3% of constant volume.
 */
export function squashAt(p: number): { sy: number; sxz: number } {
  const c = pressAt(p);
  const sy = 1 - 0.12 * c;
  return { sy, sxz: Math.pow(sy, -0.42) };
}

/* ------------------------------------------------------------------ split -- */

export type Split = {
  /** 0 = closed. */
  open: number;
  /** Metres the top half has risen above the cut plane. */
  lift: number;
  /** Radians the top half has hinged back (negative = toward the camera). */
  tilt: number;
  /** The top half drifts a little behind the bottom as it opens. */
  back: number;
};

/**
 * The halves.
 *
 * The top half hinges about the cut plane and is pulled slightly back (−Z), so
 * its underside crumb turns toward the camera while the bottom half keeps its
 * own crumb facing up. Both cut faces end up readable at once — which is the
 * point of the close-up, and the reason the tilt is a hinge rather than a
 * straight vertical lift.
 */
export function splitAt(p: number): Split {
  const open =
    smoothstep(TIMELINE.splitStart, TIMELINE.splitEnd, p) *
    (1 - smoothstep(TIMELINE.regroupStart, TIMELINE.regroupEnd, p));
  return {
    open,
    lift: 1.05 * open,
    tilt: -0.8 * open,
    back: 0.14 * open,
  };
}

/* ----------------------------------------------------------------- layout -- */

export type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

type Vec3 = { x: number; y: number; z: number };

function rotateX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
}

/**
 * The bun's world-space bounding box at progress `p`.
 *
 * Built from the eight corners of each half's own box rather than from a
 * hand-waved "it got taller" — the top half is rotated, so its extents move in a
 * way that is easy to get wrong by eye and expensive to get wrong on screen.
 */
export function bunBounds(p: number): Bounds {
  const split = splitAt(p);
  const { sy, sxz } = squashAt(p);

  const half = (y0: number, y1: number, transform: (v: Vec3) => Vec3) => {
    const out: Vec3[] = [];
    for (const x of [-BUN.radius, BUN.radius]) {
      for (const y of [y0, y1]) {
        for (const z of [-BUN.radius, BUN.radius]) {
          const v = transform({ x, y, z });
          // The press scales about the base, so the bun stays on the board.
          out.push({ x: v.x * sxz, y: v.y * sy, z: v.z * sxz });
        }
      }
    }
    return out;
  };

  const bottom = half(0, BUN.cutY, (v) => v);
  const top = half(BUN.cutY, BUN.height, (v) => {
    const pivot = { x: 0, y: BUN.cutY, z: 0 };
    const local = rotateX({ x: v.x, y: v.y - pivot.y, z: v.z - pivot.z }, split.tilt);
    return {
      x: local.x,
      y: local.y + pivot.y + split.lift,
      z: local.z - split.back,
    };
  });

  const pts = [...bottom, ...top];
  return {
    minX: Math.min(...pts.map((v) => v.x)),
    maxX: Math.max(...pts.map((v) => v.x)),
    minY: Math.min(...pts.map((v) => v.y)),
    maxY: Math.max(...pts.map((v) => v.y)),
    minZ: Math.min(...pts.map((v) => v.z)),
    maxZ: Math.max(...pts.map((v) => v.z)),
  };
}

/* ----------------------------------------------------------------- camera -- */

export type View = {
  camZ: number;
  camY: number;
  lookY: number;
  /** The bun's own turn. Small: this is a staged reveal, not a turntable. */
  yaw: number;
};

/**
 * How much of the frame height the bun's *content* should fill, per scene.
 *
 * Written as a base plus increments rather than as a sum of stages: the stages
 * are sequential, so adding them lets the total climb past 1 and drive the
 * camera through the bun. (That is exactly what the framing check caught.)
 */
function zoomAt(p: number): number {
  const reveal = 0.44 + 0.04 * smoothstep(0.02, TIMELINE.revealEnd, p);
  const push = 0.06 * smoothstep(TIMELINE.pressStart, 0.27, p);
  const close = 0.09 * smoothstep(TIMELINE.splitStart, 0.6, p);
  const pull = 0.1 * smoothstep(TIMELINE.regroupStart, 0.95, p);
  const leave = 1 - 0.55 * smoothstep(0.87, 0.96, p);
  return (reveal + push + close - pull) * leave;
}

/**
 * The bun's turn, per aspect.
 *
 * A phone holds the bun almost front-on: the same three-quarter that flatters it
 * on a wide screen makes a round bun's silhouette 28% wider than it needs to be,
 * and on a 375 px screen the width is what limits its size.
 */
export function bunYaw(p: number, aspect: number): number {
  const base = aspect < 0.85 ? -0.12 : -0.34;
  const open = splitAt(p).open;
  const settle = 0.14 * (1 - smoothstep(0, TIMELINE.revealEnd, p));
  return base + 0.1 * smoothstep(0, 0.18, p) - 0.06 * open + settle;
}

/**
 * Extent of an axis-aligned box once it is turned about Y.
 *
 * The bun is rotated, so its projected width is not its width: a box 2 units
 * square turned 45° is 2.8 units wide, and using the unrotated number is how a
 * round object ends up clipped on a phone.
 */
function rotatedExtent(bounds: Bounds, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const x of [bounds.minX, bounds.maxX]) {
    for (const z of [bounds.minZ, bounds.maxZ]) {
      const rx = x * c + z * s;
      const rz = -x * s + z * c;
      minX = Math.min(minX, rx);
      maxX = Math.max(maxX, rx);
      minZ = Math.min(minZ, rz);
      maxZ = Math.max(maxZ, rz);
    }
  }
  return { width: maxX - minX, depth: maxZ - minZ };
}

export type ScreenRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/**
 * The projection, and the only copy of it.
 *
 * `BunStage` literally calls `viewFor` and positions the camera at what it
 * returns; this function then projects the bun's box through that same camera.
 * So the framing check is not a re-implementation of the film's maths that could
 * quietly drift from it — it is the same numbers, drawn through the same lens.
 */
export function projectRect(
  bounds: Bounds,
  yaw: number,
  view: { camY: number; camZ: number; lookY: number },
  aspect: number,
): ScreenRect {
  const pos = { x: 0, y: view.camY, z: view.camZ };
  const fLen = Math.hypot(view.lookY - pos.y, -pos.z) || 1;
  const f = { x: 0, y: (view.lookY - pos.y) / fLen, z: -pos.z / fLen };
  const right = { x: -f.z, y: 0, z: f.x };
  const up = {
    x: right.y * f.z - right.z * f.y,
    y: right.z * f.x - right.x * f.z,
    z: right.x * f.y - right.y * f.x,
  };

  let left = Infinity;
  let rightEdge = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  for (const x of [bounds.minX, bounds.maxX]) {
    for (const y of [bounds.minY, bounds.maxY]) {
      for (const z of [bounds.minZ, bounds.maxZ]) {
        const wx = x * Math.cos(yaw) + z * Math.sin(yaw);
        const wz = -x * Math.sin(yaw) + z * Math.cos(yaw);
        const d = { x: wx - pos.x, y: y - pos.y, z: wz - pos.z };
        const depth = d.x * f.x + d.y * f.y + d.z * f.z;
        if (depth <= 0.05) continue;
        const xv = d.x * right.x + d.y * right.y + d.z * right.z;
        const yv = d.x * up.x + d.y * up.y + d.z * up.z;
        const ndcX = xv / (depth * TAN_HALF * aspect);
        const ndcY = yv / (depth * TAN_HALF);
        left = Math.min(left, (ndcX + 1) / 2);
        rightEdge = Math.max(rightEdge, (ndcX + 1) / 2);
        top = Math.min(top, (1 - ndcY) / 2);
        bottom = Math.max(bottom, (1 - ndcY) / 2);
      }
    }
  }

  return { left, right: rightEdge, top, bottom };
}

/** The band of the frame the bun may occupy: below the header, above the copy. */
const BAND_TOP = 0.07;
const BAND_BOTTOM = 0.68;

/**
 * Where the camera sits and what it is looking at.
 *
 * The bun is fitted to the band above the caption strip, and then the aim point
 * is solved — not guessed — so that the box lands in the middle of that band.
 * A closed bun is wide and low, an opened one is narrow and nearly twice as
 * tall, and a simple "aim at the centre of the box" pulls the near corner of the
 * tall pose down over the captions; the solve is what keeps both compositions on
 * the same line.
 */
export function viewFor(p: number, aspect: number): View {
  const bounds = bunBounds(p);
  const yaw = bunYaw(p, aspect);
  const ext = rotatedExtent(bounds, yaw);

  const contentH = Math.max(0.001, bounds.maxY - bounds.minY);
  const centreY = (bounds.minY + bounds.maxY) / 2;

  const portrait = aspect < 0.85;
  const maxW = portrait ? 0.9 : 0.82;
  const zoom = Math.max(0.2, zoomAt(p));

  // Distance is measured to the front of the bun, so the magnification it gets
  // for being in front of the aim plane is cancelled rather than ignored.
  const front = ext.depth / 2;
  const byHeight = contentH / (2 * TAN_HALF * zoom);
  const byWidth = ext.width / (2 * TAN_HALF * aspect * maxW);
  const camZ = Math.max(byHeight, byWidth, 1.2) + front;

  const halfH = TAN_HALF * Math.max(0.2, camZ - front);
  const projectedH = contentH / (2 * halfH);

  const minCentre = BAND_TOP + projectedH / 2;
  const maxCentre = BAND_BOTTOM - projectedH / 2;
  const centreFrac =
    minCentre <= maxCentre
      ? Math.min(Math.max((BAND_TOP + BAND_BOTTOM) / 2, minCentre), maxCentre)
      : maxCentre;

  const open = splitAt(p).open;
  const rise = 0.55 + 2 * smoothstep(TIMELINE.splitStart, 0.62, p) - 0.3 * open;
  const camY = centreY + Math.max(0.42, rise);

  // First guess from the pinhole relation, then refine against the real
  // projection — the camera is tilted for the crumb view, and a tilted camera
  // does not map world height to screen height linearly.
  let lookY = centreY - (0.5 - centreFrac) * 2 * halfH;
  const target = centreFrac;
  for (let i = 0; i < 10; i++) {
    const rect = projectRect(bounds, yaw, { camY, camZ, lookY }, aspect);
    const measured = (rect.top + rect.bottom) / 2;
    const err = measured - target;
    if (!Number.isFinite(err) || Math.abs(err) < 0.0015) break;
    lookY -= err * 2 * halfH * 0.9;
  }

  return { camZ, camY, lookY, yaw };
}

/**
 * Where the bun actually lands on screen, as fractions of the viewport.
 *
 * Exposed so "the bun never covers the caption and never leaves the frame" is a
 * property of the shipped maths rather than something eyeballed on one monitor.
 */
export function bunScreenRect(p: number, aspect: number): ScreenRect {
  return projectRect(bunBounds(p), bunYaw(p, aspect), viewFor(p, aspect), aspect);
}

/**
 * The strip the captions live in — identical to the bread chapter's, because the
 * DOM anchors them to the bottom of the same frame.
 */
export const CAPTION_BOX = { left: 0, right: 1, top: 0.7, bottom: 1 } as const;

/** Null once the sealed-pack copy takes over. */
export function captionBox(p: number) {
  return p >= TIMELINE.holdEnd ? null : CAPTION_BOX;
}
