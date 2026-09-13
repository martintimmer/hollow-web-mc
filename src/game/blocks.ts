/* Blocks registry & helpers (extracted from Game.tsx — Complete Official 1.19.3 Catalog with Exact Atlas Tiles) */

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
  // Emitter-only: joins the point-light pool like glow but keeps the shaded
  // mesh (for blocks where only part glows: candles, enchanting table…).
  light?: number;
  lightCol?: number;
  lightDist?: number;
  lightPower?: number;
  stair?: number;
  slab?: number;
  fence?: number;
  liquid?: "water" | "lava";
  foliage?: number;
  durability?: number;
  animated?: { frames: number; frametime: number; interpolate: boolean; frameOrder?: number[] };
  itemTexture?: string;
  textureFiles?: string[];
}

export const BLOCKS: BlockDef[] = [
  {
    "id": 0,
    "name": "Air",
    "category": "natural",
    "side": 3,
    "top": 3,
    "bottom": 3
  },
  {
    "id": 1,
    "name": "Grass block",
    "category": "natural",
    "side": 1,
    "top": 0,
    "bottom": 2,
    "solid": 1
  },
  {
    "id": 2,
    "name": "Dirt",
    "category": "natural",
    "side": 2,
    "top": 2,
    "bottom": 2,
    "solid": 1
  },
  {
    "id": 3,
    "name": "Coarse dirt",
    "category": "natural",
    "side": 64,
    "top": 64,
    "bottom": 64,
    "solid": 1
  },
  {
    "id": 4,
    "name": "Podzol",
    "category": "natural",
    "side": 66,
    "top": 65,
    "bottom": 2,
    "solid": 1
  },
  {
    "id": 5,
    "name": "Stone",
    "category": "natural",
    "side": 3,
    "top": 3,
    "bottom": 3,
    "solid": 1
  },
  {
    "id": 6,
    "name": "Cobblestone",
    "category": "building",
    "side": 4,
    "top": 4,
    "bottom": 4,
    "solid": 1
  },
  {
    "id": 7,
    "name": "Mossy cobblestone",
    "category": "building",
    "side": 60,
    "top": 60,
    "bottom": 60,
    "solid": 1
  },
  {
    "id": 8,
    "name": "Stone bricks",
    "category": "building",
    "side": 19,
    "top": 19,
    "bottom": 19,
    "solid": 1
  },
  {
    "id": 9,
    "name": "Smooth stone",
    "category": "building",
    "side": 63,
    "top": 63,
    "bottom": 63,
    "solid": 1
  },
  {
    "id": 10,
    "name": "Sand",
    "category": "natural",
    "side": 5,
    "top": 5,
    "bottom": 5,
    "solid": 1
  },
  {
    "id": 11,
    "name": "Sandstone",
    "category": "building",
    "side": 61,
    "top": 62,
    "bottom": 62,
    "solid": 1
  },
  {
    "id": 12,
    "name": "Gravel",
    "category": "natural",
    "side": 24,
    "top": 24,
    "bottom": 24,
    "solid": 1
  },
  {
    "id": 13,
    "name": "Clay block",
    "category": "natural",
    "side": 67,
    "top": 67,
    "bottom": 67,
    "solid": 1
  },
  {
    "id": 14,
    "name": "Bedrock",
    "category": "natural",
    "side": 35,
    "top": 35,
    "bottom": 35,
    "solid": 1
  },
  {
    "id": 15,
    "name": "Obsidian",
    "category": "building",
    "side": 36,
    "top": 36,
    "bottom": 36,
    "solid": 1
  },
  {
    "id": 16,
    "name": "Oak log",
    "category": "wood",
    "side": 6,
    "top": 7,
    "bottom": 7,
    "solid": 1
  },
  {
    "id": 17,
    "name": "Oak planks",
    "category": "wood",
    "side": 9,
    "top": 9,
    "bottom": 9,
    "solid": 1
  },
  {
    "id": 18,
    "name": "Oak leaves",
    "category": "wood",
    "side": 8,
    "top": 8,
    "bottom": 8,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 19,
    "name": "Birch log",
    "category": "wood",
    "side": 26,
    "top": 7,
    "bottom": 7,
    "solid": 1
  },
  {
    "id": 20,
    "name": "Birch planks",
    "category": "wood",
    "side": 27,
    "top": 27,
    "bottom": 27,
    "solid": 1
  },
  {
    "id": 21,
    "name": "Birch leaves",
    "category": "wood",
    "side": 117,
    "top": 117,
    "bottom": 117,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 22,
    "name": "Spruce log",
    "category": "wood",
    "side": 25,
    "top": 7,
    "bottom": 7,
    "solid": 1
  },
  {
    "id": 23,
    "name": "Spruce planks",
    "category": "wood",
    "side": 29,
    "top": 29,
    "bottom": 29,
    "solid": 1
  },
  {
    "id": 24,
    "name": "Spruce leaves",
    "category": "wood",
    "side": 23,
    "top": 23,
    "bottom": 23,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 25,
    "name": "Jungle log",
    "category": "wood",
    "side": 30,
    "top": 7,
    "bottom": 7,
    "solid": 1
  },
  {
    "id": 26,
    "name": "Jungle planks",
    "category": "wood",
    "side": 31,
    "top": 31,
    "bottom": 31,
    "solid": 1
  },
  {
    "id": 27,
    "name": "Jungle leaves",
    "category": "wood",
    "side": 115,
    "top": 115,
    "bottom": 115,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 28,
    "name": "Acacia planks",
    "category": "wood",
    "side": 33,
    "top": 33,
    "bottom": 33,
    "solid": 1
  },
  {
    "id": 29,
    "name": "Dark oak planks",
    "category": "wood",
    "side": 34,
    "top": 34,
    "bottom": 34,
    "solid": 1
  },
  {
    "id": 30,
    "name": "Coal ore",
    "category": "ores",
    "side": 37,
    "top": 37,
    "bottom": 37,
    "solid": 1
  },
  {
    "id": 31,
    "name": "Iron ore",
    "category": "ores",
    "side": 38,
    "top": 38,
    "bottom": 38,
    "solid": 1
  },
  {
    "id": 32,
    "name": "Gold ore",
    "category": "ores",
    "side": 39,
    "top": 39,
    "bottom": 39,
    "solid": 1
  },
  {
    "id": 33,
    "name": "Redstone ore",
    "category": "ores",
    "side": 40,
    "top": 40,
    "bottom": 40,
    "solid": 1,
    "glow": 1,
    "lightCol": 16716049,
    "lightDist": 9,
    "lightPower": 0.9
  },
  {
    "id": 34,
    "name": "Lapis lazuli ore",
    "category": "ores",
    "side": 41,
    "top": 41,
    "bottom": 41,
    "solid": 1
  },
  {
    "id": 35,
    "name": "Diamond ore",
    "category": "ores",
    "side": 42,
    "top": 42,
    "bottom": 42,
    "solid": 1
  },
  {
    "id": 36,
    "name": "Emerald ore",
    "category": "ores",
    "side": 43,
    "top": 43,
    "bottom": 43,
    "solid": 1
  },
  {
    "id": 37,
    "name": "Glass",
    "category": "building",
    "side": 10,
    "top": 10,
    "bottom": 10,
    "solid": 1,
    "trans": 1
  },
  {
    "id": 38,
    "name": "Tinted glass",
    "category": "building",
    "side": 78,
    "top": 78,
    "bottom": 78,
    "solid": 1,
    "trans": 1
  },
  {
    "id": 39,
    "name": "Water",
    "category": "natural",
    "side": 11,
    "top": 11,
    "bottom": 11,
    "solid": 0,
    "trans": 1,
    "liquid": "water",
    "animated": {
      "frames": 32,
      "frametime": 2,
      "interpolate": false
    }
  },
  {
    "id": 40,
    "name": "Lava",
    "category": "natural",
    "side": 77,
    "top": 77,
    "bottom": 77,
    "solid": 0,
    "glow": 1,
    "lightCol": 16733457,
    "lightDist": 15,
    "lightPower": 1.6,
    "liquid": "lava",
    "animated": {
      "frames": 20,
      "frametime": 2,
      "interpolate": false,
      "frameOrder": [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        18,
        17,
        16,
        15,
        14,
        13,
        12,
        11,
        10,
        9,
        8,
        7,
        6,
        5,
        4,
        3,
        2,
        1
      ]
    }
  },
  {
    "id": 41,
    "name": "Crafting table",
    "category": "utility",
    "side": 16,
    "top": 15,
    "bottom": 9,
    "solid": 1
  },
  {
    "id": 42,
    "name": "Furnace",
    "category": "utility",
    "side": 53,
    "top": 54,
    "bottom": 53,
    "solid": 1
  },
  {
    "id": 43,
    "trans": 1,
    "name": "Chest",
    "category": "utility",
    "side": 877,
    "top": 877,
    "bottom": 877,
    "solid": 1
  },
  {
    "id": 44,
    "name": "Bookshelf",
    "category": "utility",
    "side": 14,
    "top": 9,
    "bottom": 9,
    "solid": 1
  },
  {
    "id": 45,
    "name": "TNT",
    "category": "utility",
    "side": 57,
    "top": 58,
    "bottom": 58,
    "solid": 1
  },
  {
    "id": 46,
    "trans": 1,
    "name": "Lantern",
    "category": "utility",
    "side": 17,
    "top": 17,
    "bottom": 17,
    "solid": 1,
    "glow": 1,
    "lightCol": 16766054,
    "lightDist": 15,
    "lightPower": 1.4,
    "animated": {
      "frames": 3,
      "frametime": 8,
      "interpolate": false
    }
  },
  {
    "id": 47,
    "name": "Glowstone",
    "category": "utility",
    "side": 46,
    "top": 46,
    "bottom": 46,
    "solid": 1,
    "glow": 1,
    "lightCol": 16768358,
    "lightDist": 15,
    "lightPower": 1.5
  },
  {
    "id": 48,
    "name": "Sea lantern",
    "category": "utility",
    "side": 51,
    "top": 51,
    "bottom": 51,
    "solid": 1,
    "glow": 1,
    "lightCol": 10088191,
    "lightDist": 15,
    "lightPower": 1.4,
    "animated": {
      "frames": 5,
      "frametime": 5,
      "interpolate": false
    }
  },
  {
    "id": 49,
    "name": "Hay bale",
    "category": "utility",
    "side": 68,
    "top": 69,
    "bottom": 69,
    "solid": 1
  },
  {
    "id": 50,
    "name": "Brick block",
    "category": "building",
    "side": 59,
    "top": 59,
    "bottom": 59,
    "solid": 1
  },
  {
    "id": 51,
    "name": "Snow block",
    "category": "natural",
    "side": 20,
    "top": 20,
    "bottom": 20,
    "solid": 1
  },
  {
    "id": 52,
    "name": "Ice",
    "category": "natural",
    "side": 21,
    "top": 21,
    "bottom": 21,
    "solid": 1
  },
  {
    "id": 53,
    "name": "Packed ice",
    "category": "natural",
    "side": 70,
    "top": 70,
    "bottom": 70,
    "solid": 1
  },
  {
    "id": 54,
    "name": "Snowy grass",
    "category": "natural",
    "side": 22,
    "top": 20,
    "bottom": 2,
    "solid": 1
  },
  {
    "id": 55,
    "name": "Dirt path",
    "category": "natural",
    "side": 2,
    "top": 18,
    "bottom": 2,
    "solid": 1
  },
  {
    "id": 56,
    "name": "Netherrack",
    "category": "nether_end",
    "side": 44,
    "top": 44,
    "bottom": 44,
    "solid": 1
  },
  {
    "id": 57,
    "name": "Soul sand",
    "category": "nether_end",
    "side": 45,
    "top": 45,
    "bottom": 45,
    "solid": 1
  },
  {
    "id": 58,
    "name": "Nether bricks",
    "category": "nether_end",
    "side": 47,
    "top": 47,
    "bottom": 47,
    "solid": 1
  },
  {
    "id": 59,
    "name": "End stone",
    "category": "nether_end",
    "side": 48,
    "top": 48,
    "bottom": 48,
    "solid": 1
  },
  {
    "id": 60,
    "name": "Purpur block",
    "category": "nether_end",
    "side": 49,
    "top": 49,
    "bottom": 49,
    "solid": 1
  },
  {
    "id": 61,
    "name": "Prismarine",
    "category": "nether_end",
    "side": 50,
    "top": 50,
    "bottom": 50,
    "solid": 1,
    "animated": {
      "frames": 4,
      "frametime": 300,
      "interpolate": true,
      "frameOrder": [
        0,
        1,
        0,
        2,
        0,
        3,
        0,
        1,
        2,
        1,
        3,
        1,
        0,
        2,
        1,
        2,
        3,
        2,
        0,
        3,
        1,
        3
      ]
    }
  },
  {
    "id": 62,
    "name": "White wool",
    "category": "colored",
    "side": 13,
    "top": 13,
    "bottom": 13,
    "solid": 1
  },
  {
    "id": 63,
    "name": "Red wool",
    "category": "colored",
    "side": 12,
    "top": 12,
    "bottom": 12,
    "solid": 1
  },
  {
    "id": 64,
    "name": "Blue wool",
    "category": "colored",
    "side": 71,
    "top": 71,
    "bottom": 71,
    "solid": 1
  },
  {
    "id": 65,
    "name": "Yellow wool",
    "category": "colored",
    "side": 72,
    "top": 72,
    "bottom": 72,
    "solid": 1
  },
  {
    "id": 66,
    "name": "Green wool",
    "category": "colored",
    "side": 73,
    "top": 73,
    "bottom": 73,
    "solid": 1
  },
  {
    "id": 67,
    "name": "Black wool",
    "category": "colored",
    "side": 74,
    "top": 74,
    "bottom": 74,
    "solid": 1
  },
  {
    "id": 68,
    "name": "Purple wool",
    "category": "colored",
    "side": 75,
    "top": 75,
    "bottom": 75,
    "solid": 1
  },
  {
    "id": 69,
    "name": "Orange wool",
    "category": "colored",
    "side": 76,
    "top": 76,
    "bottom": 76,
    "solid": 1
  },
  {
    "id": 70,
    "name": "Oak stairs",
    "category": "wood",
    "side": 9,
    "top": 9,
    "bottom": 9,
    "solid": 1,
    "stair": 1
  },
  {
    "id": 71,
    "name": "Cobblestone stairs",
    "category": "building",
    "side": 4,
    "top": 4,
    "bottom": 4,
    "solid": 1,
    "stair": 1
  },
  {
    "id": 72,
    "name": "Stone brick stairs",
    "category": "building",
    "side": 19,
    "top": 19,
    "bottom": 19,
    "solid": 1,
    "stair": 1
  },
  {
    "id": 73,
    "name": "Sandstone stairs",
    "category": "building",
    "side": 61,
    "top": 62,
    "bottom": 62,
    "solid": 1,
    "stair": 1
  },
  {
    "id": 74,
    "name": "Nether brick stairs",
    "category": "nether_end",
    "side": 47,
    "top": 47,
    "bottom": 47,
    "solid": 1,
    "stair": 1
  },
  {
    "id": 75,
    "name": "Prismarine stairs",
    "category": "nether_end",
    "side": 50,
    "top": 50,
    "bottom": 50,
    "solid": 1,
    "stair": 1,
    "animated": {
      "frames": 4,
      "frametime": 300,
      "interpolate": true,
      "frameOrder": [
        0,
        1,
        0,
        2,
        0,
        3,
        0,
        1,
        2,
        1,
        3,
        1,
        0,
        2,
        1,
        2,
        3,
        2,
        0,
        3,
        1,
        3
      ]
    }
  },
  {
    "id": 76,
    "name": "Brick stairs",
    "category": "building",
    "side": 59,
    "top": 59,
    "bottom": 59,
    "solid": 1,
    "stair": 1
  },
  {
    "id": 77,
    "name": "Spruce stairs",
    "category": "wood",
    "side": 29,
    "top": 29,
    "bottom": 29,
    "solid": 1,
    "stair": 1
  },
  {
    "id": 78,
    "name": "Birch stairs",
    "category": "wood",
    "side": 27,
    "top": 27,
    "bottom": 27,
    "solid": 1,
    "stair": 1
  },
  {
    "id": 79,
    "name": "Purpur stairs",
    "category": "nether_end",
    "side": 49,
    "top": 49,
    "bottom": 49,
    "solid": 1,
    "stair": 1
  },
  {
    "id": 80,
    "trans": 1,
    "name": "Torch",
    "category": "utility",
    "side": 81,
    "top": 81,
    "bottom": 81,
    "glow": 1,
    "lightCol": 16755268,
    "lightDist": 14,
    "lightPower": 1.3
  },
  {
    "id": 81,
    "trans": 1,
    "name": "Soul torch",
    "category": "utility",
    "side": 82,
    "top": 82,
    "bottom": 82,
    "glow": 1,
    "lightCol": 3399167,
    "lightDist": 10,
    "lightPower": 1.1
  },
  {
    "id": 82,
    "trans": 1,
    "name": "Soul lantern",
    "category": "utility",
    "side": 83,
    "top": 83,
    "bottom": 83,
    "solid": 1,
    "glow": 1,
    "lightCol": 2280703,
    "lightDist": 10,
    "lightPower": 1.2,
    "animated": {
      "frames": 3,
      "frametime": 8,
      "interpolate": false
    }
  },
  {
    "id": 83,
    "name": "Redstone lamp (lit)",
    "category": "utility",
    "side": 85,
    "top": 85,
    "bottom": 85,
    "solid": 1,
    "glow": 1,
    "lightCol": 16755251,
    "lightDist": 15,
    "lightPower": 1.5
  },
  {
    "id": 84,
    "trans": 1,
    "name": "Redstone torch",
    "category": "utility",
    "side": 86,
    "top": 86,
    "bottom": 86,
    "glow": 1,
    "lightCol": 16720418,
    "lightDist": 7,
    "lightPower": 0.8
  },
  {
    "id": 85,
    "name": "Campfire",
    "category": "utility",
    "side": 257,
    "top": 257,
    "bottom": 257,
    "solid": 1,
    "glow": 1,
    "lightCol": 16746530,
    "lightDist": 15,
    "lightPower": 1.4,
    "animated": {
      "frames": 4,
      "frametime": 20,
      "interpolate": true
    }
  },
  {
    "id": 86,
    "name": "Soul campfire",
    "category": "utility",
    "side": 765,
    "top": 765,
    "bottom": 765,
    "solid": 1,
    "glow": 1,
    "lightCol": 2280703,
    "lightDist": 10,
    "lightPower": 1.2,
    "animated": {
      "frames": 4,
      "frametime": 20,
      "interpolate": true
    }
  },
  {
    "id": 87,
    "name": "Jack o'lantern",
    "category": "utility",
    "side": 90,
    "top": 90,
    "bottom": 90,
    "solid": 1,
    "glow": 1,
    "lightCol": 16755234,
    "lightDist": 15,
    "lightPower": 1.4
  },
  {
    "id": 88,
    "name": "Shroomlight",
    "category": "natural",
    "side": 91,
    "top": 91,
    "bottom": 91,
    "solid": 1,
    "glow": 1,
    "lightCol": 16750916,
    "lightDist": 15,
    "lightPower": 1.4
  },
  {
    "id": 89,
    "name": "Ochre froglight",
    "category": "natural",
    "side": 92,
    "top": 92,
    "bottom": 92,
    "solid": 1,
    "glow": 1,
    "lightCol": 16770423,
    "lightDist": 15,
    "lightPower": 1.5
  },
  {
    "id": 90,
    "name": "Pearlescent froglight",
    "category": "natural",
    "side": 93,
    "top": 93,
    "bottom": 93,
    "solid": 1,
    "glow": 1,
    "lightCol": 15641343,
    "lightDist": 15,
    "lightPower": 1.5
  },
  {
    "id": 91,
    "name": "Verdant froglight",
    "category": "natural",
    "side": 94,
    "top": 94,
    "bottom": 94,
    "solid": 1,
    "glow": 1,
    "lightCol": 8978346,
    "lightDist": 15,
    "lightPower": 1.5
  },
  {
    "id": 92,
    "trans": 1,
    "name": "End rod",
    "category": "utility",
    "side": 95,
    "top": 95,
    "bottom": 95,
    "solid": 1,
    "glow": 1,
    "lightCol": 16777215,
    "lightDist": 14,
    "lightPower": 1.3
  },
  {
    "id": 93,
    "name": "Crying obsidian",
    "category": "building",
    "side": 96,
    "top": 96,
    "bottom": 96,
    "solid": 1,
    "glow": 1,
    "lightCol": 13382655,
    "lightDist": 10,
    "lightPower": 1
  },
  {
    "id": 94,
    "name": "Beacon",
    "category": "utility",
    "side": 97,
    "top": 97,
    "bottom": 97,
    "solid": 1,
    "glow": 1,
    "lightCol": 14548991,
    "lightDist": 15,
    "lightPower": 1.6
  },
  {
    "id": 95,
    "name": "Conduit",
    "category": "utility",
    "side": 98,
    "top": 98,
    "bottom": 98,
    "solid": 1,
    "glow": 1,
    "lightCol": 4521983,
    "lightDist": 15,
    "lightPower": 1.5
  },
  {
    "id": 96,
    "name": "Lit furnace",
    "category": "utility",
    "side": 99,
    "top": 54,
    "bottom": 53,
    "solid": 1,
    "glow": 1,
    "lightCol": 16737809,
    "lightDist": 13,
    "lightPower": 1.3
  },
  {
    "id": 97,
    "trans": 1,
    "name": "Amethyst cluster",
    "category": "natural",
    "side": 100,
    "top": 100,
    "bottom": 100,
    "solid": 1,
    "glow": 1,
    "lightCol": 13404415,
    "lightDist": 5,
    "lightPower": 0.7
  },
  {
    "id": 98,
    "name": "Nether portal",
    "category": "nether_end",
    "side": 101,
    "top": 101,
    "bottom": 101,
    "trans": 1,
    "glow": 1,
    "lightCol": 10035967,
    "lightDist": 11,
    "lightPower": 1.1,
    "animated": {
      "frames": 32,
      "frametime": 1,
      "interpolate": false
    }
  },
  {
    "id": 99,
    "name": "Magma block",
    "category": "nether_end",
    "side": 102,
    "top": 102,
    "bottom": 102,
    "solid": 1,
    "glow": 1,
    "lightCol": 16737826,
    "lightDist": 3,
    "lightPower": 0.8,
    "animated": {
      "frames": 3,
      "frametime": 8,
      "interpolate": true,
      "frameOrder": [
        0,
        1,
        2
      ]
    }
  },
  {
    "id": 100,
    "trans": 1,
    "name": "Glow lichen",
    "category": "natural",
    "side": 103,
    "top": 103,
    "bottom": 103,
    "solid": 1,
    "glow": 1,
    "lightCol": 10088106,
    "lightDist": 7,
    "lightPower": 0.8
  },
  {
    "id": 101,
    "trans": 1,
    "name": "Glow berries",
    "category": "natural",
    "side": 104,
    "top": 104,
    "bottom": 104,
    "solid": 1,
    "glow": 1,
    "lightCol": 16768324,
    "lightDist": 14,
    "lightPower": 1.1
  },
  {
    "id": 102,
    "name": "Fire",
    "category": "natural",
    "side": 105,
    "top": 105,
    "bottom": 105,
    "trans": 1,
    "glow": 1,
    "lightCol": 16746513,
    "lightDist": 15,
    "lightPower": 1.4,
    "animated": {
      "frames": 32,
      "frametime": 1,
      "interpolate": false,
      "frameOrder": [
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ]
    }
  },
  {
    "id": 103,
    "trans": 1,
    "name": "Brewing stand (lit)",
    "category": "utility",
    "side": 231,
    "top": 231,
    "bottom": 231,
    "solid": 1,
    "glow": 1,
    "lightCol": 16755285,
    "lightDist": 1,
    "lightPower": 1
  },
  {
    "id": 104,
    "name": "Redstone lamp (off)",
    "category": "utility",
    "side": 84,
    "top": 84,
    "bottom": 84,
    "solid": 1
  },
  {
    "id": 105,
    "name": "Oak door (closed)",
    "category": "utility",
    "side": 106,
    "top": 106,
    "bottom": 106,
    "solid": 1
  },
  {
    "id": 106,
    "name": "Oak door (open)",
    "category": "utility",
    "side": 106,
    "top": 106,
    "bottom": 106,
    "solid": 0
  },
  {
    "id": 107,
    "name": "Oak trapdoor (closed)",
    "category": "utility",
    "side": 108,
    "top": 108,
    "bottom": 108,
    "solid": 1
  },
  {
    "id": 108,
    "name": "Oak trapdoor (open)",
    "category": "utility",
    "side": 108,
    "top": 108,
    "bottom": 108,
    "solid": 0
  },
  {
    "id": 109,
    "name": "Cherry blossom leaves",
    "category": "natural",
    "side": 8,
    "top": 8,
    "bottom": 8,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 110,
    "name": "Crimson maple leaves",
    "category": "natural",
    "side": 116,
    "top": 116,
    "bottom": 116,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 111,
    "name": "Golden aspen leaves",
    "category": "natural",
    "side": 117,
    "top": 117,
    "bottom": 117,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 112,
    "name": "Warped violet leaves",
    "category": "natural",
    "side": 113,
    "top": 113,
    "bottom": 113,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 113,
    "name": "Bamboo stalk",
    "category": "natural",
    "side": 114,
    "top": 114,
    "bottom": 114,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 114,
    "name": "Jungle palm leaves",
    "category": "natural",
    "side": 115,
    "top": 115,
    "bottom": 115,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 115,
    "name": "Dark oak leaves",
    "category": "natural",
    "side": 116,
    "top": 116,
    "bottom": 116,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 116,
    "name": "Birch leaves",
    "category": "natural",
    "side": 117,
    "top": 117,
    "bottom": 117,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 117,
    "name": "Mangrove swamp leaves",
    "category": "natural",
    "side": 118,
    "top": 118,
    "bottom": 118,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 118,
    "name": "Acacia savanna leaves",
    "category": "natural",
    "side": 119,
    "top": 119,
    "bottom": 119,
    "solid": 1,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 119,
    "name": "Cherry wood",
    "category": "wood",
    "side": 9,
    "top": 9,
    "bottom": 9,
    "solid": 1
  },
  {
    "id": 120,
    "name": "Crimson stem",
    "category": "wood",
    "side": 122,
    "top": 123,
    "bottom": 123,
    "solid": 1,
    "animated": {
      "frames": 5,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 121,
    "name": "Warped cyan stem",
    "category": "wood",
    "side": 124,
    "top": 125,
    "bottom": 125,
    "solid": 1,
    "animated": {
      "frames": 5,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 122,
    "name": "Giant redwood bark",
    "category": "wood",
    "side": 126,
    "top": 127,
    "bottom": 127,
    "solid": 1
  },
  {
    "id": 123,
    "name": "Pink petal carpet",
    "category": "natural",
    "side": 620,
    "top": 620,
    "bottom": 620,
    "solid": 0,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 124,
    "name": "Short Grass",
    "category": "natural",
    "side": 129,
    "top": 129,
    "bottom": 129,
    "solid": 0,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 125,
    "name": "Dandelion",
    "category": "natural",
    "side": 130,
    "top": 130,
    "bottom": 130,
    "solid": 0,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 126,
    "name": "Poppy",
    "category": "natural",
    "side": 131,
    "top": 131,
    "bottom": 131,
    "solid": 0,
    "trans": 1,
    "foliage": 1
  },
  {
    "id": 127,
    "name": "Tube coral block",
    "category": "natural",
    "side": 132,
    "top": 132,
    "bottom": 132,
    "solid": 1
  },
  {
    "id": 128,
    "name": "Brain coral block",
    "category": "natural",
    "side": 133,
    "top": 133,
    "bottom": 133,
    "solid": 1
  },
  {
    "id": 129,
    "name": "Fire coral block",
    "category": "natural",
    "side": 134,
    "top": 134,
    "bottom": 134,
    "solid": 1
  },
  {
    "id": 130,
    "name": "Horn coral block",
    "category": "natural",
    "side": 135,
    "top": 135,
    "bottom": 135,
    "solid": 1
  },
  {
    "id": 131,
    "name": "Kelp",
    "category": "natural",
    "side": 136,
    "top": 136,
    "bottom": 136,
    "solid": 0,
    "trans": 1,
    "foliage": 1,
    "animated": {
      "frames": 20,
      "frametime": 2,
      "interpolate": false
    }
  },
  {
    "id": 132,
    "name": "Sea pickle",
    "category": "natural",
    "side": 137,
    "top": 137,
    "bottom": 137,
    "solid": 0,
    "trans": 1,
    "glow": 1,
    "lightCol": 5635976,
    "lightDist": 12,
    "lightPower": 0.9
  },
  {
    "id": 133,
    "name": "Seagrass",
    "category": "natural",
    "side": 138,
    "top": 138,
    "bottom": 138,
    "solid": 0,
    "trans": 1,
    "foliage": 1,
    "animated": {
      "frames": 18,
      "frametime": 2,
      "interpolate": false
    }
  },
  {
    "id": 134,
    "name": "Bucket (empty)",
    "category": "tools",
    "itemTexture": "bucket.png"
  },
  {
    "id": 135,
    "name": "Water bucket",
    "category": "tools",
    "itemTexture": "water_bucket.png"
  },
  {
    "id": 136,
    "name": "Lava bucket",
    "category": "tools",
    "itemTexture": "lava_bucket.png",
    "glow": 1,
    "lightCol": 16739615,
    "lightDist": 15,
    "lightPower": 1.1
  },
  {
    "id": 137,
    "name": "Slime block",
    "category": "utility",
    "side": 142,
    "top": 142,
    "bottom": 142,
    "solid": 1,
    "trans": 1
  },
  {
    "id": 138,
    "name": "Sponge",
    "category": "building",
    "side": 143,
    "top": 143,
    "bottom": 143,
    "solid": 1
  },
  {
    "id": 139,
    "name": "Wet sponge",
    "category": "building",
    "side": 144,
    "top": 144,
    "bottom": 144,
    "solid": 1
  },
  {
    "id": 140,
    "name": "Ladder",
    "category": "utility",
    "side": 145,
    "top": 145,
    "bottom": 145,
    "solid": 0,
    "trans": 1
  },
  {
    "id": 141,
    "name": "Acacia Door",
    "category": "redstone",
    "side": 52,
    "top": 55,
    "bottom": 52,
    "solid": 1,
    "textureFiles": [
      "acacia_door_bottom.png",
      "acacia_door_top.png"
    ]
  },
  {
    "id": 142,
    "name": "Acacia Leaves",
    "category": "decoration",
    "side": 119,
    "top": 119,
    "bottom": 119,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "acacia_leaves.png"
    ]
  },
  {
    "id": 143,
    "name": "Acacia Log",
    "category": "wood",
    "side": 56,
    "top": 79,
    "bottom": 79,
    "solid": 1,
    "textureFiles": [
      "acacia_log.png",
      "acacia_log_top.png"
    ]
  },
  {
    "id": 144,
    "name": "Acacia Sapling",
    "category": "decoration",
    "side": 80,
    "top": 80,
    "bottom": 80,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "acacia_sapling.png"
    ]
  },
  {
    "id": 145,
    "name": "Acacia Trapdoor",
    "category": "redstone",
    "side": 109,
    "top": 109,
    "bottom": 109,
    "solid": 1,
    "textureFiles": [
      "acacia_trapdoor.png"
    ]
  },
  {
    "id": 146,
    "name": "Activator Rail",
    "category": "transportation",
    "side": 110,
    "top": 110,
    "bottom": 110,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "activator_rail.png",
      "activator_rail_on.png"
    ]
  },
  {
    "id": 147,
    "name": "Allium",
    "category": "decoration",
    "side": 121,
    "top": 121,
    "bottom": 121,
    "solid": 1,
    "textureFiles": [
      "allium.png"
    ]
  },
  {
    "id": 148,
    "name": "Amethyst Block",
    "category": "natural",
    "side": 128,
    "top": 128,
    "bottom": 128,
    "solid": 1,
    "textureFiles": [
      "amethyst_block.png"
    ]
  },
  {
    "id": 149,
    "name": "Ancient Debris",
    "category": "building",
    "side": 139,
    "top": 140,
    "bottom": 140,
    "solid": 1,
    "textureFiles": [
      "ancient_debris_side.png",
      "ancient_debris_top.png"
    ]
  },
  {
    "id": 150,
    "name": "Andesite",
    "category": "building",
    "side": 141,
    "top": 141,
    "bottom": 141,
    "solid": 1,
    "textureFiles": [
      "andesite.png"
    ]
  },
  {
    "id": 151,
    "name": "Anvil",
    "category": "decoration",
    "side": 146,
    "top": 147,
    "bottom": 147,
    "solid": 1,
    "textureFiles": [
      "anvil.png",
      "anvil_top.png"
    ]
  },
  {
    "id": 152,
    "name": "Attached Melon",
    "category": "building",
    "side": 148,
    "top": 148,
    "bottom": 148,
    "solid": 1,
    "textureFiles": [
      "attached_melon_stem.png"
    ]
  },
  {
    "id": 153,
    "name": "Attached Pumpkin",
    "category": "building",
    "side": 149,
    "top": 149,
    "bottom": 149,
    "solid": 1,
    "textureFiles": [
      "attached_pumpkin_stem.png"
    ]
  },
  {
    "id": 154,
    "name": "Azalea Leaves",
    "category": "decoration",
    "side": 150,
    "top": 150,
    "bottom": 150,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "azalea_leaves.png"
    ]
  },
  {
    "id": 155,
    "name": "Azalea Plant",
    "category": "decoration",
    "side": 151,
    "top": 151,
    "bottom": 151,
    "solid": 1,
    "textureFiles": [
      "azalea_plant.png"
    ]
  },
  {
    "id": 156,
    "name": "Azalea",
    "category": "decoration",
    "side": 152,
    "top": 153,
    "bottom": 153,
    "solid": 1,
    "textureFiles": [
      "azalea_side.png",
      "azalea_top.png"
    ]
  },
  {
    "id": 157,
    "name": "Azure Bluet",
    "category": "decoration",
    "side": 154,
    "top": 154,
    "bottom": 154,
    "solid": 1,
    "textureFiles": [
      "azure_bluet.png"
    ]
  },
  {
    "id": 158,
    "name": "Bamboo Block",
    "category": "building",
    "side": 155,
    "top": 156,
    "bottom": 156,
    "solid": 1,
    "textureFiles": [
      "bamboo_block.png",
      "bamboo_block_top.png"
    ]
  },
  {
    "id": 159,
    "name": "Bamboo Door",
    "category": "redstone",
    "side": 157,
    "top": 158,
    "bottom": 157,
    "solid": 1,
    "textureFiles": [
      "bamboo_door_bottom.png",
      "bamboo_door_top.png"
    ]
  },
  {
    "id": 160,
    "name": "Bamboo Fence",
    "category": "building",
    "side": 159,
    "top": 159,
    "bottom": 159,
    "solid": 1,
    "textureFiles": [
      "bamboo_fence.png"
    ]
  },
  {
    "id": 161,
    "name": "Bamboo Fence Gate",
    "category": "building",
    "side": 160,
    "top": 160,
    "bottom": 160,
    "solid": 1,
    "textureFiles": [
      "bamboo_fence_gate.png"
    ]
  },
  {
    "id": 162,
    "name": "Bamboo Fence Gate Particle",
    "category": "building",
    "side": 161,
    "top": 161,
    "bottom": 161,
    "solid": 1,
    "textureFiles": [
      "bamboo_fence_gate_particle.png"
    ]
  },
  {
    "id": 163,
    "name": "Bamboo Fence Particle",
    "category": "building",
    "side": 162,
    "top": 162,
    "bottom": 162,
    "solid": 1,
    "textureFiles": [
      "bamboo_fence_particle.png"
    ]
  },
  {
    "id": 164,
    "name": "Bamboo Large Leaves",
    "category": "decoration",
    "side": 163,
    "top": 163,
    "bottom": 163,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "bamboo_large_leaves.png"
    ]
  },
  {
    "id": 165,
    "name": "Bamboo Mosaic",
    "category": "building",
    "side": 164,
    "top": 164,
    "bottom": 164,
    "solid": 1,
    "textureFiles": [
      "bamboo_mosaic.png"
    ]
  },
  {
    "id": 166,
    "name": "Bamboo Planks",
    "category": "building",
    "side": 165,
    "top": 165,
    "bottom": 165,
    "solid": 1,
    "textureFiles": [
      "bamboo_planks.png"
    ]
  },
  {
    "id": 167,
    "name": "Bamboo Singleleaf",
    "category": "building",
    "side": 166,
    "top": 166,
    "bottom": 166,
    "solid": 1,
    "textureFiles": [
      "bamboo_singleleaf.png"
    ]
  },
  {
    "id": 168,
    "name": "Bamboo Small Leaves",
    "category": "decoration",
    "side": 167,
    "top": 167,
    "bottom": 167,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "bamboo_small_leaves.png"
    ]
  },
  {
    "id": 169,
    "name": "Bamboo",
    "category": "building",
    "side": 114,
    "top": 114,
    "bottom": 114,
    "solid": 1,
    "textureFiles": [
      "bamboo_stage0.png"
    ]
  },
  {
    "id": 170,
    "name": "Bamboo Trapdoor",
    "category": "redstone",
    "side": 169,
    "top": 169,
    "bottom": 169,
    "solid": 1,
    "textureFiles": [
      "bamboo_trapdoor.png"
    ]
  },
  {
    "id": 171,
    "name": "Barrel",
    "category": "building",
    "side": 171,
    "top": 172,
    "bottom": 170,
    "solid": 1,
    "textureFiles": [
      "barrel_bottom.png",
      "barrel_side.png",
      "barrel_top.png"
    ]
  },
  {
    "id": 172,
    "name": "Barrel Top",
    "category": "building",
    "side": 172,
    "top": 173,
    "bottom": 173,
    "solid": 1,
    "textureFiles": [
      "barrel_top_open.png"
    ]
  },
  {
    "id": 173,
    "name": "Basalt",
    "category": "natural",
    "side": 174,
    "top": 175,
    "bottom": 175,
    "solid": 1,
    "textureFiles": [
      "basalt_side.png",
      "basalt_top.png"
    ]
  },
  {
    "id": 174,
    "name": "Bee Nest",
    "category": "building",
    "side": 179,
    "top": 180,
    "bottom": 176,
    "solid": 1,
    "textureFiles": [
      "bee_nest_bottom.png",
      "bee_nest_front.png",
      "bee_nest_side.png",
      "bee_nest_top.png"
    ]
  },
  {
    "id": 175,
    "name": "Bee Nest Front Honey",
    "category": "building",
    "side": 178,
    "top": 178,
    "bottom": 178,
    "solid": 1,
    "textureFiles": [
      "bee_nest_front_honey.png"
    ]
  },
  {
    "id": 176,
    "name": "Beehive",
    "category": "building",
    "side": 184,
    "top": 181,
    "bottom": 181,
    "solid": 1,
    "textureFiles": [
      "beehive_end.png",
      "beehive_front.png",
      "beehive_side.png"
    ]
  },
  {
    "id": 177,
    "name": "Beehive Front Honey",
    "category": "building",
    "side": 183,
    "top": 183,
    "bottom": 183,
    "solid": 1,
    "textureFiles": [
      "beehive_front_honey.png"
    ]
  },
  {
    "id": 178,
    "name": "Beetroots",
    "category": "building",
    "side": 185,
    "top": 185,
    "bottom": 185,
    "solid": 1,
    "textureFiles": [
      "beetroots_stage0.png",
      "beetroots_stage1.png",
      "beetroots_stage2.png",
      "beetroots_stage3.png"
    ]
  },
  {
    "id": 179,
    "name": "Bell",
    "category": "building",
    "side": 190,
    "top": 191,
    "bottom": 189,
    "solid": 1,
    "textureFiles": [
      "bell_bottom.png",
      "bell_side.png",
      "bell_top.png"
    ]
  },
  {
    "id": 180,
    "name": "Big Dripleaf",
    "category": "building",
    "side": 192,
    "top": 195,
    "bottom": 195,
    "solid": 1,
    "textureFiles": [
      "big_dripleaf_side.png",
      "big_dripleaf_stem.png",
      "big_dripleaf_top.png"
    ]
  },
  {
    "id": 181,
    "name": "Big Dripleaf Tip",
    "category": "building",
    "side": 194,
    "top": 194,
    "bottom": 194,
    "solid": 1,
    "textureFiles": [
      "big_dripleaf_tip.png"
    ]
  },
  {
    "id": 182,
    "name": "Birch Door",
    "category": "redstone",
    "side": 196,
    "top": 197,
    "bottom": 196,
    "solid": 1,
    "textureFiles": [
      "birch_door_bottom.png",
      "birch_door_top.png"
    ]
  },
  {
    "id": 183,
    "name": "Birch Sapling",
    "category": "decoration",
    "side": 199,
    "top": 199,
    "bottom": 199,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "birch_sapling.png"
    ]
  },
  {
    "id": 184,
    "name": "Birch Trapdoor",
    "category": "redstone",
    "side": 200,
    "top": 200,
    "bottom": 200,
    "solid": 1,
    "textureFiles": [
      "birch_trapdoor.png"
    ]
  },
  {
    "id": 185,
    "name": "Black Candle",
    "category": "colored",
    "side": 201,
    "top": 201,
    "bottom": 201,
    "solid": 1,
    "textureFiles": [
      "black_candle.png",
      "black_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 186,
    "name": "Black Concrete",
    "category": "colored",
    "side": 203,
    "top": 203,
    "bottom": 203,
    "solid": 1,
    "textureFiles": [
      "black_concrete.png"
    ]
  },
  {
    "id": 187,
    "name": "Black Concrete Powder",
    "category": "colored",
    "side": 204,
    "top": 204,
    "bottom": 204,
    "solid": 1,
    "textureFiles": [
      "black_concrete_powder.png"
    ]
  },
  {
    "id": 188,
    "name": "Black Glazed Terracotta",
    "category": "colored",
    "side": 205,
    "top": 205,
    "bottom": 205,
    "solid": 1,
    "textureFiles": [
      "black_glazed_terracotta.png"
    ]
  },
  {
    "id": 189,
    "name": "Black Shulker Box",
    "category": "colored",
    "side": 206,
    "top": 206,
    "bottom": 206,
    "solid": 1,
    "textureFiles": [
      "black_shulker_box.png"
    ]
  },
  {
    "id": 190,
    "name": "Black Stained Glass",
    "category": "colored",
    "side": 207,
    "top": 207,
    "bottom": 207,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "black_stained_glass.png"
    ]
  },
  {
    "id": 191,
    "name": "Black Stained Glass Pane",
    "category": "colored",
    "side": 207,
    "top": 208,
    "bottom": 208,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "black_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 192,
    "name": "Black Terracotta",
    "category": "colored",
    "side": 209,
    "top": 209,
    "bottom": 209,
    "solid": 1,
    "textureFiles": [
      "black_terracotta.png"
    ]
  },
  {
    "id": 193,
    "name": "Blackstone",
    "category": "natural",
    "side": 210,
    "top": 211,
    "bottom": 211,
    "solid": 1,
    "textureFiles": [
      "blackstone.png",
      "blackstone_top.png"
    ]
  },
  {
    "id": 194,
    "name": "Blast Furnace",
    "category": "decoration",
    "side": 214,
    "top": 215,
    "bottom": 215,
    "solid": 1,
    "textureFiles": [
      "blast_furnace_front.png",
      "blast_furnace_side.png",
      "blast_furnace_top.png"
    ],
    "animated": {
      "frames": 2,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 195,
    "name": "Blast Furnace Front",
    "category": "decoration",
    "side": 212,
    "top": 212,
    "bottom": 212,
    "solid": 1,
    "textureFiles": [
      "blast_furnace_front_on.png"
    ]
  },
  {
    "id": 196,
    "name": "Blue Candle",
    "category": "colored",
    "side": 216,
    "top": 216,
    "bottom": 216,
    "solid": 1,
    "textureFiles": [
      "blue_candle.png",
      "blue_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 197,
    "name": "Blue Concrete",
    "category": "colored",
    "side": 218,
    "top": 218,
    "bottom": 218,
    "solid": 1,
    "textureFiles": [
      "blue_concrete.png"
    ]
  },
  {
    "id": 198,
    "name": "Blue Concrete Powder",
    "category": "colored",
    "side": 219,
    "top": 219,
    "bottom": 219,
    "solid": 1,
    "textureFiles": [
      "blue_concrete_powder.png"
    ]
  },
  {
    "id": 199,
    "name": "Blue Glazed Terracotta",
    "category": "colored",
    "side": 220,
    "top": 220,
    "bottom": 220,
    "solid": 1,
    "textureFiles": [
      "blue_glazed_terracotta.png"
    ]
  },
  {
    "id": 200,
    "name": "Blue Ice",
    "category": "natural",
    "side": 221,
    "top": 221,
    "bottom": 221,
    "solid": 1,
    "textureFiles": [
      "blue_ice.png"
    ]
  },
  {
    "id": 201,
    "name": "Blue Orchid",
    "category": "decoration",
    "side": 222,
    "top": 222,
    "bottom": 222,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "blue_orchid.png"
    ]
  },
  {
    "id": 202,
    "name": "Blue Shulker Box",
    "category": "colored",
    "side": 223,
    "top": 223,
    "bottom": 223,
    "solid": 1,
    "textureFiles": [
      "blue_shulker_box.png"
    ]
  },
  {
    "id": 203,
    "name": "Blue Stained Glass",
    "category": "colored",
    "side": 224,
    "top": 224,
    "bottom": 224,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "blue_stained_glass.png"
    ]
  },
  {
    "id": 204,
    "name": "Blue Stained Glass Pane",
    "category": "colored",
    "side": 224,
    "top": 225,
    "bottom": 225,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "blue_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 205,
    "name": "Blue Terracotta",
    "category": "colored",
    "side": 226,
    "top": 226,
    "bottom": 226,
    "solid": 1,
    "textureFiles": [
      "blue_terracotta.png"
    ]
  },
  {
    "id": 206,
    "name": "Bone Block",
    "category": "building",
    "side": 227,
    "top": 228,
    "bottom": 228,
    "solid": 1,
    "textureFiles": [
      "bone_block_side.png",
      "bone_block_top.png"
    ]
  },
  {
    "id": 207,
    "name": "Brain Coral",
    "category": "natural",
    "side": 229,
    "top": 229,
    "bottom": 229,
    "solid": 1,
    "textureFiles": [
      "brain_coral.png"
    ]
  },
  {
    "id": 208,
    "name": "Brain Coral Fan",
    "category": "natural",
    "side": 230,
    "top": 230,
    "bottom": 230,
    "solid": 1,
    "textureFiles": [
      "brain_coral_fan.png"
    ]
  },
  {
    "id": 209,
    "name": "Brewing Stand",
    "category": "building",
    "side": 231,
    "top": 231,
    "bottom": 231,
    "solid": 1,
    "textureFiles": [
      "brewing_stand.png"
    ]
  },
  {
    "id": 210,
    "name": "Brewing Stand Base",
    "category": "building",
    "side": 232,
    "top": 232,
    "bottom": 232,
    "solid": 1,
    "textureFiles": [
      "brewing_stand_base.png"
    ]
  },
  {
    "id": 211,
    "name": "Bricks",
    "category": "building",
    "side": 59,
    "top": 59,
    "bottom": 59,
    "solid": 1,
    "textureFiles": [
      "bricks.png"
    ]
  },
  {
    "id": 212,
    "name": "Brown Candle",
    "category": "colored",
    "side": 233,
    "top": 233,
    "bottom": 233,
    "solid": 1,
    "textureFiles": [
      "brown_candle.png",
      "brown_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 213,
    "name": "Brown Concrete",
    "category": "colored",
    "side": 235,
    "top": 235,
    "bottom": 235,
    "solid": 1,
    "textureFiles": [
      "brown_concrete.png"
    ]
  },
  {
    "id": 214,
    "name": "Brown Concrete Powder",
    "category": "colored",
    "side": 236,
    "top": 236,
    "bottom": 236,
    "solid": 1,
    "textureFiles": [
      "brown_concrete_powder.png"
    ]
  },
  {
    "id": 215,
    "name": "Brown Glazed Terracotta",
    "category": "colored",
    "side": 237,
    "top": 237,
    "bottom": 237,
    "solid": 1,
    "textureFiles": [
      "brown_glazed_terracotta.png"
    ]
  },
  {
    "id": 216,
    "name": "Brown Mushroom",
    "category": "building",
    "side": 238,
    "top": 238,
    "bottom": 238,
    "solid": 1,
    "textureFiles": [
      "brown_mushroom.png"
    ],
    "light": 1,
    "lightDist": 1
  },
  {
    "id": 217,
    "name": "Brown Mushroom Block",
    "category": "building",
    "side": 239,
    "top": 239,
    "bottom": 239,
    "solid": 1,
    "textureFiles": [
      "brown_mushroom_block.png"
    ]
  },
  {
    "id": 218,
    "name": "Brown Shulker Box",
    "category": "colored",
    "side": 240,
    "top": 240,
    "bottom": 240,
    "solid": 1,
    "textureFiles": [
      "brown_shulker_box.png"
    ]
  },
  {
    "id": 219,
    "name": "Brown Stained Glass",
    "category": "colored",
    "side": 241,
    "top": 241,
    "bottom": 241,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "brown_stained_glass.png"
    ]
  },
  {
    "id": 220,
    "name": "Brown Stained Glass Pane",
    "category": "colored",
    "side": 241,
    "top": 242,
    "bottom": 242,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "brown_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 221,
    "name": "Brown Terracotta",
    "category": "colored",
    "side": 243,
    "top": 243,
    "bottom": 243,
    "solid": 1,
    "textureFiles": [
      "brown_terracotta.png"
    ]
  },
  {
    "id": 222,
    "name": "Brown Wool",
    "category": "colored",
    "side": 244,
    "top": 244,
    "bottom": 244,
    "solid": 1,
    "textureFiles": [
      "brown_wool.png"
    ]
  },
  {
    "id": 223,
    "name": "Bubble Coral",
    "category": "natural",
    "side": 245,
    "top": 245,
    "bottom": 245,
    "solid": 1,
    "textureFiles": [
      "bubble_coral.png"
    ]
  },
  {
    "id": 224,
    "name": "Bubble Coral Block",
    "category": "natural",
    "side": 246,
    "top": 246,
    "bottom": 246,
    "solid": 1,
    "textureFiles": [
      "bubble_coral_block.png"
    ]
  },
  {
    "id": 225,
    "name": "Bubble Coral Fan",
    "category": "natural",
    "side": 247,
    "top": 247,
    "bottom": 247,
    "solid": 1,
    "textureFiles": [
      "bubble_coral_fan.png"
    ]
  },
  {
    "id": 226,
    "name": "Budding Amethyst",
    "category": "natural",
    "side": 248,
    "top": 248,
    "bottom": 248,
    "solid": 1,
    "textureFiles": [
      "budding_amethyst.png"
    ]
  },
  {
    "id": 227,
    "name": "Cactus",
    "category": "building",
    "side": 250,
    "top": 251,
    "bottom": 249,
    "solid": 1,
    "textureFiles": [
      "cactus_bottom.png",
      "cactus_side.png",
      "cactus_top.png"
    ]
  },
  {
    "id": 228,
    "name": "Cake",
    "category": "building",
    "side": 254,
    "top": 255,
    "bottom": 252,
    "solid": 1,
    "textureFiles": [
      "cake_bottom.png",
      "cake_inner.png",
      "cake_side.png",
      "cake_top.png"
    ]
  },
  {
    "id": 229,
    "name": "Calcite",
    "category": "natural",
    "side": 256,
    "top": 256,
    "bottom": 256,
    "solid": 1,
    "textureFiles": [
      "calcite.png"
    ]
  },
  {
    "id": 230,
    "name": "Campfire Fire",
    "category": "decoration",
    "side": 88,
    "top": 88,
    "bottom": 88,
    "solid": 1,
    "textureFiles": [
      "campfire_fire.png"
    ],
    "animated": {
      "frames": 8,
      "frametime": 2,
      "interpolate": false
    }
  },
  {
    "id": 231,
    "name": "Campfire Log",
    "category": "decoration",
    "side": 87,
    "top": 87,
    "bottom": 87,
    "solid": 1,
    "textureFiles": [
      "campfire_log.png",
      "campfire_log_lit.png"
    ]
  },
  {
    "id": 232,
    "name": "Candle",
    "category": "colored",
    "side": 258,
    "top": 258,
    "bottom": 258,
    "solid": 1,
    "textureFiles": [
      "candle.png",
      "candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 233,
    "name": "Carrots",
    "category": "building",
    "side": 260,
    "top": 260,
    "bottom": 260,
    "solid": 1,
    "textureFiles": [
      "carrots_stage0.png",
      "carrots_stage1.png",
      "carrots_stage2.png",
      "carrots_stage3.png"
    ]
  },
  {
    "id": 234,
    "name": "Cartography Table",
    "category": "decoration",
    "side": 266,
    "top": 267,
    "bottom": 267,
    "solid": 1,
    "textureFiles": [
      "cartography_table_side1.png",
      "cartography_table_side2.png",
      "cartography_table_side3.png",
      "cartography_table_top.png"
    ]
  },
  {
    "id": 235,
    "name": "Carved Pumpkin",
    "category": "building",
    "side": 268,
    "top": 268,
    "bottom": 268,
    "solid": 1,
    "textureFiles": [
      "carved_pumpkin.png"
    ]
  },
  {
    "id": 236,
    "name": "Cauldron",
    "category": "building",
    "side": 271,
    "top": 272,
    "bottom": 269,
    "solid": 1,
    "textureFiles": [
      "cauldron_bottom.png",
      "cauldron_inner.png",
      "cauldron_side.png",
      "cauldron_top.png"
    ]
  },
  {
    "id": 237,
    "name": "Cave Vines",
    "category": "building",
    "side": 273,
    "top": 273,
    "bottom": 273,
    "solid": 1,
    "textureFiles": [
      "cave_vines.png",
      "cave_vines_lit.png"
    ]
  },
  {
    "id": 238,
    "name": "Cave Vines Plant",
    "category": "building",
    "side": 274,
    "top": 274,
    "bottom": 274,
    "solid": 1,
    "textureFiles": [
      "cave_vines_plant.png",
      "cave_vines_plant_lit.png"
    ]
  },
  {
    "id": 239,
    "name": "Chain",
    "category": "decoration",
    "side": 276,
    "top": 276,
    "bottom": 276,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "chain.png"
    ]
  },
  {
    "id": 240,
    "name": "Chain Command Block",
    "category": "decoration",
    "side": 280,
    "top": 280,
    "bottom": 280,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "chain_command_block_back.png",
      "chain_command_block_front.png",
      "chain_command_block_side.png"
    ],
    "animated": {
      "frames": 4,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 241,
    "name": "Chain Command Block Conditional",
    "category": "decoration",
    "side": 278,
    "top": 278,
    "bottom": 278,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "chain_command_block_conditional.png"
    ],
    "animated": {
      "frames": 4,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 242,
    "name": "Chipped Anvil",
    "category": "decoration",
    "side": 281,
    "top": 281,
    "bottom": 281,
    "solid": 1,
    "textureFiles": [
      "chipped_anvil_top.png"
    ]
  },
  {
    "id": 243,
    "name": "Chiseled Bookshelf Empty",
    "category": "decoration",
    "side": 282,
    "top": 282,
    "bottom": 282,
    "solid": 1,
    "textureFiles": [
      "chiseled_bookshelf_empty.png"
    ]
  },
  {
    "id": 244,
    "name": "Chiseled Bookshelf Occupied",
    "category": "decoration",
    "side": 283,
    "top": 283,
    "bottom": 283,
    "solid": 1,
    "textureFiles": [
      "chiseled_bookshelf_occupied.png"
    ]
  },
  {
    "id": 245,
    "name": "Chiseled Bookshelf",
    "category": "decoration",
    "side": 284,
    "top": 285,
    "bottom": 285,
    "solid": 1,
    "textureFiles": [
      "chiseled_bookshelf_side.png",
      "chiseled_bookshelf_top.png"
    ]
  },
  {
    "id": 246,
    "name": "Chiseled Deepslate",
    "category": "building",
    "side": 286,
    "top": 286,
    "bottom": 286,
    "solid": 1,
    "textureFiles": [
      "chiseled_deepslate.png"
    ]
  },
  {
    "id": 247,
    "name": "Chiseled Nether Bricks",
    "category": "building",
    "side": 287,
    "top": 287,
    "bottom": 287,
    "solid": 1,
    "textureFiles": [
      "chiseled_nether_bricks.png"
    ]
  },
  {
    "id": 248,
    "name": "Chiseled Polished Blackstone",
    "category": "natural",
    "side": 288,
    "top": 288,
    "bottom": 288,
    "solid": 1,
    "textureFiles": [
      "chiseled_polished_blackstone.png"
    ]
  },
  {
    "id": 249,
    "name": "Chiseled Quartz Block",
    "category": "building",
    "side": 289,
    "top": 290,
    "bottom": 290,
    "solid": 1,
    "textureFiles": [
      "chiseled_quartz_block.png",
      "chiseled_quartz_block_top.png"
    ]
  },
  {
    "id": 250,
    "name": "Chiseled Red Sandstone",
    "category": "natural",
    "side": 291,
    "top": 291,
    "bottom": 291,
    "solid": 1,
    "textureFiles": [
      "chiseled_red_sandstone.png"
    ]
  },
  {
    "id": 251,
    "name": "Chiseled Sandstone",
    "category": "natural",
    "side": 292,
    "top": 292,
    "bottom": 292,
    "solid": 1,
    "textureFiles": [
      "chiseled_sandstone.png"
    ]
  },
  {
    "id": 252,
    "name": "Chiseled Stone Bricks",
    "category": "building",
    "side": 293,
    "top": 293,
    "bottom": 293,
    "solid": 1,
    "textureFiles": [
      "chiseled_stone_bricks.png"
    ]
  },
  {
    "id": 253,
    "name": "Chorus Flower",
    "category": "decoration",
    "side": 294,
    "top": 294,
    "bottom": 294,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "chorus_flower.png"
    ]
  },
  {
    "id": 254,
    "name": "Chorus Flower Dead",
    "category": "decoration",
    "side": 295,
    "top": 295,
    "bottom": 295,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "chorus_flower_dead.png"
    ]
  },
  {
    "id": 255,
    "name": "Chorus Plant",
    "category": "building",
    "side": 296,
    "top": 296,
    "bottom": 296,
    "solid": 1,
    "textureFiles": [
      "chorus_plant.png"
    ]
  },
  {
    "id": 256,
    "name": "Clay",
    "category": "natural",
    "side": 67,
    "top": 67,
    "bottom": 67,
    "solid": 1,
    "textureFiles": [
      "clay.png"
    ]
  },
  {
    "id": 257,
    "name": "Coal Block",
    "category": "building",
    "side": 297,
    "top": 297,
    "bottom": 297,
    "solid": 1,
    "textureFiles": [
      "coal_block.png"
    ]
  },
  {
    "id": 258,
    "name": "Cobbled Deepslate",
    "category": "building",
    "side": 298,
    "top": 298,
    "bottom": 298,
    "solid": 1,
    "textureFiles": [
      "cobbled_deepslate.png"
    ]
  },
  {
    "id": 259,
    "name": "Cobweb",
    "category": "building",
    "side": 299,
    "top": 299,
    "bottom": 299,
    "solid": 0,
    "textureFiles": [
      "cobweb.png"
    ],
    "trans": 1
  },
  {
    "id": 260,
    "name": "Cocoa",
    "category": "building",
    "side": 300,
    "top": 300,
    "bottom": 300,
    "solid": 1,
    "textureFiles": [
      "cocoa_stage0.png",
      "cocoa_stage1.png",
      "cocoa_stage2.png"
    ]
  },
  {
    "id": 261,
    "name": "Command Block",
    "category": "building",
    "side": 306,
    "top": 306,
    "bottom": 306,
    "solid": 1,
    "textureFiles": [
      "command_block_back.png",
      "command_block_front.png",
      "command_block_side.png"
    ],
    "animated": {
      "frames": 4,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 262,
    "name": "Command Block Conditional",
    "category": "building",
    "side": 304,
    "top": 304,
    "bottom": 304,
    "solid": 1,
    "textureFiles": [
      "command_block_conditional.png"
    ],
    "animated": {
      "frames": 4,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 263,
    "name": "Comparator",
    "category": "redstone",
    "side": 307,
    "top": 307,
    "bottom": 307,
    "solid": 1,
    "textureFiles": [
      "comparator.png",
      "comparator_on.png"
    ]
  },
  {
    "id": 264,
    "name": "Composter",
    "category": "building",
    "side": 312,
    "top": 313,
    "bottom": 309,
    "solid": 1,
    "textureFiles": [
      "composter_bottom.png",
      "composter_side.png",
      "composter_top.png"
    ]
  },
  {
    "id": 265,
    "name": "Composter Compost",
    "category": "building",
    "side": 310,
    "top": 310,
    "bottom": 310,
    "solid": 1,
    "textureFiles": [
      "composter_compost.png"
    ]
  },
  {
    "id": 266,
    "name": "Composter Ready",
    "category": "building",
    "side": 311,
    "top": 311,
    "bottom": 311,
    "solid": 1,
    "textureFiles": [
      "composter_ready.png"
    ]
  },
  {
    "id": 267,
    "name": "Copper Block",
    "category": "building",
    "side": 314,
    "top": 314,
    "bottom": 314,
    "solid": 1,
    "textureFiles": [
      "copper_block.png"
    ]
  },
  {
    "id": 268,
    "name": "Copper Ore",
    "category": "natural",
    "side": 315,
    "top": 315,
    "bottom": 315,
    "solid": 1,
    "textureFiles": [
      "copper_ore.png"
    ]
  },
  {
    "id": 269,
    "name": "Cornflower",
    "category": "decoration",
    "side": 316,
    "top": 316,
    "bottom": 316,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "cornflower.png"
    ]
  },
  {
    "id": 270,
    "name": "Cracked Deepslate Bricks",
    "category": "building",
    "side": 317,
    "top": 317,
    "bottom": 317,
    "solid": 1,
    "textureFiles": [
      "cracked_deepslate_bricks.png"
    ]
  },
  {
    "id": 271,
    "name": "Cracked Deepslate Tiles",
    "category": "building",
    "side": 318,
    "top": 318,
    "bottom": 318,
    "solid": 1,
    "textureFiles": [
      "cracked_deepslate_tiles.png"
    ]
  },
  {
    "id": 272,
    "name": "Cracked Nether Bricks",
    "category": "building",
    "side": 319,
    "top": 319,
    "bottom": 319,
    "solid": 1,
    "textureFiles": [
      "cracked_nether_bricks.png"
    ]
  },
  {
    "id": 273,
    "name": "Cracked Polished Blackstone Bricks",
    "category": "natural",
    "side": 320,
    "top": 320,
    "bottom": 320,
    "solid": 1,
    "textureFiles": [
      "cracked_polished_blackstone_bricks.png"
    ]
  },
  {
    "id": 274,
    "name": "Cracked Stone Bricks",
    "category": "building",
    "side": 321,
    "top": 321,
    "bottom": 321,
    "solid": 1,
    "textureFiles": [
      "cracked_stone_bricks.png"
    ]
  },
  {
    "id": 275,
    "name": "Crimson Door",
    "category": "redstone",
    "side": 323,
    "top": 324,
    "bottom": 323,
    "solid": 1,
    "textureFiles": [
      "crimson_door_bottom.png",
      "crimson_door_top.png"
    ]
  },
  {
    "id": 276,
    "name": "Crimson Fungus",
    "category": "building",
    "side": 111,
    "top": 111,
    "bottom": 111,
    "solid": 1,
    "textureFiles": [
      "crimson_fungus.png"
    ]
  },
  {
    "id": 277,
    "name": "Crimson Nylium",
    "category": "building",
    "side": 326,
    "top": 326,
    "bottom": 326,
    "solid": 1,
    "textureFiles": [
      "crimson_nylium.png",
      "crimson_nylium_side.png"
    ]
  },
  {
    "id": 278,
    "name": "Crimson Planks",
    "category": "building",
    "side": 327,
    "top": 327,
    "bottom": 327,
    "solid": 1,
    "textureFiles": [
      "crimson_planks.png"
    ]
  },
  {
    "id": 279,
    "name": "Crimson Roots",
    "category": "building",
    "side": 328,
    "top": 328,
    "bottom": 328,
    "solid": 1,
    "textureFiles": [
      "crimson_roots.png"
    ]
  },
  {
    "id": 280,
    "name": "Crimson Roots Pot",
    "category": "decoration",
    "side": 329,
    "top": 329,
    "bottom": 329,
    "solid": 1,
    "textureFiles": [
      "crimson_roots_pot.png"
    ]
  },
  {
    "id": 281,
    "name": "Crimson",
    "category": "building",
    "side": 122,
    "top": 122,
    "bottom": 122,
    "solid": 1,
    "textureFiles": [
      "crimson_stem.png"
    ],
    "animated": {
      "frames": 5,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 282,
    "name": "Crimson Trapdoor",
    "category": "redstone",
    "side": 330,
    "top": 330,
    "bottom": 330,
    "solid": 1,
    "textureFiles": [
      "crimson_trapdoor.png"
    ]
  },
  {
    "id": 283,
    "name": "Cut Copper",
    "category": "building",
    "side": 331,
    "top": 331,
    "bottom": 331,
    "solid": 1,
    "textureFiles": [
      "cut_copper.png"
    ]
  },
  {
    "id": 284,
    "name": "Cut Red Sandstone",
    "category": "natural",
    "side": 332,
    "top": 332,
    "bottom": 332,
    "solid": 1,
    "textureFiles": [
      "cut_red_sandstone.png"
    ]
  },
  {
    "id": 285,
    "name": "Cut Sandstone",
    "category": "natural",
    "side": 333,
    "top": 333,
    "bottom": 333,
    "solid": 1,
    "textureFiles": [
      "cut_sandstone.png"
    ]
  },
  {
    "id": 286,
    "name": "Cyan Candle",
    "category": "colored",
    "side": 334,
    "top": 334,
    "bottom": 334,
    "solid": 1,
    "textureFiles": [
      "cyan_candle.png",
      "cyan_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 287,
    "name": "Cyan Concrete",
    "category": "colored",
    "side": 336,
    "top": 336,
    "bottom": 336,
    "solid": 1,
    "textureFiles": [
      "cyan_concrete.png"
    ]
  },
  {
    "id": 288,
    "name": "Cyan Concrete Powder",
    "category": "colored",
    "side": 337,
    "top": 337,
    "bottom": 337,
    "solid": 1,
    "textureFiles": [
      "cyan_concrete_powder.png"
    ]
  },
  {
    "id": 289,
    "name": "Cyan Glazed Terracotta",
    "category": "colored",
    "side": 338,
    "top": 338,
    "bottom": 338,
    "solid": 1,
    "textureFiles": [
      "cyan_glazed_terracotta.png"
    ]
  },
  {
    "id": 290,
    "name": "Cyan Shulker Box",
    "category": "colored",
    "side": 339,
    "top": 339,
    "bottom": 339,
    "solid": 1,
    "textureFiles": [
      "cyan_shulker_box.png"
    ]
  },
  {
    "id": 291,
    "name": "Cyan Stained Glass",
    "category": "colored",
    "side": 340,
    "top": 340,
    "bottom": 340,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "cyan_stained_glass.png"
    ]
  },
  {
    "id": 292,
    "name": "Cyan Stained Glass Pane",
    "category": "colored",
    "side": 340,
    "top": 341,
    "bottom": 341,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "cyan_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 293,
    "name": "Cyan Terracotta",
    "category": "colored",
    "side": 342,
    "top": 342,
    "bottom": 342,
    "solid": 1,
    "textureFiles": [
      "cyan_terracotta.png"
    ]
  },
  {
    "id": 294,
    "name": "Cyan Wool",
    "category": "colored",
    "side": 343,
    "top": 343,
    "bottom": 343,
    "solid": 1,
    "textureFiles": [
      "cyan_wool.png"
    ]
  },
  {
    "id": 295,
    "name": "Damaged Anvil",
    "category": "decoration",
    "side": 344,
    "top": 344,
    "bottom": 344,
    "solid": 1,
    "textureFiles": [
      "damaged_anvil_top.png"
    ]
  },
  {
    "id": 296,
    "name": "Dark Oak Door",
    "category": "redstone",
    "side": 345,
    "top": 346,
    "bottom": 345,
    "solid": 1,
    "textureFiles": [
      "dark_oak_door_bottom.png",
      "dark_oak_door_top.png"
    ]
  },
  {
    "id": 297,
    "name": "Dark Oak Log",
    "category": "wood",
    "side": 347,
    "top": 348,
    "bottom": 348,
    "solid": 1,
    "textureFiles": [
      "dark_oak_log.png",
      "dark_oak_log_top.png"
    ]
  },
  {
    "id": 298,
    "name": "Dark Oak Sapling",
    "category": "decoration",
    "side": 349,
    "top": 349,
    "bottom": 349,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "dark_oak_sapling.png"
    ]
  },
  {
    "id": 299,
    "name": "Dark Oak Trapdoor",
    "category": "redstone",
    "side": 350,
    "top": 350,
    "bottom": 350,
    "solid": 1,
    "textureFiles": [
      "dark_oak_trapdoor.png"
    ]
  },
  {
    "id": 300,
    "name": "Dark Prismarine",
    "category": "building",
    "side": 351,
    "top": 351,
    "bottom": 351,
    "solid": 1,
    "textureFiles": [
      "dark_prismarine.png"
    ]
  },
  {
    "id": 301,
    "name": "Daylight Detector Inverted",
    "category": "redstone",
    "side": 352,
    "top": 352,
    "bottom": 352,
    "solid": 1,
    "textureFiles": [
      "daylight_detector_inverted_top.png"
    ]
  },
  {
    "id": 302,
    "name": "Daylight Detector",
    "category": "redstone",
    "side": 353,
    "top": 354,
    "bottom": 354,
    "solid": 1,
    "textureFiles": [
      "daylight_detector_side.png",
      "daylight_detector_top.png"
    ]
  },
  {
    "id": 303,
    "name": "Dead Brain Coral",
    "category": "natural",
    "side": 355,
    "top": 355,
    "bottom": 355,
    "solid": 1,
    "textureFiles": [
      "dead_brain_coral.png"
    ]
  },
  {
    "id": 304,
    "name": "Dead Brain Coral Block",
    "category": "natural",
    "side": 356,
    "top": 356,
    "bottom": 356,
    "solid": 1,
    "textureFiles": [
      "dead_brain_coral_block.png"
    ]
  },
  {
    "id": 305,
    "name": "Dead Brain Coral Fan",
    "category": "natural",
    "side": 357,
    "top": 357,
    "bottom": 357,
    "solid": 1,
    "textureFiles": [
      "dead_brain_coral_fan.png"
    ]
  },
  {
    "id": 306,
    "name": "Dead Bubble Coral",
    "category": "natural",
    "side": 358,
    "top": 358,
    "bottom": 358,
    "solid": 1,
    "textureFiles": [
      "dead_bubble_coral.png"
    ]
  },
  {
    "id": 307,
    "name": "Dead Bubble Coral Block",
    "category": "natural",
    "side": 359,
    "top": 359,
    "bottom": 359,
    "solid": 1,
    "textureFiles": [
      "dead_bubble_coral_block.png"
    ]
  },
  {
    "id": 308,
    "name": "Dead Bubble Coral Fan",
    "category": "natural",
    "side": 360,
    "top": 360,
    "bottom": 360,
    "solid": 1,
    "textureFiles": [
      "dead_bubble_coral_fan.png"
    ]
  },
  {
    "id": 309,
    "name": "Dead Bush",
    "category": "building",
    "side": 361,
    "top": 361,
    "bottom": 361,
    "solid": 1,
    "textureFiles": [
      "dead_bush.png"
    ]
  },
  {
    "id": 310,
    "name": "Dead Fire Coral",
    "category": "natural",
    "side": 362,
    "top": 362,
    "bottom": 362,
    "solid": 1,
    "textureFiles": [
      "dead_fire_coral.png"
    ]
  },
  {
    "id": 311,
    "name": "Dead Fire Coral Block",
    "category": "natural",
    "side": 363,
    "top": 363,
    "bottom": 363,
    "solid": 1,
    "textureFiles": [
      "dead_fire_coral_block.png"
    ]
  },
  {
    "id": 312,
    "name": "Dead Fire Coral Fan",
    "category": "natural",
    "side": 364,
    "top": 364,
    "bottom": 364,
    "solid": 1,
    "textureFiles": [
      "dead_fire_coral_fan.png"
    ]
  },
  {
    "id": 313,
    "name": "Dead Horn Coral",
    "category": "natural",
    "side": 365,
    "top": 365,
    "bottom": 365,
    "solid": 1,
    "textureFiles": [
      "dead_horn_coral.png"
    ]
  },
  {
    "id": 314,
    "name": "Dead Horn Coral Block",
    "category": "natural",
    "side": 366,
    "top": 366,
    "bottom": 366,
    "solid": 1,
    "textureFiles": [
      "dead_horn_coral_block.png"
    ]
  },
  {
    "id": 315,
    "name": "Dead Horn Coral Fan",
    "category": "natural",
    "side": 367,
    "top": 367,
    "bottom": 367,
    "solid": 1,
    "textureFiles": [
      "dead_horn_coral_fan.png"
    ]
  },
  {
    "id": 316,
    "name": "Dead Tube Coral",
    "category": "natural",
    "side": 368,
    "top": 368,
    "bottom": 368,
    "solid": 1,
    "textureFiles": [
      "dead_tube_coral.png"
    ]
  },
  {
    "id": 317,
    "name": "Dead Tube Coral Block",
    "category": "natural",
    "side": 369,
    "top": 369,
    "bottom": 369,
    "solid": 1,
    "textureFiles": [
      "dead_tube_coral_block.png"
    ]
  },
  {
    "id": 318,
    "name": "Dead Tube Coral Fan",
    "category": "natural",
    "side": 370,
    "top": 370,
    "bottom": 370,
    "solid": 1,
    "textureFiles": [
      "dead_tube_coral_fan.png"
    ]
  },
  {
    "id": 319,
    "name": "Debug",
    "category": "building",
    "side": 371,
    "top": 371,
    "bottom": 371,
    "solid": 1,
    "textureFiles": [
      "debug.png"
    ]
  },
  {
    "id": 320,
    "name": "Debug2",
    "category": "building",
    "side": 372,
    "top": 372,
    "bottom": 372,
    "solid": 1,
    "textureFiles": [
      "debug2.png"
    ]
  },
  {
    "id": 321,
    "name": "Deepslate",
    "category": "building",
    "side": 373,
    "top": 384,
    "bottom": 384,
    "solid": 1,
    "textureFiles": [
      "deepslate.png",
      "deepslate_top.png"
    ]
  },
  {
    "id": 322,
    "name": "Deepslate Bricks",
    "category": "building",
    "side": 374,
    "top": 374,
    "bottom": 374,
    "solid": 1,
    "textureFiles": [
      "deepslate_bricks.png"
    ]
  },
  {
    "id": 323,
    "name": "Deepslate Coal Ore",
    "category": "natural",
    "side": 375,
    "top": 375,
    "bottom": 375,
    "solid": 1,
    "textureFiles": [
      "deepslate_coal_ore.png"
    ]
  },
  {
    "id": 324,
    "name": "Deepslate Copper Ore",
    "category": "natural",
    "side": 376,
    "top": 376,
    "bottom": 376,
    "solid": 1,
    "textureFiles": [
      "deepslate_copper_ore.png"
    ]
  },
  {
    "id": 325,
    "name": "Deepslate Diamond Ore",
    "category": "natural",
    "side": 377,
    "top": 377,
    "bottom": 377,
    "solid": 1,
    "textureFiles": [
      "deepslate_diamond_ore.png"
    ]
  },
  {
    "id": 326,
    "name": "Deepslate Emerald Ore",
    "category": "natural",
    "side": 378,
    "top": 378,
    "bottom": 378,
    "solid": 1,
    "textureFiles": [
      "deepslate_emerald_ore.png"
    ]
  },
  {
    "id": 327,
    "name": "Deepslate Gold Ore",
    "category": "natural",
    "side": 379,
    "top": 379,
    "bottom": 379,
    "solid": 1,
    "textureFiles": [
      "deepslate_gold_ore.png"
    ]
  },
  {
    "id": 328,
    "name": "Deepslate Iron Ore",
    "category": "natural",
    "side": 380,
    "top": 380,
    "bottom": 380,
    "solid": 1,
    "textureFiles": [
      "deepslate_iron_ore.png"
    ]
  },
  {
    "id": 329,
    "name": "Deepslate Lapis Ore",
    "category": "natural",
    "side": 381,
    "top": 381,
    "bottom": 381,
    "solid": 1,
    "textureFiles": [
      "deepslate_lapis_ore.png"
    ]
  },
  {
    "id": 330,
    "name": "Deepslate Redstone Ore",
    "category": "redstone",
    "side": 382,
    "top": 382,
    "bottom": 382,
    "solid": 1,
    "textureFiles": [
      "deepslate_redstone_ore.png"
    ]
  },
  {
    "id": 331,
    "name": "Deepslate Tiles",
    "category": "building",
    "side": 383,
    "top": 383,
    "bottom": 383,
    "solid": 1,
    "textureFiles": [
      "deepslate_tiles.png"
    ]
  },
  {
    "id": 332,
    "name": "Destroy Stage 0",
    "category": "building",
    "side": 385,
    "top": 385,
    "bottom": 385,
    "solid": 1,
    "textureFiles": [
      "destroy_stage_0.png"
    ]
  },
  {
    "id": 333,
    "name": "Destroy Stage 1",
    "category": "building",
    "side": 386,
    "top": 386,
    "bottom": 386,
    "solid": 1,
    "textureFiles": [
      "destroy_stage_1.png"
    ]
  },
  {
    "id": 334,
    "name": "Destroy Stage 2",
    "category": "building",
    "side": 387,
    "top": 387,
    "bottom": 387,
    "solid": 1,
    "textureFiles": [
      "destroy_stage_2.png"
    ]
  },
  {
    "id": 335,
    "name": "Destroy Stage 3",
    "category": "building",
    "side": 388,
    "top": 388,
    "bottom": 388,
    "solid": 1,
    "textureFiles": [
      "destroy_stage_3.png"
    ]
  },
  {
    "id": 336,
    "name": "Destroy Stage 4",
    "category": "building",
    "side": 389,
    "top": 389,
    "bottom": 389,
    "solid": 1,
    "textureFiles": [
      "destroy_stage_4.png"
    ]
  },
  {
    "id": 337,
    "name": "Destroy Stage 5",
    "category": "building",
    "side": 390,
    "top": 390,
    "bottom": 390,
    "solid": 1,
    "textureFiles": [
      "destroy_stage_5.png"
    ]
  },
  {
    "id": 338,
    "name": "Destroy Stage 6",
    "category": "building",
    "side": 391,
    "top": 391,
    "bottom": 391,
    "solid": 1,
    "textureFiles": [
      "destroy_stage_6.png"
    ]
  },
  {
    "id": 339,
    "name": "Destroy Stage 7",
    "category": "building",
    "side": 392,
    "top": 392,
    "bottom": 392,
    "solid": 1,
    "textureFiles": [
      "destroy_stage_7.png"
    ]
  },
  {
    "id": 340,
    "name": "Destroy Stage 8",
    "category": "building",
    "side": 393,
    "top": 393,
    "bottom": 393,
    "solid": 1,
    "textureFiles": [
      "destroy_stage_8.png"
    ]
  },
  {
    "id": 341,
    "name": "Destroy Stage 9",
    "category": "building",
    "side": 394,
    "top": 394,
    "bottom": 394,
    "solid": 1,
    "textureFiles": [
      "destroy_stage_9.png"
    ]
  },
  {
    "id": 342,
    "name": "Detector Rail",
    "category": "transportation",
    "side": 395,
    "top": 395,
    "bottom": 395,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "detector_rail.png",
      "detector_rail_on.png"
    ]
  },
  {
    "id": 343,
    "name": "Diamond Block",
    "category": "building",
    "side": 397,
    "top": 397,
    "bottom": 397,
    "solid": 1,
    "textureFiles": [
      "diamond_block.png"
    ]
  },
  {
    "id": 344,
    "name": "Diorite",
    "category": "building",
    "side": 398,
    "top": 398,
    "bottom": 398,
    "solid": 1,
    "textureFiles": [
      "diorite.png"
    ]
  },
  {
    "id": 345,
    "name": "Dispenser",
    "category": "redstone",
    "side": 400,
    "top": 400,
    "bottom": 400,
    "solid": 1,
    "textureFiles": [
      "dispenser_front.png"
    ]
  },
  {
    "id": 346,
    "name": "Dispenser Front Vertical",
    "category": "redstone",
    "side": 401,
    "top": 401,
    "bottom": 401,
    "solid": 1,
    "textureFiles": [
      "dispenser_front_vertical.png"
    ]
  },
  {
    "id": 347,
    "name": "Dragon Egg",
    "category": "building",
    "side": 402,
    "top": 402,
    "bottom": 402,
    "solid": 1,
    "textureFiles": [
      "dragon_egg.png"
    ],
    "light": 1,
    "lightDist": 1
  },
  {
    "id": 348,
    "name": "Dried Kelp",
    "category": "natural",
    "side": 404,
    "top": 405,
    "bottom": 403,
    "solid": 1,
    "textureFiles": [
      "dried_kelp_bottom.png",
      "dried_kelp_side.png",
      "dried_kelp_top.png"
    ]
  },
  {
    "id": 349,
    "name": "Dripstone Block",
    "category": "natural",
    "side": 406,
    "top": 406,
    "bottom": 406,
    "solid": 1,
    "textureFiles": [
      "dripstone_block.png"
    ]
  },
  {
    "id": 350,
    "name": "Dropper",
    "category": "redstone",
    "side": 407,
    "top": 407,
    "bottom": 407,
    "solid": 1,
    "textureFiles": [
      "dropper_front.png"
    ]
  },
  {
    "id": 351,
    "name": "Dropper Front Vertical",
    "category": "redstone",
    "side": 408,
    "top": 408,
    "bottom": 408,
    "solid": 1,
    "textureFiles": [
      "dropper_front_vertical.png"
    ]
  },
  {
    "id": 352,
    "name": "Emerald Block",
    "category": "building",
    "side": 409,
    "top": 409,
    "bottom": 409,
    "solid": 1,
    "textureFiles": [
      "emerald_block.png"
    ]
  },
  {
    "id": 353,
    "name": "Enchanting Table",
    "category": "decoration",
    "side": 411,
    "top": 412,
    "bottom": 410,
    "solid": 1,
    "textureFiles": [
      "enchanting_table_bottom.png",
      "enchanting_table_side.png",
      "enchanting_table_top.png"
    ],
    "light": 1,
    "lightDist": 7
  },
  {
    "id": 354,
    "name": "End Portal Frame Eye",
    "category": "building",
    "side": 413,
    "top": 413,
    "bottom": 413,
    "solid": 1,
    "textureFiles": [
      "end_portal_frame_eye.png"
    ]
  },
  {
    "id": 355,
    "name": "End Portal Frame",
    "category": "building",
    "side": 414,
    "top": 415,
    "bottom": 415,
    "solid": 1,
    "textureFiles": [
      "end_portal_frame_side.png",
      "end_portal_frame_top.png"
    ]
  },
  {
    "id": 356,
    "name": "End Stone Bricks",
    "category": "natural",
    "side": 416,
    "top": 416,
    "bottom": 416,
    "solid": 1,
    "textureFiles": [
      "end_stone_bricks.png"
    ]
  },
  {
    "id": 357,
    "name": "Exposed Copper",
    "category": "building",
    "side": 417,
    "top": 417,
    "bottom": 417,
    "solid": 1,
    "textureFiles": [
      "exposed_copper.png"
    ]
  },
  {
    "id": 358,
    "name": "Exposed Cut Copper",
    "category": "building",
    "side": 418,
    "top": 418,
    "bottom": 418,
    "solid": 1,
    "textureFiles": [
      "exposed_cut_copper.png"
    ]
  },
  {
    "id": 359,
    "name": "Farmland",
    "category": "building",
    "side": 419,
    "top": 419,
    "bottom": 419,
    "solid": 1,
    "textureFiles": [
      "farmland.png"
    ]
  },
  {
    "id": 360,
    "name": "Farmland Moist",
    "category": "building",
    "side": 420,
    "top": 420,
    "bottom": 420,
    "solid": 1,
    "textureFiles": [
      "farmland_moist.png"
    ]
  },
  {
    "id": 361,
    "name": "Fern",
    "category": "building",
    "side": 421,
    "top": 421,
    "bottom": 421,
    "solid": 1,
    "textureFiles": [
      "fern.png"
    ]
  },
  {
    "id": 362,
    "name": "Fire 0",
    "category": "building",
    "side": 105,
    "top": 105,
    "bottom": 105,
    "solid": 1,
    "textureFiles": [
      "fire_0.png"
    ],
    "animated": {
      "frames": 32,
      "frametime": 1,
      "interpolate": false,
      "frameOrder": [
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ]
    }
  },
  {
    "id": 363,
    "name": "Fire 1",
    "category": "building",
    "side": 422,
    "top": 422,
    "bottom": 422,
    "solid": 1,
    "textureFiles": [
      "fire_1.png"
    ],
    "animated": {
      "frames": 32,
      "frametime": 1,
      "interpolate": false
    }
  },
  {
    "id": 364,
    "name": "Fire Coral",
    "category": "natural",
    "side": 423,
    "top": 423,
    "bottom": 423,
    "solid": 1,
    "textureFiles": [
      "fire_coral.png"
    ]
  },
  {
    "id": 365,
    "name": "Fire Coral Fan",
    "category": "natural",
    "side": 424,
    "top": 424,
    "bottom": 424,
    "solid": 1,
    "textureFiles": [
      "fire_coral_fan.png"
    ]
  },
  {
    "id": 366,
    "name": "Fletching Table",
    "category": "decoration",
    "side": 426,
    "top": 427,
    "bottom": 427,
    "solid": 1,
    "textureFiles": [
      "fletching_table_front.png",
      "fletching_table_side.png",
      "fletching_table_top.png"
    ]
  },
  {
    "id": 367,
    "name": "Flower Pot",
    "category": "decoration",
    "side": 428,
    "top": 428,
    "bottom": 428,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "flower_pot.png"
    ]
  },
  {
    "id": 368,
    "name": "Flowering Azalea Leaves",
    "category": "decoration",
    "side": 429,
    "top": 429,
    "bottom": 429,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "flowering_azalea_leaves.png"
    ]
  },
  {
    "id": 369,
    "name": "Flowering Azalea",
    "category": "decoration",
    "side": 430,
    "top": 431,
    "bottom": 431,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "flowering_azalea_side.png",
      "flowering_azalea_top.png"
    ]
  },
  {
    "id": 370,
    "name": "Frogspawn",
    "category": "building",
    "side": 432,
    "top": 432,
    "bottom": 432,
    "solid": 1,
    "textureFiles": [
      "frogspawn.png"
    ]
  },
  {
    "id": 371,
    "name": "Frosted Ice 0",
    "category": "natural",
    "side": 433,
    "top": 433,
    "bottom": 433,
    "solid": 1,
    "textureFiles": [
      "frosted_ice_0.png"
    ]
  },
  {
    "id": 372,
    "name": "Frosted Ice 1",
    "category": "natural",
    "side": 434,
    "top": 434,
    "bottom": 434,
    "solid": 1,
    "textureFiles": [
      "frosted_ice_1.png"
    ]
  },
  {
    "id": 373,
    "name": "Frosted Ice 2",
    "category": "natural",
    "side": 435,
    "top": 435,
    "bottom": 435,
    "solid": 1,
    "textureFiles": [
      "frosted_ice_2.png"
    ]
  },
  {
    "id": 374,
    "name": "Frosted Ice 3",
    "category": "natural",
    "side": 436,
    "top": 436,
    "bottom": 436,
    "solid": 1,
    "textureFiles": [
      "frosted_ice_3.png"
    ]
  },
  {
    "id": 375,
    "name": "Furnace Front",
    "category": "decoration",
    "side": 54,
    "top": 54,
    "bottom": 54,
    "solid": 1,
    "textureFiles": [
      "furnace_front_on.png"
    ]
  },
  {
    "id": 376,
    "name": "Gilded Blackstone",
    "category": "natural",
    "side": 438,
    "top": 438,
    "bottom": 438,
    "solid": 1,
    "textureFiles": [
      "gilded_blackstone.png"
    ]
  },
  {
    "id": 377,
    "name": "Glass Pane",
    "category": "building",
    "side": 10,
    "top": 439,
    "bottom": 439,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "glass_pane_top.png"
    ]
  },
  {
    "id": 378,
    "name": "Glow Item Frame",
    "category": "building",
    "side": 440,
    "top": 440,
    "bottom": 440,
    "solid": 1,
    "glow": 1,
    "textureFiles": [
      "glow_item_frame.png"
    ]
  },
  {
    "id": 379,
    "name": "Gold Block",
    "category": "building",
    "side": 441,
    "top": 441,
    "bottom": 441,
    "solid": 1,
    "textureFiles": [
      "gold_block.png"
    ]
  },
  {
    "id": 380,
    "name": "Granite",
    "category": "building",
    "side": 442,
    "top": 442,
    "bottom": 442,
    "solid": 1,
    "textureFiles": [
      "granite.png"
    ]
  },
  {
    "id": 381,
    "name": "Grass",
    "category": "natural",
    "side": 129,
    "top": 129,
    "bottom": 129,
    "solid": 1,
    "textureFiles": [
      "grass.png"
    ]
  },
  {
    "id": 382,
    "name": "Grass Block Side Overlay",
    "category": "natural",
    "side": 443,
    "top": 443,
    "bottom": 443,
    "solid": 1,
    "textureFiles": [
      "grass_block_side_overlay.png"
    ]
  },
  {
    "id": 383,
    "name": "Grass Block Snow",
    "category": "natural",
    "side": 22,
    "top": 22,
    "bottom": 22,
    "solid": 1,
    "textureFiles": [
      "grass_block_snow.png"
    ]
  },
  {
    "id": 384,
    "name": "Gray Candle",
    "category": "colored",
    "side": 444,
    "top": 444,
    "bottom": 444,
    "solid": 1,
    "textureFiles": [
      "gray_candle.png",
      "gray_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 385,
    "name": "Gray Concrete",
    "category": "colored",
    "side": 446,
    "top": 446,
    "bottom": 446,
    "solid": 1,
    "textureFiles": [
      "gray_concrete.png"
    ]
  },
  {
    "id": 386,
    "name": "Gray Concrete Powder",
    "category": "colored",
    "side": 447,
    "top": 447,
    "bottom": 447,
    "solid": 1,
    "textureFiles": [
      "gray_concrete_powder.png"
    ]
  },
  {
    "id": 387,
    "name": "Gray Glazed Terracotta",
    "category": "colored",
    "side": 448,
    "top": 448,
    "bottom": 448,
    "solid": 1,
    "textureFiles": [
      "gray_glazed_terracotta.png"
    ]
  },
  {
    "id": 388,
    "name": "Gray Shulker Box",
    "category": "colored",
    "side": 449,
    "top": 449,
    "bottom": 449,
    "solid": 1,
    "textureFiles": [
      "gray_shulker_box.png"
    ]
  },
  {
    "id": 389,
    "name": "Gray Stained Glass",
    "category": "colored",
    "side": 450,
    "top": 450,
    "bottom": 450,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "gray_stained_glass.png"
    ]
  },
  {
    "id": 390,
    "name": "Gray Stained Glass Pane",
    "category": "colored",
    "side": 450,
    "top": 451,
    "bottom": 451,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "gray_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 391,
    "name": "Gray Terracotta",
    "category": "colored",
    "side": 452,
    "top": 452,
    "bottom": 452,
    "solid": 1,
    "textureFiles": [
      "gray_terracotta.png"
    ]
  },
  {
    "id": 392,
    "name": "Gray Wool",
    "category": "colored",
    "side": 453,
    "top": 453,
    "bottom": 453,
    "solid": 1,
    "textureFiles": [
      "gray_wool.png"
    ]
  },
  {
    "id": 393,
    "name": "Green Candle",
    "category": "colored",
    "side": 454,
    "top": 454,
    "bottom": 454,
    "solid": 1,
    "textureFiles": [
      "green_candle.png",
      "green_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 394,
    "name": "Green Concrete",
    "category": "colored",
    "side": 456,
    "top": 456,
    "bottom": 456,
    "solid": 1,
    "textureFiles": [
      "green_concrete.png"
    ]
  },
  {
    "id": 395,
    "name": "Green Concrete Powder",
    "category": "colored",
    "side": 457,
    "top": 457,
    "bottom": 457,
    "solid": 1,
    "textureFiles": [
      "green_concrete_powder.png"
    ]
  },
  {
    "id": 396,
    "name": "Green Glazed Terracotta",
    "category": "colored",
    "side": 458,
    "top": 458,
    "bottom": 458,
    "solid": 1,
    "textureFiles": [
      "green_glazed_terracotta.png"
    ]
  },
  {
    "id": 397,
    "name": "Green Shulker Box",
    "category": "colored",
    "side": 459,
    "top": 459,
    "bottom": 459,
    "solid": 1,
    "textureFiles": [
      "green_shulker_box.png"
    ]
  },
  {
    "id": 398,
    "name": "Green Stained Glass",
    "category": "colored",
    "side": 460,
    "top": 460,
    "bottom": 460,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "green_stained_glass.png"
    ]
  },
  {
    "id": 399,
    "name": "Green Stained Glass Pane",
    "category": "colored",
    "side": 460,
    "top": 461,
    "bottom": 461,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "green_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 400,
    "name": "Green Terracotta",
    "category": "colored",
    "side": 462,
    "top": 462,
    "bottom": 462,
    "solid": 1,
    "textureFiles": [
      "green_terracotta.png"
    ]
  },
  {
    "id": 401,
    "name": "Grindstone Pivot",
    "category": "building",
    "side": 463,
    "top": 463,
    "bottom": 463,
    "solid": 1,
    "textureFiles": [
      "grindstone_pivot.png"
    ]
  },
  {
    "id": 402,
    "name": "Grindstone Round",
    "category": "building",
    "side": 464,
    "top": 464,
    "bottom": 464,
    "solid": 1,
    "textureFiles": [
      "grindstone_round.png"
    ]
  },
  {
    "id": 403,
    "name": "Grindstone",
    "category": "building",
    "side": 465,
    "top": 465,
    "bottom": 465,
    "solid": 1,
    "textureFiles": [
      "grindstone_side.png"
    ]
  },
  {
    "id": 404,
    "name": "Hanging Roots",
    "category": "building",
    "side": 466,
    "top": 466,
    "bottom": 466,
    "solid": 1,
    "textureFiles": [
      "hanging_roots.png"
    ]
  },
  {
    "id": 405,
    "name": "Hay Block",
    "category": "building",
    "side": 68,
    "top": 69,
    "bottom": 69,
    "solid": 1,
    "textureFiles": [
      "hay_block_side.png",
      "hay_block_top.png"
    ]
  },
  {
    "id": 406,
    "name": "Honey Block",
    "category": "building",
    "side": 468,
    "top": 469,
    "bottom": 467,
    "solid": 1,
    "textureFiles": [
      "honey_block_bottom.png",
      "honey_block_side.png",
      "honey_block_top.png"
    ]
  },
  {
    "id": 407,
    "name": "Honeycomb Block",
    "category": "building",
    "side": 470,
    "top": 470,
    "bottom": 470,
    "solid": 1,
    "textureFiles": [
      "honeycomb_block.png"
    ]
  },
  {
    "id": 408,
    "name": "Hopper Inside",
    "category": "redstone",
    "side": 471,
    "top": 471,
    "bottom": 471,
    "solid": 1,
    "textureFiles": [
      "hopper_inside.png"
    ]
  },
  {
    "id": 409,
    "name": "Hopper Outside",
    "category": "redstone",
    "side": 472,
    "top": 472,
    "bottom": 472,
    "solid": 1,
    "textureFiles": [
      "hopper_outside.png"
    ]
  },
  {
    "id": 410,
    "name": "Hopper",
    "category": "redstone",
    "side": 472,
    "top": 472,
    "bottom": 472,
    "solid": 1,
    "textureFiles": [
      "hopper_top.png"
    ]
  },
  {
    "id": 411,
    "name": "Horn Coral",
    "category": "natural",
    "side": 474,
    "top": 474,
    "bottom": 474,
    "solid": 1,
    "textureFiles": [
      "horn_coral.png"
    ]
  },
  {
    "id": 412,
    "name": "Horn Coral Fan",
    "category": "natural",
    "side": 475,
    "top": 475,
    "bottom": 475,
    "solid": 1,
    "textureFiles": [
      "horn_coral_fan.png"
    ]
  },
  {
    "id": 413,
    "name": "Iron Bars",
    "category": "building",
    "side": 476,
    "top": 476,
    "bottom": 476,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "iron_bars.png"
    ]
  },
  {
    "id": 414,
    "name": "Iron Block",
    "category": "building",
    "side": 477,
    "top": 477,
    "bottom": 477,
    "solid": 1,
    "textureFiles": [
      "iron_block.png"
    ]
  },
  {
    "id": 415,
    "name": "Iron Door",
    "category": "redstone",
    "side": 478,
    "top": 479,
    "bottom": 478,
    "solid": 1,
    "textureFiles": [
      "iron_door_bottom.png",
      "iron_door_top.png"
    ]
  },
  {
    "id": 416,
    "name": "Iron Trapdoor",
    "category": "redstone",
    "side": 480,
    "top": 480,
    "bottom": 480,
    "solid": 1,
    "textureFiles": [
      "iron_trapdoor.png"
    ]
  },
  {
    "id": 417,
    "name": "Item Frame",
    "category": "building",
    "side": 481,
    "top": 481,
    "bottom": 481,
    "solid": 1,
    "textureFiles": [
      "item_frame.png"
    ]
  },
  {
    "id": 418,
    "name": "Jack O Lantern",
    "category": "decoration",
    "side": 90,
    "top": 90,
    "bottom": 90,
    "solid": 0,
    "trans": 1,
    "glow": 1,
    "textureFiles": [
      "jack_o_lantern.png"
    ]
  },
  {
    "id": 419,
    "name": "Jigsaw",
    "category": "building",
    "side": 484,
    "top": 485,
    "bottom": 482,
    "solid": 1,
    "textureFiles": [
      "jigsaw_bottom.png",
      "jigsaw_side.png",
      "jigsaw_top.png"
    ]
  },
  {
    "id": 420,
    "name": "Jigsaw Lock",
    "category": "building",
    "side": 483,
    "top": 483,
    "bottom": 483,
    "solid": 1,
    "textureFiles": [
      "jigsaw_lock.png"
    ]
  },
  {
    "id": 421,
    "name": "Jukebox",
    "category": "building",
    "side": 486,
    "top": 487,
    "bottom": 487,
    "solid": 1,
    "textureFiles": [
      "jukebox_side.png",
      "jukebox_top.png"
    ]
  },
  {
    "id": 422,
    "name": "Jungle Door",
    "category": "redstone",
    "side": 488,
    "top": 489,
    "bottom": 488,
    "solid": 1,
    "textureFiles": [
      "jungle_door_bottom.png",
      "jungle_door_top.png"
    ]
  },
  {
    "id": 423,
    "name": "Jungle Sapling",
    "category": "decoration",
    "side": 491,
    "top": 491,
    "bottom": 491,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "jungle_sapling.png"
    ]
  },
  {
    "id": 424,
    "name": "Jungle Trapdoor",
    "category": "redstone",
    "side": 492,
    "top": 492,
    "bottom": 492,
    "solid": 1,
    "textureFiles": [
      "jungle_trapdoor.png"
    ]
  },
  {
    "id": 425,
    "name": "Kelp Plant",
    "category": "natural",
    "side": 493,
    "top": 493,
    "bottom": 493,
    "solid": 1,
    "textureFiles": [
      "kelp_plant.png"
    ],
    "animated": {
      "frames": 20,
      "frametime": 2,
      "interpolate": false
    }
  },
  {
    "id": 426,
    "name": "Lapis Block",
    "category": "building",
    "side": 494,
    "top": 494,
    "bottom": 494,
    "solid": 1,
    "textureFiles": [
      "lapis_block.png"
    ]
  },
  {
    "id": 427,
    "name": "Lapis Ore",
    "category": "natural",
    "side": 41,
    "top": 41,
    "bottom": 41,
    "solid": 1,
    "textureFiles": [
      "lapis_ore.png"
    ]
  },
  {
    "id": 428,
    "name": "Large Amethyst Bud",
    "category": "natural",
    "side": 495,
    "top": 495,
    "bottom": 495,
    "solid": 1,
    "textureFiles": [
      "large_amethyst_bud.png"
    ],
    "light": 1,
    "lightDist": 4,
    "lightCol": 13404415
  },
  {
    "id": 429,
    "name": "Large Fern",
    "category": "building",
    "side": 496,
    "top": 497,
    "bottom": 496,
    "solid": 1,
    "textureFiles": [
      "large_fern_bottom.png",
      "large_fern_top.png"
    ]
  },
  {
    "id": 430,
    "name": "Lava Flow",
    "category": "building",
    "side": 498,
    "top": 498,
    "bottom": 498,
    "solid": 1,
    "textureFiles": [
      "lava_flow.png"
    ],
    "animated": {
      "frames": 32,
      "frametime": 3,
      "interpolate": false
    }
  },
  {
    "id": 431,
    "name": "Lava Still",
    "category": "building",
    "side": 77,
    "top": 77,
    "bottom": 77,
    "solid": 1,
    "textureFiles": [
      "lava_still.png"
    ],
    "animated": {
      "frames": 20,
      "frametime": 2,
      "interpolate": false,
      "frameOrder": [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        18,
        17,
        16,
        15,
        14,
        13,
        12,
        11,
        10,
        9,
        8,
        7,
        6,
        5,
        4,
        3,
        2,
        1
      ]
    }
  },
  {
    "id": 432,
    "name": "Lectern Base",
    "category": "building",
    "side": 499,
    "top": 499,
    "bottom": 499,
    "solid": 1,
    "textureFiles": [
      "lectern_base.png"
    ]
  },
  {
    "id": 433,
    "name": "Lectern",
    "category": "building",
    "side": 499,
    "top": 502,
    "bottom": 502,
    "solid": 1,
    "textureFiles": [
      "lectern_front.png",
      "lectern_top.png"
    ]
  },
  {
    "id": 434,
    "name": "Lectern Sides",
    "category": "building",
    "side": 501,
    "top": 501,
    "bottom": 501,
    "solid": 1,
    "textureFiles": [
      "lectern_sides.png"
    ]
  },
  {
    "id": 435,
    "name": "Lever",
    "category": "redstone",
    "side": 503,
    "top": 503,
    "bottom": 503,
    "solid": 1,
    "textureFiles": [
      "lever.png"
    ]
  },
  {
    "id": 436,
    "name": "Light Blue Candle",
    "category": "colored",
    "side": 504,
    "top": 504,
    "bottom": 504,
    "solid": 1,
    "textureFiles": [
      "light_blue_candle.png",
      "light_blue_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 437,
    "name": "Light Blue Concrete",
    "category": "colored",
    "side": 506,
    "top": 506,
    "bottom": 506,
    "solid": 1,
    "textureFiles": [
      "light_blue_concrete.png"
    ]
  },
  {
    "id": 438,
    "name": "Light Blue Concrete Powder",
    "category": "colored",
    "side": 507,
    "top": 507,
    "bottom": 507,
    "solid": 1,
    "textureFiles": [
      "light_blue_concrete_powder.png"
    ]
  },
  {
    "id": 439,
    "name": "Light Blue Glazed Terracotta",
    "category": "colored",
    "side": 508,
    "top": 508,
    "bottom": 508,
    "solid": 1,
    "textureFiles": [
      "light_blue_glazed_terracotta.png"
    ]
  },
  {
    "id": 440,
    "name": "Light Blue Shulker Box",
    "category": "colored",
    "side": 509,
    "top": 509,
    "bottom": 509,
    "solid": 1,
    "textureFiles": [
      "light_blue_shulker_box.png"
    ]
  },
  {
    "id": 441,
    "name": "Light Blue Stained Glass",
    "category": "colored",
    "side": 510,
    "top": 510,
    "bottom": 510,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "light_blue_stained_glass.png"
    ]
  },
  {
    "id": 442,
    "name": "Light Blue Stained Glass Pane",
    "category": "colored",
    "side": 510,
    "top": 511,
    "bottom": 511,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "light_blue_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 443,
    "name": "Light Blue Terracotta",
    "category": "colored",
    "side": 512,
    "top": 512,
    "bottom": 512,
    "solid": 1,
    "textureFiles": [
      "light_blue_terracotta.png"
    ]
  },
  {
    "id": 444,
    "name": "Light Blue Wool",
    "category": "colored",
    "side": 513,
    "top": 513,
    "bottom": 513,
    "solid": 1,
    "textureFiles": [
      "light_blue_wool.png"
    ]
  },
  {
    "id": 445,
    "name": "Light Gray Candle",
    "category": "colored",
    "side": 514,
    "top": 514,
    "bottom": 514,
    "solid": 1,
    "textureFiles": [
      "light_gray_candle.png",
      "light_gray_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 446,
    "name": "Light Gray Concrete",
    "category": "colored",
    "side": 516,
    "top": 516,
    "bottom": 516,
    "solid": 1,
    "textureFiles": [
      "light_gray_concrete.png"
    ]
  },
  {
    "id": 447,
    "name": "Light Gray Concrete Powder",
    "category": "colored",
    "side": 517,
    "top": 517,
    "bottom": 517,
    "solid": 1,
    "textureFiles": [
      "light_gray_concrete_powder.png"
    ]
  },
  {
    "id": 448,
    "name": "Light Gray Glazed Terracotta",
    "category": "colored",
    "side": 518,
    "top": 518,
    "bottom": 518,
    "solid": 1,
    "textureFiles": [
      "light_gray_glazed_terracotta.png"
    ]
  },
  {
    "id": 449,
    "name": "Light Gray Shulker Box",
    "category": "colored",
    "side": 519,
    "top": 519,
    "bottom": 519,
    "solid": 1,
    "textureFiles": [
      "light_gray_shulker_box.png"
    ]
  },
  {
    "id": 450,
    "name": "Light Gray Stained Glass",
    "category": "colored",
    "side": 520,
    "top": 520,
    "bottom": 520,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "light_gray_stained_glass.png"
    ]
  },
  {
    "id": 451,
    "name": "Light Gray Stained Glass Pane",
    "category": "colored",
    "side": 520,
    "top": 521,
    "bottom": 521,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "light_gray_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 452,
    "name": "Light Gray Terracotta",
    "category": "colored",
    "side": 522,
    "top": 522,
    "bottom": 522,
    "solid": 1,
    "textureFiles": [
      "light_gray_terracotta.png"
    ]
  },
  {
    "id": 453,
    "name": "Light Gray Wool",
    "category": "colored",
    "side": 523,
    "top": 523,
    "bottom": 523,
    "solid": 1,
    "textureFiles": [
      "light_gray_wool.png"
    ]
  },
  {
    "id": 454,
    "name": "Lightning Rod",
    "category": "building",
    "side": 524,
    "top": 524,
    "bottom": 524,
    "solid": 1,
    "textureFiles": [
      "lightning_rod.png",
      "lightning_rod_on.png"
    ]
  },
  {
    "id": 455,
    "name": "Lilac",
    "category": "building",
    "side": 526,
    "top": 527,
    "bottom": 526,
    "solid": 1,
    "textureFiles": [
      "lilac_bottom.png",
      "lilac_top.png"
    ]
  },
  {
    "id": 456,
    "name": "Lily Of The Valley",
    "category": "decoration",
    "side": 528,
    "top": 528,
    "bottom": 528,
    "solid": 1,
    "textureFiles": [
      "lily_of_the_valley.png"
    ]
  },
  {
    "id": 457,
    "name": "Lily Pad",
    "category": "decoration",
    "side": 529,
    "top": 529,
    "bottom": 529,
    "solid": 1,
    "textureFiles": [
      "lily_pad.png"
    ]
  },
  {
    "id": 458,
    "name": "Lime Candle",
    "category": "colored",
    "side": 530,
    "top": 530,
    "bottom": 530,
    "solid": 1,
    "textureFiles": [
      "lime_candle.png",
      "lime_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 459,
    "name": "Lime Concrete",
    "category": "colored",
    "side": 532,
    "top": 532,
    "bottom": 532,
    "solid": 1,
    "textureFiles": [
      "lime_concrete.png"
    ]
  },
  {
    "id": 460,
    "name": "Lime Concrete Powder",
    "category": "colored",
    "side": 533,
    "top": 533,
    "bottom": 533,
    "solid": 1,
    "textureFiles": [
      "lime_concrete_powder.png"
    ]
  },
  {
    "id": 461,
    "name": "Lime Glazed Terracotta",
    "category": "colored",
    "side": 534,
    "top": 534,
    "bottom": 534,
    "solid": 1,
    "textureFiles": [
      "lime_glazed_terracotta.png"
    ]
  },
  {
    "id": 462,
    "name": "Lime Shulker Box",
    "category": "colored",
    "side": 535,
    "top": 535,
    "bottom": 535,
    "solid": 1,
    "textureFiles": [
      "lime_shulker_box.png"
    ]
  },
  {
    "id": 463,
    "name": "Lime Stained Glass",
    "category": "colored",
    "side": 536,
    "top": 536,
    "bottom": 536,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "lime_stained_glass.png"
    ]
  },
  {
    "id": 464,
    "name": "Lime Stained Glass Pane",
    "category": "colored",
    "side": 536,
    "top": 537,
    "bottom": 537,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "lime_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 465,
    "name": "Lime Terracotta",
    "category": "colored",
    "side": 538,
    "top": 538,
    "bottom": 538,
    "solid": 1,
    "textureFiles": [
      "lime_terracotta.png"
    ]
  },
  {
    "id": 466,
    "name": "Lime Wool",
    "category": "colored",
    "side": 539,
    "top": 539,
    "bottom": 539,
    "solid": 1,
    "textureFiles": [
      "lime_wool.png"
    ]
  },
  {
    "id": 467,
    "name": "Lodestone",
    "category": "building",
    "side": 540,
    "top": 541,
    "bottom": 541,
    "solid": 1,
    "textureFiles": [
      "lodestone_side.png",
      "lodestone_top.png"
    ]
  },
  {
    "id": 468,
    "name": "Loom",
    "category": "building",
    "side": 544,
    "top": 545,
    "bottom": 542,
    "solid": 1,
    "textureFiles": [
      "loom_bottom.png",
      "loom_front.png",
      "loom_side.png",
      "loom_top.png"
    ]
  },
  {
    "id": 469,
    "name": "Magenta Candle",
    "category": "colored",
    "side": 546,
    "top": 546,
    "bottom": 546,
    "solid": 1,
    "textureFiles": [
      "magenta_candle.png",
      "magenta_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 470,
    "name": "Magenta Concrete",
    "category": "colored",
    "side": 548,
    "top": 548,
    "bottom": 548,
    "solid": 1,
    "textureFiles": [
      "magenta_concrete.png"
    ]
  },
  {
    "id": 471,
    "name": "Magenta Concrete Powder",
    "category": "colored",
    "side": 549,
    "top": 549,
    "bottom": 549,
    "solid": 1,
    "textureFiles": [
      "magenta_concrete_powder.png"
    ]
  },
  {
    "id": 472,
    "name": "Magenta Glazed Terracotta",
    "category": "colored",
    "side": 550,
    "top": 550,
    "bottom": 550,
    "solid": 1,
    "textureFiles": [
      "magenta_glazed_terracotta.png"
    ]
  },
  {
    "id": 473,
    "name": "Magenta Shulker Box",
    "category": "colored",
    "side": 551,
    "top": 551,
    "bottom": 551,
    "solid": 1,
    "textureFiles": [
      "magenta_shulker_box.png"
    ]
  },
  {
    "id": 474,
    "name": "Magenta Stained Glass",
    "category": "colored",
    "side": 552,
    "top": 552,
    "bottom": 552,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "magenta_stained_glass.png"
    ]
  },
  {
    "id": 475,
    "name": "Magenta Stained Glass Pane",
    "category": "colored",
    "side": 552,
    "top": 553,
    "bottom": 553,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "magenta_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 476,
    "name": "Magenta Terracotta",
    "category": "colored",
    "side": 554,
    "top": 554,
    "bottom": 554,
    "solid": 1,
    "textureFiles": [
      "magenta_terracotta.png"
    ]
  },
  {
    "id": 477,
    "name": "Magenta Wool",
    "category": "colored",
    "side": 555,
    "top": 555,
    "bottom": 555,
    "solid": 1,
    "textureFiles": [
      "magenta_wool.png"
    ]
  },
  {
    "id": 478,
    "name": "Magma",
    "category": "building",
    "side": 102,
    "top": 102,
    "bottom": 102,
    "solid": 1,
    "textureFiles": [
      "magma.png"
    ],
    "animated": {
      "frames": 3,
      "frametime": 8,
      "interpolate": true,
      "frameOrder": [
        0,
        1,
        2
      ]
    }
  },
  {
    "id": 479,
    "name": "Mangrove Door",
    "category": "redstone",
    "side": 556,
    "top": 557,
    "bottom": 556,
    "solid": 1,
    "textureFiles": [
      "mangrove_door_bottom.png",
      "mangrove_door_top.png"
    ]
  },
  {
    "id": 480,
    "name": "Mangrove Leaves",
    "category": "decoration",
    "side": 118,
    "top": 118,
    "bottom": 118,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "mangrove_leaves.png"
    ]
  },
  {
    "id": 481,
    "name": "Mangrove Log",
    "category": "wood",
    "side": 126,
    "top": 127,
    "bottom": 127,
    "solid": 1,
    "textureFiles": [
      "mangrove_log.png",
      "mangrove_log_top.png"
    ]
  },
  {
    "id": 482,
    "name": "Mangrove Planks",
    "category": "building",
    "side": 558,
    "top": 558,
    "bottom": 558,
    "solid": 1,
    "textureFiles": [
      "mangrove_planks.png"
    ]
  },
  {
    "id": 483,
    "name": "Mangrove Propagule",
    "category": "building",
    "side": 559,
    "top": 559,
    "bottom": 559,
    "solid": 1,
    "textureFiles": [
      "mangrove_propagule.png",
      "mangrove_propagule_hanging.png"
    ]
  },
  {
    "id": 484,
    "name": "Mangrove Roots",
    "category": "building",
    "side": 561,
    "top": 562,
    "bottom": 562,
    "solid": 1,
    "textureFiles": [
      "mangrove_roots_side.png",
      "mangrove_roots_top.png"
    ]
  },
  {
    "id": 485,
    "name": "Mangrove Trapdoor",
    "category": "redstone",
    "side": 563,
    "top": 563,
    "bottom": 563,
    "solid": 1,
    "textureFiles": [
      "mangrove_trapdoor.png"
    ]
  },
  {
    "id": 486,
    "name": "Medium Amethyst Bud",
    "category": "natural",
    "side": 564,
    "top": 564,
    "bottom": 564,
    "solid": 1,
    "textureFiles": [
      "medium_amethyst_bud.png"
    ],
    "light": 1,
    "lightDist": 2,
    "lightCol": 13404415
  },
  {
    "id": 487,
    "name": "Melon",
    "category": "building",
    "side": 565,
    "top": 567,
    "bottom": 567,
    "solid": 1,
    "textureFiles": [
      "melon_side.png",
      "melon_stem.png",
      "melon_top.png"
    ]
  },
  {
    "id": 488,
    "name": "Moss Block",
    "category": "building",
    "side": 568,
    "top": 568,
    "bottom": 568,
    "solid": 1,
    "textureFiles": [
      "moss_block.png"
    ]
  },
  {
    "id": 489,
    "name": "Mossy Stone Bricks",
    "category": "building",
    "side": 569,
    "top": 569,
    "bottom": 569,
    "solid": 1,
    "textureFiles": [
      "mossy_stone_bricks.png"
    ]
  },
  {
    "id": 490,
    "name": "Mud",
    "category": "building",
    "side": 570,
    "top": 570,
    "bottom": 570,
    "solid": 1,
    "textureFiles": [
      "mud.png"
    ]
  },
  {
    "id": 491,
    "name": "Mud Bricks",
    "category": "building",
    "side": 571,
    "top": 571,
    "bottom": 571,
    "solid": 1,
    "textureFiles": [
      "mud_bricks.png"
    ]
  },
  {
    "id": 492,
    "name": "Muddy Mangrove Roots",
    "category": "building",
    "side": 572,
    "top": 573,
    "bottom": 573,
    "solid": 1,
    "textureFiles": [
      "muddy_mangrove_roots_side.png",
      "muddy_mangrove_roots_top.png"
    ]
  },
  {
    "id": 493,
    "name": "Mushroom Block Inside",
    "category": "building",
    "side": 574,
    "top": 574,
    "bottom": 574,
    "solid": 1,
    "textureFiles": [
      "mushroom_block_inside.png"
    ]
  },
  {
    "id": 494,
    "name": "Mushroom",
    "category": "building",
    "side": 575,
    "top": 575,
    "bottom": 575,
    "solid": 1,
    "textureFiles": [
      "mushroom_stem.png"
    ]
  },
  {
    "id": 495,
    "name": "Mycelium",
    "category": "natural",
    "side": 576,
    "top": 577,
    "bottom": 577,
    "solid": 1,
    "textureFiles": [
      "mycelium_side.png",
      "mycelium_top.png"
    ]
  },
  {
    "id": 496,
    "name": "Nether Gold Ore",
    "category": "natural",
    "side": 578,
    "top": 578,
    "bottom": 578,
    "solid": 1,
    "textureFiles": [
      "nether_gold_ore.png"
    ]
  },
  {
    "id": 497,
    "name": "Nether Quartz Ore",
    "category": "natural",
    "side": 579,
    "top": 579,
    "bottom": 579,
    "solid": 1,
    "textureFiles": [
      "nether_quartz_ore.png"
    ]
  },
  {
    "id": 498,
    "name": "Nether Sprouts",
    "category": "building",
    "side": 580,
    "top": 580,
    "bottom": 580,
    "solid": 1,
    "textureFiles": [
      "nether_sprouts.png"
    ]
  },
  {
    "id": 499,
    "name": "Nether Wart Block",
    "category": "building",
    "side": 581,
    "top": 581,
    "bottom": 581,
    "solid": 1,
    "textureFiles": [
      "nether_wart_block.png"
    ]
  },
  {
    "id": 500,
    "name": "Nether Wart",
    "category": "building",
    "side": 581,
    "top": 581,
    "bottom": 581,
    "solid": 1,
    "textureFiles": [
      "nether_wart_stage0.png",
      "nether_wart_stage1.png",
      "nether_wart_stage2.png"
    ]
  },
  {
    "id": 501,
    "name": "Netherite Block",
    "category": "building",
    "side": 585,
    "top": 585,
    "bottom": 585,
    "solid": 1,
    "textureFiles": [
      "netherite_block.png"
    ]
  },
  {
    "id": 502,
    "name": "Note Block",
    "category": "building",
    "side": 586,
    "top": 586,
    "bottom": 586,
    "solid": 1,
    "textureFiles": [
      "note_block.png"
    ]
  },
  {
    "id": 503,
    "name": "Oak Door",
    "category": "redstone",
    "side": 107,
    "top": 106,
    "bottom": 107,
    "solid": 1,
    "textureFiles": [
      "oak_door_bottom.png",
      "oak_door_top.png"
    ]
  },
  {
    "id": 504,
    "name": "Oak Sapling",
    "category": "decoration",
    "side": 587,
    "top": 587,
    "bottom": 587,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "oak_sapling.png"
    ]
  },
  {
    "id": 505,
    "name": "Oak Trapdoor",
    "category": "redstone",
    "side": 108,
    "top": 108,
    "bottom": 108,
    "solid": 1,
    "textureFiles": [
      "oak_trapdoor.png"
    ]
  },
  {
    "id": 506,
    "name": "Observer",
    "category": "redstone",
    "side": 591,
    "top": 592,
    "bottom": 592,
    "solid": 1,
    "textureFiles": [
      "observer_back.png",
      "observer_front.png",
      "observer_side.png",
      "observer_top.png"
    ]
  },
  {
    "id": 507,
    "name": "Observer Back",
    "category": "redstone",
    "side": 588,
    "top": 588,
    "bottom": 588,
    "solid": 1,
    "textureFiles": [
      "observer_back_on.png"
    ]
  },
  {
    "id": 508,
    "name": "Orange Candle",
    "category": "colored",
    "side": 594,
    "top": 594,
    "bottom": 594,
    "solid": 1,
    "textureFiles": [
      "orange_candle.png",
      "orange_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 509,
    "name": "Orange Concrete",
    "category": "colored",
    "side": 596,
    "top": 596,
    "bottom": 596,
    "solid": 1,
    "textureFiles": [
      "orange_concrete.png"
    ]
  },
  {
    "id": 510,
    "name": "Orange Concrete Powder",
    "category": "colored",
    "side": 597,
    "top": 597,
    "bottom": 597,
    "solid": 1,
    "textureFiles": [
      "orange_concrete_powder.png"
    ]
  },
  {
    "id": 511,
    "name": "Orange Glazed Terracotta",
    "category": "colored",
    "side": 598,
    "top": 598,
    "bottom": 598,
    "solid": 1,
    "textureFiles": [
      "orange_glazed_terracotta.png"
    ]
  },
  {
    "id": 512,
    "name": "Orange Shulker Box",
    "category": "colored",
    "side": 599,
    "top": 599,
    "bottom": 599,
    "solid": 1,
    "textureFiles": [
      "orange_shulker_box.png"
    ]
  },
  {
    "id": 513,
    "name": "Orange Stained Glass",
    "category": "colored",
    "side": 600,
    "top": 600,
    "bottom": 600,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "orange_stained_glass.png"
    ]
  },
  {
    "id": 514,
    "name": "Orange Stained Glass Pane",
    "category": "colored",
    "side": 600,
    "top": 601,
    "bottom": 601,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "orange_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 515,
    "name": "Orange Terracotta",
    "category": "colored",
    "side": 602,
    "top": 602,
    "bottom": 602,
    "solid": 1,
    "textureFiles": [
      "orange_terracotta.png"
    ]
  },
  {
    "id": 516,
    "name": "Orange Tulip",
    "category": "decoration",
    "side": 603,
    "top": 603,
    "bottom": 603,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "orange_tulip.png"
    ]
  },
  {
    "id": 517,
    "name": "Oxeye Daisy",
    "category": "decoration",
    "side": 604,
    "top": 604,
    "bottom": 604,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "oxeye_daisy.png"
    ]
  },
  {
    "id": 518,
    "name": "Oxidized Copper",
    "category": "building",
    "side": 605,
    "top": 605,
    "bottom": 605,
    "solid": 1,
    "textureFiles": [
      "oxidized_copper.png"
    ]
  },
  {
    "id": 519,
    "name": "Oxidized Cut Copper",
    "category": "building",
    "side": 606,
    "top": 606,
    "bottom": 606,
    "solid": 1,
    "textureFiles": [
      "oxidized_cut_copper.png"
    ]
  },
  {
    "id": 520,
    "name": "Packed Mud",
    "category": "building",
    "side": 607,
    "top": 607,
    "bottom": 607,
    "solid": 1,
    "textureFiles": [
      "packed_mud.png"
    ]
  },
  {
    "id": 521,
    "name": "Peony",
    "category": "building",
    "side": 609,
    "top": 610,
    "bottom": 609,
    "solid": 1,
    "textureFiles": [
      "peony_bottom.png",
      "peony_top.png"
    ]
  },
  {
    "id": 522,
    "name": "Pink Candle",
    "category": "colored",
    "side": 611,
    "top": 611,
    "bottom": 611,
    "solid": 1,
    "textureFiles": [
      "pink_candle.png",
      "pink_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 523,
    "name": "Pink Concrete",
    "category": "colored",
    "side": 613,
    "top": 613,
    "bottom": 613,
    "solid": 1,
    "textureFiles": [
      "pink_concrete.png"
    ]
  },
  {
    "id": 524,
    "name": "Pink Concrete Powder",
    "category": "colored",
    "side": 614,
    "top": 614,
    "bottom": 614,
    "solid": 1,
    "textureFiles": [
      "pink_concrete_powder.png"
    ]
  },
  {
    "id": 525,
    "name": "Pink Glazed Terracotta",
    "category": "colored",
    "side": 615,
    "top": 615,
    "bottom": 615,
    "solid": 1,
    "textureFiles": [
      "pink_glazed_terracotta.png"
    ]
  },
  {
    "id": 526,
    "name": "Pink Shulker Box",
    "category": "colored",
    "side": 616,
    "top": 616,
    "bottom": 616,
    "solid": 1,
    "textureFiles": [
      "pink_shulker_box.png"
    ]
  },
  {
    "id": 527,
    "name": "Pink Stained Glass",
    "category": "colored",
    "side": 617,
    "top": 617,
    "bottom": 617,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "pink_stained_glass.png"
    ]
  },
  {
    "id": 528,
    "name": "Pink Stained Glass Pane",
    "category": "colored",
    "side": 617,
    "top": 618,
    "bottom": 618,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "pink_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 529,
    "name": "Pink Terracotta",
    "category": "colored",
    "side": 619,
    "top": 619,
    "bottom": 619,
    "solid": 1,
    "textureFiles": [
      "pink_terracotta.png"
    ]
  },
  {
    "id": 530,
    "name": "Pink Tulip",
    "category": "decoration",
    "side": 620,
    "top": 620,
    "bottom": 620,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "pink_tulip.png"
    ]
  },
  {
    "id": 531,
    "name": "Pink Wool",
    "category": "colored",
    "side": 621,
    "top": 621,
    "bottom": 621,
    "solid": 1,
    "textureFiles": [
      "pink_wool.png"
    ]
  },
  {
    "id": 532,
    "name": "Piston",
    "category": "redstone",
    "side": 624,
    "top": 625,
    "bottom": 622,
    "solid": 1,
    "textureFiles": [
      "piston_bottom.png",
      "piston_inner.png",
      "piston_side.png",
      "piston_top.png"
    ]
  },
  {
    "id": 533,
    "name": "Piston Top Sticky",
    "category": "redstone",
    "side": 626,
    "top": 626,
    "bottom": 626,
    "solid": 1,
    "textureFiles": [
      "piston_top_sticky.png"
    ]
  },
  {
    "id": 534,
    "name": "Pointed Dripstone Down Base",
    "category": "natural",
    "side": 627,
    "top": 627,
    "bottom": 627,
    "solid": 1,
    "textureFiles": [
      "pointed_dripstone_down_base.png"
    ]
  },
  {
    "id": 535,
    "name": "Pointed Dripstone Down Frustum",
    "category": "natural",
    "side": 628,
    "top": 628,
    "bottom": 628,
    "solid": 1,
    "textureFiles": [
      "pointed_dripstone_down_frustum.png"
    ]
  },
  {
    "id": 536,
    "name": "Pointed Dripstone Down",
    "category": "natural",
    "side": 627,
    "top": 627,
    "bottom": 627,
    "solid": 1,
    "textureFiles": [
      "pointed_dripstone_down_middle.png"
    ]
  },
  {
    "id": 537,
    "name": "Pointed Dripstone Down Tip",
    "category": "natural",
    "side": 630,
    "top": 630,
    "bottom": 630,
    "solid": 1,
    "textureFiles": [
      "pointed_dripstone_down_tip.png"
    ]
  },
  {
    "id": 538,
    "name": "Pointed Dripstone Down Tip Merge",
    "category": "natural",
    "side": 631,
    "top": 631,
    "bottom": 631,
    "solid": 1,
    "textureFiles": [
      "pointed_dripstone_down_tip_merge.png"
    ]
  },
  {
    "id": 539,
    "name": "Pointed Dripstone Up Base",
    "category": "natural",
    "side": 632,
    "top": 632,
    "bottom": 632,
    "solid": 1,
    "textureFiles": [
      "pointed_dripstone_up_base.png"
    ]
  },
  {
    "id": 540,
    "name": "Pointed Dripstone Up Frustum",
    "category": "natural",
    "side": 633,
    "top": 633,
    "bottom": 633,
    "solid": 1,
    "textureFiles": [
      "pointed_dripstone_up_frustum.png"
    ]
  },
  {
    "id": 541,
    "name": "Pointed Dripstone Up",
    "category": "natural",
    "side": 632,
    "top": 632,
    "bottom": 632,
    "solid": 1,
    "textureFiles": [
      "pointed_dripstone_up_middle.png"
    ]
  },
  {
    "id": 542,
    "name": "Pointed Dripstone Up Tip",
    "category": "natural",
    "side": 635,
    "top": 635,
    "bottom": 635,
    "solid": 1,
    "textureFiles": [
      "pointed_dripstone_up_tip.png"
    ]
  },
  {
    "id": 543,
    "name": "Pointed Dripstone Up Tip Merge",
    "category": "natural",
    "side": 636,
    "top": 636,
    "bottom": 636,
    "solid": 1,
    "textureFiles": [
      "pointed_dripstone_up_tip_merge.png"
    ]
  },
  {
    "id": 544,
    "name": "Polished Andesite",
    "category": "building",
    "side": 637,
    "top": 637,
    "bottom": 637,
    "solid": 1,
    "textureFiles": [
      "polished_andesite.png"
    ]
  },
  {
    "id": 545,
    "name": "Polished Basalt",
    "category": "natural",
    "side": 638,
    "top": 639,
    "bottom": 639,
    "solid": 1,
    "textureFiles": [
      "polished_basalt_side.png",
      "polished_basalt_top.png"
    ]
  },
  {
    "id": 546,
    "name": "Polished Blackstone",
    "category": "natural",
    "side": 640,
    "top": 640,
    "bottom": 640,
    "solid": 1,
    "textureFiles": [
      "polished_blackstone.png"
    ]
  },
  {
    "id": 547,
    "name": "Polished Blackstone Bricks",
    "category": "natural",
    "side": 641,
    "top": 641,
    "bottom": 641,
    "solid": 1,
    "textureFiles": [
      "polished_blackstone_bricks.png"
    ]
  },
  {
    "id": 548,
    "name": "Polished Deepslate",
    "category": "building",
    "side": 642,
    "top": 642,
    "bottom": 642,
    "solid": 1,
    "textureFiles": [
      "polished_deepslate.png"
    ]
  },
  {
    "id": 549,
    "name": "Polished Diorite",
    "category": "building",
    "side": 643,
    "top": 643,
    "bottom": 643,
    "solid": 1,
    "textureFiles": [
      "polished_diorite.png"
    ]
  },
  {
    "id": 550,
    "name": "Polished Granite",
    "category": "building",
    "side": 644,
    "top": 644,
    "bottom": 644,
    "solid": 1,
    "textureFiles": [
      "polished_granite.png"
    ]
  },
  {
    "id": 551,
    "name": "Potatoes",
    "category": "decoration",
    "side": 645,
    "top": 645,
    "bottom": 645,
    "solid": 1,
    "textureFiles": [
      "potatoes_stage0.png",
      "potatoes_stage1.png",
      "potatoes_stage2.png",
      "potatoes_stage3.png"
    ]
  },
  {
    "id": 552,
    "name": "Potted Azalea Bush Plant",
    "category": "decoration",
    "side": 649,
    "top": 649,
    "bottom": 649,
    "solid": 1,
    "textureFiles": [
      "potted_azalea_bush_plant.png"
    ]
  },
  {
    "id": 553,
    "name": "Potted Azalea Bush",
    "category": "decoration",
    "side": 650,
    "top": 651,
    "bottom": 651,
    "solid": 1,
    "textureFiles": [
      "potted_azalea_bush_side.png",
      "potted_azalea_bush_top.png"
    ]
  },
  {
    "id": 554,
    "name": "Potted Flowering Azalea Bush Plant",
    "category": "decoration",
    "side": 652,
    "top": 652,
    "bottom": 652,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "potted_flowering_azalea_bush_plant.png"
    ]
  },
  {
    "id": 555,
    "name": "Potted Flowering Azalea Bush",
    "category": "decoration",
    "side": 653,
    "top": 654,
    "bottom": 654,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "potted_flowering_azalea_bush_side.png",
      "potted_flowering_azalea_bush_top.png"
    ]
  },
  {
    "id": 556,
    "name": "Powder Snow",
    "category": "natural",
    "side": 655,
    "top": 655,
    "bottom": 655,
    "solid": 1,
    "textureFiles": [
      "powder_snow.png"
    ]
  },
  {
    "id": 557,
    "name": "Powered Rail",
    "category": "transportation",
    "side": 656,
    "top": 656,
    "bottom": 656,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "powered_rail.png",
      "powered_rail_on.png"
    ]
  },
  {
    "id": 558,
    "name": "Prismarine Bricks",
    "category": "building",
    "side": 658,
    "top": 658,
    "bottom": 658,
    "solid": 1,
    "textureFiles": [
      "prismarine_bricks.png"
    ]
  },
  {
    "id": 559,
    "name": "Pumpkin",
    "category": "building",
    "side": 659,
    "top": 661,
    "bottom": 661,
    "solid": 1,
    "textureFiles": [
      "pumpkin_side.png",
      "pumpkin_stem.png",
      "pumpkin_top.png"
    ]
  },
  {
    "id": 560,
    "name": "Purple Candle",
    "category": "colored",
    "side": 662,
    "top": 662,
    "bottom": 662,
    "solid": 1,
    "textureFiles": [
      "purple_candle.png",
      "purple_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 561,
    "name": "Purple Concrete",
    "category": "colored",
    "side": 664,
    "top": 664,
    "bottom": 664,
    "solid": 1,
    "textureFiles": [
      "purple_concrete.png"
    ]
  },
  {
    "id": 562,
    "name": "Purple Concrete Powder",
    "category": "colored",
    "side": 665,
    "top": 665,
    "bottom": 665,
    "solid": 1,
    "textureFiles": [
      "purple_concrete_powder.png"
    ]
  },
  {
    "id": 563,
    "name": "Purple Glazed Terracotta",
    "category": "colored",
    "side": 666,
    "top": 666,
    "bottom": 666,
    "solid": 1,
    "textureFiles": [
      "purple_glazed_terracotta.png"
    ]
  },
  {
    "id": 564,
    "name": "Purple Shulker Box",
    "category": "colored",
    "side": 667,
    "top": 667,
    "bottom": 667,
    "solid": 1,
    "textureFiles": [
      "purple_shulker_box.png"
    ]
  },
  {
    "id": 565,
    "name": "Purple Stained Glass",
    "category": "colored",
    "side": 668,
    "top": 668,
    "bottom": 668,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "purple_stained_glass.png"
    ]
  },
  {
    "id": 566,
    "name": "Purple Stained Glass Pane",
    "category": "colored",
    "side": 668,
    "top": 669,
    "bottom": 669,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "purple_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 567,
    "name": "Purple Terracotta",
    "category": "colored",
    "side": 670,
    "top": 670,
    "bottom": 670,
    "solid": 1,
    "textureFiles": [
      "purple_terracotta.png"
    ]
  },
  {
    "id": 568,
    "name": "Purpur Pillar",
    "category": "building",
    "side": 671,
    "top": 672,
    "bottom": 672,
    "solid": 1,
    "textureFiles": [
      "purpur_pillar.png",
      "purpur_pillar_top.png"
    ]
  },
  {
    "id": 569,
    "name": "Quartz Block",
    "category": "building",
    "side": 674,
    "top": 675,
    "bottom": 673,
    "solid": 1,
    "textureFiles": [
      "quartz_block_bottom.png",
      "quartz_block_side.png",
      "quartz_block_top.png"
    ]
  },
  {
    "id": 570,
    "name": "Quartz Bricks",
    "category": "building",
    "side": 676,
    "top": 676,
    "bottom": 676,
    "solid": 1,
    "textureFiles": [
      "quartz_bricks.png"
    ]
  },
  {
    "id": 571,
    "name": "Quartz Pillar",
    "category": "building",
    "side": 677,
    "top": 678,
    "bottom": 678,
    "solid": 1,
    "textureFiles": [
      "quartz_pillar.png",
      "quartz_pillar_top.png"
    ]
  },
  {
    "id": 572,
    "name": "Rail",
    "category": "transportation",
    "side": 679,
    "top": 679,
    "bottom": 679,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "rail.png"
    ]
  },
  {
    "id": 573,
    "name": "Rail Corner",
    "category": "transportation",
    "side": 680,
    "top": 680,
    "bottom": 680,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "rail_corner.png"
    ]
  },
  {
    "id": 574,
    "name": "Raw Copper Block",
    "category": "natural",
    "side": 681,
    "top": 681,
    "bottom": 681,
    "solid": 1,
    "textureFiles": [
      "raw_copper_block.png"
    ]
  },
  {
    "id": 575,
    "name": "Raw Gold Block",
    "category": "natural",
    "side": 682,
    "top": 682,
    "bottom": 682,
    "solid": 1,
    "textureFiles": [
      "raw_gold_block.png"
    ]
  },
  {
    "id": 576,
    "name": "Raw Iron Block",
    "category": "natural",
    "side": 683,
    "top": 683,
    "bottom": 683,
    "solid": 1,
    "textureFiles": [
      "raw_iron_block.png"
    ]
  },
  {
    "id": 577,
    "name": "Red Candle",
    "category": "colored",
    "side": 684,
    "top": 684,
    "bottom": 684,
    "solid": 1,
    "textureFiles": [
      "red_candle.png",
      "red_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 578,
    "name": "Red Concrete",
    "category": "colored",
    "side": 686,
    "top": 686,
    "bottom": 686,
    "solid": 1,
    "textureFiles": [
      "red_concrete.png"
    ]
  },
  {
    "id": 579,
    "name": "Red Concrete Powder",
    "category": "colored",
    "side": 687,
    "top": 687,
    "bottom": 687,
    "solid": 1,
    "textureFiles": [
      "red_concrete_powder.png"
    ]
  },
  {
    "id": 580,
    "name": "Red Glazed Terracotta",
    "category": "colored",
    "side": 688,
    "top": 688,
    "bottom": 688,
    "solid": 1,
    "textureFiles": [
      "red_glazed_terracotta.png"
    ]
  },
  {
    "id": 581,
    "name": "Red Mushroom",
    "category": "building",
    "side": 689,
    "top": 689,
    "bottom": 689,
    "solid": 1,
    "textureFiles": [
      "red_mushroom.png"
    ]
  },
  {
    "id": 582,
    "name": "Red Mushroom Block",
    "category": "building",
    "side": 690,
    "top": 690,
    "bottom": 690,
    "solid": 1,
    "textureFiles": [
      "red_mushroom_block.png"
    ]
  },
  {
    "id": 583,
    "name": "Red Nether Bricks",
    "category": "building",
    "side": 691,
    "top": 691,
    "bottom": 691,
    "solid": 1,
    "textureFiles": [
      "red_nether_bricks.png"
    ]
  },
  {
    "id": 584,
    "name": "Red Sand",
    "category": "natural",
    "side": 692,
    "top": 692,
    "bottom": 692,
    "solid": 1,
    "textureFiles": [
      "red_sand.png"
    ]
  },
  {
    "id": 585,
    "name": "Red Sandstone",
    "category": "natural",
    "side": 693,
    "top": 695,
    "bottom": 694,
    "solid": 1,
    "textureFiles": [
      "red_sandstone.png",
      "red_sandstone_bottom.png",
      "red_sandstone_top.png"
    ]
  },
  {
    "id": 586,
    "name": "Red Shulker Box",
    "category": "colored",
    "side": 696,
    "top": 696,
    "bottom": 696,
    "solid": 1,
    "textureFiles": [
      "red_shulker_box.png"
    ]
  },
  {
    "id": 587,
    "name": "Red Stained Glass",
    "category": "colored",
    "side": 697,
    "top": 697,
    "bottom": 697,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "red_stained_glass.png"
    ]
  },
  {
    "id": 588,
    "name": "Red Stained Glass Pane",
    "category": "colored",
    "side": 697,
    "top": 698,
    "bottom": 698,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "red_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 589,
    "name": "Red Terracotta",
    "category": "colored",
    "side": 699,
    "top": 699,
    "bottom": 699,
    "solid": 1,
    "textureFiles": [
      "red_terracotta.png"
    ]
  },
  {
    "id": 590,
    "name": "Red Tulip",
    "category": "decoration",
    "side": 700,
    "top": 700,
    "bottom": 700,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "red_tulip.png"
    ]
  },
  {
    "id": 591,
    "name": "Redstone Block",
    "category": "redstone",
    "side": 701,
    "top": 701,
    "bottom": 701,
    "solid": 1,
    "textureFiles": [
      "redstone_block.png"
    ]
  },
  {
    "id": 592,
    "name": "Redstone Dust Dot",
    "category": "redstone",
    "side": 702,
    "top": 702,
    "bottom": 702,
    "solid": 1,
    "textureFiles": [
      "redstone_dust_dot.png"
    ]
  },
  {
    "id": 593,
    "name": "Redstone Dust Line0",
    "category": "redstone",
    "side": 703,
    "top": 703,
    "bottom": 703,
    "solid": 1,
    "textureFiles": [
      "redstone_dust_line0.png"
    ]
  },
  {
    "id": 594,
    "name": "Redstone Dust Line1",
    "category": "redstone",
    "side": 704,
    "top": 704,
    "bottom": 704,
    "solid": 1,
    "textureFiles": [
      "redstone_dust_line1.png"
    ]
  },
  {
    "id": 595,
    "name": "Redstone Dust Overlay",
    "category": "redstone",
    "side": 702,
    "top": 702,
    "bottom": 702,
    "solid": 1,
    "textureFiles": [
      "redstone_dust_overlay.png"
    ]
  },
  {
    "id": 596,
    "name": "Redstone Lamp",
    "category": "redstone",
    "side": 84,
    "top": 84,
    "bottom": 84,
    "solid": 1,
    "glow": 1,
    "textureFiles": [
      "redstone_lamp.png",
      "redstone_lamp_on.png"
    ]
  },
  {
    "id": 597,
    "name": "Reinforced Deepslate",
    "category": "building",
    "side": 708,
    "top": 709,
    "bottom": 707,
    "solid": 1,
    "textureFiles": [
      "reinforced_deepslate_bottom.png",
      "reinforced_deepslate_side.png",
      "reinforced_deepslate_top.png"
    ]
  },
  {
    "id": 598,
    "name": "Repeater",
    "category": "redstone",
    "side": 710,
    "top": 710,
    "bottom": 710,
    "solid": 1,
    "textureFiles": [
      "repeater.png",
      "repeater_on.png"
    ]
  },
  {
    "id": 599,
    "name": "Repeating Command Block",
    "category": "building",
    "side": 715,
    "top": 715,
    "bottom": 715,
    "solid": 1,
    "textureFiles": [
      "repeating_command_block_back.png",
      "repeating_command_block_front.png",
      "repeating_command_block_side.png"
    ],
    "animated": {
      "frames": 4,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 600,
    "name": "Repeating Command Block Conditional",
    "category": "building",
    "side": 713,
    "top": 713,
    "bottom": 713,
    "solid": 1,
    "textureFiles": [
      "repeating_command_block_conditional.png"
    ],
    "animated": {
      "frames": 4,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 601,
    "name": "Respawn Anchor",
    "category": "building",
    "side": 720,
    "top": 722,
    "bottom": 716,
    "solid": 1,
    "textureFiles": [
      "respawn_anchor_bottom.png",
      "respawn_anchor_side0.png",
      "respawn_anchor_side1.png",
      "respawn_anchor_side2.png",
      "respawn_anchor_side3.png",
      "respawn_anchor_top.png"
    ],
    "animated": {
      "frames": 32,
      "frametime": 1,
      "interpolate": false
    },
    "light": 1,
    "lightDist": 12
  },
  {
    "id": 602,
    "name": "Respawn Anchor Side4",
    "category": "building",
    "side": 721,
    "top": 721,
    "bottom": 721,
    "solid": 1,
    "textureFiles": [
      "respawn_anchor_side4.png"
    ],
    "light": 1,
    "lightDist": 12
  },
  {
    "id": 603,
    "name": "Respawn Anchor Top",
    "category": "building",
    "side": 722,
    "top": 723,
    "bottom": 723,
    "solid": 1,
    "textureFiles": [
      "respawn_anchor_top_off.png"
    ],
    "animated": {
      "frames": 32,
      "frametime": 1,
      "interpolate": false
    },
    "light": 1,
    "lightDist": 12
  },
  {
    "id": 604,
    "name": "Rooted Dirt",
    "category": "natural",
    "side": 724,
    "top": 724,
    "bottom": 724,
    "solid": 1,
    "textureFiles": [
      "rooted_dirt.png"
    ]
  },
  {
    "id": 605,
    "name": "Rose Bush",
    "category": "decoration",
    "side": 725,
    "top": 726,
    "bottom": 725,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "rose_bush_bottom.png",
      "rose_bush_top.png"
    ]
  },
  {
    "id": 606,
    "name": "Scaffolding",
    "category": "building",
    "side": 729,
    "top": 730,
    "bottom": 728,
    "solid": 1,
    "textureFiles": [
      "scaffolding_bottom.png",
      "scaffolding_side.png",
      "scaffolding_top.png"
    ]
  },
  {
    "id": 607,
    "name": "Sculk",
    "category": "natural",
    "side": 731,
    "top": 731,
    "bottom": 731,
    "solid": 1,
    "textureFiles": [
      "sculk.png"
    ],
    "animated": {
      "frames": 4,
      "frametime": 20,
      "interpolate": true
    }
  },
  {
    "id": 608,
    "name": "Sculk Catalyst",
    "category": "natural",
    "side": 733,
    "top": 735,
    "bottom": 732,
    "solid": 1,
    "textureFiles": [
      "sculk_catalyst_bottom.png",
      "sculk_catalyst_side.png",
      "sculk_catalyst_top.png"
    ]
  },
  {
    "id": 609,
    "name": "Sculk Catalyst Side Bloom",
    "category": "natural",
    "side": 734,
    "top": 734,
    "bottom": 734,
    "solid": 1,
    "textureFiles": [
      "sculk_catalyst_side_bloom.png"
    ],
    "animated": {
      "frames": 8,
      "frametime": 1,
      "interpolate": false
    }
  },
  {
    "id": 610,
    "name": "Sculk Catalyst Top Bloom",
    "category": "natural",
    "side": 736,
    "top": 736,
    "bottom": 736,
    "solid": 1,
    "textureFiles": [
      "sculk_catalyst_top_bloom.png"
    ],
    "animated": {
      "frames": 8,
      "frametime": 1,
      "interpolate": false
    }
  },
  {
    "id": 611,
    "name": "Sculk Sensor",
    "category": "natural",
    "side": 738,
    "top": 741,
    "bottom": 737,
    "solid": 1,
    "textureFiles": [
      "sculk_sensor_bottom.png",
      "sculk_sensor_side.png",
      "sculk_sensor_top.png"
    ]
  },
  {
    "id": 612,
    "name": "Sculk Sensor Tendril Active",
    "category": "natural",
    "side": 739,
    "top": 739,
    "bottom": 739,
    "solid": 1,
    "textureFiles": [
      "sculk_sensor_tendril_active.png"
    ],
    "animated": {
      "frames": 16,
      "frametime": 1,
      "interpolate": false
    }
  },
  {
    "id": 613,
    "name": "Sculk Sensor Tendril Inactive",
    "category": "natural",
    "side": 740,
    "top": 740,
    "bottom": 740,
    "solid": 1,
    "textureFiles": [
      "sculk_sensor_tendril_inactive.png"
    ],
    "animated": {
      "frames": 16,
      "frametime": 2,
      "interpolate": false
    }
  },
  {
    "id": 614,
    "name": "Sculk Shrieker",
    "category": "natural",
    "side": 745,
    "top": 746,
    "bottom": 742,
    "solid": 1,
    "textureFiles": [
      "sculk_shrieker_bottom.png",
      "sculk_shrieker_side.png",
      "sculk_shrieker_top.png"
    ]
  },
  {
    "id": 615,
    "name": "Sculk Shrieker Can Summon Inner",
    "category": "natural",
    "side": 731,
    "top": 743,
    "bottom": 743,
    "solid": 1,
    "textureFiles": [
      "sculk_shrieker_can_summon_inner_top.png"
    ],
    "animated": {
      "frames": 10,
      "frametime": 3,
      "interpolate": true
    }
  },
  {
    "id": 616,
    "name": "Sculk Shrieker Inner",
    "category": "natural",
    "side": 744,
    "top": 744,
    "bottom": 744,
    "solid": 1,
    "textureFiles": [
      "sculk_shrieker_inner_top.png"
    ],
    "animated": {
      "frames": 10,
      "frametime": 6,
      "interpolate": true
    }
  },
  {
    "id": 617,
    "name": "Sculk Vein",
    "category": "natural",
    "side": 747,
    "top": 747,
    "bottom": 747,
    "solid": 1,
    "textureFiles": [
      "sculk_vein.png"
    ],
    "animated": {
      "frames": 4,
      "frametime": 20,
      "interpolate": true
    }
  },
  {
    "id": 618,
    "name": "Shulker Box",
    "category": "colored",
    "side": 748,
    "top": 748,
    "bottom": 748,
    "solid": 1,
    "textureFiles": [
      "shulker_box.png"
    ]
  },
  {
    "id": 619,
    "name": "Small Amethyst Bud",
    "category": "natural",
    "side": 749,
    "top": 749,
    "bottom": 749,
    "solid": 1,
    "textureFiles": [
      "small_amethyst_bud.png"
    ],
    "light": 1,
    "lightDist": 1,
    "lightCol": 13404415
  },
  {
    "id": 620,
    "name": "Small Dripleaf",
    "category": "building",
    "side": 750,
    "top": 753,
    "bottom": 753,
    "solid": 1,
    "textureFiles": [
      "small_dripleaf_side.png",
      "small_dripleaf_top.png"
    ]
  },
  {
    "id": 621,
    "name": "Small Dripleaf Stem",
    "category": "wood",
    "side": 751,
    "top": 752,
    "bottom": 751,
    "solid": 1,
    "textureFiles": [
      "small_dripleaf_stem_bottom.png",
      "small_dripleaf_stem_top.png"
    ]
  },
  {
    "id": 622,
    "name": "Smithing Table",
    "category": "decoration",
    "side": 756,
    "top": 757,
    "bottom": 754,
    "solid": 1,
    "textureFiles": [
      "smithing_table_bottom.png",
      "smithing_table_front.png",
      "smithing_table_side.png",
      "smithing_table_top.png"
    ]
  },
  {
    "id": 623,
    "name": "Smoker",
    "category": "building",
    "side": 761,
    "top": 762,
    "bottom": 758,
    "solid": 1,
    "textureFiles": [
      "smoker_bottom.png",
      "smoker_front.png",
      "smoker_side.png",
      "smoker_top.png"
    ],
    "animated": {
      "frames": 3,
      "frametime": 4,
      "interpolate": false
    }
  },
  {
    "id": 624,
    "name": "Smoker Front",
    "category": "building",
    "side": 759,
    "top": 759,
    "bottom": 759,
    "solid": 1,
    "textureFiles": [
      "smoker_front_on.png"
    ]
  },
  {
    "id": 625,
    "name": "Smooth Basalt",
    "category": "natural",
    "side": 763,
    "top": 763,
    "bottom": 763,
    "solid": 1,
    "textureFiles": [
      "smooth_basalt.png"
    ]
  },
  {
    "id": 626,
    "name": "Smooth Stone Slab",
    "category": "building",
    "side": 764,
    "top": 764,
    "bottom": 764,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "smooth_stone_slab_side.png"
    ]
  },
  {
    "id": 627,
    "name": "Snow",
    "category": "natural",
    "side": 20,
    "top": 20,
    "bottom": 20,
    "solid": 1,
    "textureFiles": [
      "snow.png"
    ]
  },
  {
    "id": 628,
    "name": "Soul Campfire Fire",
    "category": "decoration",
    "side": 89,
    "top": 89,
    "bottom": 89,
    "solid": 1,
    "textureFiles": [
      "soul_campfire_fire.png"
    ],
    "animated": {
      "frames": 8,
      "frametime": 2,
      "interpolate": false
    }
  },
  {
    "id": 629,
    "name": "Soul Campfire Log",
    "category": "decoration",
    "side": 765,
    "top": 765,
    "bottom": 765,
    "solid": 1,
    "textureFiles": [
      "soul_campfire_log_lit.png"
    ],
    "animated": {
      "frames": 4,
      "frametime": 20,
      "interpolate": true
    }
  },
  {
    "id": 630,
    "name": "Soul Fire 0",
    "category": "building",
    "side": 766,
    "top": 766,
    "bottom": 766,
    "solid": 1,
    "textureFiles": [
      "soul_fire_0.png"
    ],
    "animated": {
      "frames": 32,
      "frametime": 1,
      "interpolate": false,
      "frameOrder": [
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ]
    },
    "lightDist": 10,
    "glow": 1,
    "lightPower": 1.2
  },
  {
    "id": 631,
    "name": "Soul Fire 1",
    "category": "building",
    "side": 767,
    "top": 767,
    "bottom": 767,
    "solid": 1,
    "textureFiles": [
      "soul_fire_1.png"
    ],
    "animated": {
      "frames": 32,
      "frametime": 1,
      "interpolate": false
    }
  },
  {
    "id": 632,
    "name": "Soul Soil",
    "category": "building",
    "side": 768,
    "top": 768,
    "bottom": 768,
    "solid": 1,
    "textureFiles": [
      "soul_soil.png"
    ]
  },
  {
    "id": 633,
    "name": "Spawner",
    "category": "building",
    "side": 769,
    "top": 769,
    "bottom": 769,
    "solid": 1,
    "textureFiles": [
      "spawner.png"
    ]
  },
  {
    "id": 634,
    "name": "Spore Blossom",
    "category": "decoration",
    "side": 770,
    "top": 770,
    "bottom": 770,
    "solid": 1,
    "textureFiles": [
      "spore_blossom.png"
    ]
  },
  {
    "id": 635,
    "name": "Spore Blossom Base",
    "category": "decoration",
    "side": 771,
    "top": 771,
    "bottom": 771,
    "solid": 1,
    "textureFiles": [
      "spore_blossom_base.png"
    ]
  },
  {
    "id": 636,
    "name": "Spruce Door",
    "category": "redstone",
    "side": 772,
    "top": 773,
    "bottom": 772,
    "solid": 1,
    "textureFiles": [
      "spruce_door_bottom.png",
      "spruce_door_top.png"
    ]
  },
  {
    "id": 637,
    "name": "Spruce Sapling",
    "category": "decoration",
    "side": 775,
    "top": 775,
    "bottom": 775,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "spruce_sapling.png"
    ]
  },
  {
    "id": 638,
    "name": "Spruce Trapdoor",
    "category": "redstone",
    "side": 776,
    "top": 776,
    "bottom": 776,
    "solid": 1,
    "textureFiles": [
      "spruce_trapdoor.png"
    ]
  },
  {
    "id": 639,
    "name": "Stonecutter",
    "category": "building",
    "side": 779,
    "top": 780,
    "bottom": 777,
    "solid": 1,
    "textureFiles": [
      "stonecutter_bottom.png",
      "stonecutter_side.png",
      "stonecutter_top.png"
    ]
  },
  {
    "id": 640,
    "name": "Stonecutter Saw",
    "category": "building",
    "side": 778,
    "top": 778,
    "bottom": 778,
    "solid": 1,
    "textureFiles": [
      "stonecutter_saw.png"
    ],
    "animated": {
      "frames": 3,
      "frametime": 1,
      "interpolate": false
    }
  },
  {
    "id": 641,
    "name": "Stripped Acacia Log",
    "category": "wood",
    "side": 781,
    "top": 782,
    "bottom": 782,
    "solid": 1,
    "textureFiles": [
      "stripped_acacia_log.png",
      "stripped_acacia_log_top.png"
    ]
  },
  {
    "id": 642,
    "name": "Stripped Bamboo Block",
    "category": "building",
    "side": 783,
    "top": 784,
    "bottom": 784,
    "solid": 1,
    "textureFiles": [
      "stripped_bamboo_block.png",
      "stripped_bamboo_block_top.png"
    ]
  },
  {
    "id": 643,
    "name": "Stripped Birch Log",
    "category": "wood",
    "side": 785,
    "top": 786,
    "bottom": 786,
    "solid": 1,
    "textureFiles": [
      "stripped_birch_log.png",
      "stripped_birch_log_top.png"
    ]
  },
  {
    "id": 644,
    "name": "Stripped Crimson",
    "category": "building",
    "side": 787,
    "top": 787,
    "bottom": 787,
    "solid": 1,
    "textureFiles": [
      "stripped_crimson_stem.png"
    ]
  },
  {
    "id": 645,
    "name": "Stripped Crimson Stem",
    "category": "wood",
    "side": 787,
    "top": 788,
    "bottom": 788,
    "solid": 1,
    "textureFiles": [
      "stripped_crimson_stem_top.png"
    ]
  },
  {
    "id": 646,
    "name": "Stripped Dark Oak Log",
    "category": "wood",
    "side": 789,
    "top": 790,
    "bottom": 790,
    "solid": 1,
    "textureFiles": [
      "stripped_dark_oak_log.png",
      "stripped_dark_oak_log_top.png"
    ]
  },
  {
    "id": 647,
    "name": "Stripped Jungle Log",
    "category": "wood",
    "side": 791,
    "top": 792,
    "bottom": 792,
    "solid": 1,
    "textureFiles": [
      "stripped_jungle_log.png",
      "stripped_jungle_log_top.png"
    ]
  },
  {
    "id": 648,
    "name": "Stripped Mangrove Log",
    "category": "wood",
    "side": 793,
    "top": 794,
    "bottom": 794,
    "solid": 1,
    "textureFiles": [
      "stripped_mangrove_log.png",
      "stripped_mangrove_log_top.png"
    ]
  },
  {
    "id": 649,
    "name": "Stripped Oak Log",
    "category": "wood",
    "side": 795,
    "top": 796,
    "bottom": 796,
    "solid": 1,
    "textureFiles": [
      "stripped_oak_log.png",
      "stripped_oak_log_top.png"
    ]
  },
  {
    "id": 650,
    "name": "Stripped Spruce Log",
    "category": "wood",
    "side": 797,
    "top": 798,
    "bottom": 798,
    "solid": 1,
    "textureFiles": [
      "stripped_spruce_log.png",
      "stripped_spruce_log_top.png"
    ]
  },
  {
    "id": 651,
    "name": "Stripped Warped",
    "category": "building",
    "side": 799,
    "top": 799,
    "bottom": 799,
    "solid": 1,
    "textureFiles": [
      "stripped_warped_stem.png"
    ]
  },
  {
    "id": 652,
    "name": "Stripped Warped Stem",
    "category": "wood",
    "side": 799,
    "top": 800,
    "bottom": 800,
    "solid": 1,
    "textureFiles": [
      "stripped_warped_stem_top.png"
    ]
  },
  {
    "id": 653,
    "name": "Structure Block",
    "category": "building",
    "side": 801,
    "top": 801,
    "bottom": 801,
    "solid": 1,
    "textureFiles": [
      "structure_block.png"
    ]
  },
  {
    "id": 654,
    "name": "Structure Block Corner",
    "category": "building",
    "side": 802,
    "top": 802,
    "bottom": 802,
    "solid": 1,
    "textureFiles": [
      "structure_block_corner.png"
    ]
  },
  {
    "id": 655,
    "name": "Structure Block Data",
    "category": "building",
    "side": 803,
    "top": 803,
    "bottom": 803,
    "solid": 1,
    "textureFiles": [
      "structure_block_data.png"
    ]
  },
  {
    "id": 656,
    "name": "Structure Block Load",
    "category": "building",
    "side": 804,
    "top": 804,
    "bottom": 804,
    "solid": 1,
    "textureFiles": [
      "structure_block_load.png"
    ]
  },
  {
    "id": 657,
    "name": "Structure Block Save",
    "category": "building",
    "side": 805,
    "top": 805,
    "bottom": 805,
    "solid": 1,
    "textureFiles": [
      "structure_block_save.png"
    ]
  },
  {
    "id": 658,
    "name": "Sugar Cane",
    "category": "building",
    "side": 806,
    "top": 806,
    "bottom": 806,
    "solid": 1,
    "textureFiles": [
      "sugar_cane.png"
    ]
  },
  {
    "id": 659,
    "name": "Sunflower",
    "category": "decoration",
    "side": 807,
    "top": 810,
    "bottom": 808,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "sunflower_back.png",
      "sunflower_bottom.png",
      "sunflower_front.png",
      "sunflower_top.png"
    ]
  },
  {
    "id": 660,
    "name": "Sweet Berry Bush",
    "category": "building",
    "side": 811,
    "top": 811,
    "bottom": 811,
    "solid": 1,
    "textureFiles": [
      "sweet_berry_bush_stage0.png",
      "sweet_berry_bush_stage1.png",
      "sweet_berry_bush_stage2.png",
      "sweet_berry_bush_stage3.png"
    ]
  },
  {
    "id": 661,
    "name": "Tall Seagrass",
    "category": "natural",
    "side": 817,
    "top": 818,
    "bottom": 817,
    "solid": 1,
    "textureFiles": [
      "tall_seagrass_bottom.png",
      "tall_seagrass_top.png"
    ],
    "animated": {
      "frames": 19,
      "frametime": 2,
      "interpolate": false
    }
  },
  {
    "id": 662,
    "name": "Target",
    "category": "redstone",
    "side": 819,
    "top": 820,
    "bottom": 820,
    "solid": 1,
    "textureFiles": [
      "target_side.png",
      "target_top.png"
    ]
  },
  {
    "id": 663,
    "name": "Terracotta",
    "category": "colored",
    "side": 821,
    "top": 821,
    "bottom": 821,
    "solid": 1,
    "textureFiles": [
      "terracotta.png"
    ]
  },
  {
    "id": 664,
    "name": "Tripwire",
    "category": "redstone",
    "side": 823,
    "top": 823,
    "bottom": 823,
    "solid": 1,
    "textureFiles": [
      "tripwire.png"
    ]
  },
  {
    "id": 665,
    "name": "Tripwire Hook",
    "category": "redstone",
    "side": 824,
    "top": 824,
    "bottom": 824,
    "solid": 1,
    "textureFiles": [
      "tripwire_hook.png"
    ]
  },
  {
    "id": 666,
    "name": "Tube Coral",
    "category": "natural",
    "side": 825,
    "top": 825,
    "bottom": 825,
    "solid": 1,
    "textureFiles": [
      "tube_coral.png"
    ]
  },
  {
    "id": 667,
    "name": "Tube Coral Fan",
    "category": "natural",
    "side": 826,
    "top": 826,
    "bottom": 826,
    "solid": 1,
    "textureFiles": [
      "tube_coral_fan.png"
    ]
  },
  {
    "id": 668,
    "name": "Tuff",
    "category": "natural",
    "side": 827,
    "top": 827,
    "bottom": 827,
    "solid": 1,
    "textureFiles": [
      "tuff.png"
    ]
  },
  {
    "id": 669,
    "name": "Turtle Egg",
    "category": "building",
    "side": 828,
    "top": 828,
    "bottom": 828,
    "solid": 1,
    "textureFiles": [
      "turtle_egg.png"
    ]
  },
  {
    "id": 670,
    "name": "Turtle Egg Slightly Cracked",
    "category": "building",
    "side": 829,
    "top": 829,
    "bottom": 829,
    "solid": 1,
    "textureFiles": [
      "turtle_egg_slightly_cracked.png"
    ]
  },
  {
    "id": 671,
    "name": "Turtle Egg Very Cracked",
    "category": "building",
    "side": 830,
    "top": 830,
    "bottom": 830,
    "solid": 1,
    "textureFiles": [
      "turtle_egg_very_cracked.png"
    ]
  },
  {
    "id": 672,
    "name": "Twisting Vines",
    "category": "building",
    "side": 831,
    "top": 831,
    "bottom": 831,
    "solid": 1,
    "textureFiles": [
      "twisting_vines.png"
    ]
  },
  {
    "id": 673,
    "name": "Twisting Vines Plant",
    "category": "building",
    "side": 832,
    "top": 832,
    "bottom": 832,
    "solid": 1,
    "textureFiles": [
      "twisting_vines_plant.png"
    ]
  },
  {
    "id": 674,
    "name": "Vine",
    "category": "building",
    "side": 834,
    "top": 834,
    "bottom": 834,
    "solid": 1,
    "textureFiles": [
      "vine.png"
    ]
  },
  {
    "id": 675,
    "name": "Warped Door",
    "category": "redstone",
    "side": 835,
    "top": 836,
    "bottom": 835,
    "solid": 1,
    "textureFiles": [
      "warped_door_bottom.png",
      "warped_door_top.png"
    ]
  },
  {
    "id": 676,
    "name": "Warped Fungus",
    "category": "building",
    "side": 112,
    "top": 112,
    "bottom": 112,
    "solid": 1,
    "textureFiles": [
      "warped_fungus.png"
    ]
  },
  {
    "id": 677,
    "name": "Warped Nylium",
    "category": "building",
    "side": 838,
    "top": 838,
    "bottom": 838,
    "solid": 1,
    "textureFiles": [
      "warped_nylium.png",
      "warped_nylium_side.png"
    ]
  },
  {
    "id": 678,
    "name": "Warped Planks",
    "category": "building",
    "side": 839,
    "top": 839,
    "bottom": 839,
    "solid": 1,
    "textureFiles": [
      "warped_planks.png"
    ]
  },
  {
    "id": 679,
    "name": "Warped Roots",
    "category": "building",
    "side": 113,
    "top": 113,
    "bottom": 113,
    "solid": 1,
    "textureFiles": [
      "warped_roots.png"
    ]
  },
  {
    "id": 680,
    "name": "Warped Roots Pot",
    "category": "decoration",
    "side": 840,
    "top": 840,
    "bottom": 840,
    "solid": 1,
    "textureFiles": [
      "warped_roots_pot.png"
    ]
  },
  {
    "id": 681,
    "name": "Warped",
    "category": "building",
    "side": 124,
    "top": 124,
    "bottom": 124,
    "solid": 1,
    "textureFiles": [
      "warped_stem.png"
    ],
    "animated": {
      "frames": 5,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 682,
    "name": "Warped Stem",
    "category": "wood",
    "side": 124,
    "top": 125,
    "bottom": 125,
    "solid": 1,
    "textureFiles": [
      "warped_stem_top.png"
    ],
    "animated": {
      "frames": 5,
      "frametime": 10,
      "interpolate": true
    }
  },
  {
    "id": 683,
    "name": "Warped Trapdoor",
    "category": "redstone",
    "side": 841,
    "top": 841,
    "bottom": 841,
    "solid": 1,
    "textureFiles": [
      "warped_trapdoor.png"
    ]
  },
  {
    "id": 684,
    "name": "Warped Wart Block",
    "category": "building",
    "side": 842,
    "top": 842,
    "bottom": 842,
    "solid": 1,
    "textureFiles": [
      "warped_wart_block.png"
    ]
  },
  {
    "id": 685,
    "name": "Water Flow",
    "category": "building",
    "side": 843,
    "top": 843,
    "bottom": 843,
    "solid": 1,
    "textureFiles": [
      "water_flow.png"
    ],
    "animated": {
      "frames": 64,
      "frametime": 1,
      "interpolate": false
    }
  },
  {
    "id": 686,
    "name": "Water Overlay",
    "category": "building",
    "side": 844,
    "top": 844,
    "bottom": 844,
    "solid": 1,
    "textureFiles": [
      "water_overlay.png"
    ]
  },
  {
    "id": 687,
    "name": "Water Still",
    "category": "building",
    "side": 11,
    "top": 11,
    "bottom": 11,
    "solid": 1,
    "textureFiles": [
      "water_still.png"
    ],
    "animated": {
      "frames": 32,
      "frametime": 2,
      "interpolate": false
    }
  },
  {
    "id": 688,
    "name": "Weathered Copper",
    "category": "building",
    "side": 845,
    "top": 845,
    "bottom": 845,
    "solid": 1,
    "textureFiles": [
      "weathered_copper.png"
    ]
  },
  {
    "id": 689,
    "name": "Weathered Cut Copper",
    "category": "building",
    "side": 846,
    "top": 846,
    "bottom": 846,
    "solid": 1,
    "textureFiles": [
      "weathered_cut_copper.png"
    ]
  },
  {
    "id": 690,
    "name": "Weeping Vines",
    "category": "building",
    "side": 847,
    "top": 847,
    "bottom": 847,
    "solid": 1,
    "textureFiles": [
      "weeping_vines.png"
    ]
  },
  {
    "id": 691,
    "name": "Weeping Vines Plant",
    "category": "building",
    "side": 848,
    "top": 848,
    "bottom": 848,
    "solid": 1,
    "textureFiles": [
      "weeping_vines_plant.png"
    ]
  },
  {
    "id": 692,
    "name": "Wheat",
    "category": "building",
    "side": 849,
    "top": 849,
    "bottom": 849,
    "solid": 1,
    "textureFiles": [
      "wheat_stage0.png",
      "wheat_stage1.png",
      "wheat_stage2.png",
      "wheat_stage3.png",
      "wheat_stage4.png",
      "wheat_stage5.png",
      "wheat_stage6.png",
      "wheat_stage7.png"
    ]
  },
  {
    "id": 693,
    "name": "White Candle",
    "category": "colored",
    "side": 857,
    "top": 857,
    "bottom": 857,
    "solid": 1,
    "textureFiles": [
      "white_candle.png",
      "white_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 694,
    "name": "White Concrete",
    "category": "colored",
    "side": 859,
    "top": 859,
    "bottom": 859,
    "solid": 1,
    "textureFiles": [
      "white_concrete.png"
    ]
  },
  {
    "id": 695,
    "name": "White Concrete Powder",
    "category": "colored",
    "side": 860,
    "top": 860,
    "bottom": 860,
    "solid": 1,
    "textureFiles": [
      "white_concrete_powder.png"
    ]
  },
  {
    "id": 696,
    "name": "White Glazed Terracotta",
    "category": "colored",
    "side": 861,
    "top": 861,
    "bottom": 861,
    "solid": 1,
    "textureFiles": [
      "white_glazed_terracotta.png"
    ]
  },
  {
    "id": 697,
    "name": "White Shulker Box",
    "category": "colored",
    "side": 862,
    "top": 862,
    "bottom": 862,
    "solid": 1,
    "textureFiles": [
      "white_shulker_box.png"
    ]
  },
  {
    "id": 698,
    "name": "White Stained Glass",
    "category": "colored",
    "side": 863,
    "top": 863,
    "bottom": 863,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "white_stained_glass.png"
    ]
  },
  {
    "id": 699,
    "name": "White Stained Glass Pane",
    "category": "colored",
    "side": 863,
    "top": 864,
    "bottom": 864,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "white_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 700,
    "name": "White Terracotta",
    "category": "colored",
    "side": 865,
    "top": 865,
    "bottom": 865,
    "solid": 1,
    "textureFiles": [
      "white_terracotta.png"
    ]
  },
  {
    "id": 701,
    "name": "White Tulip",
    "category": "decoration",
    "side": 866,
    "top": 866,
    "bottom": 866,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "white_tulip.png"
    ]
  },
  {
    "id": 702,
    "name": "Wither Rose",
    "category": "decoration",
    "side": 867,
    "top": 867,
    "bottom": 867,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "wither_rose.png"
    ]
  },
  {
    "id": 703,
    "name": "Yellow Candle",
    "category": "colored",
    "side": 868,
    "top": 868,
    "bottom": 868,
    "solid": 1,
    "textureFiles": [
      "yellow_candle.png",
      "yellow_candle_lit.png"
    ],
    "light": 1,
    "lightDist": 3
  },
  {
    "id": 704,
    "name": "Yellow Concrete",
    "category": "colored",
    "side": 870,
    "top": 870,
    "bottom": 870,
    "solid": 1,
    "textureFiles": [
      "yellow_concrete.png"
    ]
  },
  {
    "id": 705,
    "name": "Yellow Concrete Powder",
    "category": "colored",
    "side": 871,
    "top": 871,
    "bottom": 871,
    "solid": 1,
    "textureFiles": [
      "yellow_concrete_powder.png"
    ]
  },
  {
    "id": 706,
    "name": "Yellow Glazed Terracotta",
    "category": "colored",
    "side": 872,
    "top": 872,
    "bottom": 872,
    "solid": 1,
    "textureFiles": [
      "yellow_glazed_terracotta.png"
    ]
  },
  {
    "id": 707,
    "name": "Yellow Shulker Box",
    "category": "colored",
    "side": 873,
    "top": 873,
    "bottom": 873,
    "solid": 1,
    "textureFiles": [
      "yellow_shulker_box.png"
    ]
  },
  {
    "id": 708,
    "name": "Yellow Stained Glass",
    "category": "colored",
    "side": 874,
    "top": 874,
    "bottom": 874,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "yellow_stained_glass.png"
    ]
  },
  {
    "id": 709,
    "name": "Yellow Stained Glass Pane",
    "category": "colored",
    "side": 875,
    "top": 875,
    "bottom": 875,
    "solid": 1,
    "trans": 1,
    "textureFiles": [
      "yellow_stained_glass_pane_top.png"
    ]
  },
  {
    "id": 710,
    "name": "Yellow Terracotta",
    "category": "colored",
    "side": 876,
    "top": 876,
    "bottom": 876,
    "solid": 1,
    "textureFiles": [
      "yellow_terracotta.png"
    ]
  },
  {
    "id": 711,
    "name": "Bamboo Hanging Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "bamboo_hanging_sign.png"
  },
  {
    "id": 712,
    "name": "Bamboo Raft",
    "category": "item",
    "solid": 0,
    "itemTexture": "bamboo_raft.png"
  },
  {
    "id": 713,
    "name": "Bamboo Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "bamboo_sign.png"
  },
  {
    "id": 714,
    "name": "Barrier",
    "category": "item",
    "solid": 0,
    "itemTexture": "barrier.png"
  },
  {
    "id": 715,
    "name": "Beef",
    "category": "food",
    "solid": 0,
    "itemTexture": "beef.png"
  },
  {
    "id": 716,
    "name": "Beetroot",
    "category": "item",
    "solid": 0,
    "itemTexture": "beetroot.png"
  },
  {
    "id": 717,
    "name": "Beetroot Seeds",
    "category": "item",
    "solid": 0,
    "itemTexture": "beetroot_seeds.png"
  },
  {
    "id": 718,
    "name": "Beetroot Soup",
    "category": "food",
    "solid": 0,
    "itemTexture": "beetroot_soup.png"
  },
  {
    "id": 719,
    "name": "Birch Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "birch_boat.png"
  },
  {
    "id": 720,
    "name": "Birch Chest Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "birch_chest_boat.png"
  },
  {
    "id": 721,
    "name": "Birch Hanging Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "birch_hanging_sign.png"
  },
  {
    "id": 722,
    "name": "Birch Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "birch_sign.png"
  },
  {
    "id": 723,
    "name": "Black Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "black_dye.png"
  },
  {
    "id": 724,
    "name": "Blaze Powder",
    "category": "item",
    "solid": 0,
    "itemTexture": "blaze_powder.png"
  },
  {
    "id": 725,
    "name": "Blaze Rod",
    "category": "item",
    "solid": 0,
    "itemTexture": "blaze_rod.png"
  },
  {
    "id": 726,
    "name": "Blue Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "blue_dye.png"
  },
  {
    "id": 727,
    "name": "Bone",
    "category": "item",
    "solid": 0,
    "itemTexture": "bone.png"
  },
  {
    "id": 728,
    "name": "Bone Meal",
    "category": "item",
    "solid": 0,
    "itemTexture": "bone_meal.png"
  },
  {
    "id": 729,
    "name": "Book",
    "category": "item",
    "solid": 0,
    "itemTexture": "book.png"
  },
  {
    "id": 730,
    "name": "Bow",
    "category": "combat",
    "solid": 0,
    "itemTexture": "bow.png"
  },
  {
    "id": 731,
    "name": "Bow Pulling 0",
    "category": "combat",
    "solid": 0,
    "itemTexture": "bow_pulling_0.png"
  },
  {
    "id": 732,
    "name": "Bow Pulling 1",
    "category": "combat",
    "solid": 0,
    "itemTexture": "bow_pulling_1.png"
  },
  {
    "id": 733,
    "name": "Bow Pulling 2",
    "category": "combat",
    "solid": 0,
    "itemTexture": "bow_pulling_2.png"
  },
  {
    "id": 734,
    "name": "Bowl",
    "category": "combat",
    "solid": 0,
    "itemTexture": "bowl.png"
  },
  {
    "id": 735,
    "name": "Bread",
    "category": "food",
    "solid": 0,
    "itemTexture": "bread.png"
  },
  {
    "id": 736,
    "name": "Brick",
    "category": "item",
    "solid": 0,
    "itemTexture": "brick.png"
  },
  {
    "id": 737,
    "name": "Broken Elytra",
    "category": "item",
    "solid": 0,
    "itemTexture": "broken_elytra.png"
  },
  {
    "id": 738,
    "name": "Brown Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "brown_dye.png"
  },
  {
    "id": 739,
    "name": "Bucket",
    "category": "tools",
    "solid": 0,
    "itemTexture": "bucket.png"
  },
  {
    "id": 740,
    "name": "Bundle",
    "category": "item",
    "solid": 0,
    "itemTexture": "bundle.png"
  },
  {
    "id": 741,
    "name": "Bundle Filled",
    "category": "item",
    "solid": 0,
    "itemTexture": "bundle_filled.png"
  },
  {
    "id": 742,
    "name": "Carrot",
    "category": "food",
    "solid": 0,
    "itemTexture": "carrot.png"
  },
  {
    "id": 743,
    "name": "Carrot On A Stick",
    "category": "food",
    "solid": 0,
    "itemTexture": "carrot_on_a_stick.png"
  },
  {
    "id": 744,
    "name": "Chainmail Boots",
    "category": "combat",
    "solid": 0,
    "itemTexture": "chainmail_boots.png"
  },
  {
    "id": 745,
    "name": "Chainmail Chestplate",
    "category": "combat",
    "solid": 0,
    "itemTexture": "chainmail_chestplate.png"
  },
  {
    "id": 746,
    "name": "Chainmail Helmet",
    "category": "combat",
    "solid": 0,
    "itemTexture": "chainmail_helmet.png"
  },
  {
    "id": 747,
    "name": "Chainmail Leggings",
    "category": "combat",
    "solid": 0,
    "itemTexture": "chainmail_leggings.png"
  },
  {
    "id": 748,
    "name": "Charcoal",
    "category": "item",
    "solid": 0,
    "itemTexture": "charcoal.png"
  },
  {
    "id": 749,
    "name": "Chest Minecart",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "chest_minecart.png"
  },
  {
    "id": 750,
    "name": "Chicken",
    "category": "food",
    "solid": 0,
    "itemTexture": "chicken.png"
  },
  {
    "id": 751,
    "name": "Chorus Fruit",
    "category": "item",
    "solid": 0,
    "itemTexture": "chorus_fruit.png"
  },
  {
    "id": 752,
    "name": "Clay Ball",
    "category": "item",
    "solid": 0,
    "itemTexture": "clay_ball.png"
  },
  {
    "id": 753,
    "name": "Clock 00",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_00.png"
  },
  {
    "id": 754,
    "name": "Clock 01",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_01.png"
  },
  {
    "id": 755,
    "name": "Clock 02",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_02.png"
  },
  {
    "id": 756,
    "name": "Clock 03",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_03.png"
  },
  {
    "id": 757,
    "name": "Clock 04",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_04.png"
  },
  {
    "id": 758,
    "name": "Clock 05",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_05.png"
  },
  {
    "id": 759,
    "name": "Clock 06",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_06.png"
  },
  {
    "id": 760,
    "name": "Clock 07",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_07.png"
  },
  {
    "id": 761,
    "name": "Clock 08",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_08.png"
  },
  {
    "id": 762,
    "name": "Clock 09",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_09.png"
  },
  {
    "id": 763,
    "name": "Clock 10",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_10.png"
  },
  {
    "id": 764,
    "name": "Clock 11",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_11.png"
  },
  {
    "id": 765,
    "name": "Clock 12",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_12.png"
  },
  {
    "id": 766,
    "name": "Clock 13",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_13.png"
  },
  {
    "id": 767,
    "name": "Clock 14",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_14.png"
  },
  {
    "id": 768,
    "name": "Clock 15",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_15.png"
  },
  {
    "id": 769,
    "name": "Clock 16",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_16.png"
  },
  {
    "id": 770,
    "name": "Clock 17",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_17.png"
  },
  {
    "id": 771,
    "name": "Clock 18",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_18.png"
  },
  {
    "id": 772,
    "name": "Clock 19",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_19.png"
  },
  {
    "id": 773,
    "name": "Clock 20",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_20.png"
  },
  {
    "id": 774,
    "name": "Clock 21",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_21.png"
  },
  {
    "id": 775,
    "name": "Clock 22",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_22.png"
  },
  {
    "id": 776,
    "name": "Clock 23",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_23.png"
  },
  {
    "id": 777,
    "name": "Clock 24",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_24.png"
  },
  {
    "id": 778,
    "name": "Clock 25",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_25.png"
  },
  {
    "id": 779,
    "name": "Clock 26",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_26.png"
  },
  {
    "id": 780,
    "name": "Clock 27",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_27.png"
  },
  {
    "id": 781,
    "name": "Clock 28",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_28.png"
  },
  {
    "id": 782,
    "name": "Clock 29",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_29.png"
  },
  {
    "id": 783,
    "name": "Clock 30",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_30.png"
  },
  {
    "id": 784,
    "name": "Clock 31",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_31.png"
  },
  {
    "id": 785,
    "name": "Clock 32",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_32.png"
  },
  {
    "id": 786,
    "name": "Clock 33",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_33.png"
  },
  {
    "id": 787,
    "name": "Clock 34",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_34.png"
  },
  {
    "id": 788,
    "name": "Clock 35",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_35.png"
  },
  {
    "id": 789,
    "name": "Clock 36",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_36.png"
  },
  {
    "id": 790,
    "name": "Clock 37",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_37.png"
  },
  {
    "id": 791,
    "name": "Clock 38",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_38.png"
  },
  {
    "id": 792,
    "name": "Clock 39",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_39.png"
  },
  {
    "id": 793,
    "name": "Clock 40",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_40.png"
  },
  {
    "id": 794,
    "name": "Clock 41",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_41.png"
  },
  {
    "id": 795,
    "name": "Clock 42",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_42.png"
  },
  {
    "id": 796,
    "name": "Clock 43",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_43.png"
  },
  {
    "id": 797,
    "name": "Clock 44",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_44.png"
  },
  {
    "id": 798,
    "name": "Clock 45",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_45.png"
  },
  {
    "id": 799,
    "name": "Clock 46",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_46.png"
  },
  {
    "id": 800,
    "name": "Clock 47",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_47.png"
  },
  {
    "id": 801,
    "name": "Clock 48",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_48.png"
  },
  {
    "id": 802,
    "name": "Clock 49",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_49.png"
  },
  {
    "id": 803,
    "name": "Clock 50",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_50.png"
  },
  {
    "id": 804,
    "name": "Clock 51",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_51.png"
  },
  {
    "id": 805,
    "name": "Clock 52",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_52.png"
  },
  {
    "id": 806,
    "name": "Clock 53",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_53.png"
  },
  {
    "id": 807,
    "name": "Clock 54",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_54.png"
  },
  {
    "id": 808,
    "name": "Clock 55",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_55.png"
  },
  {
    "id": 809,
    "name": "Clock 56",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_56.png"
  },
  {
    "id": 810,
    "name": "Clock 57",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_57.png"
  },
  {
    "id": 811,
    "name": "Clock 58",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_58.png"
  },
  {
    "id": 812,
    "name": "Clock 59",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_59.png"
  },
  {
    "id": 813,
    "name": "Clock 60",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_60.png"
  },
  {
    "id": 814,
    "name": "Clock 61",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_61.png"
  },
  {
    "id": 815,
    "name": "Clock 62",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_62.png"
  },
  {
    "id": 816,
    "name": "Clock 63",
    "category": "tools",
    "solid": 0,
    "itemTexture": "clock_63.png"
  },
  {
    "id": 817,
    "name": "Coal",
    "category": "item",
    "solid": 0,
    "itemTexture": "coal.png"
  },
  {
    "id": 818,
    "name": "Cocoa Beans",
    "category": "item",
    "solid": 0,
    "itemTexture": "cocoa_beans.png"
  },
  {
    "id": 819,
    "name": "Cod",
    "category": "food",
    "solid": 0,
    "itemTexture": "cod.png"
  },
  {
    "id": 820,
    "name": "Cod Bucket",
    "category": "tools",
    "solid": 0,
    "itemTexture": "cod_bucket.png"
  },
  {
    "id": 821,
    "name": "Command Block Minecart",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "command_block_minecart.png"
  },
  {
    "id": 822,
    "name": "Compass 00",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_00.png"
  },
  {
    "id": 823,
    "name": "Compass 01",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_01.png"
  },
  {
    "id": 824,
    "name": "Compass 02",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_02.png"
  },
  {
    "id": 825,
    "name": "Compass 03",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_03.png"
  },
  {
    "id": 826,
    "name": "Compass 04",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_04.png"
  },
  {
    "id": 827,
    "name": "Compass 05",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_05.png"
  },
  {
    "id": 828,
    "name": "Compass 06",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_06.png"
  },
  {
    "id": 829,
    "name": "Compass 07",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_07.png"
  },
  {
    "id": 830,
    "name": "Compass 08",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_08.png"
  },
  {
    "id": 831,
    "name": "Compass 09",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_09.png"
  },
  {
    "id": 832,
    "name": "Compass 10",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_10.png"
  },
  {
    "id": 833,
    "name": "Compass 11",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_11.png"
  },
  {
    "id": 834,
    "name": "Compass 12",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_12.png"
  },
  {
    "id": 835,
    "name": "Compass 13",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_13.png"
  },
  {
    "id": 836,
    "name": "Compass 14",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_14.png"
  },
  {
    "id": 837,
    "name": "Compass 15",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_15.png"
  },
  {
    "id": 838,
    "name": "Compass 16",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_16.png"
  },
  {
    "id": 839,
    "name": "Compass 17",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_17.png"
  },
  {
    "id": 840,
    "name": "Compass 18",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_18.png"
  },
  {
    "id": 841,
    "name": "Compass 19",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_19.png"
  },
  {
    "id": 842,
    "name": "Compass 20",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_20.png"
  },
  {
    "id": 843,
    "name": "Compass 21",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_21.png"
  },
  {
    "id": 844,
    "name": "Compass 22",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_22.png"
  },
  {
    "id": 845,
    "name": "Compass 23",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_23.png"
  },
  {
    "id": 846,
    "name": "Compass 24",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_24.png"
  },
  {
    "id": 847,
    "name": "Compass 25",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_25.png"
  },
  {
    "id": 848,
    "name": "Compass 26",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_26.png"
  },
  {
    "id": 849,
    "name": "Compass 27",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_27.png"
  },
  {
    "id": 850,
    "name": "Compass 28",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_28.png"
  },
  {
    "id": 851,
    "name": "Compass 29",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_29.png"
  },
  {
    "id": 852,
    "name": "Compass 30",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_30.png"
  },
  {
    "id": 853,
    "name": "Compass 31",
    "category": "tools",
    "solid": 0,
    "itemTexture": "compass_31.png"
  },
  {
    "id": 854,
    "name": "Cooked Beef",
    "category": "food",
    "solid": 0,
    "itemTexture": "cooked_beef.png"
  },
  {
    "id": 855,
    "name": "Cooked Chicken",
    "category": "food",
    "solid": 0,
    "itemTexture": "cooked_chicken.png"
  },
  {
    "id": 856,
    "name": "Cooked Cod",
    "category": "food",
    "solid": 0,
    "itemTexture": "cooked_cod.png"
  },
  {
    "id": 857,
    "name": "Cooked Mutton",
    "category": "food",
    "solid": 0,
    "itemTexture": "cooked_mutton.png"
  },
  {
    "id": 858,
    "name": "Cooked Porkchop",
    "category": "food",
    "solid": 0,
    "itemTexture": "cooked_porkchop.png"
  },
  {
    "id": 859,
    "name": "Cooked Rabbit",
    "category": "food",
    "solid": 0,
    "itemTexture": "cooked_rabbit.png"
  },
  {
    "id": 860,
    "name": "Cooked Salmon",
    "category": "food",
    "solid": 0,
    "itemTexture": "cooked_salmon.png"
  },
  {
    "id": 861,
    "name": "Cookie",
    "category": "food",
    "solid": 0,
    "itemTexture": "cookie.png"
  },
  {
    "id": 862,
    "name": "Copper Ingot",
    "category": "item",
    "solid": 0,
    "itemTexture": "copper_ingot.png"
  },
  {
    "id": 863,
    "name": "Creeper Banner Pattern",
    "category": "item",
    "solid": 0,
    "itemTexture": "creeper_banner_pattern.png"
  },
  {
    "id": 864,
    "name": "Crimson Hanging Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "crimson_hanging_sign.png"
  },
  {
    "id": 865,
    "name": "Crimson Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "crimson_sign.png"
  },
  {
    "id": 866,
    "name": "Crossbow Arrow",
    "category": "combat",
    "solid": 0,
    "itemTexture": "crossbow_arrow.png"
  },
  {
    "id": 867,
    "name": "Crossbow Firework",
    "category": "combat",
    "solid": 0,
    "itemTexture": "crossbow_firework.png"
  },
  {
    "id": 868,
    "name": "Crossbow Pulling 0",
    "category": "combat",
    "solid": 0,
    "itemTexture": "crossbow_pulling_0.png"
  },
  {
    "id": 869,
    "name": "Crossbow Pulling 1",
    "category": "combat",
    "solid": 0,
    "itemTexture": "crossbow_pulling_1.png"
  },
  {
    "id": 870,
    "name": "Crossbow Pulling 2",
    "category": "combat",
    "solid": 0,
    "itemTexture": "crossbow_pulling_2.png"
  },
  {
    "id": 871,
    "name": "Crossbow Standby",
    "category": "combat",
    "solid": 0,
    "itemTexture": "crossbow_standby.png"
  },
  {
    "id": 872,
    "name": "Cyan Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "cyan_dye.png"
  },
  {
    "id": 873,
    "name": "Dark Oak Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "dark_oak_boat.png"
  },
  {
    "id": 874,
    "name": "Dark Oak Chest Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "dark_oak_chest_boat.png"
  },
  {
    "id": 875,
    "name": "Dark Oak Hanging Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "dark_oak_hanging_sign.png"
  },
  {
    "id": 876,
    "name": "Dark Oak Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "dark_oak_sign.png"
  },
  {
    "id": 877,
    "name": "Diamond",
    "category": "item",
    "solid": 0,
    "itemTexture": "diamond.png"
  },
  {
    "id": 878,
    "name": "Diamond Axe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "diamond_axe.png"
  },
  {
    "id": 879,
    "name": "Diamond Boots",
    "category": "combat",
    "solid": 0,
    "itemTexture": "diamond_boots.png"
  },
  {
    "id": 880,
    "name": "Diamond Chestplate",
    "category": "combat",
    "solid": 0,
    "itemTexture": "diamond_chestplate.png"
  },
  {
    "id": 881,
    "name": "Diamond Helmet",
    "category": "combat",
    "solid": 0,
    "itemTexture": "diamond_helmet.png"
  },
  {
    "id": 882,
    "name": "Diamond Hoe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "diamond_hoe.png"
  },
  {
    "id": 883,
    "name": "Diamond Horse Armor",
    "category": "item",
    "solid": 0,
    "itemTexture": "diamond_horse_armor.png"
  },
  {
    "id": 884,
    "name": "Diamond Leggings",
    "category": "combat",
    "solid": 0,
    "itemTexture": "diamond_leggings.png"
  },
  {
    "id": 885,
    "name": "Diamond Pickaxe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "diamond_pickaxe.png"
  },
  {
    "id": 886,
    "name": "Diamond Shovel",
    "category": "tools",
    "solid": 0,
    "itemTexture": "diamond_shovel.png"
  },
  {
    "id": 887,
    "name": "Diamond Sword",
    "category": "combat",
    "solid": 0,
    "itemTexture": "diamond_sword.png"
  },
  {
    "id": 888,
    "name": "Disc Fragment 5",
    "category": "item",
    "solid": 0,
    "itemTexture": "disc_fragment_5.png"
  },
  {
    "id": 889,
    "name": "Dragon Breath",
    "category": "item",
    "solid": 0,
    "itemTexture": "dragon_breath.png"
  },
  {
    "id": 890,
    "name": "Echo Shard",
    "category": "item",
    "solid": 0,
    "itemTexture": "echo_shard.png"
  },
  {
    "id": 891,
    "name": "Egg",
    "category": "item",
    "solid": 0,
    "itemTexture": "egg.png"
  },
  {
    "id": 892,
    "name": "Elytra",
    "category": "item",
    "solid": 0,
    "itemTexture": "elytra.png"
  },
  {
    "id": 893,
    "name": "Emerald",
    "category": "item",
    "solid": 0,
    "itemTexture": "emerald.png"
  },
  {
    "id": 894,
    "name": "Empty Armor Slot Boots",
    "category": "combat",
    "solid": 0,
    "itemTexture": "empty_armor_slot_boots.png"
  },
  {
    "id": 895,
    "name": "Empty Armor Slot Chestplate",
    "category": "combat",
    "solid": 0,
    "itemTexture": "empty_armor_slot_chestplate.png"
  },
  {
    "id": 896,
    "name": "Empty Armor Slot Helmet",
    "category": "combat",
    "solid": 0,
    "itemTexture": "empty_armor_slot_helmet.png"
  },
  {
    "id": 897,
    "name": "Empty Armor Slot Leggings",
    "category": "combat",
    "solid": 0,
    "itemTexture": "empty_armor_slot_leggings.png"
  },
  {
    "id": 898,
    "name": "Empty Armor Slot Shield",
    "category": "combat",
    "solid": 0,
    "itemTexture": "empty_armor_slot_shield.png"
  },
  {
    "id": 899,
    "name": "Enchanted Book",
    "category": "item",
    "solid": 0,
    "itemTexture": "enchanted_book.png"
  },
  {
    "id": 900,
    "name": "End Crystal",
    "category": "item",
    "solid": 0,
    "itemTexture": "end_crystal.png"
  },
  {
    "id": 901,
    "name": "Ender Eye",
    "category": "item",
    "solid": 0,
    "itemTexture": "ender_eye.png"
  },
  {
    "id": 902,
    "name": "Ender Pearl",
    "category": "item",
    "solid": 0,
    "itemTexture": "ender_pearl.png"
  },
  {
    "id": 903,
    "name": "Experience Bottle",
    "category": "item",
    "solid": 0,
    "itemTexture": "experience_bottle.png"
  },
  {
    "id": 904,
    "name": "Feather",
    "category": "item",
    "solid": 0,
    "itemTexture": "feather.png"
  },
  {
    "id": 905,
    "name": "Fermented Spider Eye",
    "category": "item",
    "solid": 0,
    "itemTexture": "fermented_spider_eye.png"
  },
  {
    "id": 906,
    "name": "Filled Map",
    "category": "item",
    "solid": 0,
    "itemTexture": "filled_map.png"
  },
  {
    "id": 907,
    "name": "Filled Map Markings",
    "category": "item",
    "solid": 0,
    "itemTexture": "filled_map_markings.png"
  },
  {
    "id": 908,
    "name": "Fire Charge",
    "category": "item",
    "solid": 0,
    "itemTexture": "fire_charge.png"
  },
  {
    "id": 909,
    "name": "Firework Rocket",
    "category": "item",
    "solid": 0,
    "itemTexture": "firework_rocket.png"
  },
  {
    "id": 910,
    "name": "Firework Star",
    "category": "item",
    "solid": 0,
    "itemTexture": "firework_star.png"
  },
  {
    "id": 911,
    "name": "Firework Star Overlay",
    "category": "item",
    "solid": 0,
    "itemTexture": "firework_star_overlay.png"
  },
  {
    "id": 912,
    "name": "Fishing Rod",
    "category": "tools",
    "solid": 0,
    "itemTexture": "fishing_rod.png"
  },
  {
    "id": 913,
    "name": "Fishing Rod Cast",
    "category": "tools",
    "solid": 0,
    "itemTexture": "fishing_rod_cast.png"
  },
  {
    "id": 914,
    "name": "Flint",
    "category": "tools",
    "solid": 0,
    "itemTexture": "flint.png"
  },
  {
    "id": 915,
    "name": "Flint And Steel",
    "category": "tools",
    "solid": 0,
    "itemTexture": "flint_and_steel.png"
  },
  {
    "id": 916,
    "name": "Flower Banner Pattern",
    "category": "item",
    "solid": 0,
    "itemTexture": "flower_banner_pattern.png"
  },
  {
    "id": 917,
    "name": "Furnace Minecart",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "furnace_minecart.png"
  },
  {
    "id": 918,
    "name": "Ghast Tear",
    "category": "item",
    "solid": 0,
    "itemTexture": "ghast_tear.png"
  },
  {
    "id": 919,
    "name": "Glass Bottle",
    "category": "item",
    "solid": 0,
    "itemTexture": "glass_bottle.png"
  },
  {
    "id": 920,
    "name": "Glistering Melon Slice",
    "category": "food",
    "solid": 0,
    "itemTexture": "glistering_melon_slice.png"
  },
  {
    "id": 921,
    "name": "Globe Banner Pattern",
    "category": "item",
    "solid": 0,
    "itemTexture": "globe_banner_pattern.png"
  },
  {
    "id": 922,
    "name": "Glow Ink Sac",
    "category": "item",
    "solid": 0,
    "itemTexture": "glow_ink_sac.png"
  },
  {
    "id": 923,
    "name": "Glowstone Dust",
    "category": "item",
    "solid": 0,
    "itemTexture": "glowstone_dust.png"
  },
  {
    "id": 924,
    "name": "Goat Horn",
    "category": "item",
    "solid": 0,
    "itemTexture": "goat_horn.png"
  },
  {
    "id": 925,
    "name": "Gold Ingot",
    "category": "item",
    "solid": 0,
    "itemTexture": "gold_ingot.png"
  },
  {
    "id": 926,
    "name": "Gold Nugget",
    "category": "item",
    "solid": 0,
    "itemTexture": "gold_nugget.png"
  },
  {
    "id": 927,
    "name": "Golden Apple",
    "category": "food",
    "solid": 0,
    "itemTexture": "golden_apple.png"
  },
  {
    "id": 928,
    "name": "Golden Axe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "golden_axe.png"
  },
  {
    "id": 929,
    "name": "Golden Boots",
    "category": "combat",
    "solid": 0,
    "itemTexture": "golden_boots.png"
  },
  {
    "id": 930,
    "name": "Golden Carrot",
    "category": "food",
    "solid": 0,
    "itemTexture": "golden_carrot.png"
  },
  {
    "id": 931,
    "name": "Golden Chestplate",
    "category": "combat",
    "solid": 0,
    "itemTexture": "golden_chestplate.png"
  },
  {
    "id": 932,
    "name": "Golden Helmet",
    "category": "combat",
    "solid": 0,
    "itemTexture": "golden_helmet.png"
  },
  {
    "id": 933,
    "name": "Golden Hoe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "golden_hoe.png"
  },
  {
    "id": 934,
    "name": "Golden Horse Armor",
    "category": "item",
    "solid": 0,
    "itemTexture": "golden_horse_armor.png"
  },
  {
    "id": 935,
    "name": "Golden Leggings",
    "category": "combat",
    "solid": 0,
    "itemTexture": "golden_leggings.png"
  },
  {
    "id": 936,
    "name": "Golden Pickaxe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "golden_pickaxe.png"
  },
  {
    "id": 937,
    "name": "Golden Shovel",
    "category": "tools",
    "solid": 0,
    "itemTexture": "golden_shovel.png"
  },
  {
    "id": 938,
    "name": "Golden Sword",
    "category": "combat",
    "solid": 0,
    "itemTexture": "golden_sword.png"
  },
  {
    "id": 939,
    "name": "Gray Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "gray_dye.png"
  },
  {
    "id": 940,
    "name": "Green Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "green_dye.png"
  },
  {
    "id": 941,
    "name": "Gunpowder",
    "category": "item",
    "solid": 0,
    "itemTexture": "gunpowder.png"
  },
  {
    "id": 942,
    "name": "Heart Of The Sea",
    "category": "item",
    "solid": 0,
    "itemTexture": "heart_of_the_sea.png"
  },
  {
    "id": 943,
    "name": "Honey Bottle",
    "category": "item",
    "solid": 0,
    "itemTexture": "honey_bottle.png"
  },
  {
    "id": 944,
    "name": "Honeycomb",
    "category": "item",
    "solid": 0,
    "itemTexture": "honeycomb.png"
  },
  {
    "id": 945,
    "name": "Hopper Minecart",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "hopper_minecart.png"
  },
  {
    "id": 946,
    "name": "Ink Sac",
    "category": "item",
    "solid": 0,
    "itemTexture": "ink_sac.png"
  },
  {
    "id": 947,
    "name": "Iron Axe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "iron_axe.png"
  },
  {
    "id": 948,
    "name": "Iron Boots",
    "category": "combat",
    "solid": 0,
    "itemTexture": "iron_boots.png"
  },
  {
    "id": 949,
    "name": "Iron Chestplate",
    "category": "combat",
    "solid": 0,
    "itemTexture": "iron_chestplate.png"
  },
  {
    "id": 950,
    "name": "Iron Helmet",
    "category": "combat",
    "solid": 0,
    "itemTexture": "iron_helmet.png"
  },
  {
    "id": 951,
    "name": "Iron Hoe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "iron_hoe.png"
  },
  {
    "id": 952,
    "name": "Iron Horse Armor",
    "category": "item",
    "solid": 0,
    "itemTexture": "iron_horse_armor.png"
  },
  {
    "id": 953,
    "name": "Iron Ingot",
    "category": "item",
    "solid": 0,
    "itemTexture": "iron_ingot.png"
  },
  {
    "id": 954,
    "name": "Iron Leggings",
    "category": "combat",
    "solid": 0,
    "itemTexture": "iron_leggings.png"
  },
  {
    "id": 955,
    "name": "Iron Nugget",
    "category": "item",
    "solid": 0,
    "itemTexture": "iron_nugget.png"
  },
  {
    "id": 956,
    "name": "Iron Pickaxe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "iron_pickaxe.png"
  },
  {
    "id": 957,
    "name": "Iron Shovel",
    "category": "tools",
    "solid": 0,
    "itemTexture": "iron_shovel.png"
  },
  {
    "id": 958,
    "name": "Iron Sword",
    "category": "combat",
    "solid": 0,
    "itemTexture": "iron_sword.png"
  },
  {
    "id": 959,
    "name": "Jungle Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "jungle_boat.png"
  },
  {
    "id": 960,
    "name": "Jungle Chest Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "jungle_chest_boat.png"
  },
  {
    "id": 961,
    "name": "Jungle Hanging Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "jungle_hanging_sign.png"
  },
  {
    "id": 962,
    "name": "Jungle Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "jungle_sign.png"
  },
  {
    "id": 963,
    "name": "Knowledge Book",
    "category": "item",
    "solid": 0,
    "itemTexture": "knowledge_book.png"
  },
  {
    "id": 964,
    "name": "Lapis Lazuli",
    "category": "item",
    "solid": 0,
    "itemTexture": "lapis_lazuli.png"
  },
  {
    "id": 965,
    "name": "Lead",
    "category": "item",
    "solid": 0,
    "itemTexture": "lead.png"
  },
  {
    "id": 966,
    "name": "Leather",
    "category": "item",
    "solid": 0,
    "itemTexture": "leather.png"
  },
  {
    "id": 967,
    "name": "Leather Boots",
    "category": "combat",
    "solid": 0,
    "itemTexture": "leather_boots.png"
  },
  {
    "id": 968,
    "name": "Leather Boots Overlay",
    "category": "combat",
    "solid": 0,
    "itemTexture": "leather_boots_overlay.png"
  },
  {
    "id": 969,
    "name": "Leather Chestplate",
    "category": "combat",
    "solid": 0,
    "itemTexture": "leather_chestplate.png"
  },
  {
    "id": 970,
    "name": "Leather Chestplate Overlay",
    "category": "combat",
    "solid": 0,
    "itemTexture": "leather_chestplate_overlay.png"
  },
  {
    "id": 971,
    "name": "Leather Helmet",
    "category": "combat",
    "solid": 0,
    "itemTexture": "leather_helmet.png"
  },
  {
    "id": 972,
    "name": "Leather Helmet Overlay",
    "category": "combat",
    "solid": 0,
    "itemTexture": "leather_helmet_overlay.png"
  },
  {
    "id": 973,
    "name": "Leather Horse Armor",
    "category": "item",
    "solid": 0,
    "itemTexture": "leather_horse_armor.png"
  },
  {
    "id": 974,
    "name": "Leather Leggings",
    "category": "combat",
    "solid": 0,
    "itemTexture": "leather_leggings.png"
  },
  {
    "id": 975,
    "name": "Leather Leggings Overlay",
    "category": "combat",
    "solid": 0,
    "itemTexture": "leather_leggings_overlay.png"
  },
  {
    "id": 976,
    "name": "Light",
    "category": "item",
    "solid": 0,
    "itemTexture": "light.png"
  },
  {
    "id": 977,
    "name": "Light 00",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_00.png"
  },
  {
    "id": 978,
    "name": "Light 01",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_01.png"
  },
  {
    "id": 979,
    "name": "Light 02",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_02.png"
  },
  {
    "id": 980,
    "name": "Light 03",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_03.png"
  },
  {
    "id": 981,
    "name": "Light 04",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_04.png"
  },
  {
    "id": 982,
    "name": "Light 05",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_05.png"
  },
  {
    "id": 983,
    "name": "Light 06",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_06.png"
  },
  {
    "id": 984,
    "name": "Light 07",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_07.png"
  },
  {
    "id": 985,
    "name": "Light 08",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_08.png"
  },
  {
    "id": 986,
    "name": "Light 09",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_09.png"
  },
  {
    "id": 987,
    "name": "Light 10",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_10.png"
  },
  {
    "id": 988,
    "name": "Light 11",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_11.png"
  },
  {
    "id": 989,
    "name": "Light 12",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_12.png"
  },
  {
    "id": 990,
    "name": "Light 13",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_13.png"
  },
  {
    "id": 991,
    "name": "Light 14",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_14.png"
  },
  {
    "id": 992,
    "name": "Light 15",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_15.png"
  },
  {
    "id": 993,
    "name": "Light Blue Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_blue_dye.png"
  },
  {
    "id": 994,
    "name": "Light Gray Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "light_gray_dye.png"
  },
  {
    "id": 995,
    "name": "Lime Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "lime_dye.png"
  },
  {
    "id": 996,
    "name": "Lingering Potion",
    "category": "item",
    "solid": 0,
    "itemTexture": "lingering_potion.png"
  },
  {
    "id": 997,
    "name": "Magenta Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "magenta_dye.png"
  },
  {
    "id": 998,
    "name": "Magma Cream",
    "category": "item",
    "solid": 0,
    "itemTexture": "magma_cream.png"
  },
  {
    "id": 999,
    "name": "Mangrove Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "mangrove_boat.png"
  },
  {
    "id": 1000,
    "name": "Mangrove Chest Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "mangrove_chest_boat.png"
  },
  {
    "id": 1001,
    "name": "Mangrove Hanging Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "mangrove_hanging_sign.png"
  },
  {
    "id": 1002,
    "name": "Mangrove Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "mangrove_sign.png"
  },
  {
    "id": 1003,
    "name": "Map",
    "category": "item",
    "solid": 0,
    "itemTexture": "map.png"
  },
  {
    "id": 1004,
    "name": "Melon Seeds",
    "category": "food",
    "solid": 0,
    "itemTexture": "melon_seeds.png"
  },
  {
    "id": 1005,
    "name": "Melon Slice",
    "category": "food",
    "solid": 0,
    "itemTexture": "melon_slice.png"
  },
  {
    "id": 1006,
    "name": "Milk Bucket",
    "category": "tools",
    "solid": 0,
    "itemTexture": "milk_bucket.png"
  },
  {
    "id": 1007,
    "name": "Minecart",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "minecart.png"
  },
  {
    "id": 1008,
    "name": "Mojang Banner Pattern",
    "category": "item",
    "solid": 0,
    "itemTexture": "mojang_banner_pattern.png"
  },
  {
    "id": 1009,
    "name": "Mushroom Stew",
    "category": "food",
    "solid": 0,
    "itemTexture": "mushroom_stew.png"
  },
  {
    "id": 1010,
    "name": "Music Disc 11",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_11.png"
  },
  {
    "id": 1011,
    "name": "Music Disc 13",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_13.png"
  },
  {
    "id": 1012,
    "name": "Music Disc 5",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_5.png"
  },
  {
    "id": 1013,
    "name": "Music Disc Blocks",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_blocks.png"
  },
  {
    "id": 1014,
    "name": "Music Disc Cat",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_cat.png"
  },
  {
    "id": 1015,
    "name": "Music Disc Chirp",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_chirp.png"
  },
  {
    "id": 1016,
    "name": "Music Disc Far",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_far.png"
  },
  {
    "id": 1017,
    "name": "Music Disc Mall",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_mall.png"
  },
  {
    "id": 1018,
    "name": "Music Disc Mellohi",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_mellohi.png"
  },
  {
    "id": 1019,
    "name": "Music Disc Otherside",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_otherside.png"
  },
  {
    "id": 1020,
    "name": "Music Disc Pigstep",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_pigstep.png"
  },
  {
    "id": 1021,
    "name": "Music Disc Stal",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_stal.png"
  },
  {
    "id": 1022,
    "name": "Music Disc Strad",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_strad.png"
  },
  {
    "id": 1023,
    "name": "Music Disc Wait",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_wait.png"
  },
  {
    "id": 1024,
    "name": "Music Disc Ward",
    "category": "item",
    "solid": 0,
    "itemTexture": "music_disc_ward.png"
  },
  {
    "id": 1025,
    "name": "Mutton",
    "category": "food",
    "solid": 0,
    "itemTexture": "mutton.png"
  },
  {
    "id": 1026,
    "name": "Name Tag",
    "category": "item",
    "solid": 0,
    "itemTexture": "name_tag.png"
  },
  {
    "id": 1027,
    "name": "Nautilus Shell",
    "category": "item",
    "solid": 0,
    "itemTexture": "nautilus_shell.png"
  },
  {
    "id": 1028,
    "name": "Nether Brick",
    "category": "item",
    "solid": 0,
    "itemTexture": "nether_brick.png"
  },
  {
    "id": 1029,
    "name": "Nether Star",
    "category": "item",
    "solid": 0,
    "itemTexture": "nether_star.png"
  },
  {
    "id": 1030,
    "name": "Netherite Axe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "netherite_axe.png"
  },
  {
    "id": 1031,
    "name": "Netherite Boots",
    "category": "combat",
    "solid": 0,
    "itemTexture": "netherite_boots.png"
  },
  {
    "id": 1032,
    "name": "Netherite Chestplate",
    "category": "combat",
    "solid": 0,
    "itemTexture": "netherite_chestplate.png"
  },
  {
    "id": 1033,
    "name": "Netherite Helmet",
    "category": "combat",
    "solid": 0,
    "itemTexture": "netherite_helmet.png"
  },
  {
    "id": 1034,
    "name": "Netherite Hoe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "netherite_hoe.png"
  },
  {
    "id": 1035,
    "name": "Netherite Ingot",
    "category": "item",
    "solid": 0,
    "itemTexture": "netherite_ingot.png"
  },
  {
    "id": 1036,
    "name": "Netherite Leggings",
    "category": "combat",
    "solid": 0,
    "itemTexture": "netherite_leggings.png"
  },
  {
    "id": 1037,
    "name": "Netherite Pickaxe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "netherite_pickaxe.png"
  },
  {
    "id": 1038,
    "name": "Netherite Scrap",
    "category": "item",
    "solid": 0,
    "itemTexture": "netherite_scrap.png"
  },
  {
    "id": 1039,
    "name": "Netherite Shovel",
    "category": "tools",
    "solid": 0,
    "itemTexture": "netherite_shovel.png"
  },
  {
    "id": 1040,
    "name": "Netherite Sword",
    "category": "combat",
    "solid": 0,
    "itemTexture": "netherite_sword.png"
  },
  {
    "id": 1041,
    "name": "Oak Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "oak_boat.png"
  },
  {
    "id": 1042,
    "name": "Oak Chest Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "oak_chest_boat.png"
  },
  {
    "id": 1043,
    "name": "Oak Hanging Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "oak_hanging_sign.png"
  },
  {
    "id": 1044,
    "name": "Oak Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "oak_sign.png"
  },
  {
    "id": 1045,
    "name": "Orange Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "orange_dye.png"
  },
  {
    "id": 1046,
    "name": "Painting",
    "category": "item",
    "solid": 0,
    "itemTexture": "painting.png"
  },
  {
    "id": 1047,
    "name": "Paper",
    "category": "item",
    "solid": 0,
    "itemTexture": "paper.png"
  },
  {
    "id": 1048,
    "name": "Phantom Membrane",
    "category": "item",
    "solid": 0,
    "itemTexture": "phantom_membrane.png"
  },
  {
    "id": 1049,
    "name": "Piglin Banner Pattern",
    "category": "item",
    "solid": 0,
    "itemTexture": "piglin_banner_pattern.png"
  },
  {
    "id": 1050,
    "name": "Pink Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "pink_dye.png"
  },
  {
    "id": 1051,
    "name": "Pointed Dripstone",
    "category": "item",
    "solid": 0,
    "itemTexture": "pointed_dripstone.png"
  },
  {
    "id": 1052,
    "name": "Poisonous Potato",
    "category": "food",
    "solid": 0,
    "itemTexture": "poisonous_potato.png"
  },
  {
    "id": 1053,
    "name": "Popped Chorus Fruit",
    "category": "item",
    "solid": 0,
    "itemTexture": "popped_chorus_fruit.png"
  },
  {
    "id": 1054,
    "name": "Porkchop",
    "category": "food",
    "solid": 0,
    "itemTexture": "porkchop.png"
  },
  {
    "id": 1055,
    "name": "Potato",
    "category": "food",
    "solid": 0,
    "itemTexture": "potato.png"
  },
  {
    "id": 1056,
    "name": "Potion",
    "category": "item",
    "solid": 0,
    "itemTexture": "potion.png"
  },
  {
    "id": 1057,
    "name": "Potion Overlay",
    "category": "item",
    "solid": 0,
    "itemTexture": "potion_overlay.png"
  },
  {
    "id": 1058,
    "name": "Powder Snow Bucket",
    "category": "tools",
    "solid": 0,
    "itemTexture": "powder_snow_bucket.png"
  },
  {
    "id": 1059,
    "name": "Prismarine Crystals",
    "category": "item",
    "solid": 0,
    "itemTexture": "prismarine_crystals.png"
  },
  {
    "id": 1060,
    "name": "Prismarine Shard",
    "category": "item",
    "solid": 0,
    "itemTexture": "prismarine_shard.png"
  },
  {
    "id": 1061,
    "name": "Pufferfish",
    "category": "food",
    "solid": 0,
    "itemTexture": "pufferfish.png"
  },
  {
    "id": 1062,
    "name": "Pufferfish Bucket",
    "category": "tools",
    "solid": 0,
    "itemTexture": "pufferfish_bucket.png"
  },
  {
    "id": 1063,
    "name": "Pumpkin Pie",
    "category": "food",
    "solid": 0,
    "itemTexture": "pumpkin_pie.png"
  },
  {
    "id": 1064,
    "name": "Pumpkin Seeds",
    "category": "item",
    "solid": 0,
    "itemTexture": "pumpkin_seeds.png"
  },
  {
    "id": 1065,
    "name": "Purple Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "purple_dye.png"
  },
  {
    "id": 1066,
    "name": "Quartz",
    "category": "item",
    "solid": 0,
    "itemTexture": "quartz.png"
  },
  {
    "id": 1067,
    "name": "Rabbit",
    "category": "food",
    "solid": 0,
    "itemTexture": "rabbit.png"
  },
  {
    "id": 1068,
    "name": "Rabbit Foot",
    "category": "food",
    "solid": 0,
    "itemTexture": "rabbit_foot.png"
  },
  {
    "id": 1069,
    "name": "Rabbit Hide",
    "category": "food",
    "solid": 0,
    "itemTexture": "rabbit_hide.png"
  },
  {
    "id": 1070,
    "name": "Rabbit Stew",
    "category": "food",
    "solid": 0,
    "itemTexture": "rabbit_stew.png"
  },
  {
    "id": 1071,
    "name": "Raw Copper",
    "category": "item",
    "solid": 0,
    "itemTexture": "raw_copper.png"
  },
  {
    "id": 1072,
    "name": "Raw Gold",
    "category": "item",
    "solid": 0,
    "itemTexture": "raw_gold.png"
  },
  {
    "id": 1073,
    "name": "Raw Iron",
    "category": "item",
    "solid": 0,
    "itemTexture": "raw_iron.png"
  },
  {
    "id": 1074,
    "name": "Recovery Compass 00",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_00.png"
  },
  {
    "id": 1075,
    "name": "Recovery Compass 01",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_01.png"
  },
  {
    "id": 1076,
    "name": "Recovery Compass 02",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_02.png"
  },
  {
    "id": 1077,
    "name": "Recovery Compass 03",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_03.png"
  },
  {
    "id": 1078,
    "name": "Recovery Compass 04",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_04.png"
  },
  {
    "id": 1079,
    "name": "Recovery Compass 05",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_05.png"
  },
  {
    "id": 1080,
    "name": "Recovery Compass 06",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_06.png"
  },
  {
    "id": 1081,
    "name": "Recovery Compass 07",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_07.png"
  },
  {
    "id": 1082,
    "name": "Recovery Compass 08",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_08.png"
  },
  {
    "id": 1083,
    "name": "Recovery Compass 09",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_09.png"
  },
  {
    "id": 1084,
    "name": "Recovery Compass 10",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_10.png"
  },
  {
    "id": 1085,
    "name": "Recovery Compass 11",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_11.png"
  },
  {
    "id": 1086,
    "name": "Recovery Compass 12",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_12.png"
  },
  {
    "id": 1087,
    "name": "Recovery Compass 13",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_13.png"
  },
  {
    "id": 1088,
    "name": "Recovery Compass 14",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_14.png"
  },
  {
    "id": 1089,
    "name": "Recovery Compass 15",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_15.png"
  },
  {
    "id": 1090,
    "name": "Recovery Compass 16",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_16.png"
  },
  {
    "id": 1091,
    "name": "Recovery Compass 17",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_17.png"
  },
  {
    "id": 1092,
    "name": "Recovery Compass 18",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_18.png"
  },
  {
    "id": 1093,
    "name": "Recovery Compass 19",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_19.png"
  },
  {
    "id": 1094,
    "name": "Recovery Compass 20",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_20.png"
  },
  {
    "id": 1095,
    "name": "Recovery Compass 21",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_21.png"
  },
  {
    "id": 1096,
    "name": "Recovery Compass 22",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_22.png"
  },
  {
    "id": 1097,
    "name": "Recovery Compass 23",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_23.png"
  },
  {
    "id": 1098,
    "name": "Recovery Compass 24",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_24.png"
  },
  {
    "id": 1099,
    "name": "Recovery Compass 25",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_25.png"
  },
  {
    "id": 1100,
    "name": "Recovery Compass 26",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_26.png"
  },
  {
    "id": 1101,
    "name": "Recovery Compass 27",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_27.png"
  },
  {
    "id": 1102,
    "name": "Recovery Compass 28",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_28.png"
  },
  {
    "id": 1103,
    "name": "Recovery Compass 29",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_29.png"
  },
  {
    "id": 1104,
    "name": "Recovery Compass 30",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_30.png"
  },
  {
    "id": 1105,
    "name": "Recovery Compass 31",
    "category": "tools",
    "solid": 0,
    "itemTexture": "recovery_compass_31.png"
  },
  {
    "id": 1106,
    "name": "Red Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "red_dye.png"
  },
  {
    "id": 1107,
    "name": "Redstone",
    "category": "item",
    "solid": 0,
    "itemTexture": "redstone.png"
  },
  {
    "id": 1108,
    "name": "Rotten Flesh",
    "category": "item",
    "solid": 0,
    "itemTexture": "rotten_flesh.png"
  },
  {
    "id": 1109,
    "name": "Saddle",
    "category": "item",
    "solid": 0,
    "itemTexture": "saddle.png"
  },
  {
    "id": 1110,
    "name": "Salmon",
    "category": "food",
    "solid": 0,
    "itemTexture": "salmon.png"
  },
  {
    "id": 1111,
    "name": "Salmon Bucket",
    "category": "tools",
    "solid": 0,
    "itemTexture": "salmon_bucket.png"
  },
  {
    "id": 1112,
    "name": "Scute",
    "category": "item",
    "solid": 0,
    "itemTexture": "scute.png"
  },
  {
    "id": 1113,
    "name": "Shears",
    "category": "tools",
    "solid": 0,
    "itemTexture": "shears.png"
  },
  {
    "id": 1114,
    "name": "Shulker Shell",
    "category": "item",
    "solid": 0,
    "itemTexture": "shulker_shell.png"
  },
  {
    "id": 1115,
    "name": "Skull Banner Pattern",
    "category": "item",
    "solid": 0,
    "itemTexture": "skull_banner_pattern.png"
  },
  {
    "id": 1116,
    "name": "Slime Ball",
    "category": "item",
    "solid": 0,
    "itemTexture": "slime_ball.png"
  },
  {
    "id": 1117,
    "name": "Snowball",
    "category": "item",
    "solid": 0,
    "itemTexture": "snowball.png"
  },
  {
    "id": 1118,
    "name": "Spawn Egg",
    "category": "item",
    "solid": 0,
    "itemTexture": "spawn_egg.png"
  },
  {
    "id": 1119,
    "name": "Spawn Egg Overlay",
    "category": "item",
    "solid": 0,
    "itemTexture": "spawn_egg_overlay.png"
  },
  {
    "id": 1120,
    "name": "Spectral Arrow",
    "category": "combat",
    "solid": 0,
    "itemTexture": "spectral_arrow.png"
  },
  {
    "id": 1121,
    "name": "Spider Eye",
    "category": "item",
    "solid": 0,
    "itemTexture": "spider_eye.png"
  },
  {
    "id": 1122,
    "name": "Splash Potion",
    "category": "item",
    "solid": 0,
    "itemTexture": "splash_potion.png"
  },
  {
    "id": 1123,
    "name": "Spruce Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "spruce_boat.png"
  },
  {
    "id": 1124,
    "name": "Spruce Chest Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "spruce_chest_boat.png"
  },
  {
    "id": 1125,
    "name": "Spruce Hanging Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "spruce_hanging_sign.png"
  },
  {
    "id": 1126,
    "name": "Spruce Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "spruce_sign.png"
  },
  {
    "id": 1127,
    "name": "Spyglass",
    "category": "item",
    "solid": 0,
    "itemTexture": "spyglass.png"
  },
  {
    "id": 1128,
    "name": "Spyglass Model",
    "category": "item",
    "solid": 0,
    "itemTexture": "spyglass_model.png"
  },
  {
    "id": 1129,
    "name": "Stick",
    "category": "item",
    "solid": 0,
    "itemTexture": "stick.png"
  },
  {
    "id": 1130,
    "name": "Stone Axe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "stone_axe.png"
  },
  {
    "id": 1131,
    "name": "Stone Hoe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "stone_hoe.png"
  },
  {
    "id": 1132,
    "name": "Stone Pickaxe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "stone_pickaxe.png"
  },
  {
    "id": 1133,
    "name": "Stone Shovel",
    "category": "tools",
    "solid": 0,
    "itemTexture": "stone_shovel.png"
  },
  {
    "id": 1134,
    "name": "Stone Sword",
    "category": "combat",
    "solid": 0,
    "itemTexture": "stone_sword.png"
  },
  {
    "id": 1135,
    "name": "String",
    "category": "item",
    "solid": 0,
    "itemTexture": "string.png"
  },
  {
    "id": 1136,
    "name": "Structure Void",
    "category": "item",
    "solid": 0,
    "itemTexture": "structure_void.png"
  },
  {
    "id": 1137,
    "name": "Sugar",
    "category": "item",
    "solid": 0,
    "itemTexture": "sugar.png"
  },
  {
    "id": 1138,
    "name": "Suspicious Stew",
    "category": "food",
    "solid": 0,
    "itemTexture": "suspicious_stew.png"
  },
  {
    "id": 1139,
    "name": "Sweet Berries",
    "category": "item",
    "solid": 0,
    "itemTexture": "sweet_berries.png"
  },
  {
    "id": 1140,
    "name": "Tadpole Bucket",
    "category": "tools",
    "solid": 0,
    "itemTexture": "tadpole_bucket.png"
  },
  {
    "id": 1141,
    "name": "Tipped Arrow Base",
    "category": "combat",
    "solid": 0,
    "itemTexture": "tipped_arrow_base.png"
  },
  {
    "id": 1142,
    "name": "Tipped Arrow Head",
    "category": "combat",
    "solid": 0,
    "itemTexture": "tipped_arrow_head.png"
  },
  {
    "id": 1143,
    "name": "Tnt Minecart",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "tnt_minecart.png"
  },
  {
    "id": 1144,
    "name": "Totem Of Undying",
    "category": "item",
    "solid": 0,
    "itemTexture": "totem_of_undying.png"
  },
  {
    "id": 1145,
    "name": "Trident",
    "category": "item",
    "solid": 0,
    "itemTexture": "trident.png"
  },
  {
    "id": 1146,
    "name": "Tropical Fish",
    "category": "food",
    "solid": 0,
    "itemTexture": "tropical_fish.png"
  },
  {
    "id": 1147,
    "name": "Tropical Fish Bucket",
    "category": "tools",
    "solid": 0,
    "itemTexture": "tropical_fish_bucket.png"
  },
  {
    "id": 1148,
    "name": "Turtle Helmet",
    "category": "combat",
    "solid": 0,
    "itemTexture": "turtle_helmet.png"
  },
  {
    "id": 1149,
    "name": "Warped Fungus On A Stick",
    "category": "item",
    "solid": 0,
    "itemTexture": "warped_fungus_on_a_stick.png"
  },
  {
    "id": 1150,
    "name": "Warped Hanging Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "warped_hanging_sign.png"
  },
  {
    "id": 1151,
    "name": "Warped Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "warped_sign.png"
  },
  {
    "id": 1152,
    "name": "Wheat Seeds",
    "category": "item",
    "solid": 0,
    "itemTexture": "wheat_seeds.png"
  },
  {
    "id": 1153,
    "name": "White Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "white_dye.png"
  },
  {
    "id": 1154,
    "name": "Wooden Axe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "wooden_axe.png"
  },
  {
    "id": 1155,
    "name": "Wooden Hoe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "wooden_hoe.png"
  },
  {
    "id": 1156,
    "name": "Wooden Pickaxe",
    "category": "tools",
    "solid": 0,
    "itemTexture": "wooden_pickaxe.png"
  },
  {
    "id": 1157,
    "name": "Wooden Shovel",
    "category": "tools",
    "solid": 0,
    "itemTexture": "wooden_shovel.png"
  },
  {
    "id": 1158,
    "name": "Wooden Sword",
    "category": "combat",
    "solid": 0,
    "itemTexture": "wooden_sword.png"
  },
  {
    "id": 1159,
    "name": "Writable Book",
    "category": "item",
    "solid": 0,
    "itemTexture": "writable_book.png"
  },
  {
    "id": 1160,
    "name": "Written Book",
    "category": "item",
    "solid": 0,
    "itemTexture": "written_book.png"
  },
  {
    "id": 1161,
    "name": "Yellow Dye",
    "category": "item",
    "solid": 0,
    "itemTexture": "yellow_dye.png"
  },
  {
    "id": 1162,
    "name": "Red bed",
    "category": "utility",
    "side": 878,
    "top": 878,
    "bottom": 878,
    "solid": 1
  },
  {
    "id": 1163,
    "name": "Acacia Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "acacia_boat.png"
  },
  {
    "id": 1164,
    "name": "Acacia Chest Boat",
    "category": "transportation",
    "solid": 0,
    "itemTexture": "acacia_chest_boat.png"
  },
  {
    "id": 1165,
    "name": "Acacia Hanging Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "acacia_hanging_sign.png"
  },
  {
    "id": 1166,
    "name": "Acacia Sign",
    "category": "item",
    "solid": 0,
    "itemTexture": "acacia_sign.png"
  },
  {
    "id": 1167,
    "name": "Amethyst Shard",
    "category": "item",
    "solid": 0,
    "itemTexture": "amethyst_shard.png"
  },
  {
    "id": 1168,
    "name": "Apple",
    "category": "food",
    "solid": 0,
    "itemTexture": "apple.png"
  },
  {
    "id": 1169,
    "name": "Armor Stand",
    "category": "item",
    "solid": 0,
    "itemTexture": "armor_stand.png"
  },
  {
    "id": 1170,
    "name": "Arrow",
    "category": "combat",
    "solid": 0,
    "itemTexture": "arrow.png"
  },
  {
    "id": 1171,
    "name": "Axolotl Bucket",
    "category": "tools",
    "solid": 0,
    "itemTexture": "axolotl_bucket.png"
  },
  {
    "id": 1172,
    "name": "Baked Potato",
    "category": "food",
    "solid": 0,
    "itemTexture": "baked_potato.png"
  },
  {
    "id": 1173,
    "name": "Bamboo Chest Raft",
    "category": "item",
    "solid": 0,
    "itemTexture": "bamboo_chest_raft.png"
  },
  {
    "id": 1174,
    "name": "Oak fence",
    "category": "wood",
    "side": 9,
    "top": 9,
    "bottom": 9,
    "solid": 1,
    "trans": 1,
    "fence": 1
  },
  {
    "id": 1175,
    "name": "Spruce fence",
    "category": "wood",
    "side": 29,
    "top": 29,
    "bottom": 29,
    "solid": 1,
    "trans": 1,
    "fence": 1
  },
  {
    "id": 1176,
    "name": "Birch fence",
    "category": "wood",
    "side": 27,
    "top": 27,
    "bottom": 27,
    "solid": 1,
    "trans": 1,
    "fence": 1
  },
  {
    "id": 1177,
    "name": "Jungle fence",
    "category": "wood",
    "side": 31,
    "top": 31,
    "bottom": 31,
    "solid": 1,
    "trans": 1,
    "fence": 1
  },
  {
    "id": 1178,
    "name": "Acacia fence",
    "category": "wood",
    "side": 33,
    "top": 33,
    "bottom": 33,
    "solid": 1,
    "trans": 1,
    "fence": 1
  },
  {
    "id": 1179,
    "name": "Dark oak fence",
    "category": "wood",
    "side": 34,
    "top": 34,
    "bottom": 34,
    "solid": 1,
    "trans": 1,
    "fence": 1
  },
  {
    "id": 1180,
    "name": "Mangrove fence",
    "category": "wood",
    "side": 558,
    "top": 558,
    "bottom": 558,
    "solid": 1,
    "trans": 1,
    "fence": 1
  },
  {
    "id": 1181,
    "name": "Bamboo fence",
    "category": "wood",
    "side": 165,
    "top": 165,
    "bottom": 165,
    "solid": 1,
    "trans": 1,
    "fence": 1
  },
  {
    "id": 1182,
    "name": "Crimson fence",
    "category": "wood",
    "side": 327,
    "top": 327,
    "bottom": 327,
    "solid": 1,
    "trans": 1,
    "fence": 1
  },
  {
    "id": 1183,
    "name": "Warped fence",
    "category": "wood",
    "side": 839,
    "top": 839,
    "bottom": 839,
    "solid": 1,
    "trans": 1,
    "fence": 1
  },
  {
    "id": 1184,
    "name": "Nether brick fence",
    "category": "nether_end",
    "side": 47,
    "top": 47,
    "bottom": 47,
    "solid": 1,
    "trans": 1,
    "fence": 1
  },
  {
    "id": 1185,
    "name": "Stone Slab",
    "category": "building",
    "side": 3,
    "top": 3,
    "bottom": 3,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "stone.png"
    ]
  },
  {
    "id": 1186,
    "name": "Cobblestone Slab",
    "category": "building",
    "side": 4,
    "top": 4,
    "bottom": 4,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "cobblestone.png"
    ]
  },
  {
    "id": 1187,
    "name": "Mossy Cobblestone Slab",
    "category": "building",
    "side": 60,
    "top": 60,
    "bottom": 60,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "mossy_cobblestone.png"
    ]
  },
  {
    "id": 1188,
    "name": "Stone Brick Slab",
    "category": "building",
    "side": 19,
    "top": 19,
    "bottom": 19,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "stone_bricks.png"
    ]
  },
  {
    "id": 1189,
    "name": "Mossy Stone Brick Slab",
    "category": "building",
    "side": 569,
    "top": 569,
    "bottom": 569,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "mossy_stone_bricks.png"
    ]
  },
  {
    "id": 1190,
    "name": "Granite Slab",
    "category": "building",
    "side": 442,
    "top": 442,
    "bottom": 442,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "granite.png"
    ]
  },
  {
    "id": 1191,
    "name": "Diorite Slab",
    "category": "building",
    "side": 398,
    "top": 398,
    "bottom": 398,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "diorite.png"
    ]
  },
  {
    "id": 1192,
    "name": "Andesite Slab",
    "category": "building",
    "side": 141,
    "top": 141,
    "bottom": 141,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "andesite.png"
    ]
  },
  {
    "id": 1193,
    "name": "Brick Slab",
    "category": "building",
    "side": 59,
    "top": 59,
    "bottom": 59,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "bricks.png"
    ]
  },
  {
    "id": 1194,
    "name": "Sandstone Slab",
    "category": "building",
    "side": 61,
    "top": 62,
    "bottom": 727,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "sandstone.png",
      "sandstone_top.png",
      "sandstone_bottom.png"
    ]
  },
  {
    "id": 1195,
    "name": "Quartz Slab",
    "category": "building",
    "side": 674,
    "top": 675,
    "bottom": 673,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "quartz_block_side.png",
      "quartz_block_top.png",
      "quartz_block_bottom.png"
    ]
  },
  {
    "id": 1196,
    "name": "Nether Brick Slab",
    "category": "nether_end",
    "side": 47,
    "top": 47,
    "bottom": 47,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "nether_bricks.png"
    ]
  },
  {
    "id": 1197,
    "name": "Deepslate Brick Slab",
    "category": "building",
    "side": 374,
    "top": 374,
    "bottom": 374,
    "solid": 1,
    "slab": 1,
    "textureFiles": [
      "deepslate_bricks.png"
    ]
  },
  {
    "id": 1200,
    "name": "High Grass",
    "category": "natural",
    "side": 815,
    "top": 816,
    "bottom": 815,
    "solid": 0,
    "trans": 1,
    "foliage": 1,
    "textureFiles": [
      "tall_grass_bottom.png",
      "tall_grass_top.png"
    ]
  },
  {
    "id": 1201,
    "name": "High Grass (Top)",
    "category": "natural",
    "side": 816,
    "top": 816,
    "bottom": 816,
    "solid": 0,
    "trans": 1,
    "foliage": 1,
    "textureFiles": [
      "tall_grass_top.png"
    ]
  },
  {
    "id": 1202,
    "name": "Tropical Bush",
    "category": "natural",
    "side": 496,
    "top": 497,
    "bottom": 496,
    "solid": 0,
    "trans": 1,
    "foliage": 1,
    "textureFiles": [
      "large_fern_bottom.png",
      "large_fern_top.png"
    ]
  },
  {
    "id": 1203,
    "name": "Tropical Bush (Top)",
    "category": "natural",
    "side": 497,
    "top": 497,
    "bottom": 497,
    "solid": 0,
    "trans": 1,
    "foliage": 1,
    "textureFiles": [
      "large_fern_top.png"
    ]
  },
  {
    "id": 1205,
    "name": "Porch stair (left rail)",
    "category": "wood",
    "side": 890,
    "top": 890,
    "bottom": 890,
    "solid": 1,
    "stair": 1,
    "textureFiles": [
      "porch_block.png"
    ]
  },
  {
    "id": 1206,
    "name": "Porch stair (right rail)",
    "category": "wood",
    "side": 890,
    "top": 890,
    "bottom": 890,
    "solid": 1,
    "stair": 1,
    "textureFiles": [
      "porch_block.png"
    ]
  },
  {
    "id": 1207,
    "name": "Cobweb Sparse",
    "category": "building",
    "side": 299,
    "top": 299,
    "bottom": 299,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "cobweb.png"
    ]
  },
  {
    "id": 1208,
    "name": "Cobweb Dense",
    "category": "building",
    "side": 299,
    "top": 299,
    "bottom": 299,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "cobweb.png"
    ]
  },
  {
    "id": 1209,
    "name": "Spider Egg",
    "category": "item",
    "solid": 0,
    "itemTexture": "spider_eye.png"
  },
  {
    "id": 1210,
    "name": "Mug",
    "category": "decoration",
    "side": 865,
    "top": 865,
    "bottom": 865,
    "solid": 0,
    "trans": 1,
    "textureFiles": [
      "white_terracotta.png"
    ]
  }
];

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
  109: [], 110: [], 111: [], 112: [], 114: [], 115: [], 116: [], 117: [], 118: [], 123: [], // Leaves & foliage
  1200: [{ id: 1200, count: 1 }],
  1201: [{ id: 1200, count: 1 }],
  1202: [{ id: 1202, count: 1 }],
  1203: [{ id: 1202, count: 1 }]
};

