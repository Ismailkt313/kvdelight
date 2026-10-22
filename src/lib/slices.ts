import * as THREE from "three";
import { fbm } from "@/lib/loaf";
import { SLICE_COUNT, smoothstep } from "@/lib/choreography";

/**
 * The sliced loaf.
 *
 * HOW THE SLICING WORKS — read this before changing anything.
 *
 * This is **pre-separated geometry, not runtime boolean cutting**. The loaf is
 * built once as ten independent closed slabs (`createSliceGeometries`): there is
 * no CSG, no clipping plane and no fracture solver. The knife pass is staged —
 * a seam's gap opens from a hairline to a visible crack exactly as the blade
 * reaches it, so the cut reads as continuous.
 *
 * Because every slab is closed geometry with its own crust rim and crumb face,
 * the loaf can be pulled apart in any direction and every newly exposed surface
 * is genuine geometry. That is why the separation in scenes C and D holds up
 * from any angle, and why it is honest to call this "pre-separated" rather than
 * "sliced at runtime".
 *
 * Geometry, per slab:
 *   - a crust shell swept along X: a rounded-rectangle cross-section in the
 *     (Y, Z) plane, lofted through `arcSteps + 1` sections;
 *   - two flat caps at x = xMin / xMax, each a crust rim band plus a crumb
 *     inset, so a cut face reads as pale crumb ringed by baked crust.
 *
 * One mesh, two material groups: 0 = crust, 1 = crumb.
 */

/** Loaf dimensions, in scene units. X = length, Y = height, Z = width. */
export const LOAF = {
  length: 4.5,
  height: 1.26,
  width: 1.58,
} as const;

const A = LOAF.length / 2;
const C = LOAF.width / 2;

/** Squircle exponent of the cross-section: lower = boxier, pan-baked. */
const PROFILE = 0.55;

const signPow = (v: number, e: number) =>
  Math.sign(v) * Math.pow(Math.abs(v), e);

/** Vertical extent of the loaf at normalised length `tx` ∈ [-1, 1]. */
export function envelopeAt(tx: number): { mid: number; half: number } {
  const atx = Math.min(1, Math.abs(tx));
  const barrel = 1 + 0.035 * (1 - tx * tx);
  // three crown humps along the length
  const crown = 0.5 + 0.5 * Math.cos(Math.PI * 3 * tx);
  const crownMask = 1 - Math.pow(atx, 5);
  const crownLift = crown * 0.095 * crownMask * (LOAF.height / 1.26);
  const endTaper = 1 - Math.pow(atx, 10) * 0.25;
  // Full height from the board to the crowned top.
  const top = LOAF.height * barrel * endTaper + crownLift;
  // Base sits at y = 0, so the cross-section straddles `top / 2`.
  return { mid: top / 2, half: top / 2 };
}

/** Cross-section point for normalised length `tx` and ring angle `theta`. */
function sectionPoint(tx: number, theta: number, out: THREE.Vector3) {
  const { mid, half } = envelopeAt(tx);
  const barrel = 1 + 0.035 * (1 - tx * tx);
  const cz = signPow(Math.cos(theta), PROFILE);
  const cy = signPow(Math.sin(theta), PROFILE);
  out.set(tx * A, mid + half * cy, C * barrel * cz);
  return out;
}

/**
 * The same section point plus the crust displacement — used by **both** the
 * shell and the cut-face rim. Sharing one function is what keeps the crust
 * shell and the cap rings coincident: if the cap used the undisplaced section,
 * every cut face would sit up to 0.014 units inside its own crust and show a
 * hairline crack along the rim.
 */
function crustPoint(tx: number, theta: number, out: THREE.Vector3) {
  sectionPoint(tx, theta, out);
  const { mid } = envelopeAt(tx);
  const cy = signPow(Math.sin(theta), PROFILE);
  const dy = out.y - mid;
  const dz = out.z;
  const len = Math.hypot(dy, dz) || 1;
  const nm = crustNoise(out.x, out.y, out.z, tx, cy);
  out.y += (dy / len) * nm;
  out.z += (dz / len) * nm;
  return out;
}

/** Outline of a cut face at `tx`, as [y, z] pairs. Used by the caps and tests. */
export function sliceOutline(tx: number, segments: number): [number, number][] {
  const out = new THREE.Vector3();
  const pts: [number, number][] = [];
  for (let r = 0; r < segments; r++) {
    crustPoint(tx, (r / segments) * Math.PI * 2, out);
    pts.push([out.y, out.z]);
  }
  return pts;
}

/** Outward crust displacement. Radial only, so a slab rim stays flat. */
function crustNoise(x: number, y: number, z: number, tx: number, cy: number) {
  const endMask = 1 - Math.pow(Math.min(1, Math.abs(tx)), 7);
  const poleMask = 1 - Math.pow(Math.min(1, Math.abs(cy)), 12);
  const n =
    fbm(x * 2.1 + 11.3, y * 2.4 - 4.7, z * 2.2 + 8.1, 3) * 0.014 +
    fbm(x * 9.5 - 2.2, y * 9.1 + 3.3, z * 9.4 - 1.7, 2) * 0.0045;
  return n * endMask * poleMask;
}

