import * as THREE from "three";
import { fbm } from "@/lib/loaf";

/**
 * Canvas-generated crumb textures — no external images, same approach the crust
 * grain already used. Drawn once at build time and disposed with the stage.
 */

const CREAM = "#f4e7cd";
const PORE = "#cfb489";
const FLECK = "#8d6c3f";

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  return { c, ctx };
}

/** Pale, open bread crumb: mottling, airy pores, a little bran. */
export function createCrumbTexture(size = 512): THREE.CanvasTexture {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, size, size);

  // Wide, soft mottling so the crumb is never a flat fill.
  const img = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n =
        fbm(x * 0.012, y * 0.012, 3.1, 3) * 0.055 +
        fbm(x * 0.05, y * 0.05, 8.2, 2) * 0.03;
      img.data[i] = THREE.MathUtils.clamp(img.data[i] * (1 + n), 0, 255);
      img.data[i + 1] = THREE.MathUtils.clamp(img.data[i + 1] * (1 + n), 0, 255);
      img.data[i + 2] = THREE.MathUtils.clamp(img.data[i + 2] * (1 + n * 1.1), 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);

  // Airy pores, smallest first so the big pockets sit on top.
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  for (let i = 0; i < 2400; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 0.4 + Math.pow(rnd(), 2.2) * 2.6;
    ctx.globalAlpha = 0.06 + rnd() * 0.2;
    ctx.fillStyle = PORE;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.8 + rnd() * 0.5), rnd() * 3.14, 0, 6.283);
    ctx.fill();
    // a lighter lip on one side sells the depth
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = "#fffaf0";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.5, r * 0.4, 0, 0, 6.283);
    ctx.fill();
  }

  // Bigger air pockets.
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 3 + rnd() * 7;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(176,148,101,0.34)");
    g.addColorStop(0.65, "rgba(196,168,120,0.16)");
    g.addColorStop(1, "rgba(196,168,120,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.283);
    ctx.fill();
  }

  // Bran flecks.
  for (let i = 0; i < 500; i++) {
    ctx.globalAlpha = 0.1 + rnd() * 0.22;
    ctx.fillStyle = FLECK;
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillRect(x, y, 0.7 + rnd() * 1.4, 0.7 + rnd() * 1.2);
  }

  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Matching height map: pores recessed, crumb domed between them. */
export function createCrumbBump(size = 512): THREE.CanvasTexture {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#b9b9b9";
  ctx.fillRect(0, 0, size, size);

  let seed = 90210;
  const rnd = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  for (let i = 0; i < 2600; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 0.5 + Math.pow(rnd(), 2.4) * 3.2;
    ctx.globalAlpha = 0.25 + rnd() * 0.45;
    ctx.fillStyle = "#5a5a5a";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.85, rnd() * 3.14, 0, 6.283);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Fine metallic grain for the blade, so it is not a perfect mirror. */
export function createBladeTexture(size = 256): THREE.CanvasTexture {
  const { c, ctx } = canvas(size);
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, "#e8ebef");
  g.addColorStop(0.45, "#c3c9d1");
  g.addColorStop(0.75, "#dde2e8");
  g.addColorStop(1, "#aeb5be");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // horizontal grind lines
  for (let y = 0; y < size; y += 1) {
    ctx.globalAlpha = 0.05 + (Math.sin(y * 1.7) * 0.5 + 0.5) * 0.07;
    ctx.fillStyle = y % 3 === 0 ? "#ffffff" : "#8f959d";
    ctx.fillRect(0, y, size, 1);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
