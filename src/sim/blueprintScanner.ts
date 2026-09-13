// Hollowpine — Blueprint Scanner & Voxel Serializer
// Scans, normalizes, rotates, and serializes custom built structures into reusable blueprints.

import { BLOCK_MAP } from "../game/blocks";

export interface BlueprintBlock {
  dx: number; // offset from anchor x
  dy: number; // offset from floor y (0 = floor)
  dz: number; // offset from anchor z
  id: number;
}

export interface BlueprintDoc {
  version: 1;
  id: string;
  name: string;
  author: string;
  category: "house" | "tower" | "castle" | "farm" | "bridge" | "shrine" | "misc";
  packageName?: string; // Custom package or collection grouping (e.g. "Nordic Village", "Castle Pack")
  biomeAffinity: string[]; // ["plains", "forest", "taiga", "desert", "mountains", "any"]
  spawnNaturally: boolean; // spawn in villages / wilderness
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  anchor: {
    ax: number;
    ay: number;
    az: number;
  };
  foundationDepth: number; // depth to extend foundation pillars on slopes
  blocks: BlueprintBlock[];
  materialsCount: Record<string, number>;
  totalBlocks: number;
  createdAt: string;
  thumbnail?: string; // Data URL thumbnail
}

export interface ScanOptions {
  name?: string;
  author?: string;
  category?: BlueprintDoc["category"];
  packageName?: string;
  biomeAffinity?: string[];
  spawnNaturally?: boolean;
  minY?: number;
  maxY?: number;
  thumbnail?: string;
}

/**
 * Scans a 3D block lookup function (or chunk collection) over a specified range
 * and extracts all non-empty structure voxels into a normalized BlueprintDoc.
 */
