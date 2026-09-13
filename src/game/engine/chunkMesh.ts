import * as THREE from "three";
import { isOpaque, isFence, isSolid, BLOCK_MAP, BED_BYTE, BED_ID } from "../blocks";
import type { BlockDef } from "../blocks";
import type { SerializedMeshBuffers } from "./meshWorker";

export class TypedMeshBuffer {
  pos: number[] = [];
  norm: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];

  clear() {
    this.pos.length = 0;
    this.norm.length = 0;
    this.uv.length = 0;
    this.col.length = 0;
    this.idx.length = 0;
  }
}

export type MeshBuffer = TypedMeshBuffer;

export interface ChunkMeshingContext {
  cx: number;
  cz: number;
  data: Uint16Array;
  maxY: number;
  meshes: THREE.Mesh[] | null;
  emitterKeys?: string[];
}

export const FACES = [
  { dir: [-1, 0, 0], shade: 0.86, corners: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 1, 1, 0]] },
  { dir: [1, 0, 0], shade: 0.86, corners: [[1, 1, 1, 0, 1], [1, 0, 1, 0, 0], [1, 1, 0, 1, 1], [1, 0, 0, 1, 0]] },
  { dir: [0, -1, 0], shade: 0.7, corners: [[1, 0, 1, 1, 0], [0, 0, 1, 0, 0], [1, 0, 0, 1, 1], [0, 0, 0, 0, 1]] },
  { dir: [0, 1, 0], shade: 1.0, corners: [[0, 1, 1, 1, 1], [1, 1, 1, 0, 1], [0, 1, 0, 1, 0], [1, 1, 0, 0, 0]] },
  { dir: [0, 0, -1], shade: 0.93, corners: [[1, 0, 0, 0, 0], [0, 0, 0, 1, 0], [1, 1, 0, 0, 1], [0, 1, 0, 1, 1]] },
  { dir: [0, 0, 1], shade: 0.93, corners: [[0, 0, 1, 0, 0], [1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 1, 1, 1]] }
];

export const AOB = [0.6, 0.74, 0.88, 1.0];
export const EPS = 0.0015;
export const ATLAS_TILES = 32;

export const emptyBuf = (): MeshBuffer => new TypedMeshBuffer();

export function pushFace(
  t: MeshBuffer,
  x: number,
  y: number,
  z: number,
  f: typeof FACES[0],
  tile: number,
  getBlock: (x: number, y: number, z: number) => number,
  fast = false,
  tint?: [number, number, number] | null
) {
  const base = t.pos.length / 3;
  const nx = f.dir[0], ny = f.dir[1], nz = f.dir[2];
  const tx = tile % ATLAS_TILES, ty = (tile / ATLAS_TILES) | 0;
  const shade = f.shade;

  for (let i = 0; i < 4; i++) {
    const cn = f.corners[i];
    const px = cn[0], py = cn[1], pz = cn[2], u = cn[3], v = cn[4];
    t.pos.push(x + px, y + py, z + pz);
    t.norm.push(nx, ny, nz);
    t.uv.push((tx + (u ? 1 - EPS : EPS)) / ATLAS_TILES, (ATLAS_TILES - 1 - ty + (v ? 1 - EPS : EPS)) / ATLAS_TILES);

    // Fast 3-Block Ambient Occlusion Lookup (skipped in fast-far mode: flat shade)
    const p = [px, py, pz], ax: [number, number][] = [];
    for (let a = 0; a < 3; a++) if (f.dir[a] === 0) ax.push([a, p[a] === 1 ? 1 : -1]);
    const o1 = [0, 0, 0], o2 = [0, 0, 0], o3 = [0, 0, 0];
    o1[ax[0][0]] = ax[0][1];
    o2[ax[1][0]] = ax[1][1];
    o3[ax[0][0]] = ax[0][1];
    o3[ax[1][0]] = ax[1][1];

    let ao = 3;
    if (!fast) {
      const s1 = isOpaque(getBlock(x + nx + o1[0], y + ny + o1[1], z + nz + o1[2])) ? 1 : 0;
      const s2 = isOpaque(getBlock(x + nx + o2[0], y + ny + o2[1], z + nz + o2[2])) ? 1 : 0;
      const s3 = isOpaque(getBlock(x + nx + o3[0], y + ny + o3[1], z + nz + o3[2])) ? 1 : 0;
      ao = s1 && s2 ? 0 : 3 - (s1 + s2 + s3);
    }
    const b = Math.min(1.0, AOB[ao] * shade);
    if (tint) {
      t.col.push(
        Math.min(1.0, b * tint[0]),
        Math.min(1.0, b * tint[1]),
        Math.min(1.0, b * tint[2])
      );
    } else {
      t.col.push(b, b, b);
    }
  }
  t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
}

/** Combine packed chunk buffers (opaque+foliage+glow buckets) into ONE geometry — L4. */
export function combinePacked(bufs: Array<SerializedMeshBuffers | null>): THREE.BufferGeometry | null {
  const have = bufs.filter((b): b is SerializedMeshBuffers => !!b);
  if (!have.length) return null;
  let vTotal = 0, iTotal = 0;
  for (const b of have) { vTotal += b.pos.length / 3; iTotal += b.idx.length; }
  const pos = new Float32Array(vTotal * 3);
  const norm = new Uint8Array(vTotal * 3);
  const uv = new Uint16Array(vTotal * 2);
  const col = new Uint8Array(vTotal * 3);
  const idx = new Uint32Array(iTotal);
  let vOff = 0, iOff = 0;
  for (const b of have) {
    const n = b.pos.length / 3;
    pos.set(b.pos, vOff * 3);
    norm.set(b.norm, vOff * 3);
    uv.set(b.uv, vOff * 2);
    col.set(b.col, vOff * 3);
    for (let i = 0; i < b.idx.length; i++) idx[iOff + i] = b.idx[i] + vOff;
    vOff += n; iOff += b.idx.length;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geom.setAttribute("normal", new THREE.BufferAttribute(norm, 3, true));
  geom.setAttribute("uv", new THREE.BufferAttribute(uv, 2, true));
  geom.setAttribute("color", new THREE.BufferAttribute(col, 3, true));
  geom.setIndex(new THREE.BufferAttribute(idx, 1));
  geom.computeBoundingSphere();
  return geom;
}

export function toGeomTyped(
  pos: Float32Array,
  norm: Uint8Array,
  uv: Uint16Array,
  col: Uint8Array,
  idx: Uint32Array
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geom.setAttribute("normal", new THREE.BufferAttribute(norm, 3, true));
  geom.setAttribute("uv", new THREE.BufferAttribute(uv, 2, true));
  geom.setAttribute("color", new THREE.BufferAttribute(col, 3, true));
  geom.setIndex(new THREE.BufferAttribute(idx, 1));
  geom.computeBoundingSphere();
  return geom;
}

export function toGeom(t: MeshBuffer): THREE.BufferGeometry | null {
  if (!t.idx.length) return null;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(t.pos), 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(t.norm), 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(t.uv), 2));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(t.col), 3));
  geom.setIndex(new THREE.BufferAttribute(new Uint32Array(t.idx), 1));
  geom.computeBoundingSphere();
  return geom;
}

export function createVoxelGeometry(tileSide: number, tileTop: number, tileBot: number): THREE.BufferGeometry {
  const buf = new TypedMeshBuffer();
  for (const f of FACES) {
    const tile = f.dir[1] === 1 ? tileTop : (f.dir[1] === -1 ? tileBot : tileSide);
    pushFace(buf, -0.5, -0.5, -0.5, f, tile, () => 0);
  }
  return toGeom(buf)!;
}

export function pushStair(
  t: MeshBuffer,
  x: number,
  y: number,
  z: number,
  B: BlockDef,
  facing = 0,
  topTile?: number,
  bottomTile?: number,
  sideTile?: number
) {
  const tile = sideTile ?? B.side ?? 0;
  const top = topTile ?? B.top ?? tile;
  const bot = bottomTile ?? B.bottom ?? tile;
  // 1. Bottom slab: full 1x0.5x1 base (y in [0, 0.5])
  pushSolidBox(t, x, y, z, 0, 0, 0, 1, 0.5, 1, tile, false, false, false, false, false, false, undefined, undefined, undefined, undefined, undefined, undefined, top, bot);
  // 2. Upper step positioned according to facing direction:
  if (facing === 1) {
    pushSolidBox(t, x, y, z, 0, 0.5, 0.0, 1, 1.0, 0.5, tile, false, false, false, false, false, false, undefined, undefined, undefined, undefined, undefined, undefined, top, bot);
  } else if (facing === 2) {
    pushSolidBox(t, x, y, z, 0.5, 0.5, 0.0, 1.0, 1.0, 1.0, tile, false, false, false, false, false, false, undefined, undefined, undefined, undefined, undefined, undefined, top, bot);
  } else if (facing === 3) {
    pushSolidBox(t, x, y, z, 0.0, 0.5, 0.0, 0.5, 1.0, 1.0, tile, false, false, false, false, false, false, undefined, undefined, undefined, undefined, undefined, undefined, top, bot);
  } else {
    pushSolidBox(t, x, y, z, 0, 0.5, 0.5, 1, 1.0, 1.0, tile, false, false, false, false, false, false, undefined, undefined, undefined, undefined, undefined, undefined, top, bot);
  }
}

