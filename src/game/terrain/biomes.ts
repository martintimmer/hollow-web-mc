import { SEA, SNOWLINE } from "../world";

export interface BiomeInfo {
  id: string;
  name: string;
  leafId: number;
  woodId: number;
  tree: string;
  density: number;
  mapCol: [number, number, number];
  grassCol?: [number, number, number];
  foliageCol?: [number, number, number];
  topBlock?: number;
  subBlock?: number;
}

interface BiomeEntry extends BiomeInfo {
  targetT: number;
  targetH: number;
  minElev?: number;
  maxElev?: number;
}

export const BIOME_TARGETS: BiomeEntry[] = [
  // Freezing & Sub-Zero Polar Climate
  {
    id: "spruce",
    name: "❄️ Snowy Spruce Taiga",
    leafId: 24,
    woodId: 22,
    tree: "spruce",
    density: 0.018,
    mapCol: [43, 84, 63],
    grassCol: [0.53, 0.72, 0.51],
    foliageCol: [0.53, 0.72, 0.51],
    topBlock: 54,
    subBlock: 2,
    targetT: 0.07,
    targetH: 0.25
  },
  {
    id: "redwood",
    name: "🌲 Giant Redwood Taiga",
    leafId: 24,
    woodId: 122,
    tree: "redwood",
    density: 0.011,
    mapCol: [27, 67, 50],
    grassCol: [0.53, 0.72, 0.51],
    foliageCol: [0.45, 0.65, 0.40],
    topBlock: 1,
    subBlock: 2,
    targetT: 0.30,
    targetH: 0.80
  },

  // Autumn & Seasonal Foliage Woods
  {
    id: "crimson_maple",
    name: "🍁 Crimson Maple Forest",
    leafId: 110,
    woodId: 120,
    tree: "crimson",
    density: 0.015,
    mapCol: [216, 40, 29],
    grassCol: [0.60, 0.70, 0.32],
    foliageCol: [0.85, 0.16, 0.11],
    topBlock: 1,
    subBlock: 2,
    targetT: 0.38,
    targetH: 0.30
  },
  {
    id: "golden_aspen",
    name: "🍂 Golden Aspen Woods",
    leafId: 111,
    woodId: 23,
    tree: "aspen",
    density: 0.014,
    mapCol: [245, 183, 0],
    grassCol: [0.62, 0.72, 0.30],
    foliageCol: [0.96, 0.72, 0.00],
    topBlock: 1,
    subBlock: 2,
    targetT: 0.58,
    targetH: 0.26
  },

  // Temperate Lush Woodlands, Plains & Glades
  {
    id: "birch",
    name: "🪵 White Birch Woods",
    leafId: 116,
    woodId: 23,
    tree: "birch",
    density: 0.014,
    mapCol: [112, 224, 0],
    grassCol: [0.53, 0.73, 0.40],
    foliageCol: [0.50, 0.65, 0.33],
    topBlock: 1,
    subBlock: 2,
    targetT: 0.44,
    targetH: 0.62
  },
  {
    id: "dark_oak",
    name: "🌲 Dark Roofed Forest",
    leafId: 115,
    woodId: 297,
    tree: "dark_oak",
    density: 0.024,
    mapCol: [8, 28, 21],
    grassCol: [0.31, 0.48, 0.20],
    foliageCol: [0.28, 0.45, 0.15],
    topBlock: 1,
    subBlock: 2,
    targetT: 0.48,
    targetH: 0.88
  },
  {
    id: "oak_forest",
    name: "🌳 Classic Oak Woodland",
    leafId: 18,
    woodId: 16,
    tree: "oak",
    density: 0.012,
    mapCol: [64, 145, 108],
    grassCol: [0.47, 0.75, 0.35],
    foliageCol: [0.37, 0.65, 0.20],
    topBlock: 1,
    subBlock: 2,
    targetT: 0.50,
    targetH: 0.50
  },
  {
    id: "plains",
    name: "🌾 Sunflower Plains",
    leafId: 18,
    woodId: 16,
    tree: "oak",
    density: 0.003,
    mapCol: [104, 157, 74],
    grassCol: [0.57, 0.74, 0.35],
    foliageCol: [0.47, 0.67, 0.18],
    topBlock: 1,
    subBlock: 2,
    targetT: 0.68,
    targetH: 0.42
  },
  {
    id: "meadow",
    name: "🌺 Flowering Blossom Meadow",
    leafId: 109,
    woodId: 19,
    tree: "meadow",
    density: 0.005,
    mapCol: [255, 140, 180],
    grassCol: [0.51, 0.73, 0.43],
    foliageCol: [0.38, 0.72, 0.30],
    topBlock: 1,
    subBlock: 2,
    targetT: 0.52,
    targetH: 0.55,
    minElev: SEA + 5,
    maxElev: SEA + 24
  },

  // Warm, Tropical, Desert & Wetlands
  {
    id: "swamp",
    name: "🌿 Murky Swampland",
    leafId: 18,
    woodId: 16,
    tree: "oak",
    density: 0.012,
    mapCol: [50, 119, 29],
    grassCol: [0.41, 0.44, 0.22],
    foliageCol: [0.41, 0.44, 0.22],
    topBlock: 490,
    subBlock: 256,
    targetT: 0.76,
    targetH: 0.85,
    maxElev: SEA + 6
  },
  {
    id: "mangrove",
    name: "🌿 Mangrove Swamp",
    leafId: 117,
    woodId: 481,
    tree: "mangrove",
    density: 0.016,
    mapCol: [82, 121, 111],
    grassCol: [0.42, 0.46, 0.23],
    foliageCol: [0.55, 0.69, 0.15],
    topBlock: 490,
    subBlock: 256,
    targetT: 0.82,
    targetH: 0.88,
    maxElev: SEA + 5
  },
  {
    id: "bamboo",
    name: "🎋 Bamboo Jungle & Palms",
    leafId: 114,
    woodId: 113,
    tree: "bamboo",
    density: 0.022,
    mapCol: [56, 176, 0],
    grassCol: [0.35, 0.79, 0.24],
    foliageCol: [0.19, 0.60, 0.13],
    topBlock: 1,
    subBlock: 2,
    targetT: 0.80,
    targetH: 0.72
  },
  {
    id: "jungle",
    name: "🌴 Lush Tropical Jungle",
    leafId: 114,
    woodId: 25,
    tree: "jungle",
    density: 0.018,
    mapCol: [34, 139, 34],
    grassCol: [0.35, 0.79, 0.24],
    foliageCol: [0.19, 0.60, 0.13],
    topBlock: 1,
    subBlock: 2,
    targetT: 0.79,
    targetH: 0.95
  },
  {
    id: "savanna",
    name: "🌾 Acacia Savanna",
    leafId: 118,
    woodId: 143,
    tree: "acacia",
    density: 0.006,
    mapCol: [138, 154, 91],
    grassCol: [0.75, 0.72, 0.33],
    foliageCol: [0.68, 0.64, 0.16],
    topBlock: 1,
    subBlock: 2,
    targetT: 0.84,
    targetH: 0.36
  },
  {
    id: "badlands",
    name: "🏜️ Terracotta Badlands",
    leafId: 18,
    woodId: 16,
    tree: "none",
    density: 0.000,
    mapCol: [216, 127, 51],
    grassCol: [0.56, 0.51, 0.30],
    foliageCol: [0.62, 0.51, 0.30],
    topBlock: 584,
    subBlock: 585,
    targetT: 0.92,
    targetH: 0.20,
    minElev: SEA + 5
  },
  {
    id: "desert",
    name: "🏜️ Arid Desert Dunes",
    leafId: 114,
    woodId: 25,
    tree: "palm",
    density: 0.001,
    mapCol: [218, 196, 134],
    grassCol: [0.75, 0.72, 0.33],
    foliageCol: [0.68, 0.64, 0.16],
    topBlock: 10,
    subBlock: 11,
    targetT: 0.94,
    targetH: 0.08
  },
  {
    id: "desert_palm",
    name: "🌴 Desert Oasis Palms",
    leafId: 114,
    woodId: 25,
    tree: "palm",
    density: 0.004,
    mapCol: [45, 106, 79],
    grassCol: [0.75, 0.72, 0.33],
    foliageCol: [0.68, 0.64, 0.16],
    topBlock: 10,
    subBlock: 11,
    targetT: 0.94,
    targetH: 0.14
  }
];

