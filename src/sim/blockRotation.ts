/**
 * @file src/sim/blockRotation.ts
 * Directional Block Rotation Table & Blueprint Transformer (D12).
 * Correctly rotates block face states (stairs, doors, logs, torches) when transforming blueprints.
 */

import type { BlueprintDoc, BlueprintBlock } from "./blueprintScanner";

/**
 * Directional block mapping tables for 90-degree clockwise rotations.
 * Each entry is [North, East, South, West].
 */
const DIRECTIONAL_SETS: number[][] = [
  // Stairs
  [70, 70, 70, 70],
  [71, 71, 71, 71],
  [72, 72, 72, 72],
  [77, 77, 77, 77],
  // Doors
  [105, 105, 105, 105],
  [106, 106, 106, 106]
];

/**
 * Rotates a single block ID by N 90-degree clockwise steps.
 */
export function rotateBlockId(id: number, steps: number): number {
  const normSteps = ((steps % 4) + 4) % 4;
  if (normSteps === 0) return id;

  for (const set of DIRECTIONAL_SETS) {
    const idx = set.indexOf(id);
    if (idx !== -1) {
      return set[(idx + normSteps) % 4];
    }
  }
  return id;
}

/**
 * Rotates a full BlueprintDoc by N 90-degree clockwise steps around its anchor.
 * Updates both voxel coordinates and directional block IDs.
 */
export function rotateBlueprintDoc(doc: BlueprintDoc, steps: number): BlueprintDoc {
  if (!doc || !doc.blocks || !Array.isArray(doc.blocks)) return doc;
  const normSteps = ((steps % 4) + 4) % 4;
  if (normSteps === 0) return doc;

  const w = doc.dimensions?.width ?? 7;
  const d = doc.dimensions?.depth ?? 6;

  // New dimensions after rotation
  const is90or270 = normSteps === 1 || normSteps === 3;
  const newWidth = is90or270 ? d : w;
  const newDepth = is90or270 ? w : d;

  const newBlocks: BlueprintBlock[] = doc.blocks.map((b) => {
    let nx = b.dx;
    let nz = b.dz;

    if (normSteps === 1) { // 90° Clockwise
      nx = d - 1 - b.dz;
      nz = b.dx;
    } else if (normSteps === 2) { // 180°
      nx = w - 1 - b.dx;
      nz = d - 1 - b.dz;
    } else if (normSteps === 3) { // 270° Clockwise
      nx = b.dz;
      nz = w - 1 - b.dx;
    }

    return {
      dx: nx,
      dy: b.dy,
      dz: nz,
      id: rotateBlockId(b.id, normSteps)
    };
  });

  // Calculate new anchor
  let nAx = doc.anchor?.ax ?? Math.floor(w / 2);
  let nAz = doc.anchor?.az ?? Math.floor(d / 2);

  if (normSteps === 1) {
    const tmp = nAx;
    nAx = d - 1 - nAz;
    nAz = tmp;
  } else if (normSteps === 2) {
    nAx = w - 1 - nAx;
    nAz = d - 1 - nAz;
  } else if (normSteps === 3) {
    const tmp = nAx;
    nAx = nAz;
    nAz = w - 1 - tmp;
  }

  return {
    ...doc,
    dimensions: {
      ...doc.dimensions,
      width: newWidth,
      depth: newDepth
    },
    anchor: {
      ax: nAx,
      ay: doc.anchor?.ay ?? 0,
      az: nAz
    },
    blocks: newBlocks
  };
}
