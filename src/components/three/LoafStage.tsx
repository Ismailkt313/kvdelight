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
  cameraFor,
  captionShift,
  knifeTransform,
  layoutSlices,
  frameWidthFraction,
  yawAt,
} from "@/lib/sliceLayout";

type LoafStageProps = {
  /** Scroll progress of the bread chapter, 0 → 1. Mutated by ScrollTrigger. */
  progressRef: React.MutableRefObject<number>;
  /** True when the chapter is on screen — otherwise the loop is skipped. */
  active: boolean;
  reducedMotion?: boolean;
  quality?: "high" | "low";
  onReady?: () => void;
};


/** Warm studio environment built from a canvas gradient — no HDR download. */
function buildEnvironment(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "#fff3dd");
  g.addColorStop(0.42, "#e8c898");
  g.addColorStop(0.6, "#6d4a2a");
  g.addColorStop(1, "#241508");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}

/**
 * Scene A → E, read from chapter progress. Camera framing:
 *   - the yaw turn is slow while cutting (the blade holds its alignment) and
 *     opens into a full 360° showcase of the fanned slices in scene D;
 *   - the fit scale is recomputed from the arrangement's real width, so the
 *     spread always stays inside the frame on any aspect ratio.
 */
export default function LoafStage({
  progressRef,
  active,
  reducedMotion = false,
  quality = "high",
  onReady,
}: LoafStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // Read through refs so a prop change never rebuilds the whole scene.
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: quality === "high",
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }

    const coarse = quality === "low";
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      coarse ? 1.4 : window.innerWidth < 768 ? 1.5 : 1.75,
    );
    renderer.setPixelRatio(dpr);
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.environment = buildEnvironment(renderer);
    scene.environmentIntensity = 0.7;

    const camera = new THREE.PerspectiveCamera(
      34,
      host.clientWidth / host.clientHeight,
      0.1,
      100,
    );
    const FOV = 34;

    let view = baseView(1.5);

    /* ------------------------------------------------------------ lights -- */
    const key = new THREE.DirectionalLight("#ffe1b4", 3.4);
    key.position.set(-4.6, 6.8, 5.0);
    scene.add(key);

    const rim = new THREE.DirectionalLight("#ffc484", 2.6);
    rim.position.set(5.0, 2.6, -5.4);
    scene.add(rim);

    const bounce = new THREE.DirectionalLight("#8a5626", 0.7);
    bounce.position.set(1.5, -3.5, 3.0);
    scene.add(bounce);

    // Camera-side fill: keeps the faces that turn toward the viewer from
    // collapsing into silhouette — and lights the cut crumb faces.
    const frontFill = new THREE.DirectionalLight("#ffe6c6", 0.85);
    frontFill.position.set(0.6, 1.6, 6.5);
    scene.add(frontFill);

    // The crumb is the subject in scenes C and D, and those faces only exist
    // once the loaf is open — so it gets its own soft pair, camera side and
    // opposite, that keeps them lit through the whole 360° showcase.
    const crumbKey = new THREE.DirectionalLight("#fff2dc", 1.15);
    crumbKey.position.set(0.3, 1.1, 6.8);
    scene.add(crumbKey);

    const crumbBack = new THREE.DirectionalLight("#ffe0b4", 0.55);
    crumbBack.position.set(-0.6, 0.7, -6.2);
    scene.add(crumbBack);

    const ambient = new THREE.AmbientLight("#ffe9cf", 0.28);
    scene.add(ambient);

    const fill = new THREE.HemisphereLight("#fff1da", "#22140a", 0.5);
    scene.add(fill);

    /* ------------------------------------------------------------- world --- */
    // `world` carries the turn + fit scale; the loaf and the knife live inside
    // it, so the blade always stays in the seam plane as the loaf turns.
    const world = new THREE.Group();
    scene.add(world);

    const loafGroup = new THREE.Group();
    loafGroup.position.y = BASE_Y;
    world.add(loafGroup);

    /* -------------------------------------------------------- slice meshes -- */
    const { slices } = createSliceGeometries(
      coarse
        ? { ringSegments: 20, arcSteps: 6 }
        : { ringSegments: 30, arcSteps: 9 },
    );

    const crustTex = createCrustTexture(coarse ? 256 : 512);
    const crustMat = createCrustMaterial(crustTex);
    // Opaque for the whole film; transparency is switched on only for the
    // hand-off fade, so the slabs sort crisply while they are being studied.
    crustMat.transparent = false;
    crustMat.needsUpdate = true;

    const crumbTex = createCrumbTexture(coarse ? 256 : 512);
    const crumbBump = createCrumbBump(coarse ? 256 : 512);
    crumbTex.repeat.set(1, 1);
    const crumbMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      map: crumbTex,
      bumpMap: crumbBump,
      bumpScale: 0.018,
      roughness: 0.84,
      metalness: 0,
      sheen: 0.3,
      sheenColor: new THREE.Color("#fff1d8"),
      sheenRoughness: 0.9,
      envMapIntensity: 0.4,
      transparent: false,
    });

    const meshes: THREE.Mesh[] = slices.map((slice) => {
      const mesh = new THREE.Mesh(slice.geometry, [crustMat, crumbMat]);
      loafGroup.add(mesh);
      return mesh;
    });

    /* -------------------------------------------------------------- knife -- */
    const bladeTex = createBladeTexture(256);
    const knife = createKnife(bladeTex);
    const knifePivot = new THREE.Group();
    knifePivot.add(knife.group);
    knife.group.rotation.y = -Math.PI / 2; // length runs along world Z
    knifePivot.visible = false;
    world.add(knifePivot);

    /* ------------------------------------------------------ contact shadow -- */
    const shadowTex = createShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = BASE_Y - 0.008;
    shadow.scale.set(7.4, 3.1, 1);
    world.add(shadow);

    let spreadScale = 1;
    let fit = 1;

    /** Writes the shared layout onto the meshes; returns the arrangement width. */
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

    const setFade = (t: number) => {
      const opaque = t <= 0.001;
      if (opaque === crustMat.transparent) {
        crustMat.transparent = !opaque;
        crustMat.needsUpdate = true;
        crumbMat.transparent = !opaque;
        crumbMat.needsUpdate = true;
        knife.bladeMaterial.transparent = !opaque;
        knife.bladeMaterial.needsUpdate = true;
        knife.handleMaterial.transparent = !opaque;
        knife.handleMaterial.needsUpdate = true;
      }
      crustMat.opacity = 1 - t;
      crumbMat.opacity = 1 - t;
      knife.bladeMaterial.opacity = 1 - t;
      knife.handleMaterial.opacity = 1 - t;
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

      // Sit clear of the left-hand caption on desktop. Scaled by the visible
      // half-width, and faded in as the loaf opens up.
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

    /* ---------------------------------------------------------- parallax -- */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, ox: 0, oy: 0 };
    const onPointerMove = (e: PointerEvent) => {
      if (reducedMotion) return;
      const r = host.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    /* ------------------------------------------------------------ resize -- */
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.aspect = aspect;
      camera.fov = FOV;

      view = baseView(aspect);
      spreadScale = view.spreadScale;
      camera.updateProjectionMatrix();
      update(progressRef.current);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    /* -------------------------------------------------------------- loop -- */
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { rootMargin: "10% 0px" },
    );
    io.observe(host);

    if (reducedMotion) {
      renderer.render(scene, camera);
      onReady?.();
    }

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (reducedMotion || !activeRef.current || !visible) return;

      pointer.x = pointer.tx;
      pointer.y = pointer.ty;

      update(progressRef.current);

      // Parallax is tracked as a smoothed *offset*, because update() has just
      // written the absolute camera height for this frame.
      pointer.ox += (pointer.x - pointer.ox) * 0.07;
      pointer.oy += (pointer.y - pointer.oy) * 0.07;

      const cam = cameraFor(progressRef.current, camera.aspect);
      camera.position.x = pointer.ox * 0.34;
      camera.position.y = cam.camY - pointer.oy * 0.2;
      camera.lookAt(0, cam.lookY, 0);

      renderer.render(scene, camera);
    };
    tick();
    onReady?.();

    /* ----------------------------------------------------------- cleanup -- */
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);

      for (const slice of slices) slice.geometry.dispose();
      crustMat.dispose();
      crumbMat.dispose();
      crustTex.dispose();
      crumbTex.dispose();
      crumbBump.dispose();
      bladeTex.dispose();
      knife.dispose();
      shadow.geometry.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [progressRef, reducedMotion, quality, onReady]);

  return (
    <div className="absolute inset-0">
      <div ref={hostRef} className="h-full w-full" aria-hidden="true" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* WebGL unavailable → supplied hero artwork, never a stock substitute */}
          <img
            src="/assets/product/bread-hero-scene.webp"
            alt="A freshly baked KV Delight loaf on a wooden board with flour and wheat."
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
