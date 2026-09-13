/**
 * @file catalog/textureMap.js
 * Comprehensive Texture Mapping Matrix for Minecraft 1.19.3 Block Assets.
 * Maps block IDs, categories, and face textures to authentic PNG files located in catalog/textures/block/
 */

export const BLOCK_TEXTURE_MAP = {
  // --- Natural & Ground Blocks ---
  1: {
    name: "Grass block",
    category: "natural",
    top: "grass_block_top.png",
    side: "grass_block_side.png",
    bottom: "dirt.png",
    tintTop: "#79c05a" // Foliage tint overlay for grass top
  },
  2: {
    name: "Dirt",
    category: "natural",
    all: "dirt.png"
  },
  3: {
    name: "Coarse dirt",
    category: "natural",
    all: "coarse_dirt.png"
  },
  4: {
    name: "Podzol",
    category: "natural",
    top: "podzol_top.png",
    side: "podzol_side.png",
    bottom: "dirt.png"
  },
  5: {
    name: "Stone",
    category: "natural",
    all: "stone.png"
  },
  6: {
    name: "Cobblestone",
    category: "building",
    all: "cobblestone.png"
  },
  7: {
    name: "Mossy cobblestone",
    category: "building",
    all: "mossy_cobblestone.png"
  },
  8: {
    name: "Stone bricks",
    category: "building",
    all: "stone_bricks.png"
  },
  9: {
    name: "Smooth stone",
    category: "building",
    all: "smooth_stone.png"
  },
  10: {
    name: "Sand",
    category: "natural",
    all: "sand.png"
  },
  11: {
    name: "Sandstone",
    category: "building",
    top: "sandstone_top.png",
    side: "sandstone.png",
    bottom: "sandstone_bottom.png"
  },
  12: {
    name: "Gravel",
    category: "natural",
    all: "gravel.png"
  },
  13: {
    name: "Clay block",
    category: "natural",
    all: "clay.png"
  },
  14: {
    name: "Bedrock",
    category: "natural",
    all: "bedrock.png"
  },
  15: {
    name: "Obsidian",
    category: "building",
    all: "obsidian.png"
  },

  // --- Wood & Leaves ---
  16: {
    name: "Oak log",
    category: "wood",
    side: "oak_log.png",
    top: "oak_log_top.png",
    bottom: "oak_log_top.png"
  },
  17: {
    name: "Oak planks",
    category: "wood",
    all: "oak_planks.png"
  },
  18: {
    name: "Oak leaves",
    category: "wood",
    all: "oak_leaves.png",
    transparent: true,
    tintAll: "#59ae30"
  },
  19: {
    name: "Birch log",
    category: "wood",
    side: "birch_log.png",
    top: "birch_log_top.png",
    bottom: "birch_log_top.png"
  },
  20: {
    name: "Birch planks",
    category: "wood",
    all: "birch_planks.png"
  },
  21: {
    name: "Birch leaves",
    category: "wood",
    all: "birch_leaves.png",
    transparent: true,
    tintAll: "#6da347"
  },
  22: {
    name: "Spruce log",
    category: "wood",
    side: "spruce_log.png",
    top: "spruce_log_top.png",
    bottom: "spruce_log_top.png"
  },
  23: {
    name: "Spruce planks",
    category: "wood",
    all: "spruce_planks.png"
  },
  24: {
    name: "Spruce leaves",
    category: "wood",
    all: "spruce_leaves.png",
    transparent: true,
    tintAll: "#4b7548"
  },
  25: {
    name: "Jungle log",
    category: "wood",
    side: "jungle_log.png",
    top: "jungle_log_top.png",
    bottom: "jungle_log_top.png"
  },
  26: {
    name: "Jungle planks",
    category: "wood",
    all: "jungle_planks.png"
  },
  27: {
    name: "Jungle leaves",
    category: "wood",
    all: "jungle_leaves.png",
    transparent: true,
    tintAll: "#30bb0b"
  },
  28: {
    name: "Acacia planks",
    category: "wood",
    all: "acacia_planks.png"
  },
  29: {
    name: "Dark oak planks",
    category: "wood",
    all: "dark_oak_planks.png"
  },

  // --- Ores & Minerals ---
  30: {
    name: "Coal ore",
    category: "ores",
    all: "coal_ore.png"
  },
  31: {
    name: "Iron ore",
    category: "ores",
    all: "iron_ore.png"
  },
  32: {
    name: "Gold ore",
    category: "ores",
    all: "gold_ore.png"
  },
  33: {
    name: "Redstone ore",
    category: "ores",
    all: "redstone_ore.png",
    emissive: true
  },
  34: {
    name: "Lapis lazuli ore",
    category: "ores",
    all: "lapis_ore.png"
  },
  35: {
    name: "Diamond ore",
    category: "ores",
    all: "diamond_ore.png"
  },
  36: {
    name: "Emerald ore",
    category: "ores",
    all: "emerald_ore.png"
  },

  // --- Transparent & Fluid ---
  37: {
    name: "Glass",
    category: "building",
    all: "glass.png",
    transparent: true
  },
  38: {
    name: "Tinted glass",
    category: "building",
    all: "tinted_glass.png",
    transparent: true
  },
  39: {
    name: "Water",
    category: "natural",
    all: "water_still.png",
    flow: "water_flow.png",
    transparent: true,
    animated: true
  },
  40: {
    name: "Lava",
    category: "natural",
    all: "lava_still.png",
    flow: "lava_flow.png",
    animated: true,
    emissive: true
  },

  // --- Utility & Functional ---
  41: {
    name: "Crafting table",
    category: "utility",
    top: "crafting_table_top.png",
    side: "crafting_table_side.png",
    front: "crafting_table_front.png",
    bottom: "oak_planks.png"
  },
  42: {
    name: "Furnace",
    category: "utility",
    top: "furnace_top.png",
    front: "furnace_front.png",
    side: "furnace_side.png",
    bottom: "furnace_top.png"
  },
  43: {
    name: "Chest",
    category: "utility",
    entity: "entity/chest/normal.png",
    top: "oak_planks.png",
    side: "oak_planks.png",
    bottom: "oak_planks.png"
  },
  44: {
    name: "Bookshelf",
    category: "utility",
    side: "bookshelf.png",
    top: "oak_planks.png",
    bottom: "oak_planks.png"
  },
  45: {
    name: "TNT",
    category: "utility",
    top: "tnt_top.png",
    side: "tnt_side.png",
    bottom: "tnt_bottom.png"
  },
  46: {
    name: "Lantern",
    category: "utility",
    all: "lantern.png",
    emissive: true,
    transparent: true
  },
  47: {
    name: "Glowstone",
    category: "utility",
    all: "glowstone.png",
    emissive: true
  },
  48: {
    name: "Sea lantern",
    category: "utility",
    all: "sea_lantern.png",
    emissive: true,
    animated: true
  },
  49: {
    name: "Hay bale",
    category: "utility",
    side: "hay_block_side.png",
    top: "hay_block_top.png",
    bottom: "hay_block_top.png"
  },
  50: {
    name: "Brick block",
    category: "building",
    all: "bricks.png"
  },

  // --- Snow & Ice ---
  51: {
    name: "Snow block",
    category: "natural",
    all: "snow.png"
  },
  52: {
    name: "Ice",
    category: "natural",
    all: "ice.png",
    transparent: true
  },
  53: {
    name: "Packed ice",
    category: "natural",
    all: "packed_ice.png"
  },
  54: {
    name: "Snowy grass",
    category: "natural",
    top: "snow.png",
    side: "grass_block_snow.png",
    bottom: "dirt.png"
  },
  55: {
    name: "Dirt path",
    category: "natural",
    top: "dirt_path_top.png",
    side: "dirt_path_side.png",
    bottom: "dirt.png"
  },

  // --- Nether & End ---
  56: {
    name: "Netherrack",
    category: "nether_end",
    all: "netherrack.png"
  },
  57: {
    name: "Soul sand",
    category: "nether_end",
    all: "soul_sand.png"
  },
  58: {
    name: "Nether bricks",
    category: "nether_end",
    all: "nether_bricks.png"
  },
  59: {
    name: "End stone",
    category: "nether_end",
    all: "end_stone.png"
  },
  60: {
    name: "Purpur block",
    category: "nether_end",
    all: "purpur_block.png"
  },
  61: {
    name: "Prismarine",
    category: "nether_end",
    all: "prismarine.png",
    animated: true
  },

  // --- Wool Variants ---
  62: { name: "White wool", category: "colored", all: "white_wool.png" },
  63: { name: "Red wool", category: "colored", all: "red_wool.png" },
  64: { name: "Blue wool", category: "colored", all: "blue_wool.png" },
  65: { name: "Yellow wool", category: "colored", all: "yellow_wool.png" },
  66: { name: "Green wool", category: "colored", all: "green_wool.png" },
  67: { name: "Black wool", category: "colored", all: "black_wool.png" },
  68: { name: "Purple wool", category: "colored", all: "purple_wool.png" },
  69: { name: "Orange wool", category: "colored", all: "orange_wool.png" },

  // --- Stairs ---
  70: { name: "Oak stairs", category: "wood", all: "oak_planks.png", stair: true },
  71: { name: "Cobblestone stairs", category: "building", all: "cobblestone.png", stair: true },
  72: { name: "Stone brick stairs", category: "building", all: "stone_bricks.png", stair: true },
  73: { name: "Sandstone stairs", category: "building", top: "sandstone_top.png", side: "sandstone.png", bottom: "sandstone_bottom.png", stair: true },
  74: { name: "Nether brick stairs", category: "nether_end", all: "nether_bricks.png", stair: true },
  75: { name: "Prismarine stairs", category: "nether_end", all: "prismarine.png", stair: true },
  76: { name: "Brick stairs", category: "building", all: "bricks.png", stair: true },
  77: { name: "Spruce stairs", category: "wood", all: "spruce_planks.png", stair: true },
  78: { name: "Birch stairs", category: "wood", all: "birch_planks.png", stair: true },
  79: { name: "Purpur stairs", category: "nether_end", all: "purpur_block.png", stair: true },

  // --- Torches, Plants & Extras ---
  80: { name: "Torch", category: "utility", all: "torch.png", emissive: true, transparent: true },
  81: { name: "Redstone torch", category: "utility", all: "redstone_torch.png", emissive: true, transparent: true },
  82: { name: "Dandelion", category: "natural", all: "dandelion.png", transparent: true },
  83: { name: "Poppy", category: "natural", all: "poppy.png", transparent: true },
  84: { name: "Jack o'lantern", category: "utility", top: "pumpkin_top.png", side: "pumpkin_side.png", front: "jack_o_lantern.png", bottom: "pumpkin_top.png", emissive: true }
};

/**
 * Returns face-specific texture paths for a given block ID.
 */
export function getBlockTextureFaces(blockId) {
  const def = BLOCK_TEXTURE_MAP[blockId];
  if (!def) return null;
  const top = def.top || def.all || "stone.png";
  const bottom = def.bottom || def.all || top;
  const side = def.side || def.all || top;
  const front = def.front || def.side || def.all || top;
  return { top, bottom, side, front, transparent: !!def.transparent, emissive: !!def.emissive };
}
