/**
 * The soft bun — geometry and materials.
 *
 * HOW THE SPLIT WORKS — read this before changing anything.
 *
 * This is **pre-separated geometry, not runtime cutting**. The bun is a surface
 * of revolution built twice: a bottom half from the board to the cut plane, and
 * a top half from the cut plane to the crown. Each half is closed — its cut face
 * is a real disc of pale crumb inset behind a baked rim, exactly the way a torn
 * bun reads — so the halves can be pulled apart at any angle and every newly
 * exposed surface is genuine geometry. Nothing is being severed at runtime.
 *
 * Each half is one mesh with two material groups: 0 = crust, 1 = crumb.
 *
 * The profile is deliberately plumper than a sphere through the middle and
 * tucked in at the base, because a bun that is geometrically round reads as a
 * ball of dough rather than as something that came out of a tin.
 */

import * as THREE from "three";
import { BUN } from "@/lib/bunChoreography";
import { smoothstep } from "@/lib/choreography";
import { createCrustMaterial } from "@/lib/loaf";
import { createCrumbBump, createCrumbTexture } from "@/lib/breadTextures";

/** Radius of the outer surface at height fraction `t` ∈ [0, 1]. */
export function bunRadiusAt(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  // 1 at the base, 0 at the crown; `2.6 / 0.4` gives a full shoulder.
  const dome = Math.pow(Math.max(0, 1 - Math.pow(clamped, 2.6)), 0.4);
  // Narrower at the very bottom, where a bun meets the tray.
  const tuck = 0.9 + 0.1 * smoothstep(0, 0.22, clamped);
  return BUN.radius * dome * tuck;
}

/** Height-normalised position of a world y. */
const tOf = (y: number) => y / BUN.height;

type Acc = {
  pos: number[];
  nor: number[];
  uv: number[];
  col: number[];
};

const createAcc = (): Acc => ({ pos: [], nor: [], uv: [], col: [] });

type Vec3 = { x: number; y: number; z: number };

function push(
  acc: Acc,
  p: Vec3,
  n: Vec3,
  u: number,
  v: number,
  c: THREE.Color,
): void {
  acc.pos.push(p.x, p.y, p.z);
  acc.nor.push(n.x, n.y, n.z);
  acc.uv.push(u, v);
  acc.col.push(c.r, c.g, c.b);
}

/** Two flat stops plus a deep crown tone: the bake, read by height. */
const CRUST_LOW = new THREE.Color("#e9c391");
const CRUST_MID = new THREE.Color("#d39a58");
const CRUST_HIGH = new THREE.Color("#aa6325");
const CRUMB_CENTRE = new THREE.Color("#fcf8f0");
const CRUMB_RIM = new THREE.Color("#e7d2b4");

function crustColour(t: number, out: THREE.Color): THREE.Color {
  const a = smoothstep(0.05, 0.45, t);
  const b = smoothstep(0.45, 0.98, t);
  return out.copy(CRUST_LOW).lerp(CRUST_MID, a).lerp(CRUST_HIGH, b);
}

/**
 * The outer surface between two heights, as a lathe.
 *
 * Normals are derived from the profile's slope rather than from
 * `computeVertexNormals()`: the seam where the revolution closes would be
 * averaged against a duplicate vertex and show as a hard line down one side of
 * the bun, which is the kind of artefact nobody can unsee.
 */
