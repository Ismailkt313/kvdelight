/**
 * Minimal, dependency-free DOM painting for the scroll choreography.
 *
 * WHY THIS EXISTS
 *
 * The chapter used `gsap.quickSetter(el, "scale")` and friends. GSAP's CSSPlugin
 * resolves the `scale` alias to the literal string `"scaleX,scaleY"`
 * (`CSSPlugin.js`, the alias map), and `quickSetter` applies that alias **without
 * the comma guard** that `getSetter` has. When the browser does not take GSAP's
 * CSS path it falls back to `_setterAttribute`, which calls
 * `element.setAttribute("scaleX,scaleY", value)`.
 *
 * A comma is not valid in a qualified attribute name, so WebKit throws
 * `InvalidCharacterError: Invalid qualified name: 'scaleX,scaleY'`. Chrome and
 * jsdom merely create a junk attribute, which is why this only ever crashed on
 * the phone. Reproduced against a real DOM before fixing.
 *
 * These writes touch `style` directly, so there is no alias lookup, no
 * per-node transform cache (the other documented GSAP gotcha), and nothing that
 * can throw on a browser quirk. They are also cheaper: no tween objects, no
 * plugin dispatch.
 */

export type PaintState = {
  /** 0 → 1. */
  opacity?: number;
  /** Vertical offset in px. */
  translateY?: number;
  /** Uniform scale. */
  scale?: number;
  /** Horizontal scale only (used by the floor shadow). */
  scaleX?: number;
  /**
   * Keep a `translateX(-50%)` in the transform. The floor shadow is centred with
   * a Tailwind `-translate-x-1/2` class, which an inline `transform` would
   * otherwise wipe out — shifting the shadow half its width to the right.
   */
  centreX?: boolean;
};

/** Trims float noise so the style string stays stable between frames. */
const n = (v: number) => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0);

/**
 * Applies a pose to an element. Never throws: a detached node, a node without a
 * `style` object, or a malformed value simply does nothing.
 */
export function paint(el: Element | null | undefined, s: PaintState): void {
  if (!el) return;

  const style = (el as HTMLElement).style as CSSStyleDeclaration | undefined;
  if (!style) return;

  try {
    if (s.opacity !== undefined) style.opacity = String(n(s.opacity));

    const parts: string[] = [];
    if (s.centreX) parts.push("translateX(-50%)");
    if (s.translateY !== undefined) {
      parts.push(`translate3d(0, ${n(s.translateY)}px, 0)`);
    }
    if (s.scale !== undefined) parts.push(`scale(${n(s.scale)})`);
    if (s.scaleX !== undefined) parts.push(`scaleX(${n(s.scaleX)})`);

    if (parts.length) style.transform = parts.join(" ");
  } catch {
    // A style write failing is not worth losing the film over.
  }
}
