"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import StageFallback from "@/components/three/StageFallback";
import DiagnosticOverlay from "@/components/site/DiagnosticOverlay";
import { reportError } from "@/lib/diagnostics";

type Props = {
  children: ReactNode;
  /**
   * What to show instead when the scene dies.
   *
   * The boundary cannot pick the right still on its own: the bread chapter's
   * loaf is the wrong product in the buns chapter, so the caller supplies it.
   */
  fallback?: ReactNode;
};

type State = {
  message: string | null;
};

/**
 * A boundary around the 3D stage only.
 *
 * React also routes errors thrown inside `useEffect` to the nearest boundary, so
 * this catches scene-setup failures that `LoafStage`'s own try/catch cannot —
 * a throw during the very first frame, or in a WebGL event callback. Without it
 * those take down the whole route: captions, header, footer and all. With it the
 * film degrades to `StageFallback` and the rest of the chapter is untouched.
 */
export default class StageBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      message:
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "the 3D scene could not start",
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Console for the tethered case, and the on-screen report for the phone.
    console.error("[KV Delight] 3D stage failed, showing still:", error, info);
    reportError("react:stage-boundary", error, info.componentStack ?? undefined);
  }

  render() {
    if (this.state.message !== null) {
      return (
        <>
          {this.props.fallback ?? <StageFallback reason={this.state.message} />}
          {/* Only visible with ?diag=1 — the phone-readable crash report. */}
          <DiagnosticOverlay />
        </>
      );
    }
    return this.props.children;
  }
}
