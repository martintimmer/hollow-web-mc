export interface HouseStyle {
  key: string;
  name: string;
  wall: number;
  roof: number;
  roofType: "gable" | "hip" | "flat" | "tower" | "spire";
  wMin: number;
  wMax: number;
  h: number;
  floors: number;
  carpet?: number;
  balcony?: boolean;
  isForge?: boolean;
  isLibrary?: boolean;
  isTavern?: boolean;
  isTower?: boolean;
  isManor?: boolean;
  isCathedral?: boolean;
}

export const STYLES: HouseStyle[] = [
  { key: "cottage", name: "Cozy Cottage", wall: 17, roof: 6, roofType: "gable", wMin: 7, wMax: 9, h: 4, floors: 1, carpet: 63 },
  { key: "forge", name: "Blacksmith Forge", wall: 6, roof: 8, roofType: "flat", wMin: 8, wMax: 10, h: 4, floors: 1, isForge: true },
  { key: "townhouse", name: "2-Story Townhouse", wall: 17, roof: 6, roofType: "gable", wMin: 7, wMax: 9, h: 8, floors: 2, carpet: 64, balcony: true },
  { key: "library", name: "2-Story Library", wall: 8, roof: 17, roofType: "hip", wMin: 8, wMax: 10, h: 8, floors: 2, carpet: 63, isLibrary: true },
  { key: "tavern", name: "2-Story Village Inn", wall: 23, roof: 6, roofType: "gable", wMin: 9, wMax: 11, h: 8, floors: 2, carpet: 63, isTavern: true },
  { key: "watchtower", name: "3-Story Watchtower", wall: 8, roof: 6, roofType: "tower", wMin: 6, wMax: 7, h: 12, floors: 3, isTower: true },
  { key: "manor", name: "3-Story Manor", wall: 17, roof: 29, roofType: "hip", wMin: 10, wMax: 13, h: 12, floors: 3, carpet: 64, isManor: true },
  { key: "cathedral", name: "4-Story Cathedral", wall: 8, roof: 6, roofType: "spire", wMin: 9, wMax: 12, h: 16, floors: 4, isCathedral: true }
];

export type VoxelWriter = (x: number, y: number, z: number, id: number) => void;
export type ClearUpFunc = (x: number, z: number, from: number) => void;
export type HeightLookup = (x: number, z: number) => number;
export type Hash2Func = (x: number, z: number) => number;
export type StairWriter = (x: number, y: number, z: number, id: number, facing: number) => void;

import { BED_ID } from "../blocks";

// ── Vanilla interior block ids (verified against catalog/completeRegistry.json) ──
const B_CRAFT = 41, B_FURNACE = 42, B_CHEST = 43, B_SHELF = 44, B_LANTERN = 46, B_GLOW = 47, B_HAY = 49;
const B_TORCH = 80, B_FIREPIT = 85, B_FENCE = 1174, B_PLANK = 17, B_LOG = 16;
const B_TRAP = 107, B_BARREL = 171, B_GRIND = 403, B_FLETCH = 366, B_CART = 234, B_SMOKER = 623, B_BLAST = 194;
const B_CUTTER = 639, B_COMPOST = 264, B_BREW = 209, B_SMITHY = 622, B_ANVIL = 151, B_CAULDRON = 236;
const B_CAKE = 228, B_POT = 367, B_CANDLE = 232, B_BELL = 179, B_CHAIN = 239, B_LADDER = 140, B_COBWEB = 259;
const B_FARM = 359, B_WHEAT = 692, B_DRIP = 349, B_LAVA = 40, B_COAL = 257, B_IRON = 414;
const B_CHISELSHELF = 243, B_LECTERN = 433, B_SLAB = 1185, B_CSLAB = 1186, B_BSLAB = 1188;
const B_OSTAIR = 70, B_COBBLE = 6, B_BRICK = 8;

export interface HouseDesignMeta {
  key: string;
  label: string;
  shell: string;
  w: number;
  requires: number[];
}

// Per-design shell size + the block ids each interior must contain (drift-tested).
export const HOUSE_DESIGN_META: HouseDesignMeta[] = [
  { key: "cozy_cottage", label: "Cozy Cottage", shell: "cottage", w: 9, requires: [B_CRAFT, B_FURNACE, BED_ID, B_LANTERN, B_CHEST] },
  { key: "farm_shack", label: "Farm Shack", shell: "cottage", w: 7, requires: [B_COMPOST, BED_ID, B_TORCH, B_BARREL, B_CHEST] },
  { key: "blacksmith_forge", label: "Blacksmith Forge", shell: "forge", w: 10, requires: [B_ANVIL, B_BLAST, B_LAVA, BED_ID, B_LANTERN] },
  { key: "weaponsmith", label: "Weaponsmith Workshop", shell: "forge", w: 10, requires: [B_GRIND, B_ANVIL, B_LAVA, BED_ID] },
  { key: "toolsmith", label: "Toolsmith", shell: "forge", w: 9, requires: [B_SMITHY, B_GRIND, BED_ID] },
  { key: "townhouse_home", label: "2-Story Townhouse", shell: "townhouse", w: 9, requires: [B_CRAFT, B_FURNACE, B_CAKE, BED_ID, B_LANTERN, B_CHEST] },
  { key: "family_home", label: "Family Home", shell: "townhouse", w: 9, requires: [B_CRAFT, B_FURNACE, BED_ID, B_CHEST, B_LANTERN] },
  { key: "village_library", label: "Village Library", shell: "library", w: 10, requires: [B_LECTERN, B_SHELF, BED_ID, B_LANTERN] },
  { key: "cartographer_house", label: "Cartographer's House", shell: "library", w: 9, requires: [B_CART, BED_ID, B_CHEST] },
  { key: "village_tavern", label: "Village Tavern", shell: "tavern", w: 11, requires: [B_BREW, B_BARREL, B_SMOKER, BED_ID] },
  { key: "meeting_house", label: "Meeting House", shell: "tavern", w: 10, requires: [B_BELL, B_LECTERN, BED_ID] },
  { key: "watchtower_post", label: "Watchtower Post", shell: "watchtower", w: 7, requires: [B_BELL, B_LADDER, BED_ID, B_CHEST] },
  { key: "manor_hall", label: "Manor Grand Hall", shell: "manor", w: 12, requires: [B_FIREPIT, BED_ID, B_CHEST, B_SHELF] },
  { key: "country_manor", label: "Country Manor", shell: "manor", w: 11, requires: [B_CRAFT, B_FURNACE, BED_ID, B_CHEST] },
  { key: "village_cathedral", label: "Village Cathedral", shell: "cathedral", w: 11, requires: [B_LANTERN, B_LECTERN, BED_ID, B_CANDLE] },
  { key: "cleric_temple", label: "Cleric's Temple", shell: "cathedral", w: 10, requires: [B_BREW, B_CAULDRON, BED_ID] },
  { key: "fisherman_cottage", label: "Fisherman's Cottage", shell: "cottage", w: 8, requires: [B_BARREL, BED_ID, B_FIREPIT] },
  { key: "butcher_shop", label: "Butcher's Shop", shell: "forge", w: 9, requires: [B_SMOKER, B_BARREL, BED_ID] },
  { key: "fletcher_house", label: "Fletcher's House", shell: "cottage", w: 8, requires: [B_FLETCH, BED_ID, B_CHEST] },
  { key: "mason_house", label: "Mason's House", shell: "forge", w: 9, requires: [B_CUTTER, B_BARREL, BED_ID] }
];

interface FurnishKit {
  x0: number; z0: number; x1: number; z1: number;
  IX0: number; IX1: number; IZ0: number; IZ1: number;
  floors: number;
  P(x: number, y: number, z: number, id: number): void;
  ST(x: number, y: number, z: number, f: number, id?: number): void;
  fy(f: number): number;
  W(): number;
  rug(xa: number, za: number, xb: number, zb: number, wool: number, f: number): void;
  bed(x: number, z: number, blanket: number, f: number): void;
  table(cx: number, cz: number, f: number, top?: number): void;
  sofa(x: number, za: number, zb: number, f: number, wool: number): void;
  dresser(x: number, z: number, f: number): void;
  chest(x: number, y: number, z: number): void;
  loot?(x: number, y: number, z: number): void;
  lampSpot(x: number, z: number, f: number): void;
  chainLamp(x: number, z: number, f: number): void;
  fireplace(x: number, z: number, f: number): void;
  counter(x: number, z: number, f: number, kind: number): void;
  shelfRow(x: number, za: number, zb: number, f: number, id: number): void;
  potShelf(x: number, z: number, f: number): void;
  candleSpot(x: number, z: number, f: number): void;
  desk(x: number, z: number, f: number): void;
  wallArt(x: number, z: number, f: number, canvas: number): void;
}

// Deterministic interior choice for a placed house: same seed/coords → same design.
export function pickInteriorKey(styleKey: string, x0: number, z0: number, hash2: Hash2Func): string {
  const pool = HOUSE_DESIGN_META.filter((d) => d.shell === styleKey);
  if (!pool.length) return "cozy_cottage";
  const h = hash2(x0 * 13 + 5, z0 * 17 + 9);
  return pool[Math.abs(Math.floor(h * pool.length)) % pool.length].key;
}

