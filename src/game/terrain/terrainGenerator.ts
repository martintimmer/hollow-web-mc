import { CH, CHH, SEA, SNOWLINE } from "../world";
import type { WorldType, Chunk } from "../world";
import { makeNoise } from "../noise";
import { sampleBiome, BIOME_TARGETS } from "./biomes";
import type { GameState } from "../state/gameState";
import { BLOCK_MAP } from "../blocks";
import { ckey } from "../world/chunkData";
import { perf } from "../telemetry";
import { STYLES } from "./structures";
import { generateSunkenShipwreck, generateCoralReef, generateKelpForest } from "./ocean";
import {
  generateCherryTree,
  generateCrimsonMapleTree,
  generateGoldenAspenTree,
  generateWarpedTree,
  generateBambooGroves,
  generateRedwoodTree,
  generateDarkOakTree,
  generateHugeMushroom,
  generateBirchTree,
  generateMangroveTree,
  generateAcaciaTree,
  generateJungleTree,
  generatePalmTree,
  generateMeadowTree,
  generateAlpinePine,
  generateIceSpike,
  generateCactus,
  generateSwampOak,
  generateOakTree,
  generateCustomTree
} from "./trees";

export const REGION = 256;

const FIELD_FLOWERS = [125, 126, 147, 157, 269, 456, 516, 517, 521, 530, 590, 659, 701];
const FOREST_FLOWERS = [125, 126, 147, 157, 456, 517];
const SWAMP_FLOWERS = [201, 157, 456, 125];

export interface VillageData {
  vx: number;
  vz: number;
  base: number;
  r: number;
  id: string;
  home: boolean;
  name: string;
}

export interface VillagePen {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  base: number;
  cx: number;
  cz: number;
}

export interface VillagePlan {
  v: VillageData;
  base: number;
  roads: Array<{ x0: number; z0: number; x1: number; z1: number }>;
  houses: any[];
  lamps: Array<[number, number]>;
  wells: Array<[number, number]>;
  gardens: Array<[number, number, number, number]>;
  pens: VillagePen[];
  home: any | null;
  bx0: number;
  bz0: number;
  bx1: number;
  bz1: number;
}

export interface SurfaceInfo {
  h: number;
  top: number;
  sub: number;
  cold: boolean;
  frozen: boolean;
  dry: boolean;
  slope: number;
}

export const VILLAGE_PREFIXES = [
  "Oak", "Pine", "Sun", "River", "Ember", "Frost", "Gold", "Silver", "Shadow",
  "Emerald", "Moss", "Maple", "Stone", "Breeze", "Autumn", "Cedar", "Wild",
  "Crystal", "Meadow", "High", "Birch", "Redwood", "Whispering"
];

export const VILLAGE_SUFFIXES = [
  "vale", "wood", "dale", "ford", "fall", "peak", "haven", "shire", "bend",
  "crest", "glade", "ridge", "brook", "field", "hollow", "stead", "cross",
  "town", "burg", "port"
];

export const VILLAGE_TYPES = ["Village", "Hamlet", "Settlement", "Town", "Outpost", "Colony"];

export function generateVillageName(vx: number, vz: number): string {
  const h1 = Math.abs(Math.sin(vx * 12.9898 + vz * 78.233) * 43758.5453);
  const h2 = Math.abs(Math.sin(vx * 39.346 + vz * 11.135) * 23421.631);
  const h3 = Math.abs(Math.sin(vx * 93.12 + vz * 67.45) * 56789.123);
  const p = VILLAGE_PREFIXES[Math.floor(h1) % VILLAGE_PREFIXES.length];
  const s = VILLAGE_SUFFIXES[Math.floor(h2) % VILLAGE_SUFFIXES.length];
  const t = VILLAGE_TYPES[Math.floor(h3) % VILLAGE_TYPES.length];
  return `${p}${s} ${t}`;
}

export function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