/**
 * Porch stair with integrated side rail (ids 1205/1206): standard two-step stair
 * profile plus a railing along one side edge. Facing-0 ascends toward +Z; the LEFT
 * variant (1205) rails the +X edge, the RIGHT variant (1206) mirrors it. All rail
 * boxes are slightly inset from the block faces so no coplanar z-fighting occurs.
 */
export function pushPorchStair(
  t: MeshBuffer,
  x: number,
  y: number,
  z: number,
  B: BlockDef,
  facing = 0,
  mirror = false,
  topTile?: number,
  bottomTile?: number,
  sideTile?: number
) {
  const side = sideTile ?? B.side ?? 0;
  const top = topTile ?? B.top ?? side;
  const bot = bottomTile ?? B.bottom ?? side;

  pushStair(t, x, y, z, B, facing, top, bot, side);
  const railBox = (
    lx0: number, y0: number, z0: number,
    lx1: number, y1: number, z1: number
  ) => {
    const mx0 = mirror ? 1 - lx1 : lx0;
    const mx1 = mirror ? 1 - lx0 : lx1;
    const [qx0, qx1, qz0, qz1] = rotateBoxFacing(facing, mx0, mx1, z0, z1);
    pushSolidBox(t, x, y, z, qx0, y0, qz0, qx1, y1, qz1, side, false, false, false, false, false, false, undefined, undefined, undefined, undefined, undefined, undefined, top, bot);
  };
  railBox(0.88, 0, 0.0625, 0.992, 1.0, 0.1875);
  railBox(0.88, 0.5, 0.28125, 0.992, 0.85, 0.34375);
  railBox(0.895, 0.85, 0.1875, 0.98, 0.97, 0.625);
}

function subTileUV(tile: number, u0Frac: number, v0Frac: number, u1Frac: number, v1Frac: number): [number, number, number, number] {
  const ATLAS_TILES = 32;
  const EPS = 0.0005;
  const uTileX = tile % ATLAS_TILES;
  const uTileY = (tile / ATLAS_TILES) | 0;
  const tU0 = (uTileX + EPS) / ATLAS_TILES;
  const tSpan = (1 - 2 * EPS) / ATLAS_TILES;
  const tV0 = (ATLAS_TILES - uTileY - 1 + EPS) / ATLAS_TILES;

  const ru0 = tU0 + Math.max(0, Math.min(1, u0Frac)) * tSpan;
  const ru1 = tU0 + Math.max(0, Math.min(1, u1Frac)) * tSpan;
  const rv0 = tV0 + Math.max(0, Math.min(1, v0Frac)) * tSpan;
  const rv1 = tV0 + Math.max(0, Math.min(1, v1Frac)) * tSpan;
  return [ru0, rv0, ru1, rv1];
}

export function pushSolidBox(
  t: MeshBuffer,
  x: number,
  y: number,
  z: number,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  tile: number,
  hideBottom = false,
  hideTop = false,
  hideNorth = false,
  hideSouth = false,
  hideWest = false,
  hideEast = false,
  topUV?: [number, number, number, number],
  bottomUV?: [number, number, number, number],
  northUV?: [number, number, number, number],
  southUV?: [number, number, number, number],
  westUV?: [number, number, number, number],
  eastUV?: [number, number, number, number],
  topTile?: number,
  bottomTile?: number
) {
  function quad(
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    norm: [number, number, number],
    shade: number,
    uvRect?: [number, number, number, number]
  ) {
    const base = t.pos.length / 3;
    let uvs: [number, number][];
    if (uvRect) {
      const [ru0, rv0, ru1, rv1] = uvRect;
      uvs = [[ru0, rv1], [ru1, rv1], [ru0, rv0], [ru1, rv0]];
    } else {
      const uTileX = tile % ATLAS_TILES,
        uTileY = (tile / ATLAS_TILES) | 0;
      uvs = [
        [(uTileX + EPS) / ATLAS_TILES, (ATLAS_TILES - uTileY - 1 + 1 - EPS) / ATLAS_TILES],
        [(uTileX + 1 - EPS) / ATLAS_TILES, (ATLAS_TILES - uTileY - 1 + 1 - EPS) / ATLAS_TILES],
        [(uTileX + EPS) / ATLAS_TILES, (ATLAS_TILES - uTileY - 1 + EPS) / ATLAS_TILES],
        [(uTileX + 1 - EPS) / ATLAS_TILES, (ATLAS_TILES - uTileY - 1 + EPS) / ATLAS_TILES]
      ];
    }
    const pts = [p0, p1, p2, p3];
    for (let i = 0; i < 4; i++) {
      t.pos.push(x + pts[i][0], y + pts[i][1], z + pts[i][2]);
      t.norm.push(norm[0], norm[1], norm[2]);
      t.uv.push(uvs[i][0], uvs[i][1]);
      t.col.push(shade, shade, shade);
    }
    t.idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }

  const tUV = topUV ?? subTileUV(topTile ?? tile, x0, z0, x1, z1);
  const bUV = bottomUV ?? subTileUV(bottomTile ?? tile, x0, z0, x1, z1);
  const nUV = northUV ?? subTileUV(tile, 1 - x1, y0, 1 - x0, y1);
  const sUV = southUV ?? subTileUV(tile, x0, y0, x1, y1);
  const wUV = westUV ?? subTileUV(tile, z0, y0, z1, y1);
  const eUV = eastUV ?? subTileUV(tile, 1 - z1, y0, 1 - z0, y1);

  // Top (+Y)
  if (!hideTop) quad([x0, y1, z0], [x1, y1, z0], [x0, y1, z1], [x1, y1, z1], [0, 1, 0], 1.0, tUV);
  // Bottom (-Y)
  if (!hideBottom) quad([x0, y0, z1], [x1, y0, z1], [x0, y0, z0], [x1, y0, z0], [0, -1, 0], 0.7, bUV);
  // North (-Z)
  if (!hideNorth) quad([x1, y1, z0], [x0, y1, z0], [x1, y0, z0], [x0, y0, z0], [0, 0, -1], 0.93, nUV);
  // South (+Z)
  if (!hideSouth) quad([x0, y1, z1], [x1, y1, z1], [x0, y0, z1], [x1, y0, z1], [0, 0, 1], 0.93, sUV);
  // West (-X)
  if (!hideWest) quad([x0, y1, z0], [x0, y1, z1], [x0, y0, z0], [x0, y0, z1], [-1, 0, 0], 0.86, wUV);
  // East (+X)
  if (!hideEast) quad([x1, y1, z1], [x1, y1, z0], [x1, y0, z1], [x1, y0, z0], [1, 0, 0], 0.86, eUV);
}

/**
 * Rotate a facing-0 (+Z plane) box's XZ extent to the given cardinal facing.
 * 0 = +Z, 1 = -Z, 2 = +X, 3 = -X (isometry: boxes stay boxes).
 */
export function rotateBoxFacing(facing: number, x0: number, x1: number, z0: number, z1: number): [number, number, number, number] {
  switch (facing) {
    case 1: return [x0, x1, 1 - z1, 1 - z0];
    case 2: return [z0, z1, x0, x1];
    case 3: return [1 - z1, 1 - z0, 1 - x1, 1 - x0];
    default: return [x0, x1, z0, z1];
  }
}