function makeKit(H: any, w: VoxelWriter, stair: StairWriter, lootCb?: (x: number, y: number, z: number) => void, artCb?: (x: number, y: number, z: number) => void): FurnishKit {
  const { x0, z0, x1, z1, base, style: S } = H;
  const doorX: number = typeof H.dx === "number" ? H.dx : Math.floor((x0 + x1) / 2);
  const doorZ: number = typeof H.dz === "number" ? H.dz : Math.floor((z0 + z1) / 2);
  const doorOutX: number = typeof H.dox === "number" ? H.dox : doorX;
  const doorOutZ: number = typeof H.doz === "number" ? H.doz : doorZ;
  const floors: number = S.floors || 1;
  const IX0 = x0 + 1, IX1 = x1 - 1, IZ0 = z0 + 1, IZ1 = z1 - 1;
  const inb = (x: number, z: number) => x >= IX0 && x <= IX1 && z >= IZ0 && z <= IZ1;
  const P = (x: number, y: number, z: number, id: number) => { if (inb(x, z)) w(x, y, z, id); };
  const ST = (x: number, y: number, z: number, f: number, id: number = B_OSTAIR) => { if (inb(x, z)) stair(x, y, z, id, f); };
  const K: FurnishKit = {
    x0, z0, x1, z1, IX0, IX1, IZ0, IZ1, floors,
    P, ST,
    fy: (f: number) => base + Math.min(f, floors - 1) * 4 + 1,
    W: () => IX1 - IX0 + 1,
    rug: (xa, za, xb, zb, wool, f) => {
      for (let z = Math.max(za, IZ0); z <= Math.min(zb, IZ1); z++)
        for (let x = Math.max(xa, IX0); x <= Math.min(xb, IX1); x++)
          if (!((x === doorX && z === doorZ) || (x === doorOutX && z === doorOutZ))) w(x, f - 1, z, wool);
    },
    bed: (x, z, blanket, f) => {
      P(x, f, z, BED_ID);
      P(x, f, z - 1 >= IZ0 ? z - 1 : z + 1, blanket);
    },
    table: (cx, cz, f, top = B_SLAB) => {
      P(cx, f, cz, B_FENCE);
      P(cx, f + 1, cz, top);
      ST(cx + 1, f, cz, 3); ST(cx - 1, f, cz, 2); ST(cx, f, cz + 1, 1); ST(cx, f, cz - 1, 0);
    },
    sofa: (x, za, zb, f, wool) => {
      for (let z = Math.max(za, IZ0); z <= Math.min(zb, IZ1); z++) {
        ST(x, f, z, 2);
        P(x + 1, f, z, wool);
      }
    },
    dresser: (x, z, f) => {
      K.chest(x, f, z);
      K.chest(x + 1, f, z);
      P(x, f + 1, z, B_BARREL);
    },
    chest: (x, y, z) => {
      P(x, y, z, B_CHEST);
      if (K.loot) K.loot(x, y, z);
    },
    loot: lootCb,
    lampSpot: (x, z, f) => {
      P(x, f, z, B_FENCE);
      P(x, f + 1, z, B_LANTERN);
    },
    chainLamp: (x, z, f) => {
      P(x, f + 2, z, B_CHAIN);
      P(x, f + 1, z, B_LANTERN);
    },
    fireplace: (x, z, f) => {
      P(x, f, z, B_FIREPIT);
      P(x - 1, f, z, B_COBBLE); P(x + 1, f, z, B_COBBLE); P(x, f, z - 1, B_COBBLE);
      P(x - 1, f + 1, z, B_COBBLE); P(x + 1, f + 1, z, B_COBBLE);
      P(x, f + 2, z, B_BRICK); P(x, f + 3, z, B_BSLAB);
    },
    counter: (x, z, f, kind) => {
      P(x, f, z, kind);
      P(x, f + 1, z, B_CSLAB);
    },
    shelfRow: (x, za, zb, f, id) => {
      for (let z = Math.max(za, IZ0); z <= Math.min(zb, IZ1); z++) { P(x, f, z, id); P(x, f + 1, z, id); }
    },
    potShelf: (x, z, f) => {
      P(x, f, z, B_PLANK);
      P(x, f + 1, z, B_POT);
    },
    candleSpot: (x, z, f) => {
      P(x, f, z, B_CANDLE);
    },
    desk: (x, z, f) => {
      P(x, f, z, B_PLANK);
      P(x, f + 1, z, B_SLAB);
    },
    wallArt: (x, z, f, canvas) => {
      P(x, f + 1, z, B_LOG);
      P(x, f + 2, z, canvas);
      if (artCb) artCb(x, f + 1, z);
    }
  };
  return K;
}

type DesignFn = (K: FurnishKit, H: any) => void;

function designCozyCottage(K: FurnishKit, _H: any): void {
  const f = K.fy(0);
  K.rug(K.IX0 + 1, K.IZ0 + 1, K.IX1 - 1, K.IZ1 - 1, 63, f);
  K.bed(K.IX0, K.IZ0, 62, f);
  K.counter(K.IX1, K.IZ1, f, B_FURNACE);
  const kx = K.IX1 - 1;
  K.P(kx, f, K.IZ1, B_CRAFT);
  K.P(K.IX0, f, K.IZ1, B_BARREL);
  K.P(K.IX0, f + 1, K.IZ1, B_BARREL);
  K.chest(K.IX0 + 1, f, K.IZ1);
  K.table(K.IX0 + 3, K.IZ0 + 3, f);
  K.fireplace(K.IX1, Math.floor((K.IZ0 + K.IZ1) / 2), f);
  K.lampSpot(K.IX0 + 1, Math.floor((K.IZ0 + K.IZ1) / 2), f);
  K.P(K.IX1 - 1, f + 1, K.IZ0, B_POT);
  K.candleSpot(K.IX0 + 2, K.IZ0 + 3, f);
  K.P(K.IX1, f, K.IZ0, B_SHELF);
  K.P(K.IX1, f + 1, K.IZ0, B_SHELF);
  K.wallArt(K.IX1 - 1, K.IZ0, f, 63);
}

function designFarmShack(K: FurnishKit, _H: any): void {
  const f = K.fy(0);
  K.bed(K.IX0, K.IZ0, 66, f);
  K.P(K.IX1, f, K.IZ0, B_COMPOST);
  K.P(K.IX1, f, K.IZ0 + 1, B_HAY);
  K.P(K.IX0, f, K.IZ1, B_BARREL);
  K.chest(K.IX1 - 1, f, K.IZ1);
  K.P(K.IX1 - 1, f + 1, K.IZ1, B_TORCH);
  K.P(K.IX0 + 1, f + 1, K.IZ0, B_POT);
  K.P(K.IX1 - 1, f, K.IZ1 - 1, B_FARM);
  K.P(K.IX1 - 1, f + 1, K.IZ1 - 1, B_WHEAT);
  K.rug(K.IX0, K.IZ1 - 1, K.IX0 + 1, K.IZ1, 66, f);
  K.table(K.IX0 + 2, K.IZ0 + 2, f);
  K.P(K.IX0, f, K.IZ0 + 2, B_SHELF);
  K.P(K.IX0, f + 1, K.IZ0 + 2, B_SHELF);
  K.wallArt(K.IX0, K.IZ1, f, 66);
}

function designBlacksmith(K: FurnishKit, _H: any): void {
  const f = K.fy(0);
  const cx = Math.floor((K.IX0 + K.IX1) / 2), cz = Math.floor((K.IZ0 + K.IZ1) / 2);
  K.P(cx, f, cz, B_ANVIL);
  K.P(cx - 1, f, cz, B_BRICK); K.P(cx + 1, f, cz, B_BRICK);
  K.P(cx, f, cz - 1, B_LAVA);
  K.P(cx - 1, f, cz - 1, B_COBBLE); K.P(cx + 1, f, cz - 1, B_COBBLE); K.P(cx, f, cz - 2, B_COBBLE);
  K.P(K.IX0, f, K.IZ0, B_BLAST);
  K.P(K.IX0 + 1, f, K.IZ0, B_SMITHY);
  K.P(K.IX1, f, K.IZ0, B_GRIND);
  K.P(K.IX0, f, K.IZ1, B_BARREL);
  K.P(K.IX0, f + 1, K.IZ1, B_COAL);
  K.chest(K.IX1, f, K.IZ1);
  K.bed(K.IX0, K.IZ1 - 1, 67, f);
  K.chainLamp(cx, cz + 2, f);
  K.P(cx, f + 1, cz + 2, B_LANTERN);
  K.desk(K.IX1, K.IZ1 - 1, f);
  K.ST(K.IX1 - 1, K.IZ1 - 1, f, 2);
  K.P(K.IX1, f, K.IZ0 + 1, B_SHELF);
  K.P(K.IX1, f + 1, K.IZ0 + 1, B_SHELF);
  K.wallArt(K.IX0, K.IZ0, f, 67);
}

function designWeaponsmith(K: FurnishKit, _H: any): void {
  const f = K.fy(0);
  const cx = Math.floor((K.IX0 + K.IX1) / 2), cz = Math.floor((K.IZ0 + K.IZ1) / 2);
  K.P(cx - 1, f, cz, B_GRIND);
  K.P(cx + 1, f, cz, B_ANVIL);
  K.P(cx, f, cz - 1, B_SMOKER);
  K.P(cx, f + 1, cz - 1, B_IRON);
  K.P(cx, f, cz + 1, B_LAVA);
  K.P(cx - 1, f, cz + 1, B_COBBLE); K.P(cx + 1, f, cz + 1, B_COBBLE);
  K.P(K.IX0, f, K.IZ0, B_FENCE);
  K.P(K.IX0, f + 1, K.IZ0, B_IRON);
  K.chest(K.IX1, f, K.IZ0);
  K.P(K.IX0, f, K.IZ1, B_BARREL);
  K.P(K.IX0, f + 1, K.IZ1, B_COAL);
  K.bed(K.IX1, K.IZ1 - 1, 67, f);
  K.P(K.IX1 - 2, f, K.IZ0, B_SLAB);
  K.candleSpot(K.IX1 - 2, K.IZ0, f + 1);
  K.table(K.IX0 + 2, K.IZ1 - 1, f);
  K.P(K.IX0, f, K.IZ0 + 1, B_SHELF);
  K.P(K.IX0, f + 1, K.IZ0 + 1, B_SHELF);
  K.wallArt(K.IX1, K.IZ0, f, 67);
}

function designToolsmith(K: FurnishKit, _H: any): void {
  const f = K.fy(0);
  const cx = Math.floor((K.IX0 + K.IX1) / 2), cz = Math.floor((K.IZ0 + K.IZ1) / 2);
  K.P(cx, f, cz, B_SMITHY);
  K.P(cx - 1, f, cz, B_GRIND);
  K.P(cx + 1, f, cz, B_GRIND);
  K.P(cx - 2, f, cz, B_LOG);
  K.P(cx - 2, f + 1, cz, B_SLAB);
  K.P(K.IX0, f, K.IZ0, B_BARREL);
  K.P(K.IX0, f + 1, K.IZ0, B_IRON);
  K.chest(K.IX1, f, K.IZ0);
  K.chest(K.IX1, f + 1, K.IZ0);
  K.P(K.IX0, f, K.IZ1, B_ANVIL);
  K.bed(K.IX1, K.IZ1 - 1, 453, f);
  K.lampSpot(cx + 2, cz + 1, f);
  K.desk(K.IX0 + 1, K.IZ1, f);
  K.ST(K.IX0 + 2, K.IZ1, f, 3);
  K.P(K.IX1, f, K.IZ0 + 2, B_SHELF);
  K.P(K.IX1, f + 1, K.IZ0 + 2, B_SHELF);
  K.wallArt(K.IX0, K.IZ1, f, 453);
}