const RING3: Array<[number, number]> = [
  [-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [-2, 2], [2, -2], [2, 2],
  [-3, 0], [3, 0], [0, -3], [0, 3]
];

export function minRingHeight(x: number, z: number, heightFn: (x: number, z: number) => number): number {
  let m = heightFn(x, z);
  for (const [dx, dz] of RING3) {
    const h = heightFn(x + dx, z + dz);
    if (h < m) m = h;
  }
  return m;
}

const FROZEN_LOWLAND = new Set(["ice_spikes", "spruce"]);
const WARM_LOWLAND = new Set(["desert", "desert_palm", "badlands", "savanna"]);

export type UnderwaterFlora = "coral" | "kelp" | "seagrass" | "tallgrass" | "pickle" | null;

export function chooseUnderwaterFlora(
  biomeId: string | undefined,
  tm: number,
  frozen: boolean,
  depth: number,
  isRiver: boolean,
  r: () => number
): UnderwaterFlora {
  if (frozen || depth < 1) return null;
  if (isRiver) return r() < 0.08 ? "seagrass" : null;
  if (biomeId === "swamp") return r() < 0.05 ? "seagrass" : null;
  if (tm > 0.62) {
    if (depth >= 3 && depth <= 10 && r() < 0.04) return "coral";
    if (depth >= 2 && depth <= 6 && r() < 0.03) return "pickle";
    if (depth >= 1 && depth <= 8 && r() < 0.10) return "seagrass";
    return null;
  }
  if (depth >= 3 && r() < 0.06) return "kelp";
  if (depth >= 8 && r() < 0.04) return "tallgrass";
  if (depth >= 1 && depth <= 12 && r() < 0.12) return "seagrass";
  return null;
}

export function applyTransitionBand(
  sampledId: string | undefined,
  t: number,
  hum: number,
  elev: number,
  fDensity: number
): ReturnType<typeof temperateFallback> | null {
  if (elev >= SEA + 10 || !sampledId) return null;
  if ((FROZEN_LOWLAND.has(sampledId) && t > 0.38) || (WARM_LOWLAND.has(sampledId) && t < 0.62)) {
    return temperateFallback(hum, fDensity);
  }
  return null;
}

export const TREE_CELL = 7;

export function treeCellCandidate(ccx: number, ccz: number, hx: number, hz: number): { x: number; z: number } {
  return {
    x: ccx * TREE_CELL + 1 + Math.floor(hx * 5),
    z: ccz * TREE_CELL + 1 + Math.floor(hz * 5)
  };
}

export function temperateFallback(hum: number, fDensity: number) {
  const id = hum >= 0.55 ? "oak_forest" : (hum >= 0.35 ? "birch" : "plains");
  const found = BIOME_TARGETS.find((b) => b.id === id) ?? BIOME_TARGETS[0];
  return {
    id: found.id,
    name: found.name,
    leafId: found.leafId,
    woodId: found.woodId,
    tree: found.tree,
    density: found.id === "oak_forest" ? (fDensity > 0.5 ? 0.016 : 0.008) : found.density,
    mapCol: found.mapCol,
    grassCol: found.grassCol,
    foliageCol: found.foliageCol,
    topBlock: found.topBlock,
    subBlock: found.subBlock
  };
}

export function splineContinental(C: number): number {
  if (C < -0.45) return -22.0; // Deep Ocean Trench
  if (C < -0.05) return -22.0 + smoothstep((C + 0.45) / 0.40) * 22.0; // Ocean -> Coast (y = SEA)
  if (C < 0.35) return smoothstep((C + 0.05) / 0.40) * 18.0; // Lowlands -> Rolling Plateaus
  return 18.0 + smoothstep((C - 0.35) / 0.45) * 24.0; // Continental Highlands
}

export function splineErosion(E: number): number {
  if (E < -0.40) return 2.2; // Low erosion: high vertical relief
  if (E < 0.30) return 2.2 - smoothstep((E + 0.40) / 0.70) * 1.35; // Moderate: rolling hills
  return 0.85 - smoothstep((E - 0.30) / 0.50) * 0.70; // High erosion: flat floodplains
}

export function createTerrainContext(
  getSeedMix: () => number,
  getWorld: () => WorldType,
  heightCache: Map<string, number>,
  regionCache: Map<string, any>
) {
  const { hash2, hash3, vnoise, vnoise3D, ridge } = makeNoise(getSeedMix);

  const continentalAt = (x: number, z: number) => {
    const w = getWorld();
    return (vnoise(x / (680 * w.scale) + 71, z / (680 * w.scale) - 103) - 0.5) * 2.0;
  };

  // Regional variation fields: low-frequency seed-deterministic noise that makes
  // different areas of the single standard world feel like different terrain
  // types (amplified ranges, calm lowlands, frozen pockets, inland seas).
  const regionReliefAt = (x: number, z: number) =>
    0.45 + 1.65 * smoothstep((vnoise(x / 1300 + 501, z / 1300 - 337) - 0.28) / 0.55);
  const regionHillAt = (x: number, z: number) =>
    0.6 + 0.9 * vnoise(x / 950 + 131, z / 950 - 71);
  const regionTempAt = (x: number, z: number) =>
    (vnoise(x / 1700 + 911, z / 1700 - 217) - 0.5) * 0.36;
  const regionHumAt = (x: number, z: number) =>
    (vnoise(x / 1500 - 453, z / 1500 + 681) - 0.5) * 0.30;
  const regionSeaAt = (x: number, z: number) =>
    smoothstep((vnoise(x / 2100 + 777, z / 2100 - 911) - 0.64) / 0.10);

  const erosionAt = (x: number, z: number) => {
    const w = getWorld();
    return (vnoise(x / (450 * w.scale) - 211, z / (450 * w.scale) + 389) - 0.5) * 2.0;
  };

  const riverWarpX = (x: number, z: number) =>
    (vnoise(x / 1000 + 31, z / 1000 - 77) - 0.5) * 180 +
    Math.sin(z / 700 + vnoise(x / 900 - 51, z / 900 + 63) * 4.0) * 55;
  const riverWarpZ = (x: number, z: number) =>
    (vnoise(x / 1000 - 67, z / 1000 + 43) - 0.5) * 180 +
    Math.sin(x / 760 + vnoise(x / 950 + 17, z / 950 - 29) * 4.0) * 55;

  const riverTrunkAt = (x: number, z: number) => {
    const w = getWorld();
    const S = w.scale;
    return Math.abs(vnoise((x + riverWarpX(x, z)) / (560 * S) + 53, (z + riverWarpZ(x, z)) / (560 * S) - 89) - 0.5) * 2.0;
  };

  const riverTribAt = (x: number, z: number) => {
    const w = getWorld();
    const S = w.scale;
    return Math.abs(vnoise(x / (210 * S) - 141, z / (210 * S) + 67) - 0.5) * 2.0;
  };

  const dischargeAt = (x: number, z: number) =>
    smoothstep((vnoise(x / 1100 + 901, z / 1100 - 117) - 0.30) / 0.55);

  const riverWidthAt = (x: number, z: number) => 4 + 30 * Math.pow(dischargeAt(x, z), 1.6);

  interface RiverInfo {
    trunk: number;
    trib: number;
    discharge: number;
    width: number;
    thresh: number;
    channel: boolean;
    creek: boolean;
    canyon: boolean;
  }

  function riverInfoAt(x: number, z: number, h: number): RiverInfo {
    const w = getWorld();
    const S = w.scale;
    const trunk = riverTrunkAt(x, z);
    const trib = riverTribAt(x, z);
    const discharge = dischargeAt(x, z);
    const width = 4 + 30 * Math.pow(discharge, 1.6);
    const thresh = Math.max(0.008, Math.min(0.06, width / 550));
    const channel = trunk < thresh;
    const creek = !channel && trib < 0.035;
    const tm = tempAt(x, z);
    const hum = Math.max(0, Math.min(1, vnoise(x / (520 * S) + 137, z / (520 * S) - 219) + regionHumAt(x, z)));
    const canyon = (channel || creek) && ((tm > 0.72 && hum < 0.30) || (h > SEA + 30 && discharge < 0.25));
    return { trunk, trib, discharge, width, thresh, channel, creek, canyon };
  }

  const tempAt = (x: number, z: number) => {
    const w = getWorld();
    return Math.max(0, Math.min(1, vnoise(x / (380 * w.scale) + 91, z / (380 * w.scale) - 47) + w.temp + 0.14 + regionTempAt(x, z)));
  };

  const forestAt = (x: number, z: number) => {
    const w = getWorld();
    return vnoise(x / (360 * w.scale) + 7, z / (360 * w.scale) - 13);
  };

  function rawHeight(x: number, z: number): number {
    const w = getWorld();
    const S = w.scale;
    const C = continentalAt(x, z);
    const E = erosionAt(x, z);

    const rawCont = splineContinental(C);
    const baseContinental = rawCont > 0 ? Math.min(24, rawCont * 0.78) : rawCont;
    const erosionFactor = splineErosion(E);

    const microDetail =
      (vnoise(x / (42 * S), z / (42 * S)) - 0.5) * 8.5 +
      (vnoise(x / (16 * S), z / (16 * S)) - 0.5) * 3.5 +
      (vnoise(x / 6.5, z / 6.5) - 0.5) * 1.2;

    let h = SEA + baseContinental + microDetail * erosionFactor * regionHillAt(x, z);

    if (C > 0.08 && E < 0.20) {
      const mtnMask = smoothstep((C - 0.08) / 0.45) * smoothstep((0.20 - E) / 0.40);

      // 1. Variable Peak Target Amplitude Field (peaks range from y=86 to y=123)
      const peakTarget = 86 + 36 * smoothstep((vnoise(x / (380 * S) + 71, z / (380 * S) - 163) - 0.25) / 0.50);

      // 2. Multi-octave sharp ridge folding with cubic needle sharpening and micro jaggedness
      const r1 = ridge(x / (58 * S) + 11, z / (58 * S) - 7);
      const r2 = ridge(x / (24 * S) + 31, z / (24 * S) - 17);
      const r3 = ridge(x / (7.5 * S) + 53, z / (7.5 * S) - 89);
      const spireFactor = Math.pow(r1, 2.8) * 0.65 + Math.pow(r2, 2.0) * 0.25 + r3 * 0.10;

      // 3. Saddle pass & col carving: cuts natural dips and passes between towering peaks
      const passNoise = Math.abs(vnoise(x / (110 * S) - 77, z / (110 * S) + 143) - 0.5) * 2.0;
      const passCarve = passNoise < 0.14 ? (1.0 - passNoise / 0.14) * 22.0 : 0.0;

      // 4. Mountain relief scaled to reach peak target without flat-topping,
      // modulated per-region so some ranges stay foothills while others go amplified
      const headroom = Math.max(12, peakTarget - h);
      const rawRelief = spireFactor * headroom * 1.25 * w.mtn * regionReliefAt(x, z);
      const mtnRelief = Math.max(0, rawRelief - passCarve * w.mtn);

      h += mtnMask * mtnRelief;
    }

    const rInfo = riverInfoAt(x, z, h);
    if ((rInfo.channel || rInfo.creek) && C > -0.10) {
      const f = rInfo.channel ? 1 - rInfo.trunk / rInfo.thresh : 1 - rInfo.trib / 0.035;
      const depth = Math.min(26, (5 + rInfo.width * 0.55) * (rInfo.canyon ? 1.5 : 1));
      const carveAmount = Math.pow(smoothstep(Math.max(0, Math.min(1, f))), rInfo.canyon ? 1.4 : 1.0) * depth;
      if (h - carveAmount < SEA + 2) {
        h = Math.max(SEA - 3, h - carveAmount);
      } else {
        h -= carveAmount * (rInfo.canyon ? 1.0 : 0.65);
      }
    }

    if (C >= -0.40 && C <= 0.05) {
      const inletNoise = Math.abs(vnoise(x / (220 * S) - 113, z / (220 * S) + 79) - 0.5) * 2.0;
      if (inletNoise < 0.08) {
        const fjordCarve = (1.0 - inletNoise / 0.08) * 12.0;
        h = Math.max(SEA - 6, h - fjordCarve);
      }
    }

    // Regional inland seas & archipelago waters (replaces the old islands world type)
    h -= regionSeaAt(x, z) * 34;

    // Smooth ceiling soft-compression only near hard build limit
    if (h > 120) {
      h = 120 + 3.2 * Math.tanh((h - 120) / 3.2);
    }
    return Math.max(3, Math.min(CHH - 4, Math.round(h)));
  }

  function terrainHeight(x: number, z: number): number {
    const k = x + ":" + z;
    let h = heightCache.get(k);
    if (h !== undefined) return h;
    h = rawHeight(x, z);
    if (heightCache.size > 65536) heightCache.clear();
    heightCache.set(k, h);
    return h;
  }

  function surfaceAt(x: number, z: number, explicitBiome?: string): SurfaceInfo {
    const w = getWorld();
    const h = terrainHeight(x, z);
    const tm = tempAt(x, z);
    const hum = Math.max(0, Math.min(1, vnoise(x / (520 * w.scale) + 137, z / (520 * w.scale) - 219) + regionHumAt(x, z)));
    const bRaw = explicitBiome ?? getBiome(x, z);
    const bId = typeof bRaw === "string" ? bRaw : bRaw?.id;

    let cold = tm < 0.35, frozen = tm < 0.27;
    if (bId === "stony_peaks" || bId === "desert" || bId === "badlands" || bId === "savanna" || bId === "swamp" || bId === "plains" || bId === "oak_forest" || bId === "bamboo" || bId === "meadow") {
      cold = false;
      frozen = false;
    } else if (bId === "frozen_peaks" || bId === "ice_spikes") {
      cold = true;
      frozen = true;
    } else if (bId === "jagged_peaks" || bId === "snowy_slopes") {
      cold = true;
    }
    const dry = bId === "desert" || bId === "badlands" || bId === "savanna";

    const alpineSnowLine = SNOWLINE + (tm - 0.5) * 16;
    const slope = Math.max(
      Math.abs(h - terrainHeight(x + 1, z)), Math.abs(h - terrainHeight(x - 1, z)),
      Math.abs(h - terrainHeight(x, z + 1)), Math.abs(h - terrainHeight(x, z - 1)));

    let top = 1, sub = 2; // Default Lush Grass & Dirt

    if (h > SEA && h <= SEA + 3) {
      const bank = riverInfoAt(x, z, h);
      const nearWater = (bank.channel && bank.trunk < bank.thresh * 1.6) || (bank.creek && bank.trib < 0.06);
      if (nearWater && !bank.canyon) {
        return { h, top: 1, sub: 2, cold, frozen, dry, slope }; // Oasis riverbank greens (even in arid zones)
      }
    }

    if (h <= SEA) {
      const rInfo = riverInfoAt(x, z, h);
      if (rInfo.channel || rInfo.creek) {
        top = 10; sub = 256; // Sand riverbed with clay subsoil
      } else if (bId === "swamp" || (tm > 0.65 && hum > 0.45)) {
        top = 490; sub = 256; // Swamp / Mangrove Swamp Mud with Clay
      } else if (bId === "badlands") {
        top = 584; sub = 663; // Red Sand / Terracotta seabed
      } else if (frozen) {
        top = 12; sub = 12; // Frozen ocean: barren gravel floor
      } else if (tm > 0.60) {
        top = 10; sub = 10; // Warm ocean: sand flats, no dirt/clay/gravel
      } else {
        const patch = vnoise(x / 33 + 51, z / 33 - 97);
        if (patch > 0.62) { top = 10; sub = 10; } // Shallow sand patches
        else if (patch < 0.38) { top = 2; sub = 2; } // Dirt patches
        else if (patch < 0.46) { top = 256; sub = 256; } // Clay patches
        else { top = 12; sub = 12; } // Gravel base
      }
    } else if (h <= SEA + 2 && slope <= 1.8) {
      if (bId === "swamp") {
        top = 490; sub = 256; // Mangrove / Swamp Mud & Clay
      } else if (bId === "badlands") {
        top = 584; sub = 585; // Red sand & Red Sandstone
      } else if (bId === "desert") {
        top = 10; sub = 11; // Desert sand & Sandstone
      } else if (tm > 0.65 && hum > 0.45) {
        top = 490; sub = 3; // Mangrove Mud & Coarse Dirt
      } else {
        top = frozen ? 51 : 10; sub = 11; // Beach Sand & Sandstone
      }
    } else if (bId === "badlands") {
      // Badlands: stratified terracotta cliffs and red sand on mesa flats
      const TERRACOTTA_STRATA = [663, 515, 663, 710, 221, 589, 700, 452, 663, 515, 710, 589];
      const strata = TERRACOTTA_STRATA[Math.abs(h) % TERRACOTTA_STRATA.length];
      if (slope >= 1.6) {
        top = strata; sub = strata;
      } else {
        top = 584; sub = strata; // Red sand on flat mesa top
      }
    } else if (bId === "desert") {
      // Desert: sand over sandstone across all elevations
      if (slope >= 2.4) {
        top = 11; sub = 11; // Sandstone cliff
      } else {
        top = 10; sub = 11; // Sand dunes
      }
    } else if (bId === "swamp") {
      // Swamp marsh lowlands
      if (h <= SEA + 3) {
        top = (vnoise(x / 12, z / 12) > 0.42 ? 490 : 1);
        sub = 256; // Mud & Swamp Grass over Clay
      } else {
        top = 1; sub = 2;
      }
    } else if (bId === "ice_spikes") {
      // Ice Spikes polar pocket: snow block over packed ice
      top = 51; sub = 53;
    } else if (slope >= 2.4) {
      // Sheer rock cliff: exposed stone, snow/vegetation cannot stick
      top = 5; sub = 5;
    } else if (slope >= 1.8) {
      // Rocky scree & steep slope: gravel and stone
      top = 11; sub = 5;
    } else if (bId === "stony_peaks") {
      // Stony Peaks: warm, completely snow-free summits with solid stone & gravel scree
      top = (vnoise(x / 16, z / 16) > 0.62 ? 11 : 5);
      sub = 5;
    } else if (bId === "jagged_peaks") {
      // Jagged Peaks: snow on top of solid stone spine (never flat ice cap!)
      top = 51; sub = 5;
    } else if (bId === "frozen_peaks") {
      // Frozen Peaks: glacier snow over packed ice
      top = 51; sub = 53;
    } else if (bId === "snowy_slopes") {
      // Snowy Slopes: snow over stone (high) or dirt (lower)
      top = 51; sub = (h >= 90 ? 5 : 2);
    } else if (h >= alpineSnowLine || (h >= 102 && cold)) {
      // General alpine summits above snowline
      top = 51; sub = 5;
    } else if (cold) {
      top = 54; sub = 2; // Snowy Grass
    } else if (bId === "redwood") {
      // Old-growth redwood: podzol compost patches
      top = (vnoise(x / 14, z / 14) > 0.45 ? 4 : 1);
      sub = 2;
    } else if (bId === "savanna") {
      // Savanna: coarse dirt patches among dry grass
      top = (vnoise(x / 15, z / 15) > 0.72 ? 3 : 1);
      sub = 2;
    } else if (bId === "warped") {
      top = 112; sub = 121;
    }
    return { h, top, sub, cold, frozen, dry, slope };
  }

  const REGION = 256;

  // Terrain fitness for a village: the surface over a ~24-block footprint must
  // stay within a small elevation band (gentle slope only). Villages are placed
  // ON the surface — never flattened onto a mountain — so candidates on steep
  // ground are rejected. Returns the max height delta (Infinity if unusable).
  function villageTerrainDelta(cx: number, cz: number): number {
    const h = terrainHeight(cx, cz);
    if (h <= SEA + 1 || h >= SNOWLINE - 6) return Infinity;
    let maxD = 0;
    const R = 30;
    const rings = [0.3, 0.55, 0.78, 1.0];
    for (const t of rings) {
      const r = t * R;
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4]) {
        const ph = terrainHeight(Math.round(cx + Math.cos(a) * r), Math.round(cz + Math.sin(a) * r));
        const d = Math.abs(ph - h);
        if (d > maxD) maxD = d;
      }
    }
    return maxD;
  }

  function villageAt(rx: number, rz: number): VillageData | null {
    const k = rx + ":" + rz;
    if (regionCache.has(k)) return regionCache.get(k);
    let v: VillageData | null = null;

    const seedHash = hash2(rx * 911 + 17, rz * 733 + 29);
    const isSpawnRegion = rx === 0 && rz === 0;
    if (seedHash < 0.88 || isSpawnRegion) {
      let best: { delta: number; x: number; z: number } | null = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const ox = Math.round((hash2(rx * 31 + attempt * 17 + 5, rz * 17 + attempt * 23 + 3) - 0.5) * (REGION - 60));
        const oz = Math.round((hash2(rx * 53 + attempt * 29 + 7, rz * 23 + attempt * 19 + 11) - 0.5) * (REGION - 60));
        const candX = rx * REGION + ox;
        const candZ = rz * REGION + oz;
        const delta = villageTerrainDelta(candX, candZ);
        if (!best || delta < best.delta) best = { delta, x: candX, z: candZ };
        // Accept the first candidate that fits a gentle slope (max ~3.5 blocks).
        if (delta <= 4.0) {
          v = {
            vx: candX,
            vz: candZ,
            base: terrainHeight(candX, candZ),
            r: 64,
            id: k,
            home: isSpawnRegion,
            name: generateVillageName(candX, candZ)
          };
          break;
        }
      }
      // The spawn region always keeps a village so the home area is never empty;
      // fall back to its best (least sloped) candidate even if terrain is steep.
      if (!v && isSpawnRegion && best && best.delta !== Infinity) {
        v = {
          vx: best.x,
          vz: best.z,
          base: terrainHeight(best.x, best.z),
          r: 64,
          id: k,
          home: true,
          name: generateVillageName(best.x, best.z)
        };
      }
    }

    regionCache.set(k, v);
    // Cap unbounded exploration caches (oldest-first; Maps preserve insertion
    // order). Plans are re-derivable from the seed, so eviction is always safe.
    if (regionCache.size > 240) {
      for (const old of regionCache.keys()) {
        if (regionCache.size <= 200) break;
        regionCache.delete(old);
      }
    }
    return v;
  }

  function villagesNear(x: number, z: number, blend = 16): VillageData[] {
    const rx = Math.round(x / REGION), rz = Math.round(z / REGION), out: VillageData[] = [];
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const v = villageAt(rx + dx, rz + dz);
        if (v && Math.max(Math.abs(x - v.vx), Math.abs(z - v.vz)) < v.r + blend + 4) {
          out.push(v);
        }
      }
    }
    return out;
  }

  function findNearestVillage(px: number, pz: number): (VillageData & { dist: number }) | null {
    const rx = Math.round(px / REGION), rz = Math.round(pz / REGION);
    let closest: (VillageData & { dist: number }) | null = null, minD = Infinity;
    for (let dz = -4; dz <= 4; dz++) {
      for (let dx = -4; dx <= 4; dx++) {
        const v = villageAt(rx + dx, rz + dz);
        if (v) {
          const d = Math.hypot(v.vx - px, v.vz - pz);
          if (d < minD) {
            minD = d;
            closest = { ...v, dist: Math.round(d) };
          }
        }
      }
    }
    return closest;
  }

  function getBiome(x: number, z: number) {
    const w = getWorld();
    const S = w.scale;
    const t = tempAt(x, z);
    const h = Math.max(0, Math.min(1, vnoise(x / (520 * S) + 137, z / (520 * S) - 219) + regionHumAt(x, z)));
    const wNoise = vnoise(x / (900 * S) + 311, z / (900 * S) + 73);
    const elev = terrainHeight(x, z);
    const fDensity = forestAt(x, z);
    const sampled = sampleBiome(x, z, elev, t, h, wNoise, fDensity);
    const sId = typeof sampled === "string" ? sampled : sampled?.id;
    // Transition buffer (CLIMATE_HYDROLOGY S1): temperature is spatially continuous,
    // so forcing temperate biomes across the mid band lays a standard-biome buffer
    // wherever frozen lowlands and warm dunes would otherwise touch. Mountains
    // (elev >= SEA+10) keep their character.
    if (elev < SEA + 10 && sId) {
      const tempered = applyTransitionBand(sId, t, h, elev, fDensity);
      if (tempered) return tempered;
    }
    return sampled;
  }

  function caveAt(x: number, y: number, z: number, surfH?: number): { isCave: boolean; isLava: boolean; isGrotto: boolean } {
    const h = surfH !== undefined ? surfH : terrainHeight(x, z);
    if (y < 4 || y >= h - 2) return { isCave: false, isLava: false, isGrotto: false };

    const w1 = vnoise3D(x / 14.0, y / 9.0, z / 14.0) - 0.5;
    const w2 = vnoise3D(x / 14.0 + 53.2, y / 9.0 - 31.7, z / 14.0 + 17.5) - 0.5;
    const isWormCave = (w1 * w1 + w2 * w2) < 0.005;

    const hallNoise = vnoise3D(x / 24.0 + 101.5, y / 16.0 - 77.3, z / 24.0 + 43.8);
    const isHugeCavern = hallNoise > 0.86;

    if (!isWormCave && !isHugeCavern) return { isCave: false, isLava: false, isGrotto: false };

    const isLava = y <= 10;
    const bioNoise = vnoise3D(x / 36.0, y / 18.0, z / 36.0);
    const isGrotto = !isLava && (bioNoise > 0.64 || bioNoise < 0.22);
    return { isCave: true, isLava, isGrotto };
  }

  function mineshaftAt(x: number, y: number, z: number): { isMine: boolean; blockId: number } {
    if (y < 22 || y > 38) return { isMine: false, blockId: 0 };
    const M = 64;
    const cxm = Math.floor(x / M);
    const czm = Math.floor(z / M);
    const mHash = hash2(cxm * 89 + 17, czm * 131 + 41);
    if (mHash > 0.40) return { isMine: false, blockId: 0 };

    const hubX = cxm * M + 32;
    const hubZ = czm * M + 32;
    const hubY = 26 + Math.floor(hash2(cxm * 37, czm * 59) * 8);

    if (y < hubY || y > hubY + 3) return { isMine: false, blockId: 0 };

    const dx = x - hubX;
    const dz = z - hubZ;
    const inEW = Math.abs(dz) <= 1 && Math.abs(dx) <= 26;
    const inNS = Math.abs(dx) <= 1 && Math.abs(dz) <= 26;

    if (!inEW && !inNS) return { isMine: false, blockId: 0 };

    const dist = inEW ? Math.abs(dx) : Math.abs(dz);
    const isEdge = inEW ? Math.abs(dz) === 1 : Math.abs(dx) === 1;
    const isSupportInterval = dist % 5 === 0;

    if (y === hubY + 3) {
      if (isSupportInterval) return { isMine: true, blockId: 17 };
      return { isMine: true, blockId: 0 };
    }

    if (isEdge) {
      if (isSupportInterval && (y === hubY + 1 || y === hubY + 2)) {
        return { isMine: true, blockId: 1174 };
      }
      return { isMine: true, blockId: 0 };
    }

    if (y === hubY) {
      if (!isEdge && dist % 6 !== 0) {
        return { isMine: true, blockId: 572 };
      }
      return { isMine: true, blockId: 17 };
    }

    if (y === hubY + 2 && isSupportInterval && !isEdge) {
      return { isMine: true, blockId: 43 };
    }
    if ((dist === 26 || (dist === 13 && isEdge)) && y === hubY + 1) {
      if (hash3(x, y, z) < 0.35) return { isMine: true, blockId: 259 };
      if (dist === 26 && !isEdge && hash2(x, z) < 0.40) return { isMine: true, blockId: 45 };
    }

    return { isMine: true, blockId: 0 };
  }

  function horizonColumn(x: number, z: number): { h: number; top: number } {
    const h = rawHeight(x, z);
    if (h <= SEA) return { h, top: 10 };
    const tm = tempAt(x, z);
    if (h >= SNOWLINE + (tm - 0.5) * 16) return { h, top: 51 };
    if (h <= SEA + 2) return { h, top: 10 };
    if (h < 96 && tm > 0.28 && tm < 0.85) {
      const f = forestAt(x, z);
      if (f > 0.58 && vnoise(x / 240.0, z / 240.0) > 0.55 && !villagesNear(x, z, 0).length) {
        const lift = 6 + Math.round(8 * Math.min(1, Math.max(0, (f - 0.58) / 0.3)));
        return { h: h + lift, top: 18 };
      }
    }
    return { h, top: 1 };
  }

  return {
    hash2,
    hash3,
    vnoise,
    vnoise3D,
    ridge,
    continentalAt,
    erosionAt,
    riverTrunkAt,
    riverTribAt,
    dischargeAt,
    riverWidthAt,
    riverInfoAt,
    tempAt,
    forestAt,
    rawHeight,
    terrainHeight,
    surfaceAt,
    horizonColumn,
    villageAt,
    villagesNear,
    findNearestVillage,
    getBiome,
    caveAt,
    mineshaftAt
  };
}

