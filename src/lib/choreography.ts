/**
 * Scroll choreography for the bread chapter.
 *
 * One source of truth, read by both the DOM side (BreadChapter captions and
 * packaging hand-off) and the WebGL side (LoafStage), so a caption can never
 * drift out of sync with the geometry.
 *
 * Scene map (chapter progress `p`, 0 → 1):
 *
 *   0.00 → 0.15   A · whole loaf, hero turn
 *   0.15 → 0.42   B · the knife: nine cross-cuts, one per seam
 *   0.42 → 0.60   C · the slices let go, one seam at a time
 *   0.58 → 0.74   D · the spread, then a still hold to 0.82
 *   0.82 → 0.90   E · slices reassemble and leave, the pack arrives
 *   0.86 → 1.00   E · packaged hero, caption
 */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** GLSL-style smoothstep(edge0, edge1, x). */
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
};

export const easeInOut = (t: number) => t * t * (3 - 2 * t);

/** 0 → 1 → 0 bell across a caption window, with soft shoulders. */
export const bell = (p: number, a: number, b: number, fade = 0.045) =>
  Math.max(
    0,
    Math.min(
      clamp01((p - a) / fade),
      1 - clamp01((p - (b - fade)) / fade),
    ),
  );

export type Beat = {
  index: string;
  kicker: string;
  title: string;
  body: string;
  window: readonly [number, number];
};

/** In-stage captions. The sealed-pack caption is handled separately. */
export const BEATS: Beat[] = [
  {
    index: "01",
    kicker: "Whole loaf",
    title: "One loaf,\nwhole and warm",
    body:
      "Out of the tin and into the light. Keep scrolling — one loaf comes apart, slice by slice, in front of you.",
    window: [-0.5, 0.145],
  },
  {
    index: "02",
    kicker: "The cut",
    title: "Nine clean\ncross-cuts",
    body:
      "A serrated blade finds the grain. Each pass opens a seam you could not see from the outside.",
    window: [0.168, 0.4],
  },
  {
    index: "03",
    kicker: "Slices",
    title: "Soft white,\ngolden crust",
    body:
      "The crumb is pale and open; the crust stays thin, warm and deeply baked at the edges.",
    window: [0.425, 0.585],
  },
  {
    index: "04",
    kicker: "The spread",
    title: "Every slice\nin its place",
    body:
      "Held apart for a moment — the full cut of the loaf, crust to crumb, before it goes back to the pack.",
    window: [0.605, 0.795],
  },
];

export const TIMELINE = {
  cutStart: 0.15,
  cutEnd: 0.42,
  separateStart: 0.42,
  separateEnd: 0.6,
  spreadStart: 0.58,
  spreadEnd: 0.74,
  holdEnd: 0.82,
  regroupStart: 0.82,
  regroupEnd: 0.9,
  packIn: 0.86,
  packInEnd: 0.95,
  packCopy: 0.9,
  packCopyEnd: 0.975,
} as const;

/**
 * How far neighbouring slabs interpenetrate while their seam is still uncut, in
 * loaf units (the loaf is 4.5 long). Purely to kill the hairline gap between two
 * flush closed meshes; it is not a visual gap and never reads as one.
 */
export const SEAM_OVERLAP = 0.006;

export const SLICE_COUNT = 10;
export const SEAM_COUNT = SLICE_COUNT - 1;

/* ------------------------------------------------------------------ knife -- */

export type KnifePose = {
  visible: boolean;
  /** Which seam (0 … SEAM_COUNT-1) the blade is cutting. */
  station: number;
  /** 0 → 1 travel from `station` to `station + 1`, only while the blade is clear. */
  travel: number;
  /** 0 = above the loaf, 1 = down through it and touching the board. */
  plunge: number;
  /** Scroll-driven saw wobble, −1 … 1. */
  saw: number;
};

const HIDDEN: KnifePose = {
  visible: false,
  station: 0,
  travel: 0,
  plunge: 0,
  saw: 0,
};