const CRUST_TOP = new THREE.Color("#a9580f");
const CRUST_SIDE = new THREE.Color("#bd7a2b");
const CRUST_BOTTOM = new THREE.Color("#e3c69a");
const CREASE = new THREE.Color("#643005");
const FLOUR = new THREE.Color("#f6ead3");
const CRUMB = new THREE.Color("#f4e7cd");
/** Cross-section of the crust: a thin baked line around the crumb. */
const CRUST_EDGE = new THREE.Color("#b8823f");

const col = new THREE.Color();
const p = new THREE.Vector3();

/**
 * Crust colour.
 *
 * Driven by **height up the loaf**, not by the surface normal. A squircle wall
 * is vertical, so a normal-driven ramp puts `ny ≈ 0` along the entire side and
 * floods the middle of the loaf with the pale "touched the tin" colour — which
 * is exactly the washed-out band this used to show. Baking browns with distance
 * from the board, so that is what the ramp follows: pale only where the dough
 * met the tin, golden up the walls, deep caramel across the crown.
 */
function crustColour(
  x: number,
  y: number,
  z: number,
  tx: number,
  out: THREE.Color,
) {
  const { mid, half } = envelopeAt(tx);
  const t = THREE.MathUtils.clamp((y - (mid - half)) / (2 * half || 1), 0, 1);

  out.copy(CRUST_BOTTOM).lerp(CRUST_SIDE, smoothstep(0.015, 0.2, t));
  out.lerp(CRUST_TOP, smoothstep(0.5, 0.97, t));

  // Creases and flour sit in the crown valleys, and only near the top.
  const crown = 0.5 + 0.5 * Math.cos(Math.PI * 3 * tx);
  const crownMask = 1 - Math.pow(Math.min(1, Math.abs(tx)), 5);
  const valley = 1 - crown;
  const topGate = smoothstep(0.55, 0.9, t);

  out.lerp(CREASE, Math.pow(valley, 2.4) * crownMask * 0.4 * topGate);
  out.lerp(FLOUR, Math.pow(Math.max(0, valley), 10) * crownMask * 0.1 * topGate);

  out.offsetHSL(0, 0, fbm(x * 4.3, y * 4.1, z * 4.4, 3) * 0.07);
  out.offsetHSL(0, 0, fbm(x * 22 - 3, y * 21 + 7, z * 22, 2) * 0.05);

  const dust = Math.max(0, fbm(x * 14.1 + 5, y * 13.7, z * 14.3 - 9, 2));
  out.lerp(FLOUR, Math.pow(dust, 2.4) * 0.16 * topGate);
  return out;
}

export type SliceGeometry = {
  /** Closed slab geometry, origin at the loaf centre, x = 0. */
  geometry: THREE.BufferGeometry;
  index: number;
  /** Normalised length bounds, -1 … 1. */
  txMin: number;
  txMax: number;
};

export type SlicedLoaf = {
  slices: SliceGeometry[];
  /** Lowest point of the loaf, so the stage can seat it on the floor. */
  floorY: number;
};

/** Fraction of the face kept as crust rim before the crumb inset starts. */
const RIM_KEEP = 0.93;