export interface ChunkGenOrigin {
  GC: Chunk | null;
  GX0: number;
  GZ0: number;
}

export interface ChunkGenDeps {
  s: GameState;
  simFlat: () => boolean;
  hash2: (x: number, z: number) => number;
  hash3: (x: number, y: number, z: number) => number;
  vnoise: (x: number, y: number) => number;
  vnoise3D: (x: number, y: number, z: number) => number;
  continentalAt: (x: number, z: number) => number;
  tempAt: (x: number, z: number) => number;
  terrainHeight: (x: number, z: number) => number;
  surfaceAt: (x: number, z: number, explicitBiome?: string) => SurfaceInfo;
  villagesNear: (x: number, z: number, blend?: number) => VillageData[];
  getBiome: (x: number, z: number) => any;
  riverInfoAt: (x: number, z: number, h: number) => { trunk: number; trib: number; discharge: number; width: number; thresh: number; channel: boolean; creek: boolean; canyon: boolean };
  rngAt: (x: number, z: number) => () => number;
  w: (x: number, y: number, z: number, id: number) => void;
  clearUp: (x: number, z: number, from: number) => void;
  origin: ChunkGenOrigin;
  roadStrip: (x0: number, z0: number, x1: number, z1: number) => void;
  lampPost: (x: number, z: number, base: number) => void;
  wellAt: (cx: number, cz: number, base: number) => void;
  gardenAt: (x0: number, z0: number, x1: number, z1: number) => void;
  penAt: (x0: number, z0: number, x1: number, z1: number, base: number) => void;
  buildHouse: (H: any) => void;
  caveAt: (x: number, y: number, z: number, surfH?: number) => { isCave: boolean; isLava: boolean; isGrotto: boolean };
  mineshaftAt: (x: number, y: number, z: number) => { isMine: boolean; blockId: number };
}

