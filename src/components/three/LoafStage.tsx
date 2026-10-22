"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  createCrustMaterial,
  createCrustTexture,
  createLoafGeometry,
  createShadowTexture,
} from "@/lib/loaf";

type LoafStageProps = {
  /** Scroll progress of the bread chapter, 0 → 1. Mutated by ScrollTrigger. */
  progressRef: React.MutableRefObject<number>;
  /** True when the chapter is pinned/visible — pauses the render loop otherwise. */
  active: boolean;
  reducedMotion?: boolean;
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

const easeInOut = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function LoafStage({
  progressRef,
  active,
  reducedMotion = false,
  onReady,
}: LoafStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 1.75);
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

    // Framing constants recomputed on resize so the loaf always fits the stage.
    const view = { camZ: 8.6, camY: 1.15, lookY: 0.02, fov: 34, fit: 1 };
    camera.position.set(0, view.camY, view.camZ);
    camera.lookAt(0, view.lookY, 0);

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

    // Camera-side fill: keeps the face that turns toward the viewer from
    // collapsing into silhouette during the 360° turn.
    const frontFill = new THREE.DirectionalLight("#ffe6c6", 0.85);
    frontFill.position.set(0.6, 1.6, 6.5);
    scene.add(frontFill);

    const ambient = new THREE.AmbientLight("#ffe9cf", 0.28);
    scene.add(ambient);

    const fill = new THREE.HemisphereLight("#fff1da", "#22140a", 0.5);
    scene.add(fill);

    /* ------------------------------------------------------------- loaf --- */
    const grain = createCrustTexture(512);
    const geometry = createLoafGeometry();
    const material = createCrustMaterial(grain);
    const loaf = new THREE.Mesh(geometry, material);
    const loafGroup = new THREE.Group();
    loafGroup.add(loaf);
    scene.add(loafGroup);

    /* ------------------------------------------------- contact shadow ----- */
    const shadowTex = createShadowTexture();
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 2.6),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );
    geometry.computeBoundingBox();
    const floorY = (geometry.boundingBox?.min.y ?? -0.9) - 0.015;
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = floorY;
    shadow.position.y = floorY;
    scene.add(shadow);

    // Keep the shadow locked just under the loaf as it drifts.
    const shadowBaseY = floorY;

    /* ------------------------------------------------------ choreography -- */
    // progressRef is section-scoped: 0 = hero, 1 = hand-off to packaging.
    const pose = { yaw: -0.5, pitch: 0.06, roll: -0.03 };

    const applyPose = (p: number) => {
      // Rotation: one genuine 360° turn spread over the midsection of the pin,
      // with an ease so the loaf decelerates as it hands off to the pack shot.
      const spinStart = 0.16;
      const spinEnd = 0.74;
      const spinT = clamp01((p - spinStart) / (spinEnd - spinStart));
      const spin = easeInOut(spinT) * Math.PI * 2;

      pose.yaw = -0.5 + spin;
      pose.pitch = 0.17 + Math.sin(p * Math.PI) * 0.05;
      pose.roll = -0.02 + Math.sin(p * Math.PI * 1.3) * 0.03;

      loafGroup.rotation.set(pose.pitch, pose.yaw, pose.roll);

      // Scale: settle in, breathe up, then hand off.
      const introScale = 1 + (1 - clamp01(p / 0.16)) * 0.06;
      const outroScale = 1 - clamp01((p - 0.66) / 0.2) * 0.14;
      const s = introScale * outroScale * view.fit;
      loafGroup.scale.setScalar(s);

      // Vertical drift + camera choreography.
      loafGroup.position.y = 0.06 - clamp01(p / 0.5) * 0.08;
      loafGroup.position.x = Math.sin(p * Math.PI * 0.9) * 0.18;

      camera.position.z =
        view.camZ -
        Math.sin(clamp01(p / 0.8) * Math.PI) * 0.9 +
        clamp01((p - 0.8) / 0.2) * 1.4;
      camera.position.y = view.camY - Math.sin(p * Math.PI) * 0.12;
      camera.lookAt(0, view.lookY, 0);

      // Shadow reacts to the lift so the loaf never looks pasted on.
      shadow.position.y = shadowBaseY + loafGroup.position.y * 0.35;
      shadow.scale.setScalar(
        (1 + Math.abs(Math.sin(p * Math.PI)) * 0.06) * view.fit,
      );
      (shadow.material as THREE.MeshBasicMaterial).opacity =
        0.75 - Math.abs(Math.sin(p * Math.PI)) * 0.12;

      // Fade the loaf out at the very end, just before the packaging arrives.
      material.opacity = 1 - clamp01((p - 0.68) / 0.12);
    };

    /* --------------------------------------------------------- parallax --- */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
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
      camera.fov = 34;

      if (aspect < 0.8) {
        // Portrait: shrink + pull back so the whole loaf fits, and lift it into
        // the upper half so the caption has a clean field underneath.
        view.camZ = 12.6;
        view.camY = 1.0;
        view.lookY = -0.62;
        view.fit = 0.66;
      } else if (aspect < 1.15) {
        view.camZ = 10.4;
        view.camY = 1.08;
        view.lookY = -0.28;
        view.fit = 0.84;
      } else {
        view.camZ = 8.6;
        view.camY = 1.15;
        view.lookY = 0.02;
        view.fit = 1;
      }
      camera.updateProjectionMatrix();
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
      applyPose(0.34); // a still, three-quarter hero angle
      renderer.render(scene, camera);
      onReady?.();
    }

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!active || !visible || reducedMotion) return;

      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;

      applyPose(progressRef.current);
      camera.position.x = pointer.x * 0.42;
      camera.position.y += (-pointer.y * 0.22 - camera.position.y) * 0.12;
      if (pointer.y === 0) camera.position.y += (view.camY - camera.position.y) * 0.05;

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
      geometry.dispose();
      material.dispose();
      grain.dispose();
      shadowTex.dispose();
      shadow.geometry.dispose();
      (shadow.material as THREE.Material).dispose();
      scene.environment?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [active, progressRef, reducedMotion, onReady]);

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