export function sampleBiome(
  _x: number,
  _z: number,
  elev: number,
  tempNoise: number,
  humNoise: number,
  wNoise: number,
  fDensity: number
): BiomeInfo {
  // 1. Rare Mystical Warped Biome Pockets
  if (wNoise > 0.84) {
    return {
      id: "warped",
      name: "🔮 Mystic Warped Forest",
      leafId: 112,
      woodId: 121,
      tree: "warped",
      density: 0.016,
      mapCol: [123, 44, 191],
      grassCol: [0.10, 0.58, 0.58],
      foliageCol: [0.10, 0.58, 0.58],
      topBlock: 112,
      subBlock: 121
    };
  }

  // 2. Sub-zero Polar Pocket: Glacial Ice Spikes
  if (tempNoise < 0.34 && wNoise > 0.75) {
    return {
      id: "ice_spikes",
      name: "❄️ Glacial Ice Spikes",
      leafId: 24,
      woodId: 16,
      tree: "ice_spike",
      density: 0.008,
      mapCol: [170, 198, 232],
      grassCol: [0.50, 0.71, 0.59],
      foliageCol: [0.50, 0.65, 0.33],
      topBlock: 51,
      subBlock: 53
    };
  }

  // 3. High Mountain Summits: Differentiated by Climate
  // Warm Stony Peaks (exposed rock, mineral veins, snow-free)
  if (elev >= 95 && tempNoise > 0.55 && (fDensity > 0.55 || wNoise < 0.32)) {
    return {
      id: "stony_peaks",
      name: "🪨 Stony Mountain Peaks",
      leafId: 18,
      woodId: 16,
      tree: "none",
      density: 0,
      mapCol: [154, 154, 154],
      grassCol: [0.60, 0.75, 0.29],
      foliageCol: [0.45, 0.65, 0.25],
      topBlock: 5,
      subBlock: 5
    };
  }

  // 4. Frozen Peaks cap the highest cold summits; Jagged Peaks cover the rest
  if (elev >= 107 && tempNoise < 0.38) {
    return {
      id: "frozen_peaks",
      name: "🧊 Frozen Glacier Peaks",
      leafId: 24,
      woodId: 16,
      tree: "none",
      density: 0,
      mapCol: [243, 246, 250],
      grassCol: [0.50, 0.71, 0.59],
      foliageCol: [0.50, 0.65, 0.33],
      topBlock: 51,
      subBlock: 53
    };
  }

  if (elev >= 100 && tempNoise < 0.40) {
    return {
      id: "jagged_peaks",
      name: "🏔️ Jagged Mountain Peaks",
      leafId: 24,
      woodId: 22,
      tree: "alpine",
      density: 0.003,
      mapCol: [140, 140, 140],
      grassCol: [0.50, 0.71, 0.59],
      foliageCol: [0.50, 0.65, 0.33],
      topBlock: 51,
      subBlock: 5
    };
  }

  // 5. High Alpine Mountain Peaks
  if (elev >= SNOWLINE + 2) {
    return {
      id: "alpine",
      name: "🏔️ Alpine Dwarf Pines",
      leafId: 24,
      woodId: 22,
      tree: "alpine",
      density: 0.005,
      mapCol: [19, 42, 19],
      grassCol: [0.50, 0.71, 0.59],
      foliageCol: [0.50, 0.65, 0.33],
      topBlock: 51,
      subBlock: 52
    };
  }

  // 6. Cherry Blossom Highlands
  if (elev >= SEA + 14 && tempNoise > 0.35 && tempNoise < 0.65 && humNoise > 0.45 && humNoise < 0.75 && wNoise > 0.55) {
    return {
      id: "cherry",
      name: "🌸 Cherry Blossom Grove",
      leafId: 109,
      woodId: 119,
      tree: "cherry",
      density: 0.014,
      mapCol: [255, 183, 213],
      grassCol: [0.71, 0.86, 0.38],
      foliageCol: [0.95, 0.65, 0.80],
      topBlock: 1,
      subBlock: 2
    };
  }

  // 7. Voronoi Distance Partitioning for Vast Contiguous Biome Territories
  let bestBiome = BIOME_TARGETS[0];
  let bestDist = Infinity;

  for (let i = 0; i < BIOME_TARGETS.length; i++) {
    const b = BIOME_TARGETS[i];
    if (b.minElev !== undefined && elev < b.minElev) continue;
    if (b.maxElev !== undefined && elev > b.maxElev) continue;

    const dt = tempNoise - b.targetT;
    const dh = humNoise - b.targetH;
    const dist = dt * dt + dh * dh;

    if (dist < bestDist) {
      bestDist = dist;
      bestBiome = b;
    }
  }

  return {
    id: bestBiome.id,
    name: bestBiome.name,
    leafId: bestBiome.leafId,
    woodId: bestBiome.woodId,
    tree: bestBiome.tree,
    density: bestBiome.id === "oak_forest" ? (fDensity > 0.5 ? 0.016 : 0.008) : bestBiome.density,
    mapCol: bestBiome.mapCol,
    grassCol: bestBiome.grassCol,
    foliageCol: bestBiome.foliageCol,
    topBlock: bestBiome.topBlock,
    subBlock: bestBiome.subBlock
  };
}