export const isSolid = (id: number) => id !== 0 && !!BLOCK_MAP.get(id)?.solid;
export const isOpaque = (id: number) => id !== 0 && !BLOCK_MAP.get(id)?.trans && !BLOCK_MAP.get(id)?.stair && !BLOCK_MAP.get(id)?.slab && !BLOCK_MAP.get(id)?.fence;
export const isStair = (id: number) => id !== 0 && !!BLOCK_MAP.get(id)?.stair;
export const isSlab = (id: number) => id !== 0 && !!BLOCK_MAP.get(id)?.slab;
export const isFence = (id: number) => {
  if (id === 0) return false;
  const b = BLOCK_MAP.get(id);
  if (!b) return false;
  return !!b.fence || (/fence/i.test(b.name) && !/gate|particle/i.test(b.name));
};
export const isItemOnly = (id: number) => {
  const b = BLOCK_MAP.get(id);
  return !!b?.itemTexture || b?.category === "item" || b?.category === "tools" || b?.category === "combat" || b?.category === "food";
};

export const DEFAULT_HOTBAR = [0, 0, 0, 0, 0, 0, 0, 0, 0];

export const BED_ID = 1162;
export const BED_BYTE = 134; // bed stored as this compact id in-world (legacy byte workaround; world data is now 16-bit)
export const BED_TILE = 878;