export interface ChunkGenerator {
  genChunk: (cx: number, cz: number) => Chunk;
  scatter: (x: number, z: number) => void;
  pine: (x: number, z: number, h: number, r: () => number, snowy: boolean) => void;
  buildVillageInChunk: (v: any) => void;
  villagePlan: (v: any) => any;
}

export function createChunkGenerator(deps: ChunkGenDeps): ChunkGenerator {
  const { s, simFlat, hash2, hash3, vnoise, continentalAt, tempAt, terrainHeight, surfaceAt, villagesNear, getBiome, riverInfoAt, rngAt, w, origin, roadStrip, lampPost, wellAt, gardenAt, penAt, buildHouse, caveAt, mineshaftAt } = deps;

  function villagePlan(v: any) {
    const cached = s.planCache.get(v.id);
    if (cached) return cached;
    const r = rngAt(v.vx * 7 + 1, v.vz * 13 + 3);
    const base = v.base;
    const cx = v.vx, cz = v.vz;

    const roads: any[] = [], houses: any[] = [], lamps: any[] = [], wells: any[] = [], gardens: any[] = [], spines: any[] = [];
    wells.push([cx, cz]);

    // ── Shared house-placement helpers ──────────────────────────────────────
    let minX = cx - 10, maxX = cx + 10, minZ = cz - 10, maxZ = cz + 10;
    const updateBounds = (mx0: number, mz0: number, mx1: number, mz1: number) => {
      minX = Math.min(minX, mx0); maxX = Math.max(maxX, mx1);
      minZ = Math.min(minZ, mz0); maxZ = Math.max(maxZ, mz1);
    };
    const pickStyle = (isSpecial: boolean) => {
      let pool = STYLES.filter(st => isSpecial ? (st.isCathedral || st.isManor || st.isTower || st.isLibrary || st.isTavern || st.isForge) : (!st.isCathedral && !st.isManor && !st.isTower));
      if (!pool.length) pool = STYLES.slice(0, 3);
      return pool[Math.floor(r() * pool.length) % pool.length];
    };

    // Place a house offset perpendicular from a road centerline (roadMidX,roadMidZ)
    // running in direction (alongX,alongZ). Returns the house rect + door side, or
    // null if it would collide with an existing house or a different road.
    const placeHouse = (roadMidX: number, roadMidZ: number, alongX: number, alongZ: number, forcedSide = 0, forcedSetback = 0) => {
      if (Math.hypot(roadMidX - cx, roadMidZ - cz) > 80) return null;
      const homeRoad = roads.find(rd => roadMidX >= rd.x0 && roadMidX <= rd.x1 && roadMidZ >= rd.z0 && roadMidZ <= rd.z1);
      const perpSide = forcedSide || (r() < 0.5 ? 1 : -1);
      const setback = forcedSetback || 8 + Math.floor(r() * 5);
      const hCenterX = Math.round(roadMidX + (-alongZ) * perpSide * setback);
      const hCenterZ = Math.round(roadMidZ + (alongX) * perpSide * setback);
      if (Math.hypot(hCenterX - cx, hCenterZ - cz) < 5) return null;
      const isSpecial = r() < 0.22;
      const S = pickStyle(isSpecial);
      const hw = S.wMin + Math.floor(Math.min(r() * (S.wMax - S.wMin + 1), 3));
      const hd = S.wMin + Math.floor(Math.min(r() * (S.wMax - S.wMin + 1), 3));
      const hx0 = hCenterX - Math.floor(hw / 2);
      const hz0 = hCenterZ - Math.floor(hd / 2);
      // AABB overlap vs existing houses (with a 1-block clearance margin)
      for (const ex of houses) {
        if (hx0 + hw >= ex.x0 - 1 && hx0 <= ex.x1 + 1 && hz0 + hd >= ex.z0 - 1 && hz0 <= ex.z1 + 1) return null;
      }
      // Skip if the footprint overlaps a DIFFERENT road (cross-street, spoke, etc.).
      // Connected road segments (share a joint, e.g. a winding path's bends) do
      // not count — a house legitimately sits beside a continuous street.
      const connectAt = (a: any, b: any) => {
        for (const [ax, az] of [[a.x0, a.z0], [a.x0, a.z1], [a.x1, a.z0], [a.x1, a.z1]])
          for (const [bx, bz] of [[b.x0, b.z0], [b.x0, b.z1], [b.x1, b.z0], [b.x1, b.z1]])
            if (Math.abs(ax - bx) <= 2 && Math.abs(az - bz) <= 2) return true;
        return false;
      };
      const onOtherRoad = roads.some(rd => rd !== homeRoad && (!homeRoad || !connectAt(rd, homeRoad)) && hx0 + hw >= rd.x0 - 1 && hx0 <= rd.x1 + 1 && hz0 + hd >= rd.z0 - 1 && hz0 <= rd.z1 + 1);
      if (onOtherRoad) return null;
      const facingSide = Math.abs(alongX) > Math.abs(alongZ)
        ? (perpSide > 0 ? "N" : "S")
        : (perpSide > 0 ? "W" : "E");
      // Ground the house to its OWN local terrain (max over footprint + center)
      // so it sits on the surface with a stepped foundation, not a flat cut.
      const hBase = Math.max(
        terrainHeight(hx0, hz0), terrainHeight(hx0 + hw, hz0),
        terrainHeight(hx0, hz0 + hd), terrainHeight(hx0 + hw, hz0 + hd),
        terrainHeight(hCenterX, hCenterZ)
      );
      // Choose the door cell here (random offset per house, mirrored from the
      // house builder's rule) and hand it to the builder via H.dx/dz/dox/doz,
      // so the road path below meets the ACTUAL door instead of the wall middle.
      const wAlong = (facingSide === "S" || facingSide === "N") ? hw : hd;
      let doorOff = Math.floor(wAlong / 2);
      const drr = r();
      if (wAlong >= 7) {
        if (drr < 0.35) doorOff = 2;
        else if (drr > 0.7) doorOff = wAlong - 2;
      }
      let doorX = hx0, doorZ = hz0, dooX = hx0, dooZ = hz0;
      if (facingSide === "S") { doorX = hx0 + doorOff; doorZ = hz0 + hd; dooX = doorX; dooZ = doorZ + 1; }
      else if (facingSide === "N") { doorX = hx0 + doorOff; doorZ = hz0; dooX = doorX; dooZ = doorZ - 1; }
      else if (facingSide === "E") { doorX = hx0 + hw; doorZ = hz0 + doorOff; dooX = doorX + 1; dooZ = doorZ; }
      else { doorX = hx0; doorZ = hz0 + doorOff; dooX = doorX - 1; dooZ = doorZ; }
      houses.push({ x0: hx0, z0: hz0, x1: hx0 + hw, z1: hz0 + hd, side: facingSide, style: S, base: hBase, roadMidX, roadMidZ, dx: doorX, dz: doorZ, dox: dooX, doz: dooZ });
      updateBounds(hx0 - 2, hz0 - 2, hx0 + hw + 2, hz0 + hd + 2);
      return { hx0, hz0, hw, hd, side: facingSide, midX: hCenterX, midZ: hCenterZ };
    };
    const connectToRoad = (h: any, roadMidX: number, roadMidZ: number) => {
      const outX = typeof h.dox === "number" ? h.dox : Math.floor((h.x0 + h.x1) / 2);
      const outZ = typeof h.doz === "number" ? h.doz : Math.floor((h.z0 + h.z1) / 2);
      roads.push({ x0: Math.min(outX, roadMidX) - 1, z0: Math.min(outZ, roadMidZ) - 1, x1: Math.max(outX, roadMidX) + 1, z1: Math.max(outZ, roadMidZ) + 1 });
      updateBounds(Math.min(outX, roadMidX) - 2, Math.min(outZ, roadMidZ) - 2, Math.max(outX, roadMidX) + 2, Math.max(outZ, roadMidZ) + 2);
      if (r() < 0.22) {
        const side = r() < 0.5 ? 1 : -1;
        const gx0 = h.hx0 + (side > 0 ? h.hw + 2 : -7);
        gardens.push([gx0, h.hz0, gx0 + 5, h.hz0 + 5]);
      }
    };
    const pushSpine = (x0: number, z0: number, x1: number, z1: number) => {
      roads.push({ x0: Math.min(x0, x1) - 1, z0: Math.min(z0, z1) - 1, x1: Math.max(x0, x1) + 1, z1: Math.max(z0, z1) + 1 });
      spines.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) });
      updateBounds(Math.min(x0, x1) - 3, Math.min(z0, z1) - 3, Math.max(x0, x1) + 3, Math.max(z0, z1) + 3);
    };

    // ── Layout archetypes (each chosen per-village by the seed RNG) ─────────
    function crossroads() {
      const half = 30 + Math.floor(r() * 12);
      pushSpine(cx, cz - half, cx, cz + half);
      pushSpine(cx - half, cz, cx + half, cz);
      const arms = [
        { dx: 0, dz: -1, ax: 0, az: 1 }, // north arm
        { dx: 0, dz: 1, ax: 0, az: 1 },
        { dx: -1, dz: 0, ax: 1, az: 0 },
        { dx: 1, dz: 0, ax: 1, az: 0 }
      ];
      for (const arm of arms) {
const perArm = 2 + Math.floor(r() * 3);
        for (let i = 0; i < perArm; i++) {
          const d = Math.max(4, Math.min(6 + i * 8, half - 4));
          const midX = Math.round(cx + arm.dx * d);
          const midZ = Math.round(cz + arm.dz * d);
          placeHouse(midX, midZ, arm.ax, arm.az);
        }
      }
    }

    function linear() {
      const xRun = r() < 0.5;
      const len = 40 + Math.floor(r() * 22);
      const x1 = cx + (xRun ? len : 0), z1 = cz + (xRun ? 0 : len);
      pushSpine(cx, cz, x1, z1);
      const n = 6 + Math.floor(r() * 8);
      const ax = xRun ? 1 : 0, az = xRun ? 0 : 1;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const midX = Math.round(cx + (x1 - cx) * t);
        const midZ = Math.round(cz + (z1 - cz) * t);
        const h = placeHouse(midX, midZ, ax, az);
        void h;
      }
      lamps.push([x1, z1], [cx, cz]);
    }

    function starPlaza() {
      const spokes = 5 + Math.floor(r() * 2);
      for (let sIdx = 0; sIdx < spokes; sIdx++) {
        const ang = (sIdx / spokes) * Math.PI * 2 + (r() - 0.5) * 0.5;
        const len = 22 + Math.floor(r() * 14);
        const ex = Math.round(cx + Math.cos(ang) * len);
        const ez = Math.round(cz + Math.sin(ang) * len);
        pushSpine(cx, cz, ex, ez);
        const ax = Math.abs(Math.cos(ang)) >= Math.abs(Math.sin(ang)) ? 1 : 0;
        const az = ax ? 0 : 1;
        const perSpoke = 2 + Math.floor(r() * 2);
        for (let i = 0; i < perSpoke; i++) {
          const t = 0.4 + i * 0.42;
          const midX = Math.round(cx + (ex - cx) * t);
          const midZ = Math.round(cz + (ez - cz) * t);
          const h = placeHouse(midX, midZ, ax, az);
          void h;
        }
        lamps.push([ex, ez]);
      }
      lamps.push([cx - 4, cz], [cx + 4, cz], [cx, cz - 4], [cx, cz + 4]);
    }

    function winding() {
      let px = cx, pz = cz;
      let ang = r() * Math.PI * 2;
      const segs = 5 + Math.floor(r() * 2);
      for (let sIdx = 0; sIdx < segs; sIdx++) {
        ang += (r() - 0.5) * 1.1;
        const segLen = 16 + Math.floor(r() * 12);
        let nx0 = Math.round(px + Math.cos(ang) * segLen);
        let nz0 = Math.round(pz + Math.sin(ang) * segLen);
        // Keep the winding path within the village radius so houses stay reachable.
        if (Math.hypot(nx0 - cx, nz0 - cz) > 56) { nx0 = Math.round(cx + Math.cos(ang) * 56); nz0 = Math.round(cz + Math.sin(ang) * 56); }
        const nx = nx0, nz = nz0;
        pushSpine(px, pz, nx, nz);
        const ax = Math.abs(Math.cos(ang)) >= Math.abs(Math.sin(ang)) ? 1 : 0;
        const az = ax ? 0 : 1;
        const perSeg = 1 + Math.floor(r() * 2);
        for (let i = 0; i < perSeg; i++) {
          const t = (i + 0.4) / perSeg;
          const midX = Math.round(px + (nx - px) * t);
          const midZ = Math.round(pz + (nz - pz) * t);
          const h = placeHouse(midX, midZ, ax, az);
          void h;
        }
        if (r() < 0.45) lamps.push([px, pz]);
        px = nx; pz = nz;
      }
    }

    function grid() {
      const par = 2 + Math.floor(r() * 2);
      const cross = 1 + Math.floor(r() * 2);
      const halfLen = 30 + Math.floor(r() * 14);
      const spacing = 16;
      const parZs: number[] = [];
      for (let k = 0; k < par; k++) {
        const z = cz + Math.round((k - (par - 1) / 2) * spacing);
        parZs.push(z);
        pushSpine(cx - halfLen, z, cx + halfLen, z);
      }
      for (let c = 0; c < cross; c++) {
        const x = cx + Math.round((c - (cross - 1) / 2) * spacing * 1.5);
        pushSpine(x, cz - halfLen, x, cz + halfLen);
      }
      for (const z of parZs) {
        const perRow = 4 + Math.floor(r() * 5);
        for (let i = 0; i < perRow; i++) {
          const x = cx - halfLen + 3 + Math.round(((halfLen * 2 - 6) / perRow) * (i + 0.5));
          const h = placeHouse(x, z, 1, 0);
          void h;
        }
      }
    }

    function terrace() {
      // Main street along the axis with the strongest gentle gradient; houses are
      // staggered in rising tiers on alternating sides (uses the stair roads).
      const dX = Math.abs(terrainHeight(cx + 8, cz) - terrainHeight(cx - 8, cz));
      const dZ = Math.abs(terrainHeight(cx, cz + 8) - terrainHeight(cx, cz - 8));
      const xRun = dZ <= dX;
      const len = 36 + Math.floor(r() * 22);
      const x1 = cx + (xRun ? len : 0), z1 = cz + (xRun ? 0 : len);
      pushSpine(cx, cz, x1, z1);
      const ax = xRun ? 1 : 0, az = xRun ? 0 : 1;
      const pairs = 3 + Math.floor(r() * 4);
      for (let i = 0; i < pairs; i++) {
        const t = (i + 0.5) / pairs;
        const midX = Math.round(cx + (x1 - cx) * t);
        const midZ = Math.round(cz + (z1 - cz) * t);
        const side = i % 2 === 0 ? 1 : -1;
        const h = placeHouse(midX, midZ, ax, az, side, 4 + Math.floor(r() * 3));
        void h;
      }
      lamps.push([cx, cz], [x1, z1]);
    }

    function cluster() {
      const n = 6 + Math.floor(r() * 5);
      const ringR = 7 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.4;
        const hx = Math.round(cx + Math.cos(ang) * ringR);
        const hz = Math.round(cz + Math.sin(ang) * ringR);
        pushSpine(cx, cz, hx, hz);
        const ax = Math.abs(Math.cos(ang)) >= Math.abs(Math.sin(ang)) ? 1 : 0;
        const az = ax ? 0 : 1;
        const h = placeHouse(hx, hz, ax, az);
        void h;
      }
      lamps.push([cx + 4, cz + 4], [cx - 4, cz + 4], [cx + 4, cz - 4], [cx - 4, cz - 4]);
    }

    // Pick the archetype + house budget from the seed RNG, build it, then top up
    // with extra houses along the main streets until the budget is met.
    const budget = 12 + Math.floor(r() * 15);
    const archetypes: Array<() => void> = [crossroads, linear, starPlaza, winding, grid, terrace, cluster];
    archetypes[Math.floor(r() * archetypes.length)]();
    let fillAttempts = 0;
    // Two cursor phases fill both road sides back-to-back at ~house-width pitch.
    for (const off of [3, 9.5]) {
      if (houses.length >= budget) break;
      for (const rd of spines) {
        if (houses.length >= budget) break;
        const alongX = Math.abs(rd.x1 - rd.x0) >= Math.abs(rd.z1 - rd.z0) ? 1 : 0;
        const alongZ = alongX ? 0 : 1;
        const span = Math.max(Math.abs(rd.x1 - rd.x0), Math.abs(rd.z1 - rd.z0));
        let cursor = off;
        while (cursor < span - 5 && houses.length < budget && fillAttempts < 800) {
          const t = cursor / span;
          const midX = Math.round(rd.x0 + (rd.x1 - rd.x0) * t);
          const midZ = Math.round(rd.z0 + (rd.z1 - rd.z0) * t);
          placeHouse(midX, midZ, alongX, alongZ, 1, 8 + Math.floor(r() * 4));
          fillAttempts++;
          if (houses.length < budget) {
            placeHouse(midX, midZ, alongX, alongZ, -1, 8 + Math.floor(r() * 4));
            fillAttempts++;
          }
          cursor += 11;
        }
      }
    }
    void fillAttempts;

    // Connect every house's door to its road (after placement so door-path rects
    // never interfere with later house placement).
    for (const h of houses) connectToRoad(h, h.roadMidX, h.roadMidZ);

    lamps.push([cx - 3, cz - 3], [cx + 3, cz - 3], [cx - 3, cz + 3], [cx + 3, cz + 3]);

    const pens: VillagePen[] = [];
    const pr = rngAt(v.vx * 13 + 7, v.vz * 29 + 11);
    for (let pi = 0; pens.length < 2 && pi < 6; pi++) {
      const ang = pr() * Math.PI * 2;
      const dist = 24 + pr() * 20;
      const pcx = Math.round(cx + Math.cos(ang) * dist);
      const pcz = Math.round(cz + Math.sin(ang) * dist);
      const hb = terrainHeight(pcx, pcz);
      if (hb <= SEA + 1) continue;
      let flat = true;
      for (const [ox, oz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]] as Array<[number, number]>) {
        if (Math.abs(terrainHeight(pcx + ox, pcz + oz) - hb) > 1) { flat = false; break; }
      }
      if (!flat) continue;
      if (Math.hypot(pcx - cx, pcz - cz) < 10) continue;
      let overlap = false;
      for (const h of houses) {
        if (pcx + 4 >= h.x0 - 2 && pcx - 4 <= h.x1 + 2 && pcz + 4 >= h.z0 - 2 && pcz - 4 <= h.z1 + 2) { overlap = true; break; }
      }
      if (overlap) continue;
      for (const q of pens) {
        if (Math.hypot(pcx - q.cx, pcz - q.cz) < 14) { overlap = true; break; }
      }
      if (overlap) continue;
      pens.push({ x0: pcx - 3, z0: pcz - 3, x1: pcx + 3, z1: pcz + 3, base: hb, cx: pcx, cz: pcz });
      minX = Math.min(minX, pcx - 5); maxX = Math.max(maxX, pcx + 5);
      minZ = Math.min(minZ, pcz - 5); maxZ = Math.max(maxZ, pcz + 5);
    }

    let home = houses[0] || null;
    if (v.home && houses.length > 0) {
      home = houses[0];
      home.isHome = true;
    }

    const plan = { v, base, roads, houses, lamps, wells, gardens, pens, home,
                   bx0: minX - 4, bz0: minZ - 4, bx1: maxX + 4, bz1: maxZ + 4 };
    s.planCache.set(v.id, plan);
    if (s.planCache.size > 480) {
      for (const old of s.planCache.keys()) {
        if (s.planCache.size <= 400) break;
        s.planCache.delete(old);
      }
    }
    return plan;
  }

  function buildVillageInChunk(v: any) {
    const p = villagePlan(v);
    if (p.bx1 < origin.GX0 - 1 || p.bx0 > origin.GX0 + CH || p.bz1 < origin.GZ0 - 1 || p.bz0 > origin.GZ0 + CH) return;
    const hit = (x0: number, z0: number, x1: number, z1: number) => x1 >= origin.GX0 - 2 && x0 <= origin.GX0 + CH + 1 && z1 >= origin.GZ0 - 2 && z0 <= origin.GZ0 + CH + 1;
    for (const rd of p.roads) if (hit(rd.x0, rd.z0, rd.x1, rd.z1)) roadStrip(rd.x0, rd.z0, rd.x1, rd.z1);
    for (const g of p.gardens) if (hit(g[0], g[1], g[2], g[3])) gardenAt(g[0], g[1], g[2], g[3]);
    for (const pn of (p.pens || [])) if (hit(pn.x0 - 1, pn.z0 - 1, pn.x1 + 1, pn.z1 + 1)) penAt(pn.x0, pn.z0, pn.x1, pn.z1, pn.base);
    for (const h of p.houses) if (hit(h.x0 - 10, h.z0 - 10, h.x1 + 10, h.z1 + 10)) buildHouse(h);
    for (const wl of p.wells) if (hit(wl[0] - 3, wl[1] - 3, wl[0] + 3, wl[1] + 3)) wellAt(wl[0], wl[1], terrainHeight(wl[0], wl[1]));
    for (const lp of p.lamps) if (hit(lp[0] - 1, lp[1] - 1, lp[0] + 1, lp[1] + 1)) lampPost(lp[0], lp[1], terrainHeight(lp[0], lp[1]));
  }

  function pine(x: number, z: number, h: number, r: () => number, snowy: boolean) {
  generateCustomTree(x, z, h, r, w, {
    trunk: 22, leaf: 24, hMin: 6, hMax: 16, tw2: 0.2, crown: 2,
    trunks: ["straight", "twisted", "pillar", "buttress"],
    canopies: ["spire", "layered", "windswept"], snowCap: snowy
  });
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dz === 0) continue;
        const sr = r();
        if (sr < 0.36) w(x + dx, h, z + dz, 4);
        else if (sr < 0.60) w(x + dx, h, z + dz, 3);
      }
    }
  }

  function boulder(x: number, z: number, h: number, r: () => number) {
    const rad = 1 + (r() < 0.3 ? 1 : 0);
    const rock = r() < 0.45 ? 12 : 5;
    for (let dy = 0; dy <= rad; dy++) for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.hypot(dx, dy * 1.3, dz) > rad + 0.3) continue;
      w(x + dx, h + dy, z + dz, rock);
    }
  }

  function scatter(x: number, z: number) {
    let villageDist = 999;
    const vs = villagesNear(x, z);
    for (let i = 0; i < vs.length; i++) {
      const v = vs[i];
      const d = Math.hypot(x - v.vx, z - v.vz);
      if (d < villageDist) villageDist = d;
      const p = villagePlan(v);
      for (const rd of p.roads) {
        if (x >= rd.x0 - 1 && x <= rd.x1 + 1 && z >= rd.z0 - 1 && z <= rd.z1 + 1) return;
      }
      for (const h of p.houses) {
        if (x >= h.x0 - 2 && x <= h.x1 + 2 && z >= h.z0 - 2 && z <= h.z1 + 2) return;
      }
    }

    const surf = surfaceAt(x, z);
    const biome = getBiome(x, z);
    const biomeId = typeof biome === "string" ? biome : biome?.id;
    if (surf.h <= SEA - 2) {
      const r = rngAt(x, z);
      if (biomeId === "swamp" && surf.h >= SEA - 3 && r() < 0.10) {
        w(x, SEA, z, 457);
        return;
      }
      const tm = tempAt(x, z);
      const depth = SEA - surf.h;
      const rInfo = riverInfoAt(x, z, surf.h);
      const flora = chooseUnderwaterFlora(biomeId, tm, surf.frozen, depth, rInfo.channel || rInfo.creek, r);
      if (flora === "coral") generateCoralReef(x, surf.h, z, r, w);
      else if (flora === "kelp") generateKelpForest(x, surf.h, z, r, w);
      else if (flora === "seagrass") w(x, surf.h + 1, z, 133);
      else if (flora === "tallgrass") {
        w(x, surf.h + 1, z, 661);
        if (depth >= 3 && r() < 0.5) w(x, surf.h + 2, z, 661);
      } else if (flora === "pickle") w(x, surf.h + 1, z, 132);
      return;
    }
    if (surf.h <= SEA + 1) {
      const r = rngAt(x, z);
      if (surf.h === SEA + 1 && r() < 0.08) {
        const isNearWater = surfaceAt(x + 1, z).h <= SEA || surfaceAt(x - 1, z).h <= SEA || surfaceAt(x, z + 1).h <= SEA || surfaceAt(x, z - 1).h <= SEA;
        if (isNearWater) {
          w(x, surf.h + 1, z, 658);
          if (r() < 0.5) w(x, surf.h + 2, z, 658);
        }
      }
      return;
    }
    const roll = hash2(x * 7 + 11, z * 13 + 5);

    if (biomeId === "ice_spikes") {
      if (surf.top === 51 && roll < 0.03) generateIceSpike(x, z, surf.h, rngAt(x, z), w);
      return;
    }
    if ((biomeId === "desert" || biomeId === "desert_palm") && surf.top === 10 && surf.h < 100) {
      const r = rngAt(x, z);
      if (surf.h <= SEA + 4) {
        const isNearWater = surfaceAt(x + 1, z).h <= SEA || surfaceAt(x - 1, z).h <= SEA || surfaceAt(x, z + 1).h <= SEA || surfaceAt(x, z - 1).h <= SEA;
        if (isNearWater && r() < 0.06) {
          generatePalmTree(x, z, surf.h, r, w);
          return;
        }
      }
      const cRoll = hash2(x * 13 + 3, z * 29 + 7);
      if (cRoll < 0.012) generateCactus(x, z, surf.h, r, w);
      else if (cRoll < 0.045) w(x, surf.h + 1, z, 309);
      return;
    }

    if (surf.top === 5 || surf.top === 51) {
      if (roll < 0.008) boulder(x, z, surf.h + 1, rngAt(x, z));
      return;
    }
    if (roll < 0.003) { boulder(x, z, surf.h + 1, rngAt(x, z)); return; }

    let targetDensity = biome.density;

    const covNoise = vnoise(x / 240.0, z / 240.0);
    if (covNoise < 0.35) {
      targetDensity *= 0.28;
    } else if (covNoise <= 0.70) {
      targetDensity *= 0.65;
    } else {
      targetDensity *= 1.25;
    }

    if (villageDist < 80) {
      targetDensity *= 0.15;
    } else if (villageDist < 140) {
      targetDensity *= 0.45;
    }

    const gladeNoise = vnoise(x / 14.0, z / 14.0);
    const isMeadow = biome.id === "meadow" || (surf.h >= 74 && surf.h <= 96 && biome.id === "oak_forest");
    const isPlains = biomeId === "plains";
    const flowerFactor = isMeadow ? 0.35 : (isPlains ? 0.30 : 0.14);
    const pickFrom = (arr: number[], hx: number, hz: number) => arr[Math.floor(hash2(hx, hz) * arr.length) % arr.length];
    const pickFlower = (hx: number, hz: number): number => {
      if (biomeId === "swamp" || biomeId === "mangrove") return pickFrom(SWAMP_FLOWERS, hx, hz);
      if (isMeadow || isPlains) return pickFrom(FIELD_FLOWERS, hx, hz);
      return pickFrom(FOREST_FLOWERS, hx, hz);
    };

    if ((isMeadow || isPlains) && surf.top === 1 && surf.h < 100 && vnoise(x / 24.0, z / 24.0) > 0.68) {
      const fRoll = hash2(x * 31 + 7, z * 43 + 19);
      if (fRoll < 0.55) {
        w(x, surf.h + 1, z, pickFrom(FIELD_FLOWERS, x * 17 + 3, z * 29 + 11));
        return;
      }
    }

    if (gladeNoise < 0.36 || isMeadow || isPlains) {
      if (surf.top === 1 && surf.h < 100) {
        const fRoll = hash2(x * 31 + 7, z * 43 + 19);
        if (fRoll < flowerFactor * 0.65) w(x, surf.h + 1, z, 124);
        else if (fRoll < flowerFactor) w(x, surf.h + 1, z, pickFlower(x * 17 + 3, z * 29 + 11));
      }
      if (gladeNoise < 0.36 && !isMeadow) return;
    }

    const fallbackFlowers = () => {
      if (surf.top === 1 && surf.h < 100) {
        const fRoll = hash2(x * 31 + 7, z * 43 + 19);
        if (fRoll < flowerFactor * 0.5) w(x, surf.h + 1, z, 124);
        else if (fRoll < flowerFactor) w(x, surf.h + 1, z, pickFlower(x * 17 + 3, z * 29 + 11));
      }
    };

    const ccx = Math.floor(x / TREE_CELL), ccz = Math.floor(z / TREE_CELL);
    const cand = treeCellCandidate(ccx, ccz, hash2(ccx * 31 + 7, ccz * 43 + 19), hash2(ccx * 17 + 3, ccz * 29 + 11));
    if (cand.x !== x || cand.z !== z) { fallbackFlowers(); return; }
    let acceptP = targetDensity * TREE_CELL * TREE_CELL;
    const clump = vnoise(x / 90.0, z / 90.0);
    acceptP *= clump > 0.6 ? 1.6 : (clump < 0.4 ? 0.45 : 1.0);
    if (acceptP > 1) acceptP = 1;
    if (roll > acceptP) { fallbackFlowers(); return; }

    const r = rngAt(x, z);
    switch (biome.tree) {
      case "cherry":       generateCherryTree(x, z, surf.h, r, w); break;
      case "crimson":      generateCrimsonMapleTree(x, z, surf.h, r, w); break;
      case "aspen":        generateGoldenAspenTree(x, z, surf.h, r, w); break;
      case "warped":       generateWarpedTree(x, z, surf.h, r, w); break;
      case "bamboo":       generateBambooGroves(x, z, surf.h, r, w, terrainHeight); break;
      case "redwood":      generateRedwoodTree(x, z, surf.h, r, w); break;
      case "spruce":       pine(x, z, surf.h, r, surf.frozen); break;
      case "dark_oak":
        if (r() < 0.18) generateHugeMushroom(x, z, surf.h, r, w, r() < 0.65);
        else generateDarkOakTree(x, z, surf.h, r, w);
        break;
      case "birch":        generateBirchTree(x, z, surf.h, r, w); break;
      case "mangrove":     generateMangroveTree(x, z, surf.h, r, w); break;
      case "acacia":       generateAcaciaTree(x, z, surf.h, r, w); break;
      case "jungle":
        generateJungleTree(x, z, surf.h, r, w);
        if (r() < 0.5) w(x + 1, surf.h + 1, z - 1, 361);
        break;
      case "palm":         generatePalmTree(x, z, surf.h, r, w); break;
      case "meadow":       generateMeadowTree(x, z, surf.h, r, w); break;
      case "alpine":       generateAlpinePine(x, z, surf.h, r, w); break;
      default:
        if (biomeId === "swamp") generateSwampOak(x, z, surf.h, r, w);
        else generateOakTree(x, z, surf.h, r, w);
        break;
    }
  }

  function genChunk(cx: number, cz: number): Chunk {
    const key = ckey(cx, cz);
    if (s.chunks.has(key)) return s.chunks.get(key)!;
    if (s.simMode && simFlat()) {
      const c: Chunk = { data: new Uint16Array(CH * CHH * CH), cx, cz, maxY: 64, meshes: null };
      const data = c.data;
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        for (let y = 0; y < 64; y++) data[y * 256 + lz * 16 + lx] = 5;
        data[64 * 256 + lz * 16 + lx] = 1;
      }
      s.chunks.set(key, c);
      return c;
    }
    const _genT0 = performance.now();
    const c: Chunk = { data: new Uint16Array(CH * CHH * CH), cx, cz, maxY: 0, meshes: null };
    s.chunks.set(key, c);
    origin.GC = c; origin.GX0 = cx * CH; origin.GZ0 = cz * CH;

    for (let z = origin.GZ0; z < origin.GZ0 + CH; z++) for (let x = origin.GX0; x < origin.GX0 + CH; x++) {
      const bRaw = getBiome(x, z);
      const bId = typeof bRaw === "string" ? bRaw : bRaw?.id;
      const surf = surfaceAt(x, z, bId);
      // Lateral rock cover: caves/mineshafts need solid rock around them, not just
      // above — otherwise tunnels punch out the flanks of narrow spires and ridges.
      const rockTop = Math.min(surf.h, minRingHeight(x, z, terrainHeight));

      w(x, 0, z, 14);
      for (let y = 1; y <= 4; y++) {
        if (hash3(x * 19 + 7, y * 31, z * 23 + 11) < (4 - y) * 0.28) w(x, y, z, 14);
      }

      for (let y = 1; y <= surf.h; y++) {
        if (y <= 4 && c.data[y * 256 + (z & 15) * 16 + (x & 15)] === 14) continue;

        let blockId: number;
        if (bId === "badlands" && y >= SEA - 4) {
          const TERRACOTTA_STRATA = [663, 515, 663, 710, 221, 589, 700, 452, 663, 515, 710, 589];
          const strata = TERRACOTTA_STRATA[y % TERRACOTTA_STRATA.length];
          blockId = (y === surf.h) ? surf.top : strata;
        } else {
          blockId = (y === surf.h) ? surf.top : (y > surf.h - 4 ? surf.sub : 5);
        }

        if (blockId === 5) {
          const oreR = hash3(x * 47 + 5, y * 29 + 13, z * 53 + 17);
          if (y <= 16 && oreR < 0.012) blockId = 35; // Diamond
          else if (y <= 20 && oreR < 0.024) blockId = 33; // Redstone
          else if (y <= 32 && oreR < 0.022) blockId = 32; // Gold
          else if (y <= 36 && oreR < 0.018) blockId = 34; // Lapis
          else if (y >= 88 && oreR < 0.016) blockId = 36; // Emerald ore on high mountain peaks
          else if (y <= 118 && oreR < (y > 65 ? 0.038 : 0.048)) blockId = 31; // Iron
          else if (y <= 122 && oreR < 0.075) blockId = 30; // Coal
        } else if (bId === "badlands" && blockId !== surf.top && y >= SEA - 4 && y <= 82) {
          // Extra near-surface gold ore in Badlands terracotta strata
          const oreR = hash3(x * 47 + 5, y * 29 + 13, z * 53 + 17);
          if (oreR < 0.035) blockId = 32;
        }

        let inVillageZone = false;
        for (const v of villagesNear(x, z)) {
          if (Math.hypot(x - v.vx, z - v.vz) < v.r + 12) {
            inVillageZone = true;
            break;
          }
        }
        const isUnderVillageBase = inVillageZone && y >= SEA - 14;

        if (!isUnderVillageBase && y >= 4 && y < rockTop - 2) {
          const mine = mineshaftAt(x, y, z);
          if (mine.isMine) {
            blockId = mine.blockId;
            if (mine.blockId === 45) {
              const chestKey = `${x},${y},${z}`;
              if (!s.chestMap.has(chestKey)) {
                const rMine = rngAt(x, z);
                s.chestMap.set(chestKey, [
                  { id: 31, count: 3 + Math.floor(rMine() * 5) },
                  { id: 30, count: 5 + Math.floor(rMine() * 8) },
                  { id: 32, count: 2 + Math.floor(rMine() * 4) },
                  { id: 33, count: 1 + Math.floor(rMine() * 3) },
                  ...Array(22).fill(null)
                ]);
              }
            }
          } else {
            const cave = caveAt(x, y, z, rockTop);
            if (cave.isCave) {
              if (cave.isLava) {
                blockId = 40;
              } else if (cave.isGrotto) {
                blockId = (y === 11) ? 39 : 0;
              } else {
                blockId = 0;
              }
            }
          }
        }

        w(x, y, z, blockId);
      }

      for (let y = surf.h + 1; y <= SEA; y++) w(x, y, z, (y === SEA && (surf.cold || surf.frozen)) ? 52 : 39);
    }

    for (let z = origin.GZ0 - 8; z < origin.GZ0 + CH + 8; z++) for (let x = origin.GX0 - 8; x < origin.GX0 + CH + 8; x++) scatter(x, z);
    for (const v of villagesNear(origin.GX0 + 8, origin.GZ0 + 8)) buildVillageInChunk(v);

    const centerSurf = surfaceAt(origin.GX0 + 8, origin.GZ0 + 8);
    const C_chunk = continentalAt(origin.GX0 + 8, origin.GZ0 + 8);
    if (C_chunk < -0.22 && centerSurf.h <= SEA - 9) {
      const shipHash = hash2(cx * 137 + 19, cz * 211 + 37);
      if (shipHash < 0.08) {
        const rShip = rngAt(origin.GX0 + 8, origin.GZ0 + 8);
        generateSunkenShipwreck(origin.GX0 + 8, centerSurf.h, origin.GZ0 + 8, rShip, w);
        const chestKey = (origin.GX0 + 8) + "," + (centerSurf.h + 2) + "," + (origin.GZ0 + 8 + 4);
        if (!s.chestMap.has(chestKey)) {
          s.chestMap.set(chestKey, [
            { id: 47, count: 2 + Math.floor(rShip() * 3) },
            { id: 45, count: 4 + Math.floor(rShip() * 6) },
            { id: 44, count: 6 + Math.floor(rShip() * 8) },
            { id: 64, count: 8 + Math.floor(rShip() * 12) },
            { id: 74, count: 1 + Math.floor(rShip() * 2) },
            ...Array(22).fill(null)
          ]);
        }
      }
    }

    const mHash = hash2(cx * 41 + 17, cz * 73 + 29);
    if (mHash < 0.28) {
      let springPlaced = false;
      for (let lz = 3; lz <= 12 && !springPlaced; lz += 3) {
        for (let lx = 3; lx <= 12 && !springPlaced; lx += 3) {
          const wx = origin.GX0 + lx, wz = origin.GZ0 + lz;
          const surf = surfaceAt(wx, wz);
          if (surf.h >= SEA + 12 && surf.slope >= 2) {
            const sy = surf.h;
            if (sy > 4 && sy < CHH - 4) {
              const below = c.data[(sy - 1) * 256 + lz * 16 + lx];
              if (below === 5 || below === 6) {
                const hasDrop = (c.data[sy * 256 + lz * 16 + (lx + 1)] === 0 ||
                                 c.data[sy * 256 + lz * 16 + (lx - 1)] === 0 ||
                                 c.data[sy * 256 + (lz + 1) * 16 + lx] === 0 ||
                                 c.data[sy * 256 + (lz - 1) * 16 + lx] === 0);
                if (hasDrop) {
                  const isLava = mHash < 0.05 && sy > SEA + 22;
                  const fluidId = isLava ? 40 : 39;
                  w(wx, sy, wz, fluidId);
                  s.liquidQ.push([wx, sy, wz, fluidId, 0]);
                  springPlaced = true;
                }
              }
            }
          }
        }
      }
    }

    // Mountain source pools: trunk minima in highland bowls become stream heads
    // with a queued liquid head so runtime water actually flows downhill.
    let sourcePlaced = false;
    for (let lz = 2; lz <= 13 && !sourcePlaced; lz += 2) {
      for (let lx = 2; lx <= 13 && !sourcePlaced; lx += 2) {
        const wx = origin.GX0 + lx, wz = origin.GZ0 + lz;
        const surf = surfaceAt(wx, wz);
        if (surf.h < SEA + 20 || surf.h > 100) continue;
        const info = riverInfoAt(wx, wz, surf.h);
        if (info.trunk > 0.02 || info.canyon) continue;
        let bowl = true;
        for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2]]) {
          if (terrainHeight(wx + dx, wz + dz) < surf.h - 1) { bowl = false; break; }
        }
        if (!bowl) continue;
        w(wx, surf.h, wz, 39);
        w(wx + 1, surfaceAt(wx + 1, wz).h, wz, 39);
        w(wx, surfaceAt(wx, wz + 1).h, wz + 1, 39);
        s.liquidQ.push([wx, surf.h, wz, 39, 0]);
        sourcePlaced = true;
      }
    }

    const chunkEdits = s.editsByChunk ? s.editsByChunk.get(key) : null;
    if (chunkEdits) {
      for (const [k, id] of chunkEdits) {
        const p = k.split(",");
        const x = +p[0], y = +p[1], z = +p[2];
        const off = y * 256 + (z & 15) * 16 + (x & 15);
        c.data[off] = id;
        if (id && y > c.maxY) c.maxY = y;
        const dirVal = s.blockDirs.get(k);
        if (dirVal !== undefined) {
          if (!c.dirs) c.dirs = new Uint16Array(CH * CHH * CH);
          if (BLOCK_MAP.get(id)?.stair) {
            c.dirs[off] = dirVal + 1;
          } else {
            c.dirs[off] = dirVal;
          }
        }
      }
    } else if (!s.editsByChunk && s.edits.size) {
      for (const [k, id] of s.edits) {
        const p = k.split(",");
        const x = +p[0], y = +p[1], z = +p[2];
        if (x >= origin.GX0 && x < origin.GX0 + CH && z >= origin.GZ0 && z < origin.GZ0 + CH) {
          const off = y * 256 + (z & 15) * 16 + (x & 15);
          c.data[off] = id;
          if (id && y > c.maxY) c.maxY = y;
          const dirVal = s.blockDirs.get(k);
          if (dirVal !== undefined) {
            if (!c.dirs) c.dirs = new Uint16Array(CH * CHH * CH);
            if (BLOCK_MAP.get(id)?.stair) {
              c.dirs[off] = dirVal + 1;
            } else {
              c.dirs[off] = dirVal;
            }
          }
        }
      }
    }
    origin.GC = null;
    perf.chunkOp("gen", key, performance.now() - _genT0);
    return c;
  }

  return { genChunk, scatter, pine, buildVillageInChunk, villagePlan };
}
