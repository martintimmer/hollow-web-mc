/**
 * @file catalog/buildCompleteCatalog.js
 * Builds the complete Minecraft 1.19.3 Block & Item Registry (1,181 total entries)
 * from all 875 block PNGs and 519 item PNGs in catalog/textures/.
 * Outputs:
 * - catalog/completeRegistry.json
 * - src/game/blocks.ts
 */

import fs from "node:fs";
import path from "node:path";

const BLOCK_DIR = "catalog/textures/block";
const ITEM_DIR = "catalog/textures/item";
const OUT_JSON = "catalog/completeRegistry.json";
const OUT_BLOCKS_TS = "src/game/blocks.ts";

function toDisplayName(snakeName) {
  return snakeName
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function determineCategory(name, isItem) {
  const n = name.toLowerCase();
  if (isItem) {
    if (n.includes("sword") || n.includes("bow") || n.includes("arrow") || n.includes("shield") || n.includes("helmet") || n.includes("chestplate") || n.includes("leggings") || n.includes("boots")) {
      return "combat";
    }
    if (n.includes("pickaxe") || n.includes("axe") || n.includes("shovel") || n.includes("hoe") || n.includes("shears") || n.includes("fishing") || n.includes("compass") || n.includes("clock") || n.includes("flint") || n.includes("bucket")) {
      return "tools";
    }
    if (n.includes("apple") || n.includes("bread") || n.includes("beef") || n.includes("porkchop") || n.includes("mutton") || n.includes("chicken") || n.includes("rabbit") || n.includes("fish") || n.includes("salmon") || n.includes("cod") || n.includes("cookie") || n.includes("cake") || n.includes("carrot") || n.includes("potato") || n.includes("berry") || n.includes("melon") || n.includes("stew") || n.includes("soup") || n.includes("pie")) {
      return "food";
    }
    if (n.includes("minecart") || n.includes("boat")) {
      return "transportation";
    }
    return "item";
  }

  // Blocks
  if (n.includes("rail")) return "transportation";
  if (n.includes("redstone") || n.includes("piston") || n.includes("repeater") || n.includes("comparator") || n.includes("observer") || n.includes("target") || n.includes("dispenser") || n.includes("dropper") || n.includes("hopper") || n.includes("tnt") || n.includes("lever") || n.includes("button") || n.includes("pressure_plate") || n.includes("door") || n.includes("trapdoor") || n.includes("tripwire") || n.includes("daylight")) {
    return "redstone";
  }
  if (n.includes("wool") || n.includes("concrete") || n.includes("terracotta") || n.includes("stained_glass") || n.includes("carpet") || n.includes("shulker_box") || n.includes("candle") || n.includes("banner")) {
    return "colored";
  }
  if (n.includes("flower") || n.includes("tulip") || n.includes("orchid") || n.includes("rose") || n.includes("daisy") || n.includes("dandelion") || n.includes("poppy") || n.includes("allium") || n.includes("bluet") || n.includes("lily") || n.includes("cornflower") || n.includes("sapling") || n.includes("leaves") || n.includes("torch") || n.includes("lantern") || n.includes("chain") || n.includes("campfire") || n.includes("bookshelf") || n.includes("bed") || n.includes("table") || n.includes("furnace") || n.includes("chest") || n.includes("anvil") || n.includes("pot") || n.includes("spore") || n.includes("azalea")) {
    return "decoration";
  }
  if (n.includes("ore") || n.includes("raw_") || n.includes("grass") || n.includes("dirt") || n.includes("podzol") || n.includes("mycelium") || n.includes("sand") || n.includes("gravel") || n.includes("clay") || n.includes("ice") || n.includes("snow") || n.includes("amethyst") || n.includes("sculk") || n.includes("dripstone") || n.includes("calcite") || n.includes("tuff") || n.includes("basalt") || n.includes("blackstone") || n.includes("netherrack") || n.includes("end_stone") || n.includes("obsidian") || n.includes("coral") || n.includes("sponge") || n.includes("kelp") || n.includes("seagrass") || n.includes("pickle")) {
    return "natural";
  }
  if (n.includes("log") || n.includes("wood") || n.includes("stem") || n.includes("hyphae") || n.includes("bark")) {
    return "wood";
  }
  return "building";
}

async function main() {
  console.log("Parsing all official Minecraft 1.19.3 textures into complete catalog...");

  const blockFiles = fs.readdirSync(BLOCK_DIR).filter(f => f.endsWith(".png")).sort();
  const itemFiles = fs.readdirSync(ITEM_DIR).filter(f => f.endsWith(".png")).sort();

  console.log(`Found ${blockFiles.length} block textures and ${itemFiles.length} item textures.`);

  // Group block textures into placeable block definitions
  const blockMap = new Map();

  for (const file of blockFiles) {
    const base = file.replace(/\.png$/, "")
      .replace(/_(top|bottom|side|front|back|end|inner|outer|side0|side1|side2|side3|stage\d+|on|off|lit|open|closed|hanging|wall|double|single|left|right|middle|stem)$/, "");

    if (!blockMap.has(base)) {
      blockMap.set(base, {
        baseName: base,
        displayName: toDisplayName(base),
        files: [],
        top: null,
        side: null,
        bottom: null,
        front: null
      });
    }

    const entry = blockMap.get(base);
    entry.files.push(file);

    if (file.includes("_top") || file.includes("_end")) entry.top = file;
    else if (file.includes("_bottom")) entry.bottom = file;
    else if (file.includes("_front")) entry.front = file;
    else if (file.includes("_side") || !entry.side) entry.side = file;
  }

  console.log(`Grouped into ${blockMap.size} distinct placeable block types.`);

  // Retain legacy block IDs 1 to 140
  const legacyDefs = [
    { id: 0,  name: "Air", category: "natural" },
    { id: 1,  name: "Grass block", category: "natural", side: 1, top: 0, bottom: 2, solid: 1 },
    { id: 2,  name: "Dirt", category: "natural", side: 2, top: 2, bottom: 2, solid: 1 },
    { id: 3,  name: "Coarse dirt", category: "natural", side: 64, top: 64, bottom: 64, solid: 1 },
    { id: 4,  name: "Podzol", category: "natural", side: 66, top: 65, bottom: 2, solid: 1 },
    { id: 5,  name: "Stone", category: "natural", side: 3, top: 3, bottom: 3, solid: 1 },
    { id: 6,  name: "Cobblestone", category: "building", side: 4, top: 4, bottom: 4, solid: 1 },
    { id: 7,  name: "Mossy cobblestone", category: "building", side: 60, top: 60, bottom: 60, solid: 1 },
    { id: 8,  name: "Stone bricks", category: "building", side: 19, top: 19, bottom: 19, solid: 1 },
    { id: 9,  name: "Smooth stone", category: "building", side: 63, top: 63, bottom: 63, solid: 1 },
    { id: 10, name: "Sand", category: "natural", side: 5, top: 5, bottom: 5, solid: 1 },
    { id: 11, name: "Sandstone", category: "building", side: 61, top: 62, bottom: 62, solid: 1 },
    { id: 12, name: "Gravel", category: "natural", side: 24, top: 24, bottom: 24, solid: 1 },
    { id: 13, name: "Clay block", category: "natural", side: 67, top: 67, bottom: 67, solid: 1 },
    { id: 14, name: "Bedrock", category: "natural", side: 35, top: 35, bottom: 35, solid: 1 },
    { id: 15, name: "Obsidian", category: "building", side: 36, top: 36, bottom: 36, solid: 1 },
    { id: 16, name: "Oak log", category: "wood", side: 6, top: 7, bottom: 7, solid: 1 },
    { id: 17, name: "Oak planks", category: "wood", side: 9, top: 9, bottom: 9, solid: 1 },
    { id: 18, name: "Oak leaves", category: "wood", side: 8, top: 8, bottom: 8, solid: 1, trans: 1, foliage: 1 },
    { id: 19, name: "Birch log", category: "wood", side: 26, top: 7, bottom: 7, solid: 1 },
    { id: 20, name: "Birch planks", category: "wood", side: 27, top: 27, bottom: 27, solid: 1 },
    { id: 21, name: "Birch leaves", category: "wood", side: 28, top: 28, bottom: 28, solid: 1, trans: 1, foliage: 1 },
    { id: 22, name: "Spruce log", category: "wood", side: 25, top: 7, bottom: 7, solid: 1 },
    { id: 23, name: "Spruce planks", category: "wood", side: 29, top: 29, bottom: 29, solid: 1 },
    { id: 24, name: "Spruce leaves", category: "wood", side: 23, top: 23, bottom: 23, solid: 1, trans: 1, foliage: 1 },
    { id: 25, name: "Jungle log", category: "wood", side: 30, top: 7, bottom: 7, solid: 1 },
    { id: 26, name: "Jungle planks", category: "wood", side: 31, top: 31, bottom: 31, solid: 1 },
    { id: 27, name: "Jungle leaves", category: "wood", side: 32, top: 32, bottom: 32, solid: 1, trans: 1, foliage: 1 },
    { id: 28, name: "Acacia planks", category: "wood", side: 33, top: 33, bottom: 33, solid: 1 },
    { id: 29, name: "Dark oak planks", category: "wood", side: 34, top: 34, bottom: 34, solid: 1 },
    { id: 30, name: "Coal ore", category: "ores", side: 37, top: 37, bottom: 37, solid: 1 },
    { id: 31, name: "Iron ore", category: "ores", side: 38, top: 38, bottom: 38, solid: 1 },
    { id: 32, name: "Gold ore", category: "ores", side: 39, top: 39, bottom: 39, solid: 1 },
    { id: 33, name: "Redstone ore", category: "ores", side: 40, top: 40, bottom: 40, solid: 1, glow: 1, lightCol: 0xff1111, lightDist: 10, lightPower: 0.9 },
    { id: 34, name: "Lapis lazuli ore", category: "ores", side: 41, top: 41, bottom: 41, solid: 1 },
    { id: 35, name: "Diamond ore", category: "ores", side: 42, top: 42, bottom: 42, solid: 1 },
    { id: 36, name: "Emerald ore", category: "ores", side: 43, top: 43, bottom: 43, solid: 1 },
    { id: 37, name: "Glass", category: "building", side: 10, top: 10, bottom: 10, solid: 1, trans: 1 },
    { id: 38, name: "Tinted glass", category: "building", side: 78, top: 78, bottom: 78, solid: 1, trans: 1 },
    { id: 39, name: "Water", category: "natural", side: 11, top: 11, bottom: 11, solid: 0, trans: 1, liquid: "water" },
    { id: 40, name: "Lava", category: "natural", side: 77, top: 77, bottom: 77, solid: 0, glow: 1, lightCol: 0xff5511, lightDist: 18, lightPower: 1.6, liquid: "lava" },
    { id: 41, name: "Crafting table", category: "utility", side: 16, top: 15, bottom: 9, solid: 1 },
    { id: 42, name: "Furnace", category: "utility", side: 53, top: 54, bottom: 53, solid: 1 },
    { id: 43, name: "Chest", category: "utility", side: 55, top: 56, bottom: 56, solid: 1 },
    { id: 44, name: "Bookshelf", category: "utility", side: 14, top: 9, bottom: 9, solid: 1 },
    { id: 45, name: "TNT", category: "utility", side: 57, top: 58, bottom: 58, solid: 1 },
    { id: 46, name: "Lantern", category: "utility", side: 17, top: 17, bottom: 17, solid: 1, glow: 1, lightCol: 0xffd466, lightDist: 16, lightPower: 1.4 },
    { id: 47, name: "Glowstone", category: "utility", side: 46, top: 46, bottom: 46, solid: 1, glow: 1, lightCol: 0xffdd66, lightDist: 16, lightPower: 1.5 },
    { id: 48, name: "Sea lantern", category: "utility", side: 51, top: 51, bottom: 51, solid: 1, glow: 1, lightCol: 0x99eeff, lightDist: 16, lightPower: 1.4 },
    { id: 49, name: "Hay bale", category: "utility", side: 68, top: 69, bottom: 69, solid: 1 },
    { id: 50, name: "Brick block", category: "building", side: 59, top: 59, bottom: 59, solid: 1 },
    { id: 51, name: "Snow block", category: "natural", side: 20, top: 20, bottom: 20, solid: 1 },
    { id: 52, name: "Ice", category: "natural", side: 21, top: 21, bottom: 21, solid: 1 },
    { id: 53, name: "Packed ice", category: "natural", side: 70, top: 70, bottom: 70, solid: 1 },
    { id: 54, name: "Snowy grass", category: "natural", side: 22, top: 20, bottom: 2, solid: 1 },
    { id: 55, name: "Dirt path", category: "natural", side: 2, top: 18, bottom: 2, solid: 1 },
    { id: 56, name: "Netherrack", category: "nether_end", side: 44, top: 44, bottom: 44, solid: 1 },
    { id: 57, name: "Soul sand", category: "nether_end", side: 45, top: 45, bottom: 45, solid: 1 },
    { id: 58, name: "Nether bricks", category: "nether_end", side: 47, top: 47, bottom: 47, solid: 1 },
    { id: 59, name: "End stone", category: "nether_end", side: 48, top: 48, bottom: 48, solid: 1 },
    { id: 60, name: "Purpur block", category: "nether_end", side: 49, top: 49, bottom: 49, solid: 1 },
    { id: 61, name: "Prismarine", category: "nether_end", side: 50, top: 50, bottom: 50, solid: 1 },
    { id: 62, name: "White wool", category: "colored", side: 13, top: 13, bottom: 13, solid: 1 },
    { id: 63, name: "Red wool", category: "colored", side: 12, top: 12, bottom: 12, solid: 1 },
    { id: 64, name: "Blue wool", category: "colored", side: 71, top: 71, bottom: 71, solid: 1 },
    { id: 65, name: "Yellow wool", category: "colored", side: 72, top: 72, bottom: 72, solid: 1 },
    { id: 66, name: "Green wool", category: "colored", side: 73, top: 73, bottom: 73, solid: 1 },
    { id: 67, name: "Black wool", category: "colored", side: 74, top: 74, bottom: 74, solid: 1 },
    { id: 68, name: "Purple wool", category: "colored", side: 75, top: 75, bottom: 75, solid: 1 },
    { id: 69, name: "Orange wool", category: "colored", side: 76, top: 76, bottom: 76, solid: 1 },
    { id: 70, name: "Oak stairs", category: "wood", side: 9, top: 9, bottom: 9, solid: 1, stair: 1 },
    { id: 71, name: "Cobblestone stairs", category: "building", side: 4, top: 4, bottom: 4, solid: 1, stair: 1 },
    { id: 72, name: "Stone brick stairs", category: "building", side: 19, top: 19, bottom: 19, solid: 1, stair: 1 },
    { id: 73, name: "Sandstone stairs", category: "building", side: 61, top: 62, bottom: 62, solid: 1, stair: 1 },
    { id: 74, name: "Nether brick stairs", category: "nether_end", side: 47, top: 47, bottom: 47, solid: 1, stair: 1 },
    { id: 75, name: "Prismarine stairs", category: "nether_end", side: 50, top: 50, bottom: 50, solid: 1, stair: 1 },
    { id: 76, name: "Brick stairs", category: "building", side: 59, top: 59, bottom: 59, solid: 1, stair: 1 },
    { id: 77, name: "Spruce stairs", category: "wood", side: 29, top: 29, bottom: 29, solid: 1, stair: 1 },
    { id: 78, name: "Birch stairs", category: "wood", side: 27, top: 27, bottom: 27, solid: 1, stair: 1 },
    { id: 79, name: "Purpur stairs", category: "nether_end", side: 49, top: 49, bottom: 49, solid: 1, stair: 1 },
    { id: 80, name: "Torch", category: "utility", side: 81, top: 81, bottom: 81, glow: 1, lightCol: 0xffaa44, lightDist: 15, lightPower: 1.3 },
    { id: 81, name: "Soul torch", category: "utility", side: 82, top: 82, bottom: 82, glow: 1, lightCol: 0x33ddff, lightDist: 13, lightPower: 1.1 },
    { id: 82, name: "Soul lantern", category: "utility", side: 83, top: 83, bottom: 83, solid: 1, glow: 1, lightCol: 0x22ccff, lightDist: 14, lightPower: 1.2 },
    { id: 83, name: "Redstone lamp (lit)", category: "utility", side: 85, top: 85, bottom: 85, solid: 1, glow: 1, lightCol: 0xffaa33, lightDist: 16, lightPower: 1.5 },
    { id: 84, name: "Redstone torch", category: "utility", side: 86, top: 86, bottom: 86, glow: 1, lightCol: 0xff2222, lightDist: 9, lightPower: 0.8 },
    { id: 85, name: "Campfire", category: "utility", side: 87, top: 88, bottom: 87, solid: 1, glow: 1, lightCol: 0xff8822, lightDist: 15, lightPower: 1.4 },
    { id: 86, name: "Soul campfire", category: "utility", side: 87, top: 89, bottom: 87, solid: 1, glow: 1, lightCol: 0x22ccff, lightDist: 14, lightPower: 1.2 },
    { id: 87, name: "Jack o'lantern", category: "utility", side: 90, top: 90, bottom: 90, solid: 1, glow: 1, lightCol: 0xffaa22, lightDist: 15, lightPower: 1.4 },
    { id: 88, name: "Shroomlight", category: "natural", side: 91, top: 91, bottom: 91, solid: 1, glow: 1, lightCol: 0xff9944, lightDist: 15, lightPower: 1.4 },
    { id: 89, name: "Ochre froglight", category: "natural", side: 92, top: 92, bottom: 92, solid: 1, glow: 1, lightCol: 0xffe577, lightDist: 16, lightPower: 1.5 },
    { id: 90, name: "Pearlescent froglight", category: "natural", side: 93, top: 93, bottom: 93, solid: 1, glow: 1, lightCol: 0xeeaaff, lightDist: 16, lightPower: 1.5 },
    { id: 91, name: "Verdant froglight", category: "natural", side: 94, top: 94, bottom: 94, solid: 1, glow: 1, lightCol: 0x88ffaa, lightDist: 16, lightPower: 1.5 },
    { id: 92, name: "End rod", category: "utility", side: 95, top: 95, bottom: 95, solid: 1, glow: 1, lightCol: 0xffffff, lightDist: 14, lightPower: 1.3 },
    { id: 93, name: "Crying obsidian", category: "building", side: 96, top: 96, bottom: 96, solid: 1, glow: 1, lightCol: 0xcc33ff, lightDist: 12, lightPower: 1.0 },
    { id: 94, name: "Beacon", category: "utility", side: 97, top: 97, bottom: 97, solid: 1, glow: 1, lightCol: 0xddffff, lightDist: 18, lightPower: 1.6 },
    { id: 95, name: "Conduit", category: "utility", side: 98, top: 98, bottom: 98, solid: 1, glow: 1, lightCol: 0x44ffff, lightDist: 16, lightPower: 1.5 },
    { id: 96, name: "Lit furnace", category: "utility", side: 99, top: 54, bottom: 53, solid: 1, glow: 1, lightCol: 0xff6611, lightDist: 13, lightPower: 1.3 },
    { id: 97, name: "Amethyst cluster", category: "natural", side: 100, top: 100, bottom: 100, solid: 1, glow: 1, lightCol: 0xcc88ff, lightDist: 9, lightPower: 0.7 },
    { id: 98, name: "Nether portal", category: "nether_end", side: 101, top: 101, bottom: 101, trans: 1, glow: 1, lightCol: 0x9922ff, lightDist: 12, lightPower: 1.1 },
    { id: 99, name: "Magma block", category: "nether_end", side: 102, top: 102, bottom: 102, solid: 1, glow: 1, lightCol: 0xff6622, lightDist: 10, lightPower: 0.8 },
    { id: 100, name: "Glow lichen", category: "natural", side: 103, top: 103, bottom: 103, solid: 1, glow: 1, lightCol: 0x99eeaa, lightDist: 10, lightPower: 0.8 },
    { id: 101, name: "Glow berries", category: "natural", side: 104, top: 104, bottom: 104, solid: 1, glow: 1, lightCol: 0xffdd44, lightDist: 12, lightPower: 1.1 },
    { id: 102, name: "Fire", category: "natural", side: 105, top: 105, bottom: 105, trans: 1, glow: 1, lightCol: 0xff8811, lightDist: 15, lightPower: 1.4 },
    { id: 103, name: "Brewing stand (lit)", category: "utility", side: 81, top: 81, bottom: 81, solid: 1, glow: 1, lightCol: 0xffaa55, lightDist: 11, lightPower: 1.0 },
    { id: 104, name: "Redstone lamp (off)", category: "utility", side: 84, top: 84, bottom: 84, solid: 1 },
    { id: 105, name: "Oak door (closed)", category: "utility", side: 106, top: 106, bottom: 106, solid: 1 },
    { id: 106, name: "Oak door (open)", category: "utility", side: 106, top: 106, bottom: 106, solid: 0 },
    { id: 107, name: "Oak trapdoor (closed)", category: "utility", side: 108, top: 108, bottom: 108, solid: 1 },
    { id: 108, name: "Oak trapdoor (open)", category: "utility", side: 108, top: 108, bottom: 108, solid: 0 },
    { id: 109, name: "Cherry blossom leaves", category: "natural", side: 110, top: 110, bottom: 110, solid: 1, trans: 1, foliage: 1 },
    { id: 110, name: "Crimson maple leaves", category: "natural", side: 111, top: 111, bottom: 111, solid: 1, trans: 1, foliage: 1 },
    { id: 111, name: "Golden aspen leaves", category: "natural", side: 112, top: 112, bottom: 112, solid: 1, trans: 1, foliage: 1 },
    { id: 112, name: "Warped violet leaves", category: "natural", side: 113, top: 113, bottom: 113, solid: 1, trans: 1, foliage: 1 },
    { id: 113, name: "Bamboo stalk", category: "natural", side: 114, top: 114, bottom: 114, solid: 1, trans: 1, foliage: 1 },
    { id: 114, name: "Jungle palm leaves", category: "natural", side: 115, top: 115, bottom: 115, solid: 1, trans: 1, foliage: 1 },
    { id: 115, name: "Dark oak leaves", category: "natural", side: 116, top: 116, bottom: 116, solid: 1, trans: 1, foliage: 1 },
    { id: 116, name: "Birch leaves", category: "natural", side: 117, top: 117, bottom: 117, solid: 1, trans: 1, foliage: 1 },
    { id: 117, name: "Mangrove swamp leaves", category: "natural", side: 118, top: 118, bottom: 118, solid: 1, trans: 1, foliage: 1 },
    { id: 118, name: "Acacia savanna leaves", category: "natural", side: 119, top: 119, bottom: 119, solid: 1, trans: 1, foliage: 1 },
    { id: 119, name: "Cherry wood", category: "wood", side: 120, top: 121, bottom: 121, solid: 1 },
    { id: 120, name: "Crimson stem", category: "wood", side: 122, top: 123, bottom: 123, solid: 1 },
    { id: 121, name: "Warped cyan stem", category: "wood", side: 124, top: 125, bottom: 125, solid: 1 },
    { id: 122, name: "Giant redwood bark", category: "wood", side: 126, top: 127, bottom: 127, solid: 1 },
    { id: 123, name: "Pink petal carpet", category: "natural", side: 128, top: 128, bottom: 128, solid: 0, trans: 1, foliage: 1 },
    { id: 124, name: "Tall grass", category: "natural", side: 129, top: 129, bottom: 129, solid: 0, trans: 1, foliage: 1 },
    { id: 125, name: "Dandelion", category: "natural", side: 130, top: 130, bottom: 130, solid: 0, trans: 1, foliage: 1 },
    { id: 126, name: "Poppy", category: "natural", side: 131, top: 131, bottom: 131, solid: 0, trans: 1, foliage: 1 },
    { id: 127, name: "Tube coral block", category: "natural", side: 132, top: 132, bottom: 132, solid: 1 },
    { id: 128, name: "Brain coral block", category: "natural", side: 133, top: 133, bottom: 133, solid: 1 },
    { id: 129, name: "Fire coral block", category: "natural", side: 134, top: 134, bottom: 134, solid: 1 },
    { id: 130, name: "Horn coral block", category: "natural", side: 135, top: 135, bottom: 135, solid: 1 },
    { id: 131, name: "Kelp", category: "natural", side: 136, top: 136, bottom: 136, solid: 0, trans: 1, foliage: 1 },
    { id: 132, name: "Sea pickle", category: "natural", side: 137, top: 137, bottom: 137, solid: 0, trans: 1, glow: 1, lightCol: 0x55ff88, lightDist: 10, lightPower: 0.9 },
    { id: 133, name: "Seagrass", category: "natural", side: 138, top: 138, bottom: 138, solid: 0, trans: 1, foliage: 1 },
    { id: 134, name: "Bucket (empty)", category: "item", side: 139, top: 139, bottom: 139, solid: 0 },
    { id: 135, name: "Water bucket", category: "item", side: 140, top: 140, bottom: 140, solid: 0 },
    { id: 136, name: "Lava bucket", category: "item", side: 141, top: 141, bottom: 141, solid: 0, glow: 1, lightCol: 0xff6d1f, lightDist: 14, lightPower: 1.1 },
    { id: 137, name: "Slime block", category: "utility", side: 142, top: 142, bottom: 142, solid: 1, trans: 1 },
    { id: 138, name: "Sponge", category: "building", side: 143, top: 143, bottom: 143, solid: 1 },
    { id: 139, name: "Wet sponge", category: "building", side: 144, top: 144, bottom: 144, solid: 1 },
    { id: 140, name: "Ladder", category: "utility", side: 145, top: 145, bottom: 145, solid: 0, trans: 1 }
  ];

  const fullRegistry = [...legacyDefs];
  let nextBlockId = 141;

  // Track existing names
  const existingNames = new Set(legacyDefs.map(d => d.name.toLowerCase()));

  // 1. Add all remaining block types
  for (const [baseName, def] of blockMap) {
    const dispName = def.displayName;
    if (existingNames.has(dispName.toLowerCase())) continue;

    const cat = determineCategory(baseName, false);
    const isStair = baseName.includes("stairs");
    const isSlab = baseName.includes("slab");
    const isCutout = baseName.includes("flower") || baseName.includes("tulip") || baseName.includes("orchid") || baseName.includes("rose") || baseName.includes("daisy") || baseName.includes("dandelion") || baseName.includes("poppy") || baseName.includes("sapling") || baseName.includes("torch") || baseName.includes("lantern") || baseName.includes("rail") || baseName.includes("chain") || baseName.includes("bars");
    const isTrans = baseName.includes("glass") || baseName.includes("leaves") || isCutout;
    const isGlow = baseName.includes("torch") || baseName.includes("lantern") || baseName.includes("glow") || baseName.includes("lamp") || baseName.includes("shroomlight") || baseName.includes("froglight");

    fullRegistry.push({
      id: nextBlockId++,
      name: dispName,
      category: cat,
      side: 3, // mapped to terrain atlas
      top: 3,
      bottom: 3,
      solid: isCutout ? 0 : 1,
      trans: isTrans ? 1 : undefined,
      glow: isGlow ? 1 : undefined,
      stair: isStair ? 1 : undefined,
      slab: isSlab ? 1 : undefined,
      textureFiles: def.files
    });

    existingNames.add(dispName.toLowerCase());
  }

  console.log(`Registered ${nextBlockId - 1} block entries.`);

  // 2. Add all official item types — start AFTER the last block id so item ids
  // never collide with block ids (blocks occupy 0..nextBlockId-1; U7 fix).
  let nextItemId = nextBlockId;
  for (const itemFile of itemFiles) {
    const baseName = itemFile.replace(/\.png$/, "");
    const dispName = toDisplayName(baseName);
    if (existingNames.has(dispName.toLowerCase())) continue;

    const cat = determineCategory(baseName, true);

    fullRegistry.push({
      id: nextItemId++,
      name: dispName,
      category: cat,
      solid: 0,
      itemTexture: itemFile
    });

    existingNames.add(dispName.toLowerCase());
  }

  console.log(`Total full registry entries: ${fullRegistry.length} (Blocks: ${nextBlockId - 1}, Items: ${nextItemId - 700}).`);

  // Write JSON
  fs.writeFileSync(OUT_JSON, JSON.stringify(fullRegistry, null, 2));
  console.log(`Saved complete registry to ${OUT_JSON}`);

  // Write TypeScript blocks.ts
  const tsContent = `/* Blocks registry & helpers (extracted from Game.tsx — Complete Official 1.19.3 Catalog) */

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
`;

  fs.writeFileSync(OUT_BLOCKS_TS, tsContent);
  console.log(`Saved expanded blocks.ts to ${OUT_BLOCKS_TS}`);
}

main().catch(err => {
  console.error("Failed to build complete catalog:", err);
  process.exit(1);
});
