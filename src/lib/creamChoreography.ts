/**
 * Choreography for chapter three — the cream bun.
 *
 * Same contract as the bread and buns chapters: pure maths, read by both the DOM
 * side (captions, packaging hand-off) and the WebGL side (poses, camera), so a
 * caption can never describe something the model is not doing.
 *
 * The product is a *long* roll — the four-pack in `public/assets/brand` shows it
 * split lengthwise with cream along the whole seam, and the cross-section
 * photograph shows a deep cream layer inside. So the story is told along the
 * length, not around a circle:
 *
 *   0.00 → 0.10   A · the bun      one elongated bun, three-quarter, closed
 *   0.10 → 0.26   B · the seam     the lid hinges back along the long axis
 *   0.27 → 0.52   C · the pipe     the nozzle runs the length, cream behind it
 *   0.53 → 0.64   D · closed       the lid comes down on the cream
 *   0.64 → 0.74   E · the turn     one slow turn of the finished bun
 *   0.74 → 0.84   F · the cut      the near end is clipped away: cross-section
 *   0.86 → 0.96   G · the pack     the supplied four-pack takes the frame
 *
 * Nothing here invents a product. The shell is `lib/creamBun`, the cream is
 * cream, and the pack is the brand's own photograph.
 */

import { clamp01, smoothstep, bell, lerp } from "@/lib/choreography";

export { clamp01, smoothstep, bell, lerp };

/** Dimensions of the shell, mirrored from `lib/creamBun` for the camera maths. */
export const CREAM = {
  halfLength: 1.16,
  halfWidth: 0.5,
  height: 0.94,
  cutY: 0.4,
  cream: 0.06,
  /** Where the section is taken, and the plane the near end is clipped at. */
  cutX: 0.46,
  /** Radius of the piped rope, and how far it is squashed vertically. */
  ropeRadius: 0.13,
  ropeFlatten: 0.62,
} as const;

/** Height of the rope's crown: a piped rope is wider than it is tall. */
export const ROPE_Y =
  CREAM.cutY + CREAM.ropeRadius * CREAM.ropeFlatten * 1.9;

export const CREAM_FOV = 32;

export const TIMELINE = {
  revealEnd: 0.1,
  openStart: 0.1,
  openEnd: 0.26,
  fillStart: 0.27,
  fillEnd: 0.52,
  closeStart: 0.53,
  closeEnd: 0.64,
  turnStart: 0.64,
  turnEnd: 0.74,
  cutStart: 0.74,
  cutEnd: 0.84,
  packIn: 0.86,
  packInEnd: 0.955,
  packCopy: 0.9,
  packCopyEnd: 0.99,
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
    kicker: "The bun",
    title: "One long\nbun",
    body: "The cream bun is a soft roll, baked long rather than round — domed gold on top, pale where it met the tray.",
    window: [-0.5, 0.105],
  },
  {
    index: "02",
    kicker: "The seam",
    title: "Opened\nlengthways",
    body: "It splits along its own seam, the way a roll actually opens: one half hinging back on the other, crumb on both faces.",
    window: [0.115, 0.27],
  },
  {
    index: "03",
    kicker: "The pipe",
    title: "Cream,\nend to end",
    body: "The nozzle travels the length of the bun and lays one continuous rope of cream, ridged by the tip, settling as it goes.",
    window: [0.29, 0.52],
  },
  {
    index: "04",
    kicker: "The cut",
    title: "What is\ninside",
    body: "Closed, then cut across: the cream reads as one deep layer through the bread, not a slab pressed between two halves.",
    window: [0.575, 0.845],
  },
];

/* ---------------------------------------------------------------- opening -- */

export type Open = {
  /** 0 = closed, 1 = fully hinged back. */
  open: number;
  /** Radians the lid has hinged about the bun's long axis. */
  hinge: number;
};

/**
 * The lid hinges about X, along the far edge — an opened roll, not a lifted lid.
 *
 * A lid that rises straight up reads as a levitating cap from the side, and on a
 * phone it also parks itself in front of the opening. Hinging at the far edge
 * tips it away from the camera, so the inside of the bun faces the viewer for
 * the whole time the nozzle is working.
 */
export function openAt(p: number): Open {
  const open =
    smoothstep(TIMELINE.openStart, TIMELINE.openEnd, p) *
    (1 - smoothstep(TIMELINE.closeStart, TIMELINE.closeEnd, p));
  return { open, hinge: -1.16 * open };
}

/* ------------------------------------------------------------------ cream -- */

/**
 * How much of the rope has been laid, 0 → 1.
 *
 * Nearly linear between the ends: cream leaving a nozzle at a constant rate
 * should look like it is leaving at a constant rate. Only the first and last few
 * percent ease, which is the nozzle touching down and lifting off.
 */
