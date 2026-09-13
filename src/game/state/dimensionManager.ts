/**
 * Dimension Manager: Dual-World Architecture & Persistence
 * Manages transitions between the Overworld and the Nether, keeping both
 * worlds isolated in memory, independently persisted to disk/database,
 * and maintaining separate chunk maps, block edits, and chest contents.
 */

import type { Chunk } from "../world";
import type { GameState } from "./gameState";
import { createNetherGenerator, type NetherGenerator } from "../terrain/netherGenerator";
import {
  getNetherTargetCoords,
  findNearbyPortal,
  buildObsidianPortalGate,
  isPlayerInsidePortal
} from "../entities/netherGate";

export type Dimension = "overworld" | "nether";

export interface DimensionState {
  dimension: Dimension;
  netherGen: NetherGenerator;
  portalCooldown: number; // Seconds before player can re-enter portal
  dwellTimer: number; // Seconds standing inside portal
  isWarping: boolean;

  // Overworld Storage Cache
  overworldChunks: Map<string, Chunk>;
  overworldEdits: Map<string, number>;
  overworldEditsByChunk: Map<string, Map<string, number>>;
  overworldBlockDirs: Map<string, number>;
  overworldChests: Map<string, Array<{ id: number; count: number } | null>>;
  overworldPlayerPos: { x: number; y: number; z: number; yaw: number; pitch: number; fly: boolean } | null;

  // Nether Storage Cache
  netherChunks: Map<string, Chunk>;
  netherEdits: Map<string, number>;
  netherEditsByChunk: Map<string, Map<string, number>>;
  netherBlockDirs: Map<string, number>;
  netherChests: Map<string, Array<{ id: number; count: number } | null>>;
  netherPlayerPos: { x: number; y: number; z: number; yaw: number; pitch: number; fly: boolean } | null;
}

export function createDimensionState(seedStr: string | number): DimensionState {
  return {
    dimension: "overworld",
    netherGen: createNetherGenerator(seedStr),
    portalCooldown: 0,
    dwellTimer: 0,
    isWarping: false,

    overworldChunks: new Map(),
    overworldEdits: new Map(),
    overworldEditsByChunk: new Map(),
    overworldBlockDirs: new Map(),
    overworldChests: new Map(),
    overworldPlayerPos: null,

    netherChunks: new Map(),
    netherEdits: new Map(),
    netherEditsByChunk: new Map(),
    netherBlockDirs: new Map(),
    netherChests: new Map(),
    netherPlayerPos: null
  };
}

/**
 * Loads persisted block edits for the Nether from localStorage / cache
 */
export function loadNetherEdits(worldId: string): Map<string, number> {
  const edits = new Map<string, number>();
  try {
    const raw = localStorage.getItem(`mc_nether_edits_${worldId}`);
    if (raw) {
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        edits.set(k, Number(v));
      }
    }
  } catch {}
  return edits;
}

/**
 * Saves Nether block edits to localStorage for persistence across reloads
 */
export function saveNetherEdits(worldId: string, edits: Map<string, number>): void {
  try {
    const obj: Record<string, number> = {};
    for (const [k, v] of edits.entries()) {
      obj[k] = v;
    }
    localStorage.setItem(`mc_nether_edits_${worldId}`, JSON.stringify(obj));
  } catch {}
}

/**
 * Executes a full dimensional transition between Overworld and Nether
 */
