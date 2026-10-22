/**
 * The cream bun — geometry.
 *
 * WHAT THE PRODUCT ACTUALLY IS
 *
 * The supplied four-pack shows a long soft roll, not a round bun: roughly
 * 2.4 : 1 long, domed golden-brown on top, with a white cream seam running the
 * whole length of it between two halves. This module builds exactly that, and
 * nothing round. The soft buns chapter keeps its own round geometry in
 * `lib/bun.ts`; this file is the cream bun only.
 *
 * HOW THE SHAPE IS BUILT
 *
 * A superellipse in plan (a rounded rectangle, exponent `plan`) is swept along
 * X and scaled by a dome profile in Y:
 *
 *     x = A · s(v) · sgn(cos θ)|cos θ|^(2/n)
 *     z = B · s(v) · sgn(sin θ)|sin θ|^(2/n)
 *     y = v · H
 *
 * `s(v)` is 1 at mid-height and falls to 0 at the crown, so the roll has flatish
 * flanks, a full shoulder and a domed top, and its ends are rounded rather than
 * pointed — a pill, not an ellipsoid. The base is tucked in slightly, the way a
 * bun meets a tray.
 *
 * The bun is **pre-separated** into a bottom half (0 → cutY) and a top half
 * (cutY + cream → H), each a closed solid with a real baked rim and a real crumb
 * face. The cream layer between them is its own solid. Nothing is cut at run
 * time; the transverse section in the last beat is a clipped view of these same
 * meshes plus a section face, not a second product.
 */

import * as THREE from "three";
import { smoothstep } from "@/lib/choreography";

export const SHELL = {
  /** Half the length along X. Length : width ≈ 2.32 : 1, as in the pack. */
  halfLength: 1.16,
  /** Half the width along Z. */
  halfWidth: 0.5,
  /** Overall height along Y, including the cream layer. Nearly as tall as wide. */
  height: 0.94,
  /** Where the bun is split — the top of the bottom half. Sits just below the
   *  roll's widest point, the way the cream seam does in the pack. */
  cutY: 0.4,
  /** Thickness of the cream layer between the halves when closed. */
  cream: 0.06,
  /** Superellipse exponent of the plan view: 2 = ellipse, higher = boxier. */
  plan: 2.9,
  /** Baked crust rim on each cut face, in world units. */
  rim: 0.03,
  /**
   * Dome profile. A soft roll holds its full width up to about three quarters
   * of its height and only then rounds over: a low exponent rounds too early
   * and the bun reads as a lens or a macaron.
   */
  profileP: 3.5,
  profileQ: 0.45,
} as const;

/** Normalised height of the split. */
export const CUT_V = SHELL.cutY / SHELL.height;
/** Normalised height where the top half's own cut face sits. */
export const TOP_CUT_V = (SHELL.cutY + SHELL.cream) / SHELL.height;

const E = 2 / SHELL.plan;

const superCos = (a: number) => {
  const c = Math.cos(a);
  return Math.sign(c) * Math.pow(Math.abs(c), E);
};
const superSin = (a: number) => {
  const s = Math.sin(a);
  return Math.sign(s) * Math.pow(Math.abs(s), E);
};

/**
 * The dome profile: 1 at mid-height, 0 at the crown.
 *
 * `3.1 / 0.46` gives a full shoulder and a rounded crown rather than a sphere.
 * The `tuck` term pulls the base in, so the bun sits on a tray instead of
 * bulging over its own footprint.
 */
export function shellScale(v: number): number {
  const t = Math.min(1, Math.max(0, v));
  const dome = Math.pow(
    Math.max(0, 1 - Math.pow(t, SHELL.profileP)),
    SHELL.profileQ,
  );
  const tuck = 0.88 + 0.12 * smoothstep(0, 0.26, t);
  return dome * tuck;
}

/** A point on the outer surface. `v` is height, 0 → 1. */
export function shellPoint(theta: number, v: number): THREE.Vector3 {
  const s = shellScale(v);
  return new THREE.Vector3(
    SHELL.halfLength * s * superCos(theta),
    v * SHELL.height,
    SHELL.halfWidth * s * superSin(theta),
  );
}