export function pushDoor(t: MeshBuffer, x: number, y: number, z: number, id: number, doorMode: 0 | 1 | 2 = 0, facing = 0) {
  // ONE leaf design, two orientations:
  //  closed : thin in Z (0.8125..1.0), width along X (0.0625..0.9375), hinge at (0.0625, 0.9375)
  //  open   : thin in X (0.0625..0.1875), width along Z (0.0625..0.9375) — swung 90° around the hinge!
  // Lower block = solid wood panels + opener handle on upper right.
  // Upper block = entire block is a 2x2 grid of transparent window openings.
  // All pieces have full 6-sided solid geometry (no missing polygons from 45° angles).
  const open = id !== 105;

  const piece = (u0: number, u1: number, y0: number, y1: number, tile: number) => {
    let bx0: number, bx1: number, bz0: number, bz1: number;
    if (open) {
      // Swung 90° around the hinge corner at (0.0625, 0.9375)
      const za = 0.9375 - 0.875 * u1;
      const zb = 0.9375 - 0.875 * u0;
      bx0 = 0.0625; bx1 = 0.1875; bz0 = za; bz1 = zb;
    } else {
      const wa = 0.0625 + 0.875 * u0, wb = 0.0625 + 0.875 * u1;
      bx0 = wa; bx1 = wb; bz0 = 0.8125; bz1 = 1.0;
    }
    const [rx0, rx1, rz0, rz1] = rotateBoxFacing(facing, bx0, bx1, bz0, bz1);
    pushSolidBox(t, x, y, z, rx0, y0, rz0, rx1, y1, rz1, tile, false, false);
  };

  if (doorMode === 2) {
    // Lower cell: Solid panel leaf with 4 wood panels, 2 hinges on left, and the iron handle on upper right
    piece(0, 1, 0, 1, 107);
    return;
  }

  // Upper cell (or standalone door): ENTIRE block is a 2x2 grid of transparent window openings
  // Top rail
  piece(0, 1, 0.8125, 1.0, 106);
  // Bottom rail
  piece(0, 1, 0.0, 0.1875, 106);
  // Center horizontal cross-rail
  piece(0, 1, 0.4375, 0.5625, 106);
  // Left vertical stile (with upper hinge)
  piece(0, 0.1875, 0.1875, 0.8125, 106);
  // Right vertical stile
  piece(0.8125, 1, 0.1875, 0.8125, 106);
  // Center vertical mullion
  piece(0.4375, 0.5625, 0.1875, 0.8125, 106);
}

export function pushTrapdoor(t: MeshBuffer, x: number, y: number, z: number, id: number, facing = 0, halfTop = false) {
  // Oak Trapdoor (Minecraft Wiki):
  // Closed (id 107): Horizontal 3/16 slab (bottom half y 0..0.1875, or top half
  //   y 0.8125..1.0 when halfTop) with a 2x2 wooden grille window.
  // Open (id 108): Vertical 3/16 slab standing against the wall on `facing`'s side.
  const open = id === 108;

  const piece = (u0: number, u1: number, v0: number, v1: number) => {
    if (open) {
      // Vertical panel against the facing wall (facing-0 space: Z 0.8125..1.0)
      const [rx0, rx1, rz0, rz1] = rotateBoxFacing(facing, u0, u1, 0.8125, 1.0);
      pushSolidBox(t, x, y, z, rx0, v0, rz0, rx1, v1, rz1, 108, false, false);
    } else {
      const y0 = halfTop ? 0.8125 : 0.0;
      const y1 = halfTop ? 1.0 : 0.1875;
      pushSolidBox(t, x, y, z, u0, y0, v0, u1, y1, v1, 108, false, false);
    }
  };

  // 2x2 Grille Frame (Top, Bottom, Left, Right, Center horizontal, Center vertical)
  piece(0, 1, 0.8125, 1.0);          // Top / Back rail
  piece(0, 1, 0.0, 0.1875);           // Bottom / Front rail
  piece(0, 0.1875, 0.1875, 0.8125);  // Left stile
  piece(0.8125, 1, 0.1875, 0.8125);  // Right stile
  piece(0, 1, 0.4375, 0.5625);       // Center horizontal crossbar
  piece(0.4375, 0.5625, 0.1875, 0.8125); // Center vertical crossbar
}

export function pushChest(t: MeshBuffer, x: number, y: number, z: number, tile?: number, facing = 0, mergeSide: -1 | 0 | 1 = 0) {
  const tt = (tile && tile > 0) ? tile : 877;
  const x0 = mergeSide === -1 ? 0.0 : 0.0625;
  const x1 = mergeSide === 1 ? 1.0 : 0.9375;
  // 1. Base + Lid 14x14x14 box
  pushSolidBox(t, x, y, z, x0, 0.0, 0.0625, x1, 0.875, 0.9375, tt, false, false);

  // 2. Front Silver Lock / Latch (always visible on front face when closed)
  const LATCH_TILE = 477;
  if (facing === 0) {
    // Front face South (+Z)
    pushSolidBox(t, x, y, z, 0.4375, 0.4375, 0.9375, 0.5625, 0.6875, 1.0, LATCH_TILE, false, false);
  } else if (facing === 1) {
    // Front face North (-Z)
    pushSolidBox(t, x, y, z, 0.4375, 0.4375, 0.0, 0.5625, 0.6875, 0.0625, LATCH_TILE, false, false);
  } else if (facing === 2) {
    // Front face East (+X)
    pushSolidBox(t, x, y, z, 0.9375, 0.4375, 0.4375, 1.0, 0.6875, 0.5625, LATCH_TILE, false, false);
  } else {
    // Front face West (-X)
    pushSolidBox(t, x, y, z, 0.0, 0.4375, 0.4375, 0.0625, 0.6875, 0.5625, LATCH_TILE, false, false);
  }
}

/* ── Light & decorative family: dedicated thin shapes instead of full 16³ cubes ── */

/** Torch: authentic slender 2px x 2px 3D stick (10px tall on floor, slanted 20° on walls) */
export function pushTorchPost(t: MeshBuffer, x: number, y: number, z: number, tile: number, orient = 0, topTile = tile, bottomTile = tile) {
  // Exact sub-tile UV mapping matching canonical vanilla Minecraft models/block/torch.json:
  // torch.png is 16x16: stick is in columns 7..8 (x: 7/16 to 9/16), rows 6..15 (y: 0 to 10/16 from bottom).
  const sideStickUV = subTileUV(tile, 7 / 16, 0.0, 9 / 16, 10 / 16);
  // Flame top cap (2x2 pixels on top of flame)
  const flameCapUV = subTileUV(topTile, 7 / 16, 8 / 16, 9 / 16, 10 / 16);
  // Wooden stick bottom cap (2x2 pixels on base of stick)
  const stickCapUV = subTileUV(bottomTile, 7 / 16, 0.0, 9 / 16, 2 / 16);

  function quad(
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    norm: [number, number, number],
    shade: number,
    uvRect: [number, number, number, number]
  ) {
    const base = t.pos.length / 3;
    const pts = [p0, p1, p2, p3];
    const [ru0, rv0, ru1, rv1] = uvRect;
    const uvs: [number, number][] = [[ru0, rv1], [ru1, rv1], [ru0, rv0], [ru1, rv0]];
    for (let i = 0; i < 4; i++) {
      t.pos.push(x + pts[i][0], y + pts[i][1], z + pts[i][2]);
      t.norm.push(norm[0], norm[1], norm[2]);
      t.uv.push(uvs[i][0], uvs[i][1]);
      t.col.push(shade, shade, shade);
    }
    t.idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }

  if (orient >= 1 && orient <= 4) {
    // Slanted slender 2px 3D wall torch angled outward from the wall face
    let p000: [number, number, number], p100: [number, number, number], p001: [number, number, number], p101: [number, number, number];
    let p010: [number, number, number], p110: [number, number, number], p011: [number, number, number], p111: [number, number, number];

    const w2 = 0.0625; // 1px half-width = 2px total (0.125)

    if (orient === 1) { // North wall (+Z facing)
      const x0 = 0.5 - w2, x1 = 0.5 + w2;
      const yB = 0.20, yT = 0.70;
      const zB0 = 0.00, zB1 = 0.125;
      const zT0 = 0.25, zT1 = 0.375;
      p000 = [x0, yB, zB0]; p100 = [x1, yB, zB0]; p001 = [x0, yB, zB1]; p101 = [x1, yB, zB1];
      p010 = [x0, yT, zT0]; p110 = [x1, yT, zT0]; p011 = [x0, yT, zT1]; p111 = [x1, yT, zT1];
    } else if (orient === 2) { // South wall (-Z facing)
      const x0 = 0.5 - w2, x1 = 0.5 + w2;
      const yB = 0.20, yT = 0.70;
      const zB0 = 0.875, zB1 = 1.00;
      const zT0 = 0.625, zT1 = 0.75;
      p000 = [x0, yB, zB0]; p100 = [x1, yB, zB0]; p001 = [x0, yB, zB1]; p101 = [x1, yB, zB1];
      p010 = [x0, yT, zT0]; p110 = [x1, yT, zT0]; p011 = [x0, yT, zT1]; p111 = [x1, yT, zT1];
    } else if (orient === 3) { // West wall (+X facing)
      const z0 = 0.5 - w2, z1 = 0.5 + w2;
      const yB = 0.20, yT = 0.70;
      const xB0 = 0.00, xB1 = 0.125;
      const xT0 = 0.25, xT1 = 0.375;
      p000 = [xB0, yB, z0]; p100 = [xB0, yB, z1]; p001 = [xB1, yB, z0]; p101 = [xB1, yB, z1];
      p010 = [xT0, yT, z0]; p110 = [xT0, yT, z1]; p011 = [xT1, yT, z0]; p111 = [xT1, yT, z1];
    } else { // East wall (-X facing)
      const z0 = 0.5 - w2, z1 = 0.5 + w2;
      const yB = 0.20, yT = 0.70;
      const xB0 = 0.875, xB1 = 1.00;
      const xT0 = 0.625, xT1 = 0.75;
      p000 = [xB0, yB, z0]; p100 = [xB0, yB, z1]; p001 = [xB1, yB, z0]; p101 = [xB1, yB, z1];
      p010 = [xT0, yT, z0]; p110 = [xT0, yT, z1]; p011 = [xT1, yT, z0]; p111 = [xT1, yT, z1];
    }

    // Top face
    quad(p010, p110, p011, p111, [0, 1, 0], 1.0, flameCapUV);
    // Bottom face
    quad(p001, p101, p000, p100, [0, -1, 0], 0.7, stickCapUV);
    // Back face (-Z)
    quad(p110, p010, p100, p000, [0, 0, -1], 0.93, sideStickUV);
    // Front face (+Z)
    quad(p011, p111, p001, p101, [0, 0, 1], 0.93, sideStickUV);
    // Left face (-X)
    quad(p010, p011, p000, p001, [-1, 0, 0], 0.86, sideStickUV);
    // Right face (+X)
    quad(p111, p110, p101, p100, [1, 0, 0], 0.86, sideStickUV);
    return;
  }

  if (orient === 5) {
    // Ceiling: slender 2px stick hangs down from ceiling (y: 0.375 .. 1.0)
    pushSolidBox(t, x, y, z, 0.4375, 0.375, 0.4375, 0.5625, 1.0, 0.5625, tile, false, false, false, false, false, false, flameCapUV, stickCapUV, sideStickUV, sideStickUV, sideStickUV, sideStickUV);
    return;
  }

  // Floor: slender 2px x 2px stick (10px tall = 0.625 height), centered on block
  pushSolidBox(t, x, y, z, 0.4375, 0.0, 0.4375, 0.5625, 0.625, 0.5625, tile, false, false, false, false, false, false, flameCapUV, stickCapUV, sideStickUV, sideStickUV, sideStickUV, sideStickUV);
}

