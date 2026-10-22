"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  CREAM,
  CREAM_FOV,
  TIMELINE,
  fillAt,
  nozzleAt,
  creamSurfaceAt,
  openAt,
  seamCreamAt,
  viewFor,
} from "@/lib/creamChoreography";
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

type CreamStageProps = {
  /** Scroll progress of the cream chapter, 0 → 1. Mutated by the DOM side. */
  progressRef: React.MutableRefObject<number>;
  active: boolean;
  reducedMotion?: boolean;
  quality?: QualityTier | "auto";
  onReady?: () => void;
};

/**
 * Cream, as geometry.
 *
 * A soft dome sitting on the cut face, with three thin ridges riding up its
 * slope: the dome is what cream looks like in volume, the ridges are what a
 * piping bag leaves on the surface. An earlier version was flat rings alone,
 * which read as ripples on a puddle rather than as cream.
 *
 * Everything is local to the group and grows from its origin, so the fill can
 * rise by scaling in Y and the mound stays welded to the crumb face.
 */
function createCreamMound(segments: number) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: "#fffaf0",
    roughness: 0.78,
    metalness: 0,
    transparent: true,
    opacity: 1,
  });

  const R = 0.66;
  const YMAX = 0.28;

  const bodyGeometry = new THREE.SphereGeometry(
    R,
    segments,
    Math.max(6, Math.round(segments / 3)),
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const body = new THREE.Mesh(bodyGeometry, material);
  body.scale.set(1, 0.001, 1);
  group.add(body);

  // Where up the dome each ridge sits, as a fraction of its height, and the
  // radius of the dome at that height — so a ridge always lies on the surface.
  const facs = [0.45, 0.72, 0.9];
  const ridges = facs.map((fac, i) => {
    const radius = R * Math.sqrt(Math.max(0, 1 - fac * fac)) + 0.012;
    const geometry = new THREE.TorusGeometry(
      radius,
      0.038,
      Math.max(6, Math.round(segments / 6)),
      segments,
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.z = i * 0.7;
    mesh.scale.setScalar(0.001);
    group.add(mesh);
    return mesh;
  });

  return { group, body, ridges, material, facs, bodyGeometry, YMAX, R };
}

/** Steel piping nozzle: body, tapered tip, collar. Origin is the tip. */
function createNozzle() {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({
    color: "#c9ccd2",
    // Without an environment map a fully metallic material renders black, so
    // this is deliberately half-metal: under the key light it reads as brushed
    // steel, and it costs one material instead of a render target.
    metalness: 0.45,
    roughness: 0.34,
    // Transparent from the start so the nozzle can fade in and out without a
    // shader recompile mid-scroll.
    transparent: true,
    opacity: 1,
  });

  // Compact on purpose: only the nozzle is in shot — the bag is above the
  // frame — and a full-length bag would intersect the lifted top half.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.16, 18), steel);
  body.position.y = 0.28;
  group.add(body);

  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.155, 0.2, 18, 1, true), steel);
  tip.position.y = 0.1;
  group.add(tip);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.024, 8, 18), steel);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.2;
  group.add(collar);

  group.visible = false;
  return { group, steel, parts: [body, tip, collar] };
}

