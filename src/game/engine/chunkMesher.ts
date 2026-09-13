import * as THREE from "three";
import type { GameState, MeshJob } from "../state/gameState";
import type { Chunk } from "../world";
import { CH, CHH } from "../world";
import { BLOCK_MAP, BED_BYTE, BED_ID, BED_TILE, isOpaque } from "../blocks";
import { createArticulatedChest, computeChestPair } from "../chest";
import {
  FACES,
  emptyBuf,
  pushFace,
  pushStair,
  pushPorchStair,
  pushDoor,  pushTrapdoor,
  pushCrossBillboard,
  pushCobwebSparse,
  pushTropicalBush,
  pushFlatDecal,
  pushFence,
  pushTorchPost,
  pushTorchFlame,
  pushLantern,
  pushCandle,
  isCandleId,
  isFlowerId,
  isSaplingId,
  isFireId,
  isCrossPlantId,
  isNonOccludingShape,
  pushEndRod,
  pushAmethystCluster,
  pushPortalPanel,
  pushLadder,
  pushBed,
  pushBrewingStand,
  pushPropModel,
  hasPropModel,
  pushSlab,
  toGeom,
  toGeomTyped,
  combinePacked,
} from "./chunkMesh";
import { customFaceTile } from "./customFaceTiles";
import { getBlockTint, blurBiomeTints, type BlurredTints } from "../terrain/biomes";
import { MeshPool } from "./meshPool";
import { emitterOutMul } from "./lightMeter";
import type { MeshRequestMeta } from "./meshPool";
import type { ChunkMeshResponse } from "./meshWorker";
import { dropChunkMesh, collectNeighborBorders, restoreChunkEmitters } from "./meshPipeline";
import { ckey } from "../world/chunkData";
import { perf } from "../telemetry";

type CustomBlockDef = { customAssetId?: number };

function isOpaqueMeshingBlock(id: number): boolean {
  const def = BLOCK_MAP.get(id);
  return !!def && !(id >= 105 && id <= 108) && !isNonOccludingShape(id) && !(def as CustomBlockDef).customAssetId && isOpaque(id);
}

export interface ChunkMesherContext {
  s: GameState;
  meshPoolOk: { v: boolean };
  meshWaiters: Map<string, (ok: boolean) => void>;
  getChunk: (cx: number, cz: number) => Chunk | undefined;
  getBlock: (x: number, y: number, z: number) => number;
  getMeshPool: () => MeshPool | null;
  syncCustomAssetsForChunk: (c: Chunk) => void;
  getBiome?: (x: number, z: number) => any;
}

export interface ChunkMesher {
  buildMesh: (cx: number, cz: number, sliceMs?: number) => Promise<void>;
  advanceMeshJob: (job: MeshJob, sliceMs: number) => void;
  onMeshPoolResult: (meta: MeshRequestMeta, res: ChunkMeshResponse) => void;
}

export function shadowCasterCutoff(s: GameState): number {
  return s.shadowRad ? s.shadowRad / CH + 1 : 3.5;
}

