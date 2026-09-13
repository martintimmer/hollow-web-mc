import * as THREE from "three";
import type { VoxelPayload } from "../services/customAssets";

export interface FaceTextures {
  side?: string | null;
  top?: string | null;
  bottom?: string | null;
}

export interface Offset3 {
  x: number;
  y: number;
  z: number;
}

function decodeGrid(data: string): Uint8Array {
  const bin = atob(data);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function loadTex(url: string): THREE.CanvasTexture | null {
  try {
    const img = new Image();
    img.src = url;
    const t = new THREE.CanvasTexture(img as any);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if ((img as any).complete && (img as any).naturalWidth > 0) t.needsUpdate = true;
    return t;
  } catch {
    return null;
  }
}

function faceMat(url: string | null | undefined, base: THREE.Color): THREE.Material {
  const map = url ? loadTex(url) : null;
  return new THREE.MeshLambertMaterial({
    map: map || null,
    color: map ? 0xffffff : base,
    side: THREE.DoubleSide,
    transparent: false,
    depthTest: true,
    depthWrite: true
  });
}

function buildBlock(voxel: VoxelPayload, faces: FaceTextures): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const base = new THREE.Color(voxel.palette?.[0] || "#ffffff");
  const mats = [
    faceMat(faces.side, base), faceMat(faces.side, base),
    faceMat(faces.top, base), faceMat(faces.bottom, base),
    faceMat(faces.side, base), faceMat(faces.side, base)
  ];
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

const FACES = [
  { dx: 1, corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] }, // +X
  { dx: -1, corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] }, // -X
  { dy: 1, corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] }, // +Y
  { dy: -1, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] }, // -Y
  { dz: 1, corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] }, // +Z
  { dz: -1, corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] }  // -Z
];

function buildVoxel(voxel: VoxelPayload, decodedTile: DecodedTile | null): THREE.Group {
  const { gx, gy, gz, data } = voxel.grid;
  const grid = decodeGrid(data);
  const totW = gx / voxel.res;   // total grid width in blocks
  const totH = gy / voxel.res;
  const totD = gz / voxel.res;
  const cellW = totW / gx;
  const cellH = totH / gy;
  const cellD = totD / gz;
  const minX = -totW / 2, minY = -totH / 2, minZ = -totD / 2;
  const palette = voxel.palette || ["#ffffff"];
  const color = new THREE.Color();

  // T2: per-voxel texture sampling — each voxel's center-UV samples the baked
  // tile, so the fence shows smooth grain instead of quantized palette bands.
  const tile = decodedTile;
  const packedUvs = voxel.uvs ? decodeU16(voxel.uvs) : null;

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const solid = (x: number, y: number, z: number): boolean => {
    if (x < 0 || y < 0 || z < 0 || x >= gx || y >= gy || z >= gz) return false;
    return grid[x + y * gx + z * gx * gy] > 0;
  };

  let uvIdx = 0; // compact uvs: one Uint16 per solid cell in scan order
  for (let i = 0; i < gx; i++) for (let j = 0; j < gy; j++) for (let k = 0; k < gz; k++) {
    const idx = grid[i + j * gx + k * gx * gy];
    if (!idx) continue;
    let r: number, g: number, b: number;
    color.set(palette[idx - 1] || "#ffffff");
    const palR = color.r, palG = color.g, palB = color.b;
    const pv = packedUvs ? packedUvs[uvIdx++] : 0xffff;
    if (tile && pv !== 0xffff) {
      const u = (pv >>> 8) / 255, v = (pv & 0xff) / 255;
      const sx = Math.min(tile.w - 1, Math.floor(u * tile.w));
      const sy = Math.min(tile.h - 1, Math.floor((1 - v) * tile.h));
      const pi = (sy * tile.w + sx) * 4;
      const tr = tile.data[pi] / 255, tg = tile.data[pi + 1] / 255, tb = tile.data[pi + 2] / 255;
      // Guard against tile downscaling artifacts / material mismatch:
      // If the tile color diverges from the voted voxel palette color, fall back to
      // the exact palette color so black rubber tires, cabin glass, and stripes stay crisp.
      const distSq = (tr - palR) ** 2 + (tg - palG) ** 2 + (tb - palB) ** 2;
      if (distSq <= 0.09) {
        r = tr; g = tg; b = tb;
      } else {
        r = palR; g = palG; b = palB;
      }
    } else {
      r = palR; g = palG; b = palB;
    }
    const x0 = minX + i * cellW, y0 = minY + j * cellH, z0 = minZ + k * cellD;
    for (const f of FACES) {
      const nx = i + (f.dx || 0), ny = j + (f.dy || 0), nz = k + (f.dz || 0);
      if (solid(nx, ny, nz)) continue;
      const base = positions.length / 3;
      for (const [a, cc, c] of f.corners) {
        positions.push(x0 + a * cellW, y0 + cc * cellH, z0 + c * cellD);
        colors.push(r, g, b);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  const group = new THREE.Group();
  if (positions.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: false,
      depthTest: true,
      depthWrite: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

function decodeU16(base64: string): Uint16Array {
  const bin = atob(base64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Uint16Array(u8.buffer);
}

export interface DecodedTile {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

export function buildVoxelMesh(voxel: VoxelPayload, faces: FaceTextures = {}, offset: Offset3 = { x: 0, y: 0, z: 0 }, decodedTile: DecodedTile | null = null): THREE.Group {
  const group = voxel.kind === "block" ? buildBlock(voxel, faces) : buildVoxel(voxel, decodedTile);
  group.userData.voxel = true;
  // Offset shifts the model within its 1×1×1 cell (set via editor.html Positioning).
  // Applied to mesh positions so it survives clone() in the entity path.
  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.position.x += offset.x;
      o.position.y += offset.y;
      o.position.z += offset.z;
    }
  });
  return group;
}