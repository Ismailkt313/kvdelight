"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  CREAM,
  CREAM_FOV,
  TIMELINE,
  clipXAt,
  creamLayerAt,
  cutAt,
  fillAt,
  nozzleAt,
  openAt,
  ROPE_Y,
  viewFor,
} from "@/lib/creamChoreography";
import {
  ROPE,
  SHELL,
  createCreamLayer,
  createCreamRope,
  createSectionFace,
  createShellGeometries,
} from "@/lib/creamBun";
import { createCrumbBump } from "@/lib/breadTextures";
import { createShadowTexture } from "@/lib/loaf";
import { smoothstep } from "@/lib/choreography";
import { readCapabilities, webgl2Supported } from "@/lib/webgl";
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

type CreamStageProps = {
  /** Scroll progress of the cream chapter, 0 → 1. Mutated by the DOM side. */
  progressRef: React.MutableRefObject<number>;
  active: boolean;
  reducedMotion?: boolean;
  quality?: QualityTier | "auto";
  onReady?: () => void;
};

/**
 * The cream bun, on screen.
 *
 * The product is a *long* roll: 2.3 : 1 in plan, split lengthwise, cream along
 * the seam. The geometry lives in `lib/creamBun` — this file only poses it.
 *
 * Five moves, all scroll-driven, all reversible:
 *
 *   1  the whole bun, three-quarter
 *   2  the lid hinges back along the long axis
 *   3  the nozzle runs the length, laying a rope of cream behind it
 *   4  the lid closes on the cream, the finished bun turns
 *   5  the near end is clipped away: the section, cream through the bread
 *
 * The halves are pre-separated meshes and the section is a clip plane plus a
 * built cap — there is no boolean cutting at run time, and the cream is tube
 * geometry revealed by a draw range, not a fluid simulation.
 */
