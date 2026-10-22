/**
 * Device quality tier.
 *
 * The `low` path existed in `LoafStage` from the start but was never activated,
 * so every phone ran the desktop path: 512² procedurally generated textures,
 * 30×9 slab tessellation and `antialias: true`. An iPhone XS got the most
 * expensive configuration available. This decides the tier on the client, where
 * `window` exists, so nothing here can cause a hydration mismatch.
 */

export type QualityTier = "high" | "low";

/** Tier name including the fallback rung, for logging. */
export type AnyTier = QualityTier | "safe";

export type QualitySettings = {
  tier: AnyTier;
  /** Hard ceiling on devicePixelRatio. */
  maxPixelRatio: number;
  antialias: boolean;
  ringSegments: number;
  arcSteps: number;
  crustTexture: number;
  crumbTexture: number;
  bladeTexture: number;
  shadowTexture: number;
  /** PMREM environment map — the half-float render target path. */
  environmentMap: boolean;
  /** Number of lights to add beyond ambient/hemisphere. */
  extraLights: number;
  /** Physical (sheen/clearcoat) materials vs. plain standard ones. */
  physicalMaterials: boolean;
  /** Texture anisotropy — cheap, but the first thing to drop on weak GPUs. */
  anisotropy: boolean;
};

const HIGH: QualitySettings = {
  tier: "high",
  maxPixelRatio: 1.75,
  antialias: true,
  ringSegments: 30,
  arcSteps: 9,
  crustTexture: 512,
  crumbTexture: 512,
  bladeTexture: 256,
  shadowTexture: 256,
  environmentMap: true,
  extraLights: 6,
  physicalMaterials: true,
  anisotropy: true,
};

const LOW: QualitySettings = {
  tier: "low",
  maxPixelRatio: 1,
  antialias: false,
  ringSegments: 18,
  arcSteps: 5,
  crustTexture: 128,
  crumbTexture: 128,
  bladeTexture: 128,
  shadowTexture: 128,
  environmentMap: false,
  extraLights: 4,
  physicalMaterials: false,
  anisotropy: true,
};

/**
 * Last-resort configuration. Not offered as a tier: it is the rung the stage
 * drops to if the requested tier throws during setup. Everything optional is
 * off — no environment map, no physical materials, no antialiasing, no
 * anisotropy — so that a GPU which chokes on one feature still plays the film.
 */
export const SAFE: QualitySettings = {
  tier: "safe",
  maxPixelRatio: 1,
  antialias: false,
  ringSegments: 14,
  arcSteps: 4,
  crustTexture: 64,
  crumbTexture: 64,
  bladeTexture: 64,
  shadowTexture: 128,
  environmentMap: false,
  extraLights: 3,
  physicalMaterials: false,
  anisotropy: false,
};

export function settingsFor(tier: QualityTier): QualitySettings {
  return tier === "low" ? LOW : HIGH;
}

/**
 * Picks a tier from signals that are cheap and synchronous. Any single hit is
 * enough to drop to `low` — the tier only trades detail, never the animation,
 * so a false positive costs sharpness, not correctness.
 */
export function detectQualityTier(): QualityTier {
  if (typeof window === "undefined") return "high";

  try {
    const mq = (q: string) => window.matchMedia?.(q).matches ?? false;

    // Touch-first devices: iPhone, iPad, Android phones all report coarse.
    const coarse = mq("(pointer: coarse)");
    // Small viewport — the stage is a fraction of a phone screen either way.
    const narrow = mq("(max-width: 820px)") || window.innerWidth <= 820;
    // Weak CPU or low reported memory.
    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const weak = cores <= 4 || (typeof memory === "number" && memory <= 4);

    return coarse || narrow || weak ? "low" : "high";
  } catch {
    return "low";
  }
}

/** Highest pixel ratio to render at, given the tier and the device. */
export function pixelRatioFor(settings: QualitySettings): number {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.min(dpr, settings.maxPixelRatio);
}
