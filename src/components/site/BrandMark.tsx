/**
 * The KV Delight crest.
 *
 * The supplied artwork is red, orange and white ink with **no plate of its
 * own** — the white behind it in `kv-delight-logo-reference.png` is the page it
 * was exported on, and its oval ring is an open arc, so there is nothing to key
 * out that would enclose it. What the brand does itself, in its own hero
 * photograph, is print the mark on a cream oval. So that is what this is: a
 * cream oval *behind* the untouched mark.
 *
 * Consequences, all of them deliberate:
 *   - no white rectangle, no drop shadow, no glow, no recolouring;
 *   - brand red sits on cream at 4.7:1 instead of 3.7:1 on ink, so the crest
 *     keeps its colour instead of going muddy on the dark page;
 *   - the transparent asset lets the cream read as the plate, so nothing is
 *     redrawn — the art is the supplied shapes, keyed from the reference and
 *     cut to its own bounding box (720 × 557, the artwork's 1.292 ratio).
 *
 * Size it by height; the width follows the ratio.
 */
export default function BrandMark({
  className = "h-10",
  priority = false,
}: {
  /** Height utility, e.g. `h-10 sm:h-12`. Width follows the ratio. */
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-[50%] bg-cream ${className}`}
      style={{ aspectRatio: "720 / 557" }}
    >
      <img
        src="/assets/brand/kv-delight-mark.webp"
        alt=""
        width={720}
        height={557}
        draggable={false}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className="h-[86%] w-auto"
      />
    </span>
  );
}
