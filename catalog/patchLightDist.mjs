/**
 * @file catalog/patchLightDist.mjs
 * Vanilla light-level parity (player request 2026-09-07):
 * sets every emitter's `lightDist` to the Java Edition block-light level
 * (https://minecraft.wiki/w/Light#Light-emitting_blocks) and gives Soul Fire
 * 630 the vanilla soul-fire glow (it already meshes unlit in the glow bucket,
 * so this only adds its point light — zero visual change).
 *
 * Notes:
 * - Sea pickle 132 renders as a static 3-cluster → level 12 (vanilla 3 = 12).
 * - Legacy dup ids 378/418/596 (U7) intentionally untouched.
 * - Candles / enchanting table intentionally untouched (their meshes are not
 *   bucket-separated; flagging glow would fullbright the whole block).
 *   Tracked as open work in kb/mechanics/light-levels.md.
 *
 * Idempotent: safe to run repeatedly (registry + embedded blocks.ts array).
 * Run: node catalog/patchLightDist.mjs
 */
import fs from "node:fs";

const REGISTRY = "catalog/completeRegistry.json";
const BLOCKS_TS = "src/game/blocks.ts";

// id → vanilla Java light level (reach in blocks; our pool adds +2 cutoff)
const VANILLA = {
  33: 9, 40: 15, 46: 15, 47: 15, 48: 15, 80: 14, 81: 10, 82: 10,
  83: 15, 84: 7, 85: 15, 86: 10, 87: 15, 88: 15, 89: 15, 90: 15,
  91: 15, 92: 14, 93: 10, 94: 15, 95: 15, 96: 13, 97: 5, 98: 11,
  99: 3, 100: 7, 101: 14, 102: 15, 103: 1, 132: 12, 136: 15,
  630: 10,
};

// id → vanilla level for blocks that EMIT light but keep their shaded mesh
// (`light: 1` emitter-only flag — unlike `glow`, it never routes to the unlit
// bucket, so wax/stone/table keeps its look and only gains a point light).
const LIGHT_ONLY = {
  // single candles read as one candle → vanilla 1-candle level 3
  185: 3, 196: 3, 212: 3, 232: 3, 286: 3, 384: 3, 393: 3, 436: 3,
  445: 3, 458: 3, 469: 3, 508: 3, 522: 3, 560: 3, 577: 3, 693: 3, 703: 3,
  353: 7, // enchanting table
  216: 1, // brown mushroom
  347: 1, // dragon egg
  428: 4, 486: 2, 619: 1, // amethyst buds large/medium/small
  601: 12, 602: 12, 603: 12, // respawn anchor (static model: assume charged)
};

function transform(entries) {
  let n = 0;
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const [idStr, level] of Object.entries(VANILLA)) {
    const id = Number(idStr);
    const e = byId.get(id);
    if (!e) { console.log(`WARN: id ${id} missing, skipping`); continue; }
    if (e.lightDist !== level) {
      console.log(`${e.name} (${id}): dist ${e.lightDist ?? "—"} → ${level}`);
      e.lightDist = level;
      n++;
    }
  }
  const soul = byId.get(630);
  if (soul && !soul.glow) {
    soul.glow = 1;
    if (soul.lightPower == null) soul.lightPower = 1.2;
    console.log("Soul Fire 630: glow enabled (vanilla soul-fire light)");
    n++;
  }
  for (const [idStr, level] of Object.entries(LIGHT_ONLY)) {
    const id = Number(idStr);
    const e = byId.get(id);
    if (!e) { console.log(`WARN: id ${id} missing, skipping`); continue; }
    if (e.glow) { console.log(`WARN: ${e.name} (${id}) already glow-bucketed, skipping light flag`); continue; }
    if ((e.light ?? 0) !== 1 || e.lightDist !== level) {
      e.light = 1;
      e.lightDist = level;
      if ((id === 428 || id === 486 || id === 619) && e.lightCol == null) e.lightCol = 13404415;
      console.log(`${e.name} (${id}): emitter-only light → ${level}`);
      n++;
    }
  }
  return n;
}

{
  const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  const n = transform(registry);
  fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2));
  console.log(`registry: ${n} changes`);
}
{
  const src = fs.readFileSync(BLOCKS_TS, "utf8");
  const m = src.match(/export const BLOCKS: BlockDef\[\] = (\[[\s\S]*?\]);/);
  if (!m) throw new Error("BLOCKS array not found in blocks.ts");
  const entries = JSON.parse(m[1]);
  const n = transform(entries);
  entries.sort((a, b) => a.id - b.id);
  const out = src.slice(0, m.index) + "export const BLOCKS: BlockDef[] = " + JSON.stringify(entries, null, 2) + ";" + src.slice(m.index + m[0].length);
  fs.writeFileSync(BLOCKS_TS, out);
  console.log(`blocks.ts: ${n} changes`);
}
console.log("light-dist patch complete.");