export function bakeEmitterTint(s: GameState, meshes: THREE.Mesh[], cx: number, cz: number): void {
  const chunks = (s as unknown as { chunks?: Map<string, { emitterKeys?: string[] }> }).chunks;
  const emitters = (s as unknown as { emitters?: Map<string, { x: number; y: number; z: number; col: number; dist: number; power: number; id?: number }> }).emitters;
  if (!chunks || !emitters) return;
  const near: { x: number; y: number; z: number; r: number; g: number; b: number; R: number; k: number }[] = [];
  for (let dz = -1; dz <= 1 && near.length < 24; dz++) for (let dx = -1; dx <= 1 && near.length < 24; dx++) {
    const keys = chunks.get((cx + dx) + "," + (cz + dz))?.emitterKeys;
    if (!keys) continue;
    for (const key of keys) {
      const em = emitters.get(key);
      if (!em) continue;
      near.push({
        x: em.x, y: em.y, z: em.z,
        r: ((em.col >> 16) & 255) / 255, g: ((em.col >> 8) & 255) / 255, b: (em.col & 255) / 255,
        R: (em.dist || 14) + 2, k: (em.power || 1.2) * emitterOutMul(em.id) * 0.6,
      });
      if (near.length >= 24) break;
    }
  }
  if (!near.length) return;
  const glow = s.matGlow, trans = s.matTrans;
  for (const m of meshes) {
    if (m.material === glow || m.material === trans) continue;
    const g = m.geometry;
    const posA = g.attributes.position as THREE.BufferAttribute | undefined;
    const colA = g.attributes.color as THREE.BufferAttribute | undefined;
    if (!posA || !colA) continue;
    for (let i = 0; i < posA.count; i++) {
      const vx = posA.getX(i), vy = posA.getY(i), vz = posA.getZ(i);
      let ar = 0, ag = 0, ab = 0;
      let coreW = 0, coreR = 0, coreG = 0, coreB = 0;
      for (const em of near) {
        const ddx = vx - em.x;
        if (ddx > em.R || ddx < -em.R) continue;
        const ddz = vz - em.z;
        if (ddz > em.R || ddz < -em.R) continue;
        const ddy = vy - em.y;
        const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
        if (d2 >= em.R * em.R) continue;
        const d = Math.sqrt(d2);
        const att = 1 - d / em.R;
        const w = att * att * em.k;
        ar += w * em.r; ag += w * em.g; ab += w * em.b;
        if (d2 < 1.69) {
          const cw = em.k * 2.2 * (1 - d / 2.6);
          if (cw > coreW) { coreW = cw; coreR = em.r; coreG = em.g; coreB = em.b; }
        }
      }
      if (coreW > 0.05) {
        colA.setXYZ(i, coreR * coreW, coreG * coreW, coreB * coreW);
      } else if (ar > 0.004 || ag > 0.004 || ab > 0.004) {
        colA.setXYZ(i,
          Math.min(1, colA.getX(i) + ar),
          Math.min(1, colA.getY(i) + ag),
          Math.min(1, colA.getZ(i) + ab));
      }
    }
  }
}

export function refreshShadowCasterFlags(s: GameState): void {
  const chunks = (s as unknown as { chunks?: Map<string, { cx: number; cz: number; meshes?: THREE.Mesh[] }> }).chunks;
  if (!chunks) return;
  const ax = s.cinematic && s.cine ? s.cine.x : s.player.x;
  const az = s.cinematic && s.cine ? s.cine.z : s.player.z;
  const pcx = Math.floor(ax / CH), pcz = Math.floor(az / CH);
  const cutoff = shadowCasterCutoff(s);
  const glow = s.matGlow, trans = s.matTrans;
  for (const c of chunks.values()) {
    const want = !!s.shadowsOn && Math.hypot(c.cx - pcx, c.cz - pcz) <= cutoff;
    const meshes = c.meshes;
    if (!meshes) continue;
    for (const m of meshes) {
      if (m.material === glow || m.material === trans) continue;
      if (m.castShadow !== want) m.castShadow = want;
    }
  }
}