/**
 * Outward normal, from the two surface tangents.
 *
 * Finite differences rather than an analytic derivative: the profile is a
 * composed power law, and the numeric form is exact to well under a pixel at
 * this tessellation.
 */
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();

function shellNormal(theta: number, v: number, out: THREE.Vector3): THREE.Vector3 {
  const dt = 1e-3;
  const dv = 1e-3;
  const p = shellPoint(theta, v);
  const pt = shellPoint(theta + dt, v);
  const pv = shellPoint(theta, Math.min(0.9999, v + dv));
  _a.copy(pt).sub(p);
  _b.copy(pv).sub(p);
  // (∂/∂v) × (∂/∂θ) points outwards — verified at θ = 0, v = 0.5.
  return out.crossVectors(_b, _a).normalize();
}

/* ------------------------------------------------------------------ colour -- */

const CRUST_LOW = new THREE.Color("#e6c39a");
const CRUST_MID = new THREE.Color("#d29a5e");
const CRUST_HIGH = new THREE.Color("#9c5c26");
const CRUMB_CENTRE = new THREE.Color("#f4e8d4");
const CRUMB_RIM = new THREE.Color("#e0c8a4");

/** Golden bake, read by height: pale at the base, deep gold at the crown. */
function crustColour(v: number, out: THREE.Color): THREE.Color {
  const t = Math.min(1, Math.max(0, v));
  const a = smoothstep(0.02, 0.45, t);
  const b = smoothstep(0.5, 0.98, t);
  return out.copy(CRUST_LOW).lerp(CRUST_MID, a).lerp(CRUST_HIGH, b);
}

/**
 * Baked-crust mottling.
 *
 * Three incommensurate sine bands, so the surface neither tiles nor reads as a
 * pattern: this is what breaks a perfectly smooth dome into something baked.
 * It is used for colour and for a sub-millimetre displacement of the wall.
 */
function mottle(theta: number, v: number): number {
  return (
    Math.sin(theta * 7.3 + v * 12.1) * 0.5 +
    Math.sin(theta * 17.7 - v * 5.3) * 0.3 +
    Math.sin(theta * 3.1 + v * 27.3) * 0.2
  );
}

/* ---------------------------------------------------------------- assembly -- */

type Acc = { pos: number[]; nor: number[]; uv: number[]; col: number[] };

const createAcc = (): Acc => ({ pos: [], nor: [], uv: [], col: [] });

function push(
  acc: Acc,
  p: THREE.Vector3,
  n: THREE.Vector3,
  u: number,
  v: number,
  c: THREE.Color,
): void {
  acc.pos.push(p.x, p.y, p.z);
  acc.nor.push(n.x, n.y, n.z);
  acc.uv.push(u, v);
  acc.col.push(c.r, c.g, c.b);
}

const tmpN = new THREE.Vector3();
const tmpC = new THREE.Color();

/**
 * The swept side wall between two heights.
 *
 * Emitted as a quad grid in (θ, v), non-indexed so it can share a BufferGeometry
 * with the caps and keep the two material groups (0 = crust, 1 = crumb) simple.
 */
