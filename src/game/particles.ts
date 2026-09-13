// Hollowpine — World FX: block-break/place particles, 10-stage mining cracks, target outline.
// Pure Three.js, pooled (no per-event allocation), colored from the procedural atlas.

import * as THREE from "three";
import type { MoteKind } from "./ambientParticles";

const POOL = 420;
const GRAVITY = 7.5;
const LIFETIME = 0.62;

export interface WorldFX {
  particles: THREE.InstancedMesh;
  crack: THREE.Mesh;
  outline: THREE.LineSegments;
  spawnBurst: (cx: number, cy: number, cz: number, nx: number, ny: number, nz: number, color: THREE.Color, count?: number) => void;
  spawnFireplaceEmbers: (cx: number, cy: number, cz: number, count?: number) => void;
  spawnMote: (cx: number, cy: number, cz: number, colorHex: number, kind: MoteKind, count?: number) => void;
  showCrack: (x: number, y: number, z: number, nx: number, ny: number, nz: number) => void;
  setCrackStage: (stage: number) => void;
  hideCrack: () => void;
  showOutline: (x: number, y: number, z: number) => void;
  hideOutline: () => void;
  update: (dt: number) => void;
}

export function createWorldFX(scene: THREE.Scene): WorldFX {
  // ---- Particle pool (tiny angled quads) ----
  const geo = new THREE.PlaneGeometry(0.085, 0.085);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: false, depthWrite: true });
  const particles = new THREE.InstancedMesh(geo, mat, POOL);
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particles.frustumCulled = false;
  const lives = new Float32Array(POOL);
  const maxLives = new Float32Array(POOL);
  const baseScale = new Float32Array(POOL).fill(1);
  const vels = new Float32Array(POOL * 3);
  const colors = new Float32Array(POOL * 3);
  const types = new Uint8Array(POOL); // 0 = debris (gravity), 1 = fire ember (buoyant float), 2 = rise, 3 = fall, 4 = flutter, 5 = spark
  scene.add(particles);

  const dummy = new THREE.Object3D();
  const dummyColor = new THREE.Color(1, 1, 1);
  const tmpMat = new THREE.Matrix4();
  let cursor = 0;

  const FIRE_COLORS = [
    new THREE.Color(0xff4500), // Flame Orange-Red
    new THREE.Color(0xff8c00), // Radiant Amber
    new THREE.Color(0xffd700), // Golden Glow
    new THREE.Color(0xffa500), // Fireplace Orange
    new THREE.Color(0xe63946), // Deep Hearth Red
    new THREE.Color(0x3a3635), // Charcoal Smoke Wisp
  ];

  function spawnBurst(cx: number, cy: number, cz: number, nx: number, ny: number, nz: number, color: THREE.Color, count = 16) {
    for (let i = 0; i < count; i++) {
      const idx = cursor = (cursor + 1) % POOL;
      const a = Math.random() * Math.PI * 2;
      const away = 0.35 + Math.random() * 0.9;
      const speed = 1.1 + Math.random() * 2.0;
      dummy.position.set(
        cx + (Math.random() - 0.5) * 0.6,
        cy + (Math.random() - 0.5) * 0.6,
        cz + (Math.random() - 0.5) * 0.6
      );
      if (Math.abs(nx) > 0) dummy.position.x += nx * 0.25;
      if (Math.abs(ny) > 0) dummy.position.y += ny * 0.25;
      if (Math.abs(nz) > 0) dummy.position.z += nz * 0.25;
      vels[idx * 3] = nx * away + Math.cos(a) * speed * 0.45;
      vels[idx * 3 + 1] = ny * away + 1.4 + Math.random() * 1.6;
      vels[idx * 3 + 2] = nz * away + Math.sin(a) * speed * 0.45;
      types[idx] = 0;
      const s = 0.55 + Math.random() * 0.8;
      baseScale[idx] = s;
      dummy.scale.set(s, s, s);
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      dummy.updateMatrix();
      particles.setMatrixAt(idx, dummy.matrix);
      dummyColor.copy(color).multiplyScalar(0.8 + Math.random() * 0.35);
      colors[idx * 3] = dummyColor.r;
      colors[idx * 3 + 1] = dummyColor.g;
      colors[idx * 3 + 2] = dummyColor.b;
      lives[idx] = maxLives[idx] = LIFETIME;
    }
    particles.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    particles.instanceMatrix.needsUpdate = true;
  }

  function spawnFireplaceEmbers(cx: number, cy: number, cz: number, count = 3) {
    for (let i = 0; i < count; i++) {
      const idx = cursor = (cursor + 1) % POOL;
      const spread = 0.45;
      dummy.position.set(
        cx + (Math.random() - 0.5) * spread,
        cy + (Math.random() - 0.2) * 0.5,
        cz + (Math.random() - 0.5) * spread
      );
      vels[idx * 3] = (Math.random() - 0.5) * 0.3;
      vels[idx * 3 + 1] = 0.9 + Math.random() * 1.1; // Gentle rising draft
      vels[idx * 3 + 2] = (Math.random() - 0.5) * 0.3;
      types[idx] = 1; // Fire ember
      const s = 0.4 + Math.random() * 0.55;
      baseScale[idx] = s;
      dummy.scale.set(s, s, s);
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      dummy.updateMatrix();
      particles.setMatrixAt(idx, dummy.matrix);

      const col = FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)];
      colors[idx * 3] = col.r;
      colors[idx * 3 + 1] = col.g;
      colors[idx * 3 + 2] = col.b;
      lives[idx] = maxLives[idx] = 0.65 + Math.random() * 0.5;
    }
    particles.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    particles.instanceMatrix.needsUpdate = true;
  }

  function spawnMote(cx: number, cy: number, cz: number, colorHex: number, kind: MoteKind, count = 1) {
    const type = kind === "rise" ? 2 : kind === "fall" ? 3 : kind === "flutter" ? 4 : 5;
    for (let i = 0; i < count; i++) {
      const idx = cursor = (cursor + 1) % POOL;
      dummy.position.set(
        cx + (Math.random() - 0.5) * 0.7,
        cy + (Math.random() - 0.5) * 0.4,
        cz + (Math.random() - 0.5) * 0.7
      );
      if (kind === "rise") {
        vels[idx * 3] = (Math.random() - 0.5) * 0.25;
        vels[idx * 3 + 1] = 0.7 + Math.random() * 0.8;
        vels[idx * 3 + 2] = (Math.random() - 0.5) * 0.25;
      } else if (kind === "fall") {
        vels[idx * 3] = (Math.random() - 0.5) * 0.15;
        vels[idx * 3 + 1] = -0.4 - Math.random() * 0.5;
        vels[idx * 3 + 2] = (Math.random() - 0.5) * 0.15;
      } else if (kind === "flutter") {
        vels[idx * 3] = (Math.random() - 0.5) * 0.5;
        vels[idx * 3 + 1] = -0.3 - Math.random() * 0.25;
        vels[idx * 3 + 2] = (Math.random() - 0.5) * 0.5;
      } else {
        vels[idx * 3] = (Math.random() - 0.5) * 0.12;
        vels[idx * 3 + 1] = (Math.random() - 0.5) * 0.12;
        vels[idx * 3 + 2] = (Math.random() - 0.5) * 0.12;
      }
      types[idx] = type;
      const s = (kind === "flutter" ? 0.45 : kind === "spark" ? 0.36 : 0.58) + Math.random() * 0.35;
      baseScale[idx] = s;
      dummy.scale.set(s, s, s);
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      dummy.updateMatrix();
      particles.setMatrixAt(idx, dummy.matrix);
      dummyColor.setHex(colorHex).multiplyScalar(0.85 + Math.random() * 0.3);
      colors[idx * 3] = dummyColor.r;
      colors[idx * 3 + 1] = dummyColor.g;
      colors[idx * 3 + 2] = dummyColor.b;
      const life = kind === "flutter" ? 1.8 : kind === "rise" ? 1.1 : kind === "fall" ? 0.9 : 0.7;
      lives[idx] = maxLives[idx] = life * (0.75 + Math.random() * 0.5);
    }
    particles.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    particles.instanceMatrix.needsUpdate = true;
  }

  // ---- 10-stage progressive crack decal on a 64x64 canvas ----
  const cv = document.createElement("canvas");
  cv.width = 64; cv.height = 64;
  const crackCtx = cv.getContext("2d")!;
  const crackTex = new THREE.CanvasTexture(cv);
  crackTex.magFilter = THREE.NearestFilter;
  crackTex.minFilter = THREE.NearestFilter;

  // Fixed deterministic branches for progressive cracking
  interface CrackBranch {
    startStage: number;
    pts: [number, number][];
  }

  const CRACK_BRANCHES: CrackBranch[] = [
    // Center core fissure
    { startStage: 1, pts: [[32, 28], [30, 33], [34, 37], [31, 42]] },
    { startStage: 1, pts: [[30, 33], [25, 34], [22, 31]] },
    // Stage 2 extension
    { startStage: 2, pts: [[34, 37], [39, 38], [43, 34], [48, 36]] },
    { startStage: 2, pts: [[32, 28], [33, 23], [28, 20]] },
    // Stage 3 extension
    { startStage: 3, pts: [[22, 31], [18, 30], [15, 24], [11, 22]] },
    { startStage: 3, pts: [[31, 42], [35, 47], [32, 52]] },
    // Stage 4 extension
    { startStage: 4, pts: [[28, 20], [29, 14], [24, 10], [22, 5]] },
    { startStage: 4, pts: [[43, 34], [46, 28], [52, 26]] },
    // Stage 5 secondary fissures
    { startStage: 5, pts: [[32, 52], [30, 57], [34, 61]] },
    { startStage: 5, pts: [[25, 34], [23, 41], [19, 45], [14, 47]] },
    // Stage 6 branching
    { startStage: 6, pts: [[48, 36], [54, 40], [58, 43], [62, 42]] },
    { startStage: 6, pts: [[33, 23], [38, 21], [42, 16], [45, 11]] },
    // Stage 7 spiderweb rings
    { startStage: 7, pts: [[18, 30], [20, 24], [28, 20]] },
    { startStage: 7, pts: [[35, 47], [41, 45], [48, 36]] },
    // Stage 8 heavy fractures
    { startStage: 8, pts: [[52, 26], [56, 21], [60, 15]] },
    { startStage: 8, pts: [[19, 45], [23, 51], [27, 56]] },
    // Stage 9 periphery edges
    { startStage: 9, pts: [[42, 16], [48, 15], [54, 10]] },
    { startStage: 9, pts: [[15, 24], [12, 17], [8, 12], [4, 8]] },
    // Stage 10 fully shattered
    { startStage: 10, pts: [[23, 41], [29, 44], [34, 37]] },
    { startStage: 10, pts: [[14, 47], [10, 52], [6, 56]] },
    { startStage: 10, pts: [[54, 40], [50, 48], [46, 54], [42, 59]] },
  ];

  function redrawCracks(stage: number) {
    crackCtx.clearRect(0, 0, 64, 64);
    if (stage <= 0) {
      crackTex.needsUpdate = true;
      return;
    }

    // Pass 1: Dark outer crack outline
    crackCtx.lineWidth = 2.4;
    crackCtx.strokeStyle = "rgba(10, 8, 6, 0.95)";
    crackCtx.lineCap = "round";
    crackCtx.lineJoin = "miter";
    for (const b of CRACK_BRANCHES) {
      if (b.startStage > stage) continue;
      crackCtx.beginPath();
      crackCtx.moveTo(b.pts[0][0], b.pts[0][1]);
      for (let i = 1; i < b.pts.length; i++) {
        crackCtx.lineTo(b.pts[i][0], b.pts[i][1]);
      }
      crackCtx.stroke();
    }

    // Pass 2: Inner highlight / core line
    crackCtx.lineWidth = 1.0;
    crackCtx.strokeStyle = "rgba(45, 38, 32, 0.9)";
    for (const b of CRACK_BRANCHES) {
      if (b.startStage > stage) continue;
      crackCtx.beginPath();
      crackCtx.moveTo(b.pts[0][0], b.pts[0][1]);
      for (let i = 1; i < b.pts.length; i++) {
        crackCtx.lineTo(b.pts[i][0], b.pts[i][1]);
      }
      crackCtx.stroke();
    }

    crackTex.needsUpdate = true;
  }
  redrawCracks(1);

  // 3D cube overlay enclosing all 6 faces of the block
  const crackGeo = new THREE.BoxGeometry(1.006, 1.006, 1.006);
  const crackMat = new THREE.MeshBasicMaterial({
    map: crackTex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const crack = new THREE.Mesh(crackGeo, crackMat);
  crack.visible = false;
  crack.renderOrder = 4;
  scene.add(crack);

  const showCrack = (x: number, y: number, z: number, _nx?: number, _ny?: number, _nz?: number) => {
    crack.visible = true;
    crack.position.set(x + 0.5, y + 0.5, z + 0.5);
    crack.rotation.set(0, 0, 0);
  };
  const setCrackStage = (stage: number) => {
    const s = Math.max(1, Math.min(10, Math.ceil(stage)));
    crackMat.opacity = Math.min(1.0, 0.45 + (s / 10) * 0.55);
    redrawCracks(s);
  };
  const hideCrack = () => { crack.visible = false; };

  // ---- Target highlight outline ----
  const outlineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
  const outlineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  const outline = new THREE.LineSegments(outlineGeo, outlineMat);
  outline.visible = false;
  scene.add(outline);
  const showOutline = (x: number, y: number, z: number) => {
    outline.visible = true;
    outline.position.set(x + 0.5, y + 0.5, z + 0.5);
  };
  const hideOutline = () => { outline.visible = false; };

  function update(dt: number) {
    let dirty = false;
    for (let i = 0; i < POOL; i++) {
      if (lives[i] <= 0) continue;
      lives[i] -= dt;
      if (lives[i] <= 0) {
        dummy.position.set(0, -500, 0);
        dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        particles.setMatrixAt(i, dummy.matrix);
        dirty = true;
        continue;
      }
      particles.getMatrixAt(i, tmpMat);
      tmpMat.decompose(dummy.position, dummy.quaternion, dummy.scale);
      if (types[i] === 1) {
        // Buoyant fireplace ember: gentle upward float + soft thermal flutter
        vels[i * 3 + 1] = Math.max(0.45, vels[i * 3 + 1] - 0.4 * dt);
        dummy.position.x += (vels[i * 3] + Math.sin(lives[i] * 12) * 0.22) * dt;
        dummy.position.y += vels[i * 3 + 1] * dt;
        dummy.position.z += (vels[i * 3 + 2] + Math.cos(lives[i] * 12) * 0.22) * dt;
      } else if (types[i] === 2) {
        // Ambient rise (smoke/embers/portal wisps): slow buoyant climb, no flicker decay
        dummy.position.x += (vels[i * 3] + Math.sin(lives[i] * 9) * 0.15) * dt;
        dummy.position.y += vels[i * 3 + 1] * dt;
        dummy.position.z += (vels[i * 3 + 2] + Math.cos(lives[i] * 9) * 0.15) * dt;
      } else if (types[i] === 3) {
        // Drips: accelerate down fast, die young
        vels[i * 3 + 1] -= GRAVITY * 1.6 * dt;
        dummy.position.x += vels[i * 3] * dt;
        dummy.position.y += vels[i * 3 + 1] * dt;
        dummy.position.z += vels[i * 3 + 2] * dt;
      } else if (types[i] === 4) {
        // Leaf flutter: lazy descent with wide sideways sway
        dummy.position.x += (vels[i * 3] + Math.sin(lives[i] * 5) * 0.55) * dt;
        dummy.position.y += vels[i * 3 + 1] * dt;
        dummy.position.z += (vels[i * 3 + 2] + Math.cos(lives[i] * 5) * 0.55) * dt;
      } else if (types[i] === 5) {
        // Sparkle shimmer: near-hover with a faint tremble
        dummy.position.x += (vels[i * 3] + Math.sin(lives[i] * 20) * 0.06) * dt;
        dummy.position.y += vels[i * 3 + 1] * dt;
        dummy.position.z += (vels[i * 3 + 2] + Math.cos(lives[i] * 20) * 0.06) * dt;
      } else {
        // Regular gravity-affected debris
        vels[i * 3 + 1] -= GRAVITY * dt;
        dummy.position.x += vels[i * 3] * dt;
        dummy.position.y += vels[i * 3 + 1] * dt;
        dummy.position.z += vels[i * 3 + 2] * dt;
      }
      dummy.rotation.x += dt * 5;
      dummy.rotation.y += dt * 4;
      const k = Math.max(0, lives[i] / (maxLives[i] || LIFETIME));
      dummy.scale.setScalar(Math.max(0.001, k * (baseScale[i] || 1)));
      dummy.updateMatrix();
      particles.setMatrixAt(i, dummy.matrix);
      dirty = true;
    }
    if (dirty) particles.instanceMatrix.needsUpdate = true;
  }

  return { particles, crack, outline, spawnBurst, spawnFireplaceEmbers, spawnMote, showCrack, setCrackStage, hideCrack, showOutline, hideOutline, update };
}

/** Sample mean tile luminance (4x4 texels, Rec.709) for albedo estimation. */
export function sampleAtlasMeanLuma(tex: THREE.CanvasTexture | null, tile: number): number | null {
  if (!tex || !tex.image || !(tex.image as HTMLCanvasElement).getContext) return null;
  try {
    const cv = tex.image as HTMLCanvasElement;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const ATLAS_TILES = 32;
    const tx = (tile % ATLAS_TILES) * 16, ty = (Math.floor(tile / ATLAS_TILES)) * 16;
    const d = ctx.getImageData(tx, ty, 16, 16).data;
    let sum = 0, n = 0;
    for (let y = 2; y < 16; y += 4) {
      for (let x = 2; x < 16; x += 4) {
        const o = (y * 16 + x) * 4;
        sum += 0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2];
        n++;
      }
    }
    return sum / (n * 255);
  } catch {
    return null;
  }
}

/** Sample average atlas color for a tile id, from the CanvasTexture image (procedural canvas). */
export function sampleAtlasColor(tex: THREE.CanvasTexture | null, tile: number): THREE.Color | null {
  if (!tex || !tex.image || !(tex.image as HTMLCanvasElement).getContext) return null;
  try {
    const cv = tex.image as HTMLCanvasElement;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const ATLAS_TILES = 32;
    const tx = (tile % ATLAS_TILES) * 16 + 8, ty = (Math.floor(tile / ATLAS_TILES)) * 16 + 8;
    const d = ctx.getImageData(tx, ty, 1, 1).data;
    return new THREE.Color(d[0] / 255, d[1] / 255, d[2] / 255);
  } catch {
    return null;
  }
}
