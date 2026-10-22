"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

type LegacyMql = {
  addListener?: (cb: () => void) => void;
  removeListener?: (cb: () => void) => void;
};

/**
 * Subscribe to a media query across browser generations.
 *
 * `MediaQueryList.addEventListener` only landed in Safari 14. On older iOS the
 * only API is the deprecated `addListener`/`removeListener`, so calling
 * `addEventListener` there throws `TypeError: ... is not a function`. That throw
 * happens in a React passive effect, which routes it to the nearest error
 * boundary — and this hook is used by `BreadChapter`, which is *outside*
 * `StageBoundary`, so it reached the route boundary and replaced the whole page
 * with the error screen. Desktop browsers have supported the modern form for
 * years, which is why it only ever failed on the phone.
 */
export function addMediaListener(
  mql: MediaQueryList,
  callback: () => void,
): () => void {
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  }

  const legacy = mql as unknown as LegacyMql;
  if (typeof legacy.addListener === "function") {
    legacy.addListener(callback);
    return () => legacy.removeListener?.(callback);
  }

  // No subscription API at all: the value is still read once via getSnapshot,
  // the preference just will not update live. Better than throwing.
  return () => {};
}

/** Reads the preference, tolerating browsers without `matchMedia`. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (typeof window.matchMedia !== "function") return false;
    return window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  try {
    if (typeof window.matchMedia !== "function") return () => {};
    return addMediaListener(window.matchMedia(QUERY), callback);
  } catch {
    return () => {};
  }
}

function getSnapshot() {
  return prefersReducedMotion();
}

function getServerSnapshot() {
  return false;
}

/**
 * Live `prefers-reduced-motion` value. Server/first paint assumes motion is
 * allowed; the real preference is applied immediately after hydration.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