function revolve(
  acc: Acc,
  y0: number,
  y1: number,
  latitudes: number,
  segments: number,
): void {
  const t0 = tOf(y0);
  const t1 = tOf(y1);
  const dt = 1e-3;

  const ring = (i: number) => {
    const t = t0 + (t1 - t0) * (i / latitudes);
    const y = t * BUN.height;
    const r = bunRadiusAt(t);
    // dr/dy, then the outward normal in the (r, y) plane: (1, -r').
    const slope =
      (bunRadiusAt(t + dt) - bunRadiusAt(t - dt)) / (2 * dt) / BUN.height;
    const len = Math.hypot(1, slope) || 1;
    const nr = 1 / len;
    const ny = -slope / len;
    const colour = crustColour(t, new THREE.Color());
    return { y, r, nr, ny, colour, t };
  };

  for (let i = 0; i < latitudes; i++) {
    const a = ring(i);
    const b = ring(i + 1);
    const va = (a.t - t0) / (t1 - t0 || 1);
    const vb = (b.t - t0) / (t1 - t0 || 1);

    for (let j = 0; j < segments; j++) {
      const f0 = (j / segments) * Math.PI * 2;
      const f1 = ((j + 1) / segments) * Math.PI * 2;
      const c0 = Math.cos(f0);
      const s0 = Math.sin(f0);
      const c1 = Math.cos(f1);
      const s1 = Math.sin(f1);

      // Lower ring: A (f0), C (f1). Upper ring: B (f0), D (f1).
      const A = { x: a.r * c0, y: a.y, z: a.r * s0 };
      const B = { x: b.r * c0, y: b.y, z: b.r * s0 };
      const C = { x: a.r * c1, y: a.y, z: a.r * s1 };
      const D = { x: b.r * c1, y: b.y, z: b.r * s1 };
      const nA = { x: a.nr * c0, y: a.ny, z: a.nr * s0 };
      const nB = { x: b.nr * c0, y: b.ny, z: b.nr * s0 };
      const nC = { x: a.nr * c1, y: a.ny, z: a.nr * s1 };
      const nD = { x: b.nr * c1, y: b.ny, z: b.nr * s1 };
      const u0 = j / segments;
      const u1 = (j + 1) / segments;

      push(acc, A, nA, u0, va, a.colour);
      push(acc, B, nB, u0, vb, b.colour);
      push(acc, C, nC, u1, va, a.colour);
      push(acc, C, nC, u1, va, a.colour);
      push(acc, B, nB, u0, vb, b.colour);
      push(acc, D, nD, u1, vb, b.colour);
    }
  }
}

/**
 * A flat disc or annulus at `y`, facing +Y or −Y.
 *
 * `facing` is the direction of the face normal. Winding is derived from that
 * rather than from the angle direction, so a cap cannot end up inside-out.
 */