function designTownhouse(K: FurnishKit, _H: any): void {
  const f0 = K.fy(0), f1 = K.fy(1);
  K.sofa(K.IX0, K.IZ0 + 1, K.IZ1 - 2, f0, 64);
  K.P(K.IX0 + 2, f0, Math.floor((K.IZ0 + K.IZ1) / 2), B_SLAB);
  K.candleSpot(K.IX0 + 2, Math.floor((K.IZ0 + K.IZ1) / 2), f0 + 1);
  K.P(K.IX1 - 1, f0, K.IZ0, B_CRAFT);
  K.P(K.IX1, f0, K.IZ0, B_FURNACE);
  K.P(K.IX1 - 1, f0, K.IZ0 + 1, B_CAKE);
  K.P(K.IX0, f0, K.IZ1, B_BARREL);
  K.table(K.IX1 - 2, K.IZ1 - 1, f0);
  K.rug(K.IX0 + 1, K.IZ0 + 3, K.IX0 + 3, K.IZ1 - 1, 64, f0);
  K.P(K.IX1, f0, K.IZ0 + 2, B_SHELF);
  K.P(K.IX1, f0 + 1, K.IZ0 + 2, B_SHELF);
  K.wallArt(K.IX0, K.IZ1, f0, 64);
  K.fireplace(K.IX1, K.IZ1, f0);
  K.bed(K.IX0, K.IZ1, 531, f1);
  K.dresser(K.IX1 - 1, K.IZ1, f1);
  K.P(K.IX1, f1 - 1, K.IZ0, B_POT);
  K.P(K.IX0 + 1, f1, K.IZ0, B_CANDLE);
  K.chainLamp(Math.floor((K.IX0 + K.IX1) / 2), Math.floor((K.IZ0 + K.IZ1) / 2), f1);
  K.desk(K.IX0 + 1, K.IZ1, f1);
  K.ST(K.IX0 + 1, K.IZ1 - 1, f1, 0);
  K.wallArt(K.IX0, K.IZ1, f1, 64);
}

function designFamilyHome(K: FurnishKit, _H: any): void {
  const f0 = K.fy(0), f1 = K.fy(1);
  K.P(K.IX0, f0, K.IZ0, B_FURNACE);
  K.P(K.IX0 + 1, f0, K.IZ0, B_CRAFT);
  K.P(K.IX0 + 2, f0, K.IZ0, B_CAKE);
  K.P(K.IX1, f0, K.IZ0, B_BARREL);
  K.P(K.IX1, f0, K.IZ0 + 1, B_BARREL);
  K.table(K.IX0 + 3, K.IZ1 - 1, f0);
  K.sofa(K.IX1, K.IZ0 + 2, K.IZ1 - 2, f0, 63);
  K.fireplace(K.IX1, K.IZ0 + 1, f0);
  K.P(K.IX0, f0, K.IZ1, B_SHELF);
  K.P(K.IX0, f0 + 1, K.IZ1, B_SHELF);
  K.wallArt(K.IX0, K.IZ0, f0, 63);
  K.bed(K.IX0, K.IZ1, 64, f1);
  K.bed(K.IX1, K.IZ1, 65, f1);
  K.dresser(K.IX0, K.IZ0 + 1, f1);
  K.chest(K.IX1 - 1, f1, K.IZ0);
  K.chainLamp(Math.floor((K.IX0 + K.IX1) / 2), Math.floor((K.IZ0 + K.IZ1) / 2), f1);
  K.desk(K.IX0 + 1, K.IZ1, f1);
  K.ST(K.IX0 + 1, K.IZ1 - 1, f1, 0);
  K.P(K.IX1, f1, K.IZ0 + 1, B_SHELF);
  K.P(K.IX1, f1 + 1, K.IZ0 + 1, B_SHELF);
  K.wallArt(K.IX1 - 1, K.IZ0, f1, 65);
}

function designLibrary(K: FurnishKit, _H: any): void {
  const f0 = K.fy(0), f1 = K.fy(1);
  const cx = Math.floor((K.IX0 + K.IX1) / 2);
  K.P(cx, f0, Math.floor((K.IZ0 + K.IZ1) / 2), B_LECTERN);
  K.shelfRow(K.IX0, K.IZ0, K.IZ1, f0, B_SHELF);
  K.shelfRow(K.IX1, K.IZ0, K.IZ1, f0, B_CHISELSHELF);
  K.P(K.IX0 + 2, f0, K.IZ0, B_SLAB);
  K.table(K.IX0 + 3, K.IZ0 + 1, f0);
  K.P(K.IX0 + 2, f0 + 1, K.IZ0, B_CANDLE);
  K.ST(K.IX0 + 3, f0, K.IZ0, 2); K.ST(K.IX0 + 1, f0, K.IZ0, 3);
  K.rug(cx - 1, K.IZ0 + 2, cx + 1, K.IZ1 - 1, 63, f0);
  K.chainLamp(cx, K.IZ0 + 3, f0);
  K.chainLamp(cx, K.IZ1 - 2, f0);
  K.P(K.IX1 - 1, f0, K.IZ1, B_GLOW);
  K.bed(K.IX0, K.IZ1, 62, f1);
  K.P(K.IX0, f1 + 1, K.IZ1, B_COBWEB);
  K.shelfRow(K.IX0, K.IZ0, K.IZ0 + 3, f1, B_SHELF);
  K.dresser(K.IX1 - 1, K.IZ1, f1);
  K.lampSpot(K.IX1, K.IZ1 - 1, f1);
  K.desk(K.IX1, K.IZ0, f1);
  K.ST(K.IX1 - 1, K.IZ0, f1, 2);
  K.wallArt(K.IX0 + 1, K.IZ1, f1, 62);
}

function designCartographer(K: FurnishKit, _H: any): void {
  const f0 = K.fy(0), f1 = K.fy(1);
  const cx = Math.floor((K.IX0 + K.IX1) / 2), cz = Math.floor((K.IZ0 + K.IZ1) / 2);
  K.P(cx, f0, cz, B_CART);
  K.P(cx - 1, f0, cz, B_SLAB);
  K.P(cx - 1, f0 + 1, cz, 62);
  K.P(cx + 1, f0, cz, B_IRON);
  K.chest(K.IX0, f0, K.IZ0);
  K.chest(K.IX0, f0 + 1, K.IZ0);
  K.P(K.IX1, f0, K.IZ0, B_BARREL);
  K.table(cx, K.IZ1 - 1, f0);
  K.lampSpot(K.IX1, K.IZ0 + 1, f0);
  K.rug(cx - 1, K.IZ0 + 1, cx + 1, K.IZ0 + 3, 64, f0);
  K.P(K.IX0, f0, K.IZ0 + 1, B_SHELF);
  K.P(K.IX0, f0 + 1, K.IZ0 + 1, B_SHELF);
  K.wallArt(K.IX1, K.IZ0, f0, 64);
  K.bed(K.IX0, K.IZ1, 453, f1);
  K.chest(K.IX1 - 1, f1, K.IZ1);
  K.potShelf(K.IX1, K.IZ0 + 1, f1);
  K.desk(K.IX0 + 1, K.IZ1, f1);
  K.ST(K.IX0 + 1, K.IZ1 - 1, f1, 0);
  K.wallArt(K.IX1 - 1, K.IZ1, f1, 453);
}

function designTavern(K: FurnishKit, _H: any): void {
  const f0 = K.fy(0), f1 = K.fy(1);
  const bz = Math.floor((K.IZ0 + K.IZ1) / 2);
  for (let x = K.IX0 + 1; x <= K.IX1 - 1; x++) {
    K.P(x, f0, bz, B_FENCE);
    K.P(x, f0 + 1, bz, B_PLANK);
  }
  K.ST(K.IX0 + 1, f0, bz - 1, 0); K.ST(K.IX0 + 3, f0, bz - 1, 0);
  K.P(K.IX0 + 2, f0, bz + 1, B_BREW);
  K.P(K.IX1, f0, K.IZ0, B_BARREL);
  K.P(K.IX1, f0 + 1, K.IZ0, B_BARREL);
  K.P(K.IX1 - 1, f0, K.IZ0, B_BARREL);
  for (let i = 0; i < 2; i++) {
    const tx = K.IX0 + 2 + i * 3;
    K.P(tx, f0, K.IZ1 - 1, B_SLAB);
    K.ST(tx - 1, f0, K.IZ1 - 1, 2); K.ST(tx + 1, f0, K.IZ1 - 1, 3);
  }
  K.fireplace(K.IX0, K.IZ0, f0);
  K.chainLamp(Math.floor((K.IX0 + K.IX1) / 2), bz, f0);
  K.P(K.IX1 - 1, f0, K.IZ1, B_SMOKER);
  K.P(K.IX1, f0, K.IZ1 - 1, B_SHELF);
  K.P(K.IX1, f0 + 1, K.IZ1 - 1, B_SHELF);
  K.wallArt(K.IX1 - 1, K.IZ1, f0, 63);
  K.bed(K.IX0, K.IZ0 + 1, 62, f1);
  K.dresser(K.IX1 - 1, K.IZ1, f1);
  K.lampSpot(K.IX1, K.IZ1 - 1, f1);
  K.table(K.IX0 + 2, K.IZ1 - 1, f1);
  K.P(K.IX0, f1, K.IZ1, B_SHELF);
  K.P(K.IX0, f1 + 1, K.IZ1, B_SHELF);
  K.wallArt(K.IX0, K.IZ0 + 1, f1, 62);
}

