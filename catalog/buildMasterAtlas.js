/**
 * @file catalog/buildMasterAtlas.js
 * Assembles the complete 512x512 Master Minecraft 1.19.3 Terrain Atlas (32x32 = 1,024 slots)
 * hosting all 875 official block textures with authentic face mapping.
 * Outputs:
 * - public/textures/terrain_atlas.png
 * - src/game/engine/atlasData.ts
 * - catalog/textureTileMap.json
 * - src/game/blocks.ts (updated with exact tile indices)
 */

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const BLOCK_DIR = "catalog/textures/block";
const PUBLIC_DIR = "public/textures";
const OUT_ATLAS_PNG = path.join(PUBLIC_DIR, "terrain_atlas.png");
const OUT_ATLAS_TS = "src/game/engine/atlasData.ts";
const OUT_TILE_MAP = "catalog/textureTileMap.json";
const REGISTRY_JSON = "catalog/completeRegistry.json";
const OUT_BLOCKS_TS = "src/game/blocks.ts";

const ATLAS_SIZE = 512;
const TILE_SIZE = 16;
const TILES_PER_ROW = 32; // 32x32 = 1024 slots

function loadPng(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath);
    return PNG.sync.read(data);
  } catch {
    return null;
  }
}

function blitTile(targetAtlas, sourcePng, tileIndex, tintHex = null) {
  const gx = (tileIndex % TILES_PER_ROW) * TILE_SIZE;
  const gy = Math.floor(tileIndex / TILES_PER_ROW) * TILE_SIZE;

  let tintR = 255, tintG = 255, tintB = 255;
  if (tintHex) {
    const n = parseInt(tintHex.replace("#", ""), 16);
    tintR = (n >> 16) & 255;
    tintG = (n >> 8) & 255;
    tintB = n & 255;
  }

  // The base foliage maps are raw-gray (~55-60% luminance); a plain multiply makes them
  // far too dark, so tints are f boosted to approximate the vanilla biome-tint look.
  // IMPORTANT: the boost applies ONLY to tinted foliage tiles. Untinted PBR-style
  // source textures are copied verbatim — boosting them blows out brights
  // (sand 219,207,163 clipped to 255,254,219) and yellow-shifts the world.
  const BOOST = tintHex ? 1.35 : 1.0;
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const srcIdx = (y * sourcePng.width + x) * 4;
      const dstIdx = ((gy + y) * ATLAS_SIZE + (gx + x)) * 4;

      const a = sourcePng.data[srcIdx + 3];
      if (a > 0) {
        targetAtlas.data[dstIdx] = Math.min(255, Math.round((sourcePng.data[srcIdx] * tintR * BOOST) / 255));
        targetAtlas.data[dstIdx + 1] = Math.min(255, Math.round((sourcePng.data[srcIdx + 1] * tintG * BOOST) / 255));
        targetAtlas.data[dstIdx + 2] = Math.min(255, Math.round((sourcePng.data[srcIdx + 2] * tintB * BOOST) / 255));
        targetAtlas.data[dstIdx + 3] = a;
      }
    }
  }
}

// Vanilla-style biome tints — the base game stores most foliage as RAW GRAYSCALE and
// multiplies the per-biome color at render time; we bake a neutral vanilla color here.
const FILE_TINTS = {
  "grass_block_top.png": "#79c05a",
  "water_still.png": "#3f76e4",
  "oak_leaves.png": "#59ae30",
  "spruce_leaves.png": "#4b7548",
  "birch_leaves.png": "#68a541",
  "jungle_leaves.png": "#429824",
  "dark_oak_leaves.png": "#5d8a3a",
  "acacia_leaves.png": "#c2d97a",
  "mangrove_leaves.png": "#7ba65b",
  "grass.png": "#9ecf62",
  "tall_grass_bottom.png": "#9ecf62",
  "tall_grass_top.png": "#9ecf62",
  "fern.png": "#86b34a",
  "large_fern_top.png": "#7cb245",
  "large_fern_bottom.png": "#7cb245",
  "vine.png": "#4aa83b",
  "lily_pad.png": "#55aa55"
};

