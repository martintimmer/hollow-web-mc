/**
 * Chunk Meshing Worker Pipeline — Offloads voxel meshing to background workers.
 * Full parity with the main-thread mesher in engineInit.ts (advanceMeshJob):
 * stairs (dirs), doors, trapdoors, chests, cross billboards, flat decals, fences,
 * foliage/glow/trans buckets, water face rules, 3-block ambient occlusion.
 * Supports zero-copy Transferable ArrayBuffers (Float32Array / Uint32Array).
 */
import { FACES, EPS, AOB, ATLAS_TILES, pushStair, pushSlab, pushPorchStair, pushDoor, pushTrapdoor, pushCrossBillboard, pushCobwebSparse, pushTropicalBush, pushFlatDecal, pushFence, pushTorchPost, pushTorchFlame, pushLantern, pushCandle, isCandleId, isFlowerId, isSaplingId, isFireId, isCrossPlantId, isNonOccludingShape, pushEndRod, pushAmethystCluster, pushBrewingStand, pushPortalPanel, pushLadder, pushBed, pushPropModel, hasPropModel, TypedMeshBuffer } from "./chunkMesh";
import { customFaceTile } from "./customFaceTiles";
import { isOpaque, BLOCK_MAP, BED_ID, BED_BYTE, BED_TILE } from "../blocks";
import { CUSTOM_ASSET_ID_MIN } from "../customAssetConstants";
import { getBiomeColorTint, getBlockTint, blurBiomeTints, type BlurredTints } from "../terrain/biomes";

// L3 packed format: pos f32×3 · norm u8×3(±1) · uv u16×2 · col u8×3 → 24 B/vertex (was 44)
export interface SerializedMeshBuffers {
  pos: Float32Array;
  norm: Uint8Array;
  uv: Uint16Array;
  col: Uint8Array;
  idx: Uint32Array;
}

export interface ChunkMeshRequest {
  cx: number;
  cz: number;
  data: Uint16Array;
  maxY: number;
  fast?: boolean;
  dirs?: Uint16Array;
  neighborBorders?: {
    north?: Uint16Array; // cz - 1 (z = 15)
    south?: Uint16Array; // cz + 1 (z = 0)
    west?: Uint16Array;  // cx - 1 (x = 15)
    east?: Uint16Array;  // cx + 1 (x = 0)
  };
  biomeId?: string;
  grassTint?: [number, number, number];
  foliageTint?: [number, number, number];
  biomeGrid?: string[];
  biomeHalo?: string[];
  tintGrid?: BlurredTints;
}

export interface ChunkMeshResponse {
  cx: number;
  cz: number;
  opaque: SerializedMeshBuffers | null;
  foliage: SerializedMeshBuffers | null;
  grass: SerializedMeshBuffers | null;
  glow: SerializedMeshBuffers | null;
  trans: SerializedMeshBuffers | null;
  water: SerializedMeshBuffers | null;
  emitterKeys: string[];
}

export interface MeshWorkerMsg {
  res?: ChunkMeshResponse;
  error?: string;
  req?: { cx: number; cz: number };
}

const CH = 16;
const CHH = 128;
const isOpaqueForMeshing = (id: number) => id < CUSTOM_ASSET_ID_MIN && !(id >= 105 && id <= 108) && !isNonOccludingShape(id) && isOpaque(id);

const mBuf = (b: Omit<TypedMeshBuffer, "clear">): TypedMeshBuffer => ({ ...b, clear() {} });

