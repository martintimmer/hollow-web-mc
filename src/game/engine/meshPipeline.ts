import { CH, CHH } from "../world";
import type { Chunk } from "../world";
import type { GameState } from "../state/gameState";
import { BLOCK_MAP } from "../blocks";
import { ckey, registerEmitter } from "../world/chunkData";
import type { ChunkMeshRequest } from "./meshWorker";

let glowIds: Set<number> | null = null;
let glowIdsSize = -1;

function getGlowIds(): Set<number> {
  if (!glowIds || glowIdsSize !== BLOCK_MAP.size) {
    glowIds = new Set<number>();
    for (const [id, b] of BLOCK_MAP) {
      if ((b as { glow?: number; lightPower?: number; light?: number }).glow || (b as { glow?: number; lightPower?: number; light?: number }).lightPower || (b as { glow?: number; lightPower?: number; light?: number }).light) glowIds.add(id);
    }
    glowIdsSize = BLOCK_MAP.size;
  }
  return glowIds;
}

export function restoreChunkEmitters(s: GameState, c: Chunk): void {
  if (!c.data) return;
  const glow = getGlowIds();
  for (let i = 0; i < c.data.length; i++) {
    const id = c.data[i];
    if (id && glow.has(id)) {
      registerEmitter(s, c.cx * CH + (i & 15), i >> 8, c.cz * CH + ((i >> 4) & 15), id);
    }
  }
}

export function dropChunkMesh(s: GameState, c: Chunk): void {
  if (!s.scene) return;
  s.meshJobs.delete(ckey(c.cx, c.cz));
  if (c.meshes) {
    c.meshes.forEach(m => {
      s.scene?.remove(m);
      m.geometry.dispose();
    });
    c.meshes = null;
  }
  if (c.emitterKeys) {
    for (let i = 0; i < c.emitterKeys.length; i++) {
      const k = c.emitterKeys[i];
      s.emitters.delete(k);
      s.lanterns.delete(k);
    }
    c.emitterKeys = undefined;
  }
  if (s.chestEntities) {
    for (const [key, ent] of s.chestEntities) {
      const [ex, , ez] = key.split(",").map(Number);
      if ((ex >> 4) === c.cx && (ez >> 4) === c.cz) {
        if (ent.root) s.scene.remove(ent.root);
        s.chestEntities.delete(key);
      }
    }
  }
  if (s.customAssetEntities) {
    for (const [key, ent] of s.customAssetEntities) {
      const [ex, , ez] = key.split(",").map(Number);
      if ((ex >> 4) === c.cx && (ez >> 4) === c.cz) {
        if (ent.root) s.scene.remove(ent.root);
        s.customAssetEntities.delete(key);
      }
    }
  }
}

export function collectNeighborBorders(s: GameState, cx: number, cz: number): ChunkMeshRequest["neighborBorders"] {
  const strip = (lcx: number, lcz: number): Uint16Array | undefined => {
    const c = s.chunks.get(ckey(cx + lcx, cz + lcz));
    if (!c) return undefined;
    const d = c.data, b = new Uint16Array(16 * CHH);
    if (lcx !== 0) {
      const sx = lcx > 0 ? 0 : 15;
      for (let y = 0; y < CHH; y++) {
        const yOff = y * 256 + sx;
        const bOff = y * 16;
        for (let z = 0; z < 16; z++) b[bOff + z] = d[yOff + z * 16];
      }
    } else {
      const sz = lcz > 0 ? 0 : 15;
      for (let y = 0; y < CHH; y++) {
        const yOff = y * 256 + sz * 16;
        const bOff = y * 16;
        for (let x = 0; x < 16; x++) b[bOff + x] = d[yOff + x];
      }
    }
    return b;
  };

  const north = strip(0, -1);
  const south = strip(0, 1);
  const west = strip(-1, 0);
  const east = strip(1, 0);
  if (!north && !south && !west && !east) return undefined;
  return { north, south, west, east };
}

export function markAdjacentBorderChunksDirty(cx: number, cz: number, lx: number, lz: number, dirtySet: Set<string>): void {
  if (lx === 0) dirtySet.add(ckey(cx - 1, cz));
  if (lx === 15) dirtySet.add(ckey(cx + 1, cz));
  if (lz === 0) dirtySet.add(ckey(cx, cz - 1));
  if (lz === 15) dirtySet.add(ckey(cx, cz + 1));
}