/**
 * Builds the scene and returns a teardown.
 *
 * Same failure contract as the bread and bun stages: anything can throw out of
 * here, the caller catches it, and every object built so far is disposed before
 * the error leaves. A locked-down browser loses the film, never the page.
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
    gl.toneMappingExposure = 1.05;
    gl.outputColorSpace = THREE.SRGBColorSpace;
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

    /* ------------------------------------------------------------- scene --- */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CREAM_FOV,
      Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
      0.1,
      60,
    );

    // The same warm rig as the soft buns, so a cream bun and a soft bun are
    // visibly from one bakery. One extra light catches the steel nozzle.
    const key = new THREE.DirectionalLight("#ffe3b8", 3.4);
    key.position.set(-3.2, 5.2, 4.2);
    const rim = new THREE.DirectionalLight("#ffb877", 2.4);
    rim.position.set(4.2, 2.4, -4.6);
    const fill = new THREE.DirectionalLight("#ffe8cc", 0.9);
    fill.position.set(0.4, 1.6, 5.4);
    const bounce = new THREE.DirectionalLight("#b87a3e", 1.1);
    bounce.position.set(0.3, -2.6, 2.8);
    const crumbLight = new THREE.DirectionalLight("#fff4e2", 0.8);
    crumbLight.position.set(-0.6, 1.2, -3.4);
    const steelLight = new THREE.DirectionalLight("#eaf2ff", 1.1);
    steelLight.position.set(1.8, 4.6, 2.2);

    // Ordered by priority, because the tier trims from the end: the steel light
    // outranks the crumb light here — the nozzle is the one object that needs a
    // highlight, and the crumb is already lit by the bounce.
    const rig = [key, rim, fill, bounce, steelLight, crumbLight];
    for (const light of rig.slice(0, Math.max(3, settings.extraLights))) scene.add(light);

    const ambient = new THREE.AmbientLight("#ffe9cf", 0.36);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight("#fff1da", "#241609", 0.55);
    scene.add(hemi);

    /* ------------------------------------------------------------- world --- */
    const world = new THREE.Group();
    scene.add(world);

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
    const crustTex = getCrustTexture(clampTextureSize(settings.crustTexture, maxTex));
    const crumbTex = createCrumbTexture(clampTextureSize(settings.crumbTexture, maxTex));
    const crumbBump = createCrumbBump(clampTextureSize(settings.crumbTexture, maxTex));
    if (crumbTex) track(() => crumbTex.dispose());
    if (crumbBump) track(() => crumbBump.dispose());

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

    /* -------------------------------------------------------------- halves -- */
    const bottom = new THREE.Mesh(geometries.bottom, materialsFor);
    bunGroup.add(bottom);

    const topPivot = new THREE.Group();
    topPivot.position.set(0, CREAM.cutY, 0);
    bunGroup.add(topPivot);
    const top = new THREE.Mesh(geometries.top, materialsFor);
    top.position.set(0, -CREAM.cutY, 0);
    topPivot.add(top);

    /* --------------------------------------------------------------- cream -- */
    const cream = createCreamMound(settings.bunSegments);
    track(() => cream.material.dispose());
    track(() => cream.bodyGeometry.dispose());
    for (const ridge of cream.ridges) track(() => ridge.geometry.dispose());
    cream.group.position.y = CREAM.cutY;
    bunGroup.add(cream.group);

    // The seam bulge: cream squeezed out where the two halves meet. One torus,
    // hidden until the bun starts closing.
    const seamMat = new THREE.MeshStandardMaterial({
      color: "#fffaf0",
      roughness: 0.8,
      metalness: 0,
      transparent: true,
      opacity: 1,
    });
    track(() => seamMat.dispose());
    const seamGeo = new THREE.TorusGeometry(0.94, 0.09, 8, settings.bunSegments);
    track(() => seamGeo.dispose());
    const seam = new THREE.Mesh(seamGeo, seamMat);
    seam.rotation.x = Math.PI / 2;
    seam.position.y = CREAM.cutY;
    seam.scale.setScalar(0.001);
    bunGroup.add(seam);

    /* -------------------------------------------------------------- nozzle -- */
    const nozzle = createNozzle();
    track(() => nozzle.steel.dispose());
    for (const part of nozzle.parts) track(() => part.geometry.dispose());
    world.add(nozzle.group);

    /* The piped cream between the tip and the surface. Without it the nozzle
     * hovers over the bun and pipes into thin air; with it, the fill has a
     * source. It is scaled per frame to whatever gap is left. */
    const streamMat = new THREE.MeshStandardMaterial({
      color: "#fffaf0",
      roughness: 0.7,
      metalness: 0,
      transparent: true,
      opacity: 1,
    });
    track(() => streamMat.dispose());
    const streamGeo = new THREE.CylinderGeometry(0.05, 0.058, 1, 10, 1, true);
    track(() => streamGeo.dispose());
    const stream = new THREE.Mesh(streamGeo, streamMat);
    stream.visible = false;
    world.add(stream);

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

    /* -------------------------------------------------------------- poses -- */
    const update = (p: number) => {
      const view = viewFor(p, camera.aspect);
      const open = openAt(p);
      const filled = fillAt(p);
      const seamIn = seamCreamAt(p);
      const pipe = nozzleAt(p);

      bunGroup.rotation.y = view.yaw;

      // A hairline of overlap while closed: two flush discs still rasterise a
      // seam, and a bun with a visible equator before it has been opened is the
      // "pre-sliced" tell the loaf had to lose too.
      const closed = 0.006 * (1 - open.open);
      topPivot.position.y = CREAM.cutY + open.lift - closed;
      topPivot.rotation.x = open.tilt;

      /* the fill: a mound that rises, with its piped ridges riding the slope */
      const rising = smoothstep(0, 0.05, filled);
      cream.body.visible = filled > 0.004;
      // A hemisphere is `R` tall before it is squashed: scaling it by `filled`
      // alone would put its apex through the bun's crown, which is exactly what
      // the software render caught.
      cream.body.scale.set(
        1,
        Math.max(0.001, filled * rising * (cream.YMAX / cream.R)),
        1,
      );
      cream.ridges.forEach((ridge, i) => {
        const fac = cream.facs[i];
        const show = smoothstep(fac * 0.55, Math.max(fac * 0.6, fac * 0.95), filled);
        ridge.visible = show > 0.02;
        ridge.scale.setScalar(Math.max(0.001, show));
        ridge.position.y = Math.max(0.004, filled * cream.YMAX * fac);
      });

      /* the cream at the seam, once the halves are coming together */
      seam.visible = seamIn > 0.002;
      if (seam.visible) seam.scale.setScalar(0.9 + 0.1 * seamIn);

      /* nozzle, and the cream leaving it */
      nozzle.group.visible = pipe.visible > 0.01;
      nozzle.group.position.set(0, pipe.y, 0);
      nozzle.group.rotation.y = pipe.spin;
      nozzle.steel.opacity = pipe.visible;

      const surface = creamSurfaceAt(p);
      const gap = pipe.y - surface;
      stream.visible = pipe.visible > 0.02 && gap > 0.03;
      if (stream.visible) {
        stream.scale.set(1, gap, 1);
        stream.position.set(0, surface + gap / 2, 0);
        streamMat.opacity = pipe.visible;
      }

      /* camera */
      camera.position.set(0, view.camY, view.camZ);
      camera.lookAt(0, view.lookY, 0);

      /* light: arrives lit, warms a little through the reveal */
      const light = 0.66 + 0.34 * smoothstep(0, TIMELINE.revealEnd, p);
      key.intensity = 3.4 * light;
      rim.intensity = (2.4 + 0.8 * (1 - light)) * light;
      fill.intensity = 0.9 * light;
      bounce.intensity = 1.1 * light;
      crumbLight.intensity = 0.8 * light;
      steelLight.intensity = 1.1 * light;
      ambient.intensity = 0.36 * light;
      hemi.intensity = 0.55 * light;

      const arrive = smoothstep(0, 0.12, p);
      world.position.y = -0.1 * (1 - arrive);
      world.scale.setScalar(0.95 + 0.05 * arrive);

      /* contact shadow follows the bun */
      shadow.scale.set(3.0, 2.4, 1);
      shadowMat.opacity = 0.6 * (0.3 + 0.7 * arrive);

      /* packaging hand-off: the bun leaves as the four-pack arrives */
      const pass = smoothstep(TIMELINE.packIn, TIMELINE.packInEnd, p);
      bunGroup.position.y = pass * 0.14;
      // The opening frame is a bun, not a ghost of one: the reveal only *adds*
      // light, so the shell starts at three-quarters opacity rather than the
      // near-nothing the soft buns chapter used to start from.
      for (const mat of materialsFor) mat.opacity = (1 - pass) * (0.78 + 0.22 * arrive);
      cream.material.opacity = 1 - pass;
      streamMat.opacity *= 1 - pass;
      seamMat.opacity = 1 - pass;
      shadowMat.opacity *= 1 - pass;
    };

    /* -------------------------------------------------------------- loop -- */
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
      update(0.47);
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
        // No pointer parallax here: this stage has four moving parts already,
        // and a still frame must be able to go idle so a phone can sleep.
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
          alt="KV Delight cream buns, four to a pack, cream visible at the cut."
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