function sweep(
  acc: Acc,
  v0: number,
  v1: number,
  latitudes: number,
  segments: number,
): void {
  const ring = (j: number, v: number) => {
    const theta = (j / segments) * Math.PI * 2;
    const p = shellPoint(theta, v);
    const n = shellNormal(theta, v, new THREE.Vector3());

    // Fade the bump out at both ends of the sweep: the cut faces are flat, and
    // displacing the wall next to them would open a hairline at the rim.
    const edge = Math.min(
      smoothstep(v0, v0 + 0.05, v),
      smoothstep(1, 0.95, v),
    );
    const m = mottle(theta, v) * edge;
    p.addScaledVector(n, 0.008 * m);

    const c = crustColour(v, tmpC.clone());
    // Baked patchiness, plus a flour dusting over the crown.
    const dust = 0.07 * smoothstep(0.72, 0.95, v);
    c.multiplyScalar(1 + 0.11 * m + dust);

    return { p, n, u: j / segments, c };
  };

  // The crown is a single point; the last ring is kept a hair below it and
  // closed with a fan, so no ring is ever degenerate.
  const isTop = v1 >= 0.999;
  const vLast = isTop ? 0.999 : v1;

  for (let i = 0; i < latitudes; i++) {
    const va = v0 + ((vLast - v0) * i) / latitudes;
    const vb = v0 + ((vLast - v0) * (i + 1)) / latitudes;
    const vva = (va - v0) / (v1 - v0 || 1);
    const vvb = (vb - v0) / (v1 - v0 || 1);

    for (let j = 0; j < segments; j++) {
      const A = ring(j, va);
      const B = ring(j, vb);
      const C = ring(j + 1, va);
      const D = ring(j + 1, vb);
      const jn = ((j + 1) % segments) / segments;

      push(acc, A.p, A.n, A.u, vva, A.c);
      push(acc, B.p, B.n, A.u, vvb, B.c);
      push(acc, C.p, C.n, jn, vva, C.c);
      push(acc, C.p, C.n, jn, vva, C.c);
      push(acc, B.p, B.n, A.u, vvb, B.c);
      push(acc, D.p, D.n, jn, vvb, D.c);
    }
  }

  if (isTop) {
    const apex = new THREE.Vector3(0, SHELL.height, 0);
    const up = new THREE.Vector3(0, 1, 0);
    const c = crustColour(1, tmpC.clone());
    for (let j = 0; j < segments; j++) {
      const A = ring(j, vLast);
      const B = ring(j + 1, vLast);
      push(acc, A.p, A.n, j / segments, 1, A.c);
      push(acc, apex, up, (j + 0.5) / segments, 1, c);
      push(acc, B.p, B.n, (j + 1) / segments, 1, B.c);
    }
  }
}

/**
 * A flat superellipse face at height `y`, facing up or down.
 *
 * `inset` scales the outline (used for the crumb inside the baked rim). With
 * `rim > 0` the face is emitted as a crust ring plus a crumb centre, which is
 * what makes a cut bun read as bread rather than as a filled shape.
 */
function face(
  crustAcc: Acc,
  crumbAcc: Acc | null,
  y: number,
  scale: number,
  segments: number,
  facing: 1 | -1,
  rim: number,
  colourOf: (edge: number) => THREE.Color,
): void {
  const at = (k: number, t: number) => {
    const theta = (t / segments) * Math.PI * 2;
    return new THREE.Vector3(
      SHELL.halfLength * scale * k * superCos(theta),
      y,
      SHELL.halfWidth * scale * k * superSin(theta),
    );
  };
  const uvOf = (p: THREE.Vector3) => ({
    u: p.x / (SHELL.halfLength * 2) + 0.5,
    v: p.z / (SHELL.halfWidth * 2) + 0.5,
  });
  const n = new THREE.Vector3(0, facing, 0);
  const inner = Math.max(0.02, 1 - rim / Math.max(0.05, SHELL.halfWidth * scale));

  /** Triangle order depends on which way the face looks, so it never inverts. */
  const tri = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3) => {
    if (facing === 1) return [p, r, q];
    return [p, q, r];
  };

  for (let j = 0; j < segments; j++) {
    const o0 = at(1, j);
    const o1 = at(1, j + 1);
    const i0 = at(inner, j);
    const i1 = at(inner, j + 1);

    // Baked rim.
    const ring = tri(i0, o1, o0);
    const ring2 = tri(i0, i1, o1);
    const co = colourOf(1);
    const ci = colourOf(0);
    for (const [p, c] of [
      [ring[0], ci],
      [ring[1], co],
      [ring[2], co],
    ] as [THREE.Vector3, THREE.Color][]) {
      const uv = uvOf(p);
      push(crustAcc, p, n, uv.u, uv.v, c);
    }
    for (const [p, c] of [
      [ring2[0], ci],
      [ring2[1], ci],
      [ring2[2], co],
    ] as [THREE.Vector3, THREE.Color][]) {
      const uv = uvOf(p);
      push(crustAcc, p, n, uv.u, uv.v, c);
    }

    if (!crumbAcc) continue;

    // Crumb.
    const centre = new THREE.Vector3(0, y, 0);
    const crumb = tri(centre, i0, i1);
    const cc = new THREE.Color().copy(CRUMB_CENTRE);
    const ce = new THREE.Color().copy(CRUMB_CENTRE).lerp(CRUMB_RIM, 0.9);
    for (const [p, c] of [
      [crumb[0], cc],
      [crumb[1], ce],
      [crumb[2], ce],
    ] as [THREE.Vector3, THREE.Color][]) {
      const uv = uvOf(p);
      push(crumbAcc, p, n, uv.u, uv.v, c);
    }
  }
}

