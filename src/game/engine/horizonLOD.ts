import * as THREE from "three";
import { BLOCK_MAP } from "../blocks";

export interface HorizonColumn {
  h: number;
  top: number;
}

export interface HorizonLODOptions {
  centerX: number;
  centerZ: number;
  nearRadiusBlocks: number;
  farRadiusBlocks: number;
  seed: string | number;
  sampleColumn: (x: number, z: number) => HorizonColumn;
}

const EPS = 0.0015;
const ATLAS_TILES = 32;
const SKIRT_DEPTH = 5;
const OVERLAP_BLOCKS = 8;
const Y_BIAS_OVERLAP = 0.15;

const farMatCache = new WeakMap<object, THREE.MeshLambertMaterial>();
const fallbackFarMat = { current: null as THREE.MeshLambertMaterial | null };

export function getFarHorizonMaterial(map: THREE.Texture | null | undefined): THREE.Material {
  if (map && typeof map === "object") {
    const hit = farMatCache.get(map as object);
    if (hit) return hit;
    const m = new THREE.MeshLambertMaterial({
      map: map as THREE.Texture,
      vertexColors: true,
      fog: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
    });
    farMatCache.set(map as object, m);
    return m;
  }
  if (!fallbackFarMat.current) {
    fallbackFarMat.current = new THREE.MeshLambertMaterial({
      vertexColors: true,
      fog: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
    });
  }
  return fallbackFarMat.current;
}

let columnCacheSeed: string | number | null = null;
const columnCache = new Map<string, HorizonColumn>();

function cachedColumn(
  sampleColumn: (x: number, z: number) => HorizonColumn,
  seed: string | number,
  x: number,
  z: number
): HorizonColumn {
  if (columnCacheSeed !== seed) {
    columnCacheSeed = seed;
    columnCache.clear();
  }
  const k = x + "," + z;
  const hit = columnCache.get(k);
  if (hit) return hit;
  const v = sampleColumn(x, z);
  if (columnCache.size > 100000) columnCache.clear();
  columnCache.set(k, v);
  return v;
}

interface TileBuckets {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  indices: number[];
}

function tileIndexFor(cx: number, cz: number, centerX: number, centerZ: number): number {
  const east = cx >= centerX ? 1 : 0;
  const south = cz >= centerZ ? 2 : 0;
  return east + south;
}

function pushSkirt(
  b: TileBuckets,
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  nx: number, nz: number,
  u0: number, u1: number, v0: number,
  shade: number
): void {
  const base = b.positions.length / 3;
  const yBot0 = y0 - SKIRT_DEPTH;
  const yBot1 = y1 - SKIRT_DEPTH;
  b.positions.push(x0, y0, z0, x1, y1, z1, x0, yBot0, z0, x1, yBot1, z1);
  for (let i = 0; i < 4; i++) b.normals.push(nx, 0, nz);
  b.uvs.push(u0, v0, u1, v0, u0, v0, u1, v0);
  const s = shade * 0.75;
  for (let i = 0; i < 4; i++) b.colors.push(s, s, s);
  b.indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
}

