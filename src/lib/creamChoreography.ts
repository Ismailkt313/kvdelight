/**
 * Choreography for chapter three — the cream bun.
 *
 * Same contract as the bread and bun chapters: this file is pure maths, read by
 * both the DOM side (captions, packaging hand-off) and the WebGL side (poses,
 * camera), so a caption can never describe something the model is not doing.
 *
 * The story, in the order the brief asks for it:
 *
 *   0.00 → 0.14   A · the bake     one cream bun, closed, lit, barely turning
 *   0.14 → 0.31   B · the opening  the top half lifts and hinges back
 *   0.30 → 0.58   C · the pipe     a nozzle descends and pipes cream into it
 *   0.58 → 0.76   D · closed       the halves come together, cream at the seam
 *   0.76 → 0.86   E · the turn     one slow turn to the finished bun
 *   0.86 → 1.00   F · the pack     the supplied four-pack takes the frame
 *
 * There is nothing invented here. The bun shell is the same geometry the soft
 * buns chapter uses (`lib/bun`), the cream is cream, and the pack is the brand's
 * own photograph of the product.
 */

import { clamp01, smoothstep, bell, lerp } from "@/lib/choreography";

export { clamp01, smoothstep, bell, lerp };

/** The shell reuses the soft bun's dimensions exactly. */
export const CREAM = {
  radius: 1,
  height: 0.88,
  cutY: 0.36,
  /**
   * Piped cream sits **on** the cut face, not inside the bun.
   *
   * The bottom half is a closed solid: its cut face is an opaque crumb disc at
   * `cutY`. Cream modelled below that plane is cream in a box, and it never
   * appears on screen. So the fill starts just above the disc and mounds up from
   * there, which is also what a cream bun actually looks like.
   */
  fillBase: 0.36,
  fillTop: 0.64,
} as const;

/** The cream camera matches the bun camera, so the two chapters feel like one film. */
export const CREAM_FOV = 32;

export const TIMELINE = {
  revealEnd: 0.14,
  openStart: 0.14,
  openEnd: 0.31,
  fillStart: 0.3,
  fillEnd: 0.58,
  closeStart: 0.58,
  closeEnd: 0.76,
  turnStart: 0.76,
  turnEnd: 0.86,
  packIn: 0.86,
  packInEnd: 0.95,
  packCopy: 0.9,
  packCopyEnd: 0.985,
} as const;

export type Beat = {
  index: string;
  kicker: string;
  title: string;
  body: string;
  window: readonly [number, number];
};

export const BEATS: Beat[] = [
  {
    index: "01",
    kicker: "The bake",
    title: "One bun,\nready",
    body: "A soft golden shell, baked the same afternoon as the rest of the shelf. This is the whole bun before anything goes into it.",
    window: [-0.5, 0.145],
  },
  {
    index: "02",
    kicker: "The opening",
    title: "Open at\nthe seam",
    body: "The top half lifts along its own seam and hinges back, so the empty middle is a real opening rather than a cut made for the camera.",
    window: [0.155, 0.315],
  },
  {
    index: "03",
    kicker: "The pipe",
    title: "Cream,\npiped in",
    body: "A piping nozzle comes down and lays cream into the bun in a single ringed pass, one turn at a time, until it reaches the rim.",
    window: [0.335, 0.575],
  },
  {
    index: "04",
    kicker: "Closed",
    title: "Sealed\nby hand",
    body: "The top comes back down and the cream settles into the seam — the finished bun, exactly as it goes into the pack.",
    window: [0.6, 0.855],
  },
];

/* ---------------------------------------------------------------- opening -- */

export type Open = {
  /** 0 = closed. */
  open: number;
  /** How far the top half has risen above the cut plane. */
  lift: number;
  /** Radians the top half has hinged back. */
  tilt: number;
};

/**
 * The halves part *before* the cream arrives and close *over* it.
 *
 * The lift is smaller than the soft buns' — the top half only has to clear the
 * rim for the nozzle, and a bun that opens like a hinge of bread would read as a
 * different product.
 */
