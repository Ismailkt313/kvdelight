/**
 * Temporary diagnostics collector (safe to ship; silent unless requested).
 *
 * Purpose: the iPhone XS failure throws somewhere we cannot reproduce — no
 * device, no GPU — and the React error screen replaces the page, taking any
 * evidence with it. This records the exception, its stack, the component stack,
 * WebGL/shader errors and a breadcrumb trail of the scene-setup steps, and makes
 * them readable *on the phone*.
 *
 * Enable with `?diag=1` in the URL, or it appears automatically on the error
 * screens. Nothing here runs unless the page failed or diagnostics are asked for.
 */

export type DiagEntry = {
  at: number;
  kind: "error" | "note" | "shader" | "gl";
  scope: string;
  message: string;
  stack?: string;
  extra?: string;
};

const MAX_ENTRIES = 60;
const STORAGE_KEY = "kv-delight-diagnostics";

let entries: DiagEntry[] = [];
let installed = false;
let diagMode = false;
const listeners = new Set<() => void>();

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function push(entry: DiagEntry) {
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
  persist();
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* a broken listener must not break collection */
    }
  }
}

/** sessionStorage can throw in private mode — never let that matter. */
function persist() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

function restore() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as DiagEntry[];
    if (Array.isArray(parsed)) entries = parsed.slice(-MAX_ENTRIES);
  } catch {
    /* ignore */
  }
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: `${error.name}: ${error.message}`, stack: error.stack };
  }
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

export function reportError(scope: string, error: unknown, extra?: string) {
  const { message, stack } = describe(error);
  push({ at: now(), kind: "error", scope, message, stack, extra });
}

export function note(scope: string, message: string, extra?: string) {
  push({ at: now(), kind: "note", scope, message, extra });
}

export function reportShader(scope: string, message: string, extra?: string) {
  push({ at: now(), kind: "shader", scope, message, extra });
}

export function reportGl(scope: string, message: string, extra?: string) {
  push({ at: now(), kind: "gl", scope, message, extra });
}

/** Installs window-level handlers once. Errors here bypass React entirely. */
export function installDiagnostics() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  restore();

  window.addEventListener("error", (event) => {
    // Resource errors (a failed <img>) have no `error` object; record the target.
    const target = event.target as HTMLElement | null;
    if (!event.error && target && target !== (window as unknown as HTMLElement)) {
      push({
        at: now(),
        kind: "error",
        scope: "resource",
        message: `failed to load <${target.tagName?.toLowerCase()}> ${(target as HTMLImageElement).src ?? ""}`,
      });
      return;
    }
    reportError("window.error", event.error ?? event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError("unhandledrejection", event.reason);
  });
}

export function getEntries(): DiagEntry[] {
  return entries;
}

export function subscribeDiagnostics(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setDiagnosticMode(on: boolean) {
  diagMode = on;
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export function isDiagnosticMode() {
  if (typeof window === "undefined") return false;
  if (diagMode) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("diag") === "1" || params.get("debug") === "1") {
      diagMode = true;
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Everything an engineer needs, as plain text, for a one-tap copy. */
export function buildReport(): string {
  const env = describeEnvironment();
  const lines = [
    "KV Delight — client diagnostics",
    new Date().toISOString(),
    "",
    ...env,
    "",
    `--- ${entries.length} entries ---`,
    ...entries.map((e) => {
      const t = (e.at / 1000).toFixed(2);
      const head = `[${t}s] ${e.kind.toUpperCase()} ${e.scope}: ${e.message}`;
      return [head, e.extra ? `    ${e.extra}` : "", e.stack ? `    ${e.stack.replace(/\n/g, "\n    ")}` : ""]
        .filter(Boolean)
        .join("\n");
    }),
  ];
  return lines.join("\n");
}

export function describeEnvironment(): string[] {
  if (typeof window === "undefined") return [];
  const gl = (() => {
    try {
      const canvas = document.createElement("canvas");
      // This *does* cost one context; diagnostics only run on request or after
      // a failure, so that trade is acceptable here in a way it is not in the
      // render path.
      const ctx = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
      if (!ctx) return ["webgl2: unavailable"];
      const info: string[] = ["webgl2: available"];
      info.push(`MAX_TEXTURE_SIZE: ${ctx.getParameter(ctx.MAX_TEXTURE_SIZE)}`);
      info.push(`MAX_VERTEX_UNIFORM_VECTORS: ${ctx.getParameter(ctx.MAX_VERTEX_UNIFORM_VECTORS)}`);
      info.push(`MAX_FRAGMENT_UNIFORM_VECTORS: ${ctx.getParameter(ctx.MAX_FRAGMENT_UNIFORM_VECTORS)}`);
      info.push(`MAX_VARYING_VECTORS: ${ctx.getParameter(ctx.MAX_VARYING_VECTORS)}`);
      info.push(
        `EXT_color_buffer_float: ${ctx.getExtension("EXT_color_buffer_float") ? "yes" : "no"}`,
      );
      info.push(
        `EXT_color_buffer_half_float: ${ctx.getExtension("EXT_color_buffer_half_float") ? "yes" : "no"}`,
      );
      const dbg = ctx.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        info.push(`renderer: ${ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL)}`);
        info.push(`vendor: ${ctx.getParameter(dbg.UNMASKED_VENDOR_WEBGL)}`);
      }
      return info;
    } catch (error) {
      return [`webgl2 probe failed: ${String(error)}`];
    }
  })();

  return [
    `ua: ${navigator.userAgent}`,
    `viewport: ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
    `reduced-motion: ${window.matchMedia?.("(prefers-reduced-motion: reduce)").matches}`,
    `cores: ${navigator.hardwareConcurrency ?? "?"}`,
    `deviceMemory: ${(navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? "?"}`,
    ...gl,
  ];
}

export function clearDiagnostics() {
  entries = [];
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}