function designMeetingHouse(K: FurnishKit, _H: any): void {
  const f0 = K.fy(0), f1 = K.fy(1);
  const cx = Math.floor((K.IX0 + K.IX1) / 2);
  K.P(K.IX0 + 1, f0, K.IZ0, B_BELL);
  K.P(K.IX0 + 1, f0 + 1, K.IZ0, B_FENCE);
  for (let rI = 0; rI < 2; rI++) {
    const z = K.IZ0 + 2 + rI * 2;
    for (let x = K.IX0 + 1; x <= K.IX1 - 1; x++) K.ST(x, f0, z, 0);
  }
  K.P(cx, f0, K.IZ1 - 1, B_LECTERN);
  K.rug(cx - 1, K.IZ0 + 2, cx + 1, K.IZ1 - 2, 63, f0);
  K.fireplace(K.IX1, Math.floor((K.IZ0 + K.IZ1) / 2), f0);
  K.chainLamp(cx, K.IZ0 + 3, f0);
  K.P(K.IX0, f0, K.IZ1, B_BARREL);
  K.P(K.IX0, f0 + 1, K.IZ1, B_HAY);
  K.table(K.IX0 + 2, K.IZ1 - 2, f0);
  K.P(K.IX1, f0, K.IZ0 + 1, B_SHELF);
  K.P(K.IX1, f0 + 1, K.IZ0 + 1, B_SHELF);
  K.wallArt(K.IX1, K.IZ1, f0, 63);
  K.bed(K.IX1, K.IZ1, 453, f1);
  K.dresser(K.IX0, K.IZ1, f1);
  K.desk(K.IX0 + 2, K.IZ1, f1);
  K.ST(K.IX0 + 2, K.IZ1 - 1, f1, 0);
  K.P(K.IX0, f1, K.IZ0, B_SHELF);
  K.P(K.IX0, f1 + 1, K.IZ0, B_SHELF);
  K.wallArt(K.IX1, K.IZ1, f1, 453);
}

function designWatchtower(K: FurnishKit, _H: any): void {
  const f0 = K.fy(0), f1 = K.fy(1), f2 = K.fy(2);
  const cx = Math.floor((K.IX0 + K.IX1) / 2), cz = Math.floor((K.IZ0 + K.IZ1) / 2);
  K.P(K.IX0, f0, K.IZ0, B_BELL);
  K.chest(K.IX1, f0, K.IZ0);
  K.chest(K.IX1, f0 + 1, K.IZ0);
  K.P(K.IX0, f0, K.IZ1, B_LANTERN);
  K.P(cx, f0, cz, B_LADDER);
  K.P(cx, f0 + 1, cz, B_LADDER);
  K.bed(K.IX1, K.IZ1 - 1, 67, f1);
  K.chest(K.IX0, f1, K.IZ0);
  K.P(K.IX1, f1, K.IZ0, B_TORCH);
  K.P(K.IX0, f1 + 1, K.IZ0, B_COBWEB);
  K.P(cx, f1, cz, B_LADDER);
  K.P(K.IX0, f1, K.IZ1, B_SHELF);
  K.P(K.IX0, f1 + 1, K.IZ1, B_SHELF);
  K.wallArt(K.IX1, K.IZ0, f1, 67);
  K.P(cx, f2, cz, B_GLOW);
  K.P(cx - 1, f2, cz, B_LANTERN);
  K.P(cx + 1, f2, cz, B_LANTERN);
  K.P(K.IX0, f2, K.IZ1, B_BARREL);
  K.P(K.IX1, f2, K.IZ1, B_PLANK);
  K.wallArt(K.IX1, K.IZ1, f2, 67);
}

function designManorHall(K: FurnishKit, _H: any): void {
  const f0 = K.fy(0), f1 = K.fy(1), f2 = K.fy(2);
  const cx = Math.floor((K.IX0 + K.IX1) / 2), cz = Math.floor((K.IZ0 + K.IZ1) / 2);
  K.rug(cx - 1, K.IZ0, cx + 1, K.IZ1, 63, f0);
  K.chainLamp(cx, K.IZ0 + 2, f0);
  K.chainLamp(cx, K.IZ1 - 2, f0);
  K.sofa(K.IX0, K.IZ0 + 2, K.IZ0 + 5, f0, 63);
  K.P(K.IX0 + 2, f0, K.IZ0 + 3, B_SLAB);
  K.fireplace(K.IX0, K.IZ1 - 1, f0);
  for (let i = 0; i < 3; i++) {
    const tx = K.IX1 - 4 + i * 2;
    K.P(tx, f0, K.IZ1 - 1, B_SLAB);
    K.ST(tx - 1, f0, K.IZ1 - 1, 2); K.ST(tx + 1, f0, K.IZ1 - 1, 3);
  }
  K.chest(K.IX1, f0, K.IZ0);
  K.chest(K.IX1, f0 + 1, K.IZ0);
  K.potShelf(K.IX0, K.IZ0 + 1, f0);
  K.potShelf(K.IX0, K.IZ1, f0);
  K.desk(K.IX1 - 1, K.IZ0, f0);
  K.ST(K.IX1 - 2, K.IZ0, f0, 2);
  K.P(K.IX1, f0, K.IZ0 + 1, B_SHELF);
  K.P(K.IX1, f0 + 1, K.IZ0 + 1, B_SHELF);
  K.wallArt(K.IX1 - 2, K.IZ1 - 1, f0, 63);
  K.bed(K.IX0, K.IZ1, 531, f1);
  K.dresser(K.IX1 - 1, K.IZ1, f1);
  K.shelfRow(K.IX1, K.IZ0, K.IZ0 + 3, f1, B_SHELF);
  K.desk(K.IX0 + 1, K.IZ1, f1);
  K.ST(K.IX0 + 1, K.IZ1 - 1, f1, 0);
  K.wallArt(K.IX0, K.IZ1, f1, 531);
  K.bed(K.IX0, K.IZ1, 466, f2);
  K.chest(K.IX1 - 1, f2, K.IZ1);
  K.P(K.IX0 + 1, f2, K.IZ0, B_CANDLE);
  K.chainLamp(cx, cz, f2);
  K.table(cx, K.IZ1 - 2, f2);
  K.P(K.IX1, f2, K.IZ0, B_SHELF);
  K.P(K.IX1, f2 + 1, K.IZ0, B_SHELF);
  K.wallArt(K.IX1 - 1, K.IZ1, f2, 466);
}

function designCountryManor(K: FurnishKit, _H: any): void {
  const f0 = K.fy(0), f1 = K.fy(1), f2 = K.fy(2);
  const cx = Math.floor((K.IX0 + K.IX1) / 2);
  K.P(K.IX0, f0, K.IZ0, B_FURNACE);
  K.P(K.IX0 + 1, f0, K.IZ0, B_CAKE);
  K.P(K.IX1, f0, K.IZ0, B_SMOKER);
  K.P(K.IX1, f0, K.IZ0 + 1, B_BARREL);
  K.P(K.IX1, f0, K.IZ0 + 2, B_BARREL);
  K.table(cx, K.IZ1 - 2, f0);
  K.sofa(K.IX1, K.IZ0 + 4, K.IZ1 - 3, f0, 66);
  K.fireplace(K.IX1, K.IZ1 - 2, f0);
  K.rug(cx - 1, K.IZ0 + 1, cx + 1, K.IZ0 + 4, 66, f0);
  K.P(K.IX0, f0, K.IZ1, B_CRAFT);
  K.bed(K.IX0, K.IZ1, 64, f1);
  K.dresser(K.IX1 - 1, K.IZ1, f1);
  K.P(K.IX1, f1, K.IZ0, B_POT);
  K.P(K.IX0, f0, K.IZ0 + 1, B_SHELF);
  K.P(K.IX0, f0 + 1, K.IZ0 + 1, B_SHELF);
  K.desk(K.IX1 - 1, K.IZ1, f0);
  K.ST(K.IX1 - 2, K.IZ1, f0, 2);
  K.wallArt(K.IX0 + 1, K.IZ0, f0, 66);
  K.bed(K.IX0, K.IZ0 + 1, 531, f2);
  K.chest(K.IX1 - 1, f2, K.IZ0);
  K.P(K.IX1 - 1, f2, K.IZ0 + 1, B_CANDLE);
  K.P(K.IX0 + 1, f2, K.IZ0 + 1, B_TRAP);
  K.lampSpot(K.IX1, K.IZ1 - 1, f2);
  K.desk(K.IX0 + 1, K.IZ1, f1);
  K.ST(K.IX0 + 1, K.IZ1 - 1, f1, 0);
  K.wallArt(K.IX1, K.IZ0, f1, 64);
  K.P(K.IX1, f1, K.IZ0 + 1, B_SHELF);
  K.P(K.IX1, f1 + 1, K.IZ0 + 1, B_SHELF);
  K.P(K.IX1, f2, K.IZ1, B_SHELF);
  K.P(K.IX1, f2 + 1, K.IZ1, B_SHELF);
  K.wallArt(K.IX1 - 1, K.IZ0, f2, 531);
  K.dresser(K.IX0, K.IZ1, f2);
}

function designCathedral(K: FurnishKit, _H: any): void {
  const f0 = K.fy(0), f1 = K.fy(1), f2 = K.fy(2), f3 = K.fy(3);
  const cx = Math.floor((K.IX0 + K.IX1) / 2);
  K.rug(cx - 1, K.IZ0, cx + 1, K.IZ1, 63, f0);
  for (let rI = 0; rI < 2; rI++) {
    const x = K.IX0 + 2 + rI * Math.max(2, Math.floor((K.IX1 - K.IX0 - 4) / 2));
    for (let z = K.IZ0 + 2; z <= K.IZ1 - 3; z++) { K.ST(x, f0, z, 3); K.ST(x + 2, f0, z, 2); }
  }
  K.P(cx, f0, K.IZ0 + 1, B_BRICK);
  K.P(cx, f0 + 1, K.IZ0 + 1, B_LANTERN);
  K.P(cx - 2, f0, K.IZ0 + 1, B_CANDLE);
  K.P(cx + 2, f0, K.IZ0 + 1, B_CANDLE);
  K.wallArt(cx - 2, K.IZ0 + 1, f0, 63);
  K.wallArt(cx + 2, K.IZ0 + 1, f0, 63);
  K.P(cx, f0, K.IZ1 - 1, B_LECTERN);
  K.chainLamp(cx, Math.floor((K.IZ0 + K.IZ1) / 2), f0);
  K.P(K.IX1 - 1, f0, K.IZ0 + 2, B_GLOW);
  K.P(K.IX1, f0, K.IZ0 + 2, B_GLOW);
  K.shelfRow(K.IX1, K.IZ0 + 4, K.IZ1 - 2, f1, B_SHELF);
  K.P(cx, f1, K.IZ1 - 1, B_LECTERN);
  K.bed(K.IX0, K.IZ1, 67, f1);
  K.chest(K.IX0, f2, K.IZ0);
  K.P(K.IX0, f2, K.IZ0 + 1, B_CANDLE);
  K.P(K.IX1, f2, K.IZ0, B_BARREL);
  K.table(K.IX0 + 2, K.IZ1 - 2, f1);
  K.wallArt(cx, K.IZ1 - 1, f1, 67);
  K.P(K.IX1 - 1, f2, K.IZ1, B_PLANK);
  K.P(K.IX1, f2, K.IZ1, B_SHELF);
  K.P(K.IX1, f2 + 1, K.IZ1, B_SHELF);
  K.wallArt(K.IX1, K.IZ0, f2, 67);
  K.P(cx, f3, Math.floor((K.IZ0 + K.IZ1) / 2), B_BELL);
  K.P(cx, f3 + 1, Math.floor((K.IZ0 + K.IZ1) / 2), B_LANTERN);
}

