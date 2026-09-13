import type { GameState } from "../state/gameState";
import { getBlock, setRaw, registerEmitter, ckey } from "../world/chunkData";
import { scanStructureFromBounds, type BlueprintDoc } from "../../sim/blueprintScanner";
import type { BlockEditDelta } from "../terrain/regionMutations";

export function scanSelectionBounds(
  s: GameState,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  options?: { name?: string; author?: string }
): BlueprintDoc | null {
  return scanStructureFromBounds(
    (x, y, z) => getBlock(s, x, y, z),
    x0, y0, z0,
    x1, y1, z1,
    {
      name: options?.name || "Blueprint",
      author: options?.author || s.myUsername || "Player"
    }
  );
}

export function stampBlueprintAt(
  s: GameState,
  doc: BlueprintDoc,
  targetX: number,
  targetY: number,
  targetZ: number,
  options?: {
    rotation?: number; // 0, 90, 180, 270
    ignoreAir?: boolean;
    markDirty?: (cx: number, cz: number) => void;
  }
): BlockEditDelta[] {
  const rot = options?.rotation || 0;
  const ignoreAir = options?.ignoreAir !== false;
  const deltas: BlockEditDelta[] = [];
  const dirtyChunks = new Set<string>();

  for (const block of doc.blocks) {
    if (ignoreAir && block.id === 0) continue;

    let rx = block.dx;
    let rz = block.dz;
    if (rot === 90) {
      rx = -block.dz;
      rz = block.dx;
    } else if (rot === 180) {
      rx = -block.dx;
      rz = -block.dz;
    } else if (rot === 270) {
      rx = block.dz;
      rz = -block.dx;
    }

    const wx = targetX + rx;
    const wy = targetY + block.dy;
    const wz = targetZ + rz;

    const prev = getBlock(s, wx, wy, wz);
    if (prev === block.id) continue;

    setRaw(s, wx, wy, wz, block.id);
    s.edits.set(`${wx},${wy},${wz}`, block.id);
    registerEmitter(s, wx, wy, wz, block.id);

    deltas.push({ x: wx, y: wy, z: wz, prevBlockId: prev, blockId: block.id, action: "place" });

    const cx = wx >> 4, cz = wz >> 4;
    dirtyChunks.add(ckey(cx, cz));
    if ((wx & 15) === 0) dirtyChunks.add(ckey(cx - 1, cz));
    if ((wx & 15) === 15) dirtyChunks.add(ckey(cx + 1, cz));
    if ((wz & 15) === 0) dirtyChunks.add(ckey(cx, cz - 1));
    if ((wz & 15) === 15) dirtyChunks.add(ckey(cx, cz + 1));
  }

  if (options?.markDirty) {
    for (const key of dirtyChunks) {
      const [cx, cz] = key.split(",").map(Number);
      options.markDirty(cx, cz);
    }
  }

  return deltas;
}