/**
 * Returns the base durability (mine hold-time in seconds) for a block in survival mode.
 */
export function getBlockDurability(id: number): number {
  const b = BLOCK_MAP.get(id);
  if (!b) return 0.4;
  if (b.durability !== undefined) return b.durability;
  if (id === 14) return Infinity; // Bedrock is unbreakable in survival
  const c = String(b.category);
  if (c === "ores") return 1.15;
  if (c === "building") return 1.25;
  if (c === "natural" && b.solid === 1) return 1.25;
  if (c === "colored" || c === "leaves") return 0.55;
  if (c === "wood" || c === "cloth") return 0.8;
  if (c === "water" || c === "lava" || c === "wheat" || c === "flowers" || c === "plants") return 0.2;
  return 0.7;
}

// ── Tool mining (authentic 2010s vanilla feel) ───────────────────────────────

export type ToolType = "pickaxe" | "axe" | "shovel" | "hoe" | "sword" | "shears";

export interface ToolInfo {
  type: ToolType;
  tierSpeed: number;
  tierLevel: number; // 0 = Wood/Gold, 1 = Stone, 2 = Iron, 3 = Diamond, 4 = Netherite
  maxDurability: number;
}

export interface BlockHarvestReq {
  tool: ToolType;
  minTier: number; // minimum tool tierLevel required to drop the item
}