function designClericTemple(K: FurnishKit, _H: any): void {
  const f0 = K.fy(0), f1 = K.fy(1), f2 = K.fy(2), f3 = K.fy(3);
  const cx = Math.floor((K.IX0 + K.IX1) / 2), cz = Math.floor((K.IZ0 + K.IZ1) / 2);
  K.rug(cx - 1, K.IZ0, cx + 1, K.IZ1, 63, f0);
  K.P(cx, f0, cz, B_CAULDRON);
  K.P(cx, f0 + 1, cz, B_BREW);
  K.P(cx, f0, cz - 2, B_GLOW);
  K.P(cx - 1, f0, cz - 2, B_BRICK); K.P(cx + 1, f0, cz - 2, B_BRICK);
  K.shelfRow(K.IX0, K.IZ0 + 2, K.IZ1 - 2, f0, B_SHELF);
  K.shelfRow(K.IX1, K.IZ0 + 2, K.IZ1 - 2, f0, B_CHISELSHELF);
  K.P(K.IX0 + 1, f0, K.IZ1, B_CANDLE);
  K.P(K.IX1 - 1, f0, K.IZ0, B_CANDLE);
  K.chainLamp(cx, cz + 2, f0);
  K.P(K.IX0, f0 + 1, K.IZ0, B_DRIP);
  K.P(K.IX1, f0, K.IZ1, B_SHELF);
  K.P(K.IX1, f0 + 1, K.IZ1, B_CHISELSHELF);
  K.table(cx, K.IZ1 - 1, f0);
  K.wallArt(K.IX0 + 1, K.IZ1, f0, 68);
  K.bed(K.IX0, K.IZ0 + 1, 68, f1);
  K.chest(K.IX1 - 1, f1, K.IZ1);
  K.P(K.IX1, f1, K.IZ0, B_POT);
  K.desk(K.IX0 + 1, K.IZ0, f1);
  K.ST(K.IX0 + 2, K.IZ0, f1, 3);
  K.P(K.IX1, f1, K.IZ0 + 1, B_SHELF);
  K.P(K.IX1, f1 + 1, K.IZ0 + 1, B_SHELF);
  K.wallArt(K.IX1 - 1, K.IZ1, f1, 68);
  K.P(cx, f2, cz, B_LANTERN);
  K.rug(cx - 1, cz - 1, cx + 1, cz + 1, 68, f2);
  K.P(K.IX0, f2, K.IZ0, B_SHELF);
  K.P(K.IX0, f2 + 1, K.IZ0, B_SHELF);
  K.wallArt(K.IX1, K.IZ1, f2, 68);
  K.P(cx, f3, cz, B_GLOW);
  K.P(cx - 1, f3, cz, B_CANDLE);
  K.P(cx + 1, f3, cz, B_CANDLE);
}

function designFisherman(K: FurnishKit, _H: any): void {
  const f = K.fy(0);
  const tx = K.IX1 - 2, tz = K.IZ0 + 2;
  K.P(tx, f, tz, B_BARREL);
  K.P(tx + 1, f, tz, B_BARREL);
  K.P(tx, f, tz + 1, B_PLANK);
  K.P(tx + 1, f, tz + 1, B_PLANK);
  K.P(tx, f + 1, tz, B_CANDLE);
  K.P(K.IX0, f, K.IZ0, B_BARREL);
  K.P(K.IX0, f + 1, K.IZ0, B_BARREL);
  K.chest(K.IX0 + 1, f, K.IZ0);
  K.bed(K.IX0, K.IZ1, 444, f);
  K.table(K.IX0 + 3, K.IZ1 - 1, f);
  K.fireplace(K.IX1, K.IZ1, f);
  K.P(K.IX1 - 1, f, K.IZ1, B_HAY);
  K.rug(K.IX0 + 2, K.IZ0 + 2, K.IX0 + 4, K.IZ0 + 4, 444, f);
  K.lampSpot(K.IX1, K.IZ0 + 1, f);
  K.P(K.IX1, f, K.IZ0, B_SHELF);
  K.P(K.IX1, f + 1, K.IZ0, B_SHELF);
  K.wallArt(K.IX0 + 1, K.IZ0, f, 444);
  K.desk(K.IX0, K.IZ0 + 1, f);
  K.ST(K.IX0 + 1, K.IZ0 + 1, f, 1);
}

function designButcher(K: FurnishKit, _H: any): void {
  const f = K.fy(0);
  const cx = Math.floor((K.IX0 + K.IX1) / 2);
  K.P(cx, f, K.IZ0, B_SMOKER);
  K.P(cx - 1, f, K.IZ0, B_CHAIN);
  K.P(cx - 1, f + 1, K.IZ0, B_CHAIN);
  K.P(cx - 1, f + 2, K.IZ0, 63);
  K.P(cx + 1, f, K.IZ0, B_LOG);
  K.P(cx + 1, f + 1, K.IZ0, B_SLAB);
  K.P(K.IX0, f, K.IZ0 + 1, B_HAY);
  K.P(K.IX0, f + 1, K.IZ0 + 1, B_HAY);
  K.chest(K.IX1, f, K.IZ0);
  K.P(K.IX1, f + 1, K.IZ0, B_BARREL);
  for (let x = K.IX0 + 2; x <= K.IX1 - 2; x++) K.P(x, f, K.IZ1 - 1, B_CSLAB);
  K.P(K.IX0 + 2, f + 1, K.IZ1 - 1, B_TRAP);
  K.ST(K.IX0 + 2, f, K.IZ1 - 2, 0); K.ST(K.IX1 - 2, f, K.IZ1 - 2, 0);
  K.bed(K.IX0, K.IZ1, 222, f);
  K.lampSpot(K.IX1, K.IZ1 - 1, f);
  K.P(K.IX1 - 1, f + 1, K.IZ1, B_CANDLE);
  K.table(cx + 1, K.IZ0 + 3, f);
  K.P(K.IX1, f, K.IZ0 + 1, B_SHELF);
  K.P(K.IX1, f + 1, K.IZ0 + 1, B_SHELF);
  K.wallArt(K.IX0, K.IZ1, f, 222);
}

function designFletcher(K: FurnishKit, _H: any): void {
  const f = K.fy(0);
  const cx = Math.floor((K.IX0 + K.IX1) / 2), cz = Math.floor((K.IZ0 + K.IZ1) / 2);
  K.P(cx, f, cz, B_FLETCH);
  K.P(cx - 1, f, cz, B_SLAB);
  K.P(cx - 1, f + 1, cz, 62);
  K.P(cx + 1, f, cz, B_SLAB);
  K.P(cx + 1, f + 1, cz, 62);
  K.P(K.IX0, f, K.IZ0, B_HAY);
  K.P(K.IX0, f + 1, K.IZ0, B_HAY);
  K.chest(K.IX1, f, K.IZ0);
  K.chest(K.IX1, f + 1, K.IZ0);
  K.P(K.IX0, f, K.IZ1, B_BARREL);
  K.table(cx, K.IZ1 - 1, f);
  K.bed(K.IX1, K.IZ1 - 1, 466, f);
  K.rug(K.IX0 + 1, K.IZ0 + 3, K.IX0 + 3, K.IZ1 - 2, 466, f);
  K.lampSpot(K.IX0 + 3, K.IZ0, f);
  K.P(K.IX0, f, K.IZ0 + 1, B_SHELF);
  K.P(K.IX0, f + 1, K.IZ0 + 1, B_SHELF);
  K.wallArt(K.IX0, K.IZ1, f, 466);
}

function designMason(K: FurnishKit, _H: any): void {
  const f = K.fy(0);
  const cx = Math.floor((K.IX0 + K.IX1) / 2), cz = Math.floor((K.IZ0 + K.IZ1) / 2);
  K.P(cx, f, cz, B_CUTTER);
  K.P(cx - 1, f, cz, B_SLAB);
  K.P(cx + 1, f, cz, B_SLAB);
  K.P(K.IX0, f, K.IZ0, 252);
  K.P(K.IX0, f + 1, K.IZ0, B_BRICK);
  K.P(K.IX1, f, K.IZ0, 252);
  K.P(K.IX1, f + 1, K.IZ0, B_BRICK);
  K.P(K.IX0, f, K.IZ0 + 1, 11);
  K.P(K.IX1, f, K.IZ1, B_CAULDRON);
  K.P(K.IX0, f, K.IZ1, B_BARREL);
  K.P(K.IX0, f + 1, K.IZ1, 10);
  K.chest(K.IX1, f, K.IZ1 - 1);
  K.bed(K.IX1 - 2, K.IZ1, 453, f);
  K.lampSpot(K.IX1, K.IZ0 + 1, f);
  K.P(cx, f + 1, cz + 1, B_LANTERN);
  K.table(K.IX0 + 2, K.IZ1 - 1, f);
  K.P(K.IX1, f, K.IZ0 + 1, B_SHELF);
  K.P(K.IX1, f + 1, K.IZ0 + 1, B_SHELF);
  K.wallArt(K.IX1, K.IZ1, f, 453);
}