export function buildHorizonLODTiles(
  opts: HorizonLODOptions,
  map: THREE.Texture | null | undefined
): THREE.Group | null {
  const { centerX, centerZ, nearRadiusBlocks, farRadiusBlocks, seed, sampleColumn } = opts;

  const r0base = Math.max(0, nearRadiusBlocks - OVERLAP_BLOCKS);
  const rSpan = farRadiusBlocks - r0base;
  const midRadius1 = Math.round(r0base + rSpan * 0.3);
  const midRadius2 = Math.round(r0base + rSpan * 0.65);

  const rings = [
    { r0: r0base, r1: midRadius1, step: 4 },
    { r0: midRadius1, r1: midRadius2, step: 8 },
    { r0: midRadius2, r1: farRadiusBlocks, step: 16 },
  ];

  const tiles: TileBuckets[] = [
    { positions: [], normals: [], uvs: [], colors: [], indices: [] },
    { positions: [], normals: [], uvs: [], colors: [], indices: [] },
    { positions: [], normals: [], uvs: [], colors: [], indices: [] },
    { positions: [], normals: [], uvs: [], colors: [], indices: [] },
  ];

  for (const ring of rings) {
    const { r0, r1, step } = ring;
    const minX = Math.floor((centerX - r1) / step) * step;
    const maxX = Math.ceil((centerX + r1) / step) * step;
    const minZ = Math.floor((centerZ - r1) / step) * step;
    const maxZ = Math.ceil((centerZ + r1) / step) * step;

    for (let z = minZ; z < maxZ; z += step) {
      for (let x = minX; x < maxX; x += step) {
        const dMin = Math.min(
          Math.hypot(x - centerX, z - centerZ),
          Math.hypot(x + step - centerX, z - centerZ),
          Math.hypot(x - centerX, z + step - centerZ),
          Math.hypot(x + step - centerX, z + step - centerZ)
        );
        const qcx = x + step * 0.5;
        const qcz = z + step * 0.5;
        const dCenter = Math.hypot(qcx - centerX, qcz - centerZ);
        if (dMin < r0 || dCenter > r1) continue;

        const x0 = x, x1 = x + step;
        const z0 = z, z1 = z + step;

        const s00 = cachedColumn(sampleColumn, seed, x0, z0);
        const s10 = cachedColumn(sampleColumn, seed, x1, z0);
        const s01 = cachedColumn(sampleColumn, seed, x0, z1);
        const s11 = cachedColumn(sampleColumn, seed, x1, z1);

        const isWater = s00.h <= 62;
        let y00 = isWater ? 62 : s00.h;
        let y10 = s10.h <= 62 ? 62 : s10.h;
        let y01 = s01.h <= 62 ? 62 : s01.h;
        let y11 = s11.h <= 62 ? 62 : s11.h;

        if (dCenter < nearRadiusBlocks + 4) {
          y00 -= Y_BIAS_OVERLAP;
          y10 -= Y_BIAS_OVERLAP;
          y01 -= Y_BIAS_OVERLAP;
          y11 -= Y_BIAS_OVERLAP;
        }

        let tile = 0;
        if (isWater) {
          tile = 11;
        } else {
          const blockId = s00.top || 1;
          const bDef = BLOCK_MAP.get(blockId);
          tile = (bDef?.top ?? bDef?.side) ?? 0;
        }
        const tx = tile % ATLAS_TILES;
        const ty = (tile / ATLAS_TILES) | 0;

        const u0 = (tx + EPS) / ATLAS_TILES;
        const u1 = (tx + 1 - EPS) / ATLAS_TILES;
        const v0 = (ATLAS_TILES - ty - 1 + EPS) / ATLAS_TILES;
        const v1 = (ATLAS_TILES - ty - EPS) / ATLAS_TILES;

        const dx = (y10 + y11) - (y00 + y01);
        const dz = (s01.h + s11.h) - (s00.h + s10.h);
        const nx = -dx / (2 * step);
        const ny = 1.0;
        const nz = -dz / (2 * step);
        const len = Math.hypot(nx, ny, nz) || 1;
        const normX = nx / len, normY = ny / len, normZ = nz / len;

        const sunFactor = Math.max(0.45, Math.min(1.0, 0.75 + normY * 0.25 - normX * 0.15));

        const b = tiles[tileIndexFor(qcx, qcz, centerX, centerZ)];
        const baseIdx = b.positions.length / 3;

        b.positions.push(x0, y00, z0);
        b.normals.push(normX, normY, normZ);
        b.uvs.push(u0, v0);
        b.colors.push(sunFactor, sunFactor, sunFactor);

        b.positions.push(x1, y10, z0);
        b.normals.push(normX, normY, normZ);
        b.uvs.push(u1, v0);
        b.colors.push(sunFactor, sunFactor, sunFactor);

        b.positions.push(x0, y01, z1);
        b.normals.push(normX, normY, normZ);
        b.uvs.push(u0, v1);
        b.colors.push(sunFactor, sunFactor, sunFactor);

        b.positions.push(x1, y11, z1);
        b.normals.push(normX, normY, normZ);
        b.uvs.push(u1, v1);
        b.colors.push(sunFactor, sunFactor, sunFactor);

        b.indices.push(baseIdx, baseIdx + 2, baseIdx + 1);
        b.indices.push(baseIdx + 1, baseIdx + 2, baseIdx + 3);

        if (dMin < r0 + step * 1.5) {
          pushSkirt(b, x0, y00, z0, x1, y10, z0, 0, -1, u0, u1, v0, sunFactor);
          pushSkirt(b, x1, y10, z0, x1, y11, z1, 1, 0, u0, u1, v0, sunFactor);
          pushSkirt(b, x1, y11, z1, x0, y01, z1, 0, 1, u0, u1, v0, sunFactor);
          pushSkirt(b, x0, y01, z1, x0, y00, z0, -1, 0, u0, u1, v0, sunFactor);
        }
      }
    }
  }

  let totalIdx = 0;
  for (const t of tiles) totalIdx += t.indices.length;
  if (totalIdx === 0) return null;

  const mat = getFarHorizonMaterial(map);
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  group.updateMatrix();
  group.renderOrder = 1;

  for (const t of tiles) {
    if (!t.indices.length) continue;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(t.positions, 3));
    geom.setAttribute("normal", new THREE.Float32BufferAttribute(t.normals, 3));
    geom.setAttribute("uv", new THREE.Float32BufferAttribute(t.uvs, 2));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(t.colors, 3));
    geom.setIndex(new THREE.BufferAttribute(new Uint32Array(t.indices), 1));
    geom.computeBoundingSphere();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.renderOrder = 1;
    group.add(mesh);
  }

  if (group.children.length === 0) return null;
  return group;
}