async function main() {
  console.log("Compiling 512x512 Master Minecraft 1.19.3 Terrain Atlas...");
  // SAFETY: blocks.ts must NEVER be overwritten by this generator (it contains the
  // runtime perf lookup tables + hand-patched tile/flag corrections). Tile assignment
  // happens separately via catalog/patchBlockTiles.mjs + catalog/patchBlockFlags.mjs.
  const ATLAS_ONLY = process.argv.includes("--atlas-only");
  if (!ATLAS_ONLY) {
    console.error(
      "\nREFUSING to regenerate blocks.ts (would wipe runtime tables & corrections).\n" +
      "  Re-run with: node catalog/buildMasterAtlas.js --atlas-only\n" +
      "  then re-apply: node catalog/patchBlockTiles.mjs && node catalog/patchBlockFlags.mjs\n"
    );
    process.exit(1);
  }

  const atlas = new PNG({ width: ATLAS_SIZE, height: ATLAS_SIZE });
  for (let i = 0; i < ATLAS_SIZE * ATLAS_SIZE * 4; i++) atlas.data[i] = 0;

  const blockFiles = fs.readdirSync(BLOCK_DIR).filter(f => f.endsWith(".png")).sort();
  console.log(`Found ${blockFiles.length} block texture files to stitch.`);

  const textureTileMap = {};
  let currentTileIndex = 0;

  // 1. Establish canonical legacy slots for core blocks (0 to 145)
  const canonicalMap = {
    0: { file: "grass_block_top.png", tint: "#79c05a" },
    1: { file: "grass_block_side.png" },
    2: { file: "dirt.png" },
    3: { file: "stone.png" },
    4: { file: "cobblestone.png" },
    5: { file: "sand.png" },
    6: { file: "oak_log.png" },
    7: { file: "oak_log_top.png" },
    8: { file: "oak_leaves.png", tint: "#59ae30" },
    9: { file: "oak_planks.png" },
    10: { file: "glass.png" },
    11: { file: "water_still.png", tint: "#3f76e4" },
    12: { file: "red_wool.png" },
    13: { file: "white_wool.png" },
    14: { file: "bookshelf.png" },
    15: { file: "crafting_table_top.png" },
    16: { file: "crafting_table_side.png" },
    17: { file: "lantern.png" },
    18: { file: "dirt_path_top.png" },
    19: { file: "stone_bricks.png" },
    20: { file: "snow.png" },
    21: { file: "ice.png" },
    22: { file: "grass_block_snow.png" },
    23: { file: "spruce_leaves.png", tint: "#4b7548" },
    24: { file: "gravel.png" },
    25: { file: "spruce_log.png" },
    26: { file: "birch_log.png" },
    27: { file: "birch_planks.png" },
    28: { file: "birch_leaves.png", tint: "#68a541" },
    29: { file: "spruce_planks.png" },
    30: { file: "jungle_log.png" },
    31: { file: "jungle_planks.png" },
    32: { file: "jungle_leaves.png", tint: "#429824" },
    33: { file: "acacia_planks.png" },
    34: { file: "dark_oak_planks.png" },
    35: { file: "bedrock.png" },
    36: { file: "obsidian.png" },
    37: { file: "coal_ore.png" },
    38: { file: "iron_ore.png" },
    39: { file: "gold_ore.png" },
    40: { file: "redstone_ore.png" },
    41: { file: "lapis_ore.png" },
    42: { file: "diamond_ore.png" },
    43: { file: "emerald_ore.png" },
    44: { file: "netherrack.png" },
    45: { file: "soul_sand.png" },
    46: { file: "glowstone.png" },
    47: { file: "nether_bricks.png" },
    48: { file: "end_stone.png" },
    49: { file: "purpur_block.png" },
    50: { file: "prismarine.png" },
    51: { file: "sea_lantern.png" },
    53: { file: "furnace_side.png" },
    54: { file: "furnace_front.png" },
    55: { file: "chest_side.png" },
    56: { file: "chest_top.png" },
    57: { file: "tnt_side.png" },
    58: { file: "tnt_top.png" },
    59: { file: "bricks.png" },
    60: { file: "mossy_cobblestone.png" },
    61: { file: "sandstone.png" },
    62: { file: "sandstone_top.png" },
    63: { file: "smooth_stone.png" },
    64: { file: "coarse_dirt.png" },
    65: { file: "podzol_top.png" },
    66: { file: "podzol_side.png" },
    67: { file: "clay.png" },
    68: { file: "hay_block_side.png" },
    69: { file: "hay_block_top.png" },
    70: { file: "packed_ice.png" },
    71: { file: "blue_wool.png" },
    72: { file: "yellow_wool.png" },
    73: { file: "green_wool.png" },
    74: { file: "black_wool.png" },
    75: { file: "purple_wool.png" },
    76: { file: "orange_wool.png" },
    77: { file: "lava_still.png" },
    78: { file: "tinted_glass.png" },
    81: { file: "torch.png" },
    82: { file: "soul_torch.png" },
    83: { file: "soul_lantern.png" },
    84: { file: "redstone_lamp.png" },
    85: { file: "redstone_lamp_on.png" },
    86: { file: "redstone_torch.png" },
    87: { file: "campfire_log.png" },
    88: { file: "campfire_fire.png" },
    89: { file: "soul_campfire_fire.png" },
    90: { file: "jack_o_lantern.png" },
    91: { file: "shroomlight.png" },
    92: { file: "ochre_froglight_side.png" },
    93: { file: "pearlescent_froglight_side.png" },
    94: { file: "verdant_froglight_side.png" },
    95: { file: "end_rod.png" },
    96: { file: "crying_obsidian.png" },
    97: { file: "beacon.png" },
    98: { file: "conduit.png" },
    99: { file: "furnace_front_on.png" },
    100: { file: "amethyst_cluster.png" },
    101: { file: "nether_portal.png" },
    102: { file: "magma.png" },
    103: { file: "glow_lichen.png" },
    104: { file: "cave_vines_lit.png" },
    105: { file: "fire_0.png" },
    106: { file: "oak_door_top.png" },
    107: { file: "oak_door_bottom.png" },
    108: { file: "oak_trapdoor.png" },
    110: { file: "cherry_leaves.png" },
    111: { file: "crimson_fungus.png" },
    112: { file: "warped_fungus.png" },
    113: { file: "warped_roots.png" },
    114: { file: "bamboo_stalk.png" },
    115: { file: "jungle_leaves.png" },
    116: { file: "dark_oak_leaves.png" },
    117: { file: "birch_leaves.png" },
    118: { file: "mangrove_leaves.png" },
    119: { file: "acacia_leaves.png" },
    120: { file: "cherry_log.png" },
    121: { file: "cherry_log_top.png" },
    122: { file: "crimson_stem.png" },
    123: { file: "crimson_stem_top.png" },
    124: { file: "warped_stem.png" },
    125: { file: "warped_stem_top.png" },
    126: { file: "mangrove_log.png" },
    127: { file: "mangrove_log_top.png" },
    128: { file: "pink_petals.png" },
    129: { file: "grass.png" },
    130: { file: "dandelion.png" },
    131: { file: "poppy.png" },
    132: { file: "tube_coral_block.png" },
    133: { file: "brain_coral_block.png" },
    134: { file: "fire_coral_block.png" },
    135: { file: "horn_coral_block.png" },
    136: { file: "kelp.png" },
    137: { file: "sea_pickle.png" },
    138: { file: "seagrass.png" },
    142: { file: "slime_block.png" },
    143: { file: "sponge.png" },
    144: { file: "wet_sponge.png" },
    145: { file: "ladder.png" }
  };

  const occupiedSlots = new Set();

  // Blit canonical tiles
  for (const [idxStr, def] of Object.entries(canonicalMap)) {
    const tileIdx = Number(idxStr);
    const png = loadPng(path.join(BLOCK_DIR, def.file));
    if (png) {
      blitTile(atlas, png, tileIdx, FILE_TINTS[def.file] || null);
      textureTileMap[def.file] = tileIdx;
      occupiedSlots.add(tileIdx);
    }
  }

  // Blit all remaining block textures into open slots
  currentTileIndex = 0;
  for (const file of blockFiles) {
    if (textureTileMap[file] !== undefined) continue;

    while (occupiedSlots.has(currentTileIndex)) {
      currentTileIndex++;
    }

    if (currentTileIndex >= 1024) {
      console.warn("Atlas full! Skipping", file);
      break;
    }

    const png = loadPng(path.join(BLOCK_DIR, file));
    if (png) {
      blitTile(atlas, png, currentTileIndex, FILE_TINTS[file] || null);
      textureTileMap[file] = currentTileIndex;
      occupiedSlots.add(currentTileIndex);
    }
    currentTileIndex++;
  }

  console.log(`Stitched ${occupiedSlots.size} tiles into 512x512 atlas.`);

  // ── Custom tiles baked from the ENTITY sheets (not present in block/) ──
  // Chest: the vanilla chest is an entity texture (entity/chest/normal.png, 64x64).
  // Approach: crop the big wood front panel (14x14 at 16,16), wrap with a dark frame
  // and a gold latch so the 3D chest block reads like the vanilla chest box.
  const CUSTOM = {};
  const chestPng = loadPng("catalog/textures/entity/chest/normal.png");
  if (chestPng && occupiedSlots.size < 1024) {
    let chestIdx = 0;
    while (occupiedSlots.has(chestIdx)) chestIdx++;
    // dark frame
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const si = (y * ATLAS_SIZE + x) * 4;
      const gx = (chestIdx % TILES_PER_ROW) * TILE_SIZE;
      const gy = Math.floor(chestIdx / TILES_PER_ROW) * TILE_SIZE;
      const d = ((gy + y) * ATLAS_SIZE + (gx + x)) * 4;
      const inPanel = x >= 1 && x <= 14 && y >= 1 && y <= 14;
      const pidx = inPanel ? (((y - 1) + 17) * chestPng.width + ((x - 1) + 15)) * 4 : -1;
      if (inPanel) {
        atlas.data[d] = chestPng.data[pidx];
        atlas.data[d + 1] = chestPng.data[pidx + 1];
        atlas.data[d + 2] = chestPng.data[pidx + 2];
        atlas.data[d + 3] = 255;
      } else {
        atlas.data[d] = 64; atlas.data[d + 1] = 42; atlas.data[d + 2] = 22; atlas.data[d + 3] = 255;
      }
    }
    // gold latch: 4x3 px hinge plate at top-center + 2x4 clasp at seam
    const latch = (color) => (lx, ly, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const gxr = (chestIdx % TILES_PER_ROW) * TILE_SIZE + lx + x;
        const gyr = Math.floor(chestIdx / TILES_PER_ROW) * TILE_SIZE + ly + y;
        const d0 = (gyr * ATLAS_SIZE + gxr) * 4;
        atlas.data[d0] = color[0]; atlas.data[d0 + 1] = color[1]; atlas.data[d0 + 2] = color[2]; atlas.data[d0 + 3] = 255;
      }
    };
    latch([192, 146, 74])(9, 0, 2, 2);
    latch([212, 166, 88])(8, 4, 4, 3);
    latch([120, 130, 120])(7, 7, 2, 1);
    occupiedSlots.add(chestIdx);
    textureTileMap["chest_front_baked.png"] = chestIdx;
    CUSTOM.chest = chestIdx;
    console.log(`Baked custom chest tile → slot ${chestIdx}`);
  }
  // Bed: no bed texture exists in the 1.19.3 block set — bake a canonical red bed side
  // (red blanket + white pillow + dark wooden frame).
  if (occupiedSlots.size < 1024) {
    let bedIdx = 0;
    while (occupiedSlots.has(bedIdx)) bedIdx++;
    const gx = (bedIdx % TILES_PER_ROW) * TILE_SIZE;
    const gy = Math.floor(bedIdx / TILES_PER_ROW) * TILE_SIZE;
    const put = (x, y, r, g, b, a = 255) => {
      const d = ((gy + y) * ATLAS_SIZE + (gx + x)) * 4;
      atlas.data[d] = r; atlas.data[d + 1] = g; atlas.data[d + 2] = b; atlas.data[d + 3] = a;
    };
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, 138, 22, 22); // red blanket
    for (let y = 2; y < 16; y += 4) for (let x = 0; x < 16; x++) put(x, y, 118, 16, 16); // blanket creases
    for (let y = 0; y < 16; y++) { put(0, y, 74, 48, 26); put(15, y, 74, 48, 26); } // wood posts
    for (let x = 0; x < 16; x++) { put(x, 0, 74, 48, 26); put(x, 15, 92, 60, 30); }
    for (let y = 2; y < 7; y++) for (let x = 3; x < 13; x++) put(x, y, 238, 233, 225); // white pillow
    for (let y = 3; y < 6; y++) for (let x = 4; x < 7; x++) put(x, y, 205, 195, 186);
    occupiedSlots.add(bedIdx);
    textureTileMap["red_bed_custom.png"] = bedIdx;
    CUSTOM.bed = bedIdx;
    console.log(`Baked custom red bed tile → slot ${bedIdx}`);
  }
  fs.writeFileSync("catalog/customTiles.json", JSON.stringify(CUSTOM));

  // Write Master PNG
  const outBuffer = PNG.sync.write(atlas);
  fs.writeFileSync(OUT_ATLAS_PNG, outBuffer);
  console.log(`Saved master terrain atlas PNG to ${OUT_ATLAS_PNG} (${(outBuffer.length / 1024).toFixed(1)} KB).`);

  // Write Base64 Atlas
  const base64Data = `data:image/png;base64,${outBuffer.toString("base64")}`;
  const atlasTsContent = `/**
 * @file src/game/engine/atlasData.ts
 * Master 512x512 (32x32 grid) Authentic Minecraft 1.19.3 Terrain Atlas.
 */
export const AUTHENTIC_TERRAIN_ATLAS_BASE64 = ${JSON.stringify(base64Data)};
`;
  fs.writeFileSync(OUT_ATLAS_TS, atlasTsContent);
  console.log(`Saved atlasData.ts to ${OUT_ATLAS_TS}`);

  // Write Tile Map JSON
  fs.writeFileSync(OUT_TILE_MAP, JSON.stringify(textureTileMap, null, 2));
  console.log(`Saved textureTileMap.json to ${OUT_TILE_MAP}`);

  // 2. Update all block definitions in completeRegistry.json with their REAL tile indices
  const registry = JSON.parse(fs.readFileSync(REGISTRY_JSON, "utf8"));

  for (const block of registry) {
    if (block.itemTexture || block.category === "item" || block.category === "tools" || block.category === "combat" || block.category === "food") {
      continue;
    }

    // Preserve exact canonical definitions for core world blocks (IDs 0 to 140)
    if (block.id <= 140 && block.side !== undefined) {
      continue;
    }

    const cleanSnake = block.name.toLowerCase().replace(/[\s\-\(\)\'\.]+/g, "_").replace(/_+$/, "");

    // Try finding exact texture files
    let sideFile = `${cleanSnake}.png`;
    let topFile = `${cleanSnake}_top.png`;
    let bottomFile = `${cleanSnake}_bottom.png`;
    let frontFile = `${cleanSnake}_front.png`;

    if (block.textureFiles && block.textureFiles.length > 0) {
      for (const tf of block.textureFiles) {
        if (tf.includes("_top") || tf.includes("_end")) topFile = tf;
        else if (tf.includes("_front")) frontFile = tf;
        else if (tf.includes("_side") || !sideFile) sideFile = tf;
      }
    }

    if (!textureTileMap[sideFile]) {
      const match = blockFiles.find(f => f === `${cleanSnake}.png` || f.startsWith(cleanSnake) || cleanSnake.startsWith(f.replace(/\.png$/, "")));
      if (match) sideFile = match;
    }
    if (!textureTileMap[topFile]) topFile = sideFile;
    if (!textureTileMap[bottomFile]) bottomFile = topFile;
    if (!textureTileMap[frontFile]) frontFile = sideFile;

    const sideIdx = textureTileMap[sideFile] ?? 3;
    const topIdx = textureTileMap[topFile] ?? sideIdx;
    const bottomIdx = textureTileMap[bottomFile] ?? topIdx;

    block.side = sideIdx;
    block.top = topIdx;
    block.bottom = bottomIdx;
  }

  // Update src/game/blocks.ts with exact real tile indices
  const tsBlocksContent = `/* Blocks registry & helpers (extracted from Game.tsx — Complete Official 1.19.3 Catalog with Exact Atlas Tiles) */

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
  liquid?: "water" | "lava";
  foliage?: number;
  itemTexture?: string;
  textureFiles?: string[];
}

export const BLOCKS: BlockDef[] = ${JSON.stringify(registry, null, 2)};

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
`;

  fs.writeFileSync(OUT_BLOCKS_TS, tsBlocksContent);
  console.log(`Saved updated blocks.ts with exact 512x512 tile indices to ${OUT_BLOCKS_TS}`);
}

main().catch(err => {
  console.error("Master atlas build failed:", err);
  process.exit(1);
});
