import { CHH } from "../world";
import type { GameState } from "../state/gameState";
import { getBlock, setRaw, registerEmitter, ckey } from "../world/chunkData";

export interface BlockEditDelta {
  x: number;
  y: number;
  z: number;
  prevBlockId: number;
  blockId: number;
  action: string;
}

export function fillBox(
  s: GameState,
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  blockId: number,
  options?: {
    replaceOnly?: number;
    markDirty?: (cx: number, cz: number) => void;
  }
): BlockEditDelta[] {
  const x0 = Math.min(minX, maxX);
  const x1 = Math.max(minX, maxX);
  const y0 = Math.max(0, Math.min(minY, maxY));
  const y1 = Math.min(CHH - 1, Math.max(minY, maxY));
  const z0 = Math.min(minZ, maxZ);
  const z1 = Math.max(minZ, maxZ);

  const deltas: BlockEditDelta[] = [];
  const dirtyChunks = new Set<string>();

  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        const prev = getBlock(s, x, y, z);
        if (options?.replaceOnly !== undefined && prev !== options.replaceOnly) continue;
        if (prev === blockId) continue;

        setRaw(s, x, y, z, blockId);
        s.edits.set(`${x},${y},${z}`, blockId);
        registerEmitter(s, x, y, z, blockId);
        deltas.push({ x, y, z, prevBlockId: prev, blockId, action: blockId === 0 ? "mine" : "place" });

        const cx = x >> 4, cz = z >> 4;
        dirtyChunks.add(ckey(cx, cz));
        if ((x & 15) === 0) dirtyChunks.add(ckey(cx - 1, cz));
        if ((x & 15) === 15) dirtyChunks.add(ckey(cx + 1, cz));
        if ((z & 15) === 0) dirtyChunks.add(ckey(cx, cz - 1));
        if ((z & 15) === 15) dirtyChunks.add(ckey(cx, cz + 1));
      }
    }
  }

  if (options?.markDirty) {
    for (const key of dirtyChunks) {
      const [cx, cz] = key.split(",").map(Number);
      options.markDirty(cx, cz);
    }
  }

  return deltas;
}

export function clearBox(
  s: GameState,
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  markDirty?: (cx: number, cz: number) => void
): BlockEditDelta[] {
  return fillBox(s, minX, minY, minZ, maxX, maxY, maxZ, 0, { markDirty });
}

export function calculateCraterBlocks(
  s: GameState,
  cx: number,
  cy: number,
  cz: number,
  radius: number
): {
  batch: BlockEditDelta[];
  tntChain: Array<{ x: number; y: number; z: number }>;
  dirtyChunks: Set<string>;
} {
  const batch: BlockEditDelta[] = [];
  const tntChain: Array<{ x: number; y: number; z: number }> = [];
  const dirtyChunks = new Set<string>();

  const R = Math.floor(radius);
  for (let dx = -R; dx <= R; dx++) {
    for (let dy = -R; dy <= R; dy++) {
      for (let dz = -R; dz <= R; dz++) {
        const dist2 = dx * dx + dy * dy + dz * dz;
        if (dist2 > R * R) continue;
        const x = cx + dx, y = cy + dy, z = cz + dz;
        const id = getBlock(s, x, y, z);
        // Bedrock, Obsidian, Crying Obsidian, Ancient Debris, Netherite Block, and Respawn Anchor are blast-proof
        if (!id || id === 14 || id === 15 || id === 93 || id === 149 || id === 501 || id === 601 || y <= 0 || y >= CHH) continue;
        if (id === 45) {
          tntChain.push({ x, y, z });
          continue;
        }

        setRaw(s, x, y, z, 0);
        registerEmitter(s, x, y, z, 0);
        s.edits.set(`${x},${y},${z}`, 0);
        batch.push({ x, y, z, blockId: 0, prevBlockId: id, action: "explode" });

        const chx = x >> 4, chz = z >> 4;
        dirtyChunks.add(ckey(chx, chz));
        if ((x & 15) === 0) dirtyChunks.add(ckey(chx - 1, chz));
        if ((x & 15) === 15) dirtyChunks.add(ckey(chx + 1, chz));
        if ((z & 15) === 0) dirtyChunks.add(ckey(chx, chz - 1));
        if ((z & 15) === 15) dirtyChunks.add(ckey(chx, chz + 1));
      }
    }
  }

  return { batch, tntChain, dirtyChunks };
}
