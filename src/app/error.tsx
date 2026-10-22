"use client";

import { useEffect } from "react";
import DiagnosticOverlay from "@/components/site/DiagnosticOverlay";
import { reportError } from "@/lib/diagnostics";

/**
 * Route-level error boundary.
 *
 * Next.js App Router's default is the bare "Application error: a client-side
 * exception has occurred" screen — which is exactly what an iPhone XS was
 * showing. This replaces it with the supplied brand art plus a clear message and
 * a retry, so a failure never leaves a blank page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[KV Delight] route error:", error);
    reportError("react:route-boundary", error, `digest=${error.digest ?? "none"}`);
  }, [error]);

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5">
      {/* The report that used to be missing: the real exception and its stack,
          readable on the device that failed. */}
      <DiagnosticOverlay force />
      <img
        src="/assets/product/bread-hero-scene.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_40%,rgba(42,26,13,0.55),rgba(12,7,3,0.96))]" />

      <div className="relative z-10 max-w-md text-center">
        <p className="eyebrow">KV Delight</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">
          The film took a wrong turn
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-cream-dim">
          Something failed while loading this page. Reloading usually clears it —
          the bread is still where you left it.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 rounded-sm border border-cream/25 px-5 py-2.5 text-[0.62rem] uppercase tracking-[0.28em] text-cream transition-colors hover:border-gold hover:text-gold"
        >
          Try again
        </button>
        <p className="mt-5 text-[0.6rem] leading-relaxed text-cream/40">
          Error: {error.message || "unknown"}
          {error.digest ? ` · ${error.digest}` : ""}
        </p>
      </div>
    </main>
  );
}