const SPECIAL_TINTS: Record<string, { grass: [number, number, number]; foliage: [number, number, number] }> = {
  warped: { grass: [0.10, 0.58, 0.58], foliage: [0.10, 0.58, 0.58] },
  ice_spikes: { grass: [0.50, 0.71, 0.59], foliage: [0.50, 0.65, 0.33] },
  stony_peaks: { grass: [0.60, 0.75, 0.29], foliage: [0.45, 0.65, 0.25] },
  jagged_peaks: { grass: [0.50, 0.71, 0.59], foliage: [0.50, 0.65, 0.33] },
  alpine: { grass: [0.50, 0.71, 0.59], foliage: [0.50, 0.65, 0.33] },
  frozen_peaks: { grass: [0.50, 0.71, 0.59], foliage: [0.50, 0.65, 0.33] },
  cherry: { grass: [0.71, 0.86, 0.38], foliage: [0.95, 0.65, 0.80] },
};

export function getBiomeColorTint(biomeId?: string): { grass: [number, number, number]; foliage: [number, number, number] } {
  if (biomeId) {
    const found = BIOME_TARGETS.find((b) => b.id === biomeId);
    if (found && found.grassCol && found.foliageCol) {
      return { grass: found.grassCol, foliage: found.foliageCol };
    }
    const special = SPECIAL_TINTS[biomeId];
    if (special) return special;
  }
  // Default Plains colormap tint
  return { grass: [0.57, 0.74, 0.35], foliage: [0.47, 0.67, 0.18] };
}