function buildChunkMeshBuffers(req: ChunkMeshRequest): ChunkMeshResponse {
  const { cx, cz, data, maxY, dirs, neighborBorders, biomeId } = req;
  const x0 = cx * CH, z0 = cz * CH;

  let grassTint = req.grassTint;
  let foliageTint = req.foliageTint;
  if (!grassTint || !foliageTint) {
    const defaultTints = getBiomeColorTint(biomeId);
    grassTint = grassTint ?? defaultTints.grass;
    foliageTint = foliageTint ?? defaultTints.foliage;
  }
  let blurred = req.tintGrid;
  if (!blurred || blurred.grass.length !== 256 || blurred.foliage.length !== 256) {
    const grid = req.biomeGrid && req.biomeGrid.length === 256 ? req.biomeGrid : new Array(256).fill(biomeId ?? "plains");
    blurred = blurBiomeTints(grid, req.biomeHalo);
  }
  const grassGrid = blurred.grass;
  const foliageGrid = blurred.foliage;
  const colGrass = (lx: number, lz: number): [number, number, number] => grassGrid[lz * 16 + lx];
  const colFoliage = (lx: number, lz: number): [number, number, number] => foliageGrid[lz * 16 + lx];

  const posO: number[] = [], normO: number[] = [], uvO: number[] = [], colO: number[] = [], idxO: number[] = [];
  const posF: number[] = [], normF: number[] = [], uvF: number[] = [], colF: number[] = [], idxF: number[] = [];
  const posGr: number[] = [], normGr: number[] = [], uvGr: number[] = [], colGr: number[] = [], idxGr: number[] = [];
  const posG: number[] = [], normG: number[] = [], uvG: number[] = [], colG: number[] = [], idxG: number[] = [];
  const posT: number[] = [], normT: number[] = [], uvT: number[] = [], colT: number[] = [], idxT: number[] = [];
  const emitterKeys: string[] = [];

  const getCell = (gx: number, gy: number, gz: number): number => {
    if (gy < 0 || gy >= CHH) return 0;
    const lx = gx - x0, lz = gz - z0;
    if (lx >= 0 && lx < CH && lz >= 0 && lz < CH) {
      return data[gy * 256 + lz * CH + lx] || 0;
    }
    if (lz < 0 && neighborBorders?.north) return neighborBorders.north[gy * CH + (lx & 15)] || 0;
    if (lz >= CH && neighborBorders?.south) return neighborBorders.south[gy * CH + (lx & 15)] || 0;
    if (lx < 0 && neighborBorders?.west) return neighborBorders.west[gy * CH + (lz & 15)] || 0;
    if (lx >= CH && neighborBorders?.east) return neighborBorders.east[gy * CH + (lz & 15)] || 0;
    return 0;
  };

  const topY = Math.min(CHH - 1, Math.max(0, maxY));

  // ── Greedy face merging (c01): +Y/-Y faces (the dominant flat populations) ──
  // Merges same-tile/same-shade exposed coplanar faces within the 16x16 texel zone,
  // keeping per-texel UVs exact (single-zone quad), AO per merged corner, and a
  // diagonal split matching the AO pattern.
  const USE_GREEDY = false; // A/B: c01+c02 gated ✗ (MAE 6.28 > 6, checker artifact) — re-enable after trace
  const SPECIAL_IDS = new Set([24, 43, 46, 80, 81, 82, 84, 92, 97, 98, 100, 101, 102, 103, 105, 106, 107, 108, 123, 124, 125, 126, 127, 131, 140, 134 /* BED_BYTE */, BED_ID, 152, 153, 155, 161, 207, 208, 209, 216, 223, 225, 227, 230, 238, 259, 265, 303, 305, 306, 308, 309, 310, 312, 313, 315, 316, 318, 361, 364, 365, 411, 412, 429, 457, 581, 628, 630, 658, 666, 667, 1200, 1201, 1202, 1203, 1204, 1207, 1208, 144, 147, 157, 183, 201, 269, 298, 423, 455, 456, 504, 516, 517, 521, 530, 590, 637, 659, 701, 702]);
  const isEligible = (id: number) => {
    const d = BLOCK_MAP.get(id);
    if (!d || d.stair || d.trans) return false;
    if (SPECIAL_IDS.has(id)) return false;
    return true;
  };
  // consumed[y*512+d*256+z*16+x] = 1 → face already emitted by greedy
  const consumed = USE_GREEDY ? new Uint8Array((CHH) * 512) : null;
  if (consumed) {
    for (let y = 0; y <= topY; y++) {
      for (const up of [true, false]) {
        const dir = up ? [0, 1, 0] : [0, -1, 0];
        const dIdx = up ? 0 : 1;
        // mask: key = tile*4 + shadeIdx (0=none)
        const mask = new Uint16Array(256);
        const tileOf = new Uint16Array(256);
        const shadeOf = new Float32Array(256);
        for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
          const off = y * 256 + lz * CH + lx;
          const id = data[off];
          if (!id || !isEligible(id)) continue;
          const nb = getCell(x0 + lx, y + dir[1], z0 + lz);
          if (isOpaqueForMeshing(nb)) continue;
          if (id === nb) continue;
          const bd = BLOCK_MAP.get(id)!;
          const tile = up ? (bd.top ?? bd.side) ?? 0 : (bd.bottom ?? bd.side) ?? 0;
          let shade = 1.0;
          if (up) shade = 1.0; else shade = 0.7;
          mask[lz * 16 + lx] = 1;
          tileOf[lz * 16 + lx] = tile;
          shadeOf[lz * 16 + lx] = shade;
        }
        // greedy consume (max rect 16x16 = exactly one texel zone)
        const visited = new Uint8Array(256);
        let cell = 0;
        while ((cell = mask.findIndex((v, i) => v === 1 && !visited[i])) !== -1) {
          const cz = cell >> 4, cx = cell & 15;
          const tile = tileOf[cell], shade = shadeOf[cell];
          let w = 1;
          while (cx + w < 16 && mask[cz * 16 + cx + w] === 1 && !visited[cz * 16 + cx + w] && tileOf[cz * 16 + cx + w] === tile && shadeOf[cz * 16 + cx + w] === shade) w++;
          let h = 1;
          outer: for (; cz + h < 16; h++) {
            for (let i = 0; i < w; i++) {
              const v = mask[(cz + h) * 16 + cx + i];
              if (v !== 1 || visited[(cz + h) * 16 + cx + i] || tileOf[(cz + h) * 16 + cx + i] !== tile || shadeOf[(cz + h) * 16 + cx + i] !== shade) break outer;
            }
          }
          // emit merged quad (world coords)
          const px0 = cx, px1 = cx + w, pz0 = cz, pz1 = cz + h;
          // target bucket by id at anchor cell
          const anchorId = data[y * 256 + pz0 * CH + px0];
          const ab = BLOCK_MAP.get(anchorId)!;
          const T = ab.foliage ? { pos: posF, norm: normF, uv: uvF, col: colF, idx: idxF } : { pos: posO, norm: normO, uv: uvO, col: colO, idx: idxO };
          const base = T.pos.length / 3;
          const tx = tile % ATLAS_TILES, ty = (tile / ATLAS_TILES) | 0;
          // pushFace vertex order: v0=(x0,z1) v1=(x1,z1) v2=(x0,z0) v3=(x1,z0)
          // corner offsets (out-face axial signs) at each vertex
          const corners: Array<[number, number, number, number]> = up
            ? [
                [px0, pz1, -1, 1],
                [px1, pz1, 1, 1],
                [px0, pz0, -1, -1],
                [px1, pz0, 1, -1]
              ]
            : [
                [px1, pz1, 1, 1],
                [px0, pz1, -1, 1],
                [px1, pz0, 1, -1],
                [px0, pz0, -1, -1]
              ];
          const wy0 = y + (up ? 1 : 0);
          const inset = (p: number) => EPS + (1 - 2 * EPS) * p;
          const aoVals: number[] = [];
          for (const [cx2, cz2, ox, oz] of corners) {
            const vx = ox > 0 ? cx2 - 1 : cx2;
            const vz = oz > 0 ? cz2 - 1 : cz2;
            const gx = x0 + vx, gz = z0 + vz, gy = wy0;
            const aAx = isOpaqueForMeshing(getCell(gx + ox, gy, gz)) ? 1 : 0;
            const aAz = isOpaqueForMeshing(getCell(gx, gy, gz + oz)) ? 1 : 0;
            const aD = isOpaqueForMeshing(getCell(gx + ox, gy, gz + oz)) ? 1 : 0;
            const ao = aAx && aAz ? 0 : 3 - (aAx + aAz + aD);
            aoVals.push(AOB[ao] * shade);
            T.pos.push(gx + (ox > 0 ? 1 : 0), wy0, gz + (oz > 0 ? 1 : 0));
            T.norm.push(0, up ? 1 : -1, 0);
            T.uv.push((tx + inset(cx2 / 16)) / ATLAS_TILES, (ATLAS_TILES - 1 - ty + inset(cz2 / 16)) / ATLAS_TILES);
          }
          // diagonal split follows the AO pattern
          const a0 = aoVals[0], a1 = aoVals[1], a2 = aoVals[2], a3 = aoVals[3];
          if (a0 + a3 >= a1 + a2) {
            T.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
          } else {
            T.idx.push(base + 1, base + 3, base + 2, base + 1, base + 0, base + 3);
          }
          for (const av of aoVals) T.col.push(av, av, av);
          
          for (let zz = pz0; zz < pz1; zz++) for (let xx = cx; xx < cx + w; xx++) {
            visited[zz * 16 + xx] = 1;
            consumed![y * 512 + dIdx * 256 + zz * 16 + xx] = 1;
          }
        }
      }
    }
  }

  for (let y = 0; y <= topY; y++) {
    for (let lz = 0; lz < CH; lz++) {
      const z = z0 + lz;
      for (let lx = 0; lx < CH; lx++) {
        const off = y * 256 + lz * CH + lx;
        const id = data[off];
        if (!id) continue;

        const x = x0 + lx;
        const bdef = BLOCK_MAP.get(id);
        if (!bdef) continue;
        if ((bdef as { customAssetId?: number }).customAssetId) continue;

        if (bdef.glow || bdef.lightPower || (bdef as { light?: number }).light) {
          emitterKeys.push(`${x},${y},${z}`);
        }

        const buf: TypedMeshBuffer = bdef.glow ? mBuf({ pos: posG, norm: normG, uv: uvG, col: colG, idx: idxG })
          : bdef.foliage ? mBuf({ pos: posF, norm: normF, uv: uvF, col: colF, idx: idxF })
          : bdef.trans ? mBuf({ pos: posT, norm: normT, uv: uvT, col: colT, idx: idxT })
          : mBuf({ pos: posO, norm: normO, uv: uvO, col: colO, idx: idxO });

        if (bdef.stair) {
          const facing = dirs && dirs[off] ? dirs[off] - 1 : 0;
          pushStair(buf, x, y, z, bdef, facing);
          continue;
        }
        if (bdef.slab) {
          const dv = dirs && dirs[off] ? dirs[off] : 0;
          const isTop = dv === 1;
          const below = getCell(x, y - 1, z);
          const above = getCell(x, y + 1, z);
          const hideBottom = !isTop && isOpaqueForMeshing(below);
          const hideTop = isTop && isOpaqueForMeshing(above);
          pushSlab(buf, x, y, z, bdef, isTop, hideTop, hideBottom);
          continue;
        }
        if (id === 105 || id === 106) {
          const belowIsDoor = getCell(x, y - 1, z) === 105 || getCell(x, y - 1, z) === 106;
          const aboveIsDoor = getCell(x, y + 1, z) === 105 || getCell(x, y + 1, z) === 106;
          const dv = dirs && dirs[off] ? dirs[off] : 0;
          const facing = dv >= 1 ? (dv - 1) % 4 : 0;
          pushDoor(mBuf({ pos: posO, norm: normO, uv: uvO, col: colO, idx: idxO }), x, y, z, id, belowIsDoor ? 1 : (aboveIsDoor ? 2 : 0), facing);
          continue;
        }
        if (id === 107 || id === 108) {
          const dv = dirs && dirs[off] ? dirs[off] : 0;
          const facing = dv >= 1 ? (dv - 1) % 4 : 0;
          const halfTop = dv >= 5;
          pushTrapdoor(mBuf({ pos: posO, norm: normO, uv: uvO, col: colO, idx: idxO }), x, y, z, id, facing, halfTop);
          continue;
        }
        if (id === 43) {
          continue; // Chests are purely rendered as discrete 3D articulated ChestEntities
        }
        if (id === 1202 || id === 1203) {
          const gBuf = mBuf({ pos: posGr, norm: normGr, uv: uvGr, col: colGr, idx: idxGr });
          const tile = id === 1202 ? 496 : 497;
          pushTropicalBush(gBuf, x, y, z, tile, 1.35, 1.0, colGrass(lx, lz));
          if (id === 1202 && getCell(x, y + 1, z) === 0) {
            pushTropicalBush(gBuf, x, y + 1, z, 497, 1.35, 1.0, colGrass(lx, lz));
          }
          continue;
        }
        if (id === 361) {
          const fBuf = mBuf({ pos: posF, norm: normF, uv: uvF, col: colF, idx: idxF });
          pushCrossBillboard(fBuf, x, y, z, bdef.side ?? 0, 1.0, colGrass(lx, lz));
          continue;
        }
        if (id === 124 || isFlowerId(id) || isSaplingId(id) || isCrossPlantId(id) || id === 131 || id === 1200 || id === 1201 || id === 361 || id === 429 || id === 658 || id === 133 || id === 661) {
          const gBuf = mBuf({ pos: posGr, norm: normGr, uv: uvGr, col: colGr, idx: idxGr });
          const tile = id === 1200 ? 815 : (id === 1201 ? 816 : (bdef.side ?? 0));
          const tint = (id === 124 || id === 1200 || id === 1201 || id === 361 || id === 429 || id === 658) ? colGrass(lx, lz) : null;
          pushCrossBillboard(gBuf, x, y, z, tile, 1.0, tint);
          if (id === 1200 && getCell(x, y + 1, z) === 0) {
            pushCrossBillboard(gBuf, x, y + 1, z, 816, 1.0, tint);
          }
          continue;
        }
        if (id === 457) {
          // Lily Pad: flat surface decal on water
          const fBuf = mBuf({ pos: posF, norm: normF, uv: uvF, col: colF, idx: idxF });
          pushFlatDecal(fBuf, x, y, z, bdef.top ?? bdef.side ?? 0, 0.015, 1.0, [0.13, 0.50, 0.19]);
          continue;
        }
        if (id === 309) {
          // Dead Bush: untinted arid brown cross-billboard
          const fBuf = mBuf({ pos: posF, norm: normF, uv: uvF, col: colF, idx: idxF });
          pushCrossBillboard(fBuf, x, y, z, bdef.side ?? 0, 1.0, null);
          continue;
        }
        if (id === 674) {
          // Hanging vine tendril: foliage-tinted cross-billboard
          const fBuf = mBuf({ pos: posF, norm: normF, uv: uvF, col: colF, idx: idxF });
          pushCrossBillboard(fBuf, x, y, z, bdef.side ?? 0, 1.0, colFoliage(lx, lz));
          continue;
        }
        if (hasPropModel(id)) {
          // Data-driven prop: skip only when fully buried (all 6 neighbors opaque)
          if (isOpaqueForMeshing(getCell(x, y + 1, z)) && isOpaqueForMeshing(getCell(x, y - 1, z)) &&
              isOpaqueForMeshing(getCell(x + 1, y, z)) && isOpaqueForMeshing(getCell(x - 1, y, z)) &&
              isOpaqueForMeshing(getCell(x, y, z + 1)) && isOpaqueForMeshing(getCell(x, y, z - 1))) continue;
          pushPropModel(buf, x, y, z, id, bdef, getBlockTint(id, false, colGrass(lx, lz), colFoliage(lx, lz)));
          continue;
        }
        if (id === 123 || id === 127) {
          pushFlatDecal(buf, x, y, z, bdef.side ?? 0);
          continue;
        }
        if (bdef.fence || id === 161 || (bdef.name && /fence/i.test(bdef.name) && !/gate|particle/i.test(bdef.name))) {
          pushFence(buf, x, y, z, bdef.side ?? 0, getCell);
          continue;
        }
        if (id === 80 || id === 81 || id === 84) {
          const dv = dirs && dirs[off] ? dirs[off] : 0;
          const base = bdef.side ?? 0;
          pushTorchPost(buf, x, y, z, base, dv, customFaceTile(id, "top") ?? base, customFaceTile(id, "bottom") ?? base);
          pushTorchFlame(mBuf({ pos: posG, norm: normG, uv: uvG, col: colG, idx: idxG }), x, y, z, base, dv);
          continue;
        }
        if (id === 46 || id === 82) { pushLantern(buf, x, y, z, bdef.side ?? 0); continue; }
        if (isCandleId(id)) { pushCandle(buf, x, y, z, bdef.side ?? 0); continue; }
        if (id === 92) { pushEndRod(buf, x, y, z, bdef.side ?? 0); continue; }
        if (id === 97) { pushAmethystCluster(buf, x, y, z, bdef.side ?? 0); continue; }
        if (id === 98 || id === 1204) { pushPortalPanel(buf, x, y, z, 101); continue; }
        if (id === 259 || id === 1207 || id === 1208) {
          const tBuf = mBuf({ pos: posT, norm: normT, uv: uvT, col: colT, idx: idxT });
          const tile = bdef.side ?? 299;
          if (id === 1207) {
            const dv = dirs ? dirs[off] : 0;
            pushCobwebSparse(tBuf, x, y, z, tile, 1.0, dv >= 1 ? (dv - 1) % 2 : 0);
          }
          else if (id === 1208) pushTropicalBush(tBuf, x, y, z, tile, 1.0, 1.0, null);
          else pushCrossBillboard(tBuf, x, y, z, tile);
          continue;
        }
        if (isFireId(id)) { pushCrossBillboard(mBuf({ pos: posG, norm: normG, uv: uvG, col: colG, idx: idxG }), x, y, z, bdef.side ?? 0); continue; }
        if (id === 100) { pushFlatDecal(buf, x, y, z, bdef.side ?? 0, 0.02, 0.85); continue; }
        if (id === 101) { pushCrossBillboard(buf, x, y, z, bdef.side ?? 0); continue; }
        if (id === 103 || id === 209) { pushBrewingStand(buf, x, y, z, bdef.side ?? 0); continue; }
        if (id === 140) { pushLadder(buf, x, y, z, bdef.side ?? 0); continue; }
        if (id === BED_BYTE || id === BED_ID) { pushBed(buf, x, y, z, BED_TILE); continue; }
        if (id === 1205 || id === 1206) {
          const dv = dirs && dirs[off] ? dirs[off] : 0;
          const facing = dv >= 1 ? (dv - 1) % 4 : 0;
          pushPorchStair(
            buf, x, y, z, bdef, facing, id === 1206,
            customFaceTile(id, "top") ?? bdef.top ?? bdef.side ?? 0,
            customFaceTile(id, "bottom") ?? bdef.bottom ?? bdef.side ?? 0,
            customFaceTile(id, "side") ?? bdef.side ?? 0
          );
          continue;
        }
        for (let fIdx = 0; fIdx < FACES.length; fIdx++) {
          const f = FACES[fIdx];
          const nx = f.dir[0], ny = f.dir[1], nz = f.dir[2];
          if (consumed && (ny === 1 || ny === -1) && consumed[y * 512 + (ny === 1 ? 0 : 1) * 256 + lz * 16 + lx] === 1) continue;
          const neighborId = getCell(x + nx, y + ny, z + nz);
          if (isOpaqueForMeshing(neighborId)) continue;
          if (id === neighborId) continue;
          if (id === 39 && (neighborId === 39 || neighborId === 52 || neighborId === 53)) continue;
          if (id === 40 && neighborId === 40) continue;

          const tile = (ny > 0 ? (bdef.top ?? bdef.side) : (ny < 0 ? (bdef.bottom ?? bdef.side) : bdef.side)) ?? 0;
          const tint = getBlockTint(id, ny === 1, colGrass(lx, lz), colFoliage(lx, lz));

          pushFaceInto(buf, x, y, z, f, tile, getCell, !!req.fast, tint);
        }
      }
    }
  }

  const packBuffers = (
    pos: number[], norm: number[], uv: number[], col: number[], idx: number[]
  ): SerializedMeshBuffers | null => {
    if (!idx.length) return null;
    const n = pos.length / 3;
    const nNorm = new Uint8Array(n * 3);
    const nUv = new Uint16Array(n * 2);
    const nCol = new Uint8Array(n * 3);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) {
        nNorm[i * 3 + k] = Math.round(Math.max(-1, Math.min(1, norm[i * 3 + k])) * 127.5 + 127.5);
        nCol[i * 3 + k] = Math.round(Math.max(0, Math.min(1, col[i * 3 + k])) * 255);
      }
      nUv[i * 2] = Math.round(Math.max(0, Math.min(1, uv[i * 2])) * 65535);
      nUv[i * 2 + 1] = Math.round(Math.max(0, Math.min(1, uv[i * 2 + 1])) * 65535);
    }
    return { pos: new Float32Array(pos), norm: nNorm, uv: nUv, col: nCol, idx: new Uint32Array(idx) };
  };

  return {
    cx,
    cz,
    opaque: packBuffers(posO, normO, uvO, colO, idxO),
    foliage: packBuffers(posF, normF, uvF, colF, idxF),
    grass: packBuffers(posGr, normGr, uvGr, colGr, idxGr),
    glow: packBuffers(posG, normG, uvG, colG, idxG),
    trans: packBuffers(posT, normT, uvT, colT, idxT),
    water: packBuffers(posT, normT, uvT, colT, idxT),
    emitterKeys
  };
}

