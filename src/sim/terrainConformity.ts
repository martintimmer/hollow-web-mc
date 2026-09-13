/**
 * @file src/sim/terrainConformity.ts
 * Slope Adaptation & Downward Foundation Skirt (D13).
 * Adapts rigid voxel blueprints onto uneven terrain with cobblestone foundation skirts and air clearing.
 */

import type { BlueprintBlock } from "./blueprintScanner";

export type VoxelWriter = (x: number, y: number, z: number, id: number) => void;
export type HeightLookup = (x: number, z: number) => number;

export interface StampConformityOptions {
  foundationBlockId?: number; // default: 8 (Stone Bricks) or 6 (Cobblestone)
  maxFoundationDepth?: number; // default: 12
  clearInteriorAir?: boolean;  // default: true
}

/**
 * Stamps a set of blueprint blocks with terrain slope adaptation:
 * 1. Raycasts down along the building perimeter to fill foundation gaps.
 * 2. Clears interior natural terrain blocks to Air (#0).
 */
export function stampBlocksWithConformity(
  blocks: BlueprintBlock[],
  anchorX: number,
  baseY: number,
  anchorZ: number,
  w: VoxelWriter,
  heightLookup?: HeightLookup,
  options: StampConformityOptions = {}
): void {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return;
  const foundationId = options.foundationBlockId ?? 8; // stone bricks
  const maxDepth = options.maxFoundationDepth ?? 12;

  // 1. Foundation Skirt Pass on Perimeter
  if (heightLookup) {
    const perimeterColumns = new Map<string, { dx: number; dz: number }>();

    // Find all perimeter columns at the base (dy = 0)
    for (const b of blocks) {
      if (b.dy === 0 && b.id > 0) {
        const key = `${b.dx},${b.dz}`;
        perimeterColumns.set(key, { dx: b.dx, dz: b.dz });
      }
    }

    for (const { dx, dz } of perimeterColumns.values()) {
      const wx = anchorX + dx;
      const wz = anchorZ + dz;
      const groundH = heightLookup(wx, wz);

      if (groundH < baseY) {
        const lowestY = Math.max(0, Math.max(groundH, baseY - maxDepth));
        for (let y = baseY - 1; y >= lowestY; y--) {
          w(wx, y, wz, foundationId);
        }
      }
    }

    // 2. Interior Air Clearing Pass
    if (options.clearInteriorAir !== false) {
      const roomColumns = new Map<string, number>();
      for (const b of blocks) {
        if (b.id > 0) {
          const key = `${b.dx},${b.dz}`;
          const curMax = roomColumns.get(key) ?? 0;
          if (b.dy > curMax) roomColumns.set(key, b.dy);
        }
      }

      for (const [key, maxDy] of roomColumns.entries()) {
        const [dxStr, dzStr] = key.split(",");
        const dx = Number(dxStr);
        const dz = Number(dzStr);
        const wx = anchorX + dx;
        const wz = anchorZ + dz;
        const groundH = heightLookup(wx, wz);

        if (groundH >= baseY) {
          for (let y = baseY; y <= baseY + maxDy; y++) {
            w(wx, y, wz, 0); // Clear to air before building
          }
        }
      }
    }
  }

  // 3. Stamp Actual Voxel Blueprint
  for (const b of blocks) {
    if (b.id <= 0) continue;
    w(anchorX + b.dx, baseY + b.dy, anchorZ + b.dz, b.id);
  }
}
