/**
 * The non-WebGL stage.
 *
 * This is supplied brand photography, unchanged — no stock substitute. It is
 * what a visitor sees when WebGL is unavailable, blocked, or lost mid-session,
 * and it is deliberately the *only* thing that changes: the captions, the pack
 * hand-off, the header and the scroll choreography all keep working around it,
 * because they are DOM and live outside the 3D stage.
 *
 * The bread chapter's photograph is the default; the bun chapter passes its own
 * so both chapters can share the same grade and the same fallback behaviour.
 */
export default function StageFallback({
  reason,
  compact = false,
  src = "/assets/product/bread-hero-scene.webp",
  alt = "A freshly baked KV Delight loaf on a wooden board with flour, wheat and butter around it.",
  width = 1536,
  height = 1024,
  subject = "the same loaf",
}: {
  reason?: string;
  compact?: boolean;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  /** What is in the still, for the screen-reader note. */
  subject?: string;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={
          compact
            ? "h-full w-full object-cover"
            : "h-full w-full object-cover opacity-90"
        }
        // The stage sits under the captions; never let it steal a tap.
        draggable={false}
      />
      {/* Matches the cinematic grade of the live stage so the switch is quiet. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_38%,rgba(42,26,13,0.25)_0%,rgba(22,13,6,0.55)_55%,rgba(12,7,3,0.85)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />
      {reason ? (
        <p className="sr-only">
          The 3D film could not start on this device ({reason}), so a still of
          {subject} is shown instead. All captions still apply.
        </p>
      ) : null}
    </div>
  );
}