/** Tool type + tier speed + harvest tier + durability from a held item id (data-driven off BLOCK_MAP names). */
export function getToolInfo(id: number): ToolInfo | null {
  const b = BLOCK_MAP.get(id);
  if (!b) return null;
  const n = String(b.name || "");
  const type: ToolType | null =
    /pickaxe/i.test(n) ? "pickaxe" :
    /shovel/i.test(n) ? "shovel" :
    /shears/i.test(n) ? "shears" :
    /axe/i.test(n) ? "axe" :
    /hoe/i.test(n) ? "hoe" :
    /sword/i.test(n) ? "sword" : null;
  if (!type) return null;

  let tierSpeed = 1;
  let tierLevel = 0;
  let maxDurability = 60;

  if (/wooden/i.test(n)) {
    tierSpeed = 2;
    tierLevel = 0;
    maxDurability = 60;
  } else if (/stone/i.test(n)) {
    tierSpeed = 4;
    tierLevel = 1;
    maxDurability = 132;
  } else if (/iron/i.test(n)) {
    tierSpeed = 6;
    tierLevel = 2;
    maxDurability = 251;
  } else if (/golden/i.test(n)) {
    // 2010 vanilla parity: Gold is fast (12x) but soft (tier 0, low durability 33)
    tierSpeed = 12;
    tierLevel = 0;
    maxDurability = 33;
  } else if (/diamond/i.test(n)) {
    tierSpeed = 8;
    tierLevel = 3;
    maxDurability = 1562;
  } else if (/netherite/i.test(n)) {
    tierSpeed = 9;
    tierLevel = 4;
    maxDurability = 2031;
  } else if (/shears/i.test(n)) {
    tierSpeed = 15;
    tierLevel = 0;
    maxDurability = 238;
  }

  return { type, tierSpeed, tierLevel, maxDurability };
}

