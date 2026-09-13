/**
 * @file src/sim/litematicExporter.ts
 * BlueprintDoc → .litematic (Litematica NBT) exporter. Lets AI/procedural assets
 * leave the sim as real Minecraft schematics (loadable in a MC client with the
 * Litematica mod) instead of only being "pre-probed" into the voxel world.
 *
 * Writes the vanilla Structure NBT array format: variable-bit palette packing
 * (bits = max(4, ceil(log2(paletteSize))), ≤8), LSB-first across 64-bit longs
 * with spill into the next long — the representation Litematica (v6) reads.
 */

import type { BlueprintDoc } from "./blueprintScanner";
import { BLOCK_MAP } from "../game/blocks";

/** Vanilla 1.19.3 block names → namespaced IDs used by the exporter. */
const VANILLA_ID: Record<string, string> = {
  "Oak planks": "minecraft:oak_planks",
  "Spruce planks": "minecraft:spruce_planks",
  "Birch planks": "minecraft:birch_planks",
  "Jungle planks": "minecraft:jungle_planks",
  "Acacia planks": "minecraft:acacia_planks",
  "Dark oak planks": "minecraft:dark_oak_planks",
  "Oak log": "minecraft:oak_log",
  "Spruce log": "minecraft:spruce_log",
  "Birch log": "minecraft:birch_log",
  "Stone bricks": "minecraft:stone_bricks",
  "Cobblestone": "minecraft:cobblestone",
  "Smooth stone": "minecraft:smooth_stone",
  "Stone": "minecraft:stone",
  "Sandstone": "minecraft:sandstone",
  "Quartz block": "minecraft:quartz_block",
  "Quartz slab": "minecraft:quartz_slab",
  "Smooth stone slab": "minecraft:smooth_stone_slab",
  "Stone brick slab": "minecraft:stone_brick_slab",
  "Cobblestone slab": "minecraft:cobblestone_slab",
  "Stone slab": "minecraft:stone_slab",
  "Glass": "minecraft:glass",
  "Tinted glass": "minecraft:tinted_glass",
  "Glass pane": "minecraft:glass_pane",
  "Lantern": "minecraft:lantern",
  "Sea lantern": "minecraft:sea_lantern",
  "Redstone block": "minecraft:redstone_block",
  "Iron block": "minecraft:iron_block",
  "Iron bars": "minecraft:iron_bars",
  "Black concrete": "minecraft:black_concrete",
  "White concrete": "minecraft:white_concrete",
  "Light gray concrete": "minecraft:light_gray_concrete",
  "Gray concrete": "minecraft:gray_concrete",
  "Red concrete": "minecraft:red_concrete",
  "Blue concrete": "minecraft:blue_concrete",
  "Yellow concrete": "minecraft:yellow_concrete",
  "Green concrete": "minecraft:green_concrete",
  "Orange concrete": "minecraft:orange_concrete",
  "Cyan concrete": "minecraft:cyan_concrete",
  "Obsidian": "minecraft:obsidian",
  "Coal block": "minecraft:coal_block",
  "Anvil": "minecraft:anvil",
  "Cauldron": "minecraft:cauldron",
  "Hopper": "minecraft:hopper",
  "Iron trapdoor": "minecraft:iron_trapdoor",
  "Stone button": "minecraft:stone_button",
  "Lever": "minecraft:lever",
  "Oak door": "minecraft:oak_door",
  "Iron door": "minecraft:iron_door",
  "Oak fence": "minecraft:oak_fence",
  "Oak leaves": "minecraft:oak_leaves",
  "Spruce leaves": "minecraft:spruce_leaves",
  "Birch leaves": "minecraft:birch_leaves",
  "Jungle leaves": "minecraft:jungle_leaves",
  "Dark oak leaves": "minecraft:dark_oak_leaves",
  "Green terracotta": "minecraft:green_terracotta",
  "Brown terracotta": "minecraft:brown_terracotta",
  "White terracotta": "minecraft:white_terracotta",
  "Red terracotta": "minecraft:red_terracotta"
};

