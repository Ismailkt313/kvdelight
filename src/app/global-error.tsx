"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches failures in the root layout itself, where the
 * normal `error.tsx` cannot help. Must render its own `<html>` and `<body>`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[KV Delight] root error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          background: "#120b06",
          color: "#f7efe1",
          fontFamily: "Georgia, serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "#cbb9a0",
            }}
          >
            KV Delight
          </p>
          <h1 style={{ marginTop: "16px", fontSize: "2rem", fontWeight: 300 }}>
            The film took a wrong turn
          </h1>
          <p style={{ marginTop: "16px", fontSize: "0.875rem", lineHeight: 1.7, color: "#cbb9a0" }}>
            Something failed while loading the page. Reloading usually clears it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "28px",
              padding: "10px 20px",
              borderRadius: "2px",
              border: "1px solid rgba(247,239,225,0.25)",
              background: "transparent",
              color: "#f7efe1",
              fontSize: "0.62rem",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