export function openAt(p: number): Open {
  const open =
    smoothstep(TIMELINE.openStart, TIMELINE.openEnd, p) *
    (1 - smoothstep(TIMELINE.closeStart, TIMELINE.closeEnd, p));
  // The lid has to clear the nozzle, so it lifts more than it tilts: a lid
  // that leans back at this scale hides the opening from a phone's camera.
  return { open, lift: 0.78 * open, tilt: -0.55 * open };
}

/* ------------------------------------------------------------------ cream -- */

/**
 * How much of the bun has been filled, 0 → 1.
 *
 * Deliberately linear-ish while the nozzle is down: cream leaving a nozzle at a
 * constant rate should look like it is leaving at a constant rate. The short
 * ease at each end is the nozzle settling, not the cream hesitating.
 */
export function fillAt(p: number): number {
  const rise = smoothstep(TIMELINE.fillStart, TIMELINE.fillEnd, p);
  return clamp01(rise * 0.98 + 0.02 * smoothstep(TIMELINE.fillStart, TIMELINE.fillStart + 0.06, p));
}

/**
 * The nozzle's height above the board.
 *
 * It starts off-frame, drops to the cream surface, then rides up with the fill
 * so the tip always sits just above what it has just piped — a nozzle that stays
 * put while the cream rises buries itself in its own output, which is the one
 * detail that gives a piped fill away.
 */
export function nozzleAt(p: number): { y: number; spin: number; visible: number } {
  const inStart = TIMELINE.fillStart - 0.055;
  const arrive = smoothstep(inStart, TIMELINE.fillStart + 0.03, p);
  // A slower retract than the drop: the tip has further to travel to clear the
  // closing top half, and a nozzle that snaps out reads as a cut, not a move.
  const leave = smoothstep(TIMELINE.fillEnd - 0.05, TIMELINE.fillEnd + 0.01, p);

  // The tip rides just above the cream it has already piped. A nozzle that
  // stayed put while the fill rose would bury its own tip in the cream, which is
  // the one detail that gives a piped fill away.
  const surface = creamSurfaceAt(p);
  const parked = 2.7;
  const tip = surface + 0.12;
  const y = parked + (tip - parked) * arrive + leave * 2.1;

  return {
    y,
    // A quarter turn through the pass: the ring of the piped cream has to come
    // from somewhere, and a static nozzle piping a spiral is the tell.
    spin:
      clamp01(
        (p - TIMELINE.fillStart) / (TIMELINE.fillEnd - TIMELINE.fillStart),
      ) *
      Math.PI *
      1.7,
    visible: arrive * (1 - leave),
  };
}

/** Height of the cream's top surface, from the first ring to the rim. */
export function creamSurfaceAt(p: number): number {
  return CREAM.fillBase + fillAt(p) * (CREAM.fillTop - CREAM.fillBase);
}

/**
 * The cream that squeezes out at the seam as the halves meet.
 *
 * It only exists once the bun is closing: cream appears when it is squeezed, not
 * before. `0 → 1` is the bulge's growth; it holds after the close.
 */
export function seamCreamAt(p: number): number {
  return smoothstep(TIMELINE.closeStart + 0.02, TIMELINE.closeEnd - 0.03, p);
}

/* ----------------------------------------------------------------- bounds -- */

export type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

type Vec3 = { x: number; y: number; z: number };

/**
 * Everything in frame, as one box: the bun (with the top half where the hinge
 * has put it), the cream, and — only while it is actually on screen — the
 * nozzle above it.
 *
 * The nozzle is inside the bounds on purpose. Framing the bun alone would push
 * the nozzle's tip out of the top of a phone screen during the pipe scene, and
 * the pipe is the scene. Excluding it while it is off-frame keeps the opening
 * wide shot wide.
 */