function toGeometry(crust: Acc, crumb: Acc): THREE.BufferGeometry {
  const pos = [...crust.pos, ...crumb.pos];
  const nor = [...crust.nor, ...crumb.nor];
  const uv = [...crust.uv, ...crumb.uv];
  const col = [...crust.col, ...crumb.col];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));

  const crustVerts = crust.pos.length / 3;
  const crumbVerts = crumb.pos.length / 3;
  geometry.addGroup(0, crustVerts, 0);
  if (crumbVerts > 0) geometry.addGroup(crustVerts, crumbVerts, 1);

  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

export type ShellGeometries = {
  /** 0 → cutY, with the tray base and the upward crumb face. */
  bottom: THREE.BufferGeometry;
  /** cutY + cream → height, with the downward crumb face. */
  top: THREE.BufferGeometry;
};

/**
 * Both halves. The cut faces sit a tenth of a millimetre inside their nominal
 * planes so two coplanar discs can never z-fight while the bun is closed.
 */
export function createShellGeometries({
  latitudes,
  segments,
}: {
  latitudes: number;
  segments: number;
}): ShellGeometries {
  const offset = 0.0005;
  const sBottom = shellScale(CUT_V);
  const sTop = shellScale(TOP_CUT_V);

  /* -------------------------------------------------------------- bottom -- */
  const bottomCrust = createAcc();
  const bottomCrumb = createAcc();
  sweep(bottomCrust, 0, CUT_V, Math.max(3, Math.round(latitudes * 0.45)), segments);

  // The tray base: hidden on the board, but the mesh has to be closed.
  face(
    bottomCrust,
    null,
    0,
    shellScale(0),
    segments,
    -1,
    0,
    () => crustColour(0.03, new THREE.Color()),
  );

  // Baked rim, then the crumb inside it.
  face(
    bottomCrust,
    bottomCrumb,
    SHELL.cutY - offset,
    sBottom,
    segments,
    1,
    SHELL.rim,
    (edge) => crustColour(edge ? 0.3 : 0.38, new THREE.Color()),
  );

  /* ----------------------------------------------------------------- top -- */
  const topCrust = createAcc();
  const topCrumb = createAcc();
  const topBase = SHELL.cutY + SHELL.cream;
  sweep(
    topCrust,
    TOP_CUT_V,
    1,
    Math.max(4, Math.round(latitudes * 0.62)),
    segments,
  );
  face(
    topCrust,
    topCrumb,
    topBase + offset,
    sTop,
    segments,
    -1,
    SHELL.rim,
    (edge) => crustColour(edge ? 0.56 : 0.62, new THREE.Color()),
  );

  return {
    bottom: toGeometry(bottomCrust, bottomCrumb),
    top: toGeometry(topCrust, topCrumb),
  };
}

/* ------------------------------------------------------------ section face -- */

/** Half-width (Z) of the bun's section at `x`, at height fraction `v`. */
export function sectionHalfWidth(x: number, v: number): number {
  const s = shellScale(v);
  const reach = SHELL.halfLength * s;
  const abs = Math.abs(x);
  if (abs >= reach) return 0;
  const t = Math.pow(abs / reach, SHELL.plan);
  return SHELL.halfWidth * s * Math.pow(Math.max(0, 1 - t), 1 / SHELL.plan);
}