export function createSliceGeometries({
  count = SLICE_COUNT,
  ringSegments = 28,
  arcSteps = 8,
}: {
  count?: number;
  ringSegments?: number;
  arcSteps?: number;
} = {}): SlicedLoaf {
  const slices: SliceGeometry[] = [];
  let floorY = 0;

  const bounds: number[] = [];
  for (let i = 0; i <= count; i++) bounds.push((i / count) * 2 - 1);

  for (let s = 0; s < count; s++) {
    const txMin = bounds[s];
    const txMax = bounds[s + 1];
    const isEnd = s === 0 || s === count - 1;

    const positions: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    /* ------------------------------------------------------- crust shell -- */
    for (let i = 0; i <= arcSteps; i++) {
      const tx = txMin + ((txMax - txMin) * i) / arcSteps;

      for (let r = 0; r < ringSegments; r++) {
        const theta = (r / ringSegments) * Math.PI * 2;
        crustPoint(tx, theta, p);

        const x = p.x;
        const y = p.y;
        const z = p.z;

        positions.push(x, y, z);
        uvs.push((r / ringSegments) * 4, tx * 2);

        // approximate normal for colouring: the section's radial direction
        crustColour(x, y, z, tx, col);
        colors.push(col.r, col.g, col.b);

        if (y < floorY) floorY = y;
      }
    }

    for (let i = 0; i < arcSteps; i++) {
      for (let r = 0; r < ringSegments; r++) {
        const rn = (r + 1) % ringSegments;
        const a = i * ringSegments + r;
        const b = i * ringSegments + rn;
        const c = (i + 1) * ringSegments + r;
        const d = (i + 1) * ringSegments + rn;
        indices.push(a, c, b, b, c, d);
      }
    }
    const shellIndexEnd = indices.length;

    /* -------------------------------------------------------- cap faces --- */
    /**
     * A face at constant x. `outward` is the sign of its normal: +1 for the
     * face on the +X side of the slab, -1 for the -X side. End faces get crust
     * colouring; interior faces are crumb.
     */
    const buildCap = (tx: number, outward: number, crustFace: boolean) => {
      const startVertex = positions.length / 3;
      const tris: number[] = [];
      const { mid } = envelopeAt(tx);

      const rimY: number[] = [];
      const rimZ: number[] = [];
      const crumbY: number[] = [];
      const crumbZ: number[] = [];

      // Same displaced outline the crust shell ends on, so the cap seals flush
      // against it — no hairline crack along the rim of a cut face.
      const outline = sliceOutline(tx, ringSegments);
      for (let r = 0; r < ringSegments; r++) {
        const [ry, rz] = outline[r];
        rimY.push(ry);
        rimZ.push(rz);
        crumbY.push(mid + (ry - mid) * RIM_KEEP);
        crumbZ.push(rz * RIM_KEEP);
      }

      const centreY = crumbY.reduce((a, v) => a + v, 0) / ringSegments;
      const centreZ = crumbZ.reduce((a, v) => a + v, 0) / ringSegments;

      // centre vertex
      positions.push(tx * A, centreY, centreZ);
      uvs.push(0.5, 0.5);
      if (crustFace) {
        crustColour(tx * A, centreY, centreZ, tx, col);
        colors.push(col.r, col.g, col.b);
      } else {
        colors.push(CRUMB.r, CRUMB.g, CRUMB.b);
      }

      for (let r = 0; r < ringSegments; r++) {
        // rim vertex
        positions.push(tx * A, rimY[r], rimZ[r]);
        uvs.push(0.5 + rimZ[r] / LOAF.width, 0.5 + rimY[r] / LOAF.height);
        if (crustFace) {
          crustColour(tx * A, rimY[r], rimZ[r], tx, col);
          colors.push(col.r, col.g, col.b);
        } else {
          colors.push(CRUST_EDGE.r, CRUST_EDGE.g, CRUST_EDGE.b);
        }

        // crumb vertex
        positions.push(tx * A, crumbY[r], crumbZ[r]);
        uvs.push(0.5 + crumbZ[r] / LOAF.width, 0.5 + crumbY[r] / LOAF.height);
        colors.push(CRUMB.r, CRUMB.g, CRUMB.b);
      }

      const c0 = startVertex;
      const rimAt = (r: number) => startVertex + 1 + (r % ringSegments) * 2;
      const crumbAt = (r: number) => startVertex + 2 + (r % ringSegments) * 2;

      for (let r = 0; r < ringSegments; r++) {
        const n = (r + 1) % ringSegments;
        // crust rim band + inner fan, wound for a -X normal; flipped below
        // for +X. The fan must start at the crumb ring, not the rim ring —
        // a fan on the rim would cover the whole face a second time.
        tris.push(rimAt(r), crumbAt(r), crumbAt(n));
        tris.push(rimAt(r), crumbAt(n), rimAt(n));
        tris.push(c0, crumbAt(r), crumbAt(n));
      }

      if (outward > 0) {
        for (let i = 0; i < tris.length; i += 3) {
          const t = tris[i + 1];
          tris[i + 1] = tris[i + 2];
          tris[i + 2] = t;
        }
      }

      return tris;
    };

    /* ------------------------------------------------------------ order --- */
    // Emitted as: left cap, crust shell, right cap — so the group ranges stay
    // contiguous even when one cap is crust and the other is crumb.
    const capLeft = buildCap(txMin, -1, isEnd);
    const capRight = buildCap(txMax, 1, isEnd);

    const shellTris = indices.slice(0, shellIndexEnd);
    indices.length = 0;

    indices.push(...capLeft);
    const leftEnd = indices.length;

    indices.push(...shellTris);
    const shellEnd = indices.length;

    indices.push(...capRight);
    const rightEnd = indices.length;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    // group 0 = crust, group 1 = crumb
    let cursor = 0;
    const addRange = (to: number, material: number) => {
      if (to > cursor) geometry.addGroup(cursor, to - cursor, material);
      cursor = to;
    };
    if (isEnd) {
      // left cap is an end face only on the first slab
      addRange(leftEnd, s === 0 ? 0 : 1);
      addRange(shellEnd, 0);
      addRange(rightEnd, s === count - 1 ? 0 : 1);
    } else {
      addRange(leftEnd, 1);
      addRange(shellEnd, 0);
      addRange(rightEnd, 1);
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    if (geometry.boundingBox && geometry.boundingBox.min.y < floorY) {
      floorY = geometry.boundingBox.min.y;
    }

    slices.push({
      geometry,
      index: s,
      txMin,
      txMax,
    });
  }

  return { slices, floorY };
}
