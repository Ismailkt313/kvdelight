"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  createCrustMaterial,
  createCrustTexture,
  createShadowTexture,
} from "@/lib/loaf";
import { createSliceGeometries, LOAF } from "@/lib/slices";
import { createKnife } from "@/lib/knife";
import {
  createBladeTexture,
  createCrumbBump,
  createCrumbTexture,
} from "@/lib/breadTextures";
import { smoothstep } from "@/lib/choreography";
import {
  BASE_Y,
  baseView,
  captionShift,
  cameraFor,
  frameWidthFraction,
  knifeTransform,
  layoutSlices,
  yawAt,
} from "@/lib/sliceLayout";
import {
  clampTextureSize,
  readCapabilities,
  safe2d,
  webgl2Supported,
} from "@/lib/webgl";
import {
  SAFE,
  detectQualityTier,
  pixelRatioFor,
  settingsFor,
  type QualitySettings,
  type QualityTier,
} from "@/lib/quality";
import {
  note,
  reportError,
  reportGl,
  reportShader,
} from "@/lib/diagnostics";
import StageFallback from "@/components/three/StageFallback";

type LoafStageProps = {
  /** Scroll progress of the bread chapter, 0 → 1. Mutated by ScrollTrigger. */
  progressRef: React.MutableRefObject<number>;
  /** True when the chapter is on screen — otherwise the loop is skipped. */
  active: boolean;
  reducedMotion?: boolean;
  /** "auto" resolves the tier from the device, on the client only. */
  quality?: QualityTier | "auto";
  onReady?: () => void;
};

const FOV = 34;

type EnvResult = { texture: THREE.Texture | null; disposed: () => void };

/**
 * Warm studio environment from a canvas gradient — no HDR download.
 *
 * Returns null instead of throwing. `PMREMGenerator` renders into a half-float
 * target, which is the most likely thing to fail on an older mobile GPU; when it
 * does, the scene keeps its direct lights and simply loses the environment
 * reflection, rather than losing the whole page.
 */
function buildEnvironment(renderer: THREE.WebGLRenderer): EnvResult {
  const noop = () => {};
  let tex: THREE.CanvasTexture | null = null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 128;
    const ctx = safe2d(canvas);
    if (!ctx) return { texture: null, disposed: noop };

    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "#fff3dd");
    g.addColorStop(0.42, "#e8c898");
    g.addColorStop(0.6, "#6d4a2a");
    g.addColorStop(1, "#241508");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 128);

    tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose();

    return {
      texture: env,
      disposed: () => {
        env.dispose();
        tex?.dispose();
      },
    };
  } catch (error) {
    console.warn("[KV Delight] environment map unavailable:", error);
    tex?.dispose();
    return { texture: null, disposed: noop };
  }
}

/**
 * Builds the whole scene and returns a teardown function.
 *
 * Everything that can fail is allowed to throw out of here; the caller catches
 * it, swaps in the still image, and — crucially — this function disposes
 * whatever it had already built before rethrowing. Nothing partial is leaked.
 */