function disc(
  acc: Acc,
  y: number,
  rInner: number,
  rOuter: number,
  segments: number,
  facing: 1 | -1,
  colourOf: (edge: number) => THREE.Color,
): void {
  const n = { x: 0, y: facing, z: 0 };
  const at = (r: number, f: number): Vec3 => ({
    x: r * Math.cos(f),
    y,
    z: r * Math.sin(f),
  });
  const uvOf = (p: Vec3) => ({
    u: (p.x / (BUN.radius * 2)) + 0.5,
    v: (p.z / (BUN.radius * 2)) + 0.5,
  });

  if (rInner <= 1e-6) {
    const centre = colourOf(0);
    const c = { x: 0, y, z: 0 };
    for (let j = 0; j < segments; j++) {
      const f0 = (j / segments) * Math.PI * 2;
      const f1 = ((j + 1) / segments) * Math.PI * 2;
      const P = at(rOuter, f0);
      const Q = at(rOuter, f1);
      const edge = colourOf(1);
      // (centre, P, Q) faces −Y; reversed faces +Y.
      const tri =
        facing === 1
          ? ([c, Q, P] as Vec3[])
          : ([c, P, Q] as Vec3[]);
      for (const p of tri) {
        const uv = uvOf(p);
        push(acc, p, n, uv.u, uv.v, p === c ? centre : edge);
      }
    }
    return;
  }

  for (let j = 0; j < segments; j++) {
    const f0 = (j / segments) * Math.PI * 2;
    const f1 = ((j + 1) / segments) * Math.PI * 2;
    const i0 = at(rInner, f0);
    const i1 = at(rInner, f1);
    const o0 = at(rOuter, f0);
    const o1 = at(rOuter, f1);
    const ci = colourOf(0);
    const co = colourOf(1);
    // +Y wants (inner_i, outer_{i+1}, outer_i); −Y is the other way round.
    const tris: [Vec3, THREE.Color][][] =
      facing === 1
        ? [
            [[i0, ci], [o1, co], [o0, co]],
            [[i0, ci], [i1, ci], [o1, co]],
          ]
        : [
            [[i0, ci], [o0, co], [o1, co]],
            [[i0, ci], [o1, co], [i1, ci]],
          ];
    for (const tri of tris) {
      for (const [p, col] of tri) {
        const uv = uvOf(p);
        push(acc, p, n, uv.u, uv.v, col);
      }
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

/** Fraction of the cut face kept as baked rim before the crumb starts. */
const RIM = 0.055;

export type BunGeometries = {
  bottom: THREE.BufferGeometry;
  top: THREE.BufferGeometry;
};

/**
 * Both halves. The cut faces sit a tenth of a millimetre apart so that the two
 * coplanar discs — which face opposite ways and are both culled from outside —
 * can never z-fight while the bun is closed.
 */
export function createBunGeometries({
  latitudes,
  segments,
}: {
  latitudes: number;
  segments: number;
}): BunGeometries {
  const cutR = bunRadiusAt(tOf(BUN.cutY));
  const crumbR = Math.max(0.05, cutR - RIM);
  const offset = 0.0005;

  /* -------------------------------------------------------------- bottom -- */
  const bottomCrust = createAcc();
  const bottomCrumb = createAcc();
  revolve(bottomCrust, 0, BUN.cutY, latitudes, segments);
  // The base: hidden on the board, but the mesh has to be closed.
  disc(bottomCrust, 0, 0, bunRadiusAt(0), segments, -1, () =>
    crustColour(0.02, new THREE.Color()),
  );
  // Baked rim band, then the crumb it rings.
  disc(
    bottomCrust,
    BUN.cutY - offset,
    crumbR,
    cutR,
    segments,
    1,
    (edge) => crustColour(edge ? 0.92 : 0.98, new THREE.Color()),
  );
  disc(
    bottomCrumb,
    BUN.cutY - offset,
    0,
    crumbR,
    segments,
    1,
    (edge) => new THREE.Color().copy(CRUMB_CENTRE).lerp(CRUMB_RIM, edge * 0.85),
  );

  /* ----------------------------------------------------------------- top -- */
  const topCrust = createAcc();
  const topCrumb = createAcc();
  revolve(topCrust, BUN.cutY, BUN.height, latitudes, segments);
  disc(
    topCrust,
    BUN.cutY + offset,
    crumbR,
    cutR,
    segments,
    -1,
    (edge) => crustColour(edge ? 0.92 : 0.98, new THREE.Color()),
  );
  disc(
    topCrumb,
    BUN.cutY + offset,
    0,
    crumbR,
    segments,
    -1,
    (edge) => new THREE.Color().copy(CRUMB_CENTRE).lerp(CRUMB_RIM, edge * 0.85),
  );

  return {
    bottom: toGeometry(bottomCrust, bottomCrumb),
    top: toGeometry(topCrust, topCrumb),
  };
}

export type BunMaterials = {
  crust: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
  crumb: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
};

/**
 * Golden crust and pale crumb.
 *
 * The crust reuses the loaf's material — same sheen, same clearcoat, same
 * height-driven grain — so a bun and a loaf from this bakery look like they came
 * out of the same oven. The crumb reuses the loaf's canvas crumb map and bump,
 * tinted by vertex colour toward the warmer tone a bun's interior actually has.
 */
export function createBunMaterials({
  physical,
  crustTexture,
  crumbTexture,
  crumbBump,
}: {
  physical: boolean;
  crustTexture: THREE.Texture | null;
  crumbTexture: THREE.Texture | null;
  crumbBump: THREE.Texture | null;
}): BunMaterials {
  const crust = physical
    ? createCrustMaterial(crustTexture)
    : new THREE.MeshStandardMaterial({
        vertexColors: true,
        ...(crustTexture ? { map: crustTexture, bumpMap: crustTexture } : {}),
        bumpScale: 0.03,
        roughness: 0.74,
        metalness: 0,
        envMapIntensity: 0.4,
        // Transparent from the start: the packaging hand-off fades it out, and
        // flipping `transparent` later forces a shader recompile mid-scroll.
        transparent: true,
        opacity: 1,
      });

  const crumbCommon = {
    vertexColors: true as const,
    ...(crumbTexture ? { map: crumbTexture } : {}),
    ...(crumbBump ? { bumpMap: crumbBump } : {}),
    bumpScale: 0.014,
    roughness: 0.96,
    metalness: 0,
    envMapIntensity: 0.28,
    transparent: true,
    opacity: 1,
  };

  const crumb = physical
    ? new THREE.MeshPhysicalMaterial({
        ...crumbCommon,
        sheen: 0.55,
        sheenColor: new THREE.Color("#fff7ea"),
        sheenRoughness: 0.95,
      })
    : new THREE.MeshStandardMaterial(crumbCommon);

  return { crust, crumb };
}
