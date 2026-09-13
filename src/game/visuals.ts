/* Procedural world visuals: clouds, voxel celestial cubes, explosion FX (extracted from Game.tsx — R2) */
import * as THREE from "three";

/* makeClouds(vnoise, mode): Authentic Minecraft Connected 3D Voxel Cloud Canopy (Culls internal faces, seamless big shapes) */
export function makeClouds(
  vnoise: (x: number, z: number) => number,
  mode: "clear" | "cloudy" | "overcast" = "cloudy"
): THREE.Mesh {
  const gridSize = 128; // 128x128 voxel cloud cells
  const cellSize = 16; // 16m x 16m horizontal per cell -> 2048m x 2048m vast sky canopy
  const cloudHeight = mode === "overcast" ? 6.0 : 4.0;

  const pos: number[] = [];
  const norm: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];

  const cTop = [1.0, 1.0, 1.0];
  const cBottom = [1.0, 1.0, 1.0];
  const cSideZ = [1.0, 1.0, 1.0];
  const cSideX = [1.0, 1.0, 1.0];

  function quad(
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    n: [number, number, number],
    c: number[]
  ) {
    const base = pos.length / 3;
    const pts = [p0, p1, p2, p3];
    for (let i = 0; i < 4; i++) {
      pos.push(pts[i][0], pts[i][1], pts[i][2]);
      norm.push(n[0], n[1], n[2]);
      col.push(c[0], c[1], c[2]);
    }
    idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }

  // 1. Precompute periodic cloud occupancy grid (25-30% coverage in cloudy mode)
  const threshold = mode === "clear" ? 0.999 : mode === "overcast" ? 0.28 : 0.60;
  const grid: boolean[][] = [];
  for (let gz = 0; gz < gridSize; gz++) {
    grid[gz] = [];
    for (let gx = 0; gx < gridSize; gx++) {
      const nv = (vnoise(gx / 5.0, gz / 5.0) + vnoise(gx / 2.0 + 13, gz / 2.0 - 7) * 0.35) / 1.35;
      grid[gz][gx] = nv > threshold;
    }
  }

  // 2. Build fused contiguous 3D clouds (Culling all internal shared walls!)
  const halfExtent = (gridSize * cellSize) / 2;
  const y0 = -cloudHeight / 2;
  const y1 = cloudHeight / 2;

  for (let gz = 0; gz < gridSize; gz++) {
    for (let gx = 0; gx < gridSize; gx++) {
      if (!grid[gz][gx]) continue;

      const x0 = gx * cellSize - halfExtent;
      const x1 = x0 + cellSize;
      const z0 = gz * cellSize - halfExtent;
      const z1 = z0 + cellSize;

      // Top & Bottom always drawn
      quad([x0, y1, z1], [x1, y1, z1], [x0, y1, z0], [x1, y1, z0], [0, 1, 0], cTop);
      quad([x0, y0, z0], [x1, y0, z0], [x0, y0, z1], [x1, y0, z1], [0, -1, 0], cBottom);

      // CULL INTERNAL FACES: Only render perimeter edges where neighbor is empty!
      const northEmpty = !grid[(gz - 1 + gridSize) % gridSize][gx];
      const southEmpty = !grid[(gz + 1) % gridSize][gx];
      const westEmpty  = !grid[gz][(gx - 1 + gridSize) % gridSize];
      const eastEmpty  = !grid[gz][(gx + 1) % gridSize];

      if (northEmpty) {
        quad([x1, y1, z0], [x0, y1, z0], [x1, y0, z0], [x0, y0, z0], [0, 0, -1], cSideZ);
      }
      if (southEmpty) {
        quad([x0, y1, z1], [x1, y1, z1], [x0, y0, z1], [x1, y0, z1], [0, 0, 1], cSideZ);
      }
      if (westEmpty) {
        quad([x0, y1, z0], [x0, y1, z1], [x0, y0, z0], [x0, y0, z1], [-1, 0, 0], cSideX);
      }
      if (eastEmpty) {
        quad([x1, y1, z1], [x1, y1, z0], [x1, y0, z1], [x1, y0, z0], [1, 0, 0], cSideX);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(norm, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geom.setIndex(idx);

  const overcast = mode === "overcast";
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    transparent: !overcast,
    opacity: mode === "clear" ? 0.0 : overcast ? 1.0 : 0.88,
    emissive: 0xffffff,
    emissiveIntensity: 0,
    depthWrite: false,
    depthTest: true,
    fog: false,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.frustumCulled = false;
  mesh.visible = mode !== "clear";
  mesh.renderOrder = 3;
  mesh.userData = { totalSpan: gridSize * cellSize, mat, mode };
  return mesh;
}

/* createVoxelCelestialBox(tex, scene, tileIdx, size): sun/moon voxel cubes */
export function createVoxelCelestialBox(
  tex: THREE.CanvasTexture,
  scene: THREE.Scene,
  tileIdx: number,
  size: number
) {
  const ATLAS_TILES = 32;
  const u0 = (tileIdx % ATLAS_TILES) / ATLAS_TILES;
  const v0 = (ATLAS_TILES - Math.floor(tileIdx / ATLAS_TILES) - 1) / ATLAS_TILES;
  const u1 = u0 + 1 / ATLAS_TILES;
  const v1 = v0 + 1 / ATLAS_TILES;

  const geom = new THREE.BoxGeometry(size, size, size);
  const uvs = geom.attributes.uv;
  for (let i = 0; i < uvs.count; i += 4) {
    uvs.setXY(i,     u0, v1);
    uvs.setXY(i + 1, u1, v1);
    uvs.setXY(i + 2, u0, v0);
    uvs.setXY(i + 3, u1, v0);
  }
  uvs.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    fog: false
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 1;
  scene.add(mesh);
  return mesh;
}

let moonHaloTex: THREE.CanvasTexture | null = null;

export function createMoonHalo(scene: THREE.Scene, size = 130): THREE.Sprite {
  if (!moonHaloTex) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const c2d = cv.getContext("2d")!;
    const g = c2d.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, "rgba(235,242,255,0.85)");
    g.addColorStop(0.25, "rgba(200,220,250,0.35)");
    g.addColorStop(0.6, "rgba(150,180,230,0.12)");
    g.addColorStop(1, "rgba(150,180,230,0)");
    c2d.fillStyle = g;
    c2d.fillRect(0, 0, 128, 128);
    moonHaloTex = new THREE.CanvasTexture(cv);
  }
  const mat = new THREE.SpriteMaterial({
    map: moonHaloTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    fog: false,
    blending: THREE.AdditiveBlending
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 2;
  scene.add(sprite);
  return sprite;
}

const MOON_LIT = [1, 0.75, 0.5, 0.25, 0, 0.25, 0.5, 0.75];

/* Repaint moon tile 1 (x16..32, y0..16) for the given 0..7 phase. Texture
 * upload happens here only — call when the phase changes (once per day). */
export function paintMoonPhase(tex: THREE.CanvasTexture, phase: number): void {
  const cv = tex.image as HTMLCanvasElement | undefined;
  const g = cv?.getContext("2d");
  if (!cv || !g) return;
  const P = ((phase % 8) + 8) % 8;
  const lit = MOON_LIT[P];
  const X = 16, Y = 0;
  g.clearRect(X, Y, 16, 16);
  if (lit <= 0) {
    g.fillStyle = "#3a3a38";
    g.fillRect(X + 2, Y + 2, 12, 12);
  } else {
    g.fillStyle = "#e8e8e0";
    g.fillRect(X + 2, Y + 2, 12, 12);
    g.fillStyle = "#d3d3ca";
    g.fillRect(X + 3, Y + 6, 4, 4);
    g.fillRect(X + 8, Y + 9, 3, 3);
    g.fillStyle = "#9fb2c2";
    g.fillRect(X + 4, Y + 8, 2, 2);
    g.fillRect(X + 9, Y + 3, 2, 2);
    if (lit < 1) {
      const dw = Math.round(12 * (1 - lit));
      g.save();
      g.globalCompositeOperation = "destination-out";
      if (P <= 3) g.fillRect(X + 2 + 12 - dw, Y + 2, dw, 12);
      else g.fillRect(X + 2, Y + 2, dw, 12);
      g.restore();
    }
  }
  tex.needsUpdate = true;
}

/* Primed TNT flashing shell mesh */
export function makePrimedTntShell(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 1.02, 1.02),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
  );
  return mesh;
}

/* Explosion blast sphere + fading point light */
export function makeBlastFx(lightRange: number): { mesh: THREE.Mesh; light: THREE.PointLight } {
  const boomMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.85, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), boomMat);
  const light = new THREE.PointLight(0xff7722, 60, lightRange);
  return { mesh, light };
}