const DESIGN_BUILDERS: Record<string, DesignFn> = {
  cozy_cottage: designCozyCottage,
  farm_shack: designFarmShack,
  blacksmith_forge: designBlacksmith,
  weaponsmith: designWeaponsmith,
  toolsmith: designToolsmith,
  townhouse_home: designTownhouse,
  family_home: designFamilyHome,
  village_library: designLibrary,
  cartographer_house: designCartographer,
  village_tavern: designTavern,
  meeting_house: designMeetingHouse,
  watchtower_post: designWatchtower,
  manor_hall: designManorHall,
  country_manor: designCountryManor,
  village_cathedral: designCathedral,
  cleric_temple: designClericTemple,
  fisherman_cottage: designFisherman,
  butcher_shop: designButcher,
  fletcher_house: designFletcher,
  mason_house: designMason
};

// Spawn one named design as a standalone building (SimDeck + icons).
export function spawnHouseDesign(
  designKey: string,
  cx: number,
  cz: number,
  base: number,
  side: string,
  w: VoxelWriter,
  clearUp: ClearUpFunc,
  terrainHeight: HeightLookup,
  hash2: Hash2Func,
  wStair?: StairWriter
): { x0: number; z0: number; x1: number; z1: number; base: number } | null {
  const meta = HOUSE_DESIGN_META.find((d) => d.key === designKey);
  if (!meta) return null;
  const style = STYLES.find((s) => s.key === meta.shell) || STYLES[0];
  const wd = Math.min(style.wMax, Math.max(style.wMin, meta.w));
  const x0 = Math.floor(cx) - Math.floor(wd / 2), z0 = Math.floor(cz) - Math.floor(wd / 2);
  const H = { x0, z0, x1: x0 + wd - 1, z1: z0 + wd - 1, base, style, side, designKey };
  generateHouseStructure(H, w, clearUp, terrainHeight, hash2, wStair ?? ((x, y, z, id) => w(x, y, z, id)));
  return { x0, z0, x1: x0 + wd - 1, z1: z0 + wd - 1, base };
}

// Vanilla-inspired village chest loot: per-design [itemId, minCount, maxCount].
// Mirrors vanilla village loot (bread/wheat staples, emeralds, books plus each
// profession's goods). Rolled deterministically per chest coordinate.
export type LootEntry = [id: number, min: number, max: number];
export const VILLAGE_LOOT_TABLES: Record<string, LootEntry[]> = {
  cozy_cottage: [[735, 1, 3], [692, 2, 5], [1168, 1, 2], [893, 1, 1], [729, 1, 2], [748, 1, 3], [1129, 2, 4]],
  farm_shack: [[692, 3, 8], [1152, 2, 4], [735, 1, 2], [1055, 1, 3], [742, 1, 3], [716, 1, 2]],
  blacksmith_forge: [[748, 2, 4], [953, 1, 3], [817, 1, 3], [15, 1, 1], [136, 1, 1]],
  weaponsmith: [[953, 1, 3], [877, 1, 1], [817, 2, 4], [1129, 2, 5], [952, 1, 1], [15, 1, 2]],
  toolsmith: [[953, 1, 2], [817, 1, 3], [1129, 2, 4], [6, 3, 5]],
  townhouse_home: [[735, 1, 3], [1168, 1, 2], [729, 1, 2], [893, 1, 1], [1047, 1, 3]],
  family_home: [[735, 1, 3], [1168, 1, 2], [692, 2, 4], [729, 1, 2], [893, 1, 1]],
  village_library: [[729, 2, 5], [1047, 2, 4], [946, 1, 2], [822, 1, 1], [753, 1, 1], [893, 1, 1]],
  cartographer_house: [[1047, 2, 5], [822, 1, 1], [904, 1, 3], [919, 1, 2], [893, 1, 1]],
  village_tavern: [[735, 2, 4], [854, 1, 3], [1168, 1, 2], [893, 1, 2], [134, 1, 1], [919, 1, 2]],
  meeting_house: [[735, 1, 3], [729, 1, 2], [1047, 1, 3], [893, 1, 1], [692, 2, 4]],
  watchtower_post: [[1170, 2, 6], [1129, 2, 4], [817, 1, 2], [735, 1, 2]],
  manor_hall: [[927, 1, 1], [729, 1, 3], [893, 1, 2], [1168, 1, 2], [877, 1, 1]],
  country_manor: [[735, 1, 3], [1168, 1, 2], [692, 2, 4], [729, 1, 2], [893, 1, 1]],
  village_cathedral: [[925, 1, 1], [592, 1, 3], [101, 1, 2], [729, 1, 2], [919, 1, 2]],
  cleric_temple: [[592, 1, 3], [919, 1, 3], [923, 1, 2], [925, 1, 1], [729, 1, 2]],
  fisherman_cottage: [[856, 1, 3], [1135, 1, 3], [1129, 1, 3], [134, 1, 1], [735, 1, 2]],
  butcher_shop: [[854, 1, 3], [855, 1, 2], [857, 1, 2], [817, 1, 2]],
  fletcher_house: [[904, 2, 5], [914, 1, 3], [1129, 2, 5], [1170, 2, 6], [1135, 1, 2]],
  mason_house: [[256, 2, 4], [736, 2, 4], [752, 2, 4], [893, 1, 1], [817, 1, 2]]
};

// Roll 1–3 stacks into random slots of a 27-slot chest (null = empty slot).
export function rollVillageLoot(designKey: string, rng: () => number): Array<{ id: number; count: number } | null> {
  const table = VILLAGE_LOOT_TABLES[designKey] ?? VILLAGE_LOOT_TABLES.cozy_cottage;
  const slots: Array<{ id: number; count: number } | null> = Array(27).fill(null);
  const rolls = 1 + Math.floor(rng() * 3);
  const used = new Set<number>();
  for (let i = 0; i < rolls; i++) {
    const e = table[Math.floor(rng() * table.length)];
    const slot = Math.floor(rng() * 27);
    if (used.has(slot)) continue;
    used.add(slot);
    slots[slot] = { id: e[0], count: e[1] + Math.floor(rng() * (e[2] - e[1] + 1)) };
  }
  return slots;
}

function furnishHouseInterior(H: any, w: VoxelWriter, stair: StairWriter, hash2: Hash2Func, loot?: (x: number, y: number, z: number, designKey: string) => void, art?: (x: number, y: number, z: number) => void): void {
  const S = H.style as HouseStyle;
  const key = typeof H.designKey === "string" && DESIGN_BUILDERS[H.designKey] ? H.designKey : pickInteriorKey(S.key, H.x0, H.z0, hash2);
  const K = makeKit(H, w, stair, loot ? (x, y, z) => loot(x, y, z, key) : undefined, art);
  DESIGN_BUILDERS[key](K, H);
}


export function buildRoadStrip(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  GX0: number,
  GZ0: number,
  CH: number,
  w: VoxelWriter,
  hash2: Hash2Func,
  terrainHeight: HeightLookup,
  wStair: StairWriter
) {
  // Terrain-following path: each column is laid ON the natural surface so the
  // road hugs the ground instead of flattening/cutting into hillsides. A short
  // staircase (stone-brick steps + landing) is inserted wherever the surface
  // rises or falls by >= 2 blocks along the road, so elevations are climbed
  // with stairs rather than sliced flat.
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      if (x < GX0 - 1 || x > GX0 + CH || z < GZ0 - 1 || z > GZ0 + CH) continue;
      const h = terrainHeight(x, z);
      const isEdge = x === x0 || x === x1 || z === z0 || z === z1;
      let blockId = 6; // Cobblestone default
      if (isEdge) {
        // Cobblestone / Stone Brick curb
        blockId = hash2(x * 13, z * 29) < 0.70 ? 6 : 8;
      } else {
        // Authentic Minecraft Village Dirt Path with cobblestone & gravel wear
        const pRoll = hash2(x * 37 + 11, z * 41 + 19);
        if (pRoll < 0.72) blockId = 55; // Dirt path
        else if (pRoll < 0.88) blockId = 6;  // Cobblestone
        else if (pRoll < 0.95) blockId = 12; // Gravel
        else blockId = 8;  // Stone bricks
      }
      w(x, h, z, blockId);
    }
  }

  const addStairColumn = (x: number, z: number, yLow: number, yHigh: number, facing: number) => {
    // Stone-brick stairs climb from yLow to yHigh; the top riser is a solid
    // landing so the path block above never floats.
    for (let y = yLow + 1; y <= yHigh - 2; y++) wStair(x, y, z, 72, facing);
    w(x, yHigh - 1, z, 8);
  };

  const xRun = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  if (xRun && x1 !== x0) {
    for (let z = z0; z <= z1; z++) {
      let prevH = terrainHeight(x0, z);
      for (let x = x0 + 1; x <= x1; x++) {
        const curH = terrainHeight(x, z);
        const d = curH - prevH;
        if (d >= 2) addStairColumn(x, z, prevH, curH, 2);       // climbing +X → step faces -X
        else if (d <= -2) addStairColumn(x, z, curH, prevH, 3); // climbing -X → step faces +X
        prevH = curH;
      }
    }
  } else if (!xRun && z1 !== z0) {
    for (let x = x0; x <= x1; x++) {
      let prevH = terrainHeight(x, z0);
      for (let z = z0 + 1; z <= z1; z++) {
        const curH = terrainHeight(x, z);
        const d = curH - prevH;
        if (d >= 2) addStairColumn(x, z, prevH, curH, 0);       // climbing +Z → step faces -Z
        else if (d <= -2) addStairColumn(x, z, curH, prevH, 1); // climbing -Z → step faces +Z
        prevH = curH;
      }
    }
  }
}

export function buildLampPost(x: number, z: number, base: number, w: VoxelWriter, clearUp: ClearUpFunc) {
  clearUp(x, z, base + 1);
  w(x, base + 1, z, 6); // Cobblestone Pedestal Base
  w(x, base + 2, z, 16); // Oak Fence Post
  w(x, base + 3, z, 16);
  w(x, base + 4, z, 16);
  w(x, base + 5, z, 46); // Glowing Hanging Lantern
}