function createBreadScene({
  host,
  progressRef,
  reducedMotion,
  settings,
  onReady,
  onFail,
  activeRef,
}: {
  host: HTMLDivElement;
  progressRef: React.MutableRefObject<number>;
  activeRef: React.MutableRefObject<boolean>;
  reducedMotion: boolean;
  settings: QualitySettings;
  onReady: () => void;
  onFail: (reason: string) => void;
}): () => void {
  const disposers: Array<() => void> = [];
  const track = (dispose: () => void) => disposers.push(dispose);

  let renderer: THREE.WebGLRenderer | null = null;

  const teardown = () => {
    for (let i = disposers.length - 1; i >= 0; i--) {
      try {
        disposers[i]();
      } catch {
        /* a failed dispose must not mask the original error */
      }
    }
    if (renderer) {
      try {
        renderer.dispose();
        if (renderer.domElement.parentNode === host) {
          host.removeChild(renderer.domElement);
        }
      } catch {
        /* ignore */
      }
    }
  };

  try {
    /* ------------------------------------------------------------ renderer -- */
    const canvas = document.createElement("canvas");
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: settings.antialias,
      alpha: true,
      powerPreference: settings.tier === "low" ? "default" : "high-performance",
      // Never let the browser silently fall back to a software rasteriser: a
      // 1 fps film is worse than a still.
      failIfMajorPerformanceCaveat: false,
    });

    const gl = renderer;
    note("stage", `renderer created (tier=${settings.tier})`);

    // Surface shader compile/link failures instead of three's silent console
    // warning: on iOS these are a common cause of a blank-but-alive scene, and
    // they are captured here so they appear in the on-screen report.
    gl.debug.checkShaderErrors = true;
    gl.debug.onShaderError = (ctx, program, vertexShader, fragmentShader) => {
      const log = (shader: WebGLShader | null) =>
        shader ? ctx.getShaderInfoLog(shader) ?? "" : "";
      const detail = [
        `program: ${ctx.getProgramInfoLog(program) ?? ""}`.trim(),
        `vertex: ${log(vertexShader)}`.trim(),
        `fragment: ${log(fragmentShader)}`.trim(),
      ].join(" | ");
      reportShader("shader", "shader compile/link failed", detail.slice(0, 1200));
    };

    const caps = readCapabilities(gl);
    if (caps.notes.length) {
      console.info("[KV Delight] WebGL notes:", caps.notes.join("; "));
      note("capabilities", caps.notes.join("; "));
    }
    note(
      "capabilities",
      `maxTexture=${caps.maxTextureSize} floatRT=${caps.floatRenderTarget}`,
    );

    gl.setPixelRatio(pixelRatioFor(settings));
    gl.setSize(host.clientWidth, host.clientHeight, false);
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.domElement.style.width = "100%";
    gl.domElement.style.height = "100%";
    gl.domElement.style.display = "block";
    host.appendChild(gl.domElement);

    /* ------------------------------------------------- context-loss safety -- */
    const onContextLost = (event: Event) => {
      event.preventDefault();
      console.warn("[KV Delight] WebGL context lost");
      note("context", "webglcontextlost — the GPU reclaimed the context");
      onFail("the graphics context was lost");
    };
    gl.domElement.addEventListener("webglcontextlost", onContextLost, false);
    track(() => gl.domElement.removeEventListener("webglcontextlost", onContextLost));

    // A shader program can also fail on the very first frame; report once.
    let runtimeFailureReported = false;
    const reportRuntime = (where: string, error: unknown) => {
      if (runtimeFailureReported) return;
      runtimeFailureReported = true;
      reportError(`runtime:${where}`, error, `tier=${settings.tier}`);
      onFail(error instanceof Error ? error.message : String(error));
    };

    /* ------------------------------------------------------------- scene --- */
    const scene = new THREE.Scene();

    // Only build an environment map when the GPU can do a half-float target,
    // and only on the high tier — it is the most expensive one-off cost here.
    const wantsEnv = settings.environmentMap && caps.floatRenderTarget;
    if (!settings.environmentMap) {
      note("environment", "skipped: tier disables it");
    } else if (!caps.floatRenderTarget) {
      note("environment", "skipped: no half-float render target");
    }

    const env = wantsEnv
      ? buildEnvironment(gl)
      : { texture: null, disposed: () => {} };
    note("environment", env.texture ? "built" : "not available (direct lights only)");
    if (env.texture) {
      scene.environment = env.texture;
      scene.environmentIntensity = 0.7;
    }
    track(() => env.disposed());

    const camera = new THREE.PerspectiveCamera(
      FOV,
      Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
      0.1,
      100,
    );
    let view = baseViewSafe(camera.aspect);

    /* ------------------------------------------------------------ lights -- */
    // Ordered, so the low tier can take a prefix and simply drop the rest.
    const lights: THREE.Light[] = [
      (() => {
        const key = new THREE.DirectionalLight("#ffe1b4", 3.4);
        key.position.set(-4.6, 6.8, 5.0);
        return key;
      })(),
      (() => {
        const rim = new THREE.DirectionalLight("#ffc484", 2.6);
        rim.position.set(5.0, 2.6, -5.4);
        return rim;
      })(),
      (() => {
        const frontFill = new THREE.DirectionalLight("#ffe6c6", 0.85);
        frontFill.position.set(0.6, 1.6, 6.5);
        return frontFill;
      })(),
      (() => {
        const crumbKey = new THREE.DirectionalLight("#fff2dc", 1.15);
        crumbKey.position.set(0.3, 1.1, 6.8);
        return crumbKey;
      })(),
      (() => {
        const bounce = new THREE.DirectionalLight("#8a5626", 0.7);
        bounce.position.set(1.5, -3.5, 3.0);
        return bounce;
      })(),
      (() => {
        const crumbBack = new THREE.DirectionalLight("#ffe0b4", 0.55);
        crumbBack.position.set(-0.6, 0.7, -6.2);
        return crumbBack;
      })(),
    ];

    for (const light of lights.slice(0, settings.extraLights)) scene.add(light);

    scene.add(new THREE.AmbientLight("#ffe9cf", wantsEnv ? 0.28 : 0.42));
    scene.add(new THREE.HemisphereLight("#fff1da", "#22140a", wantsEnv ? 0.5 : 0.62));

    /* ------------------------------------------------------------- world --- */
    const world = new THREE.Group();
    scene.add(world);

    const loafGroup = new THREE.Group();
    loafGroup.position.y = BASE_Y;
    world.add(loafGroup);

    /* -------------------------------------------------------- slice meshes -- */
    const { slices } = createSliceGeometries({
      ringSegments: settings.ringSegments,
      arcSteps: settings.arcSteps,
    });
    note(
      "geometry",
      `${slices.length} slabs @ ${settings.ringSegments}×${settings.arcSteps}`,
    );
    for (const slice of slices) track(() => slice.geometry.dispose());

    const maxTex = clampTextureSize(settings.crustTexture, caps.maxTextureSize);

    const crustTex = createCrustTexture(maxTex);
    note("textures", `crust ${crustTex ? "ok" : "unavailable (no 2D context)"}`);
    if (crustTex) track(() => crustTex.dispose());

    const crustMat = settings.physicalMaterials
      ? createCrustMaterial(crustTex)
      : new THREE.MeshStandardMaterial({
          vertexColors: true,
          ...(crustTex ? { map: crustTex, bumpMap: crustTex } : {}),
          bumpScale: 0.042,
          roughness: 0.72,
          metalness: 0,
          envMapIntensity: 0.55,
          transparent: true,
          opacity: 1,
        });
    crustMat.transparent = false;
    crustMat.needsUpdate = true;
    track(() => crustMat.dispose());

    const crumbSize = clampTextureSize(settings.crumbTexture, caps.maxTextureSize);
    const crumbTex = createCrumbTexture(crumbSize);
    const crumbBump = createCrumbBump(crumbSize);
    if (crumbTex) track(() => crumbTex.dispose());
    if (crumbBump) track(() => crumbBump.dispose());

    const crumbCommon = {
      vertexColors: true as const,
      ...(crumbTex ? { map: crumbTex } : {}),
      ...(crumbBump ? { bumpMap: crumbBump } : {}),
      bumpScale: 0.018,
      roughness: 0.84,
      metalness: 0,
      envMapIntensity: 0.4,
      // Opaque for the whole film: transparency would drop all ten slabs into
      // the sorted transparent pass and let them show through one another.
      transparent: false,
      opacity: 1,
    };
    const crumbMat = settings.physicalMaterials
      ? new THREE.MeshPhysicalMaterial({
          ...crumbCommon,
          sheen: 0.3,
          sheenColor: new THREE.Color("#fff1d8"),
          sheenRoughness: 0.9,
        })
      : new THREE.MeshStandardMaterial(crumbCommon);
    track(() => crumbMat.dispose());

    const meshes: THREE.Mesh[] = slices.map((slice) => {
      const mesh = new THREE.Mesh(slice.geometry, [crustMat, crumbMat]);
      loafGroup.add(mesh);
      return mesh;
    });

    /* -------------------------------------------------------------- knife -- */
    const bladeTex = createBladeTexture(
      clampTextureSize(settings.bladeTexture, caps.maxTextureSize),
    );
    if (bladeTex) track(() => bladeTex.dispose());


    const knife = createKnife(bladeTex);
    track(() => knife.dispose());

    const knifePivot = new THREE.Group();
    knifePivot.add(knife.group);
    knife.group.rotation.y = -Math.PI / 2; // length runs along world Z
    knifePivot.visible = false;
    world.add(knifePivot);

    /* ------------------------------------------------------ contact shadow -- */
    const shadowTex = createShadowTexture(
      clampTextureSize(settings.shadowTexture, caps.maxTextureSize),
    );
    if (shadowTex) track(() => shadowTex.dispose());

    const shadowMat = new THREE.MeshBasicMaterial({
      ...(shadowTex ? { map: shadowTex } : {}),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    track(() => shadowMat.dispose());

    if (!settings.anisotropy) {
      for (const tex of [crustTex, crumbTex, crumbBump, bladeTex, shadowTex]) {
        if (tex) tex.anisotropy = 1;
      }
    }

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
    track(() => shadow.geometry.dispose());
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = BASE_Y - 0.008;
    shadow.scale.set(7.4, 3.1, 1);
    world.add(shadow);

    let spreadScale = view.spreadScale;
    let fit = 1;
    let lastP = -1;

    const applySlices = (p: number) => {
      const layout = layoutSlices(p, spreadScale);
      for (let i = 0; i < meshes.length; i++) {
        const t = layout.transforms[i];
        meshes[i].position.set(t.x, t.y, t.z);
        meshes[i].rotation.set(t.rx, t.ry, t.rz);
      }
      return layout.width;
    };

    /* -------------------------------------------------------- choreography -- */
    const applyKnife = (p: number) => {
      const k = knifeTransform(p);
      knifePivot.visible = k.visible;
      if (!k.visible) return;
      knifePivot.position.set(k.x, k.y, k.z);
      // Spine tips forward into the cut; the edge stays in the seam plane.
      knifePivot.rotation.set(k.rx, 0, 0.03 * (k.rx / -0.16 || 0));
    };

    const fadeMaterials = [
      crustMat,
      crumbMat,
      knife.bladeMaterial,
      knife.handleMaterial,
    ];

    /**
     * The hand-off fade. Materials stay opaque for the whole film so the slabs
     * sort crisply, and only become transparent while the fade is actually
     * running. Both shader variants are compiled up front by `prewarm()`, so
     * flipping `transparent` here costs a program-cache lookup, not a recompile
     * — which is what used to hitch at the pack hand-off.
     */
    const setFade = (t: number) => {
      const transparent = t > 0.001;
      for (const mat of fadeMaterials) {
        if (mat.transparent !== transparent) {
          mat.transparent = transparent;
          mat.needsUpdate = true;
        }
        mat.opacity = 1 - t;
      }
    };

    const update = (p: number) => {
      const width = applySlices(p);
      world.rotation.y = yawAt(p);

      /* camera: a slow push through the cut, then up and over the fan */
      const cam = cameraFor(p, camera.aspect);
      camera.position.z = cam.camZ;
      camera.position.y = cam.camY;
      camera.lookAt(0, cam.lookY, 0);

      /* fit the arrangement, whatever its aspect */
      const dist = Math.max(2, camera.position.z);
      const halfH = Math.tan((FOV * Math.PI) / 180 / 2) * dist;
      const halfW = halfH * camera.aspect;
      const neededW = width / 2;
      const neededH = LOAF.height * 0.62 + 0.55;
      fit = Math.min(
        1.02,
        (halfW * frameWidthFraction(p, camera.aspect)) / Math.max(0.001, neededW),
        (halfH * 0.86) / neededH,
      );
      if (!Number.isFinite(fit) || fit <= 0) fit = 1;
      world.scale.setScalar(fit);

      // Sit clear of the left-hand caption on desktop, while the loaf is whole.
      world.position.x = captionShift(p, camera.aspect) * halfW;

      /* hand-off: the bread leaves, the pack arrives */
      const fade = smoothstep(0.845, 0.94, p);
      setFade(fade);
      loafGroup.position.y = BASE_Y + fade * 0.22;
      world.rotation.y += fade * 0.16;

      shadowMat.opacity = (1 - fade) * 0.8;
      shadow.scale.x = width + 1.4;

      applyKnife(p);
    };

    /**
     * Compile both shader variants once, before the first frame the visitor
     * scrolls into. Toggling `transparent` later is what used to cause a
     * visible hitch at the packaging hand-off (and on the way back up).
     */
    const prewarm = () => {
      for (const mat of fadeMaterials) {
        const wasTransparent = mat.transparent;
        mat.transparent = !wasTransparent;
        mat.needsUpdate = true;
        try {
          gl.compile(scene, camera);
        } catch {
          /* compiling is an optimisation, never a requirement */
        }
        mat.transparent = wasTransparent;
        mat.needsUpdate = true;
      }
    };

    /* ---------------------------------------------------------- parallax -- */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, ox: 0, oy: 0 };
    const onPointerMove = (e: PointerEvent) => {
      if (reducedMotion) return;
      const r = host.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    track(() => window.removeEventListener("pointermove", onPointerMove));

    /* ------------------------------------------------------------ resize -- */
    // Debounced to a frame: iOS fires resize continuously while the browser
    // chrome collapses, and an unguarded handler re-ran the whole update each
    // time, which is felt as stutter during a scroll.
    let resizeRaf = 0;
    const applyResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      gl.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = FOV;
      view = baseViewSafe(camera.aspect);
      spreadScale = view.spreadScale;
      camera.updateProjectionMatrix();
      lastP = -1;
    };
    const resize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(applyResize);
    };
    applyResize();

    // `ResizeObserver` is iOS 13.4+. Without it, fall back to window resize —
    // the scene still works, it just re-frames on orientation/viewport changes
    // rather than on every element resize.
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver === "function") {
      try {
        ro = new ResizeObserver(() => {
          try {
            resize();
          } catch (error) {
            reportRuntime("resize-observer", error);
          }
        });
        ro.observe(host);
      } catch (error) {
        reportError("capability:resize-observer", error);
        ro = undefined;
      }
    } else {
      note("capabilities", "no ResizeObserver — using window resize");
      window.addEventListener("resize", resize);
    }

    track(() => {
      ro?.disconnect();
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(resizeRaf);
    });

    /* -------------------------------------------------------------- loop -- */
    let raf = 0;
    let visible = true;
    // Same story: if the observer is missing the loop simply never pauses.
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "function") {
      try {
        io = new IntersectionObserver(
          ([entry]) => {
            try {
              visible = entry.isIntersecting;
            } catch (error) {
              reportRuntime("intersection-observer", error);
            }
          },
          { rootMargin: "10% 0px" },
        );
        io.observe(host);
      } catch (error) {
        reportError("capability:intersection-observer", error);
        io = undefined;
      }
    }
    track(() => io?.disconnect());

    if (reducedMotion) {
      update(0.34); // a still, three-quarter hero angle
      gl.render(scene, camera);
      onReady();
      return teardown;
    }

    let disposed = false;
    track(() => {
      disposed = true;
      cancelAnimationFrame(raf);
    });

    const tick = () => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      if (!visible || !activeRef.current) return;

      // A throw inside a rAF callback is invisible to React error boundaries,
      // so it has to be handled here: report it, fall back to the still, and
      // stop the loop rather than throwing sixty times a second.
      try {
        // Only touch the scene when the input actually moved: the loop still
        // runs (so pointer parallax stays alive) but the layout maths is skipped.
        const p = progressRef.current;
        if (p !== lastP) {
          update(p);
          lastP = p;
        }

        const cam = cameraFor(p, camera.aspect);
        pointer.ox += (pointer.x - pointer.ox) * 0.07;
        pointer.oy += (pointer.y - pointer.oy) * 0.07;
        camera.position.x = pointer.ox * 0.34;
        camera.position.y = cam.camY - pointer.oy * 0.2;
        camera.lookAt(0, cam.lookY, 0);

        gl.render(scene, camera);
      } catch (error) {
        disposed = true;
        cancelAnimationFrame(raf);
        reportRuntime("render-loop", error);
      }
    };

    prewarm();
    note("prewarm", "materials compiled");
    update(progressRef.current);
    lastP = progressRef.current;
    tick();
    note("stage", "first frame scheduled");
    onReady();

    return teardown;
  } catch (error) {
    teardown();
    throw error;
  }
}

