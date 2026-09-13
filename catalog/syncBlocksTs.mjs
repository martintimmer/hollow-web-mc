/**
 * @file catalog/syncBlocksTs.mjs
 * Regenerates src/game/blocks.ts from catalog/completeRegistry.json (the curated
 * source of truth) using the same template buildCompleteCatalog.js uses.
 *
 * Run after hand-editing completeRegistry.json (e.g. adding a block) — do NOT run
 * buildCompleteCatalog.js, which rebuilds the whole registry from textures.
 *
 * WARNING: this template only emits the registry dump + core helpers. The live
 * src/game/blocks.ts also carries hand-maintained helpers (getToolInfo, isFence,
 * getMineTime, isSlab, getBlockDurability, …). A wholesale regen DELETES them
 * (verified 2026-09-06). Prefer surgical patches; if you must regen, re-apply
 * helpers from git afterwards and diff carefully.
 */
import fs from "node:fs";

const REGISTRY = "catalog/completeRegistry.json";
const OUT_BLOCKS_TS = "src/game/blocks.ts";

const fullRegistry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));

const tsContent = `/* Blocks registry & helpers (extracted from Game.tsx — Complete Official 1.19.3 Catalog with Exact Atlas Tiles) */

export interface BlockDef {
  id: number;
  name: string;
  category: "building" | "natural" | "ores" | "wood" | "utility" | "nether_end" | "colored" | "item" | "combat" | "tools" | "food" | "decoration" | "redstone" | "transportation";
  side?: number;
  top?: number;
  bottom?: number;
  solid?: number;
  trans?: number;
  glow?: number;
  lightCol?: number;
  lightDist?: number;
  lightPower?: number;
  stair?: number;
  slab?: number;
  fence?: number;
  liquid?: "water" | "lava";
  foliage?: number;
  durability?: number;
  animated?: {
    frames: number;
    frametime: number;
    interpolate: boolean;
    frameOrder?: number[];
  };
  itemTexture?: string;
  textureFiles?: string[];
}

export const BLOCKS: BlockDef[] = ${JSON.stringify(fullRegistry, null, 2)};

export const BLOCK_MAP: Map<number, BlockDef> = new Map(BLOCKS.map(b => [b.id, b]));

export const BLOCK_DROPS: Record<number, Array<{ id: number; count: number }>> = {
  1: [{ id: 2, count: 1 }],    // Grass block → dirt
  4: [{ id: 2, count: 1 }],    // Podzol → dirt
  54: [{ id: 2, count: 1 }],   // Snowy grass → dirt
  55: [{ id: 2, count: 1 }],   // Dirt path → dirt
  5: [{ id: 6, count: 1 }],    // Stone → cobblestone
  14: [],                       // Bedrock: unbreakable in survival
  37: [], 38: [],               // Glass / tinted glass: shatter
  39: [], 40: [],               // Water / lava: nothing
  52: [],                        // Ice: nothing (no silk touch)
  18: [], 21: [], 24: [], 27: [],
  109: [], 110: [], 111: [], 112: [], 114: [], 115: [], 116: [], 117: [], 118: [], 123: [] // Leaves & foliage
};

export const isSolid = (id: number) => id !== 0 && !!BLOCK_MAP.get(id)?.solid;
export const isOpaque = (id: number) => id !== 0 && !BLOCK_MAP.get(id)?.trans && !BLOCK_MAP.get(id)?.stair;
export const isStair = (id: number) => id !== 0 && !!BLOCK_MAP.get(id)?.stair;
export const isItemOnly = (id: number) => {
  const b = BLOCK_MAP.get(id);
  return !!b?.itemTexture || b?.category === "item" || b?.category === "tools" || b?.category === "combat" || b?.category === "food";
};

export const DEFAULT_HOTBAR = [0, 0, 0, 0, 0, 0, 0, 0, 0];

export const BED_ID = 1162;
export const BED_BYTE = 134; // bed stored as this compact id in-world (legacy byte workaround; world data is now 16-bit)
export const BED_TILE = 878;
`;

fs.writeFileSync(OUT_BLOCKS_TS, tsContent);
console.log(`Synced ${fullRegistry.length} entries -> ${OUT_BLOCKS_TS}`);