/** Torch flame: small unlit double-cross at the stick head so the flame glows
 * at any distance (the Lambert-shaded stick alone goes dark far away / at
 * night). Flame art = top rows of the torch sprite. Goes to the glow bucket. */
export function pushTorchFlame(t: MeshBuffer, x: number, y: number, z: number, tile: number, orient = 0) {
  const [ru0, rv0, ru1, rv1] = subTileUV(tile, 5 / 16, 9 / 16, 11 / 16, 1.0);
  // Head center follows the slanted stick (mirrors pushTorchPost geometry)
  let hx = 0.5, hy = 0.62, hz = 0.5;
  if (orient === 1) { hx = 0.5; hy = 0.7; hz = 0.31; }
  else if (orient === 2) { hx = 0.5; hy = 0.7; hz = 0.69; }
  else if (orient === 3) { hx = 0.31; hy = 0.7; hz = 0.5; }
  else if (orient === 4) { hx = 0.69; hy = 0.7; hz = 0.5; }
  else if (orient === 5) { hx = 0.5; hy = 0.38; hz = 0.5; }
  const w = 0.24, h0 = hy - 0.24, h1 = hy + 0.26;
  const quads: Array<[number, number, number, number, number, number]> = [
    [hx - w, hz - w, hx + w, hz + w, 0.7, -0.7],
    [hx - w, hz + w, hx + w, hz - w, 0.7, 0.7],
  ];
  for (const [x0, z0, x1, z1, nx, nz] of quads) {
    const base = t.pos.length / 3;
    t.pos.push(x + x0, y + h1, z + z0, x + x1, y + h1, z + z1, x + x0, y + h0, z + z0, x + x1, y + h0, z + z1);
    t.norm.push(nx, 0, nz, nx, 0, nz, nx, 0, nz, nx, 0, nz);
    t.uv.push(ru0, rv1, ru1, rv1, ru0, rv0, ru1, rv0);
    t.col.push(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
    t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    t.idx.push(base + 1, base, base + 2, base + 1, base + 2, base + 3);
  }
}

/** 3D Slab: authentic half-height block (y in [0, 0.5] for bottom slab, [0.5, 1.0] for top slab). */
export function pushSlab(
  t: MeshBuffer,
  x: number,
  y: number,
  z: number,
  def: BlockDef,
  isTop = false,
  hideTop = false,
  hideBottom = false,
  hideNorth = false,
  hideSouth = false,
  hideWest = false,
  hideEast = false
) {
  const side = def.side ?? def.top ?? 1;
  const top = def.top ?? side;
  const bottom = def.bottom ?? side;

  const y0 = isTop ? 0.5 : 0.0;
  const y1 = isTop ? 1.0 : 0.5;

  const topUV = subTileUV(top, 0, 0, 1, 1);
  const bottomUV = subTileUV(bottom, 0, 0, 1, 1);
  const sideY0 = isTop ? 0.5 : 0.0;
  const sideY1 = isTop ? 1.0 : 0.5;
  const northUV = subTileUV(side, 0, sideY0, 1, sideY1);
  const southUV = subTileUV(side, 0, sideY0, 1, sideY1);
  const westUV = subTileUV(side, 0, sideY0, 1, sideY1);
  const eastUV = subTileUV(side, 0, sideY0, 1, sideY1);

  pushSolidBox(
    t,
    x,
    y,
    z,
    0,
    y0,
    0,
    1,
    y1,
    1,
    side,
    hideBottom,
    hideTop,
    hideNorth,
    hideSouth,
    hideWest,
    hideEast,
    topUV,
    bottomUV,
    northUV,
    southUV,
    westUV,
    eastUV
  );
}

/** Lantern / soul lantern: hanging cage 0.3125³ body + top ring + bottom knob.
 * The sprite's opaque art lives in the x 0..6 strip (rows 1..14); the middle
 * of the tile is a transparent gap, so map explicit windows like candles. */
export function pushLantern(t: MeshBuffer, x: number, y: number, z: number, tile: number) {
  const side = subTileUV(tile, 0, 0.0625, 0.375, 0.875);
  const cap = subTileUV(tile, 0, 0.875, 0.375, 1.0);
  const foot = subTileUV(tile, 0, 0.125, 0.375, 0.25);
  pushSolidBox(t, x, y, z, 0.34375, 0.5, 0.34375, 0.65625, 0.875, 0.65625, tile, false, false,
    false, false, false, false, side, side, side, side, side, side);
  pushSolidBox(t, x, y, z, 0.40625, 0.875, 0.40625, 0.59375, 1.0, 0.59375, tile, false, false,
    false, false, false, false, cap, cap, cap, cap, cap, cap);
  pushSolidBox(t, x, y, z, 0.421875, 0.4375, 0.421875, 0.578125, 0.5, 0.578125, tile, false, false,
    false, false, false, false, foot, foot, foot, foot, foot, foot);
}

/** End rod: thin rod with end caps. */
export function pushEndRod(t: MeshBuffer, x: number, y: number, z: number, tile: number) {
  pushSolidBox(t, x, y, z, 0.4375, 0.0, 0.4375, 0.5625, 1.0, 0.5625, tile, false, false);
  pushSolidBox(t, x, y, z, 0.375, 0.875, 0.375, 0.625, 1.0, 0.625, tile, false, false);
  pushSolidBox(t, x, y, z, 0.375, 0.0, 0.375, 0.625, 0.125, 0.625, tile, false, false);
}

const CANDLE_IDS = new Set([185, 196, 212, 232, 286, 384, 393, 436, 445, 458, 469, 508, 522, 560, 577, 693, 703]);

export function isCandleId(id: number): boolean {
  return CANDLE_IDS.has(id);
}

const CAMPFIRE_IDS = new Set([85, 86]);

export function isCampfireId(id: number): boolean {
  return CAMPFIRE_IDS.has(id);
}

const FLOWER_IDS = new Set([125, 126, 147, 157, 201, 269, 455, 456, 516, 517, 521, 530, 590, 659, 701, 702]);

export function isFlowerId(id: number): boolean {
  return FLOWER_IDS.has(id);
}

const SAPLING_IDS = new Set([144, 183, 298, 423, 504, 637]);

export function isSaplingId(id: number): boolean {
  return SAPLING_IDS.has(id);
}

const FIRE_IDS = new Set([102, 230, 628, 630]);

export function isFireId(id: number): boolean {
  return FIRE_IDS.has(id);
}

const CROSS_PLANT_IDS = new Set([
  152, 153, 155, 207, 208, 216, 223, 225, 238,
  303, 305, 306, 308, 310, 312, 313, 315, 316, 318,
  364, 365, 411, 412, 581, 666, 667,
]);

export function isCrossPlantId(id: number): boolean {
  return CROSS_PLANT_IDS.has(id);
}

const THIN_SHAPE_IDS = new Set<number>([
  127, 259, 309, 361, 429, 457, 658, 661, 674, 160, 161, BED_BYTE, BED_ID, 103, 209,
  1207, 1208, 1210,
]);

function rectsCoverUnit(rects: Array<[number, number, number, number]>): boolean {
  const xs = [...new Set([0, 1, ...rects.flatMap((r) => [r[0], r[1]])])].sort((a, b) => a - b);
  const ys = [...new Set([0, 1, ...rects.flatMap((r) => [r[2], r[3]])])].sort((a, b) => a - b);
  for (let i = 0; i + 1 < xs.length; i++) {
    for (let j = 0; j + 1 < ys.length; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      if (cx < 0 || cx > 1 || cy < 0 || cy > 1) continue;
      if (!rects.some((r) => cx >= r[0] && cx <= r[1] && cy >= r[2] && cy <= r[3])) return false;
    }
  }
  return true;
}

function propModelOccludes(id: number): boolean {
  const model = PROP_MODELS[id];
  if (!model || !model.boxes || !model.boxes.length) return false;
  const sides: Array<{ on: (b: number[]) => boolean; rect: (b: number[]) => [number, number, number, number] }> = [
    { on: (b) => b[0] <= 0, rect: (b) => [b[1], b[4], b[2], b[5]] },
    { on: (b) => b[3] >= 1, rect: (b) => [b[1], b[4], b[2], b[5]] },
    { on: (b) => b[1] <= 0, rect: (b) => [b[0], b[3], b[2], b[5]] },
    { on: (b) => b[4] >= 1, rect: (b) => [b[0], b[3], b[2], b[5]] },
    { on: (b) => b[2] <= 0, rect: (b) => [b[0], b[3], b[1], b[4]] },
    { on: (b) => b[5] >= 1, rect: (b) => [b[0], b[3], b[1], b[4]] },
  ];
  return sides.every((s) => {
    const rects = model.boxes!.filter((box) => s.on(box.b)).map((box) => s.rect(box.b));
    return rects.length > 0 && rectsCoverUnit(rects);
  });
}

export function isNonOccludingShape(id: number): boolean {
  if (isCandleId(id) || isCampfireId(id) || isFlowerId(id) || isSaplingId(id) || isFireId(id) || isCrossPlantId(id) || THIN_SHAPE_IDS.has(id)) return true;
  if (hasPropModel(id)) return !propModelOccludes(id);
  return false;
}

/** Candle: wax pillar + wick flame nub. The sprite is a 2px strip (flame rows
 * 5..8, wax rows 9..15); subTileUV fractions run 0 = tile bottom, 1 = top. */
export function pushCandle(t: MeshBuffer, x: number, y: number, z: number, tile: number) {
  const wax = subTileUV(tile, 0, 0.0625, 0.125, 0.4375);
  const flame = subTileUV(tile, 0, 0.5, 0.125, 0.6875);
  pushSolidBox(t, x, y, z, 0.375, 0, 0.375, 0.625, 0.5, 0.625, tile, false, false,
    false, false, false, false, wax, wax, wax, wax, wax, wax);
  pushSolidBox(t, x, y, z, 0.46875, 0.5, 0.46875, 0.53125, 0.625, 0.53125, tile, false, false,
    false, false, false, false, flame, flame, flame, flame, flame, flame);
}

/** Amethyst cluster: cluster of crystals (approximation with 3 prism shards). */
export function pushAmethystCluster(t: MeshBuffer, x: number, y: number, z: number, tile: number) {
  pushSolidBox(t, x, y, z, 0.15625, 0.0, 0.28125, 0.4375, 0.5, 0.5625, tile, false, false);
  pushSolidBox(t, x, y, z, 0.4375, 0.0, 0.15625, 0.84375, 0.28125, 0.5, tile, false, false);
  pushSolidBox(t, x, y, z, 0.46875, 0.0, 0.5, 0.78125, 0.71875, 0.8125, tile, false, false);
}

/** Brewing stand: plinth + center rod + double arms. Windows follow the
 * sprite rows (bottom-origin): base bands rows 10..12, rod column x 7..8,
 * arm prongs rows 4..9. */
export function pushBrewingStand(t: MeshBuffer, x: number, y: number, z: number, tile: number) {
  const plinth = subTileUV(tile, 0, 0.1875, 0.625, 0.375);
  const rod = subTileUV(tile, 0.4375, 0.0625, 0.5625, 0.875);
  const arm = subTileUV(tile, 0, 0.4375, 1, 0.75);
  pushSolidBox(t, x, y, z, 0.125, 0.0, 0.125, 0.875, 0.1875, 0.875, tile, false, false,
    false, false, false, false, plinth, plinth, plinth, plinth, plinth, plinth);
  pushSolidBox(t, x, y, z, 0.4375, 0.1875, 0.4375, 0.5625, 0.84375, 0.5625, tile, false, false,
    false, false, false, false, rod, rod, rod, rod, rod, rod);
  pushSolidBox(t, x, y, z, 0.1875, 0.625, 0.4375, 0.8125, 0.75, 0.5625, tile, false, false,
    false, false, false, false, arm, arm, arm, arm, arm, arm);
  pushSolidBox(t, x, y, z, 0.4375, 0.625, 0.1875, 0.5625, 0.75, 0.8125, tile, false, false,
    false, false, false, false, arm, arm, arm, arm, arm, arm);
}

/** Nether portal: thin vertical panel visible from both sides. */
export function pushPortalPanel(t: MeshBuffer, x: number, y: number, z: number, tile: number) {
  pushSolidBox(t, x, y, z, 0.0, 0.0, 0.4375, 1.0, 1.0, 0.5625, tile, false, false);
}

/** Ladder: thin wall panel with two rails + rungs (id 140). */
export function pushLadder(t: MeshBuffer, x: number, y: number, z: number, tile: number) {
  pushSolidBox(t, x, y, z, 0.0, 0.0, 0.40625, 1.0, 1.0, 0.59375, tile, false, false);
}

/** Red bed: mattress slab + headboard + footboard (facing +z by default). */
export function pushBed(t: MeshBuffer, x: number, y: number, z: number, tile: number) {
  // mattress (full area, 0.625 high)
  pushSolidBox(t, x, y, z, 0.0, 0.0, 0.0, 1.0, 0.625, 1.0, tile, false, false);
  // headboard (south end, full height) + footboard (north end, half height)
  pushSolidBox(t, x, y, z, 0.0, 0.0, 0.875, 1.0, 1.0, 1.0, tile, false, false);
  pushSolidBox(t, x, y, z, 0.0, 0.0, 0.0, 1.0, 0.8125, 0.125, tile, false, false);
}

// Intersecting 3D Cross-Billboard (Fire, Flowers, Tall Grass)
export function pushCrossBillboard(t: MeshBuffer, x: number, y: number, z: number, tile: number, shade = 1.0, tint?: [number, number, number] | null, scale = 1) {
  const base = t.pos.length / 3;
  const uTileX = tile % ATLAS_TILES, uTileY = (tile / ATLAS_TILES) | 0;
  const u0 = (uTileX + EPS) / ATLAS_TILES, u1 = (uTileX + 1 - EPS) / ATLAS_TILES;
  const v0 = (ATLAS_TILES - uTileY - 1 + EPS) / ATLAS_TILES, v1 = (ATLAS_TILES - uTileY - 1 + 1 - EPS) / ATLAS_TILES;

  const cr = tint ? Math.min(1.0, shade * tint[0]) : shade;
  const cg = tint ? Math.min(1.0, shade * tint[1]) : shade;
  const cb = tint ? Math.min(1.0, shade * tint[2]) : shade;

  const sx = (v: number) => x + 0.5 + (v - 0.5) * scale;
  const sy = (v: number) => y + v * scale;
  const sz = (v: number) => z + 0.5 + (v - 0.5) * scale;

  // Diagonal Quad 1: (0,0,0) to (1,1,1)
  t.pos.push(sx(0), sy(1), sz(0),  sx(1), sy(1), sz(1),  sx(0), sy(0), sz(0),  sx(1), sy(0), sz(1));
  t.norm.push(0.7, 0, -0.7,  0.7, 0, -0.7,  0.7, 0, -0.7,  0.7, 0, -0.7);
  t.uv.push(u0, v1,  u1, v1,  u0, v0,  u1, v0);
  t.col.push(cr, cg, cb,  cr, cg, cb,  cr, cg, cb,  cr, cg, cb);
  t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);

  // Reverse face
  t.idx.push(base + 1, base, base + 2, base + 1, base + 2, base + 3);

  const base2 = t.pos.length / 3;
  // Diagonal Quad 2: (0,0,1) to (1,1,0)
  t.pos.push(sx(0), sy(1), sz(1),  sx(1), sy(1), sz(0),  sx(0), sy(0), sz(1),  sx(1), sy(0), sz(0));
  t.norm.push(0.7, 0, 0.7,  0.7, 0, 0.7,  0.7, 0, 0.7,  0.7, 0, 0.7);
  t.uv.push(u0, v1,  u1, v1,  u0, v0,  u1, v0);
  t.col.push(cr, cg, cb,  cr, cg, cb,  cr, cg, cb,  cr, cg, cb);
  t.idx.push(base2, base2 + 1, base2 + 2, base2 + 2, base2 + 1, base2 + 3);
  t.idx.push(base2 + 1, base2, base2 + 2, base2 + 1, base2 + 2, base2 + 3);
}