/** `baseView` with a guard for a zero-size host (before first layout). */
function baseViewSafe(aspect: number) {
  return baseView(Number.isFinite(aspect) && aspect > 0 ? aspect : 1.5);
}

export default function LoafStage({
  progressRef,
  active,
  reducedMotion = false,
  quality = "auto",
  onReady,
}: LoafStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!webgl2Supported()) {
      setFailed("WebGL 2 is not available in this browser");
      return;
    }

    const tier: QualityTier =
      quality === "auto" ? detectQualityTier() : quality;

    // Progressive degradation: try the requested tier, then the last-resort
    // config. Most mobile failures are one optional feature (environment map,
    // physical materials, antialiasing) rather than "no WebGL at all", so
    // dropping a rung usually still leaves a working film instead of a still.
    const ladder: QualitySettings[] = [settingsFor(tier)];
    if (ladder[0].tier !== SAFE.tier) ladder.push(SAFE);

    let teardown: (() => void) | undefined;
    let cancelled = false;
    let lastError: unknown = null;

    for (const settings of ladder) {
      if (cancelled) break;
      try {
        teardown = createBreadScene({
          host,
          progressRef,
          activeRef,
          reducedMotion,
          settings,
          onReady: () => {
            if (!cancelled) onReady?.();
          },
          onFail: (reason) => {
            if (!cancelled) setFailed(reason);
          },
        });
        note("stage", `running at tier "${settings.tier}"`);
        break;
      } catch (error) {
        lastError = error;
        reportError(`stage-setup:${settings.tier}`, error, `tier=${settings.tier}`);
        console.error(
          `[KV Delight] bread stage failed at tier "${settings.tier}":`,
          error,
        );
        // `createBreadScene` disposes anything it built before throwing, so the
        // next rung starts from a clean canvas.
      }
    }

    if (!teardown) {
      // Every rung failed: show the supplied photograph, keep the page alive.
      reportGl("stage", "all quality tiers failed; showing the still");
      setFailed(
        lastError instanceof Error
          ? lastError.message
          : "the 3D scene could not start",
      );
      return;
    }

    return () => {
      cancelled = true;
      try {
        teardown?.();
      } catch (error) {
        console.warn("[KV Delight] bread stage teardown failed:", error);
        reportError("stage-teardown", error);
      }
    };
  }, [progressRef, reducedMotion, quality, onReady]);

  // A JS unhandled rejection must never take the route down with it.
  useEffect(() => {
    if (!failed) return;
    console.warn("[KV Delight] falling back to the still image:", failed);
  }, [failed]);

  return (
    <div className="absolute inset-0">
      {failed ? (
        <StageFallback reason={failed} />
      ) : (
        <div ref={hostRef} className="h-full w-full" aria-hidden="true" />
      )}
    </div>
  );
}
