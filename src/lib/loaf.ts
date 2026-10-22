import * as THREE from "three";

/**
 * Procedural KV Delight loaf.
 *
 * Everything here is generated in code — no model files, no photo textures.
 * The silhouette is a superellipsoid ("pillow box") deformed into a pan-baked
 * loaf: three crown humps along the length, slightly tucked ends, a flat base
 * where it met the tin, and fine irregular crust noise.
 */

export type LoafOptions = {
  length?: number;
  height?: number;
  width?: number;
  segments?: number;
};

/* ---------------------------------------------------------------- noise ---- */

function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

/** 3D value noise, roughly [-1, 1]. */
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const zf = smooth(z - zi);

  const c = (dx: number, dy: number, dz: number) =>
    hash(xi + dx, yi + dy, zi + dz);

  const x00 = c(0, 0, 0) + (c(1, 0, 0) - c(0, 0, 0)) * xf;
  const x10 = c(0, 1, 0) + (c(1, 1, 0) - c(0, 1, 0)) * xf;
  const x01 = c(0, 0, 1) + (c(1, 0, 1) - c(0, 0, 1)) * xf;
  const x11 = c(0, 1, 1) + (c(1, 1, 1) - c(0, 1, 1)) * xf;

  const y0 = x00 + (x10 - x00) * yf;
  const y1 = x01 + (x11 - x01) * yf;
  return (y0 + (y1 - y0) * zf) * 2 - 1;
}

function fbm(x: number, y: number, z: number, octaves = 3) {
  let amp = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise3(x, y, z) * amp;
    norm += amp;
    amp *= 0.5;
    x *= 2.03;
    y *= 2.01;
    z *= 1.97;
  }
  return sum / norm;
}

/* ------------------------------------------------------------- geometry ---- */

const signPow = (v: number, e: number) =>
  Math.sign(v) * Math.pow(Math.abs(v), e);

/**
 * Builds the loaf surface. Local axes: X = length, Y = height, Z = width.
 * Bottom of the loaf sits at y ≈ -height/2.
 */