/** The tool that mines a block fastest (soft optimization). */
export function getBlockTool(id: number): ToolType | null {
  const b = BLOCK_MAP.get(id);
  if (!b) return null;
  const n = String(b.name || "").toLowerCase();
  const c = String(b.category);
  if (c === "ores") return "pickaxe";
  if (/stone|cobblestone|brick|diorite|andesite|granite|basalt|netherrack|blackstone|obsidian|deepslate|endstone|quartz|concrete|terracotta|sandstone|calcite|tuff|prismarine|furnace|anvil/i.test(n)) return "pickaxe";
  if (c === "wood" || /log|planks|fence|door|trapdoor|chest|sign|stairs|slab|barrel|bookshelf|crafting/i.test(n)) return "axe";
  if (/dirt|sand|gravel|clay|farmland|podzol|mycelium|soul.?sand|grass block|path|snow/i.test(n)) return "shovel";
  if (/crop|wheat|potato|carrot|beet|sapling|flower|tall.?grass|grass|fern|bush|melon|pumpkin|vine|mushroom|kelp/i.test(n)) return "hoe";
  if (/leaves|leaf/i.test(n)) return "shears";
  if (/cobweb/i.test(n)) return "sword";
  return null;
}

/**
 * Minimum tool type and tier level required to harvest a block and drop items (2010 vanilla parity).
 * Returns null if the block can be harvested by hand with no penalty.
 */