// Cobweb Sparse (low density): a single 45° diagonal plane, double-sided.
// diag 0 = (0,0,0)-(1,1,1), diag 1 = (0,0,1)-(1,1,0); chosen at placement time
// from the player's facing (stored in chunk dirs).
// Medium density reuses pushCrossBillboard (fire-style, vanilla cross.json
// parity); high density reuses pushTropicalBush (4 intersecting planes).
export function pushCobwebSparse(t: MeshBuffer, x: number, y: number, z: number, tile: number, shade = 1.0, diag = 0) {
  const base = t.pos.length / 3;
  const uTileX = tile % ATLAS_TILES, uTileY = (tile / ATLAS_TILES) | 0;
  const u0 = (uTileX + EPS) / ATLAS_TILES, u1 = (uTileX + 1 - EPS) / ATLAS_TILES;
  const v0 = (ATLAS_TILES - uTileY - 1 + EPS) / ATLAS_TILES, v1 = (ATLAS_TILES - uTileY - 1 + 1 - EPS) / ATLAS_TILES;

  const sy = (v: number) => y + v;

  if (diag === 1) {
    // Diagonal quad: (0,1,1) to (1,0,0)
    t.pos.push(x, sy(1), z + 1,  x + 1, sy(1), z,  x, sy(0), z + 1,  x + 1, sy(0), z);
    t.norm.push(0.7, 0, 0.7,  0.7, 0, 0.7,  0.7, 0, 0.7,  0.7, 0, 0.7);
  } else {
    // Diagonal quad: (0,1,0) to (1,0,1)
    t.pos.push(x, sy(1), z,  x + 1, sy(1), z + 1,  x, sy(0), z,  x + 1, sy(0), z + 1);
    t.norm.push(0.7, 0, -0.7,  0.7, 0, -0.7,  0.7, 0, -0.7,  0.7, 0, -0.7);
  }
  t.uv.push(u0, v1,  u1, v1,  u0, v0,  u1, v0);
  t.col.push(shade, shade, shade,  shade, shade, shade,  shade, shade, shade,  shade, shade, shade);
  t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);

  // Reverse face
  t.idx.push(base + 1, base, base + 2, base + 1, base + 2, base + 3);
}

