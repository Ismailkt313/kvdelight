"use client";

import { useEffect } from "react";
import DiagnosticOverlay from "@/components/site/DiagnosticOverlay";
import { describeEnvironment, installDiagnostics, note } from "@/lib/diagnostics";

/**
 * Installs the window-level diagnostics handlers as early as React will let us,
 * and renders the overlay when `?diag=1` is present. Mounted once from the root
 * layout; renders nothing in the normal case.
 */
export default function DiagnosticsBoot() {
  useEffect(() => {
    installDiagnostics();
    for (const line of describeEnvironment()) note("env", line);
  }, []);

  return <DiagnosticOverlay />;
}