export function fillAt(p: number): number {
  const t = clamp01(
    (p - TIMELINE.fillStart) / (TIMELINE.fillEnd - TIMELINE.fillStart),
  );
  const eased = 0.04 * smoothstep(0, 0.12, t) + 0.92 * t + 0.04 * smoothstep(0.9, 1, t);
  return clamp01(p < TIMELINE.fillStart ? 0 : eased);
}

/** The nozzle's world position while it is piping. */
export function nozzleAt(p: number): { x: number; y: number; visible: number } {
  const xEnd = CREAM.halfLength * 0.94;
  const arrive = smoothstep(
    TIMELINE.fillStart - 0.045,
    TIMELINE.fillStart + 0.012,
    p,
  );
  const leave = smoothstep(TIMELINE.fillEnd - 0.03, TIMELINE.fillEnd + 0.012, p);
  const f = fillAt(p);

  // The tip leads the rope by a hair: cream appears *under* it, never behind it.
  const x = -xEnd + 2 * xEnd * Math.min(1, f + 0.012);
  // The tip hovers just above the rope, and lifts clear once the run is done.
  const y = ROPE_Y + 0.05 + leave * 0.55;

  return { x, y, visible: arrive * (1 - leave) };
}

/** The cream layer between the halves: only exists as the bun closes. */
export function creamLayerAt(p: number): number {
  return smoothstep(TIMELINE.closeStart + 0.01, TIMELINE.closeEnd - 0.015, p);
}

/** 0 → 1 as the near end is clipped away for the cross-section. */
export function cutAt(p: number): number {
  return smoothstep(TIMELINE.cutStart, TIMELINE.cutEnd, p);
}

/**
 * Where the clip plane sits, in bun-space X.
 *
 * The knife sweeps in from beyond the near end down to the section plane rather
 * than switching on: a plane that jumps removes a third of the bun in one frame,
 * which is the one thing the cut beat must not do.
 */