export function creamBounds(p: number): Bounds {
  const open = openAt(p);
  const r = CREAM.radius;
  const pts: Vec3[] = [];

  for (const x of [-r, r]) {
    for (const y of [0, CREAM.cutY]) {
      for (const z of [-r, r]) pts.push({ x, y, z });
    }
  }

  const c = Math.cos(open.tilt);
  const s = Math.sin(open.tilt);
  for (const x of [-r, r]) {
    for (const y of [CREAM.cutY, CREAM.height]) {
      for (const z of [-r, r]) {
        const ly = y - CREAM.cutY;
        pts.push({
          x,
          y: CREAM.cutY + (ly * c - z * s) + open.lift,
          z: ly * s + z * c,
        });
      }
    }
  }

  // Cream rises no higher than the rim while the bun is open, and bulges a
  // little past it once the halves meet.
  const fill = fillAt(p);
  const seam = seamCreamAt(p);
  pts.push({
    x: 0,
    y: CREAM.fillBase + fill * (CREAM.fillTop - CREAM.fillBase) + 0.08 * seam,
    z: 0,
  });

  const nozzle = nozzleAt(p);
  if (nozzle.visible > 0.4) {
    for (const x of [-0.2, 0.2]) {
      for (const y of [nozzle.y, nozzle.y + 0.7]) {
        for (const z of [-0.2, 0.2]) pts.push({ x, y, z });
      }
    }
  }

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
  yaw: number;
};

const TAN_HALF = Math.tan((CREAM_FOV * Math.PI) / 180 / 2);

/**
 * How much of the frame the content should fill, per scene.
 *
 * Base plus sequential increments, never a sum of stages: the stages run in
 * order, so adding them lets the total climb past 1 and drive the lens into the
 * product. The pipe scene is the closest shot, because that is where the detail
 * is; the opening and the pack are the widest.
 */
function zoomAt(p: number): number {
  const reveal = 0.62 + 0.04 * smoothstep(0.02, TIMELINE.revealEnd, p);
  const push = 0.08 * smoothstep(TIMELINE.openStart, 0.34, p);
  const pipe = 0.06 * smoothstep(TIMELINE.fillStart, 0.46, p);
  const pull = 0.1 * smoothstep(TIMELINE.closeStart, 0.8, p);
  const leave = 1 - 0.6 * smoothstep(TIMELINE.packIn, TIMELINE.packInEnd, p);
  return Math.max(0.2, (reveal + push + pipe - pull) * leave);
}

/**
 * The cream camera.
 *
 * Built the same way as the bun camera, and for the same reason: a phone limits
 * a round product by its *width*, so the distance has to be solved against both
 * axes, and the aim point is then nudged until the product's projected centre
 * lands in the band above the caption strip. Ten refinement steps against the
 * real projection, because the camera is tilted and a tilted camera does not map
 * world height to screen height linearly.
 */
export function viewFor(p: number, aspect: number): View {
  const bounds = creamBounds(p);
  const yaw = creamYaw(p, aspect);
  const ext = rotatedExtent(bounds, yaw);

  const contentH = Math.max(0.001, bounds.maxY - bounds.minY);
  const centreY = (bounds.minY + bounds.maxY) / 2;
  const portrait = aspect < 0.85;

  // The caption strip owns the bottom of a portrait screen, so the band is
  // higher there: product above the reading line, words below it.
  const bandTop = 0.1;
  const bandBottom = portrait ? 0.66 : 0.68;
  const band = bandBottom - bandTop;
  const maxW = portrait ? 0.86 : 0.8;

  // Never ask for more height than the band has. On a desktop the nozzle makes
  // the content taller than the space above the captions, and a zoom that
  // ignores that clips the nozzle off the top of the screen.
  const zoom = Math.min(zoomAt(p), band * 0.97);

  const front = ext.depth / 2;
  let camZ =
    Math.max(
      contentH / (2 * TAN_HALF * zoom),
      ext.width / (2 * TAN_HALF * aspect * maxW),
      1.2,
    ) + front;

  // A low, gently tilted camera: steep angles foreshorten the nozzle so hard
  // that the pinhole estimate stops holding, and the solve below has to fight
  // the geometry instead of the framing.
  const camY = centreY + 0.62;

  /**
   * Aim point, solved rather than estimated.
   *
   * `lookY` moves the product up and down the frame, but not linearly — the
   * camera is tilted and the product has depth — so this bisects on the real
   * projection until the measured centre lands on the band centre.
   */
  const solve = (z: number) => {
    const halfH = TAN_HALF * Math.max(0.2, z - front);
    const target = (bandTop + bandBottom) / 2;
    let lo = centreY - 4 * halfH;
    let hi = centreY + 4 * halfH;
    let best = centreY;
    let bestErr = Infinity;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      const rect = projectRect(bounds, yaw, { camY, camZ: z, lookY: mid }, aspect);
      const err = (rect.top + rect.bottom) / 2 - target;
      if (Math.abs(err) < bestErr) {
        bestErr = Math.abs(err);
        best = mid;
      }
      // Measured centre below the target (bigger fraction = lower on screen)
      // means the aim point is too high: look lower.
      if (err > 0) hi = mid;
      else lo = mid;
    }
    return best;
  };

  let lookY = solve(camZ);
  // One correction pass: if the solve still cannot fit the content in the band,
  // the content is too tall for the distance and the camera has to give ground.
  for (let pass = 0; pass < 3; pass++) {
    const rect = projectRect(bounds, yaw, { camY, camZ, lookY }, aspect);
    const projected = rect.bottom - rect.top;
    if (projected <= band * 0.995) break;
    camZ *= projected / (band * 0.96);
    lookY = solve(camZ);
  }

  return { camZ, camY, lookY, yaw };
}