export function buildWell(cx: number, cz: number, base: number, w: VoxelWriter, clearUp: ClearUpFunc) {
  for (let z = cz - 1; z <= cz + 1; z++) {
    for (let x = cx - 1; x <= cx + 1; x++) {
      clearUp(x, z, base + 1);
      w(x, base, z, 8); // Stone bricks
      w(x, base + 1, z, x === cx && z === cz ? 39 : 8);
    }
  }
  w(cx, base - 1, cz, 39);
  w(cx, base - 2, cz, 39);
  w(cx, base - 3, cz, 5);
  for (const [x, z] of [
    [cx - 1, cz - 1],
    [cx + 1, cz - 1],
    [cx - 1, cz + 1],
    [cx + 1, cz + 1]
  ]) {
    w(x, base + 2, z, 16);
    w(x, base + 3, z, 16);
  }
  for (let z = cz - 2; z <= cz + 2; z++) {
    for (let x = cx - 2; x <= cx + 2; x++) w(x, base + 4, z, 17);
  }
  w(cx, base + 5, cz, 46);
}

export function buildGarden(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  w: VoxelWriter,
  clearUp: ClearUpFunc,
  terrainHeight: HeightLookup
) {
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      const h = terrainHeight(x, z);
      clearUp(x, z, h + 1);
      const edge = x === x0 || x === x1 || z === z0 || z === z1;
      w(x, h, z, edge ? 55 : 2);
      if (edge && !(x === x0 + 1 && z === z1)) w(x, h + 1, z, 16);
      if (!edge && (z - z0) % 2 === 0) w(x, h + 1, z, 18);
    }
  }
}

export const PEN_FENCE_ID = 1174;
export const PEN_HAY_ID = 49;

export function buildPen(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  base: number,
  w: VoxelWriter,
  clearUp: ClearUpFunc
) {
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      clearUp(x, z, base + 1);
      w(x, base, z, 2);
      const edge = x === x0 || x === x1 || z === z0 || z === z1;
      if (edge) w(x, base + 1, z, PEN_FENCE_ID);
    }
  }
  const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
  w(cx, base + 1, cz, PEN_HAY_ID);
}

export function generateHouseStructure(
  H: any,
  w: VoxelWriter,
  clearUp: ClearUpFunc,
  terrainHeight: HeightLookup,
  hash2: Hash2Func,
  wStair?: StairWriter,
  loot?: (x: number, y: number, z: number, designKey: string) => void,
  art?: (x: number, y: number, z: number) => void
) {
  const { x0, z0, x1, z1, base, style: S, side } = H;
  const { wall, roof, h: sh, floors, roofType } = S;
  const stair: StairWriter = wStair ?? ((x, y, z, _f) => w(x, y, z, B_OSTAIR));
  const top = base + sh;
  const hHash = hash2(x0 * 31 + 7, z0 * 17 + 13);

  // 1. Clear air INSIDE the wall cavity only (floor above base is air; walls and
  // roof overwrite the boundary columns). The outer ring is left untouched so a
  // house on a hillside is tucked into the slope instead of carving a flat cut.
  for (let z = z0 + 1; z <= z1 - 1; z++) {
    for (let x = x0 + 1; x <= x1 - 1; x++) {
      clearUp(x, z, base + 1);
    }
  }

  // 2. Solid Foundation & Hillside / Cavern Underpinnings (Fills solid cobblestone beneath house)
  //    Shallow, terrain-following pad: floor sits at `base`; cobble fills only
  //    down to just under the local ground (no deep base-24 carve into hills).
  const floorBlock = S.key === "forge" || S.key === "cathedral" || S.key === "watchtower" ? 8 : 17;
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      w(x, base, z, floorBlock);
      const localH = terrainHeight(x, z);
      const fillLow = Math.max(1, Math.min(base - 1, localH - 1));
      for (let y = base - 1; y >= fillLow; y--) w(x, y, z, 6);
    }
  }

  // 3. Walls & Timber Post Framing
  for (let y = base + 1; y < top; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1 || z === z0 || z === z1;
        if (!edge) {
          w(x, y, z, 0);
          continue;
        }
        const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
        w(x, y, z, corner ? 16 : wall);
      }
    }
  }

  // 4. Multi-Level Floor Separation
  const floorLevels = [base];
  for (let f = 1; f < floors; f++) {
    const fY = base + f * 4;
    floorLevels.push(fY);
    for (let z = z0 + 1; z < z1; z++) {
      for (let x = x0 + 1; x < x1; x++) {
        w(x, fY, z, 17);
      }
    }

    // Interior wooden stairs (real stair blocks, ascending toward -Z)
    const stairX = f % 2 === 1 ? x1 - 2 : x0 + 2;
    for (let st = 0; st < 3; st++) {
      const sY = fY - 3 + st;
      const sZ = z1 - 2 - st;
      stair(stairX, sY, sZ, B_OSTAIR, 1);
      w(stairX, fY, sZ, 0);
      w(stairX, fY, sZ + 1, 0);
    }
  }

  // Ceiling top plate
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) w(x, top, z, S.key === "cathedral" ? 8 : 17);
  }

  // 5. Multi-Level Roof Architectures
  const roofDir = hHash > 0.5 ? "NS" : "EW";
  if (roofType === "hip") {
    let a = x0 - 1,
      b = z0 - 1,
      c = x1 + 1,
      d = z1 + 1,
      y = top;
    while (a <= c && b <= d) {
      const cap = c - a <= 1 || d - b <= 1;
      for (let zz = b; zz <= d; zz++) {
        for (let xx = a; xx <= c; xx++) {
          if (cap || xx === a || xx === c || zz === b || zz === d) w(xx, y, zz, roof);
        }
      }
      if (cap) break;
      a++;
      b++;
      c--;
      d--;
      y++;
    }
  } else if (roofType === "spire" || roofType === "tower") {
    for (let z = z0 - 1; z <= z1 + 1; z++) {
      for (let x = x0 - 1; x <= x1 + 1; x++) {
        const edge = x === x0 - 1 || x === x1 + 1 || z === z0 - 1 || z === z1 + 1;
        if (edge) w(x, top + 1, z, (x + z) % 2 === 0 ? 8 : 0);
      }
    }
    if (roofType === "spire") {
      const cx = Math.floor((x0 + x1) / 2),
        cz = Math.floor((z0 + z1) / 2);
      for (let sp = 1; sp <= 5; sp++) w(cx, top + sp, cz, 8);
      w(cx, top + 6, cz, 46);
    }
  } else if (roofType === "gable") {
    if (roofDir === "NS") {
      let a = x0 - 1, c = x1 + 1, y = top;
      while (a <= c) {
        // Outer eave overhangs
        for (let zz = z0 - 1; zz <= z1 + 1; zz++) {
          w(a, y, zz, roof);
          w(c, y, zz, roof);
        }
        for (let xx = a; xx <= c; xx++) {
          w(xx, y, z0 - 1, roof);
          w(xx, y, z1 + 1, roof);
        }
        // Solid plank attic infill under triangular gable ends
        for (let xx = a + 1; xx <= c - 1; xx++) {
          w(xx, y, z0, 17);
          w(xx, y, z1, 17);
        }
        if (c - a <= 1) {
          for (let zz = z0 - 1; zz <= z1 + 1; zz++) {
            for (let xx = a; xx <= c; xx++) w(xx, y, zz, roof);
          }
          break;
        }
        a++;
        c--;
        y++;
      }
    } else {
      let b = z0 - 1, d = z1 + 1, y = top;
      while (b <= d) {
        // Outer eave overhangs
        for (let xx = x0 - 1; xx <= x1 + 1; xx++) {
          w(xx, y, b, roof);
          w(xx, y, d, roof);
        }
        for (let zz = b; zz <= d; zz++) {
          w(x0 - 1, y, zz, roof);
          w(x1 + 1, y, zz, roof);
        }
        // Solid plank attic infill under triangular gable ends
        for (let zz = b + 1; zz <= d - 1; zz++) {
          w(x0, y, zz, 17);
          w(x1, y, zz, 17);
        }
        if (d - b <= 1) {
          for (let xx = x0 - 1; xx <= x1 + 1; xx++) {
            for (let zz = b; zz <= d; zz++) w(xx, y, zz, roof);
          }
          break;
        }
        b++;
        d--;
        y++;
      }
    }
  }

  // 6. Door Entrance & Paved Porch
  const mx = Math.floor((x0 + x1) / 2),
    mz = Math.floor((z0 + z1) / 2);
  let dx = mx,
    dz = mz,
    oox = 0,
    ooz = 0;
  // A village plan may assign the exact door cell (H.dx/H.dz) so the road
  // path meets the real door; otherwise fall back to the hash offset rule.
  const planDoor = typeof H.dx === "number" && typeof H.dz === "number";
  if (side === "S") {
    dz = z1;
    ooz = 1;
    dx = planDoor ? H.dx : (hHash < 0.35 && x1 - x0 >= 7 ? x0 + 2 : hHash > 0.7 && x1 - x0 >= 7 ? x1 - 2 : mx);
  } else if (side === "N") {
    dz = z0;
    ooz = -1;
    dx = planDoor ? H.dx : (hHash < 0.35 && x1 - x0 >= 7 ? x0 + 2 : hHash > 0.7 && x1 - x0 >= 7 ? x1 - 2 : mx);
  } else if (side === "E") {
    dx = x1;
    oox = 1;
    dz = planDoor ? H.dz : (hHash < 0.35 && z1 - z0 >= 7 ? z0 + 2 : hHash > 0.7 && z1 - z0 >= 7 ? z1 - 2 : mz);
  } else {
    dx = x0;
    oox = -1;
    dz = planDoor ? H.dz : (hHash < 0.35 && z1 - z0 >= 7 ? z0 + 2 : hHash > 0.7 && z1 - z0 >= 7 ? z1 - 2 : mz);
  }

  w(dx, base + 1, dz, 105);
  w(dx, base + 2, dz, 105);
  w(dx, base + 3, dz, 16);
  w(dx + oox, base, dz + ooz, 8);
  w(dx + oox * 2, base, dz + ooz * 2, 8);

  // Fill the doorway threshold & under-door foundation so no floor gap shows through
  w(dx, base, dz, 16);
  const pLocalH0 = terrainHeight(dx, dz);
  const doorGap = base - pLocalH0;
  if (doorGap >= 2) {
    // The house floor is raised above the ground — climb to the door with a real
    // stone-brick staircase (ascending toward the door) instead of a cobble pile.
    const doorFacing = ooz > 0 ? 1 : (ooz < 0 ? 0 : (oox > 0 ? 3 : 2));
    for (let y = pLocalH0 + 1; y <= base - 1; y++) stair(dx, y, dz, 72, doorFacing);
  } else {
    for (let y = base - 1; y >= Math.max(1, pLocalH0 - 1); y--) w(dx, y, dz, 6);
  }

  // Extend doorstep foundation underpinning to prevent threshold gaps
  const pLocalH1 = terrainHeight(dx + oox, dz + ooz);
  for (let y = base - 1; y >= Math.max(1, pLocalH1 - 1); y--) w(dx + oox, y, dz + ooz, 6);
  const pLocalH2 = terrainHeight(dx + oox * 2, dz + ooz * 2);
  for (let y = base - 1; y >= Math.max(1, pLocalH2 - 1); y--) w(dx + oox * 2, y, dz + ooz * 2, 6);

  // Door-to-road staircase: when the porch floats above the grade, descend
  // outward with real steps so the door meets the road path with no cliff.
  // Style is random per house (stone-brick stairs, oak stairs, cobble blocks).
  const porchX = dx + oox * 2, porchZ = dz + ooz * 2;
  const rise = base - terrainHeight(porchX, porchZ);
  if (rise >= 2) {
    const outFacing = ooz > 0 ? 1 : (ooz < 0 ? 0 : (oox > 0 ? 3 : 2));
    const styleRoll = hash2(x0 * 57 + 11, z0 * 91 + 29);
    const blockSteps = styleRoll > 0.66;
    const stepId = styleRoll < 0.33 ? 72 : 70;
    const steps = Math.min(rise - 1, 8);
    for (let k = 1; k <= steps; k++) {
      const sx = porchX + oox * k, sz = porchZ + ooz * k;
      const sy = base - k;
      const tH = terrainHeight(sx, sz);
      if (sy <= tH) continue;
      if (blockSteps) w(sx, sy, sz, 6);
      else stair(sx, sy, sz, stepId, outFacing);
      for (let y = sy - 1; y >= Math.max(1, tH - 1); y--) w(sx, y, sz, 6);
    }
    if (hHash < 0.5 && steps >= 2) {
      const fx = porchX + oox * steps, fz = porchZ + ooz * steps;
      buildLampPost(fx - ooz, fz + oox, terrainHeight(fx - ooz, fz + oox), w, clearUp);
    }
  }

  // Porch
  if (hHash < 0.45 && S.key !== "cathedral" && S.key !== "watchtower") {    if (side === "S" || side === "N") {
      w(dx - 1, base + 1, dz + ooz, 16);
      w(dx - 1, base + 2, dz + ooz, 16);
      w(dx + 1, base + 1, dz + ooz, 16);
      w(dx + 1, base + 2, dz + ooz, 16);
      w(dx - 1, base + 3, dz + ooz, 17);
      w(dx, base + 3, dz + ooz, 17);
      w(dx + 1, base + 3, dz + ooz, 17);
    }
  }

  // Door cells for the interior layout (kept clear at ground level)
  H.dx = dx; H.dz = dz; H.dox = dx + oox; H.doz = dz + ooz;

  // 7. Windows (Classic 2011 Glass Panes)
  for (const fY of floorLevels) {
    const wy = fY + 2;
    for (let x = x0 + 1; x < x1; x += 2) {
      for (const z of [z0, z1]) {
        if (x === dx && z === dz) continue;
        if (wy < top) {
          w(x, wy, z, 37);
        }
      }
    }
    for (let z = z0 + 1; z < z1; z += 2) {
      for (const x of [x0, x1]) {
        if (x === dx && z === dz) continue;
        if (wy < top) {
          w(x, wy, z, 37);
        }
      }
    }
  }

  // 8. Hanging Lanterns
  for (const fY of floorLevels) {
    w(mx, fY + 3, mz, 46);
  }

  // 9. Design-driven vanilla interior furnishing (20 researched designs).
  // The design is forced by H.designKey (SimDeck spawns) or picked
  // deterministically per house footprint for villages (variety, no repeats).
  furnishHouseInterior(H, w, stair, hash2, loot, art);
}