function pushFaceInto(
  t: TypedMeshBuffer,
  x: number,
  y: number,
  z: number,
  f: typeof FACES[0],
  tile: number,
  getCell: (x: number, y: number, z: number) => number,
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
      const s1 = isOpaqueForMeshing(getCell(x + nx + o1[0], y + ny + o1[1], z + nz + o1[2])) ? 1 : 0;
      const s2 = isOpaqueForMeshing(getCell(x + nx + o2[0], y + ny + o2[1], z + nz + o2[2])) ? 1 : 0;
      const s3 = isOpaqueForMeshing(getCell(x + nx + o3[0], y + ny + o3[1], z + nz + o3[2])) ? 1 : 0;
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

export { buildChunkMeshBuffers };

// Worker entry point: run only when this module is loaded inside a Web Worker.
if (typeof self !== "undefined" && typeof window === "undefined") {
  const wself = self as unknown as {
    onmessage: ((e: MessageEvent<ChunkMeshRequest>) => void) | null;
    postMessage: (msg: unknown, transfer?: Transferable[]) => void;
  };
  wself.onmessage = (e) => {
    const req = e.data;
    try {
      const res = buildChunkMeshBuffers(req);
      const transfer: Transferable[] = [];
      for (const k of ["opaque", "foliage", "grass", "glow", "trans"] as const) {
        const buf = res[k];
        if (buf) transfer.push(buf.pos.buffer, buf.norm.buffer, buf.uv.buffer, buf.col.buffer, buf.idx.buffer);
      }
      // Deduplicate (trans & water share the same buffers when present).
      const unique = transfer.filter((b, i) => transfer.indexOf(b) === i);
      wself.postMessage({ res, req: { cx: req.cx, cz: req.cz } }, unique);
    } catch (err) {
      wself.postMessage({ error: String((err as Error)?.message || err), req: { cx: req.cx, cz: req.cz } });
    }
  };
}