/** Highest `v` that still exists at `x`. */
export function sectionTopV(x: number): number {
  if (Math.abs(x) <= SHELL.halfLength * shellScale(0) * 0.999) {
    // The section runs from the base all the way to where the crown curves in.
    let lo = 0.3;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (SHELL.halfLength * shellScale(mid) >= Math.abs(x)) lo = mid;
      else hi = mid;
    }
    return lo;
  }
  return 0;
}

/**
 * The transverse section of the bun at `x`, as a face.
 *
 * Three material groups in one geometry: 0 = crumb, 1 = cream, 0 = crumb. The
 * cream band is the layer between the halves, seen end-on — the shot the brief
 * asks for, built from the same dimensions as the model it cuts through.
 */
export function createSectionFace({
  x = 0,
  rows = 48,
  discSegments = 24,
}: {
  /** Plane of the section. The mesh is built at this X; callers that animate
   *  the cut should build at 0 and move the object instead. */
  x?: number;
  rows?: number;
  discSegments?: number;
}): THREE.BufferGeometry {
  const vTop = sectionTopV(x);
  const facing = x >= 0 ? 1 : -1;
  const yCut0 = SHELL.cutY;
  const yCut1 = SHELL.cutY + SHELL.cream;

  const crumbPos: number[] = [];
  const crumbCol: number[] = [];
  const creamPos: number[] = [];
  const creamCol: number[] = [];

  const crumbC = new THREE.Color().copy(CRUMB_CENTRE);
  const crumbE = new THREE.Color().copy(CRUMB_CENTRE).lerp(CRUMB_RIM, 0.85);
  const creamC = new THREE.Color("#fffdf7");
  const creamS = new THREE.Color("#f2e6d2");

  /** Push one triangle wound outward for this facing. */
  const tri = (
    pos: number[],
    col: number[],
    a: [number, number][],
    colours: THREE.Color[],
  ) => {
    const order = facing === 1 ? [0, 2, 1] : [0, 1, 2];
    for (const k of order) {
      pos.push(x, a[k][1], a[k][0]);
      col.push(colours[k].r, colours[k].g, colours[k].b);
    }
  };

  // 1. The crumb, row by row, over the real outline.
  for (let i = 0; i < rows; i++) {
    const v0 = (vTop * i) / rows;
    const v1 = (vTop * (i + 1)) / rows;
    const z0 = sectionHalfWidth(x, v0);
    const z1 = sectionHalfWidth(x, v1);
    if (z0 < 1e-5 || z1 < 1e-5) continue;
    const y0 = v0 * SHELL.height;
    const y1 = v1 * SHELL.height;
    const edge = Math.abs(x) / (SHELL.halfLength * shellScale((v0 + v1) / 2) + 1e-6);
    const c = crumbC.clone().lerp(crumbE, Math.min(1, 0.35 + edge * 1.6));
    tri(crumbPos, crumbCol, [[z0, y0], [z1, y1], [-z0, y0]], [c, c, c]);
    tri(crumbPos, crumbCol, [[-z0, y0], [z1, y1], [-z1, y1]], [c, c, c]);
  }

  // 2. The cream band, sitting a hair proud of the crumb so it reads as soft.
  const bandOffset = 0.0012 * facing;
  const seg = 6;
  for (let i = 0; i < seg; i++) {
    const ya = yCut0 + ((yCut1 - yCut0) * i) / seg;
    const yb = yCut0 + ((yCut1 - yCut0) * (i + 1)) / seg;
    const va = ya / SHELL.height;
    const vb = yb / SHELL.height;
    const za = sectionHalfWidth(x, va) * 0.995;
    const zb = sectionHalfWidth(x, vb) * 0.995;
    if (za < 1e-4) continue;
    const xb = x + bandOffset;
    const quad: [number, number][] = [[za, ya], [zb, yb], [-za, ya], [-zb, yb]];
    const c0 = creamC;
    const c1 = creamS;
    const order2 = facing === 1 ? [0, 3, 1, 0, 3, 2] : [0, 1, 3, 0, 3, 2];
    for (const k of order2) {
      creamPos.push(xb, quad[k][1], quad[k][0]);
      creamCol.push((k === 0 || k === 3 ? c1 : c0).r, (k === 0 || k === 3 ? c1 : c0).g, (k === 0 || k === 3 ? c1 : c0).b);
    }
  }

  // 3. The piped rope, seen end-on — pressed flat by the closed lid, so it is
  // a lens inside the cream band rather than a circle floating above it.
  const rc = ROPE.radius * 0.95;
  const ry = ROPE.radius * ROPE.flatten;
  const bandMid = yCut0 + ry * 0.9;
  const centre = new THREE.Vector3(x + bandOffset, bandMid, 0);
  for (let j = 0; j < discSegments; j++) {
    const t0 = (j / discSegments) * Math.PI * 2;
    const t1 = ((j + 1) / discSegments) * Math.PI * 2;
    const p0: [number, number] = [
      Math.sin(t0) * rc,
      centre.y + Math.cos(t0) * ry,
    ];
    const p1: [number, number] = [
      Math.sin(t1) * rc,
      centre.y + Math.cos(t1) * ry,
    ];
    const c = creamC;
    const ctr: THREE.Color = creamS;
    const order = facing === 1 ? [0, 1, 2] : [0, 2, 1];
    const pts: [number, number][] = [
      [0, centre.y],
      p0,
      p1,
    ];
    const cols = [ctr, c, c];
    for (const k of order) {
      creamPos.push(centre.x, pts[k][1], pts[k][0]);
      creamCol.push(cols[k].r, cols[k].g, cols[k].b);
    }
  }

  const pos = [...crumbPos, ...creamPos];
  const col = [...crumbCol, ...creamCol];
  const normals: number[] = [];
  for (let i = 0; i < pos.length / 3; i++) normals.push(facing, 0, 0);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0.5), 2),
  );
  geom.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geom.addGroup(0, crumbPos.length / 3, 0);
  geom.addGroup(crumbPos.length / 3, creamPos.length / 3, 1);
  geom.computeBoundingSphere();
  return geom;
}