export function getBlockHarvestRequirement(id: number): BlockHarvestReq | null {
  const b = BLOCK_MAP.get(id);
  if (!b) return null;
  const n = String(b.name || "").toLowerCase();
  const c = String(b.category);

  // Obsidian, Crying Obsidian, Respawn Anchor, Ancient Debris: Diamond Pickaxe required (Tier 3)
  if (id === 15 || id === 93 || id === 500 || id === 601 || /obsidian|crying|ancient.?debris|respawn.?anchor/i.test(n)) {
    return { tool: "pickaxe", minTier: 3 };
  }

  // Diamond, Gold, Redstone, Emerald ores & mineral blocks: Iron Pickaxe required (Tier 2)
  if (
    /diamond.?ore|gold.?ore|redstone.?ore|emerald.?ore|diamond.?block|gold.?block|emerald.?block|netherite.?block/i.test(n) ||
    id === 32 || id === 33 || id === 35 || id === 36 || id === 501
  ) {
    return { tool: "pickaxe", minTier: 2 };
  }

  // Iron ore/block, Lapis ore/block, Copper: Stone Pickaxe required (Tier 1)
  if (
    /iron.?ore|lapis.?ore|lapis.?lazuli.?ore|copper.?ore|iron.?block|lapis.?block|copper.?block/i.test(n) ||
    id === 31 || id === 34
  ) {
    return { tool: "pickaxe", minTier: 1 };
  }

  // General stone, cobblestone, coal ore, sandstone, netherrack, bricks, furnace: Any Pickaxe (Tier 0)
  if (
    c === "ores" ||
    /stone|cobblestone|brick|diorite|andesite|granite|basalt|netherrack|blackstone|deepslate|endstone|quartz|concrete|terracotta|sandstone|calcite|tuff|prismarine|furnace|anvil|coal.?ore/i.test(n) ||
    id === 5 || id === 6 || id === 8 || id === 11 || id === 30 || id === 42
  ) {
    return { tool: "pickaxe", minTier: 0 };
  }

  // Snow block / layer requires shovel to harvest
  if (/snow.?block|snow.?layer/i.test(n) || id === 84) {
    return { tool: "shovel", minTier: 0 };
  }

  // Cobweb requires sword or shears
  if (/cobweb/i.test(n) || id === 40) {
    return { tool: "sword", minTier: 0 };
  }

  // Soft blocks (dirt, sand, wood logs/planks, foliage, torches) do not require tools to drop
  return null;
}