// ⛲ Multi-Tier Cascading Stepped Fountain (Video 00:13)
export function generateSteppedFountain(
  cx: number,
  cz: number,
  base: number,
  w: VoxelWriter,
  clearUp: ClearUpFunc
) {
  // 1. Bottom 7x7 Catch Basin with Hedge Border
  for (let z = cz - 3; z <= cz + 3; z++) {
    for (let x = cx - 3; x <= cx + 3; x++) {
      clearUp(x, z, base + 1);
      const isPerimeter = Math.abs(x - cx) === 3 || Math.abs(z - cz) === 3;
      if (isPerimeter) {
        w(x, base + 1, z, 115); // Oak leaf hedge
        w(x, base, z, 8); // Stone bricks
      } else {
        w(x, base, z, 8); // Basin floor
        w(x, base + 1, z, 39); // Water
      }
    }
  }

  // 2. Middle 5x5 Tier Raised +1m
  for (let z = cz - 2; z <= cz + 2; z++) {
    for (let x = cx - 2; x <= cx + 2; x++) {
      const isEdge = Math.abs(x - cx) === 2 || Math.abs(z - cz) === 2;
      w(x, base + 2, z, isEdge ? 8 : 39);
    }
  }

  // 3. Upper 3x3 Tier with Oak Log Pillar Supports
  for (let z = cz - 1; z <= cz + 1; z++) {
    for (let x = cx - 1; x <= cx + 1; x++) {
      const isCorner = Math.abs(x - cx) === 1 && Math.abs(z - cz) === 1;
      w(x, base + 2, z, isCorner ? 7 : 8);
      w(x, base + 3, z, isCorner ? 7 : 8);
      w(x, base + 4, z, isCorner ? 8 : 39);
    }
  }

  // 4. Center Apex Water Source
  w(cx, base + 5, cz, 39);
}

// 🏡 Stilt Swamp & Lake Treehouse (Video 00:15)
export function generateStiltLakeHouse(
  cx: number,
  cz: number,
  waterSurfaceY: number,
  lakebedY: number,
  w: VoxelWriter,
  clearUp: ClearUpFunc
) {
  const deckY = waterSurfaceY + 1;
  const corners = [
    [cx - 3, cz - 3],
    [cx + 3, cz - 3],
    [cx - 3, cz + 3],
    [cx + 3, cz + 3]
  ];

  // 1. Log Stilts extending down to lakebed
  for (const [x, z] of corners) {
    for (let y = lakebedY; y <= deckY; y++) {
      w(x, y, z, 7); // Oak Log
    }
  }

  // 2. 7x7 Wooden Boardwalk Deck
  for (let z = cz - 3; z <= cz + 3; z++) {
    for (let x = cx - 3; x <= cx + 3; x++) {
      clearUp(x, z, deckY + 1);
      w(x, deckY, z, 17); // Oak Planks
      const isEdge = Math.abs(x - cx) === 3 || Math.abs(z - cz) === 3;
      if (isEdge && !(x === cx && z === cz + 3)) {
        w(x, deckY + 1, z, 24); // Oak Fence Perimeter
      }
    }
  }

  // Corner Torches on Fences
  for (const [x, z] of corners) {
    w(x, deckY + 2, z, 80); // Torch on fence
  }

  // 3. Cozy Cottage Enclosure (5x5)
  for (let z = cz - 2; z <= cz + 2; z++) {
    for (let x = cx - 2; x <= cx + 2; x++) {
      const isWall = Math.abs(x - cx) === 2 || Math.abs(z - cz) === 2;
      if (isWall) {
        for (let y = deckY + 1; y <= deckY + 3; y++) {
          const isDoor = x === cx && z === cz + 2 && y <= deckY + 2;
          const isWindow = (Math.abs(x - cx) === 2 && z === cz && y === deckY + 2) || (Math.abs(z - cz) === 2 && x === cx && y === deckY + 2);
          if (isDoor) w(x, y, z, 0);
          else if (isWindow) w(x, y, z, 10); // Glass
          else w(x, y, z, 17); // Oak Planks
        }
      }
      w(x, deckY + 4, z, 17); // Ceiling Planks
    }
  }
}

/**
 * Stamps a custom BlueprintDoc onto the terrain with auto-adapting foundation pillars.
 */
export function stampCustomBlueprint(
  blocks: Array<{ dx: number; dy: number; dz: number; id: number }>,
  anchorX: number,
  baseY: number,
  anchorZ: number,
  w: VoxelWriter,
  clearUp?: ClearUpFunc,
  heightLookup?: HeightLookup
) {
  // Foundation pass: drop cobblestone support pillars down to ground on uneven slopes
  if (heightLookup) {
    const floorColumns = new Set<string>();
    for (const b of blocks) {
      if (b.dy === 0) {
        floorColumns.add(`${b.dx},${b.dz}`);
      }
    }
    for (const key of floorColumns) {
      const [pdx, pdz] = key.split(",").map(Number);
      const wx = anchorX + pdx;
      const wz = anchorZ + pdz;
      const groundH = heightLookup(wx, wz);
      for (let y = baseY - 1; y >= groundH; y--) {
        w(wx, y, wz, 6); // Cobblestone foundation
      }
    }
  }

  // Voxel stamping pass
  for (const b of blocks) {
    const wx = anchorX + b.dx;
    const wy = baseY + b.dy;
    const wz = anchorZ + b.dz;
    w(wx, wy, wz, b.id);
    if (clearUp && b.dy === 0) {
      // Clear foliage above base floor
      clearUp(wx, wz, baseY + 1);
    }
  }
}

/**
 * Spawns a complete architectural preset building on the Builder Studio pad
 */
export function spawnPresetHouseOnPad(
  styleKey: string,
  cx = 8,
  cz = 8,
  base = 64,
  w: VoxelWriter,
  clearUp?: ClearUpFunc
) {
  const style = STYLES.find(s => s.key === styleKey) || STYLES[0];
  const halfW = Math.floor(style.wMin / 2);
  const halfD = Math.floor(style.wMin / 2);
  const x0 = cx - halfW, x1 = cx + halfW;
  const z0 = cz - halfD, z1 = cz + halfD;
  const noopClear = clearUp || ((x: number, z: number, from: number) => {
    for (let y = from; y <= from + 24; y++) w(x, y, z, 0);
  });

  const plan = {
    x0, z0, x1, z1,
    base,
    style,
    side: "S"
  };

  generateHouseStructure(
    plan,
    w,
    noopClear,
    () => base,
    () => 0.5,
    (x, y, z, id) => w(x, y, z, id)
  );
}