/**
 * The blade spends one slice of the cutting phase on each seam: it drops in,
 * saws through, lifts clear, whips to the next seam. Because the whole phase is
 * scroll-driven, slow scrolling shows each cut individually.
 */
export function knifePose(p: number): KnifePose {
  const { cutStart, cutEnd } = TIMELINE;
  if (p <= cutStart - 0.002 || p >= cutEnd) return HIDDEN;

  const t = clamp01((p - cutStart) / (cutEnd - cutStart)) * SEAM_COUNT;
  const station = Math.min(SEAM_COUNT - 1, Math.floor(t));
  const local = clamp01(t - station);

  const plunge =
    smoothstep(0.08, 0.56, local) * (1 - smoothstep(0.62, 0.84, local));
  const travel =
    station >= SEAM_COUNT - 1 ? 0 : smoothstep(0.84, 1, local);
  const last = station === SEAM_COUNT - 1;

  return {
    visible: !(last && local > 0.96),
    station,
    travel,
    plunge,
    saw: Math.sin(plunge * Math.PI * 11) * (1 - Math.abs(plunge - 0.5) * 1.4),
  };
}

/** Per-seam cut completion, 0 → 1, staggered left to right. */
export function seamOpenness(p: number): number[] {
  const { cutStart, cutEnd } = TIMELINE;
  const span = cutEnd - cutStart;
  const step = span / SEAM_COUNT;
  const out: number[] = new Array(SEAM_COUNT);
  for (let i = 0; i < SEAM_COUNT; i++) {
    const t0 = cutStart + i * step;
    // matches the blade's plunge ramp above
    out[i] = smoothstep(t0 + step * 0.08, t0 + step * 0.56, p);
  }
  return out;
}

/** Per-seam widening, 0 → 1, staggered during scene C. */
export function seamWidening(p: number): number[] {
  const { separateStart, separateEnd } = TIMELINE;
  const span = separateEnd - separateStart;
  const stagger = (span * 0.55) / Math.max(1, SEAM_COUNT - 1);
  const dur = Math.max(span * 0.4, span - stagger * (SEAM_COUNT - 1));
  const out: number[] = new Array(SEAM_COUNT);
  for (let i = 0; i < SEAM_COUNT; i++) {
    const t0 = separateStart + i * stagger;
    out[i] = smoothstep(t0, t0 + dur, p);
  }
  return out;
}

/**
 * Gap, in loaf units, between slice i and slice i+1.
 * Three stacked layers: the hairline the blade leaves, the staggered letting-go
 * of scene C, and the wide spread of scene D. All of it collapses in scene E.
 */
export function seamGaps(p: number, spreadScale = 1): number[] {
  const open = seamOpenness(p);
  const widen = seamWidening(p);
  const spread = smoothstep(TIMELINE.spreadStart, TIMELINE.spreadEnd, p);
  const regroup = smoothstep(TIMELINE.regroupStart, TIMELINE.regroupEnd, p);
  const out: number[] = new Array(SEAM_COUNT);
  for (let i = 0; i < SEAM_COUNT; i++) {
    // Seams nearer the ends of the loaf open a little wider, so the finished
    // arrangement reads as a fan rather than an even stack.
    const txSeam = ((i + 1) / SEAM_COUNT) * 2 - 1;
    const weight = 1 + 0.35 * (Math.abs(txSeam) / 0.8);

    const base = (0.028 * open[i] + 0.085 * widen[i]) * weight;
    const fan = 0.14 * spread * widen[i] * weight * spreadScale;
    // Every seam is an interface between two closed slabs, and two edges that
    // merely touch still rasterise as a hairline of background. While a seam is
    // uncut the slabs are therefore pushed *into* each other by a hair, so the
    // loaf is one continuous crust until the blade gets there. The overlap is
    // 0.006 loaf units — well under a pixel on a phone — and it collapses to
    // zero the moment that seam opens (`open[i]` → 1).
    const closed = -SEAM_OVERLAP * (1 - open[i]);
    out[i] = (base + fan) * (1 - regroup) + closed;
  }
  return out;
}