// Volumetric Tropical Bush / Giant Grass (4 Intersecting Planes, Expanded Spread)
export function pushTropicalBush(t: MeshBuffer, x: number, y: number, z: number, tile: number, scale = 1.3, shade = 1.0, tint?: [number, number, number] | null) {
  const uTileX = tile % ATLAS_TILES, uTileY = (tile / ATLAS_TILES) | 0;
  const u0 = (uTileX + EPS) / ATLAS_TILES, u1 = (uTileX + 1 - EPS) / ATLAS_TILES;
  const v0 = (ATLAS_TILES - uTileY - 1 + EPS) / ATLAS_TILES, v1 = (ATLAS_TILES - uTileY - 1 + 1 - EPS) / ATLAS_TILES;

  const cx = x + 0.5, cz = z + 0.5;
  const hr = 0.5 * scale; // horizontal half-width
  const cr = tint ? Math.min(1.0, shade * tint[0]) : shade;
  const cg = tint ? Math.min(1.0, shade * tint[1]) : shade;
  const cb = tint ? Math.min(1.0, shade * tint[2]) : shade;

  const addPlane = (x0: number, z0: number, x1: number, z1: number, nx: number, nz: number) => {
    const base = t.pos.length / 3;
    t.pos.push(x0, y + 1, z0,  x1, y + 1, z1,  x0, y, z0,  x1, y, z1);
    t.norm.push(nx, 0, nz,  nx, 0, nz,  nx, 0, nz,  nx, 0, nz);
    t.uv.push(u0, v1,  u1, v1,  u0, v0,  u1, v0);
    t.col.push(cr, cg, cb,  cr, cg, cb,  cr, cg, cb,  cr, cg, cb);
    t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    t.idx.push(base + 1, base, base + 2, base + 1, base + 2, base + 3);
  };

  // Diagonal 1: (-hr, -hr) to (hr, hr)
  addPlane(cx - hr, cz - hr, cx + hr, cz + hr, 0.7, -0.7);
  // Diagonal 2: (-hr, hr) to (hr, -hr)
  addPlane(cx - hr, cz + hr, cx + hr, cz - hr, 0.7, 0.7);
  // Axial 1: along X-axis
  addPlane(cx - hr, cz, cx + hr, cz, 0, 1);
  // Axial 2: along Z-axis
  addPlane(cx, cz - hr, cx, cz + hr, 1, 0);
}

// Flat Horizontal Decal (Redstone Dust, Carpets, Pressure Plates)
export function pushFlatDecal(t: MeshBuffer, x: number, y: number, z: number, tile: number, height = 0.015, shade = 1.0, tint?: [number, number, number] | null) {
  const base = t.pos.length / 3;
  const uTileX = tile % ATLAS_TILES, uTileY = (tile / ATLAS_TILES) | 0;
  const u0 = (uTileX + EPS) / ATLAS_TILES, u1 = (uTileX + 1 - EPS) / ATLAS_TILES;
  const v0 = (ATLAS_TILES - uTileY - 1 + EPS) / ATLAS_TILES, v1 = (ATLAS_TILES - uTileY - 1 + 1 - EPS) / ATLAS_TILES;

  const cr = tint ? Math.min(1.0, shade * tint[0]) : shade;
  const cg = tint ? Math.min(1.0, shade * tint[1]) : shade;
  const cb = tint ? Math.min(1.0, shade * tint[2]) : shade;

  t.pos.push(x, y + height, z + 1,  x + 1, y + height, z + 1,  x, y + height, z,  x + 1, y + height, z);
  t.norm.push(0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0);
  t.uv.push(u0, v1,  u1, v1,  u0, v0,  u1, v0);
  t.col.push(cr, cg, cb,  cr, cg, cb,  cr, cg, cb,  cr, cg, cb);
  t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
}

// 3D Connecting Wooden Fence (Central 4x16x4 post + dynamic crossrails)
export function pushFence(
  t: MeshBuffer,
  x: number,
  y: number,
  z: number,
  tile: number,
  getBlock: (x: number, y: number, z: number) => number
) {
  // 1. Central Post (4x16x4 px = 0.375 to 0.625)
  pushSolidBox(t, x, y, z, 0.375, 0.0, 0.375, 0.625, 1.0, 0.625, tile, false, false);

  // 2. Connecting Crossrails
  const connects = (bx: number, by: number, bz: number) => {
    const id = getBlock(bx, by, bz);
    if (!id) return false;
    return isFence(id) || isOpaque(id) || (isSolid(id) && !BLOCK_MAP.get(id)?.stair && !BLOCK_MAP.get(id)?.slab);
  };

  // North (z - 1)
  if (connects(x, y, z - 1)) {
    pushSolidBox(t, x, y, z, 0.4375, 0.75, 0.0, 0.5625, 0.9375, 0.375, tile, false, false, true, true, false, false); // Upper rail
    pushSolidBox(t, x, y, z, 0.4375, 0.375, 0.0, 0.5625, 0.5625, 0.375, tile, false, false, true, true, false, false); // Lower rail
  }
  // South (z + 1)
  if (connects(x, y, z + 1)) {
    pushSolidBox(t, x, y, z, 0.4375, 0.75, 0.625, 0.5625, 0.9375, 1.0, tile, false, false, true, true, false, false);
    pushSolidBox(t, x, y, z, 0.4375, 0.375, 0.625, 0.5625, 0.5625, 1.0, tile, false, false, true, true, false, false);
  }
  // West (x - 1)
  if (connects(x - 1, y, z)) {
    pushSolidBox(t, x, y, z, 0.0, 0.75, 0.4375, 0.375, 0.9375, 0.5625, tile, false, false, false, false, true, true);
    pushSolidBox(t, x, y, z, 0.0, 0.375, 0.4375, 0.375, 0.5625, 0.5625, tile, false, false, false, false, true, true);
  }
  // East (x + 1)
  if (connects(x + 1, y, z)) {
    pushSolidBox(t, x, y, z, 0.625, 0.75, 0.4375, 1.0, 0.9375, 0.5625, tile, false, false, false, false, true, true);
    pushSolidBox(t, x, y, z, 0.625, 0.375, 0.4375, 1.0, 0.5625, 0.5625, tile, false, false, false, false, true, true);
  }
}