/* --------------------------------------------------------------- the cream -- */

/**
 * The piped rope.
 *
 * A tube along X with a slightly wavy radius — that is the piping ridge. It is
 * emitted station by station from one end, so `setDrawRange` reveals exactly as
 * much cream as the nozzle has laid, and the open end stays under the nozzle.
 */
export function createCreamRope({
  stations = 72,
  segments = 14,
  radius = ROPE.radius,
  flatten = ROPE.flatten,
}: {
  stations?: number;
  segments?: number;
  radius?: number;
  /** Vertical squash: a piped rope is wider than it is tall. */
  flatten?: number;
} = {}): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const xEnd = SHELL.halfLength * 0.94;
  const ry = radius * flatten;
  const yCentre = SHELL.cutY + ry * 0.9;
  const capLen = radius * 1.6;

  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const creamCol = new THREE.Color("#fffdf7");
  const shade = new THREE.Color("#f2e6d4");

  const stationX = (i: number) => -xEnd + (2 * xEnd * i) / stations;
  const stationR = (i: number) => {
    const x = stationX(i);
    // The ridge: a shallow scallop left by the nozzle, and the rounded ends.
    const ridge = 1 + 0.075 * Math.sin((i / stations) * Math.PI * 2 * 17);
    const edge = Math.min(
      1,
      Math.sqrt(
        Math.max(
          0,
          1 - Math.pow(Math.max(0, Math.abs(x) - (xEnd - capLen)) / capLen, 2),
        ),
      ),
    );
    return radius * ridge * Math.max(0.04, edge);
  };

  const at = (i: number, j: number) => {
    const theta = (j / segments) * Math.PI * 2;
    const r = stationR(i);
    return {
      p: new THREE.Vector3(
        stationX(i),
        yCentre + ry * (r / radius) * Math.cos(theta),
        r * Math.sin(theta),
      ),
      n: new THREE.Vector3(0, Math.cos(theta) / flatten, Math.sin(theta)).normalize(),
      u: (i / stations) * 5,
      v: j / segments,
      c: j % 2 === 0 ? creamCol : shade,
    };
  };

  for (let i = 0; i < stations; i++) {
    for (let j = 0; j < segments; j++) {
      const A = at(i, j);
      const B = at(i + 1, j);
      const C = at(i, j + 1);
      const D = at(i + 1, j + 1);
      for (const [p, n, u, v, c] of [
        [A.p, A.n, A.u, A.v, A.c],
        [B.p, B.n, B.u, B.v, B.c],
        [C.p, C.n, C.u, C.v, C.c],
        [C.p, C.n, C.u, C.v, C.c],
        [B.p, B.n, B.u, B.v, B.c],
        [D.p, D.n, D.u, D.v, D.c],
      ] as [THREE.Vector3, THREE.Vector3, number, number, THREE.Color][]) {
        pos.push(p.x, p.y, p.z);
        nor.push(n.x, n.y, n.z);
        uv.push(u, v);
        col.push(c.r, c.g, c.b);
      }
    }
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geom.computeBoundingSphere();

  /** Vertices per station — the unit `setDrawRange` counts in. */
  const perStation = segments * 6;
  return Object.assign(geom, { perStation, stations }) as THREE.BufferGeometry & {
    perStation: number;
    stations: number;
  };
}