/** Tool a block REQUIRES to drop (null = hand is fine). Backwards-compatible helper. */
export function getBlockRequiredTool(id: number): ToolType | null {
  const req = getBlockHarvestRequirement(id);
  return req ? req.tool : null;
}

/**
 * Returns true if the currently held item meets the harvest requirements for this block.
 * In 2010 vanilla Minecraft, if this is false, the block drops NOTHING when broken.
 */
export function canHarvestBlock(id: number, heldId: number): boolean {
  const req = getBlockHarvestRequirement(id);
  if (!req) return true; // Hand or any item is fine for harvesting soft blocks
  const tool = getToolInfo(heldId);
  if (!tool) return false;
  // Shears can also harvest cobweb
  if (req.tool === "sword" && tool.type === "shears") return true;
  if (tool.type !== req.tool) return false;
  return tool.tierLevel >= req.minTier;
}

/** True if the held item is the wrong tool / tier for mining this block (survival drop gate). */
export function isWrongTool(id: number, heldId: number): boolean {
  return !canHarvestBlock(id, heldId);
}

/**
 * Authentic 2010 vanilla block hardness table.
 * Reference: Obsidian = 50.0, Ores = 3.0, Cobblestone = 2.0, Stone = 1.5, Dirt = 0.5.
 */
