import type * as THREE from "three";

/**
 * WebGL capability detection and failure-tolerant context helpers.
 *
 * Deliberately *not* a pre-flight canvas that creates and discards a context:
 * iOS keeps a small, shared pool of WebGL contexts, and spending one on a probe
 * is how you make a phone worse before you have drawn anything. The guarded
 * renderer construction in `LoafStage` is the real test; this module only does
 * the free checks and the capability reads that need an existing renderer.
 */

export type GLCapabilities = {
  /** WebGL2 is available at all. three r170 requires it. */
  supported: boolean;
  maxTextureSize: number;
  /**
   * Can the GPU render into a half-float target? `PMREMGenerator` needs one for
   * the environment map, and this is the single most likely thing to throw or
   * misbehave on an older iPhone GPU. When false we skip the environment map
   * rather than risk the scene.
   */
  floatRenderTarget: boolean;
  /** Why support is partial, for logging. Empty when everything is available. */
  notes: string[];
};

/** Free check — touches no GPU resources. */
export function webgl2Supported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof WebGL2RenderingContext !== "undefined";
  } catch {
    return false;
  }
}

/** Reads capabilities from an already-constructed renderer, defensively. */
export function readCapabilities(renderer: THREE.WebGLRenderer): GLCapabilities {
  const notes: string[] = [];
  let maxTextureSize = 2048;
  let floatRenderTarget = false;

  try {
    const gl = renderer.getContext() as WebGL2RenderingContext;

    const reported = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (typeof reported === "number" && reported > 0) maxTextureSize = reported;

    const ext = gl.getExtension("EXT_color_buffer_float")
      ? true
      : Boolean(gl.getExtension("EXT_color_buffer_half_float"));
    floatRenderTarget = ext;
    if (!ext) notes.push("no half-float render target (environment map skipped)");
  } catch (error) {
    notes.push(`capability read failed: ${String(error)}`);
  }

  // three's own extension helper is the more reliable answer when available.
  try {
    const viaThree =
      renderer.extensions.has("EXT_color_buffer_float") ||
      renderer.extensions.has("EXT_color_buffer_half_float");
    if (viaThree) {
      floatRenderTarget = true;
      const i = notes.findIndex((n) => n.startsWith("no half-float"));
      if (i >= 0) notes.splice(i, 1);
    }
  } catch {
    /* keep whatever the raw context said */
  }

  return {
    supported: true,
    maxTextureSize,
    floatRenderTarget,
    notes,
  };
}

/**
 * A 2D context or `null` — never a non-null assertion. iOS Safari returns `null`
 * from `getContext("2d")` under memory pressure, and the `!` that used to be
 * here turned that into `TypeError: null is not an object` on the next call,
 * which is exactly the kind of throw that reached the React error boundary.
 */
export function safe2d(
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D | null {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return ctx;
  } catch {
    return null;
  }
}

/** Largest square texture we can safely allocate for this device. */
export function clampTextureSize(size: number, max: number): number {
  if (!Number.isFinite(max) || max <= 0) return Math.min(size, 2048);
  return Math.min(size, max);
}