export function createChunkMesher(ctx: ChunkMesherContext): ChunkMesher {
  const s = ctx.s;

  function buildMeshGroup(
    go: THREE.BufferGeometry | null,
    gfol: THREE.BufferGeometry | null,
    ggrass: THREE.BufferGeometry | null,
    gg: THREE.BufferGeometry | null,
    gt: THREE.BufferGeometry | null,
    isShadowCaster: boolean
  ): THREE.Mesh[] {
    const matMain = s.matMerged ?? s.matOpaque!;
    const matTrans = s.matTrans!;
    const meshes: THREE.Mesh[] = [];
    if (go) {
      const m = new THREE.Mesh(go, matMain);
      m.castShadow = isShadowCaster;
      m.receiveShadow = true;
      m.frustumCulled = true;
      meshes.push(m);
    }
    if (gfol) {
      const m = new THREE.Mesh(gfol, s.matFoliage ?? matMain);
      m.castShadow = isShadowCaster; // foliage casts; texel-snapped shadow is now stable
      m.receiveShadow = true;
      m.frustumCulled = true;
      meshes.push(m);
    }
    if (ggrass) {
      const m = new THREE.Mesh(ggrass, s.matGrass ?? s.matFoliage ?? matMain);
      m.castShadow = isShadowCaster; // grass billboards cast, sway matches the depth pass
      m.receiveShadow = true;
      m.frustumCulled = true;
      meshes.push(m);
    }
    if (gg) {
      const m = new THREE.Mesh(gg, s.matGlow ?? matMain);
      m.frustumCulled = true;
      meshes.push(m);
    }
    if (gt) {
      const m = new THREE.Mesh(gt, matTrans);
      m.renderOrder = 2;
      m.receiveShadow = true;
      m.frustumCulled = true;
      meshes.push(m);
    }
    return meshes;
  }

  function attachChunkMeshes(c: Chunk, res: ChunkMeshResponse) {
    const matOpaque = s.matOpaque, matFoliage = s.matFoliage, matGlow = s.matGlow, matTrans = s.matTrans;
    if (!matOpaque || !matFoliage || !matGlow || !matTrans) return;
    dropChunkMesh(s, c);
    restoreChunkEmitters(s, c);
    const cx = c.cx, cz = c.cz;
    const ax = s.cinematic && s.cine ? s.cine.x : s.player.x;
    const az = s.cinematic && s.cine ? s.cine.z : s.player.z;
    const pcx = Math.floor(ax / CH), pcz = Math.floor(az / CH);
    const distFromPlayer = Math.hypot(cx - pcx, cz - pcz);
    const isShadowCaster = s.shadowsOn && distFromPlayer <= shadowCasterCutoff(s);

    const MERGE_ENABLED = true;
    let meshes: THREE.Mesh[];
    if (MERGE_ENABLED) {
      const gm = combinePacked([res.opaque]);
      const gfol = res.foliage ? toGeomTyped(res.foliage.pos, res.foliage.norm, res.foliage.uv, res.foliage.col, res.foliage.idx) : null;
      const ggrass = res.grass ? toGeomTyped(res.grass.pos, res.grass.norm, res.grass.uv, res.grass.col, res.grass.idx) : null;
      const gg = res.glow ? toGeomTyped(res.glow.pos, res.glow.norm, res.glow.uv, res.glow.col, res.glow.idx) : null;
      const gt = res.trans ? toGeomTyped(res.trans.pos, res.trans.norm, res.trans.uv, res.trans.col, res.trans.idx) : null;
      meshes = buildMeshGroup(gm, gfol, ggrass, gg, gt, isShadowCaster);
    } else {      const go = res.opaque ? toGeomTyped(res.opaque.pos, res.opaque.norm, res.opaque.uv, res.opaque.col, res.opaque.idx) : null;
      const gfol = res.foliage ? toGeomTyped(res.foliage.pos, res.foliage.norm, res.foliage.uv, res.foliage.col, res.foliage.idx) : null;
      const ggrass = res.grass ? toGeomTyped(res.grass.pos, res.grass.norm, res.grass.uv, res.grass.col, res.grass.idx) : null;
      const gg = res.glow ? toGeomTyped(res.glow.pos, res.glow.norm, res.glow.uv, res.glow.col, res.glow.idx) : null;
      const gt = res.trans ? toGeomTyped(res.trans.pos, res.trans.norm, res.trans.uv, res.trans.col, res.trans.idx) : null;
      meshes = buildMeshGroup(go, gfol, ggrass, gg, gt, isShadowCaster);
    }
    bakeEmitterTint(s, meshes, cx, cz);
    meshes.forEach(m => {
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      s.scene?.add(m);
    });
    c.meshes = meshes;
    s.mapTiles.delete(ckey(cx, cz));

    spawnChunkChestEntities(c);
    ctx.syncCustomAssetsForChunk(c);
  }

  // Spawn the discrete 3D chest entities for a chunk (used by BOTH the worker
  // result path and the main-thread fallback path so chests always render).
  // Pairing follows the large-chest ruleset (computeChestPair): pairs render as a
  // single large entity spawned at the left half; the right half is skipped.
  // Existing entities are reconciled (a single upgraded to large when a neighbour
  // chest appears, and a stale large split back into singles).
  function spawnChunkChestEntities(c: Chunk) {
    if (!c.data || !s.scene) return;
    if (!s.chestEntities) s.chestEntities = new Map();
    for (let i = 0; i < c.data.length; i++) {
      if (c.data[i] !== 43) continue;
      const gx = cxOf(c.cx, i & 15);
      const gy = i >> 8;
      const gz = czOf(c.cz, (i >> 4) & 15);
      const pair = computeChestPair(ctx.getBlock, gx, gy, gz);
      const key = `${gx},${gy},${gz}`;
      if (pair.isLarge) {
        if (gx !== pair.leftX) continue; // right half → the left half owns the large entity
        const kL = `${pair.leftX},${gy},${gz}`;
        const kR = `${pair.rightX},${gy},${gz}`;
        const existing = s.chestEntities.get(kL);
        if (existing && existing.isLarge) continue;
        if (existing) { if (existing.root) s.scene.remove(existing.root); s.chestEntities.delete(kL); }
        const oldR = s.chestEntities.get(kR);
        if (oldR) { if (oldR.root) s.scene.remove(oldR.root); s.chestEntities.delete(kR); }
        const dv = c.dirs ? c.dirs[i] : 0;
        const facing = dv >= 1 ? (dv - 1) % 4 : 0;
        const targetYaw = ([0, Math.PI, Math.PI / 2, -Math.PI / 2])[facing % 4] ?? 0;
        const entity = createArticulatedChest({ yaw: targetYaw, isLarge: true });
        entity.x = pair.leftX; entity.y = gy; entity.z = gz;
        entity.root.position.set(pair.leftX + 1.0, gy, gz + 0.5);
        s.scene.add(entity.root);
        s.chestEntities.set(kL, entity);
        s.chestEntities.set(kR, entity);
      } else {
        const existing = s.chestEntities.get(key);
        if (existing && !existing.isLarge) continue;
        if (existing) { if (existing.root) s.scene.remove(existing.root); s.chestEntities.delete(key); }
        const dv = c.dirs ? c.dirs[i] : 0;
        const facing = dv >= 1 ? (dv - 1) % 4 : 0;
        const targetYaw = ([0, Math.PI, Math.PI / 2, -Math.PI / 2])[facing % 4] ?? 0;
        const entity = createArticulatedChest({ yaw: targetYaw });
        entity.x = gx; entity.y = gy; entity.z = gz;
        entity.root.position.set(gx + 0.5, gy, gz + 0.5);
        s.scene.add(entity.root);
        s.chestEntities.set(key, entity);
      }
    }
  }

  function cxOf(cx: number, lx: number): number { return cx * CH + lx; }
  function czOf(cz: number, lz: number): number { return cz * CH + lz; }

  function onMeshPoolResult(meta: MeshRequestMeta, res: ChunkMeshResponse) {
    const key = ckey(meta.cx, meta.cz);
    meta.resolve(true);
    const c = ctx.getChunk(meta.cx, meta.cz);
    if (!c || !s.scene) return;
    if (c.version !== meta.version) return;
    attachChunkMeshes(c, res);
    perf.chunkOp("mesh", key, performance.now() - meta.t0);
  }

  async function buildMesh(cx: number, cz: number, sliceMs = 0): Promise<void> {
    const c = ctx.getChunk(cx, cz);
    if (!c || !s.scene || !s.matOpaque || !s.matGlow || !s.matTrans || !s.matFoliage) return;
    const key = ckey(cx, cz);
    const version = (c.version = (c.version ?? 0) + 1);
    const pcx = Math.floor(s.player.x / CH), pcz = Math.floor(s.player.z / CH);
    const fast = Math.hypot(cx - pcx, cz - pcz) > s.render - 2;

    const pool = ctx.getMeshPool();
    s.meshPoolDepth = pool && ctx.meshPoolOk.v ? pool.depth() : 0;
    s.meshPoolBusy = pool && ctx.meshPoolOk.v ? pool.busyCount() : 0;
    let biomeGrid: string[] | undefined;
    let biomeHalo: string[] | undefined;
    let tintGrids: BlurredTints | undefined;
    if (ctx.getBiome) {
      const getBiome = ctx.getBiome;
      const sample = (gx: number, gz: number): string => {
        try {
          const b = getBiome(gx, gz);
          return typeof b === "string" ? b : b?.id ?? "plains";
        } catch {
          return "plains";
        }
      };
      biomeGrid = new Array(256);
      biomeHalo = new Array(324);
      for (let lz = 0; lz < 16; lz++) {
        for (let lx = 0; lx < 16; lx++) biomeGrid[lz * 16 + lx] = sample(cx * CH + lx, cz * CH + lz);
      }
      for (let lz = -1; lz <= 16; lz++) {
        for (let lx = -1; lx <= 16; lx++) biomeHalo[(lz + 1) * 18 + (lx + 1)] = sample(cx * CH + lx, cz * CH + lz);
      }
      tintGrids = blurBiomeTints(biomeGrid, biomeHalo);
    }
    if (ctx.meshPoolOk.v && pool) {
      s.meshJobs.delete(key);
      return new Promise<void>((resolve) => {
        const done = () => {
          const w = ctx.meshWaiters.get(key);
          if (w) ctx.meshWaiters.delete(key);
          resolve();
        };
        ctx.meshWaiters.set(key, done);
        pool.request(
          {
            cx, cz, data: c.data, maxY: c.maxY, fast, dirs: c.dirs,
            neighborBorders: collectNeighborBorders(s, cx, cz),
            biomeGrid, biomeHalo, tintGrid: tintGrids
          },
          { cx, cz, version, t0: performance.now(), resolve: done }
        );
      });
    }
    s.meshFallbacks = (s.meshFallbacks || 0) + 1;

    if (s.meshJobs.has(key)) return;
    const job: MeshJob = {
      key, c, x0: cx * CH, z0: cz * CH,
      o: emptyBuf(), fol: emptyBuf(), grass: emptyBuf(), t: emptyBuf(), gl: emptyBuf(),
      y: 0, yMax: Math.min(CHH - 1, c.maxY), t0: performance.now(), version, fast, biomeGrid, tintGrids
    };
    s.meshJobs.set(key, job);
    advanceMeshJob(job, sliceMs);
  }

  // Runs one chunk mesh in y-band slices; yields back to the event loop when `sliceMs` is exceeded
  function advanceMeshJob(job: MeshJob, sliceMs: number) {
    const tStart = performance.now();
    const { c, x0, z0, yMax } = job;
    const cData = c.data;

    if (!job.tintGrids) {
      if (!job.biomeGrid && ctx.getBiome) {
        const grid = new Array<string>(256);
        for (let lz = 0; lz < 16; lz++) {
          for (let lx = 0; lx < 16; lx++) {
            try {
              const b = ctx.getBiome(x0 + lx, z0 + lz);
              grid[lz * 16 + lx] = typeof b === "string" ? b : b?.id ?? "plains";
            } catch {
              grid[lz * 16 + lx] = "plains";
            }
          }
        }
        job.biomeGrid = grid;
      }
      job.tintGrids = blurBiomeTints(job.biomeGrid ?? new Array(256).fill("plains"));
    }
    const grassGrid = job.tintGrids.grass;
    const foliageGrid = job.tintGrids.foliage;

    const getLocalOrGlobal = (gx: number, gy: number, gz: number) => {
      if (gy < 0 || gy >= CHH) return 0;
      const lx = gx - x0, lz = gz - z0;
      if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16) {
        return cData[gy * 256 + lz * 16 + lx];
      }
      return ctx.getBlock(gx, gy, gz);
    };

    while (job.y <= yMax) {
      const y = job.y++;
      const yOff = y * 256;
      for (let lz = 0; lz < 16; lz++) {
        const z = z0 + lz, zOff = yOff + lz * 16;
        for (let lx = 0; lx < 16; lx++) {
          const id = cData[zOff + lx];
          if (!id) continue;
          const x = x0 + lx;
          const B = BLOCK_MAP.get(id);
          if (!B) continue;
          if ((B as CustomBlockDef).customAssetId) continue;
          const buf = B.glow ? job.gl : (B.foliage ? job.fol : (B.trans ? job.t : job.o));
          if (B.stair) {
            const facing = job.c.dirs && job.c.dirs[y * 256 + lz * 16 + lx] ? job.c.dirs[y * 256 + lz * 16 + lx] - 1 : 0;
            pushStair(buf, x, y, z, B, facing);
            continue;
          }
          if (B.slab) {
            const dv = job.c.dirs && job.c.dirs[y * 256 + lz * 16 + lx] ? job.c.dirs[y * 256 + lz * 16 + lx] : 0;
            const isTop = dv === 1;
            const below = getLocalOrGlobal(x, y - 1, z);
            const above = getLocalOrGlobal(x, y + 1, z);
            const hideBottom = !isTop && isOpaqueMeshingBlock(below);
            const hideTop = isTop && isOpaqueMeshingBlock(above);
            pushSlab(buf, x, y, z, B, isTop, hideTop, hideBottom);
            continue;
          }
          if (id === 105 || id === 106) {
            const belowIsDoor = getLocalOrGlobal(x, y - 1, z) === 105 || getLocalOrGlobal(x, y - 1, z) === 106;
            const aboveIsDoor = getLocalOrGlobal(x, y + 1, z) === 105 || getLocalOrGlobal(x, y + 1, z) === 106;
            const dv = job.c.dirs && job.c.dirs[y * 256 + lz * 16 + lx] ? job.c.dirs[y * 256 + lz * 16 + lx] : 0;
            const facing = dv >= 1 ? (dv - 1) % 4 : 0;
            pushDoor(job.o, x, y, z, id, belowIsDoor ? 1 : (aboveIsDoor ? 2 : 0), facing);
            continue;
          }
          if (id === 107 || id === 108) {
            const dv = job.c.dirs && job.c.dirs[y * 256 + lz * 16 + lx] ? job.c.dirs[y * 256 + lz * 16 + lx] : 0;
            const facing = dv >= 1 ? (dv - 1) % 4 : 0;
            pushTrapdoor(job.o, x, y, z, id, facing, dv >= 5);
            continue;
          }
          if (id === 43) {
            continue; // Chests are purely rendered as discrete 3D articulated ChestEntities
          }
          if (id === 1202 || id === 1203) {
            const tile = id === 1202 ? 496 : 497;
            const gt = grassGrid[lz * 16 + lx];
            pushTropicalBush(job.grass, x, y, z, tile, 1.35, 1.0, gt);
            if (id === 1202 && getLocalOrGlobal(x, y + 1, z) === 0) {
              pushTropicalBush(job.grass, x, y + 1, z, 497, 1.35, 1.0, gt);
            }
            continue;
          }
          if (id === 361) {
            pushCrossBillboard(job.fol, x, y, z, B.side ?? 0, 1.0, grassGrid[lz * 16 + lx]);
            continue;
          }
          if (id === 124 || isFlowerId(id) || isSaplingId(id) || isCrossPlantId(id) || id === 131 || id === 1200 || id === 1201 || id === 361 || id === 429 || id === 658 || id === 133 || id === 661) {
            const tile = id === 1200 ? 815 : (id === 1201 ? 816 : (B.side ?? 0));
            const tint = (id === 124 || id === 1200 || id === 1201 || id === 361 || id === 429 || id === 658) ? grassGrid[lz * 16 + lx] : null;
            pushCrossBillboard(job.grass, x, y, z, tile, 1.0, tint ?? undefined);
            if (id === 1200 && getLocalOrGlobal(x, y + 1, z) === 0) {
              pushCrossBillboard(job.grass, x, y + 1, z, 816, 1.0, tint ?? undefined);
            }
            continue;
          }
          if (id === 123 || id === 127) {
            pushFlatDecal(buf, x, y, z, B.side ?? 0);
            continue;
          }
          if (id === 457) {
            pushFlatDecal(job.fol, x, y, z, B.top ?? B.side ?? 0, 0.015, 1.0, [0.13, 0.50, 0.19]);
            continue;
          }
          if (id === 309) {
            pushCrossBillboard(job.fol, x, y, z, B.side ?? 0, 1.0, null);
            continue;
          }
          if (id === 674) {
            pushCrossBillboard(job.fol, x, y, z, B.side ?? 0, 1.0, foliageGrid[lz * 16 + lx]);
            continue;
          }
          if (hasPropModel(id)) {
            if (isOpaqueMeshingBlock(getLocalOrGlobal(x, y + 1, z)) && isOpaqueMeshingBlock(getLocalOrGlobal(x, y - 1, z)) &&
                isOpaqueMeshingBlock(getLocalOrGlobal(x + 1, y, z)) && isOpaqueMeshingBlock(getLocalOrGlobal(x - 1, y, z)) &&
                isOpaqueMeshingBlock(getLocalOrGlobal(x, y, z + 1)) && isOpaqueMeshingBlock(getLocalOrGlobal(x, y, z - 1))) continue;
            pushPropModel(buf, x, y, z, id, B, getBlockTint(id, false, grassGrid[lz * 16 + lx], foliageGrid[lz * 16 + lx]));
            continue;
          }
          if (B.fence || id === 161 || (B.name && /fence/i.test(B.name) && !/gate|particle/i.test(B.name))) {
            pushFence(buf, x, y, z, B.side ?? 0, getLocalOrGlobal);
            continue;
          }
          if (id === 80 || id === 81 || id === 84) {
            const dv = job.c.dirs && job.c.dirs[y * 256 + lz * 16 + lx] ? job.c.dirs[y * 256 + lz * 16 + lx] : 0;
            const base = B.side ?? 0;
            pushTorchPost(buf, x, y, z, base, dv, customFaceTile(id, "top") ?? base, customFaceTile(id, "bottom") ?? base);
            pushTorchFlame(job.gl, x, y, z, base, dv);
            continue;
          }
          if (id === 46 || id === 82) { pushLantern(buf, x, y, z, B.side ?? 0); continue; }
          if (isCandleId(id)) { pushCandle(buf, x, y, z, B.side ?? 0); continue; }
          if (id === 92) { pushEndRod(buf, x, y, z, B.side ?? 0); continue; }
          if (id === 97) { pushAmethystCluster(buf, x, y, z, B.side ?? 0); continue; }
          if (id === 98 || id === 1204) { pushPortalPanel(buf, x, y, z, 101); continue; }
          if (id === 259 || id === 1207 || id === 1208) {
            const tile = B.side ?? 299;
            if (id === 1207) {
              const dv = job.c.dirs ? job.c.dirs[y * 256 + lz * 16 + lx] : 0;
              pushCobwebSparse(job.t, x, y, z, tile, 1.0, dv >= 1 ? (dv - 1) % 2 : 0);
            }
            else if (id === 1208) pushTropicalBush(job.t, x, y, z, tile, 1.0, 1.0, null);
            else pushCrossBillboard(job.t, x, y, z, tile);
            continue;
          }
          if (isFireId(id)) { pushCrossBillboard(job.gl, x, y, z, B.side ?? 0); continue; }
          if (id === 100) { pushFlatDecal(buf, x, y, z, B.side ?? 0, 0.02, 0.85); continue; }
          if (id === 101) { pushCrossBillboard(buf, x, y, z, B.side ?? 0); continue; }
          if (id === 103 || id === 209) { pushBrewingStand(buf, x, y, z, B.side ?? 0); continue; }
          if (id === 140) { pushLadder(buf, x, y, z, B.side ?? 0); continue; }
          if (id === BED_BYTE || id === BED_ID) { pushBed(buf, x, y, z, BED_TILE); continue; }
          if (id === 1205 || id === 1206) {
            const dv = job.c.dirs && job.c.dirs[y * 256 + lz * 16 + lx] ? job.c.dirs[y * 256 + lz * 16 + lx] : 0;
            const facing = dv >= 1 ? (dv - 1) % 4 : 0;
            pushPorchStair(
              buf, x, y, z, B, facing, id === 1206,
              customFaceTile(id, "top") ?? B.top ?? B.side ?? 0,
              customFaceTile(id, "bottom") ?? B.bottom ?? B.side ?? 0,
              customFaceTile(id, "side") ?? B.side ?? 0
            );
            continue;
          }
          for (const f of FACES) {
            const nb = getLocalOrGlobal(x + f.dir[0], y + f.dir[1], z + f.dir[2]);
            if (isOpaqueMeshingBlock(nb)) continue;
            if (id === nb) continue;
            if (id === 39 && (nb === 39 || nb === 52 || nb === 53)) continue;
            if (id === 40 && nb === 40) continue;
            const tile = (f.dir[1] === 1 ? (B.top ?? B.side) : (f.dir[1] === -1 ? (B.bottom ?? B.side) : B.side)) ?? 0;
            const tint = getBlockTint(id, f.dir[1] === 1, grassGrid[lz * 16 + lx], foliageGrid[lz * 16 + lx]);
            pushFace(buf, x, y, z, f, tile, getLocalOrGlobal, job.fast, tint);
          }
        }
      }
      if (sliceMs > 0 && performance.now() - tStart >= sliceMs && job.y <= yMax) {
        s.meshResume.push(job.key);
        return;
      }
    }
    completeMeshJob(job);
  }

  function completeMeshJob(job: MeshJob) {
    s.meshJobs.delete(job.key);
    if (job.c.version !== job.version) return;
    const { c, o, fol, grass, t, gl } = job;
    const matOpaque = s.matOpaque, matFoliage = s.matFoliage, matGlow = s.matGlow, matTrans = s.matTrans;
    if (!matOpaque || !matFoliage || !matGlow || !matTrans) return;
    const cx = c.cx, cz = c.cz;
    const ax = s.cinematic && s.cine ? s.cine.x : s.player.x;
    const az = s.cinematic && s.cine ? s.cine.z : s.player.z;
    const pcx = Math.floor(ax / CH), pcz = Math.floor(az / CH);
    const distFromPlayer = Math.hypot(cx - pcx, cz - pcz);
    const isShadowCaster = s.shadowsOn && distFromPlayer <= shadowCasterCutoff(s);
    dropChunkMesh(s, c);
    restoreChunkEmitters(s, c);

    const meshes = buildMeshGroup(toGeom(o), toGeom(fol), toGeom(grass), toGeom(gl), toGeom(t), isShadowCaster);
    bakeEmitterTint(s, meshes, cx, cz);
    meshes.forEach(m => {
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      s.scene?.add(m);
    });
    c.meshes = meshes;
    s.mapTiles.delete(ckey(cx, cz));
    spawnChunkChestEntities(c);
    ctx.syncCustomAssetsForChunk(c);
    perf.chunkOp("mesh", job.key, performance.now() - job.t0);
  }

  return { buildMesh, advanceMeshJob, onMeshPoolResult };
}