export function getBlockHardness(id: number): number {
  if (id === 14) return Infinity; // Bedrock is unbreakable in survival
  const b = BLOCK_MAP.get(id);
  if (!b) return 0.5;
  const n = String(b.name || "").toLowerCase();
  const c = String(b.category);

  // Obsidian & heavy materials (takes 9.375s with Diamond Pickaxe, 250s without)
  if (id === 15 || id === 93 || /obsidian|crying/i.test(n)) return 50.0;
  if (id === 500 || /ancient.?debris/i.test(n)) return 30.0;
  if (id === 601 || /respawn.?anchor/i.test(n)) return 22.5;

  // Mineral Blocks (Iron, Gold, Diamond blocks)
  if (/iron.?block|gold.?block|diamond.?block|emerald.?block|netherite.?block/i.test(n)) return 5.0;

  // Furnaces, dispensers, chests, crafting tables
  if (id === 42 || /furnace|dispenser|dropper/i.test(n)) return 3.5;
  if (id === 43 || id === 41 || /chest|crafting/i.test(n)) return 2.5;

  // Ores (Coal, Iron, Gold, Redstone, Lapis, Diamond, Emerald)
  if (c === "ores" || /ore/i.test(n)) return 3.0;

  // Cobblestone, wood logs, planks, wooden structures
  if (id === 6 || /cobblestone/i.test(n)) return 2.0;
  if (c === "wood" || /log|planks|fence|door|gate|trapdoor|stairs|slab/i.test(n)) return 2.0;

  // Stone, stone bricks, diorite, andesite, granite
  if (id === 5 || id === 8 || /stone|brick|andesite|granite|diorite|deepslate|calcite|tuff/i.test(n)) return 1.5;

  // Sandstone
  if (id === 11 || /sandstone/i.test(n)) return 0.8;

  // Dirt, grass, path, farmland
  if (/dirt|grass block|path|farmland|podzol|mycelium|soul.?sand|soul soil/i.test(n)) return 0.5;

  // Sand, gravel, clay
  if (/sand|gravel|clay/i.test(n)) return 0.6;

  // Netherrack
  if (id === 90 || /netherrack/i.test(n)) return 0.4;

  // Glass
  if (id === 37 || id === 38 || /glass/i.test(n)) return 0.3;

  // Leaves & wool/cloth
  if (/leaves|leaf/i.test(n)) return 0.2;
  if (c === "colored" || c === "cloth" || /wool/i.test(n)) return 0.8;

  // Instant or near-instant break: torches, flowers, plants, saplings, redstone wire
  if (b.trans || c === "plants" || c === "flowers" || c === "wheat" || /torch|sapling|flower|grass|fern|crop|seed|redstone/i.test(n)) return 0.05;

  return 1.5;
}

/**
 * Authentic 2010 vanilla survival mining time (seconds):
 * - If can harvest: time = (hardness × 1.5) / speedMultiplier
 * - If cannot harvest: time = hardness × 5.0 (penalty rate, no tool speed bonus)
 */
export function getMineTime(id: number, heldId: number): number {
  const hardness = getBlockHardness(id);
  if (!Number.isFinite(hardness)) return Infinity;
  if (hardness <= 0.05) return 0.05;

  const canHarvest = canHarvestBlock(id, heldId);
  const tool = getToolInfo(heldId);
  const optimal = getBlockTool(id);

  if (canHarvest) {
    const isOptimal = optimal != null && tool != null && tool.type === optimal;
    let speed = 1.0;
    if (isOptimal && tool) {
      speed = tool.tierSpeed;
    } else if (tool && tool.type === "shears" && /leaves|leaf/i.test(String(BLOCK_MAP.get(id)?.name || ""))) {
      speed = 15.0;
    } else if (tool && tool.type === "sword" && /leaves|leaf|cobweb/i.test(String(BLOCK_MAP.get(id)?.name || ""))) {
      speed = 1.5;
    }
    return Math.max(0.05, (hardness * 1.5) / speed);
  } else {
    // 2010 vanilla penalty: hardness × 5.0 (wrong tool or bare hand on stone/ores)
    return Math.max(0.05, hardness * 5.0);
  }
}

/**
 * Authentic 2010 vanilla item drops when a block is broken in Survival.
 * - If cannot harvest: drops nothing.
 * - Leaves: drops leaf block with shears, 10% chance for sapling by hand/other.
 * - Ores: drops Diamond/Coal/Redstone/Lapis items directly; Iron/Gold drop ore blocks.
 */
export function getBlockDrops(id: number, heldId: number): Array<{ id: number; count: number }> {
  // If the block requires a tool tier that the player doesn't have: drop NOTHING!
  if (!canHarvestBlock(id, heldId)) {
    return [];
  }

  const b = BLOCK_MAP.get(id);
  const n = String(b?.name || "").toLowerCase();
  const tool = getToolInfo(heldId);

  // Leaves & foliage:
  if (/leaves|leaf/i.test(n)) {
    if (tool && tool.type === "shears") {
      return [{ id, count: 1 }];
    }
    // 10% chance to drop Oak Sapling (id 504)
    if (Math.random() < 0.12) {
      return [{ id: 504, count: 1 }];
    }
    return [];
  }

  // Diamond Ore -> Diamond item (9825)
  if (id === 35 || /diamond.?ore/i.test(n)) {
    return [{ id: 9825, count: 1 }];
  }

  // Coal Ore -> Coal item (9405)
  if (id === 30 || /coal.?ore/i.test(n)) {
    return [{ id: 9405, count: 1 }];
  }

  // Redstone Ore -> 4-5 Redstone Dust (11435)
  if (id === 33 || /redstone.?ore/i.test(n)) {
    const count = 4 + Math.floor(Math.random() * 2);
    return [{ id: 11435, count }];
  }

  // Lapis Lazuli Ore -> 4-8 Lapis Lazuli (10434)
  if (id === 34 || /lapis.?ore/i.test(n)) {
    const count = 4 + Math.floor(Math.random() * 5);
    return [{ id: 10434, count }];
  }

  // Standard lookup from BLOCK_DROPS or self
  if (BLOCK_DROPS[id] !== undefined) {
    return BLOCK_DROPS[id];
  }

  return [{ id, count: 1 }];
}