export async function transitionDimension(
  s: GameState,
  dimState: DimensionState,
  targetDim: Dimension,
  portalCoord?: { x: number; y: number; z: number }
): Promise<{ targetX: number; targetY: number; targetZ: number }> {
  if (dimState.isWarping) {
    return { targetX: s.player.x, targetY: s.player.y, targetZ: s.player.z };
  }

  dimState.isWarping = true;
  const currentDim = dimState.dimension;

  // 1. Unmount all current chunk meshes from Three.js scene
  for (const c of s.chunks.values()) {
    if (c.meshes && s.scene) {
      for (const m of c.meshes) {
        s.scene.remove(m);
        m.geometry.dispose();
      }
      c.meshes = null;
    }
  }

  // 2. Stash current dimension state into appropriate cache
  if (currentDim === "overworld") {
    dimState.overworldChunks = new Map(s.chunks);
    dimState.overworldEdits = new Map(s.edits);
    dimState.overworldEditsByChunk = new Map(s.editsByChunk);
    dimState.overworldBlockDirs = new Map(s.blockDirs);
    dimState.overworldChests = new Map(s.chestMap);
    dimState.overworldPlayerPos = {
      x: s.player.x,
      y: s.player.y,
      z: s.player.z,
      yaw: s.player.yaw,
      pitch: s.player.pitch,
      fly: s.player.fly
    };
  } else {
    dimState.netherChunks = new Map(s.chunks);
    dimState.netherEdits = new Map(s.edits);
    dimState.netherEditsByChunk = new Map(s.editsByChunk);
    dimState.netherBlockDirs = new Map(s.blockDirs);
    dimState.netherChests = new Map(s.chestMap);
    dimState.netherPlayerPos = {
      x: s.player.x,
      y: s.player.y,
      z: s.player.z,
      yaw: s.player.yaw,
      pitch: s.player.pitch,
      fly: s.player.fly
    };
    saveNetherEdits(s.currentWorldId, s.edits);
  }

  // 3. Switch active dimension & clear active chunk maps
  dimState.dimension = targetDim;
  s.chunks.clear();
  s.heightCache.clear();
  s.lanterns.clear();
  s.mapTiles.clear();
  s.genQ = [];
  s.meshQ = [];
  s.lastCX = 1e9;
  s.lastCZ = 1e9;

  // 4. Restore destination dimension state
  if (targetDim === "overworld") {
    s.edits = new Map(dimState.overworldEdits);
    s.editsByChunk = new Map(dimState.overworldEditsByChunk);
    s.blockDirs = new Map(dimState.overworldBlockDirs);
    s.chestMap = new Map(dimState.overworldChests);
  } else {
    // If first time entering Nether, load any existing stored edits
    if (dimState.netherEdits.size === 0) {
      dimState.netherEdits = loadNetherEdits(s.currentWorldId);
    }
    s.edits = new Map(dimState.netherEdits);
    s.editsByChunk = new Map(dimState.netherEditsByChunk);
    s.blockDirs = new Map(dimState.netherBlockDirs);
    s.chestMap = new Map(dimState.netherChests);
  }

  // 5. Calculate destination coordinates with 8:1 ratio
  const sourcePos = portalCoord || { x: s.player.x, y: s.player.y, z: s.player.z };
  const targetPos = getNetherTargetCoords(sourcePos.x, sourcePos.y, sourcePos.z, currentDim);

  if (targetDim === "nether") {
    const safe = dimState.netherGen.safeSpawnCoord(targetPos.x, targetPos.z);
    targetPos.x = safe.x;
    targetPos.y = Math.floor(safe.y);
    targetPos.z = safe.z;
  }

  // Check if destination portal exists, or auto-build one!
  const destPortal = findNearbyPortal(
    (x, y, z) => s.edits.get(`${x},${y},${z}`) || 0,
    targetPos.x,
    targetPos.y,
    targetPos.z,
    16
  );

  let finalX = targetPos.x + 0.5;
  let finalY = targetPos.y + 0.1;
  let finalZ = targetPos.z + 0.5;

  if (destPortal) {
    finalX = destPortal.x + 0.5;
    finalY = destPortal.y + 0.1;
    finalZ = destPortal.z + 0.5;
  } else {
    const gate = buildObsidianPortalGate(
      (x, y, z, id) => {
        const k = `${x},${y},${z}`;
        s.edits.set(k, id);
        const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
        const eck = `${cx},${cz}`;
        let ecm = s.editsByChunk.get(eck);
        if (!ecm) { ecm = new Map(); s.editsByChunk.set(eck, ecm); }
        ecm.set(k, id);
      },
      targetPos.x,
      targetPos.y,
      targetPos.z,
      "x"
    );
    finalX = gate.entranceX;
    finalY = gate.entranceY;
    finalZ = gate.entranceZ;
  }

  // 6. Set cooldown and reset warping flag
  dimState.portalCooldown = 4.0; // 4 seconds cooldown to prevent immediate bounce-back
  dimState.dwellTimer = 0;
  dimState.isWarping = false;

  return {
    targetX: finalX,
    targetY: finalY,
    targetZ: finalZ
  };
}

export { isPlayerInsidePortal };
