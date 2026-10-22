"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  BUN,
  BUN_FOV,
  TIMELINE,
  splitAt,
  squashAt,
  viewFor,
} from "@/lib/bunChoreography";
import { createBunGeometries, createBunMaterials } from "@/lib/bun";
import { createShadowTexture, getCrustTexture } from "@/lib/loaf";
import { createCrumbBump, createCrumbTexture } from "@/lib/breadTextures";
import { smoothstep } from "@/lib/choreography";
import {
  clampTextureSize,
  readCapabilities,
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
import { note, reportError, reportGl, reportShader } from "@/lib/diagnostics";
import StageFallback from "@/components/three/StageFallback";

type BunStageProps = {
  /** Scroll progress of the buns chapter, 0 → 1. Mutated by the DOM side. */
  progressRef: React.MutableRefObject<number>;
  active: boolean;
  reducedMotion?: boolean;
  quality?: QualityTier | "auto";
  onReady?: () => void;
};

/**
 * Builds the scene and returns a teardown.
 *
 * Everything that can fail is allowed to throw out of here; the caller catches
 * it, swaps in the still, and this function disposes whatever it had already
 * built before rethrowing. Nothing partial is leaked — the same contract as the
 * bread stage, and the reason a sandboxed or locked-down browser loses a scene
 * rather than a page.
 */
function createBunScene({
  host,
  progressRef,
  activeRef,
  reducedMotion,
  settings,
  onReady,
  onFail,
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
    });

    const gl = renderer;
    note("buns", `renderer created (tier=${settings.tier})`);

    gl.debug.checkShaderErrors = true;
    gl.debug.onShaderError = (ctx, program, vertexShader, fragmentShader) => {
      const log = (shader: WebGLShader | null) =>
        shader ? ctx.getShaderInfoLog(shader) ?? "" : "";
      const detail = [
        `program: ${ctx.getProgramInfoLog(program) ?? ""}`.trim(),
        `vertex: ${log(vertexShader)}`.trim(),
        `fragment: ${log(fragmentShader)}`.trim(),
      ].join(" | ");
      reportShader("buns", "shader compile/link failed", detail.slice(0, 1200));
    };

    const caps = readCapabilities(gl);
    if (caps.notes.length) note("buns:capabilities", caps.notes.join("; "));

    gl.setPixelRatio(pixelRatioFor(settings));
    gl.setSize(host.clientWidth, host.clientHeight, false);
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.domElement.style.width = "100%";
    gl.domElement.style.height = "100%";
    gl.domElement.style.display = "block";
    host.appendChild(gl.domElement);

    /* ------------------------------------------------- context-loss safety -- */
    const onContextLost = (event: Event) => {
      event.preventDefault();
      note("buns", "webglcontextlost — the GPU reclaimed the context");
      onFail("the graphics context was lost");
    };
    gl.domElement.addEventListener("webglcontextlost", onContextLost, false);
    track(() => gl.domElement.removeEventListener("webglcontextlost", onContextLost));

    let runtimeFailureReported = false;
    const reportRuntime = (where: string, error: unknown) => {
      if (runtimeFailureReported) return;
      runtimeFailureReported = true;
      reportError(`buns:runtime:${where}`, error, `tier=${settings.tier}`);
      onFail(error instanceof Error ? error.message : String(error));
    };

    /* ------------------------------------------------------------- scene --- */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      BUN_FOV,
      Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
      0.1,
      60,
    );

    /*
     * Lights, and the reason there is no environment map here.
     *
     * The bun is matte bread, not the loaf's glazed crust, and PMREM is the most
     * expensive one-off in the bread stage (a half-float render target). It buys
     * almost nothing on a soft roll, so it is skipped: this stage is direct
     * lights plus a warm hemisphere, which is also what keeps it cheap on a
     * phone. The `bounce` light from below is the one that matters — a bun lit
     * only from above loses its soft underside and reads as a dome.
     */
    const key = new THREE.DirectionalLight("#ffe3b8", 3.6);
    key.position.set(-3.4, 5.2, 4.2);
    const rim = new THREE.DirectionalLight("#ffb877", 2.6);
    rim.position.set(4.2, 2.4, -4.6);
    const fill = new THREE.DirectionalLight("#ffe8cc", 0.9);
    fill.position.set(0.4, 1.6, 5.4);
    const bounce = new THREE.DirectionalLight("#b87a3e", 1.15);
    bounce.position.set(0.3, -2.6, 2.8);
    const crumbLight = new THREE.DirectionalLight("#fff4e2", 0.8);
    crumbLight.position.set(-0.6, 1.2, -3.4);

    for (const light of [key, rim, fill, bounce, crumbLight].slice(
      0,
      settings.extraLights,
    )) {
      scene.add(light);
    }

    const ambient = new THREE.AmbientLight("#ffe9cf", 0.34);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight("#fff1da", "#241609", 0.55);
    scene.add(hemi);

    /* ------------------------------------------------------------- world --- */
    const world = new THREE.Group();
    scene.add(world);

    /** Press and turn live here; the halves keep their own transforms. */
    const bunGroup = new THREE.Group();
    world.add(bunGroup);

    /* ------------------------------------------------------------ geometry -- */
    const geometries = createBunGeometries({
      latitudes: settings.bunLatitudes,
      segments: settings.bunSegments,
    });
    track(() => geometries.top.dispose());
    track(() => geometries.bottom.dispose());

    const maxTex = caps.maxTextureSize;
    // Shared with the other two chapters, so the bake is generated once.
    const crustTex = getCrustTexture(clampTextureSize(settings.crustTexture, maxTex));
    const crumbTex = createCrumbTexture(
      clampTextureSize(settings.crumbTexture, maxTex),
    );
    const crumbBump = createCrumbBump(
      clampTextureSize(settings.crumbTexture, maxTex),
    );
    if (crumbTex) track(() => crumbTex.dispose());
    if (crumbBump) track(() => crumbBump.dispose());
    note(
      "buns:textures",
      `crust ${crustTex ? "ok" : "none"}, crumb ${crumbTex ? "ok" : "none"}`,
    );

    const materials = createBunMaterials({
      physical: settings.physicalMaterials,
      crustTexture: crustTex,
      crumbTexture: crumbTex,
      crumbBump,
    });
    track(() => materials.crust.dispose());
    track(() => materials.crumb.dispose());

    if (!settings.anisotropy) {
      for (const tex of [crustTex, crumbTex, crumbBump]) {
        if (tex) tex.anisotropy = 1;
      }
    }

    const materialsFor = [materials.crust, materials.crumb];

    /* ------------------------------------------------------------- halves -- */
    const bottom = new THREE.Mesh(geometries.bottom, materialsFor);
    bunGroup.add(bottom);

    // The top half pivots about the cut plane, so `bunBounds` and the stage
    // agree on where its corners are without either of them guessing.
    const topPivot = new THREE.Group();
    topPivot.position.set(0, BUN.cutY, 0);
    bunGroup.add(topPivot);
    const top = new THREE.Mesh(geometries.top, materialsFor);
    top.position.set(0, -BUN.cutY, 0);
    topPivot.add(top);

    note(
      "buns:geometry",
      `${settings.bunLatitudes}×${settings.bunSegments} per half`,
    );

    /* ------------------------------------------------------ contact shadow -- */
    const shadowTex = createShadowTexture(
      clampTextureSize(settings.shadowTexture, maxTex),
    );
    if (shadowTex) track(() => shadowTex.dispose());
    const shadowMat = new THREE.MeshBasicMaterial({
      ...(shadowTex ? { map: shadowTex } : {}),
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    track(() => shadowMat.dispose());
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
    track(() => shadow.geometry.dispose());
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    world.add(shadow);

    /* ------------------------------------------------------------ sizing --- */
    let lastP = -1;

    const applyResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      gl.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      lastP = -1;
    };

    let resizeRaf = 0;
    const resize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        try {
          applyResize();
        } catch (error) {
          reportRuntime("resize", error);
        }
      });
    };
    applyResize();

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver === "function") {
      try {
        ro = new ResizeObserver(resize);
        ro.observe(host);
      } catch (error) {
        reportError("buns:capability:resize-observer", error);
        ro = undefined;
      }
    } else {
      window.addEventListener("resize", resize);
    }
    track(() => {
      ro?.disconnect();
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(resizeRaf);
    });

    /* -------------------------------------------------------------- poses -- */
    /**
     * The whole film, as a function of scroll progress.
     *
     * Everything that moves is decided here and nowhere else, and every term
     * comes from `bunChoreography` — so the captions, the framing check and the
     * render all read the same numbers.
     */
    const update = (p: number) => {
      const view = viewFor(p, camera.aspect);
      const press = squashAt(p);
      const split = splitAt(p);

      bunGroup.scale.set(press.sxz, press.sy, press.sxz);
      bunGroup.rotation.y = view.yaw;

      // Sink the top half a hair into the bottom while the bun is closed: two
      // flush surfaces still rasterise a hairline between them, and a bun with a
      // visible equator before it has been touched is exactly the "pre-sliced"
      // tell the bread loaf had to lose.
      const closed = 0.008 * (1 - split.open);
      topPivot.position.set(0, BUN.cutY + split.lift - closed, -split.back);
      topPivot.rotation.x = split.tilt;

      /* camera */
      camera.position.set(0, view.camY, view.camZ);
      camera.lookAt(0, view.lookY, 0);

      /*
       * The bun arrives already lit, and warms from there.
       *
       * It used to start at 0.22 and climb, which — with the chapter's opening
       * black veil — meant the first fifth of the section was a dark, empty
       * screen. The hand-off from the bread pack is a scroll, not a cut, so the
       * bun has to be visible the moment its panel enters the viewport.
       */
      const light = 0.62 + 0.38 * smoothstep(0, TIMELINE.revealEnd, p);
      key.intensity = 3.6 * light;
      rim.intensity = (2.6 + 0.9 * (1 - light)) * light;
      fill.intensity = 0.9 * light;
      bounce.intensity = 1.15 * light;
      crumbLight.intensity = 0.8 * light;
      ambient.intensity = 0.34 * light;
      hemi.intensity = 0.55 * light;

      const arrive = smoothstep(0, 0.13, p);
      world.position.y = -0.12 * (1 - arrive);
      world.scale.setScalar(0.94 + 0.06 * arrive);

      /* contact shadow, following the bun's footprint */
      const width = BUN.radius * 2 * press.sxz;
      shadow.scale.set(width * 1.5, width * 1.2, 1);
      shadowMat.opacity = 0.72 * (0.25 + 0.75 * arrive);

      /* packaging hand-off */
      const pass = smoothstep(TIMELINE.packIn, TIMELINE.packInEnd, p);
      bunGroup.position.y = pass * 0.14;
      bunGroup.scale.multiplyScalar(1 - pass * 0.12);
      for (const mat of materialsFor) mat.opacity = (1 - pass) * (0.15 + 0.85 * arrive);
      shadowMat.opacity *= 1 - pass;
    };

    /* -------------------------------------------------------------- loop -- */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointerMove = (e: PointerEvent) => {
      if (reducedMotion) return;
      const r = host.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    track(() => window.removeEventListener("pointermove", onPointerMove));

    let visible = true;
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "function") {
      try {
        io = new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting;
          },
          { rootMargin: "10% 0px" },
        );
        io.observe(host);
      } catch (error) {
        reportError("buns:capability:intersection-observer", error);
        io = undefined;
      }
    }
    track(() => io?.disconnect());

    const compile = () => {
      try {
        gl.compile(scene, camera);
      } catch {
        /* compiling is an optimisation, never a requirement */
      }
    };

    if (reducedMotion) {
      // The open bun, both cut faces readable — the frame that says the most.
      update(0.62);
      gl.render(scene, camera);
      onReady();
      return teardown;
    }

    let disposed = false;
    let raf = 0;
    track(() => {
      disposed = true;
      cancelAnimationFrame(raf);
    });

    const tick = () => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      if (!visible || !activeRef.current) return;

      try {
        let needsRender = false;

        const p = progressRef.current;
        if (p !== lastP) {
          update(p);
          lastP = p;
          needsRender = true;
        }

        /*
         * Pointer parallax, and a reason to stop drawing.
         *
         * This stage sits on a sticky panel for ~4.8 screens, but the scene only
         * changes when the scroll does. Re-drawing a still frame at 60 fps would
         * hold the GPU awake through the whole chapter for nothing, so a frame is
         * only drawn when something actually moved; the easing below settles and
         * then the loop idles.
         */
        const bx = pointer.x;
        const by = pointer.y;
        pointer.x += (pointer.tx - pointer.x) * 0.06;
        pointer.y += (pointer.ty - pointer.y) * 0.06;
        const settled =
          Math.abs(pointer.tx - pointer.x) < 0.0005 &&
          Math.abs(pointer.ty - pointer.y) < 0.0005 &&
          Math.abs(pointer.x) < 0.0005 &&
          Math.abs(pointer.y) < 0.0005;
        if (settled) {
          pointer.x = 0;
          pointer.y = 0;
        }
        if (pointer.x !== bx || pointer.y !== by) {
          const view = viewFor(p, camera.aspect);
          camera.position.set(
            pointer.x * 0.18,
            view.camY - pointer.y * 0.12,
            view.camZ,
          );
          camera.lookAt(0, view.lookY, 0);
          needsRender = true;
        }

        if (needsRender) gl.render(scene, camera);
      } catch (error) {
        disposed = true;
        cancelAnimationFrame(raf);
        reportRuntime("render-loop", error);
      }
    };

    compile();
    update(progressRef.current);
    lastP = progressRef.current;
    tick();
    note("buns", "first frame scheduled");
    onReady();

    return teardown;
  } catch (error) {
    teardown();
    throw error;
  }
}

