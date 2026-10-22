"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  buildReport,
  clearDiagnostics,
  getEntries,
  installDiagnostics,
  isDiagnosticMode,
  setDiagnosticMode,
  subscribeDiagnostics,
  type DiagEntry,
} from "@/lib/diagnostics";

/**
 * TEMPORARY on-screen diagnostics.
 *
 * Renders only when `?diag=1` is in the URL, or when `force` is set by an error
 * screen. It exists so a failing iPhone can be read without a tethered Mac:
 * every captured exception, its stack, shader errors and the setup breadcrumbs
 * appear as text, with a copy button for pasting into a message.
 */

// A stable subscription for useSyncExternalStore.
const emptySnapshot = "";

function useEntries(): DiagEntry[] {
  const [, force] = useState(0);
  useEffect(() => {
    installDiagnostics();
    const unsubscribe = subscribeDiagnostics(() => force((n) => n + 1));
    return () => {
      unsubscribe();
    };
  }, []);
  return getEntries();
}

export default function DiagnosticOverlay({
  force = false,
}: {
  force?: boolean;
}) {
  const entries = useEntries();
  const [copied, setCopied] = useState(false);
  const [closed, setClosed] = useState(false);

  // Keep the mode in sync so `isDiagnosticMode` reflects the URL on first paint.
  const enabled = useSyncExternalStore(
    subscribeDiagnostics,
    () => (isDiagnosticMode() ? "on" : "off"),
    () => emptySnapshot || "off",
  );

  const visible = !closed && (force || enabled === "on");

  const copy = useCallback(async () => {
    const text = buildReport();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API needs a secure context and a user gesture; if it is
      // refused, put the report somewhere the user can at least see it.
      try {
        window.prompt("Copy the report:", text.slice(0, 1800));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (enabled === "on") setDiagnosticMode(true);
  }, [enabled]);

  if (!visible) return null;

  const errors = entries.filter((e) => e.kind !== "note");

  return (
    <div
      role="region"
      aria-label="Diagnostics"
      style={{
        position: "fixed",
        inset: "0 0 auto 0",
        maxHeight: "78svh",
        overflowY: "auto",
        zIndex: 9999,
        background: "rgba(8,4,2,0.96)",
        color: "#f7efe1",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "11px",
        lineHeight: 1.45,
        padding: "10px 12px 14px",
        borderBottom: "1px solid rgba(230,180,92,0.5)",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <strong style={{ color: "#e6b45c", flex: 1, fontSize: 11 }}>
          KV diagnostics · {entries.length} entries · {errors.length} errors
        </strong>
        <button
          type="button"
          onClick={copy}
          style={{
            background: "#e6b45c",
            color: "#120b06",
            border: 0,
            borderRadius: 3,
            padding: "5px 9px",
            font: "inherit",
            fontWeight: 700,
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={() => {
            clearDiagnostics();
            setClosed(true);
          }}
          style={{
            background: "transparent",
            color: "#cbb9a0",
            border: "1px solid rgba(203,185,160,0.4)",
            borderRadius: 3,
            padding: "5px 9px",
            font: "inherit",
          }}
        >
          Clear
        </button>
      </div>

      {entries.length === 0 ? (
        <p style={{ color: "#cbb9a0", margin: 0 }}>
          Nothing captured yet. Scroll the bread chapter to reproduce.
        </p>
      ) : (
        <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {[...entries].reverse().map((e, i) => (
            <li
              key={`${e.at}-${i}`}
              style={{
                padding: "6px 0",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                color: e.kind === "note" ? "#a99b86" : "#ffd9d4",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <span style={{ color: "#e6b45c" }}>
                {(e.at / 1000).toFixed(2)}s {e.kind.toUpperCase()} {e.scope}
              </span>
              {" — "}
              {e.message}
              {e.extra ? <div style={{ color: "#cbb9a0" }}>{e.extra}</div> : null}
              {e.stack ? (
                <div style={{ color: "#8f8272", marginTop: 2 }}>
                  {e.stack.split("\n").slice(0, 8).join("\n")}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
