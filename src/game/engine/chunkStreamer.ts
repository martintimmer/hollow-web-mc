import * as THREE from "three";
import type { GameState, MeshJob } from "../state/gameState";
import type { Chunk } from "../world";
import { CH } from "../world";
import type { HorizonColumn } from "./horizonLOD";
import { dropChunkMesh } from "./meshPipeline";
import { buildHorizonLODTiles } from "./horizonLOD";

export interface ChunkStreamerCtx {
  s: GameState;
  getChunk: (cx: number, cz: number) => Chunk | undefined;
  genChunk: (cx: number, cz: number) => Chunk;
  buildMesh: (cx: number, cz: number, sliceMs?: number) => Promise<void>;
  advanceMeshJob: (job: MeshJob, sliceMs: number) => void;
  sampleHorizon: (x: number, z: number) => HorizonColumn;
  setChunkCount: (n: number) => void;
}

export interface ChunkStreamer {
  updateHorizonMesh: (force?: boolean) => void;
  rescan: (pcx: number, pcz: number) => void;
  stream: (budgetMs: number) => void;
}

export function createChunkStreamer(ctx: ChunkStreamerCtx): ChunkStreamer {
  const s = ctx.s;

  function disposeHorizon() {
    if (!s.horizonMesh) return;
    if (s.scene) s.scene.remove(s.horizonMesh);
    s.horizonMesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m && (m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose();
    });
    s.horizonMesh = null;
    s.horizonTileCount = 0;
  }

  function updateHorizonMesh(force = false) {
    if (!s.scene || !s.matOpaque) return;
    const pcx = Math.floor(s.player.x / CH), pcz = Math.floor(s.player.z / CH);
    if (!force && s.horizonMesh && Math.hypot(pcx - s.horizonCenterCX, pcz - s.horizonCenterCZ) < 6) {
      return;
    }
    s.horizonCenterCX = pcx;
    s.horizonCenterCZ = pcz;

    disposeHorizon();

    const px = s.player.x, pz = s.player.z;
    const nearRadius = Math.max(64, (s.render + 0.25) * CH);
    const camFar = s.camera ? s.camera.far : 800;
    const farRadius = Math.min(Math.max(nearRadius + 448, 54 * CH), camFar);

    const map = s.matOpaque.map ?? s.atlasTex ?? null;
    const tH = performance.now();
    const group = buildHorizonLODTiles({
      centerX: px,
      centerZ: pz,
      nearRadiusBlocks: nearRadius,
      farRadiusBlocks: farRadius,
      seed: s.seed,
      sampleColumn: ctx.sampleHorizon
    }, map);
    s.horizonBuildMs = performance.now() - tH;

    if (group) {
      s.scene.add(group);
      s.horizonMesh = group;
      s.horizonTileCount = group.children.length;
    }
  }

  function rescan(pcx: number, pcz: number) {
    s.genQ = []; s.meshQ = [];
    const R = s.render;
    const flyVx = s.player.vx, flyVz = s.player.vz;
    const flySpeed = Math.hypot(flyVx, flyVz);
    const hx = flySpeed > 1 ? flyVx / flySpeed : 0;
    const hz = flySpeed > 1 ? flyVz / flySpeed : 0;

    for (let dz = -R - 1; dz <= R + 1; dz++) for (let dx = -R - 1; dx <= R + 1; dx++) {
      const cx = pcx + dx, cz = pcz + dz, d = Math.hypot(dx, dz);
      if (d > R + 1.5) continue;
      const fwdBias = (hx !== 0 || hz !== 0) ? (dx * hx + dz * hz) * -0.5 : 0;
      const priority = d + fwdBias;

      const c = ctx.getChunk(cx, cz);
      if (!c) s.genQ.push([cx, cz, priority]);
      else if (d <= R + 0.5 && !c.meshes) s.meshQ.push([cx, cz, priority]);
    }
    s.genQ.sort((a, b) => a[2] - b[2]);
    s.meshQ.sort((a, b) => a[2] - b[2]);
    for (const [k, c] of s.chunks) {
      const d = Math.hypot(c.cx - pcx, c.cz - pcz);
      const keepDist = (s.keep || s.render + 3) + 0.5;
      if (d > keepDist && c.meshes) dropChunkMesh(s, c);
      if (d > keepDist + 2.5) { dropChunkMesh(s, c); s.chunks.delete(k); }
    }
    const now = performance.now();
    if (now - (s.lastChunkCountAt || 0) > 2000) {
      s.lastChunkCountAt = now;
      ctx.setChunkCount(s.chunks.size);
    }
  }

  function stream(budgetMs: number) {
    const t0 = performance.now();
    const flySpeed = Math.hypot(s.player.vx, s.player.vz);
    const queued = s.genQ.length + s.meshQ.length + s.meshResume.length;
    let maxMs = s.active ? 1.2 : budgetMs;
    if (queued > 40) maxMs = Math.max(maxMs, Math.min(5, 1.2 + queued / 50));
    if (flySpeed > 8) maxMs = Math.max(maxMs, 3);
    const meshFirst = s.meshQ.length > 40;

    while (performance.now() - t0 < maxMs) {
      if (s.meshResume.length) {
        const k = s.meshResume.shift()!;
        const job = s.meshJobs.get(k);
        if (!job) continue;
        ctx.advanceMeshJob(job, s.active ? 1.5 : 0);
        if (performance.now() - t0 >= maxMs) break;
        continue;
      }

      if (meshFirst && s.meshQ.length) {
        const q = s.meshQ.shift()!;
        ctx.buildMesh(q[0], q[1], s.active ? 1.5 : 0);
        if (performance.now() - t0 >= maxMs) break;
        continue;
      }

      if (s.genQ.length) {
        const q = s.genQ.shift()!;
        ctx.genChunk(q[0], q[1]);
        const pcx = Math.floor(s.player.x / CH), pcz = Math.floor(s.player.z / CH);
        const d = Math.hypot(q[0] - pcx, q[1] - pcz);
        if (d <= s.render + 0.5) {
          s.meshQ.push([q[0], q[1], q[2]]);
        }
        if (performance.now() - t0 >= maxMs) break;
        continue;
      }

      if (s.meshQ.length) {
        const q = s.meshQ.shift()!;
        ctx.buildMesh(q[0], q[1], s.active ? 1.5 : 0);
        if (performance.now() - t0 >= maxMs) break;
        continue;
      }
      break;
    }
  }

  return { updateHorizonMesh, rescan, stream };
}