/**
 * The turn.
 *
 * Almost nothing early — a staged reveal, not a turntable — then one slow turn
 * once the bun is closed, which is the only motion the finished product gets.
 */
export function creamYaw(p: number, aspect: number): number {
  const base = aspect < 0.85 ? -0.1 : -0.24;
  const turn = smoothstep(TIMELINE.turnStart, TIMELINE.turnEnd, p);
  return base + 0.14 * smoothstep(0, 0.2, p) + 0.5 * turn;
}

function rotateX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
}

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

export type ScreenRect = { left: number; right: number; top: number; bottom: number };

/** An axis-aligned box projected through the camera `viewFor` returns. */
export function projectRect(
  bounds: Bounds,
  yaw: number,
  view: { camY: number; camZ: number; lookY: number },
  aspect: number,
): ScreenRect {
  const camPos = { x: 0, y: view.camY, z: view.camZ };
  const fLen = Math.hypot(view.camY - view.lookY, view.camZ);
  const forward = {
    x: 0,
    y: (view.lookY - view.camY) / fLen,
    z: -view.camZ / fLen,
  };
  // Right vector of a camera that only rotates about X.
  const right = { x: 1, y: 0, z: 0 };
  const up = {
    x: 0,
    y: -forward.z,
    z: forward.y,
  };

  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  let left = Infinity;
  let rightMost = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  for (const x of [bounds.minX, bounds.maxX]) {
    for (const y of [bounds.minY, bounds.maxY]) {
      for (const z of [bounds.minZ, bounds.maxZ]) {
        const wx = x * c + z * s;
        const wz = -x * s + z * c;
        const dx = wx - camPos.x;
        const dy = y - camPos.y;
        const dz = wz - camPos.z;
        const depth = dx * forward.x + dy * forward.y + dz * forward.z;
        if (depth <= 0.01) continue;
        const sx = (dx * right.x + dy * right.y + dz * right.z) / (depth * TAN_HALF * aspect);
        const sy = (dx * up.x + dy * up.y + dz * up.z) / (depth * TAN_HALF);
        left = Math.min(left, 0.5 + sx * 0.5);
        rightMost = Math.max(rightMost, 0.5 + sx * 0.5);
        top = Math.min(top, 0.5 - sy * 0.5);
        bottom = Math.max(bottom, 0.5 - sy * 0.5);
      }
    }
  }
  return { left, right: rightMost, top, bottom };
}

/** What the caption guard checks against. */
export function creamScreenRect(p: number, aspect: number): ScreenRect {
  return projectRect(creamBounds(p), creamYaw(p, aspect), viewFor(p, aspect), aspect);
}