/**
 * Builds a single continuous 2.5D Distant Horizon LOD mesh
 * spanning from nearRadiusBlocks out to farRadiusBlocks.
 * Uses 0 voxel arrays and executes in 1 single WebGL draw call.
 */
export function buildHorizonLODMesh(opts: {
  centerX: number;
  centerZ: number;
  nearRadiusBlocks: number;
  farRadiusBlocks: number;
  sampleSurface: (x: number, z: number) => { h: number; top: number; sub: number; cold?: boolean; frozen?: boolean; slope?: number };
}, matOpaque: THREE.Material): THREE.Mesh | null {
  const { centerX, centerZ, nearRadiusBlocks, farRadiusBlocks, sampleSurface } = opts;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // Multi-tier Smooth Horizon LOD Rings:
  // Ring 1: High-res seamless border (step 16 = 1 chunk / quad, zero tearing)
  // Ring 2: Mid-range horizon (step 32 = 2 chunks / quad)
  // Ring 3: Distant mountain skybox (step 64 = 4 chunks / quad)
  const rSpan = farRadiusBlocks - nearRadiusBlocks;
  const midRadius1 = Math.round(nearRadiusBlocks + rSpan * 0.3);
  const midRadius2 = Math.round(nearRadiusBlocks + rSpan * 0.65);

  const rings = [
    { r0: nearRadiusBlocks, r1: midRadius1, step: 16 },
    { r0: midRadius1, r1: midRadius2, step: 32 },
    { r0: midRadius2, r1: farRadiusBlocks, step: 64 }
  ];

  for (const ring of rings) {
    const { r0, r1, step } = ring;
    const minX = Math.floor((centerX - r1) / step) * step;
    const maxX = Math.ceil((centerX + r1) / step) * step;
    const minZ = Math.floor((centerZ - r1) / step) * step;
    const maxZ = Math.ceil((centerZ + r1) / step) * step;

    for (let z = minZ; z < maxZ; z += step) {
      for (let x = minX; x < maxX; x += step) {
        const dMin = Math.min(
          Math.hypot(x - centerX, z - centerZ),
          Math.hypot(x + step - centerX, z - centerZ),
          Math.hypot(x - centerX, z + step - centerZ),
          Math.hypot(x + step - centerX, z + step - centerZ)
        );
        const dCenter = Math.hypot(x + step * 0.5 - centerX, z + step * 0.5 - centerZ);
        if (dMin < r0 || dCenter > r1) continue;

        // 4 Quad Vertices in World Space
        const x0 = x, x1 = x + step;
        const z0 = z, z1 = z + step;

        const s00 = sampleSurface(x0, z0);
        const s10 = sampleSurface(x1, z0);
        const s01 = sampleSurface(x0, z1);
        const s11 = sampleSurface(x1, z1);

        const isWater = s00.h <= 62;
        const y00 = isWater ? 62 : s00.h;
        const y10 = s10.h <= 62 ? 62 : s10.h;
        const y01 = s01.h <= 62 ? 62 : s01.h;
        const y11 = s11.h <= 62 ? 62 : s11.h;

        // Block texture for this quad (Water tile 11 for ocean, surface block for land)
        let tile = 0;
        if (isWater) {
          tile = 11; // Calm Water Texture
        } else {
          const blockId = s00.top || 1;
          const bDef = BLOCK_MAP.get(blockId);
          tile = (bDef?.top ?? bDef?.side) ?? 0;
        }
        const tx = tile % ATLAS_TILES;
        const ty = (tile / ATLAS_TILES) | 0;

        const u0 = (tx + EPS) / ATLAS_TILES;
        const u1 = (tx + 1 - EPS) / ATLAS_TILES;
        const v0 = (ATLAS_TILES - ty - 1 + EPS) / ATLAS_TILES;
        const v1 = (ATLAS_TILES - ty - EPS) / ATLAS_TILES;

        // Quad normal calculation
        const dx = (y10 + y11) - (y00 + y01);
        const dz = (s01.h + s11.h) - (s00.h + s10.h);
        const nx = -dx / (2 * step);
        const ny = 1.0;
        const nz = -dz / (2 * step);
        const len = Math.hypot(nx, ny, nz) || 1;
        const normX = nx / len, normY = ny / len, normZ = nz / len;

        // Natural sunlight intensity on slope
        const sunFactor = Math.max(0.45, Math.min(1.0, 0.75 + normY * 0.25 - normX * 0.15));

        const baseIdx = positions.length / 3;

        // Vertex 0: (x0, y00, z0)
        positions.push(x0, y00, z0);
        normals.push(normX, normY, normZ);
        uvs.push(u0, v0);
        colors.push(sunFactor, sunFactor, sunFactor);

        // Vertex 1: (x1, y10, z0)
        positions.push(x1, y10, z0);
        normals.push(normX, normY, normZ);
        uvs.push(u1, v0);
        colors.push(sunFactor, sunFactor, sunFactor);

        // Vertex 2: (x0, y01, z1)
        positions.push(x0, y01, z1);
        normals.push(normX, normY, normZ);
        uvs.push(u0, v1);
        colors.push(sunFactor, sunFactor, sunFactor);

        // Vertex 3: (x1, y11, z1)
        positions.push(x1, y11, z1);
        normals.push(normX, normY, normZ);
        uvs.push(u1, v1);
        colors.push(sunFactor, sunFactor, sunFactor);

        // 2 Triangles for Quad
        indices.push(baseIdx, baseIdx + 2, baseIdx + 1);
        indices.push(baseIdx + 1, baseIdx + 2, baseIdx + 3);
      }
    }
  }

  if (indices.length === 0) return null;

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
  geom.computeBoundingSphere();

  const mesh = new THREE.Mesh(geom, matOpaque);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.renderOrder = 1;

  return mesh;
}