// ── Data-driven prop models: blocks that are NOT cubes in vanilla ──────────
// One recipe table shared by the worker and main-thread meshers (parity by
// construction). Tiles resolve from the block's own side/top/bottom faces.

export type PropFaceRole = "side" | "top" | "bottom";

export interface PropBoxDef {
  b: [number, number, number, number, number, number];
  f?: PropFaceRole;
  tile?: number;
  /** Explicit UV rect [u0, v0, u1, v1] in tile fractions. Needed when the
   * source sprite only fills part of its tile (cake, lantern, chain, pot):
   * the default fractional sampling would show transparent regions. */
  uv?: [number, number, number, number];
}

export interface PropCrossDef {
  f?: PropFaceRole;
  tile?: number;
  tint?: boolean;
  scale?: number;
}

export interface PropModelDef {
  boxes?: PropBoxDef[];
  crosses?: PropCrossDef[];
}

const B = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, f?: PropFaceRole): PropBoxDef => ({
  b: [x0, y0, z0, x1, y1, z1],
  f,
});

export const PROP_MODELS: Record<number, PropModelDef> = {
  // Flower pot: pot sprite fills x 5..10, rows 5..15 — map that window.
  367: { boxes: [B(0.3125, 0, 0.3125, 0.6875, 0.375, 0.6875), B(0.375, 0.375, 0.375, 0.625, 0.4375, 0.625, "top")].map((b) => ({ ...b, uv: [0.3125, 0, 0.625, 0.69] as [number, number, number, number] })) },
  // Chain: links live in the x 0..5 strip — map it, not the empty middle.
  239: {
    boxes: [
      B(0.4375, 0, 0.4375, 0.5625, 1, 0.5625),
      B(0.375, 0.7, 0.46875, 0.625, 0.9, 0.53125),
      B(0.46875, 0.4, 0.375, 0.53125, 0.6, 0.625),
      B(0.375, 0.1, 0.46875, 0.625, 0.3, 0.53125),
    ].map((b) => ({ ...b, uv: [0, 0, 0.375, 1] as [number, number, number, number] })),
  },
  // Campfires: crossed log pile + fire cross (tile 88/89 = real flame frames,
  // scale 0.85 so the flames read at distance).
  85: {
    boxes: [B(0.125, 0, 0.375, 0.875, 0.25, 0.625), B(0.375, 0, 0.125, 0.625, 0.25, 0.875)],
    crosses: [{ tile: 88, scale: 0.85 }],
  },
  86: {
    boxes: [B(0.125, 0, 0.375, 0.875, 0.25, 0.625), B(0.375, 0, 0.125, 0.625, 0.25, 0.875)],
    crosses: [{ tile: 89, scale: 0.85 }],
  },
  // Cake: brown walls + icing top (side sprite lives on rows 8..15 of tile).
  228: {
    boxes: [
      { b: [0.0625, 0, 0.0625, 0.9375, 0.4375, 0.9375], f: "side", uv: [0.0625, 0, 0.9375, 0.5] },
      { b: [0.0625, 0.4375, 0.0625, 0.9375, 0.5, 0.9375], f: "top", uv: [0.0625, 0.1, 0.9375, 0.95] },
    ],
  },
  // Rails: sleeper bed + twin rails
  572: { boxes: [B(0, 0, 0, 1, 0.125, 1, "top"), B(0.125, 0.125, 0, 0.25, 0.25, 1), B(0.75, 0.125, 0, 0.875, 0.25, 1)] },
  557: { boxes: [B(0, 0, 0, 1, 0.125, 1, "top"), B(0.125, 0.125, 0, 0.25, 0.25, 1), B(0.75, 0.125, 0, 0.875, 0.25, 1)] },
  342: { boxes: [B(0, 0, 0, 1, 0.125, 1, "top"), B(0.125, 0.125, 0, 0.25, 0.25, 1), B(0.75, 0.125, 0, 0.875, 0.25, 1)] },
  146: { boxes: [B(0, 0, 0, 1, 0.125, 1, "top"), B(0.125, 0.125, 0, 0.25, 0.25, 1), B(0.75, 0.125, 0, 0.875, 0.25, 1)] },
  // Lever: base plate + stick + knob (fixed +Z throw; facing stored nowhere yet)
  435: { boxes: [B(0.375, 0, 0.375, 0.625, 0.125, 0.625, "top"), B(0.4375, 0.125, 0.4375, 0.5625, 0.6, 0.5625), B(0.375, 0.6, 0.375, 0.625, 0.75, 0.625)] },
  // Iron bars / glass panes: crossed thin panels
  413: {
    boxes: [
      B(0.4375, 0, 0, 0.5625, 1, 1),
      B(0, 0, 0.4375, 1, 1, 0.5625),
    ],
  },
  377: {
    boxes: [
      B(0.4375, 0, 0, 0.5625, 1, 1),
      B(0, 0, 0.4375, 1, 1, 0.5625),
    ],
  },
  // Cauldron: 4 walls + floor + water surface (tile 11 = water_still)
  236: {
    boxes: [
      B(0, 0, 0, 0.125, 1, 1),
      B(0.875, 0, 0, 1, 1, 1),
      B(0.125, 0, 0, 0.875, 1, 0.125),
      B(0.125, 0, 0.875, 0.875, 1, 1),
      B(0.125, 0, 0.125, 0.875, 0.1875, 0.875, "bottom"),
      { b: [0.125, 0.75, 0.125, 0.875, 0.8125, 0.875], tile: 11 },
    ],
  },
  // Lightning rod: thin column + head knob
  454: { boxes: [B(0.4375, 0, 0.4375, 0.5625, 0.9, 0.5625), B(0.375, 0.9, 0.375, 0.625, 1, 0.625, "top")] },
  // Anvil: base + waist + overhang top
  151: {
    boxes: [
      B(0.125, 0, 0.125, 0.875, 0.25, 0.875),
      B(0.375, 0.25, 0.375, 0.625, 0.5625, 0.625),
      { b: [0.0625, 0.5625, 0.0625, 0.9375, 1, 0.9375], f: "top", uv: [0.1875, 0, 0.75, 1] },
    ],
  },
  // Hopper: rim funnel + neck + spout
  410: {
    boxes: [
      B(0, 0.6875, 0, 1, 1, 1, "top"),
      B(0.1875, 0.4375, 0.1875, 0.8125, 0.6875, 0.8125),
      B(0.375, 0, 0.375, 0.625, 0.4375, 0.625),
    ],
  },
  // Grindstone: legs + axle + wheel disc
  403: {
    boxes: [
      B(0.1875, 0, 0.375, 0.3125, 0.5, 0.625),
      B(0.6875, 0, 0.375, 0.8125, 0.5, 0.625),
      B(0.1875, 0.5, 0.4375, 0.8125, 0.625, 0.5625),
      B(0.375, 0.1875, 0.4375, 0.625, 0.875, 0.5625, "top"),
    ],
  },
  // Lectern: post + stepped desk + book
  433: {
    boxes: [
      B(0.375, 0, 0.375, 0.625, 0.5, 0.625),
      B(0.1875, 0.5, 0.1875, 0.8125, 0.625, 0.8125, "top"),
      B(0.25, 0.625, 0.25, 0.75, 0.75, 0.75, "top"),
      B(0.375, 0.75, 0.4375, 0.625, 0.875, 0.6875),
    ],
  },
  // Bell: posts + beam + body + skirt + clapper
  179: {
    boxes: [
      { b: [0.1875, 0, 0.375, 0.3125, 0.75, 0.625], uv: [0.0625, 0.5, 0.4375, 1] },
      { b: [0.6875, 0, 0.375, 0.8125, 0.75, 0.625], uv: [0.0625, 0.5, 0.4375, 1] },
      { b: [0.1875, 0.75, 0.375, 0.8125, 0.875, 0.625], f: "top", uv: [0, 0.5, 0.5, 1] },
      { b: [0.3125, 0.375, 0.3125, 0.6875, 0.75, 0.6875], uv: [0.0625, 0.5, 0.4375, 0.625] },
      { b: [0.25, 0.25, 0.25, 0.75, 0.375, 0.75], uv: [0.0625, 0.5, 0.4375, 0.625] },
      { b: [0.4375, 0.125, 0.4375, 0.5625, 0.25, 0.5625], uv: [0.0625, 0.5, 0.4375, 0.625] },
    ],
  },
  // Stonecutter: table + saw blade
  639: {
    boxes: [
      B(0.0625, 0, 0.0625, 0.9375, 0.5, 0.9375, "top"),
      B(0.4375, 0.5, 0.1875, 0.5625, 0.9375, 0.8125),
    ],
  },
  // Composter: wooden walls + compost fill
  264: {
    boxes: [
      B(0, 0, 0, 0.125, 1, 1),
      B(0.875, 0, 0, 1, 1, 1),
      B(0.125, 0, 0, 0.875, 1, 0.125),
      B(0.125, 0, 0.875, 0.875, 1, 1),
      B(0.125, 0, 0.125, 0.875, 0.1875, 0.875, "bottom"),
      B(0.1875, 0.625, 0.1875, 0.8125, 0.75, 0.8125, "top"),
    ],
  },
  // Enchanting table: base + pillar + slab top + book
  353: {
    boxes: [
      B(0.1875, 0, 0.1875, 0.8125, 0.1875, 0.8125, "bottom"),
      B(0.375, 0.1875, 0.375, 0.625, 0.5625, 0.625),
      B(0.125, 0.5625, 0.125, 0.875, 0.75, 0.875, "top"),
      B(0.3125, 0.75, 0.375, 0.6875, 0.875, 0.75, "top"),
    ],
  },
  // Conduit: axis cage + bright core
  95: {
    boxes: [
      B(0, 0.4375, 0.4375, 1, 0.5625, 0.5625),
      B(0.4375, 0, 0.4375, 0.5625, 1, 0.5625),
      B(0.4375, 0.4375, 0, 0.5625, 0.5625, 1),
      B(0.375, 0.375, 0.375, 0.625, 0.625, 0.625, "top"),
    ],
  },
  // Beacon: obsidian foot + glass shell + bright core (beam is a separate effect)
  94: {
    boxes: [
      B(0.125, 0, 0.125, 0.875, 0.125, 0.875, "bottom"),
      B(0.0625, 0.125, 0.0625, 0.9375, 0.875, 0.9375),
      B(0.375, 0.25, 0.375, 0.625, 0.75, 0.625, "top"),
    ],
  },
  // Daylight detector: half slab
  302: { boxes: [B(0, 0, 0, 1, 0.375, 1, "top")] },
  // Tripwire hook: wall plate + arm (fixed +Z throw; no facing stored yet)
  665: { boxes: [B(0.375, 0.25, 0.875, 0.625, 0.75, 1), B(0.4375, 0.375, 0.5, 0.5625, 0.5, 0.875)] },
  // Scaffolding: corner posts + top platform
  606: {
    boxes: [
      B(0, 0, 0, 0.125, 1, 0.125),
      B(0.875, 0, 0, 1, 1, 0.125),
      B(0, 0, 0.875, 0.125, 1, 1),
      B(0.875, 0, 0.875, 1, 1, 1),
      B(0, 0.875, 0, 1, 1, 1, "top"),
    ],
  },
  // Turtle egg: three blobs
  669: {
    boxes: [
      B(0.1875, 0, 0.25, 0.4375, 0.25, 0.5),
      B(0.5, 0, 0.375, 0.75, 0.3125, 0.625, "top"),
      B(0.375, 0, 0.5625, 0.5625, 0.1875, 0.75),
    ],
  },
  // Snow drift: low pile (single "Snow" block)
  627: { boxes: [B(0, 0, 0, 1, 0.5, 1, "top")] },
  // Mug: little open cup (bottom + 4 walls + side handle)
  1210: {
    boxes: [
      B(0.25, 0, 0.25, 0.75, 0.08, 0.75, "bottom"),
      B(0.25, 0.08, 0.25, 0.375, 0.42, 0.75),
      B(0.625, 0.08, 0.25, 0.75, 0.42, 0.75),
      B(0.375, 0.08, 0.25, 0.625, 0.42, 0.375),
      B(0.375, 0.08, 0.625, 0.625, 0.42, 0.75),
      B(0.75, 0.12, 0.375, 0.875, 0.34, 0.625, "side"),
    ],
  },
  // Thin stalks: sugar cane + bamboo read as columns, not cubes
  658: { boxes: [B(0.25, 0, 0.25, 0.75, 1, 0.75)] },
  113: { boxes: [B(0.25, 0, 0.25, 0.75, 1, 0.75)] },
  // Crops & small flora: full-height crosses (vanilla-accurate silhouettes)
  233: { crosses: [{ f: "side" }] },
  551: { crosses: [{ f: "side" }] },
  692: { crosses: [{ f: "side" }] },
  178: { crosses: [{ f: "side" }] },
  500: { crosses: [{ f: "side" }] },
  276: { crosses: [{ f: "side" }] },
  676: { crosses: [{ f: "side" }] },
  279: { crosses: [{ f: "side" }] },
  679: { crosses: [{ f: "side" }] },
  483: { crosses: [{ f: "side" }] },
  101: { crosses: [{ f: "side" }] },
  1139: { crosses: [{ tile: 104 }] },
  255: { crosses: [{ f: "side" }] },
  253: { crosses: [{ f: "side" }] },
  260: { boxes: [B(0.375, 0.25, 0.375, 0.625, 0.75, 0.625)] },
  156: { crosses: [{ f: "side" }] },
  369: { crosses: [{ f: "side" }] },
  // Hanging vines: foliage-tinted strands (674 already routed this way)
  690: { crosses: [{ f: "side", tint: true }] },
  672: { crosses: [{ f: "side", tint: true }] },
  237: { crosses: [{ f: "side", tint: true }] },
  // Dripleafs: stem cross + leaf platform
  180: {
    crosses: [{ tile: 193 }],
    boxes: [B(0.125, 0.8125, 0.125, 0.875, 0.9375, 0.875, "top")],
  },
  620: {
    crosses: [{ f: "side" }],
    boxes: [B(0.25, 0.5, 0.25, 0.75, 0.625, 0.75, "top")],
  },
  // Sea pickle: base + nubs
  132: {
    boxes: [
      B(0.25, 0, 0.25, 0.75, 0.375, 0.75),
      B(0.3125, 0.375, 0.3125, 0.4375, 0.5625, 0.4375, "top"),
      B(0.5625, 0.375, 0.5625, 0.6875, 0.5, 0.6875, "top"),
    ],
  },
  // Cactus: inset column (vanilla 14/16 footprint)
  227: {
    boxes: [{ b: [0.0625, 0, 0.0625, 0.9375, 1, 0.9375], uv: [0.0625, 0, 0.8125, 1] }],
  },
  // Composter compost: low heap
  265: {
    boxes: [{ b: [0.0625, 0, 0.0625, 0.9375, 0.5, 0.9375], uv: [0.125, 0.1875, 0.875, 0.8125] }],
  },
};

