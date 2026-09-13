/**
 * @file catalog/ai/generators/houseGenerator.ts
 * Deterministic Procedural Architectural Assembler: converts SemanticAssetSpec into a watertight BlueprintDoc.
 */

import type { BlueprintDoc, BlueprintBlock } from "../../../src/sim/blueprintScanner";
import type { SemanticAssetSpec } from "../asset-spec";
import { resolveBlockId } from "../../../src/sim/assetSideloader";
import { BLOCK_MAP } from "../../../src/game/blocks";

/**
 * Generates a complete 3D voxel structure from a high-level SemanticAssetSpec.
 */
export function generateHouseFromSpec(spec: SemanticAssetSpec): BlueprintDoc {
  const blocks: BlueprintBlock[] = [];
  const added = new Set<string>();

  const put = (dx: number, dy: number, dz: number, blockId: number) => {
    const key = `${dx},${dy},${dz}`;
    if (added.has(key)) return;
    added.add(key);
    blocks.push({ dx, dy, dz, id: blockId });
  };

  const dims = spec?.dimensions || {};
  const pal = spec?.palette || {};

  const w = Math.max(5, dims.width || 7);
  const d = Math.max(5, dims.depth || 6);
  const stories = Math.max(1, dims.stories || 1);

  // Resolve palette IDs
  const idFoundation = resolveBlockId(pal.foundation, 8); // stone_bricks
  const idFrame = resolveBlockId(pal.frame, 16);           // oak_log
  const idWalls = resolveBlockId(pal.walls, 17);           // oak_planks
  const idRoofStairs = resolveBlockId(pal.roof, 70);       // oak_stairs
  const idRoofSlab = resolveBlockId(pal.roofTrim, 1188);   // stone_brick_slab
  const idFloor = resolveBlockId(pal.floor, 20);           // birch_planks
  const idDoor = resolveBlockId(pal.doors, 105);           // oak_door
  const idGlass = resolveBlockId(pal.windows, 377);        // glass_pane
  const idLight = resolveBlockId(pal.lights, 46);          // lantern

  // 1. Foundation Base (dy = 0)
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      const isPerimeter = x === 0 || x === w - 1 || z === 0 || z === d - 1;
      put(x, 0, z, isPerimeter ? idFoundation : idFloor);
    }
  }

  // 2. Vertical Wall Height (dy = 1 .. wallHeight)
  const wallHeight = stories === 1 ? 3 : 5;
  const midStory = stories > 1 ? 3 : -1;

  for (let y = 1; y <= wallHeight; y++) {
    // Intermediate floor ceiling
    if (y === midStory) {
      for (let x = 1; x < w - 1; x++) {
        for (let z = 1; z < d - 1; z++) {
          put(x, y, z, idFloor);
        }
      }
    }

    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isCorner = (x === 0 || x === w - 1) && (z === 0 || z === d - 1);
        const isFront = z === 0;
        const isBack = z === d - 1;
        const isLeft = x === 0;
        const isRight = x === w - 1;
        const isWall = isFront || isBack || isLeft || isRight;

        if (!isWall) continue;

        if (isCorner) {
          // Timber corner pillars
          put(x, y, z, idFrame);
        } else if (isFront && x === Math.floor(w / 2) && y === 1) {
          // Front door opening
          put(x, y, z, idDoor);
        } else if (isFront && x === Math.floor(w / 2) && y === 2) {
          // Front door top
          put(x, y, z, 0); // Open air or frame
        } else if ((x === 2 || x === w - 3) && (y === 2 || (stories > 1 && y === 4))) {
          // Window openings
          put(x, y, z, idGlass);
        } else if ((z === 2 || z === d - 3) && (y === 2 || (stories > 1 && y === 4))) {
          // Side window openings
          put(x, y, z, idGlass);
        } else {
          // Solid wall infill
          put(x, y, z, idWalls);
        }
      }
    }
  }

  // 3. Gable Roof (dy = wallHeight + 1 .. apex)
  const roofBaseY = wallHeight + 1;
  const overhang = spec.roof.overhang || 1;
  let currentY = roofBaseY;
  let spanOffset = 0;

  while (spanOffset <= Math.floor(w / 2)) {
    const leftX = spanOffset;
    const rightX = w - 1 - spanOffset;

    for (let z = -overhang; z < d + overhang; z++) {
      if (leftX === rightX) {
        // Ridge apex slab
        put(leftX, currentY, z, idRoofSlab);
      } else if (leftX + 1 === rightX) {
        // Double ridge slab
        put(leftX, currentY, z, idRoofSlab);
        put(rightX, currentY, z, idRoofSlab);
      } else {
        // Sloped stair rows
        put(leftX - (spanOffset === 0 ? overhang : 0), currentY, z, idRoofStairs);
        put(rightX + (spanOffset === 0 ? overhang : 0), currentY, z, idRoofStairs);

        // Gable wall infill below
        for (let ix = leftX + 1; ix < rightX; ix++) {
          if (z >= 0 && z < d) {
            put(ix, currentY, z, idWalls);
          }
        }
      }
    }

    if (leftX >= rightX - 1) break;
    spanOffset++;
    currentY++;
  }

  // 4. Lighting & Interior Details
  put(Math.floor(w / 2), wallHeight, Math.floor(d / 2), idLight);

  // 5. Compute metadata
  const materialsCount: Record<string, number> = {};
  for (const b of blocks) {
    if (b.id <= 0) continue;
    const bDef = BLOCK_MAP.get(b.id);
    const label = bDef ? `${bDef.name} (#${b.id})` : `Block #${b.id}`;
    materialsCount[label] = (materialsCount[label] || 0) + 1;
  }

  const validBlocks = blocks.filter(b => b.id > 0);

  return {
    version: 1,
    id: spec.id.startsWith("bp_") ? spec.id : `bp_${spec.id}`,
    name: spec.name || "Procedural House",
    author: "AI Asset Studio",
    category: spec.category === "object" || spec.category === "foliage" ? "misc" : (spec.category as any) || "house",
    packageName: "AI Generated",
    biomeAffinity: spec.biomeAffinity || ["plains", "forest"],
    spawnNaturally: true,
    dimensions: {
      width: w + (overhang * 2),
      height: currentY + 1,
      depth: d + (overhang * 2)
    },
    anchor: {
      ax: Math.floor(w / 2),
      ay: 0,
      az: Math.floor(d / 2)
    },
    foundationDepth: 6,
    blocks: validBlocks,
    materialsCount,
    totalBlocks: validBlocks.length,
    createdAt: new Date().toISOString()
  };
}