function createCreamScene({
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
    note("cream", `renderer created (tier=${settings.tier})`);

    gl.debug.checkShaderErrors = true;
    gl.debug.onShaderError = (ctx, program, vertexShader, fragmentShader) => {
      const log = (shader: WebGLShader | null) =>
        shader ? ctx.getShaderInfoLog(shader) ?? "" : "";
      const detail = [
        `program: ${ctx.getProgramInfoLog(program) ?? ""}`.trim(),
        `vertex: ${log(vertexShader)}`.trim(),
        `fragment: ${log(fragmentShader)}`.trim(),
      ].join(" | ");
      reportShader("cream", "shader compile/link failed", detail.slice(0, 1200));
    };

    const caps = readCapabilities(gl);
    if (caps.notes.length) note("cream:capabilities", caps.notes.join("; "));

    gl.setPixelRatio(pixelRatioFor(settings));
    gl.setSize(host.clientWidth, host.clientHeight, false);
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.06;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.localClippingEnabled = true;
    gl.domElement.style.width = "100%";
    gl.domElement.style.height = "100%";
    gl.domElement.style.display = "block";
    host.appendChild(gl.domElement);

    /* ------------------------------------------------- context-loss safety -- */
    const onContextLost = (event: Event) => {
      event.preventDefault();
      note("cream", "webglcontextlost — the GPU reclaimed the context");
      onFail("the graphics context was lost");
    };
    gl.domElement.addEventListener("webglcontextlost", onContextLost, false);
    track(() => gl.domElement.removeEventListener("webglcontextlost", onContextLost));

    let runtimeFailureReported = false;
    const reportRuntime = (where: string, error: unknown) => {
      if (runtimeFailureReported) return;
      runtimeFailureReported = true;
      reportError(`cream:runtime:${where}`, error, `tier=${settings.tier}`);
      onFail(error instanceof Error ? error.message : String(error));
    };

    /* --------------------------------------------------------------- scene -- */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CREAM_FOV,
      Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
      0.1,
      60,
    );

    // The same warm rig as the other chapters, plus a low bounce that lifts the
    // crumb inside the opened bun — without it the interior reads as grey.
    const key = new THREE.DirectionalLight("#ffe3b8", 3.3);
    key.position.set(-3.4, 5.2, 4.2);
    const rim = new THREE.DirectionalLight("#ffb877", 2.2);
    rim.position.set(4.2, 2.4, -4.6);
    const fill = new THREE.DirectionalLight("#ffe8cc", 0.95);
    fill.position.set(0.4, 1.6, 5.4);
    const bounce = new THREE.DirectionalLight("#c98a52", 1.15);
    bounce.position.set(0.3, -2.6, 2.8);
    const crumbLight = new THREE.DirectionalLight("#fff4e2", 1.0);
    crumbLight.position.set(-0.8, 2.2, -2.4);
    const steelLight = new THREE.DirectionalLight("#eaf2ff", 1.2);
    steelLight.position.set(1.8, 4.6, 2.2);

    const rig = [key, rim, fill, bounce, crumbLight, steelLight];
    for (const light of rig.slice(0, Math.max(3, settings.extraLights))) scene.add(light);

    const ambient = new THREE.AmbientLight("#ffe9cf", 0.42);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight("#fff1da", "#2a1a0c", 0.62);
    scene.add(hemi);

    const world = new THREE.Group();
    scene.add(world);
    const bunGroup = new THREE.Group();
    world.add(bunGroup);

    /* ------------------------------------------------------------ geometry -- */
    const latitudes = Math.max(8, Math.round(settings.bunLatitudes * 0.6));
    const segments = settings.bunSegments;
    const geometries = createShellGeometries({ latitudes, segments });
    track(() => geometries.bottom.dispose());
    track(() => geometries.top.dispose());

    const rope = createCreamRope({
      stations: Math.max(28, Math.round(settings.bunSegments * 1.8)),
      segments: Math.max(8, Math.round(settings.bunSegments / 3.4)),
      radius: ROPE.radius,
    });
    track(() => rope.dispose());

    const layerGeom = createCreamLayer({ segments });
    track(() => layerGeom.dispose());

    const sectionGeom = createSectionFace({ x: 0 });
    track(() => sectionGeom.dispose());

    /* ----------------------------------------------------------- materials -- */
    /**
     * The knife plane. It is parked far outside the bun until the section beat,
     * so the same materials are used for the whole film and no shader ever has
     * to be rebuilt mid-scroll (a recompile is a dropped frame on a phone).
     */
    const knife = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1000);
    const clip = [knife];

    const crustMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.62,
      metalness: 0.02,
      transparent: true,
      clippingPlanes: clip,
      side: THREE.FrontSide,
    });
    const crumbBump = createCrumbBump(
      Math.min(settings.crumbTexture, caps.maxTextureSize),
    );
    if (crumbBump) track(() => crumbBump!.dispose());

    const crumbMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      ...(crumbBump ? { bumpMap: crumbBump, bumpScale: 0.35 } : {}),
      roughness: 0.96,
      metalness: 0,
      transparent: true,
      clippingPlanes: clip,
      side: THREE.DoubleSide,
    });
    const creamMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.4,
      metalness: 0.02,
      transparent: true,
      clippingPlanes: clip,
    });
    const sectionMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: "#c9ced6",
      metalness: 0.55,
      roughness: 0.3,
    });
    const streamMat = new THREE.MeshStandardMaterial({
      color: "#fffdf7",
      roughness: 0.45,
      transparent: true,
      opacity: 0.96,
    });

    for (const mat of [crustMat, crumbMat, creamMat, sectionMat, steelMat, streamMat]) {
      track(() => mat.dispose());
    }

    /* -------------------------------------------------------------- halves -- */
    const bottom = new THREE.Mesh(geometries.bottom, [crustMat, crumbMat]);
    bunGroup.add(bottom);

    const lidPivot = new THREE.Group();
    const pivotY = SHELL.cutY + SHELL.cream;
    const pivotZ = -SHELL.halfWidth * 0.92;
    lidPivot.position.set(0, pivotY, pivotZ);
    bunGroup.add(lidPivot);

    const lid = new THREE.Mesh(geometries.top, [crustMat, crumbMat]);
    // Put the lid's geometry back where it belongs, so the pivot alone decides
    // where it hinges.
    lid.position.set(0, -pivotY, -pivotZ);
    lidPivot.add(lid);

    const creamLayer = new THREE.Mesh(layerGeom, creamMat);
    bunGroup.add(creamLayer);

    const ropeMesh = new THREE.Mesh(rope, creamMat);
    bunGroup.add(ropeMesh);

    const section = new THREE.Mesh(sectionGeom, sectionMat);
    section.position.x = CREAM.cutX;
    section.visible = false;
    bunGroup.add(section);

    /* -------------------------------------------------------------- nozzle -- */
    const nozzle = new THREE.Group();
    // Sized to read on a phone: a real tip is ~15 % of the roll's width, and
    // at this framing anything smaller disappears into the crumb.
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.2, 20),
      steelMat,
    );
    collar.position.y = 0.32;
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.17, 0.3, 20, 1, true),
      steelMat,
    );
    cone.position.y = 0.1;
    // A rim at the tip: without it the cone's open end reads as a hole.
    const lip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.064, 0.062, 0.035, 20, 1, false),
      steelMat,
    );
    lip.position.y = -0.04;
    nozzle.add(collar, cone, lip);
    for (const mesh of [collar, cone, lip]) track(() => mesh.geometry.dispose());

    // The bead of cream at the tip: it rounds off the rope's cut leading edge,
    // so the strip looks extruded rather than clipped.
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(ROPE.radius * 1.04, 16, 12),
      creamMat,
    );
    track(() => bead.geometry.dispose());
    bead.visible = false;
    bunGroup.add(bead);
    nozzle.visible = false;
    bunGroup.add(nozzle);

    const stream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.05, 1, 12, 1, true),
      streamMat,
    );
    stream.visible = false;
    bunGroup.add(stream);
    track(() => stream.geometry.dispose());

    /* ------------------------------------------------------------- shadow -- */
    const shadowTex = createShadowTexture(
      Math.min(settings.shadowTexture, caps.maxTextureSize),
    );
    const shadowMat = new THREE.MeshBasicMaterial({
      ...(shadowTex ? { map: shadowTex } : {}),
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
    });
    track(() => shadowMat.dispose());
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
    track(() => shadow.geometry.dispose());
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    world.add(shadow);

    /* ------------------------------------------------------------- sizing -- */
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
        reportError("cream:capability:resize-observer", error);
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

    /* --------------------------------------------------------------- poses -- */
    const stationCount = (rope as unknown as { stations: number }).stations;
    const perStation = (rope as unknown as { perStation: number }).perStation;

    const update = (p: number) => {
      const view = viewFor(p, camera.aspect);
      const open = openAt(p);
      const filled = fillAt(p);
      const pipe = nozzleAt(p);
      const seam = creamLayerAt(p);
      const cut = cutAt(p);

      bunGroup.rotation.y = view.yaw;

      /* 1 + 2 · the lid: hinged about the long axis at the far edge */
      lidPivot.rotation.x = open.hinge;
      // While closed the two cut faces would sit exactly in one plane; sinking
      // the lid by a few thousandths keeps them from fighting for the pixel.
      lidPivot.position.y = pivotY - 0.004 * (1 - open.open);

      /* 3 · the rope, revealed station by station as the nozzle advances */
      const laid = Math.max(0, Math.min(1, filled));
      ropeMesh.visible = laid > 0.002;
      rope.setDrawRange(0, Math.ceil(laid * stationCount) * perStation);

      /* the cream layer at the seam, from the moment the lid starts down */
      creamLayer.visible = seam > 0.004;
      creamMat.opacity = 1;

      /* nozzle, and the cream leaving it */
      nozzle.visible = pipe.visible > 0.01;
      if (nozzle.visible) {
        nozzle.position.set(pipe.x, pipe.y, 0);
      }
      bead.visible = pipe.visible > 0.2 && laid > 0.002 && laid < 0.999;
      if (bead.visible) {
        bead.position.set(pipe.x, ROPE_Y - ROPE.radius * ROPE.flatten * 0.5, 0);
        bead.scale.setScalar(0.85 + 0.15 * pipe.visible);
      }

      const surface = ROPE_Y;
      const gap = pipe.y - surface;
      stream.visible = nozzle.visible && gap > 0.02;
      if (stream.visible) {
        stream.scale.set(1, gap, 1);
        stream.position.set(pipe.x, surface + gap / 2, 0);
      }

      /* 5 · the knife: clip the near end and show the built section */
      const clipOn = cut > 0.002;
      // The plane lives in world space, so it has to turn with the bun: the
      // cut is perpendicular to the long axis, not to the world X. The constant
      // is bun-space X because the normal is a unit vector along the axis.
      knife.normal.set(-Math.cos(view.yaw), 0, Math.sin(view.yaw));
      knife.constant = clipOn ? clipXAt(p) : 1000;
      section.visible = clipOn;
      sectionMat.opacity = smoothstep(0.35, 0.8, cut);

      /* camera */
      camera.position.set(0, view.camY, view.camZ);
      camera.lookAt(0, view.lookY, 0);

      /* light: arrives lit and warms a little through the reveal */
      const light = 0.68 + 0.32 * smoothstep(0, TIMELINE.revealEnd, p);
      key.intensity = 3.3 * light;
      rim.intensity = (2.2 + 0.7 * (1 - light)) * light;
      fill.intensity = 0.95 * light;
      bounce.intensity = 1.15 * light;
      crumbLight.intensity = 1.0 * light;
      steelLight.intensity = 1.2 * light;
      ambient.intensity = 0.42 * light;
      hemi.intensity = 0.62 * light;

      const arrive = smoothstep(0, 0.1, p);
      world.position.y = -0.08 * (1 - arrive);
      world.scale.setScalar(0.94 + 0.06 * arrive);

      /* contact shadow: long and narrow, to match the roll */
      shadow.scale.set(2.9, 1.5, 1);
      shadowMat.opacity = 0.58 * (0.35 + 0.65 * arrive);

      /* packaging hand-off: the bun leaves as the four-pack arrives */
      const pass = smoothstep(TIMELINE.packIn, TIMELINE.packInEnd, p);
      bunGroup.position.y = pass * 0.12;
      const fade = 1 - pass;
      // The first frame is a bun, not a ghost of one: the reveal only adds
      // light, so the shell starts at three-quarters opacity.
      crustMat.opacity = fade * (0.74 + 0.26 * arrive);
      crumbMat.opacity = fade * (0.74 + 0.26 * arrive);
      creamMat.opacity = fade;
      sectionMat.opacity *= fade;
      streamMat.opacity = 0.96 * fade;
      shadowMat.opacity *= fade;
    };

    /* ---------------------------------------------------------------- loop -- */
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
        reportError("cream:capability:intersection-observer", error);
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
      // The frame that says the most: open, half piped, nozzle in shot.
      update(0.42);
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
        const p = progressRef.current;
        // No pointer parallax here: this stage has enough moving parts, and a
        // still frame must be able to go idle so a phone can sleep.
        if (p !== lastP) {
          update(p);
          lastP = p;
          gl.render(scene, camera);
        }
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
    note("cream", "first frame scheduled");
    onReady();

    return teardown;
  } catch (error) {
    teardown();
    throw error;
  }
}