export function scanStructureFromReader(
  getBlockId: (x: number, y: number, z: number) => number,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  options: ScanOptions = {}
): BlueprintDoc | null {
  const minY = options.minY ?? 64; // pad top is 64
  const maxY = options.maxY ?? 128;

  let xMin = 1e9, yMin = 1e9, zMin = 1e9;
  let xMax = -1e9, yMax = -1e9, zMax = -1e9;

  const rawBlocks: Array<{ x: number; y: number; z: number; id: number }> = [];

  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
      for (let y = minY; y <= maxY; y++) {
        const id = getBlockId(x, y, z);
        // Exclude air (0), bedrock (14), and flat pad base grass if at y=64 and untouched
        if (id > 0 && id !== 14) {
          if (y === 64 && id === 1) continue; // Skip default flat-pad grass floor
          rawBlocks.push({ x, y, z, id });
          if (x < xMin) xMin = x;
          if (y < yMin) yMin = y;
          if (z < zMin) zMin = z;
          if (x > xMax) xMax = x;
          if (y > yMax) yMax = y;
          if (z > zMax) zMax = z;
        }
      }
    }
  }

  if (rawBlocks.length === 0) return null;

  // Anchor is the center bottom of the structure bounding box at yMin
  const anchorX = Math.floor((xMin + xMax) / 2);
  const anchorY = yMin;
  const anchorZ = Math.floor((zMin + zMax) / 2);

  const materialsCount: Record<string, number> = {};
  const normalizedBlocks: BlueprintBlock[] = [];

  for (const b of rawBlocks) {
    const dx = b.x - anchorX;
    const dy = b.y - anchorY;
    const dz = b.z - anchorZ;
    normalizedBlocks.push({ dx, dy, dz, id: b.id });

    const bInfo = BLOCK_MAP.get(b.id);
    const label = bInfo ? `${bInfo.name} (#${b.id})` : `Block #${b.id}`;
    materialsCount[label] = (materialsCount[label] || 0) + 1;
  }

  const docId = `bp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    version: 1,
    id: docId,
    name: options.name || "Custom Structure",
    author: options.author || "Player",
    category: options.category || "house",
    packageName: options.packageName || "Default Package",
    biomeAffinity: options.biomeAffinity || ["plains", "forest"],
    spawnNaturally: options.spawnNaturally ?? true,
    dimensions: {
      width: xMax - xMin + 1,
      height: yMax - yMin + 1,
      depth: zMax - zMin + 1
    },
    anchor: {
      ax: anchorX,
      ay: anchorY,
      az: anchorZ
    },
    foundationDepth: 8,
    blocks: normalizedBlocks,
    materialsCount,
    totalBlocks: normalizedBlocks.length,
    createdAt: new Date().toISOString(),
    thumbnail: options.thumbnail
  };
}

/**
 * Scans non-empty blocks within an exact 3D bounding box [x0..x1, y0..y1, z0..z1].
 */
export function scanStructureFromBounds(
  getBlockId: (x: number, y: number, z: number) => number,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  options: ScanOptions = {}
): BlueprintDoc | null {
  const xMinLimit = Math.min(x0, x1);
  const xMaxLimit = Math.max(x0, x1);
  const yMinLimit = Math.min(y0, y1);
  const yMaxLimit = Math.max(y0, y1);
  const zMinLimit = Math.min(z0, z1);
  const zMaxLimit = Math.max(z0, z1);

  let xMin = 1e9, yMin = 1e9, zMin = 1e9;
  let xMax = -1e9, yMax = -1e9, zMax = -1e9;

  const rawBlocks: Array<{ x: number; y: number; z: number; id: number }> = [];

  for (let x = xMinLimit; x <= xMaxLimit; x++) {
    for (let z = zMinLimit; z <= zMaxLimit; z++) {
      for (let y = yMinLimit; y <= yMaxLimit; y++) {
        const id = getBlockId(x, y, z);
        if (id > 0 && id !== 14) {
          rawBlocks.push({ x, y, z, id });
          if (x < xMin) xMin = x;
          if (y < yMin) yMin = y;
          if (z < zMin) zMin = z;
          if (x > xMax) xMax = x;
          if (y > yMax) yMax = y;
          if (z > zMax) zMax = z;
        }
      }
    }
  }

  if (rawBlocks.length === 0) return null;

  const anchorX = Math.floor((xMin + xMax) / 2);
  const anchorY = yMin;
  const anchorZ = Math.floor((zMin + zMax) / 2);

  const materialsCount: Record<string, number> = {};
  const normalizedBlocks: BlueprintBlock[] = [];

  for (const b of rawBlocks) {
    const dx = b.x - anchorX;
    const dy = b.y - anchorY;
    const dz = b.z - anchorZ;
    normalizedBlocks.push({ dx, dy, dz, id: b.id });

    const bInfo = BLOCK_MAP.get(b.id);
    const label = bInfo ? `${bInfo.name} (#${b.id})` : `Block #${b.id}`;
    materialsCount[label] = (materialsCount[label] || 0) + 1;
  }

  const docId = `bp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    version: 1,
    id: docId,
    name: options.name || "Custom Structure",
    author: options.author || "Player",
    category: options.category || "house",
    packageName: options.packageName || "Default Package",
    biomeAffinity: options.biomeAffinity || ["plains", "forest"],
    spawnNaturally: options.spawnNaturally ?? true,
    dimensions: {
      width: xMax - xMin + 1,
      height: yMax - yMin + 1,
      depth: zMax - zMin + 1
    },
    anchor: {
      ax: anchorX,
      ay: anchorY,
      az: anchorZ
    },
    foundationDepth: 8,
    blocks: normalizedBlocks,
    materialsCount,
    totalBlocks: normalizedBlocks.length,
    createdAt: new Date().toISOString(),
    thumbnail: options.thumbnail
  };
}

/**
 * Rotates a blueprint's relative block offsets by 0, 90, 180, or 270 degrees.
 */
export function rotateBlueprint(
  doc: BlueprintDoc,
  rotSteps: number // 0, 1, 2, 3 (each step = 90 deg clockwise)
): BlueprintBlock[] {
  const step = ((rotSteps % 4) + 4) % 4;
  if (step === 0) return doc.blocks;

  return doc.blocks.map(b => {
    let nx = b.dx;
    let nz = b.dz;

    if (step === 1) { // 90 deg
      nx = -b.dz;
      nz = b.dx;
    } else if (step === 2) { // 180 deg
      nx = -b.dx;
      nz = -b.dz;
    } else if (step === 3) { // 270 deg
      nx = b.dz;
      nz = -b.dx;
    }

    return { dx: nx, dy: b.dy, dz: nz, id: b.id };
  });
}

/**
 * Validates whether an unknown object matches the BlueprintDoc schema.
 */
export function validateBlueprintDoc(doc: unknown): doc is BlueprintDoc {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (typeof d.id !== "string" || !d.id) return false;
  if (typeof d.name !== "string" || !d.name) return false;
  if (!Array.isArray(d.blocks) || d.blocks.length === 0) return false;
  return true;
}