/**
 * The closed cream layer: a thin slab filling the gap between the halves, a
 * touch proud of the crust so the seam reads as a white line from the side —
 * exactly what the pack shows.
 */
export function createCreamLayer({
  segments = 64,
  proud = 1.004,
}: {
  segments?: number;
  proud?: number;
} = {}): THREE.BufferGeometry {
  const scale = shellScale(CUT_V) * proud;
  const y0 = SHELL.cutY;
  const y1 = SHELL.cutY + SHELL.cream;

  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const cream = new THREE.Color("#fffdf7");
  const shade = new THREE.Color("#f6ecdc");

  const at = (t: number) => {
    const theta = (t / segments) * Math.PI * 2;
    return new THREE.Vector3(
      SHELL.halfLength * scale * superCos(theta),
      0,
      SHELL.halfWidth * scale * superSin(theta),
    );
  };

  for (let j = 0; j < segments; j++) {
    const o0 = at(j);
    const o1 = at(j + 1);
    // Side wall.
    const quad: [THREE.Vector3, THREE.Vector3][] = [
      [o0.clone().setY(y0), new THREE.Vector3()],
      [o1.clone().setY(y0), new THREE.Vector3()],
      [o0.clone().setY(y1), new THREE.Vector3()],
      [o1.clone().setY(y1), new THREE.Vector3()],
    ];
    const n = new THREE.Vector3(o0.x, 0, o0.z).normalize();
    for (const [p, nn] of [
      [quad[0][0], n],
      [quad[2][0], n],
      [quad[1][0], n],
      [quad[1][0], n],
      [quad[2][0], n],
      [quad[3][0], n],
    ] as [THREE.Vector3, THREE.Vector3][]) {
      pos.push(p.x, p.y, p.z);
      nor.push(nn.x, nn.y, nn.z);
      col.push(shade.r, shade.g, shade.b);
    }

    // Top face (+Y), hidden under the lid but needed for a closed solid.
    for (const p of [
      new THREE.Vector3(0, y1, 0),
      o1.clone().setY(y1),
      o0.clone().setY(y1),
    ]) {
      pos.push(p.x, p.y, p.z);
      nor.push(0, 1, 0);
      col.push(cream.r, cream.g, cream.b);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geom.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0.5), 2),
  );
  geom.computeBoundingSphere();
  return geom;
}

/** Where the rope's surface sits, for placing the nozzle and the stream. */
export const ROPE = {
  radius: 0.13,
  /** A piped rope is wider than it is tall. */
  flatten: 0.62,
  /** Height of the rope's crown above the crumb face. */
  get rise() {
    return this.radius * this.flatten * 1.9;
  },
  get xEnd() {
    return SHELL.halfLength * 0.94;
  },
} as const;