export function clipXAt(p: number): number {
  const c = cutAt(p);
  const start = CREAM.halfLength + 0.06;
  if (c < 0.002) return start;
  return start - c * (start - CREAM.cutX);
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
 * Everything in frame as one box: the shell (with the lid where the hinge has
 * put it), the cream, and the nozzle only while it is actually on screen.
 *
 * The clipped end is excluded once the cut starts, so cutting does not suddenly
 * pull the camera back for a bun that is no longer there.
 */
export function creamBounds(p: number): Bounds {
  const hingeState = openAt(p);
  const open = hingeState.open;
  const pts: Vec3[] = [];
  const { halfLength, halfWidth, height, cutY, cream } = CREAM;
  const cut = cutAt(p);
  const maxX = cut > 0.002 ? Math.min(halfLength, clipXAt(p)) : halfLength;

  for (const x of [-halfLength, maxX]) {
    for (const z of [-halfWidth, halfWidth]) {
      pts.push({ x, y: 0, z });
      if (cut < 0.5) pts.push({ x, y: cutY, z });
    }
  }

  // The lid: a box hinged about the long axis at the far edge.
  if (open > 0.001) {
    const pivotY = cutY + cream;
    const pivotZ = -halfWidth * 0.92;
    const c = Math.cos(hingeState.hinge);
    const s = Math.sin(hingeState.hinge);
    for (const x of [-halfLength, maxX]) {
      for (const y of [pivotY, height]) {
        for (const z of [-halfWidth, halfWidth]) {
          const dy = y - pivotY;
          const dz = z - pivotZ;

          pts.push({
            x,
            y: pivotY + dy * c - dz * s,
            z: pivotZ + dy * s + dz * c,
          });
        }
      }
    }
  } else {
    for (const x of [-halfLength, maxX]) {
      for (const y of [cutY, height]) {
        for (const z of [-halfWidth, halfWidth]) pts.push({ x, y, z });
      }
    }
  }

  const rope = CREAM.ropeRadius;
  const f = fillAt(p);
  if (f > 0.001) {
    const xr = -halfLength * 0.94 + 2 * halfLength * 0.94 * f;
    pts.push({ x: xr, y: ROPE_Y + rope, z: -rope });
    pts.push({ x: xr, y: ROPE_Y + rope, z: rope });
  }

  const nozzle = nozzleAt(p);
  if (nozzle.visible > 0.35) {
    for (const dx of [-0.16, 0.16]) {
      for (const dz of [-0.16, 0.16]) {
        pts.push({ x: nozzle.x + dx, y: nozzle.y, z: dz });
        pts.push({ x: nozzle.x + dx, y: nozzle.y + 0.3, z: dz });
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
 * How much of the frame's height the content should fill.
 *
 * A long bun is limited by its *width* on a phone, so this stays modest and the
 * distance is solved against both axes: measuring the bun's length as the thing
 * to fit would leave the product small and the nozzle off-frame.
 */
function zoomAt(p: number): number {
  const reveal = 0.6 + 0.05 * smoothstep(0.01, TIMELINE.revealEnd, p);
  const open = 0.05 * smoothstep(TIMELINE.openStart, 0.3, p);
  const pipe = 0.05 * smoothstep(TIMELINE.fillStart, 0.44, p);
  const cut = 0.1 * smoothstep(TIMELINE.turnStart, TIMELINE.cutEnd, p);
  const leave = 1 - 0.55 * smoothstep(TIMELINE.packIn, TIMELINE.packInEnd, p);
  return Math.max(0.2, (reveal + open + pipe + cut) * leave);
}

export function viewFor(p: number, aspect: number): View {
  const bounds = creamBounds(p);
  const yaw = creamYaw(p, aspect);
  const ext = rotatedExtent(bounds, yaw);

  const contentH = Math.max(0.001, bounds.maxY - bounds.minY);
  const centreY = (bounds.minY + bounds.maxY) / 2;
  const portrait = aspect < 0.85;

  // The caption strip owns the bottom of a portrait screen, so the product sits
  // above the reading line and the words sit below it.
  const bandTop = 0.09;
  const bandBottom = portrait ? 0.62 : 0.74;
  const bandH = bandBottom - bandTop;
  const target = (bandTop + bandBottom) / 2;
  const maxW = portrait ? 0.9 : 0.84;
  const zoom = Math.min(zoomAt(p), bandH * 0.94);
  const front = ext.depth / 2;

  // A low three-quarter camera: high enough to see into the opened bun, low
  // enough that the long shape is not foreshortened into a disc.
  const camY = centreY + Math.max(0.5, contentH * 0.55);

  /**
   * Aim point, solved rather than estimated.
   *
   * `lookY` moves the product up and down the frame, but not linearly — the
   * camera is tilted and the product has depth — so this bisects on the real
   * projection until the measured centre lands on the band centre.
   */
  const solveLook = (camZ: number) => {
    const halfH = TAN_HALF * Math.max(0.2, camZ - front);
    let lo = centreY - 4 * halfH;
    let hi = centreY + 4 * halfH;
    let best = centreY;
    let bestErr = Infinity;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const rect = projectRect(bounds, yaw, { camY, camZ, lookY: mid }, aspect);
      const err = (rect.top + rect.bottom) / 2 - target;
      if (Number.isFinite(err) && Math.abs(err) < bestErr) {
        bestErr = Math.abs(err);
        best = mid;
      }
      if (!Number.isFinite(err)) break;
      // Measured centre below the target (bigger fraction = lower on screen)
      // means the aim point is too high: look lower.
      if (err > 0) hi = mid;
      else lo = mid;
    }
    return best;
  };

  let camZ =
    Math.max(
      contentH / (2 * TAN_HALF * zoom),
      ext.width / (2 * TAN_HALF * aspect * maxW),
      1.2,
    ) + front;
  let lookY = solveLook(camZ);

  /**
   * Safety net: the perspective camera projects the corners *outside* the
   * pinhole box, and a tilted camera does not map world height to screen
   * height linearly, so a fit that looks right on paper can still clip the
   * nozzle. Measure, then give ground until it fits.
   */
  for (let pass = 0; pass < 5; pass++) {
    const rect = projectRect(bounds, yaw, { camY, camZ, lookY }, aspect);
    const over = Math.max(
      0.015 - rect.top,
      rect.bottom - 0.985,
      0.015 - rect.left,
      rect.right - 0.985,
    );
    if (!Number.isFinite(over) || over <= 0) break;
    camZ *= 1 + Math.max(0.03, over * 1.6);
    lookY = solveLook(camZ);
  }

  return { camZ, camY, lookY, yaw };
}

/**
 * The turn.
 *
 * Three-quarter for the reveal — the length and the rounded ends have to read
 * immediately — then a slow turn, then round to face the cut.
 */
export function creamYaw(p: number, aspect: number): number {
  const base = aspect < 0.85 ? -0.36 : -0.44;
  // Three-quarter, then slowly round to the near end so the cut is looked at
  // face-on. Turning the *other* way would hide the section behind the bun.
  const turn = 0.5 * smoothstep(TIMELINE.turnStart, TIMELINE.turnEnd, p);
  const face = 0.5 * smoothstep(TIMELINE.cutStart, TIMELINE.cutEnd, p);
  return base + 0.06 * smoothstep(0, TIMELINE.openEnd, p) - turn - face;
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
  const right = { x: 1, y: 0, z: 0 };
  const up = { x: 0, y: -forward.z, z: forward.y };

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
        const sx =
          (dx * right.x + dy * right.y + dz * right.z) / (depth * TAN_HALF * aspect);
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
