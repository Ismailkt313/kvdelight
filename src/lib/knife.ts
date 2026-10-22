import * as THREE from "three";

/**
 * A serrated bread knife, built from geometry — no model file.
 *
 * Local axes, before the stage rotates it:
 *   +X = along the blade, heel → tip
 *   +Y = up, from the cutting edge (y = 0) to the spine
 *   +Z = blade thickness
 *
 * The stage turns the whole group −90° about Y so the blade's length runs along
 * world Z (a cross-cut through the loaf's width) and its thickness along X (the
 * seam plane).
 */

export const KNIFE = {
  /** Blade length from the heel to the tip. */
  length: 2.75,
  /** Spine height above the cutting edge. */
  height: 0.46,
  thickness: 0.016,
  /** Handle length, behind the heel (negative X). */
  handle: 1.05,
} as const;

export type KnifeParts = {
  group: THREE.Group;
  bladeMaterial: THREE.MeshStandardMaterial;
  handleMaterial: THREE.MeshStandardMaterial;
  /** Disposes geometry + materials created here. */
  dispose: () => void;
};

export function createKnife(bladeMap: THREE.Texture): KnifeParts {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];

  /* ---------------------------------------------------------------- blade -- */
  const shape = new THREE.Shape();
  const L = KNIFE.length;
  const H = KNIFE.height;

  // Spine: heel → tip, with a gentle taper down at the tip.
  shape.moveTo(0, H);
  shape.lineTo(L * 0.82, H);
  shape.quadraticCurveTo(L * 0.95, H * 0.94, L, H * 0.44);

  // Tip → serrated edge, back towards the heel.
  const teeth = 30;
  const pitch = (L - 0.05) / teeth;
  for (let i = 0; i < teeth; i++) {
    const x = L - i * pitch;
    const depth = 0.036 + (i / teeth) * 0.012;
    // scalloped serration: shallow at the tip, deeper at the heel
    shape.lineTo(x, depth);
    shape.quadraticCurveTo(
      x - pitch * 0.5,
      depth * 2.6,
      x - pitch,
      0.004,
    );
  }
  // Heel → back up the bolster line.
  shape.lineTo(0.055, 0.012);
  shape.lineTo(0.0, H * 0.5);
  shape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: KNIFE.thickness,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.006,
    bevelSegments: 1,
    curveSegments: 4,
  });
  bladeGeo.translate(0, 0, -KNIFE.thickness / 2);
  bladeGeo.computeVertexNormals();
  disposables.push(bladeGeo);

  const bladeMaterial = new THREE.MeshStandardMaterial({
    color: "#c9cfd6",
    map: bladeMap,
    metalness: 1,
    roughness: 0.26,
    envMapIntensity: 1.5,
    transparent: true,
  });
  disposables.push(bladeMaterial);

  const blade = new THREE.Mesh(bladeGeo, bladeMaterial);
  blade.castShadow = false;
  group.add(blade);

  /* -------------------------------------------------------------- bolster -- */
  const bolsterGeo = new THREE.BoxGeometry(0.09, H * 0.92, KNIFE.thickness * 2.1);
  bolsterGeo.translate(0.02, H * 0.46, 0);
  disposables.push(bolsterGeo);
  const bolster = new THREE.Mesh(bolsterGeo, bladeMaterial);
  group.add(bolster);

  /* --------------------------------------------------------------- handle -- */
  const handleShape = new THREE.Shape();
  const hr = 0.14;
  const hx = -KNIFE.handle;
  const hy = -0.055;
  const hh = H * 0.72;
  // Rounded-rectangle profile, slightly swelled in the middle.
  handleShape.moveTo(hx + hr, hy);
  handleShape.quadraticCurveTo(hx + hr * 2.2, hy + hh * 0.5, hx + hr, hy + hh);
  handleShape.lineTo(-0.05, hy + hh);
  handleShape.quadraticCurveTo(0.03, hy + hh * 0.5, -0.05, hy);
  handleShape.closePath();

  const handleGeo = new THREE.ExtrudeGeometry(handleShape, {
    depth: 0.19,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 3,
    curveSegments: 6,
  });
  handleGeo.translate(0, 0, -0.095);
  handleGeo.computeVertexNormals();
  disposables.push(handleGeo);

  const handleMaterial = new THREE.MeshStandardMaterial({
    color: "#3b2517",
    roughness: 0.52,
    metalness: 0.05,
    transparent: true,
  });
  disposables.push(handleMaterial);

  const handle = new THREE.Mesh(handleGeo, handleMaterial);
  group.add(handle);

  /* ----------------------------------------------------------------- rivets -- */
  const rivetGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.235, 12);
  rivetGeo.rotateX(Math.PI / 2);
  disposables.push(rivetGeo);
  const rivetMat = new THREE.MeshStandardMaterial({
    color: "#b9bfc7",
    metalness: 1,
    roughness: 0.35,
    transparent: true,
  });
  disposables.push(rivetMat);

  for (const rx of [-KNIFE.handle * 0.32, -KNIFE.handle * 0.74]) {
    const rivet = new THREE.Mesh(rivetGeo, rivetMat);
    rivet.position.set(rx, hy + hh * 0.5, 0);
    group.add(rivet);
  }

  const dispose = () => {
    for (const d of disposables) d.dispose();
  };

  return { group, bladeMaterial, handleMaterial, dispose };
}