/** Fallback material-id for our custom (non-vanilla) blocks. */
const FAMILY_FALLBACK: Array<[RegExp, string]> = [
  [/planks/i, "minecraft:oak_planks"],
  [/cream|log|bark|stem|wood/i, "minecraft:oak_log"],
  [/slab/i, "minecraft:stone_brick_slab"],
  [/stair/i, "minecraft:oak_stairs"],
  [/brick/i, "minecraft:stone_bricks"],
  [/concrete/i, "minecraft:light_gray_concrete"],
  [/glass/i, "minecraft:glass"],
  [/lantern/i, "minecraft:lantern"],
  [/leaves/i, "minecraft:oak_leaves"],
  [/terracotta/i, "minecraft:white_terracotta"],
  [/wool/i, "minecraft:white_wool"],
  [/wool|stone/i, "minecraft:stone"],
  [/coral/i, "minecraft:pink_coral"],
  [/candle/i, "minecraft:white_candle"]
];

export function mcBlockName(id: number): string {
  const def = BLOCK_MAP.get(id);
  const disp = (def?.name || "Stone").toLowerCase();
  const hit = Object.keys(VANILLA_ID).find((k) => k.toLowerCase() === disp);
  if (hit) return VANILLA_ID[hit];
  for (const [re, mapped] of FAMILY_FALLBACK) if (re.test(disp)) return mapped;
  return "minecraft:stone";
}

// ── Minimal NBT writer (big-endian, named tags) ──────────────────────────────
class NbtWriter {
  private bytes: number[] = [];

  private u8(v: number) { this.bytes.push(v & 0xff); }
  private u16(v: number) { this.u8(v >> 8); this.u8(v); }
  private u32(v: number) { this.u16(v >> 16); this.u16(v); }
  private i64(v: bigint) {
    let n = BigInt.asIntN(64, v);
    const out: number[] = [];
    for (let i = 0; i < 8; i++) { out.push(Number(n & 0xffn)); n >>= 8n; }
    for (let i = 7; i >= 0; i--) this.u8(out[i]);
  }
  private str(s: string) { const e = new TextEncoder().encode(s); this.u16(e.length); for (const c of e) this.u8(c); }
  private head(tag: number, name: string) { this.u8(tag); this.str(name); }

  beginCompound(name: string) { this.head(10, name); }
  endCompound() { this.u8(0); }
  strTag(name: string, val: string) { this.head(8, name); this.str(val); }
  byteTag(name: string, val: number) { this.head(1, name); this.u8(val & 0xff); }
  intTag(name: string, val: number) { this.head(3, name); this.u32(val); }
  // TAB_Long (4): 64-bit signed
  longTag(name: string, val: bigint) { this.head(4, name); this.i64(val); }
  // TAG_Int_Array (11)
  intArrayTag(name: string, vals: number[]) { this.head(11, name); this.u32(vals.length); for (const v of vals) this.u32(v); }
  // TAG_Long_Array (12)
  longArrayTag(name: string, vals: bigint[]) { this.head(12, name); this.u32(vals.length); for (const v of vals) this.i64(v); }
  // TAG_List of compounds (10)
  beginList(name: string, count: number) { this.head(9, name); this.u8(10); this.u32(count); }
  beginTypedList(name: string, type: number, count: number) { this.head(9, name); this.u8(type); this.u32(count); }
  u8Raw(name: string, val: number) { this.head(1, name); this.u8(val); }

  toUint8Array(): Uint8Array { return Uint8Array.from(this.bytes); }
}

export function packBlockStates(paletteIndexes: number[]): bigint[] {
  if (!paletteIndexes.length) return [];
  const bits = Math.max(4, Math.min(8, 32 - Math.clz32(Math.max(1, paletteIndexes.length))));
  if (paletteIndexes.length <= 1) return [];
  const longCount = Math.ceil((paletteIndexes.length * bits) / 64);
  const longs: bigint[] = new Array(longCount).fill(0n);
  for (let i = 0; i < paletteIndexes.length; i++) {
    let bitPos = i * bits;
    let value = BigInt(paletteIndexes[i]);
    let remaining = bits;
    while (remaining > 0) {
      const longIdx = (bitPos / 64) | 0;
      const bitOff = bitPos % 64;
      const take = Math.min(remaining, 64 - bitOff);
      const mask = (1n << BigInt(take)) - 1n;
      longs[longIdx] |= (value & mask) << BigInt(bitOff);
      value >>= BigInt(take);
      bitPos += take;
      remaining -= take;
    }
  }
  return longs;
}