export default function BunStage({
  progressRef,
  active,
  reducedMotion = false,
  quality = "auto",
  onReady,
}: BunStageProps) {
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

    const tier: QualityTier = quality === "auto" ? detectQualityTier() : quality;

    // Progressive degradation, same ladder as the bread stage: most mobile
    // failures are one optional feature rather than "no WebGL at all".
    const ladder: QualitySettings[] = [settingsFor(tier)];
    if (ladder[0].tier !== SAFE.tier) ladder.push(SAFE);

    let teardown: (() => void) | undefined;
    let cancelled = false;
    let lastError: unknown = null;

    for (const settings of ladder) {
      if (cancelled) break;
      try {
        teardown = createBunScene({
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
        note("buns", `running at tier "${settings.tier}"`);
        break;
      } catch (error) {
        lastError = error;
        reportError(`buns:setup:${settings.tier}`, error, `tier=${settings.tier}`);
        console.error(`[KV Delight] bun stage failed at tier "${settings.tier}":`, error);
      }
    }

    if (!teardown) {
      reportGl("buns", "all quality tiers failed; showing the still");
      setFailed(
        lastError instanceof Error ? lastError.message : "the 3D scene could not start",
      );
      return;
    }

    return () => {
      cancelled = true;
      try {
        teardown?.();
      } catch (error) {
        reportError("buns:teardown", error);
      }
    };
  }, [progressRef, reducedMotion, quality, onReady]);

  return (
    <div className="absolute inset-0">
      {failed ? (
        <StageFallback
          reason={failed}
          src="/assets/brand/packaging-buns-8pack.webp"
          alt="KV Delight soft buns, eight in a clear film pack."
          width={1536}
          height={1024}
          subject="the same soft buns in their eight-pack"
        />
      ) : (
        <div ref={hostRef} className="h-full w-full" aria-hidden="true" />
      )}
    </div>
  );
}