export default function CreamStage({
  progressRef,
  active,
  reducedMotion = false,
  quality = "auto",
  onReady,
}: CreamStageProps) {
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
    const ladder: QualitySettings[] = [settingsFor(tier)];
    if (ladder[0].tier !== SAFE.tier) ladder.push(SAFE);

    let teardown: (() => void) | undefined;
    let cancelled = false;
    let lastError: unknown = null;

    for (const settings of ladder) {
      if (cancelled) break;
      try {
        teardown = createCreamScene({
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
        note("cream", `running at tier "${settings.tier}"`);
        break;
      } catch (error) {
        lastError = error;
        reportError(`cream:setup:${settings.tier}`, error, `tier=${settings.tier}`);
        console.error(`[KV Delight] cream stage failed at tier "${settings.tier}":`, error);
      }
    }

    if (!teardown) {
      reportGl("cream", "all quality tiers failed; showing the still");
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
        reportError("cream:teardown", error);
      }
    };
  }, [progressRef, reducedMotion, quality, onReady]);

  return (
    <div className="absolute inset-0">
      {failed ? (
        <StageFallback
          reason={failed}
          src="/assets/brand/packaging-cream-bun-4pack.webp"
          alt="KV Delight cream buns, four to a pack, cream visible at the seam."
          width={1024}
          height={1536}
          subject="the same cream buns in their four-pack"
        />
      ) : (
        <div ref={hostRef} className="h-full w-full" aria-hidden="true" />
      )}
    </div>
  );
}