/**
 * Serializes a BlueprintDoc into a Litematica v6 .litematic byte stream.
 * Only blocks are written (no entities/tile entities) — pure geometry + palette.
 */
export function blueprintToLitematic(doc: BlueprintDoc): Uint8Array {
  const blocks = doc.blocks || [];
  // palette of distinct block names (index 0 = air for parity with MC)
  const palette: string[] = ["minecraft:air"];
  const nameToIdx = new Map<string, number>([["minecraft:air", 0]]);
  const cells: Array<{ x: number; y: number; z: number; idx: number }> = [];

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const b of blocks) {
    const name = mcBlockName(b.id);
    if (!nameToIdx.has(name)) { nameToIdx.set(name, palette.length); palette.push(name); }
    cells.push({ x: b.dx, y: b.dy, z: b.dz, idx: nameToIdx.get(name)! });
    minX = Math.min(minX, b.dx); maxX = Math.max(maxX, b.dx);
    minY = Math.min(minY, b.dy); maxY = Math.max(maxY, b.dy);
    minZ = Math.min(minZ, b.dz); maxZ = Math.max(maxZ, b.dz);
  }
  const w = maxX >= minX ? maxX - minX + 1 : 0;
  const h = maxY >= minY ? maxY - minY + 1 : 0;
  const d = maxZ >= minZ ? maxZ - minZ + 1 : 0;
  const totalVolume = w * h * d;

  // index array over the full volume (palette idx per cell, air where empty)
  const idxArr: number[] = [];
  const cellMap = new Map<string, number>();
  for (const c of cells) cellMap.set(`${c.x},${c.y},${c.z}`, c.idx);
  for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
    idxArr.push(cellMap.get(`${minX + x},${minY + y},${minZ + z}`) ?? 0);
  }
  const blockStates = packBlockStates(idxArr);

  const n = new NbtWriter();
  n.beginCompound("");
  n.intTag("Version", 6);
  n.intTag("SubVersion", 1);
  // Metadata
  n.beginCompound("Metadata");
  n.strTag("Name", doc.name || "Hollowpine Asset");
  n.strTag("Author", doc.author || "Hollowpine AI");
  n.strTag("Description", "Generated by Hollowpine AI Asset Platform");
  n.intTag("TotalBlocks", blocks.length);
  n.intTag("TotalVolume", totalVolume);
  n.endCompound(); // Metadata

  // Regions: single region "Hollowpine"
  n.beginCompound("Regions");
  n.beginCompound("Hollowpine");
  n.intArrayTag("Position", [minX, minY, minZ]);
  n.intArrayTag("Size", [w, h, d]);
  n.longArrayTag("BlockStates", blockStates);
  n.beginList("BlockStatePalette", palette.length);
  for (const name of palette) {
    n.beginCompound("");
    n.strTag("Name", name);
    n.endCompound();
  }
  n.endCompound(); // BlockStatePalette list
  for (const e of ["Entities", "TileEntities", "PendingBlockTicks", "PendingFluidTicks"]) {
    n.beginList(e, 0);
  }
  n.endCompound(); // Hollowpine region
  n.endCompound(); // Regions
  n.endCompound(); // root
  return n.toUint8Array();
}

export function blueprintToLitematicBase64(doc: BlueprintDoc): string {
  const bytes = blueprintToLitematic(doc);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function downloadBlueprintLitematic(doc: BlueprintDoc) {
  if (typeof document === "undefined") throw new Error("browser only");
  const bytes = blueprintToLitematic(doc);
  const buf = new ArrayBuffer(bytes.length);
  new Uint8Array(buf).set(bytes);
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const base = (doc.id || "asset").replace(/[^a-zA-Z0-9_-]/g, "-");
  a.download = `${base}.litematic`;
  a.click();
  URL.revokeObjectURL(url);
}