export function hasPropModel(id: number): boolean {
  return PROP_MODELS[id] !== undefined;
}

const MODEL_EXTRA_IDS = [43, 46, 80, 81, 82, 84, 92, 97, 98, 100, 101, 102, 103, 105, 106, 107, 108, 123, 131, 140, 209, 240, 241, 261, 262, 367, 599, 600, 630, 1162, 1200, 1201, 1202, 1203, 1204];

export const VANILLA_3D_IDS: number[] = [...new Set([
  ...MODEL_EXTRA_IDS, ...CANDLE_IDS, ...CAMPFIRE_IDS, ...FLOWER_IDS, ...SAPLING_IDS, ...FIRE_IDS, ...CROSS_PLANT_IDS, ...THIN_SHAPE_IDS,
  ...Object.keys(PROP_MODELS).map(Number),
])].filter((id) => id !== BED_BYTE).sort((a, b) => a - b);

function propTile(Bdef: BlockDef, role: PropFaceRole | undefined, fallback: number): number {
  if (role === "top") return Bdef.top ?? fallback;
  if (role === "bottom") return Bdef.bottom ?? fallback;
  return Bdef.side ?? fallback;
}

export function pushPropModel(
  t: MeshBuffer,
  x: number,
  y: number,
  z: number,
  id: number,
  Bdef: BlockDef,
  tint?: [number, number, number] | null
): void {
  const model = PROP_MODELS[id];
  if (!model) return;
  const side = Bdef.side ?? 0;
  if (model.boxes) {
    for (const box of model.boxes) {
      const tile = box.tile ?? propTile(Bdef, box.f, side);
      const uv = box.uv ? subTileUV(tile, box.uv[0], box.uv[1], box.uv[2], box.uv[3]) : undefined;
      pushSolidBox(t, x, y, z, box.b[0], box.b[1], box.b[2], box.b[3], box.b[4], box.b[5], tile, false, false,
        false, false, false, false, uv, uv, uv, uv, uv, uv);
    }
  }
  if (model.crosses) {
    for (const c of model.crosses) {
      const tile = c.tile ?? propTile(Bdef, c.f, side);
      pushCrossBillboard(t, x, y, z, tile, 1.0, c.tint ? tint ?? null : null, c.scale ?? 1);
    }
  }
}
