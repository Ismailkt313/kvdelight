"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import StageFallback from "@/components/three/StageFallback";

type Props = {
  children: ReactNode;
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
    // Keep the detail in the console for debugging, off the visible page.
    console.error("[KV Delight] 3D stage failed, showing still:", error, info);
  }

  render() {
    if (this.state.message !== null) {
      return <StageFallback reason={this.state.message} />;
    }
    return this.props.children;
  }
}