export interface BlurredTints {
  grass: Array<[number, number, number]>;
  foliage: Array<[number, number, number]>;
}

export function blurBiomeTints(grid: string[], halo?: string[]): BlurredTints {
  const at = (lx: number, lz: number): string => {
    if (halo && halo.length === 324) return halo[(lz + 1) * 18 + (lx + 1)] ?? grid[lz * 16 + lx];
    const cx = Math.max(0, Math.min(15, lx)), cz = Math.max(0, Math.min(15, lz));
    return grid[cz * 16 + cx] ?? "plains";
  };
  const grass: Array<[number, number, number]> = new Array(256);
  const foliage: Array<[number, number, number]> = new Array(256);
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      let gr = 0, gg = 0, gb = 0, fr = 0, fg = 0, fb = 0;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const t = getBiomeColorTint(at(lx + dx, lz + dz));
          gr += t.grass[0]; gg += t.grass[1]; gb += t.grass[2];
          fr += t.foliage[0]; fg += t.foliage[1]; fb += t.foliage[2];
        }
      }
      grass[lz * 16 + lx] = [gr / 9, gg / 9, gb / 9];
      foliage[lz * 16 + lx] = [fr / 9, fg / 9, fb / 9];
    }
  }
  return { grass, foliage };
}

export function getBlockTint(
  blockId: number,
  isTopFace: boolean,
  grassTint: [number, number, number],
  foliageTint: [number, number, number]
): [number, number, number] | null {
  // 1. Grass block top face (pure grayscale grass_block_top.png)
  if (blockId === 1 && isTopFace) return grassTint;
  // 2. Grass billboards (short/tall grass, ferns, sugar cane, tropical bushes)
  // Note: Dandelion (125) and Poppy (126) flowers are excluded to preserve petal colors!
  if (blockId === 124 || blockId === 1200 || blockId === 1201 || blockId === 361 || blockId === 429 || blockId === 658 || blockId === 1202 || blockId === 1203) {
    return grassTint;
  }
  // 3. Lily Pad (457) - vanilla constant #208030
  if (blockId === 457) return [0.13, 0.50, 0.19];
  // 4. Foliage taking biome foliage colormap: Oak (18), Jungle (114), Dark Oak (115), Acacia (118), Mangrove (480), Vines (674), Hanging vine strands (690, 672, 237)
  if (blockId === 18 || blockId === 114 || blockId === 115 || blockId === 118 || blockId === 480 || blockId === 674 || blockId === 690 || blockId === 672 || blockId === 237) {
    return foliageTint;
  }
  // 5. Birch leaves (116) - invariant pastel olive
  if (blockId === 116) return [0.50, 0.65, 0.33];
  // 6. Spruce leaves (24) - invariant cool spruce pine
  if (blockId === 24) return [0.38, 0.60, 0.38];
  return null;
}