export function createLoafGeometry({
  length = 4.5,
  height = 1.26,
  width = 1.58,
  segments = 200,
}: LoafOptions = {}): THREE.BufferGeometry {
  const A = length / 2;
  const B = height / 2;
  const C = width / 2;

  // Cross-section squareness. Smaller = flatter walls / flatter top.
  const eVertical = 0.42; // y
  const eLength = 0.62; // x / z cross-section

  const cols = segments;
  const rows = Math.round(segments * 0.6);

  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const crustTop = new THREE.Color("#a9580f");
  const crustSide = new THREE.Color("#bd7a2b");
  const crustBottom = new THREE.Color("#e3c69a");
  const crease = new THREE.Color("#643005");
  const flour = new THREE.Color("#f6ead3");

  const col = new THREE.Color();

  for (let iv = 0; iv <= rows; iv++) {
    const v = -Math.PI / 2 + (iv / rows) * Math.PI;
    const cv = signPow(Math.cos(v), eVertical);
    const sv = signPow(Math.sin(v), eVertical);

    for (let iu = 0; iu < cols; iu++) {
      const u = -Math.PI + (iu / cols) * Math.PI * 2;
      const cu = signPow(Math.cos(u), eLength);
      const su = signPow(Math.sin(u), eLength);

      let x = A * cv * cu;
      let y = B * sv;
      let z = C * cv * su;

      const tx = x / A; // -1..1 along the length
      const ny = y / B; // -1..1 vertically

      /* --- barrel: the loaf bulges a touch through the middle ---------- */
      const barrel = 1 + 0.035 * (1 - tx * tx);
      z *= barrel;

      /* --- three crown humps along the top ----------------------------- */
      const crown = 0.5 + 0.5 * Math.cos(Math.PI * 3 * tx);
      const endFade = 1 - Math.pow(Math.min(1, Math.abs(tx)), 5);
      const crownMask = Math.pow(Math.max(0, ny), 1.6) * endFade;
      y += crown * 0.095 * crownMask * (height / 1.26);

      /* --- rounded pan ends: pull the very ends in slightly ------------- */
      const endTaper = 1 - Math.pow(Math.min(1, Math.abs(tx)), 10) * 0.05;
      y *= endTaper;

      /* --- crust irregularity (radial, so the silhouette stays true) ---- */
      const n =
        fbm(x * 2.1 + 11.3, y * 2.4 - 4.7, z * 2.2 + 8.1, 3) * 0.014 +
        fbm(x * 9.5 - 2.2, y * 9.1 + 3.3, z * 9.4 - 1.7, 2) * 0.0045;

      const endMask = 1 - Math.pow(Math.min(1, Math.abs(tx)), 7);
      const poleMask = 1 - Math.pow(Math.min(1, Math.abs(ny)), 12);
      const nm = n * endMask * poleMask;

      const len = Math.hypot(x / A, y / B, z / C) || 1;
      x += (x / A / len) * nm;
      y += (y / B / len) * nm;
      z += (z / C / len) * nm;

      positions.push(x, y + height / 2, z);
      uvs.push(iu / cols, iv / rows);

      /* --- crust colouring --------------------------------------------- */
      const upness = THREE.MathUtils.clamp((ny + 0.55) / 1.55, 0, 1);
      col.copy(crustBottom).lerp(
        crustSide,
        THREE.MathUtils.smoothstep(upness, 0.0, 0.5),
      );
      col.lerp(crustTop, THREE.MathUtils.smoothstep(upness, 0.4, 0.95));

      // The bake browns where the dough met the hot air, not where it met the tin.
      const valley = 1 - crown;
      col.lerp(crease, Math.pow(valley, 2.1) * crownMask * 0.5);

      // A pale tear line down the middle of each seam, like a real split crust.
      const seam = Math.pow(Math.max(0, valley), 9) * crownMask;
      col.lerp(flour, seam * 0.22);

      const tint = fbm(x * 4.3, y * 4.1, z * 4.4, 3);
      col.offsetHSL(0, 0, tint * 0.07);

      const mottle = fbm(x * 22.0 - 3, y * 21.0 + 7, z * 22.0, 2);
      col.offsetHSL(0, 0, mottle * 0.05);

      const dust = Math.max(0, fbm(x * 14.1 + 5, y * 13.7, z * 14.3 - 9, 2));
      col.lerp(flour, Math.pow(dust, 2.4) * 0.28 * crownMask);

      colors.push(col.r, col.g, col.b);
    }
  }

  for (let iv = 0; iv < rows; iv++) {
    for (let iu = 0; iu < cols; iu++) {
      const a = iv * cols + iu;
      const b = iv * cols + ((iu + 1) % cols);
      const c = (iv + 1) * cols + iu;
      const d = (iv + 1) * cols + ((iu + 1) % cols);
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

/* -------------------------------------------------------------- textures ---- */

/** Canvas-generated crust grain: fine crumb pores, no external images. */
export function createCrustTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // tileable-ish detail: grain + sparse pitting
      const grain = fbm(x * 0.09, y * 0.09, 1.7, 3) * 0.08;
      const pore = Math.pow(Math.max(0, fbm(x * 0.28, y * 0.28, 9.4, 2)), 3) * 0.22;
      const v = THREE.MathUtils.clamp(0.93 + grain - pore, 0.4, 1) * 255;
      img.data[i] = v;
      img.data[i + 1] = v * 0.985;
      img.data[i + 2] = v * 0.955;
      img.data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Soft contact shadow under the loaf (alpha only). */
export function createShadowTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.04,
    size / 2,
    size / 2,
    size * 0.5,
  );
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.45, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "destination-in";
  const mask = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.1,
    size / 2,
    size / 2,
    size * 0.5,
  );
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Crust material — matte, slightly waxy, vertex-coloured. */
export function createCrustMaterial(grain: THREE.Texture) {
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    map: grain,
    bumpMap: grain,
    bumpScale: 0.042,
    roughness: 0.72,
    metalness: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.85,
    sheen: 0.25,
    sheenColor: new THREE.Color("#ffd7a0"),
    sheenRoughness: 0.8,
    envMapIntensity: 0.55,
    // Transparent from the start so the scroll-driven fade-out actually takes
    // effect (changing `transparent` later needs a shader recompile).
    transparent: true,
    opacity: 1,
  });
}
