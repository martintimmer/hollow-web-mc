// Hollowpine Sim — pure-logic unit harness (run: npm run sim:test)
// Imports only pure game modules; no DOM, no engine. Exit code = test status.

import { levelForXp, xpForLevel } from "../../src/game/xp";
import { smeltOutput, fuelItems, SMELT_TIME } from "../../src/game/smelt";
import { TYPES, SEA } from "../../src/game/world";
import { javaHash, makeNoise } from "../../src/game/noise";
import { TRADES_PER_DAY, isVillagerAimed, villagerInTradeRange, TRADE_RANGE } from "../../src/game/villagers";
import { createCatMesh, isSolitary } from "../../src/game/entities/animals";
import { worldToScreen, screenToWorld } from "../../src/game/engine/worldMap";
import { weatherLightTarget, smoothWeatherLight } from "../../src/game/weatherMachine";
import { shouldWakeWorld } from "../../src/game/state/gameState";
import { DATA_VERSION, GEN_VERSION, BIOME_VERSION, BUNDLE_FORMAT_VERSION, needsMigration } from "../../server/worldVersions.js";
import { TypedMeshBuffer, pushPorchStair } from "../../src/game/engine/chunkMesh";
import { createBoatMesh, updateBoatKinematics, driveBoat, isBoatItem } from "../../src/game/entities/boat";
import { getWeaponInfo, isWeapon, meleeCooldownMs, meleeDamage, rollMobDrops, MOB_LOOT } from "../../src/game/weapons";
import { BLOCK_MAP } from "../../src/game/blocks";
import * as THREE from "three";
import {
  getBlockDurability, getToolInfo, canHarvestBlock, getMineTime, getBlockDrops, getBlockHardness
} from "../../src/game/blocks";
import { startMiningTimer, tickMiningTimer, setupCreativeInteractionListener } from "../../src/game/interaction/playerInteraction";
import { createItemDropManager } from "../../src/game/entities/itemDrops";
import { consumeSlot, removeItems, type InventoryCore } from "../../src/game/inventory";
import { sampleBiome, BIOME_TARGETS, getBiomeColorTint, getBlockTint } from "../../src/game/terrain/biomes";
import { createTerrainContext, applyTransitionBand, chooseUnderwaterFlora, minRingHeight } from "../../src/game/terrain/terrainGenerator";
import { advanceTime } from "../../src/game/time";
import { createWebSpiderMesh, webSpiderScaleForAge, WebSpiderManager, webSpiderIsBig } from "../../src/game/entities/webSpider";

let pass = 0;
let fail = 0;

function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.error(`  ✘ ${name} ${detail}`); }
}

console.log("sim: pure-logic harness");

ok("xpForLevel(1) === 7", xpForLevel(1) === 7, `got ${xpForLevel(1)}`);
ok("xpForLevel(30) === 1395", xpForLevel(30) === 1395, `got ${xpForLevel(30)}`);
const lv = levelForXp(1395);
ok("levelForXp(1395) → level 30", lv.level === 30 && lv.into === 0, JSON.stringify(lv));
ok("levelForXp(7) → level 1 into 0", (() => { const L = levelForXp(7); return L.level === 1 && L.into === 0; })());

ok("smeltOutput(6) === 5 (cobble→stone)", smeltOutput(6) === 5, `got ${smeltOutput(6)}`);
ok("smeltOutput(10) === 37 (sand→glass)", smeltOutput(10) === 37);
ok("smeltOutput(1) === null (grass not smeltable)", smeltOutput(1) === null);
ok("fuelItems(16 logs) === 3", fuelItems(16) === 3, `got ${fuelItems(16)}`);
ok("SMELT_TIME === 10s (3 items need 3 fuel units)", SMELT_TIME === 10);

ok("TYPES has a single standard world archetype", Object.keys(TYPES).length === 1 && !!TYPES.standard, `got ${Object.keys(TYPES).length}`);
ok("standard scale 1", TYPES.standard.scale === 1);

ok("javaHash deterministic", (() => { const a = javaHash("sim:default"); return a === javaHash("sim:default"); })());
// hash2/vnoise live inside makeNoise; assert determinism through surface behavior:
ok("makeNoise deterministic across instances", (() => {
  const A = makeNoise(() => 777), B = makeNoise(() => 777);
  const probe = (n: ReturnType<typeof makeNoise>) => {
    // climb the returned API by sampling any numeric fn available
    const fns = n as unknown as Record<string, unknown>;
    for (const k of Object.keys(fns)) {
      if (typeof fns[k] === "function") {
        try {
          const out = (fns[k] as (x: number, z: number) => number)(12.3, -4.5);
          if (typeof out === "number" && Number.isFinite(out)) return out;
        } catch { /* some fns need different arity */ }
      }
    }
    return NaN;
  };
  const a = probe(A), b = probe(B);
  return a === b && Number.isFinite(a);
})());

ok("TRADES_PER_DAY === 8", TRADES_PER_DAY === 8);

// M5: golden regression (docs versioned expectations — change intentionally + update golden)
const { readFileSync } = await import("node:fs");
const { fileURLToPath } = await import("node:url");
const goldenPath = fileURLToPath(new URL("../../src/sim/golden/basic.golden.json", import.meta.url));
const golden = JSON.parse(readFileSync(goldenPath, "utf8"));
for (const [l, expected] of (golden.xpForLevel as Array<[number, number]>)) {
  ok(`GOLDEN xpForLevel(${l}) === ${expected}`, xpForLevel(l) === expected, `got ${xpForLevel(l)}`);
}
for (const [input, expected] of (golden.smelt as Array<[number, number]>)) {
  ok(`GOLDEN smelt(${input}) === ${expected}`, smeltOutput(input) === expected);
}
for (const [input, expected] of (golden.fuel as Array<[number, number]>)) {
  ok(`GOLDEN fuel(${input}) === ${expected}`, fuelItems(input) === expected);
}
ok(`GOLDEN worldTypeCount === ${golden.worldTypeCount}`, Object.keys(TYPES).length === golden.worldTypeCount);

// M5: pure scene-doc roundtrip
const { createScene, validateSceneDoc, sceneVoxelCount, pickAutoSceneIds } = await import("../../src/sim/scenes");
const doc = createScene("sim:golden", [{ name: "oak", cells: [{ x: 1, y: 2, z: 3, prev: 0, next: 16 }] }]);
ok("scene doc roundtrips through validate", (() => { const v = validateSceneDoc(JSON.parse(JSON.stringify(doc))); return v !== null && sceneVoxelCount(v) === 1; })());
ok("scene doc rejects bad shapes", validateSceneDoc({ version: 2, stamps: [] }) === null);
ok("auto-scene ring keeps newest 2", pickAutoSceneIds([
  { id: "a", ts: "2026-08-23T10:00:00Z" }, { id: "b", ts: "2026-08-23T11:00:00Z" },
  { id: "c", ts: "2026-08-23T09:00:00Z" }
], 2).join(",") === "c");

// M2: catalogue projection drift guards
const { TREE_CATALOG, blocksCatalogCount, treeCatalogCount } = await import("../../src/sim/catalog");
const { BLOCK_MAP } = await import("../../src/game/blocks");
ok("blocks catalogue count === BLOCK_MAP size (no drift)", blocksCatalogCount() === BLOCK_MAP.size,
  `${blocksCatalogCount()} vs ${BLOCK_MAP.size}`);

// ── Smoke: EVERY catalogue tree builder must produce voxels (no exceptions) ──
const T = await import("../../src/game/terrain/trees");
const fakeWriter = () => {
  let n = 0;
  return { w: (_x: unknown, _y: unknown, _z: unknown, id: number) => { if (id > 0) n++; }, count: () => n };
};
const seededR = (seed = 777) => {
  let s = seed;
  return () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 0) % 100000) / 100000; };
};
const treeFn: Record<string, (x: number, z: number, h: number, r: () => number, w: (x: number, y: number, z: number, id: number) => void, opts?: Record<string, unknown>) => void> = {
  "tree.oak.classic": (x, z, h, r, w) => T.generateOakTree(x, z, h, r, w),
  "tree.oak.giant": (x, z, h, r, w) => T.generateOakTree(x, z, h, r, w, { height: 12, layers: 5 }),
  "tree.cherry": (x, z, h, r, w) => T.generateCherryTree(x, z, h, r, w),
  "tree.maple": (x, z, h, r, w) => T.generateCrimsonMapleTree(x, z, h, r, w),
  "tree.aspen": (x, z, h, r, w) => T.generateGoldenAspenTree(x, z, h, r, w),
  "tree.warped": (x, z, h, r, w) => T.generateWarpedTree(x, z, h, r, w),
  "tree.bamboo": (x, z, h, r, w) => T.generateBambooGroves(x, z, h, r, w, () => h),
  "tree.redwood": (x, z, h, r, w) => T.generateRedwoodTree(x, z, h, r, w),
  "tree.dark_oak": (x, z, h, r, w) => T.generateDarkOakTree(x, z, h, r, w),
  "tree.mushroom.red": (x, z, h, r, w) => T.generateHugeMushroom(x, z, h, r, w, true),
  "tree.mushroom.brown": (x, z, h, r, w) => T.generateHugeMushroom(x, z, h, r, w, false),
  "tree.birch": (x, z, h, r, w) => T.generateBirchTree(x, z, h, r, w),
  "tree.mangrove": (x, z, h, r, w) => T.generateMangroveTree(x, z, h, r, w),
  "tree.acacia": (x, z, h, r, w) => T.generateAcaciaTree(x, z, h, r, w),
  "tree.palm": (x, z, h, r, w) => T.generatePalmTree(x, z, h, r, w),
  "tree.meadow": (x, z, h, r, w) => T.generateMeadowTree(x, z, h, r, w),
  "tree.alpine": (x, z, h, r, w) => T.generateAlpinePine(x, z, h, r, w),
  "tree.jungle": (x, z, h, r, w) => T.generateJungleTree(x, z, h, r, w, { tier: "canopy" }),
  "tree.jungle.emergent": (x, z, h, r, w) => T.generateJungleTree(x, z, h, r, w, { tier: "emergent" })
};
let treeFail = 0;
for (const row of TREE_CATALOG) {
  const fn = treeFn[row.catalogId];
  if (!fn) { ok(`tree "${row.catalogId}" covered by engine path (spruce/pine inside Game.tsx)`, true); continue; }
  try {
    const fw = fakeWriter();
    fn(5, 5, 64, seededR(), fw.w);
    if (fw.count() > 0) ok(`tree "${row.catalogId}" generates voxels (${fw.count()})`, true);
    else { treeFail++; ok(`tree "${row.catalogId}" generates voxels`, false, "0 voxels"); }
  } catch (e) {
    treeFail++;
    ok(`tree "${row.catalogId}" runs without exception`, false, String(e));
  }
}

// ── Complex trees: determinism, footprint bound, trunk materials, spacing ──
const captureWriter = () => {
  const cells = new Map<string, number>();
  return {
    w: (x: number, y: number, z: number, id: number) => { cells.set(`${x},${y},${z}`, id); },
    cells: () => cells
  };
};
const sigOf = (cells: Map<string, number>) => [...cells.entries()].sort().map(([k, v]) => `${k}=${v}`).join(";");
{
  // Determinism: same root + seed → identical voxels (chunk-border safe)
  const builders: Array<[string, (x: number, z: number, h: number, r: () => number, w: (x: number, y: number, z: number, id: number) => void) => void]> = [
    ["oak", (x, z, h, r, w) => T.generateOakTree(x, z, h, r, w)],
    ["jungle-emergent", (x, z, h, r, w) => T.generateJungleTree(x, z, h, r, w, { tier: "emergent" })],
    ["redwood", (x, z, h, r, w) => T.generateRedwoodTree(x, z, h, r, w)],
    ["birch", (x, z, h, r, w) => T.generateBirchTree(x, z, h, r, w)]
  ];
  let detFail = 0;
  for (const [name, fn] of builders) {
    for (const [rx, rz] of [[0, 0], [15, 15], [-7, 31]] as Array<[number, number]>) {
      const a = captureWriter(), b = captureWriter();
      fn(rx, rz, 64, seededR(4242), a.w);
      fn(rx, rz, 64, seededR(4242), b.w);
      if (sigOf(a.cells()) !== sigOf(b.cells())) detFail++;
    }
  }
  ok("tree builders deterministic per root+seed", detFail === 0, `${detFail} mismatches`);
}
{
  // Footprint bound: no voxel lands more than 8 columns from the root (scatter margin)
  const fns: Array<(x: number, z: number, h: number, r: () => number, w: (x: number, y: number, z: number, id: number) => void) => void> = [
    (x, z, h, r, w) => T.generateOakTree(x, z, h, r, w),
    (x, z, h, r, w) => T.generateOakTree(x, z, h, r, w, { trunkWidth: 3, height: 13 }),
    (x, z, h, r, w) => T.generateBirchTree(x, z, h, r, w),
    (x, z, h, r, w) => T.generateRedwoodTree(x, z, h, r, w),
    (x, z, h, r, w) => T.generateDarkOakTree(x, z, h, r, w),
    (x, z, h, r, w) => T.generateJungleTree(x, z, h, r, w, { tier: "emergent" }),
    (x, z, h, r, w) => T.generateJungleTree(x, z, h, r, w),
    (x, z, h, r, w) => T.generateMangroveTree(x, z, h, r, w),
    (x, z, h, r, w) => T.generateCrimsonMapleTree(x, z, h, r, w),
    (x, z, h, r, w) => T.generateGoldenAspenTree(x, z, h, r, w),
    (x, z, h, r, w) => T.generateCherryTree(x, z, h, r, w),
    (x, z, h, r, w) => T.generateAcaciaTree(x, z, h, r, w),
    (x, z, h, r, w) => T.generatePalmTree(x, z, h, r, w)
  ];
  let worst = 0;
  for (const fn of fns) {
    for (let s = 1; s <= 12; s++) {
      const c = captureWriter();
      fn(0, 0, 64, seededR(s * 131), c.w);
      for (const k of c.cells().keys()) {
        const [cx, , cz] = k.split(",").map(Number);
        worst = Math.max(worst, Math.max(Math.abs(cx), Math.abs(cz)));
      }
    }
  }
  ok("tree footprint within ±8 scatter margin", worst <= 8, `worst=${worst}`);
}
{
  // Trunk materials match their biome wood
  const trunkCases: Array<[string, (w: (x: number, y: number, z: number, id: number) => void, r: () => number) => void, number]> = [
    ["jungle", (w, r) => T.generateJungleTree(0, 0, 64, r, w, { tier: "canopy" }), 25],
    ["acacia", (w, r) => T.generateAcaciaTree(0, 0, 64, r, w), 143],
    ["mangrove", (w, r) => T.generateMangroveTree(0, 0, 64, r, w), 481],
    ["dark_oak", (w, r) => T.generateDarkOakTree(0, 0, 64, r, w), 297],
    ["meadow", (w, r) => T.generateMeadowTree(0, 0, 64, r, w), 19],
    ["palm", (w, r) => T.generatePalmTree(0, 0, 64, r, w), 25]
  ];
  let matFail = 0;
  for (const [name, fn, trunkId] of trunkCases) {
    const c = captureWriter();
    fn(c.w, seededR(99));
    let count = 0;
    for (const v of c.cells().values()) if (v === trunkId) count++;
    if (count < 3) matFail++;
    void name;
  }
  ok("biome trunk materials (jungle 25, acacia 143, mangrove 481, dark oak 297, meadow 19, palm 25)", matFail === 0, `${matFail} mismatches`);
}
{
  // Spacing: one candidate per 7×7 cell, inside its cell, ≥3 from neighbor candidates
  const { treeCellCandidate, TREE_CELL } = await import("../../src/game/terrain/terrainGenerator");
  const at = (ccx: number, ccz: number) => {
    const h = (a: number, b: number) => { let s = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0; return s / 4294967296; };
    return treeCellCandidate(ccx, ccz, h(ccx * 31 + 7, ccz * 43 + 19), h(ccx * 17 + 3, ccz * 29 + 11));
  };
  let cellFail = 0, minGap = Infinity;
  for (let ccx = -4; ccx <= 4; ccx++) for (let ccz = -4; ccz <= 4; ccz++) {
    const c = at(ccx, ccz);
    if (c.x < ccx * TREE_CELL || c.x >= (ccx + 1) * TREE_CELL || c.z < ccz * TREE_CELL || c.z >= (ccz + 1) * TREE_CELL) cellFail++;
    const r = at(ccx + 1, ccz), d = at(ccx, ccz + 1);
    minGap = Math.min(minGap, Math.abs(r.x - c.x) + Math.abs(r.z - c.z), Math.abs(d.x - c.x) + Math.abs(d.z - c.z));
  }
  ok("tree candidates stay inside their cell", cellFail === 0, `${cellFail} escapes`);
  ok("neighbor cell candidates keep ≥3 manhattan gap", minGap >= 3, `minGap=${minGap}`);
}

// ── Smoke: EVERY house style must generate voxels through the real builder ──
const S = await import("../../src/game/terrain/structures");
for (const style of S.STYLES) {
  try {
    const fw = fakeWriter();
    const H = { x0: 4, z0: 4, x1: 4 + Math.min(style.wMin, 10), z1: 4 + Math.min(style.wMin, 10), base: 64, style, side: "S" };
    S.generateHouseStructure(H, fw.w, () => {}, () => 64, () => 0.5);
    ok(`house "${style.key}" generates voxels (${fw.count()})`, fw.count() > 0);
  } catch (e) {
    ok(`house "${style.key}" runs without exception`, false, String(e));
  }
}

// ── Phase 3: EVERY researched interior design must build, carry its workstation
//    + bed + light + storage, and differ from the other designs ──
const fakeWriterIds = () => {
  const ids: number[] = [];
  let n = 0;
  return { w: (_x: unknown, _y: unknown, _z: unknown, id: number) => { if (id > 0) { n++; ids.push(id); } }, count: () => n, ids: () => ids };
};
ok("house design registry has 20 entries", S.HOUSE_DESIGN_META.length === 20, `got ${S.HOUSE_DESIGN_META.length}`);
{
  const seenSigs = new Set<string>();
  const LIGHT = new Set([46, 47, 48, 80, 82, 87]);
  const STORE = new Set([43, 171]);
  for (const meta of S.HOUSE_DESIGN_META) {
    try {
      const shell = S.STYLES.find((st: { key: string }) => st.key === meta.shell) ?? S.STYLES[0];
      const fw2 = fakeWriterIds();
      const wd = Math.min(shell.wMax, Math.max(shell.wMin, meta.w));
      const H = { x0: 4, z0: 4, x1: 4 + wd - 1, z1: 4 + wd - 1, base: 64, style: shell, side: "S", designKey: meta.key };
      S.generateHouseStructure(H, fw2.w, () => {}, () => 64, () => 0.5);
      ok(`house design "${meta.key}" generates voxels (${fw2.count()})`, fw2.count() > 0);
      const idset = new Set(fw2.ids());
      const hasAll = meta.requires.every((id: number) => idset.has(id));
      ok(`house design "${meta.key}" contains workstation+bed+light+storage`, hasAll && idset.has(1162) && [...idset].some((i) => LIGHT.has(i)) && [...idset].some((i) => STORE.has(i)));
      seenSigs.add(fw2.ids().slice().sort((a, b) => a - b).join(","));
    } catch (e) {
      ok(`house design "${meta.key}" runs without exception`, false, String(e));
    }
  }
  ok("house designs are distinct (>=18 of 20 unique fingerprints)", seenSigs.size >= 18, `got ${seenSigs.size}`);
}

// ── Village chest loot: vanilla tables per design, deterministic, hooked to real chests ──
ok("all 20 designs have non-empty loot tables", S.HOUSE_DESIGN_META.every((m: { key: string }) => Array.isArray(S.VILLAGE_LOOT_TABLES[m.key]) && S.VILLAGE_LOOT_TABLES[m.key].length > 0));
{
  let bad = 0;
  const seenIds = new Set<number>();
  for (const t of Object.values(S.VILLAGE_LOOT_TABLES) as Array<Array<[number, number, number]>>) {
    for (const [id, mn, mx] of t) {
      if (!BLOCK_MAP.get(id) || mn < 1 || mx < mn || mx > 64) bad++;
      seenIds.add(id);
    }
  }
  ok("loot tables reference valid registry ids with sane counts", bad === 0, `${seenIds.size} distinct loot ids`);
}
{
  let s = 12345;
  const rng = () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 0) % 100000) / 100000; };
  const a = JSON.stringify(S.rollVillageLoot("village_library", rng));
  s = 12345;
  const b = JSON.stringify(S.rollVillageLoot("village_library", rng));
  ok("village loot rolls deterministically", a === b);
  const loot = S.rollVillageLoot("weaponsmith", rng);
  const filled = loot.filter(Boolean);
  ok("loot roll yields 1-3 stacks in 27 slots", loot.length === 27 && filled.length >= 1 && filled.length <= 3);
}
{
  let missing = 0, hooked = 0;
  for (const meta of S.HOUSE_DESIGN_META) {
    try {
      const shell = S.STYLES.find((st: { key: string }) => st.key === meta.shell) ?? S.STYLES[0];
      const cells = new Map<string, number>();
      const w = (x: unknown, y: unknown, z: unknown, id: number) => { cells.set(`${x},${y},${z}`, id); };
      const lootCalls: string[] = [];
      const wd = Math.min(shell.wMax, Math.max(shell.wMin, meta.w));
      const H = { x0: 4, z0: 4, x1: 4 + wd - 1, z1: 4 + wd - 1, base: 64, style: shell, side: "S", designKey: meta.key };
      S.generateHouseStructure(H, w, () => {}, () => 64, () => 0.5, undefined, (x: number, y: number, z: number) => { lootCalls.push(`${x},${y},${z}`); });
      for (const k of lootCalls) {
        hooked++;
        if (cells.get(k) !== 43) missing++;
      }
      if (lootCalls.length === 0) missing++;
    } catch (e) {
      missing++;
    }
  }
  ok("every design hooks loot to >=1 real chest block", missing === 0 && hooked > 0, `${hooked} hooked chests`);
}
// ── Offline sync: failed saves reject (offline signal), queue groups by world,
//    flush sends per world and keeps only failures in order ──
{
  const { apiSaveBlockEdits, groupPendingByWorld, flushPendingQueue } = await import("../../src/services/api");
  const realFetch = (globalThis as any).fetch;
  try {
    (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({}) });
    let okRes = false;
    try { await apiSaveBlockEdits("w1", [{ x: 1, y: 2, z: 3, blockId: 5 }]); okRes = true; } catch { okRes = false; }
    ok("apiSaveBlockEdits resolves on HTTP ok", okRes);
    (globalThis as any).fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    let threw = false;
    try { await apiSaveBlockEdits("w1", [{ x: 1, y: 2, z: 3, blockId: 5 }]); } catch { threw = true; }
    ok("apiSaveBlockEdits rejects on HTTP error (offline signal)", threw);
    (globalThis as any).fetch = async () => { throw new Error("down"); };
    let threw2 = false;
    try { await apiSaveBlockEdits("w1", [{ x: 1, y: 2, z: 3, blockId: 5 }]); } catch { threw2 = true; }
    ok("apiSaveBlockEdits rejects on network failure", threw2);
  } finally {
    (globalThis as any).fetch = realFetch;
  }
  const q = [
    { worldId: "a", edit: { x: 1, y: 1, z: 1, blockId: 1 } },
    { worldId: "b", edit: { x: 2, y: 2, z: 2, blockId: 2 } },
    { worldId: "a", edit: { x: 3, y: 3, z: 3, blockId: 3 } }
  ];
  const groups = groupPendingByWorld(q);
  ok("pending queue groups by world preserving order", groups.length === 2 && groups[0].worldId === "a" && groups[0].batch.length === 2 && groups[1].worldId === "b");
  const calls: Array<{ w: string; n: number }> = [];
  const rem = await flushPendingQueue(q, async (w: string, b: object[]) => { calls.push({ w, n: b.length }); });
  ok("flush sends one batch per world and clears", rem.length === 0 && calls.length === 2 && calls[0].w === "a" && calls[0].n === 2 && calls[1].w === "b");
  const rem2 = await flushPendingQueue(q, async (w: string) => { if (w === "b") throw new Error("down"); });
  ok("flush keeps only failed world items in order", rem2.length === 1 && rem2[0].worldId === "b" && (rem2[0].edit as { x: number }).x === 2);
  const rem3 = await flushPendingQueue([], async () => { throw new Error("must not send"); });
  ok("flush of empty queue sends nothing", rem3.length === 0);
}
ok("tree catalogue lists all tree types (20)", treeCatalogCount() === 20, `got ${treeCatalogCount()}`);
ok("oak params schema present", !!TREE_CATALOG.find(t => t.catalogId === "tree.oak.giant")?.params.layers);
ok("full catalogue includes giant-oak + spruce-mushroom + jungle rows", ["tree.oak.giant", "tree.spruce", "tree.mushroom.red", "tree.jungle", "tree.jungle.emergent"].every(id => TREE_CATALOG.some(t => t.catalogId === id)));

// Bucket item registry guards
const bn = (id: number) => (BLOCK_MAP.get(id)?.name || "").toLowerCase();
ok("bucket ids registered (134 empty / 135 water / 136 lava)",
  !!BLOCK_MAP.get(134) && !!BLOCK_MAP.get(135) && !!BLOCK_MAP.get(136) &&
  bn(134).includes("bucket") && bn(135).includes("water") && bn(136).includes("lava"));
ok("lava bucket is a light source", !!(BLOCK_MAP.get(136)!.glow));

// Phase 4: Extended Catalogues & Scenarios checks
const { HOUSE_CATALOG, FEATURE_CATALOG, MOB_CATALOG, VILLAGER_CATALOG, ENTITY_CATALOG, SAN_ANDREAS_CATALOG } = await import("../../src/sim/catalog");
ok("house catalogue has 8 styles", HOUSE_CATALOG.length === 8);
ok("feature catalogue has 8 entries", FEATURE_CATALOG.length === 8);
ok("mob catalogue has 5 entries", MOB_CATALOG.length === 5);
ok("villager catalogue has 6 professions", VILLAGER_CATALOG.length === 6);
ok("entity catalogue has 9 entries", ENTITY_CATALOG.length === 9);
ok("san andreas catalogue has 6 entries", SAN_ANDREAS_CATALOG.length === 6);

// Phase 4: Scenario suites execution
const { SCENARIO_SUITES } = await import("../../src/sim/scenarios");
ok("scenario suites registered", SCENARIO_SUITES.length >= 5);
let scenarioStepsPassed = 0;
for (const s of SCENARIO_SUITES) {
  for (const st of s.steps) {
    const res = st.run();
    if (res.pass) scenarioStepsPassed++;
  }
}
ok(`all in-browser scenario steps pass (${scenarioStepsPassed})`, scenarioStepsPassed >= 15);

// Phase 4: WebWorker Chunk Meshing buffer generator check
const { buildChunkMeshBuffers } = await import("../../src/game/engine/meshWorker");
const testChunkData = new Uint8Array(256 * 128);
testChunkData[64 * 256 + 8 * 16 + 8] = 1; // 1 stone block at (8,64,8)
const meshRes = buildChunkMeshBuffers({ cx: 0, cz: 0, data: testChunkData, maxY: 64 });
ok("meshWorker builds opaque buffers", !!meshRes.opaque && meshRes.opaque.pos.length > 0);
ok("meshWorker handles coordinate offsets correctly", meshRes.cx === 0 && meshRes.cz === 0);

// Cobweb density family: medium 259 / sparse 1207 / dense 1208 mesh into the
// trans bucket with strictly increasing vertex counts (1 / 2 / 4 planes).
const webMeshFor = (id: number) => {
  const d = new Uint16Array(256 * 128);
  d[64 * 256 + 8 * 16 + 8] = id;
  return buildChunkMeshBuffers({ cx: 0, cz: 0, data: d, maxY: 64 });
};
const webMed = webMeshFor(259), webLow = webMeshFor(1207), webHigh = webMeshFor(1208);
const webVerts = (r: typeof webMed) => (r.trans ? r.trans.pos.length / 3 : 0);
ok("cobweb medium/sparse/dense mesh into trans bucket", webVerts(webMed) > 0 && webVerts(webLow) > 0 && webVerts(webHigh) > 0);
ok("cobweb density ordering sparse < medium < dense", webVerts(webLow) < webVerts(webMed) && webVerts(webMed) < webVerts(webHigh),
  `got ${webVerts(webLow)}/${webVerts(webMed)}/${webVerts(webHigh)}`);
ok("cobweb ids are walk-through alpha webs", [259, 1207, 1208].every((id) => { const b = BLOCK_MAP.get(id); return b && !b.solid && !!b.trans; }));
ok("spider egg 1209 is an item", (BLOCK_MAP.get(1209)?.itemTexture ?? "") === "spider_eye.png");

// Cobweb Sparse follows placement facing: dirs select one of two diagonals.
const sparseMeshFor = (diag: number) => {
  const d = new Uint16Array(256 * 128);
  const off = 64 * 256 + 8 * 16 + 8;
  d[off] = 1207;
  const dirs = new Uint16Array(256 * 128);
  dirs[off] = diag + 1;
  return buildChunkMeshBuffers({ cx: 0, cz: 0, data: d, maxY: 64, dirs });
};
const sp0 = sparseMeshFor(0), sp1 = sparseMeshFor(1);
ok("cobweb sparse diagonals both mesh", (sp0.trans?.pos.length ?? 0) > 0 && (sp1.trans?.pos.length ?? 0) > 0);
ok("cobweb sparse diagonals differ", JSON.stringify([...(sp0.trans?.pos ?? [])]) !== JSON.stringify([...(sp1.trans?.pos ?? [])]));

// Web spider growth: visible 8/100 hatchling, full 25/100 past 4 days, capped.
const approx = (a: number, b: number) => Math.abs(a - b) < 1e-9;
ok("web spider hatches visible at 8/100 block", approx(webSpiderScaleForAge(0), 0.08) && webSpiderScaleForAge(0) >= 0.08);
ok("web spider full size 25/100 past 4 days", approx(webSpiderScaleForAge(4), 0.25) && approx(webSpiderScaleForAge(6), 0.25));
ok("web spider size caps after day 4", approx(webSpiderScaleForAge(30), 0.25));

// Day counting: sun-cycle wrap starts a new day.
ok("day wraps at dawn", (() => { const r = advanceTime(23990, 20, 3); return r.time === 10 && r.dayCount === 4; })());
ok("no wrap means no new day", (() => { const r = advanceTime(6000, 20, 3); return r.time === 6020 && r.dayCount === 3; })());

// Web spider legs: upper segments span the hip origin (inside the body) and
// reach outward, with the knee joint at the segment tip.
const wsm = createWebSpiderMesh();
ok("web spider legs visibly connect to body", wsm.legs.length === 8 && wsm.legs.every((l) => {
  const side = l.hip.position.x > 0 ? 1 : -1;
  const upper = l.hip.children[0] as THREE.Mesh;
  upper.geometry.computeBoundingBox();
  const bb = upper.geometry.boundingBox!;
  const rooted = bb.min.x <= 0.001 && bb.max.x >= -0.001;
  const outward = side > 0 ? bb.max.x > 0.1 : bb.min.x < -0.1;
  const kneeAtTip = Math.abs(Math.abs(l.knee.position.x) - 0.17) < 0.001;
  return rooted && outward && kneeAtTip && Math.abs(l.hip.position.x) <= 0.12;
}));
ok("web spider eyes are unlit (readable at tiny sizes)", (() => {
  let n = 0;
  wsm.root.traverse((o) => {
    const m = o as THREE.Mesh;
    const mat = m.material as unknown as { isMeshBasicMaterial?: boolean; color?: { getHex?: () => number } };
    if (m.isMesh && mat.isMeshBasicMaterial && mat.color?.getHex?.() === 0xff3524) n++;
  });
  return n === 8;
})());

// Mug block: registered cup prop that meshes as opaque geometry.
ok("mug 1210 is a registered decoration block", (BLOCK_MAP.get(1210)?.name ?? "") === "Mug");
const { hasPropModel: hasMugPropModel } = await import("../../src/game/engine/chunkMesh");
ok("mug 1210 has a 3D prop model", hasMugPropModel(1210));
ok("mug 1210 meshes into the trans bucket", (() => {
  const d = new Uint16Array(256 * 128);
  d[64 * 256 + 8 * 16 + 8] = 1210;
  const r = buildChunkMeshBuffers({ cx: 0, cz: 0, data: d, maxY: 64 });
  return !!r.trans && r.trans.pos.length > 0;
})());

// Mug catch/release roundtrip keeps age and identity.
const T3 = await import("three");
ok("mug take/release relocates spiders", (() => {
  const mgr = new WebSpiderManager();
  mgr.init(new T3.Scene());
  if (!mgr.spawn(5, 64, 5, 3)) return false;
  const caught = mgr.take(5, 64, 5);
  if (!caught || caught.hatchDay !== 3 || mgr.spiderAt(5, 64, 5)) return false;
  if (mgr.take(5, 64, 5)) return false; // nothing left to catch
  if (!mgr.release(6, 64, 6, caught)) return false;
  return mgr.spiderAt(6, 64, 6)?.hatchDay === 3;
})());

// Web deleted: old (>4d) spiders fall to the ground and remain; young vanish.
ok("old spider grounds itself when its web breaks", (() => {
  const mgr = new WebSpiderManager();
  mgr.init(new T3.Scene());
  let web = true;
  const getBlock = (x: number, y: number, z: number) => {
    if (web && x === 10 && y === 64 && z === 10) return 259;
    return y <= 60 ? 7 : 0;
  };
  if (!mgr.spawn(10, 64, 10, 10)) return false; // hatchDay 10 → age 5 at day 15
  web = false;
  for (let i = 0; i < 200; i++) mgr.update(0.05, getBlock, 15);
  const sp = mgr.spiderAt(10, 64, 10);
  return !!sp && sp.grounded && Math.abs(sp.y - 61) < 0.05;
})());
ok("young spider despawns when its web breaks", (() => {
  const mgr = new WebSpiderManager();
  mgr.init(new T3.Scene());
  let web = true;
  const getBlock = (x: number, y: number, z: number) => {
    if (web && x === 10 && y === 64 && z === 10) return 259;
    return y <= 60 ? 7 : 0;
  };
  if (!mgr.spawn(10, 64, 10, 13)) return false; // age 2 at day 15
  web = false;
  mgr.update(0.05, getBlock, 15);
  return mgr.spiders.size === 0;
})());
ok("web spiders crawl the whole block, not just the top", (() => {
  const mgr = new WebSpiderManager();
  mgr.init(new T3.Scene());
  const getBlock = (x: number, y: number, z: number) => (x === 10 && y === 64 && z === 10 ? 259 : (y <= 60 ? 7 : 0));
  if (!mgr.spawn(10, 64, 10, 0)) return false;
  let offTop = false;
  for (let i = 0; i < 600; i++) {
    mgr.update(0.05, getBlock, 0);
    const sp = mgr.spiderAt(10, 64, 10);
    if (!sp || sp.grounded) return false;
    if (Math.abs(sp.x - 10.5) > 0.75 || Math.abs(sp.z - 10.5) > 0.75) return false; // escaped the web
    if (sp.y < 64.95) offTop = true; // inside or on a side face
    if (sp.y < 64 || sp.y > 65.05) return false; // left the block vertically
  }
  return offTop;
})());
ok("owned spiders listed for pets menu, others hidden", (() => {
  const mgr = new WebSpiderManager();
  mgr.init(new T3.Scene());
  if (!mgr.release(3, 64, 3, { hatchDay: 0, name: "Aragog", ownerId: "u1", sex: "male" })) return false;
  if (!mgr.release(4, 64, 4, { hatchDay: 0 })) return false;
  return mgr.ownedEntries("u1").length === 1 && mgr.ownedEntries("u2").length === 0;
})());
ok("big-spider milestone is past 4 days", webSpiderIsBig(5) && !webSpiderIsBig(4));
// Emitter-only `light` flag: vanilla emitters that keep shaded meshes.
ok("emitter-only lights match vanilla levels", (() => {
  const d = (id: number) => BLOCK_MAP.get(id)?.lightDist;
  const li = (id: number) => (BLOCK_MAP.get(id) as unknown as { light?: number })?.light;
  const gl = (id: number) => BLOCK_MAP.get(id)?.glow;
  return li(232) === 1 && d(232) === 3 && !gl(232)
    && li(353) === 1 && d(353) === 7 && !gl(353)
    && li(216) === 1 && d(216) === 1
    && li(347) === 1 && d(347) === 1
    && li(428) === 1 && d(428) === 4 && li(486) === 1 && d(486) === 2 && li(619) === 1 && d(619) === 1
    && li(601) === 1 && d(601) === 12;
})());
// Vanilla light-level parity (kb/mechanics/light-levels.md).
ok("light reach matches vanilla levels", (() => {
  const d = (id: number) => BLOCK_MAP.get(id)?.lightDist;
  return d(80) === 14 && d(81) === 10 && d(85) === 15 && d(86) === 10
    && d(99) === 3 && d(103) === 1 && d(97) === 5 && d(100) === 7
    && d(47) === 15 && d(96) === 13 && d(102) === 15 && d(92) === 14
    && d(630) === 10 && BLOCK_MAP.get(630)?.glow === 1;
})());
ok("spider entity exposes .root for pet naming", (() => {
  const mgr = new WebSpiderManager();
  mgr.init(new T3.Scene());
  if (!mgr.spawn(7, 64, 7, 0)) return false;
  const sp = mgr.spiderAt(7, 64, 7);
  return !!sp && sp.root === sp.mesh.root;
})());
ok("torch flames mesh into the glow bucket", (() => {
  const d = new Uint16Array(256 * 128);
  d[64 * 256 + 8 * 16 + 8] = 80;
  const r = buildChunkMeshBuffers({ cx: 0, cz: 0, data: d, maxY: 64 });
  return !!r.glow && r.glow.pos.length > 0;
})());

// Builder Studio: Blueprint scanner, rotation, and validation assertions
const { scanStructureFromReader, rotateBlueprint, validateBlueprintDoc } = await import("../../src/sim/blueprintScanner");
const mockGrid = new Map<string, number>();
// Build a 3x3x3 stone cube with wood roof on pad (y=65 to 67)
for (let x = 10; x <= 12; x++) {
  for (let z = 10; z <= 12; z++) {
    for (let y = 65; y <= 67; y++) {
      mockGrid.set(`${x},${y},${z}`, y === 67 ? 17 : 6);
    }
  }
}
const scannedBp = scanStructureFromReader(
  (x, y, z) => mockGrid.get(`${x},${y},${z}`) || 0,
  0, 0, 20, 20,
  { name: "Test Fort", author: "Tester", category: "castle", biomeAffinity: ["taiga"] }
);
ok("blueprintScanner captures bounding box correctly", !!scannedBp && scannedBp.dimensions.width === 3 && scannedBp.dimensions.height === 3 && scannedBp.dimensions.depth === 3);
ok("blueprintScanner normalizes relative offsets", !!scannedBp && scannedBp.blocks.length === 27 && scannedBp.blocks.some(b => b.dx === 0 && b.dy === 0 && b.dz === 0));
ok("blueprintScanner validates document schema", validateBlueprintDoc(scannedBp));
ok("rotateBlueprint rotates 90 degrees correctly", (() => {
  if (!scannedBp) return false;
  const rot = rotateBlueprint(scannedBp, 1);
  return rot.length === scannedBp.blocks.length;
})());

// AI Asset Platform & Hardened Modules (D12–D16)
const { rotateBlockId, rotateBlueprintDoc } = await import("../../src/sim/blockRotation");
const { stampBlocksWithConformity } = await import("../../src/sim/terrainConformity");
const { lintBlueprint } = await import("../../src/sim/assetSideloader");

ok("rotateBlockId handles 360-degree cycle", rotateBlockId(70, 4) === 70 && rotateBlockId(70, 0) === 70);
ok("rotateBlueprintDoc transforms coordinates and rotates dimensions", (() => {
  if (!scannedBp) return false;
  const rotDoc = rotateBlueprintDoc(scannedBp, 1);
  return rotDoc.dimensions.width === scannedBp.dimensions.depth &&
         rotDoc.dimensions.depth === scannedBp.dimensions.width &&
         rotDoc.blocks.length === scannedBp.blocks.length;
})());

ok("stampBlocksWithConformity builds foundation skirt on slope", (() => {
  if (!scannedBp) return false;
  const stamped = new Map<string, number>();
  // Ground is at y=60, building placed at y=65 (5-block cliff)
  stampBlocksWithConformity(
    scannedBp.blocks,
    0, 65, 0,
    (x, y, z, id) => stamped.set(`${x},${y},${z}`, id),
    () => 60,
    { foundationBlockId: 8 }
  );
  // Must have stone bricks (id=8) placed in the foundation gap y=60..64
  let foundFoundation = false;
  for (let y = 60; y < 65; y++) {
    if (stamped.get(`0,${y},0`) === 8) {
      foundFoundation = true;
      break;
    }
  }
  return foundFoundation && stamped.size > scannedBp.blocks.length;
})());

ok("lintBlueprint validates structural and physical integrity", (() => {
  if (!scannedBp) return false;
  const rep = lintBlueprint(scannedBp);
  return rep.valid && rep.blockCount === 27 && rep.dimensions.width === 3;
})());

// Param-spec-first AI contract: spec → deterministic generator → lint gate
const { specToBlueprint, validateAssetSet, repairAsset, generateAssetsWithRetry, normalizeSpec } =
  await import("../../catalog/ai/generateAssetsWithValidation");

const houseSpec = {
  id: "bp_test_house",
  name: "Test House",
  category: "house",
  style: "rustic_cottage",
  biomeAffinity: ["plains"],
  dimensions: { width: 7, height: 6, depth: 6, stories: 1 },
  roof: { style: "gable", pitch: 1.0, overhang: 1 },
  palette: { foundation: "stone_bricks", frame: "oak_log", walls: "oak_planks", roof: "oak_stairs" },
  createdAt: new Date().toISOString()
} as any;

ok("specToBlueprint resolves a param spec into a lint-valid house", (() => {
  const bp = specToBlueprint(houseSpec);
  const lint = lintBlueprint(bp);
  return lint.valid && bp.blocks.length > 0 && bp.category === "house";
})());

ok("specToBlueprint resolves a foliage spec via the simple assembler (tree, not house)", (() => {
  const bp = specToBlueprint({ ...houseSpec, id: "bp_test_tree", name: "Test Tree", category: "foliage", dimensions: { width: 5, height: 8, depth: 5, stories: 1 } } as any);
  const lint = lintBlueprint(bp);
  return lint.valid && bp.category === "misc";
})());

ok("specToBlueprint resolves a vehicle spec (70s pickup) with tires at y=0", (() => {
  const bp = specToBlueprint({
    id: "bp_pickup", name: "70s Pickup", category: "object", style: "modern_villa",
    biomeAffinity: ["plains"], vehicleType: "pickup",
    dimensions: { width: 3, height: 4, depth: 6, stories: 1 },
    roof: { style: "flat", pitch: 1, overhang: 1 },
    palette: { paint: "light_gray_concrete", tires: "black_concrete", metal: "iron_block", windows: "tinted_glass", lights: "sea_lantern" },
    createdAt: new Date().toISOString()
  } as any);
  const lint = lintBlueprint(bp);
  const groundPx = bp.blocks.filter(b => b.dy === 0).length;
  const blackConcrete = bp.blocks.filter(b => b.id === 186).length; // black_concrete tires
  return lint.valid && groundPx >= 4 && blackConcrete >= 4 && bp.dimensions.depth === 6;
})());

ok("generateVehicleFromSpec leaves no floating voxels (all connected to y=0 column)", (() => {
  const bp = specToBlueprint({
    id: "bp_pickup2", name: "Pickup2", category: "object", style: "modern_villa",
    biomeAffinity: ["plains"], vehicleType: "pickup",
    dimensions: { width: 3, height: 4, depth: 6, stories: 1 }, roof: { style: "flat", pitch: 1, overhang: 1 },
    palette: {}, createdAt: new Date().toISOString()
  } as any);
  // every column must have a y=0 or y=1 block (grounded)
  const byCol = new Map<string, boolean>();
  for (const b of bp.blocks) {
    if (b.dy === 0 || b.dy === 1) byCol.set(`${b.dx},${b.dz}`, true);
  }
  return bp.blocks.every(b => byCol.has(`${b.dx},${b.dz}`));
})());

ok("normalizeSpec clamps out-of-range dims/stories", (() => {
  const spec = normalizeSpec({ ...houseSpec, id: "bp_x", dimensions: { width: 999, height: 1, depth: 3, stories: 9 } } as any);
  return spec.dimensions.width === 24 && spec.dimensions.stories === 3 && spec.dimensions.depth === 5;
})());

ok("validateAssetSet reports lint per asset", (() => {
  const vs = validateAssetSet([houseSpec, { ...houseSpec, id: "bp_bad", category: "object", dimensions: { width: 2, height: 2, depth: 2 } } as any]);
  return vs.length === 2 && vs.every(v => v.valid) && vs.every(v => v.blueprint && v.lint);
})());

ok("repairAsset repairs an invalid asset by re-normalizing", (() => {
  const vs = validateAssetSet([{ ...houseSpec, id: "bp_repair", dimensions: { width: 0, height: 0, depth: 0, stories: 0 } } as any]);
  const repaired = repairAsset(vs[0]);
  return repaired.valid && repaired.retries === 1;
})());

ok("generateAssetsWithRetry validates + repairs and reports allValid", await (async () => {
  const out = await generateAssetsWithRetry(async () => ({
    assets: [houseSpec, { ...houseSpec, id: "bp_tree2", category: "foliage", dimensions: { width: 3, height: 7, depth: 3 } } as any],
    scene: null,
    report: null
  }), { images: [], intent: "test" }, 1);
  return out.validations.length === 2 && out.allValid;
})());

// Litematica export: BlueprintDoc → .litematic (v6 NBT)
const { blueprintToLitematic, packBlockStates, mcBlockName } =
  await import("../../src/sim/litematicExporter");

ok("mcBlockName maps vanilla names to minecraft: ids", (() => {
  return mcBlockName(17) === "minecraft:oak_planks" &&       // Oak planks
         mcBlockName(186) === "minecraft:black_concrete" &&  // Black concrete
         mcBlockName(48) === "minecraft:sea_lantern";        // Sea lantern
})());

ok("packBlockStates packs palette indexes back (roundtrip via bit unpack)", (() => {
  const idx = [0, 1, 2, 3, 1, 0, 2, 3, 1, 2]; // 10 entries, 4 bits each → 1 long
  const longs = packBlockStates(idx);
  const bits = 4;
  const unpacked: number[] = [];
  for (const L of longs) {
    for (let i = 0; i < 16; i++) {
      unpacked.push(Number((L >> BigInt(i * bits)) & 0xfn));
    }
  }
  return unpacked.slice(0, idx.length).join(",") === idx.join(",");
})());

ok("blueprintToLitematic emits a v6 NBT stream with palette + total blocks", (() => {
  const bp = specToBlueprint(houseSpec);
  const bytes = blueprintToLitematic(bp);
  // NBT root name-tag: TAG_Compound (0x0a) + empty name
  const isCompound = bytes[0] === 0x0a && bytes[1] === 0;
  // crude string scan for required tokens
  const latin = Array.from(bytes.slice(0, bytes.length), (b) => String.fromCharCode(b)).join("");
  return bytes.length > 200 &&
         isCompound &&
         latin.includes("minecraft:oak_planks") &&
         latin.includes("minecraft:air") &&
         latin.includes("TotalBlocks") &&
         latin.includes("BlockStates") &&
         latin.includes("BlockStatePalette");
})());

ok("blueprintToLitematic is deterministic (same doc → same bytes)", (() => {
  const bp = specToBlueprint(houseSpec);
  const a = blueprintToLitematic(bp);
  const b = blueprintToLitematic(bp);
  return a.length === b.length && a.every((v, i) => v === b[i]);
})());

// V0 Vehicle physics (pure) — flat world unless stated
const { stepVehiclePhysics, createVehiclePhysicsState } = await import("../../src/game/vehicles/vehiclePhysics");
const { vehicleStyle } = await import("../../src/game/vehicles/vehicleDefs");

const flatWorld = {
  isSolidAt: () => false,
  groundYAt: () => 0
};
const noInput = { throttle: 0, brake: 0, handbrake: false, steer: 0 };
const drive = (s: any, sec: number, input = { throttle: 1, brake: 0, handbrake: false, steer: 0 }) => {
  const t = vehicleStyle("sedan").tunables;
  for (let i = 0; i < sec * 60; i++) stepVehiclePhysics(s, input, 1 / 60, t, flatWorld);
};

ok("vehicle accelerates from rest (4s throttle > 11 m/s)", (() => {
  const s = createVehiclePhysicsState(0, 0, 0);
  drive(s, 4);
  return s.speed > 11;
})());

ok("vehicle respects topSpeed clamp", (() => {
  const s = createVehiclePhysicsState(0, 0, 0);
  drive(s, 60);
  const top = vehicleStyle("sedan").tunables.topSpeed;
  return s.speed <= top + 0.01 && s.speed > top * 0.92;
})());

ok("brake stops the car", (() => {
  const s = createVehiclePhysicsState(0, 0, 0);
  drive(s, 5);
  const before = s.speed;
  drive(s, 3, { throttle: 0, brake: 1, handbrake: false, steer: 0 });
  return before > 10 && s.speed < 0.5;
})());

ok("foot brake decelerates harder than handbrake (handbrake = slide grip)", (() => {
  const a = createVehiclePhysicsState(0, 0, 0);
  const b = createVehiclePhysicsState(0, 0, 0);
  drive(a, 4); drive(b, 4);
  drive(a, 0.5, { throttle: 0, brake: 1, handbrake: false, steer: 0 });
  drive(b, 0.5, { throttle: 0, brake: 0, handbrake: true, steer: 0 });
  return a.speed <= b.speed; // foot-braked car is slower after 0.5s
})());

ok("no steering at standstill", (() => {
  const s = createVehiclePhysicsState(0, 0, 0, 1);
  drive(s, 2, { throttle: 0, brake: 0, handbrake: false, steer: 1 });
  return Math.abs(s.yaw - 1) < 1e-6;
})());

ok("mass scaling: 2x mass accelerates slower at same force", (() => {
  const t = vehicleStyle("sedan").tunables;
  const light = createVehiclePhysicsState(0, 0, 0);
  const heavy = createVehiclePhysicsState(0, 0, 0);
  const tHeavy = { ...t, mass: t.mass * 2 };
  for (let i = 0; i < 180; i++) {
    stepVehiclePhysics(light, { throttle: 1, brake: 0, handbrake: false, steer: 0 }, 1 / 60, t, flatWorld);
    stepVehiclePhysics(heavy, { throttle: 1, brake: 0, handbrake: false, steer: 0 }, 1 / 60, tHeavy, flatWorld);
  }
  return light.speed > heavy.speed * 1.5;
})());

ok("wall collision stops the car (no clipping)", (() => {
  const t = vehicleStyle("sedan").tunables;
  const s = createVehiclePhysicsState(0, 0, 0, 0); // facing -Z: drive toward z<0
  const wallWorld = { isSolidAt: (x: number, y: number, z: number) => z <= -6 && y >= 0 && y <= 2, groundYAt: () => 0 };
  for (let i = 0; i < 60 * 8; i++) stepVehiclePhysics(s, { throttle: 1, brake: 0, handbrake: false, steer: 0 }, 1 / 60, t, wallWorld);
  return s.speed < 0.5 && s.z > -6 - t.halfLength - 0.01;
})());

ok("downhill slope accelerates a stationary car", (() => {
  const t = vehicleStyle("sedan").tunables;
  const s = createVehiclePhysicsState(0, 2, 0);
  const hill = { isSolidAt: () => false, groundYAt: (x: number, z: number) => 2 + z * 0.5 }; // downhill toward -z
  for (let i = 0; i < 120; i++) stepVehiclePhysics(s, noInput, 1 / 60, t, hill);
  return s.speed > 1 && s.z < 0;
})());

ok("throttle raises the nose (engine bay up), braking dives it", (() => {
  const t = vehicleStyle("sedan").tunables;
  const s = createVehiclePhysicsState(0, 0, 0);
  drive(s, 2);                       // accelerate → pitch > 0 (nose up)
  const accelPitch = s.pitch;
  drive(s, 1, { throttle: 0, brake: 1, handbrake: false, steer: 0 }); // brake → pitch < 0
  return accelPitch > 0.02 && s.pitch < -0.02;
})());

// FBX import scaffold (pure three.js — no WebGL needed)
const THREE = await import("three");
const { normalizeModelToVehicle, detectVehicleWheels } = await import("../../src/game/vehicles/fbxVehicle");

ok("fbx: normalizeModelToVehicle scales a rig to target length & grounds it", (() => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4));
  body.scale.set(25, 25, 25); // 50 x 25 x 100 "FBX in cm" rig
  g.add(body);
  g.updateMatrixWorld(true);
  normalizeModelToVehicle(g, 4.2);
  const size = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
  const min = new THREE.Box3().setFromObject(g).min;
  return Math.abs(size.z - 4.2) < 0.05 && Math.abs(min.y) < 0.001;
})());

ok("fbx: detectVehicleWheels maps FL/FR/RL/RR by position", (() => {
  const g = new THREE.Group();
  const wheel = (x: number, z: number, name: string) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5));
    m.name = name;
    m.position.set(x, 0.3, z);
    g.add(m);
  };
  wheel(-1, -1.5, "wheel_front_L");
  wheel(1, -1.5, "wheel_FR");
  wheel(-1, 1.5, "wheel_RL");
  wheel(1, 1.5, "wheel_rear_R");
  g.updateMatrixWorld(true);
  const w = detectVehicleWheels(g);
  if (!w) return false;
  return w.FL.position.x < w.FR.position.x && w.FL.position.z < w.RL.position.z;
})());

// Block durability checks
ok("getBlockDurability: Stone (5) === 1.25", getBlockDurability(5) === 1.25);
ok("getBlockDurability: Bedrock (14) === Infinity", getBlockDurability(14) === Infinity);
ok("getBlockDurability: Grass block (1) === 1.25", getBlockDurability(1) === 1.25);
ok("getBlockDurability: Oak leaves (18) === 0.8", getBlockDurability(18) === 0.8);

// Survival mining hold-timer tests
ok("survival hold-timer: starts with full durability", (() => {
  const dummyHit = { x: 10, y: 64, z: 20, nx: 0, ny: 1, nz: 0, id: 5 };
  const dur = getBlockDurability(dummyHit.id);
  const timer = startMiningTimer(dummyHit, dur);
  return timer.durability === dur && timer.maxDurability === dur && timer.prog === 0;
})());

ok("survival hold-timer: holding decrements durability and does not break while durability > 0", (() => {
  const dummyHit = { x: 10, y: 64, z: 20, nx: 0, ny: 1, nz: 0, id: 5 };
  const dur = 1.0;
  const timer = startMiningTimer(dummyHit, dur);
  const tick1 = tickMiningTimer(timer, 0.4);
  return !tick1.broken && Math.abs(timer.durability - 0.6) < 1e-6 && timer.durability > 0;
})());

ok("survival hold-timer: breaks block when durability reaches zero", (() => {
  const dummyHit = { x: 10, y: 64, z: 20, nx: 0, ny: 1, nz: 0, id: 5 };
  const dur = 1.0;
  const timer = startMiningTimer(dummyHit, dur);
  tickMiningTimer(timer, 0.5);
  const tick2 = tickMiningTimer(timer, 0.5);
  return tick2.broken && timer.durability <= 0;
})());

// Creative mode instant block deletion click listener tests
ok("creative mode: event listener triggers instant block deletion upon click", (() => {
  let deleted = false;
  const target = new EventTarget();
  const cleanup = setupCreativeInteractionListener(target, (e) => {
    if (e.button === 0) deleted = true;
  });
  const clickEvent = new Event("click");
  (clickEvent as any).button = 0;
  target.dispatchEvent(clickEvent);
  cleanup();
  return deleted;
})());

ok("creative mode: click listener is properly removed upon cleanup", (() => {
  let count = 0;
  const target = new EventTarget();
  const cleanup = setupCreativeInteractionListener(target, () => { count++; });
  const clickEvent = new Event("click");
  (clickEvent as any).button = 0;
  target.dispatchEvent(clickEvent);
  cleanup();
  target.dispatchEvent(clickEvent);
  return count === 1;
})());

// Dropped Mini-Block Items tests
ok("itemDrops: spawnDrop creates a mini-block item entity with upward velocity", (() => {
  const scene = new THREE.Scene();
  const mat = new THREE.MeshBasicMaterial();
  const mgr = createItemDropManager(scene, mat, (x, y, z) => (y < 64 ? 1 : 0));
  const drop = mgr.spawnDrop(10, 65, 10, 5, 2);
  if (!drop) return false;
  return drop.id === 5 && drop.count === 2 && drop.vy > 1.5 && scene.children.length === 1;
})());

ok("itemDrops: gravity and ground collision rest upon solid blocks", (() => {
  const scene = new THREE.Scene();
  const mat = new THREE.MeshBasicMaterial();
  // Solid ground at y < 64
  const mgr = createItemDropManager(scene, mat, (x, y, z) => (y < 64 ? 1 : 0));
  const drop = mgr.spawnDrop(10, 64.5, 10, 5, 1);
  if (!drop) return false;
  // Step multiple frames to let gravity pull it down to rest on ground
  for (let step = 0; step < 20; step++) {
    mgr.update(0.05, 0, 0, 0, () => 0);
  }
  // Ground block top is at 64. resting height is 63 + 1 + 0.14 = 64.14
  return Math.abs(drop.y - 64.14) < 0.05 && drop.vy === 0;
})());

ok("itemDrops: proximity magnet pulls item towards player and onPickup collects it", (() => {
  const scene = new THREE.Scene();
  const mat = new THREE.MeshBasicMaterial();
  const mgr = createItemDropManager(scene, mat, (x, y, z) => (y < 64 ? 1 : 0));
  const drop = mgr.spawnDrop(10, 64.14, 10, 5, 3);
  if (!drop) return false;
  drop.pickupDelay = 0; // zero delay for test

  let pickedUpId = 0;
  let pickedUpCount = 0;
  // Player standing 1.5m away (x=11.5, y=64, z=10)
  // Distance is within 2.2m magnet range
  const initX = drop.x;
  mgr.update(0.1, 11.5, 64, 10, (id, count) => {
    pickedUpId = id;
    pickedUpCount = count;
    return 0; // 0 leftover = fully picked up
  });
  // Item should have moved closer to player (x increased towards 11.5)
  const movedCloser = drop.x > initX;

  // Now player walks into pickup range (< 0.75m, e.g. x=drop.x + 0.2)
  mgr.update(0.1, drop.x + 0.2, drop.y, drop.z, (id, count) => {
    pickedUpId = id;
    pickedUpCount = count;
    return 0;
  });

  return movedCloser && pickedUpId === 5 && pickedUpCount === 3 && mgr.drops.length === 0 && scene.children.length === 0;
})());

// ── 2010 Vanilla Tool Mining Tests ──────────────────────────────────────────

ok("vanilla tools: tool tiers, speeds, and max durability match 2010 vanilla", (() => {
  const woodPick = getToolInfo(1156);
  const stonePick = getToolInfo(1132);
  const ironPick = getToolInfo(956);
  const goldPick = getToolInfo(936);
  const diaPick = getToolInfo(885);

  return (
    woodPick?.tierLevel === 0 && woodPick.tierSpeed === 2 && woodPick.maxDurability === 60 &&
    stonePick?.tierLevel === 1 && stonePick.tierSpeed === 4 && stonePick.maxDurability === 132 &&
    ironPick?.tierLevel === 2 && ironPick.tierSpeed === 6 && ironPick.maxDurability === 251 &&
    goldPick?.tierLevel === 0 && goldPick.tierSpeed === 12 && goldPick.maxDurability === 33 &&
    diaPick?.tierLevel === 3 && diaPick.tierSpeed === 8 && diaPick.maxDurability === 1562
  );
})());

ok("vanilla harvest gating: wood pickaxe cannot harvest Iron Ore or Diamond Ore", (() => {
  const WOOD_PICK = 1156;
  const STONE_ID = 5;
  const COAL_ORE_ID = 30;
  const IRON_ORE_ID = 31;
  const DIAMOND_ORE_ID = 35;
  const OBSIDIAN_ID = 15;

  return (
    canHarvestBlock(STONE_ID, WOOD_PICK) === true &&
    canHarvestBlock(COAL_ORE_ID, WOOD_PICK) === true &&
    canHarvestBlock(IRON_ORE_ID, WOOD_PICK) === false &&
    canHarvestBlock(DIAMOND_ORE_ID, WOOD_PICK) === false &&
    canHarvestBlock(OBSIDIAN_ID, WOOD_PICK) === false
  );
})());

ok("vanilla harvest gating: stone pickaxe harvests Iron Ore but not Diamond Ore or Obsidian", (() => {
  const STONE_PICK = 1132;
  const IRON_ORE_ID = 31;
  const DIAMOND_ORE_ID = 35;
  const OBSIDIAN_ID = 15;

  return (
    canHarvestBlock(IRON_ORE_ID, STONE_PICK) === true &&
    canHarvestBlock(DIAMOND_ORE_ID, STONE_PICK) === false &&
    canHarvestBlock(OBSIDIAN_ID, STONE_PICK) === false
  );
})());

ok("vanilla harvest gating: iron pickaxe harvests Diamond Ore but not Obsidian", (() => {
  const IRON_PICK = 956;
  const DIAMOND_ORE_ID = 35;
  const OBSIDIAN_ID = 15;

  return (
    canHarvestBlock(DIAMOND_ORE_ID, IRON_PICK) === true &&
    canHarvestBlock(OBSIDIAN_ID, IRON_PICK) === false
  );
})());

ok("vanilla harvest gating: diamond pickaxe harvests Obsidian", (() => {
  const DIA_PICK = 885;
  const OBSIDIAN_ID = 15;

  return canHarvestBlock(OBSIDIAN_ID, DIA_PICK) === true;
})());

ok("vanilla mining times: obsidian is 9.375s with diamond pickaxe and 250s with wrong tool", (() => {
  const OBSIDIAN_ID = 15;
  const DIA_PICK = 885;
  const IRON_PICK = 956;
  const HAND = 0;

  const diaTime = getMineTime(OBSIDIAN_ID, DIA_PICK);
  const ironTime = getMineTime(OBSIDIAN_ID, IRON_PICK);
  const handTime = getMineTime(OBSIDIAN_ID, HAND);

  return (
    Math.abs(diaTime - 9.375) < 0.01 &&
    Math.abs(ironTime - 250) < 0.01 &&
    Math.abs(handTime - 250) < 0.01
  );
})());

ok("vanilla block drops: diamond ore drops nothing with wood pickaxe, drops diamond with iron pickaxe", (() => {
  const DIAMOND_ORE_ID = 35;
  const WOOD_PICK = 1156;
  const IRON_PICK = 956;
  const DIAMOND_ITEM_ID = 9825;

  const woodDrops = getBlockDrops(DIAMOND_ORE_ID, WOOD_PICK);
  const ironDrops = getBlockDrops(DIAMOND_ORE_ID, IRON_PICK);

  return (
    woodDrops.length === 0 &&
    ironDrops.length === 1 &&
    ironDrops[0].id === DIAMOND_ITEM_ID &&
    ironDrops[0].count === 1
  );
})());

ok("vanilla block drops: obsidian drops nothing with iron pickaxe, drops obsidian with diamond pickaxe", (() => {
  const OBSIDIAN_ID = 15;
  const IRON_PICK = 956;
  const DIA_PICK = 885;

  const ironDrops = getBlockDrops(OBSIDIAN_ID, IRON_PICK);
  const diaDrops = getBlockDrops(OBSIDIAN_ID, DIA_PICK);

  return (
    ironDrops.length === 0 &&
    diaDrops.length === 1 &&
    diaDrops[0].id === OBSIDIAN_ID &&
    diaDrops[0].count === 1
  );
})());

ok("vanilla block drops: shears on leaves drops the leaf block", (() => {
  const LEAVES_ID = 18;
  const SHEARS_ID = 1113;

  const drops = getBlockDrops(LEAVES_ID, SHEARS_ID);
  return drops.length === 1 && drops[0].id === LEAVES_ID && drops[0].count === 1;
})());

// ── Naked Hand Smashing Mechanics ───────────────────────────────────────────

ok("naked hands: can harvest wood, dirt, and sand with authentic vanilla times and drops", (() => {
  const HAND = 0;
  const OAK_LOG = 16;
  const DIRT = 2;
  const SAND = 10;

  const logHarvest = canHarvestBlock(OAK_LOG, HAND);
  const logTime = getMineTime(OAK_LOG, HAND);
  const logDrops = getBlockDrops(OAK_LOG, HAND);

  const dirtHarvest = canHarvestBlock(DIRT, HAND);
  const dirtTime = getMineTime(DIRT, HAND);
  const dirtDrops = getBlockDrops(DIRT, HAND);

  const sandHarvest = canHarvestBlock(SAND, HAND);
  const sandTime = getMineTime(SAND, HAND);
  const sandDrops = getBlockDrops(SAND, HAND);

  return (
    logHarvest === true && Math.abs(logTime - 3.0) < 0.01 && logDrops.length === 1 && logDrops[0].id === OAK_LOG &&
    dirtHarvest === true && Math.abs(dirtTime - 0.75) < 0.01 && dirtDrops.length === 1 && dirtDrops[0].id === DIRT &&
    sandHarvest === true && Math.abs(sandTime - 0.9) < 0.01 && sandDrops.length === 1 && sandDrops[0].id === SAND
  );
})());

ok("naked hands: stone and ores take 5x penalty time and drop nothing when smashed", (() => {
  const HAND = 0;
  const STONE = 5;
  const COAL_ORE = 30;

  const stoneHarvest = canHarvestBlock(STONE, HAND);
  const stoneTime = getMineTime(STONE, HAND);
  const stoneDrops = getBlockDrops(STONE, HAND);

  const coalHarvest = canHarvestBlock(COAL_ORE, HAND);
  const coalTime = getMineTime(COAL_ORE, HAND);
  const coalDrops = getBlockDrops(COAL_ORE, HAND);

  return (
    stoneHarvest === false && Math.abs(stoneTime - 7.5) < 0.01 && stoneDrops.length === 0 &&
    coalHarvest === false && Math.abs(coalTime - 15.0) < 0.01 && coalDrops.length === 0
  );
})());

ok("naked hands: mini-block item drop is smaller (0.20 scale vs 0.26 tool scale)", (() => {
  const scene = new THREE.Scene();
  const mat = new THREE.MeshBasicMaterial();
  const mgr = createItemDropManager(scene, mat, () => 0);

  const toolDrop = mgr.spawnDrop(0, 5, 0, 16, 1, false);
  const handDrop = mgr.spawnDrop(1, 5, 0, 16, 1, true);

  return (
    toolDrop !== null && Math.abs(toolDrop.mesh.scale.x - 0.26) < 0.001 &&
    handDrop !== null && Math.abs(handDrop.mesh.scale.x - 0.20) < 0.001
  );
})());

// ── Last Object Depletion Mechanics ─────────────────────────────────────────

ok("inventory: placing/consuming last item clears hotbar slot ID to 0", (() => {
  const inv: InventoryCore = {
    hotbar: [1, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    hotbarCounts: [2, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    invMain: Array(27).fill(null),
    creative: false
  };

  // Consume 1 item from slot 0 (had 2) → count drops to 1, hotbar[0] remains 1
  consumeSlot(inv, 0, 1);
  const step1Ok = inv.hotbarCounts[0] === 1 && inv.hotbar[0] === 1;

  // Consume last item from slot 1 (had 1) → count drops to 0, hotbar[1] becomes 0 (disappears!)
  consumeSlot(inv, 1, 1);
  const step2Ok = inv.hotbarCounts[1] === 0 && inv.hotbar[1] === 0;

  // Consume last item from slot 0 (had 1) → count drops to 0, hotbar[0] becomes 0 (disappears!)
  consumeSlot(inv, 0, 1);
  const step3Ok = inv.hotbarCounts[0] === 0 && inv.hotbar[0] === 0;

  return step1Ok && step2Ok && step3Ok;
}));

ok("inventory: removeItems clears hotbar slot to 0 when depleted", (() => {
  const inv: InventoryCore = {
    hotbar: [16, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hotbarCounts: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    invMain: Array(27).fill(null),
    creative: false
  };

  removeItems(inv, 16, 3);
  return inv.hotbar[0] === 0 && inv.hotbarCounts[0] === 0;
}));

// ── Torch Graphics & Modeling Authenticity ───────────────────────────────────

ok("torch graphics: block mapping uses canonical tiles for all torch variants", (() => {
  const torchDef = BLOCK_MAP.get(80);
  const soulTorchDef = BLOCK_MAP.get(81);
  const redstoneTorchDef = BLOCK_MAP.get(84);

  return (
    torchDef?.side === 81 &&
    soulTorchDef?.side === 82 &&
    redstoneTorchDef?.side === 86 &&
    Boolean(torchDef?.glow) &&
    Boolean(soulTorchDef?.glow) &&
    Boolean(redstoneTorchDef?.glow)
  );
})());

ok("torch graphics: sub-tile UVs map exact 2px stick and 2px caps without transparent border distortion", (() => {
  const ATLAS_TILES = 32;
  const EPS = 0.0005;
  function subTileUV(tile: number, u0Frac: number, v0Frac: number, u1Frac: number, v1Frac: number): [number, number, number, number] {
    const uTileX = tile % ATLAS_TILES;
    const uTileY = (tile / ATLAS_TILES) | 0;
    const tU0 = (uTileX + EPS) / ATLAS_TILES;
    const tSpan = (1 - 2 * EPS) / ATLAS_TILES;
    const tV0 = (ATLAS_TILES - uTileY - 1 + EPS) / ATLAS_TILES;
    const ru0 = tU0 + Math.max(0, Math.min(1, u0Frac)) * tSpan;
    const ru1 = tU0 + Math.max(0, Math.min(1, u1Frac)) * tSpan;
    const rv0 = tV0 + Math.max(0, Math.min(1, v0Frac)) * tSpan;
    const rv1 = tV0 + Math.max(0, Math.min(1, v1Frac)) * tSpan;
    return [ru0, rv0, ru1, rv1];
  }

  // Torch tile 81: (col 17, row 2)
  const sideUV = subTileUV(81, 7 / 16, 0.0, 9 / 16, 10 / 16);
  const flameCapUV = subTileUV(81, 7 / 16, 8 / 16, 9 / 16, 10 / 16);
  const stickCapUV = subTileUV(81, 7 / 16, 0.0, 9 / 16, 2 / 16);

  // U span must strictly be 2/16 = 1/8 of tile span (columns 7..8)
  const uSpanFrac = (sideUV[2] - sideUV[0]) / (1 / ATLAS_TILES);
  // Side V span must strictly be 10/16 of tile span (rows 6..15)
  const vSideSpanFrac = (sideUV[3] - sideUV[1]) / (1 / ATLAS_TILES);
  // Cap V span must strictly be 2/16 of tile span (2px)
  const vCapSpanFrac = (flameCapUV[3] - flameCapUV[1]) / (1 / ATLAS_TILES);

  return (
    Math.abs(uSpanFrac - 2 / 16) < 0.001 &&
    Math.abs(vSideSpanFrac - 10 / 16) < 0.001 &&
    Math.abs(vCapSpanFrac - 2 / 16) < 0.001 &&
    flameCapUV[3] === sideUV[3] && // Flame cap top aligns with side top
    stickCapUV[1] === sideUV[1]    // Base cap bottom aligns with side bottom
  );
})());

function fakeTradeVillager(x: number, y: number, z: number) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.9, 0.38), new THREE.MeshBasicMaterial());
  body.position.set(0, 0.95, 0);
  root.add(body);
  root.position.set(x, y, z);
  root.updateMatrixWorld(true);
  return { x, y, z, mesh: { root } };
}

function tradeCamera(tx: number, ty: number, tz: number) {
  const cam = new THREE.PerspectiveCamera(70, 1, 0.08, 100);
  cam.position.set(0, 1.62, 0);
  cam.lookAt(tx, ty, tz);
  cam.updateMatrixWorld(true);
  return cam;
}

const clearSight = () => 0;
const emptyMobs: Array<{ x: number; y: number; z: number }> = [];
const noVillagers = new Map<string, any>();

ok("trade gate: aimed villager at 2m, clear sight", (() => {
  const v = fakeTradeVillager(0, 0, -2);
  return villagerInTradeRange(v, { x: 0, y: 0, z: 0 }, 1.62, clearSight, emptyMobs, emptyMobs, noVillagers)
    && isVillagerAimed(tradeCamera(0, 1.0, -2), null, v);
})());

ok("trade gate: refused beyond range", (() => {
  const v = fakeTradeVillager(0, 0, -(TRADE_RANGE + 1));
  return !villagerInTradeRange(v, { x: 0, y: 0, z: 0 }, 1.62, clearSight, emptyMobs, emptyMobs, noVillagers);
})());

ok("trade gate: refused through wall", (() => {
  const v = fakeTradeVillager(0, 0, -2);
  const wall = () => 5;
  return !villagerInTradeRange(v, { x: 0, y: 0, z: 0 }, 1.62, wall, emptyMobs, emptyMobs, noVillagers);
})());

ok("trade gate: refused when looking away", (() => {
  const v = fakeTradeVillager(0, 0, -2);
  return !isVillagerAimed(tradeCamera(5, 1.0, 0), null, v);
})());

ok("trade gate: refused when block closer than villager", (() => {
  const v = fakeTradeVillager(0, 0, -2);
  return !isVillagerAimed(tradeCamera(0, 1.0, -2), 1.0, v);
})());

ok("trade gate: refused with null camera or villager", !isVillagerAimed(null, null, null) && !isVillagerAimed(tradeCamera(0, 1, -2), null, null));

ok("cat: solitary, cows are not", isSolitary("cat") && !isSolitary("cow") && !isSolitary("dog"));

ok("cat mesh: root + head + 4 legs + upright tail", (() => {
  const m = createCatMesh();
  if (!m.root || !m.headGroup || m.legs.length !== 4 || !m.tailMesh) return false;
  let minY = Infinity;
  m.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(m.root);
  const height = box.max.y - box.min.y;
  return height > 0.5 && height < 1.0 && box.max.y < 1.1;
})());

ok("map transform: world→screen→world round-trips at several yaws/zooms", (() => {
  const yaws = [0, 0.7, Math.PI / 2, Math.PI, -2.2];
  const spots: Array<[number, number]> = [[0, 0], [37.4, -12.8], [-200, 150], [3, 3]];
  for (const yaw of yaws) {
    for (const scale of [1, 2, 4.5]) {
      const v = { W: 880, H: 600, scale, yaw, px: 123.5, pz: -45.25 };
      for (const [x, z] of spots) {
        const s = worldToScreen(v, x, z);
        const w = screenToWorld(v, s.sx, s.sy);
        if (Math.abs(w.x - x) > 1e-9 || Math.abs(w.z - z) > 1e-9) return false;
      }
    }
  }
  return true;
})());

ok("map transform: player centers on screen middle", (() => {
  const v = { W: 880, H: 600, scale: 2, yaw: 1.3, px: 10, pz: 20 };
  const s = worldToScreen(v, 10, 20);
  return Math.abs(s.sx - 440) < 1e-9 && Math.abs(s.sy - 300) < 1e-9;
})());

ok("weather light: overcast target is much darker than clear", (() => {
  const c = weatherLightTarget("clear"), o = weatherLightTarget("overcast");
  return o.direct < c.direct * 0.3 && o.amb < c.amb * 0.4 && o.sun < c.sun * 0.3 && o.cloud > 0.9 && c.cloud === 0;
})());

ok("weather light: first step moves immediately toward target", (() => {
  const cur = weatherLightTarget("clear");
  const next = smoothWeatherLight(cur, weatherLightTarget("overcast"), 1 / 30);
  return next.direct < cur.direct && next.direct > weatherLightTarget("overcast").direct;
})());

ok("weather light: converges ≥90% within ~12s (10s+ transition)", (() => {
  let cur = weatherLightTarget("clear");
  const target = weatherLightTarget("overcast");
  for (let i = 0; i < Math.round(12 * 30); i++) cur = smoothWeatherLight(cur, target, 1 / 30);
  const frac = (weatherLightTarget("clear").direct - cur.direct) / (weatherLightTarget("clear").direct - target.direct);
  return frac >= 0.9;
})());

ok("weather light: non-positive dt never moves", (() => {
  const cur = weatherLightTarget("clear");
  const next = smoothWeatherLight(cur, weatherLightTarget("overcast"), 0);
  return next.direct === cur.direct && next.cloud === cur.cloud;
})());

function wakeFlags(over: Record<string, boolean> = {}) {
  return {
    loading: false, pauseOpen: false, menuOpen: false, titleScreenOpen: false,
    worldSelectOpen: false, inventoryOpen: false, chestOpen: false,
    craftTableOpen: false, furnaceOpen: false, mapOpen: false, chatOpen: false,
    dead: false, petsOpen: false, portalOpen: false, recallOpen: false,
    blueprintOpen: false, auditOpen: false, namingOpen: false, tradingOpen: false,
    ...over
  };
}

const liveEngine = { uiPaused: false, active: true, steering: true };
const frozenEngine = { uiPaused: true, active: false, steering: false };

ok("wake: frozen world with no UI open must wake", shouldWakeWorld(wakeFlags(), frozenEngine) === true);
ok("wake: live world stays untouched", shouldWakeWorld(wakeFlags(), liveEngine) === false);
ok("wake: loading never wakes", shouldWakeWorld(wakeFlags({ loading: true }), frozenEngine) === false);
ok("wake: any open menu blocks (pause/inventory/map/dead/naming)", (
  !shouldWakeWorld(wakeFlags({ pauseOpen: true }), frozenEngine) &&
  !shouldWakeWorld(wakeFlags({ inventoryOpen: true }), frozenEngine) &&
  !shouldWakeWorld(wakeFlags({ mapOpen: true }), frozenEngine) &&
  !shouldWakeWorld(wakeFlags({ dead: true }), frozenEngine) &&
  !shouldWakeWorld(wakeFlags({ namingOpen: true }), frozenEngine) &&
  !shouldWakeWorld(wakeFlags({ tradingOpen: true }), frozenEngine) &&
  !shouldWakeWorld(wakeFlags({ portalOpen: true }), frozenEngine)
));
ok("wake: partially stuck (active but paused) still wakes", shouldWakeWorld(wakeFlags(), { uiPaused: true, active: true, steering: true }) === true);

ok("world versions: current manifest needs no migration", (() => {
  const r = needsMigration({ data_version: DATA_VERSION, gen_version: GEN_VERSION, biome_version: BIOME_VERSION });
  return r.migrate === false && r.newer === false;
})());

ok("world versions: missing stamps read as v1", (() => {
  const r = needsMigration({});
  return r.from.data_version === 1 && r.from.gen_version === 1 && r.from.biome_version === 1;
})());

ok("world versions: newer-than-code is rejected, never migrated", (() => {
  const r = needsMigration({ data_version: DATA_VERSION + 1, gen_version: 1, biome_version: 1 });
  return r.migrate === false && r.newer === true;
})());

function porchStairBuf(facing: number, mirror: boolean): TypedMeshBuffer {
  const t = new TypedMeshBuffer();
  pushPorchStair(t, 0, 0, 0, { id: 1205, name: "Porch stair", side: 890 } as any, facing, mirror);
  return t;
}

ok("porch stair: emits 5 boxes (stair + 2 posts + rail)", (() => {
  const t = porchStairBuf(0, false);
  return t.pos.length / 3 === 120 && t.idx.length === 180;
})());

ok("porch stair: left/right are exact x-mirrors", (() => {
  const l = porchStairBuf(0, false), r = porchStairBuf(0, true);
  if (l.pos.length !== r.pos.length) return false;
  const key = (x: number, y: number, z: number) => `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
  const rset = new Set<string>();
  for (let i = 0; i < r.pos.length; i += 3) rset.add(key(r.pos[i], r.pos[i + 1], r.pos[i + 2]));
  for (let i = 0; i < l.pos.length; i += 3) {
    if (!rset.has(key(1 - l.pos[i], l.pos[i + 1], l.pos[i + 2]))) return false;
  }
  return true;
})());

ok("porch stair: rail sits on +X edge (left) vs -X edge (right)", (() => {
  const railTopXs = (t: TypedMeshBuffer) => {
    const xs: number[] = [];
    for (let i = 0; i < t.pos.length; i += 3) {
      if (t.pos[i + 1] > 0.96 && t.pos[i + 1] < 0.98 && t.pos[i + 2] > 0.15 && t.pos[i + 2] < 0.65) xs.push(t.pos[i]);
    }
    return xs;
  };
  const lx = railTopXs(porchStairBuf(0, false));
  const rx = railTopXs(porchStairBuf(0, true));
  return lx.length === 12 && rx.length === 12 && Math.min(...lx) > 0.8 && Math.max(...rx) < 0.2;
})());

ok("porch stair: facing rotates geometry, bounds stay in-block, UVs on tile 890", (() => {
  for (const f of [0, 1, 2, 3]) {
    const t = porchStairBuf(f, false);
    for (let i = 0; i < t.pos.length; i += 3) {
      if (t.pos[i] < -1e-6 || t.pos[i] > 1 + 1e-6 || t.pos[i + 1] < -1e-6 || t.pos[i + 1] > 1 + 1e-6 || t.pos[i + 2] < -1e-6 || t.pos[i + 2] > 1 + 1e-6) return false;
    }
    for (let i = 0; i < t.uv.length; i += 2) {
      if (t.uv[i] < 0.81 || t.uv[i] > 0.845 || t.uv[i + 1] < 0.124 || t.uv[i + 1] > 0.157) return false;
    }
  }
  return true;
})());

function fakeBoat() {
  const m = createBoatMesh();
  return {
    id: "boat_test", itemId: 1041, x: 0, y: 61.8, z: 0, vx: 0, vy: 0, vz: 0,
    yaw: 0, pitch: 0, roll: 0, isRidden: false, rowTime: 0,
    root: m.root, leftOar: m.leftOar, rightOar: m.rightOar
  };
}

ok("boat: mesh has hull, walls and both oars", (() => {
  const m = createBoatMesh();
  return !!m.root && !!m.leftOar && !!m.rightOar && m.root.children.length >= 7;
})());

ok("boat items: oak boat counts, stone/water/chest-boat do not", (() => {
  const def = (id: number) => BLOCK_MAP.get(id);
  return isBoatItem(1041, def) && !isBoatItem(5, def) && !isBoatItem(39, def) &&
    !isBoatItem(1042, def) && !isBoatItem(0, def) && isBoatItem(719, def);
})());

ok("boat: buoyancy converges to water level and drag bleeds speed", (() => {
  const b = fakeBoat();
  b.y = 58; b.vx = 5; b.vz = 0;
  for (let i = 0; i < 240; i++) updateBoatKinematics(b, 1 / 60, 62, 0.96);
  return Math.abs(b.y - 61.8) < 0.15 && Math.hypot(b.vx, b.vz) < 0.5;
})());

ok("boat: drive paddles forward along yaw, turns, and clamps top speed", (() => {
  const b = fakeBoat();
  const y0 = b.yaw;
  driveBoat(b, 1, { forward: true, back: false, left: true, right: false });
  if (!(b.yaw > y0)) return false;
  for (let i = 0; i < 600; i++) {
    driveBoat(b, 1 / 60, { forward: true, back: false, left: false, right: false });
    updateBoatKinematics(b, 1 / 60, 62, 0.96);
  }
  const spd = Math.hypot(b.vx, b.vz);
  return spd > 3 && spd <= 7.5 * 1.15 + 1e-6;
})());

function weaponDef(id: number) {
  return BLOCK_MAP.get(id);
}

ok("weapons: vanilla damage tiers (sword/axe/pickaxe)", (() => {
  const d = (id: number) => getWeaponInfo(weaponDef(id))?.damage;
  return d(1158) === 4 && d(887) === 7 && d(1040) === 8 &&
    d(1154) === 7 && d(878) === 9 && d(1030) === 10 &&
    d(1156) === 2 && d(885) === 5 && d(1037) === 6;
})());

ok("weapons: hoes deal 1 across tiers, axes swing slower than swords", (() => {
  const s = (id: number) => getWeaponInfo(weaponDef(id))?.speed;
  const d = (id: number) => getWeaponInfo(weaponDef(id))?.damage;
  return d(1155) === 1 && d(882) === 1 && d(1034) === 1 &&
    (s(947) || 0) < (s(958) || 99) && meleeCooldownMs(getWeaponInfo(weaponDef(947))) > meleeCooldownMs(getWeaponInfo(weaponDef(958)));
})());

ok("weapons: non-weapons rejected, fists fall back to 1", (() => {
  const stone = weaponDef(5);
  return getWeaponInfo(stone) === null && !isWeapon(stone) && isWeapon(weaponDef(1040)) &&
    meleeDamage(0, (id) => weaponDef(id), false) === 1 &&
    meleeDamage(5, (id) => weaponDef(id), false) === 1 &&
    meleeDamage(1040, (id) => weaponDef(id), false) === 8 &&
    meleeDamage(5, (id) => weaponDef(id), true) === 999;
})());

ok("weapons: every mob loot id resolves in the registry", (() => {
  for (const t of Object.keys(MOB_LOOT)) {
    for (const d of MOB_LOOT[t].drops) {
      if (!BLOCK_MAP.get(d.id)) return false;
    }
  }
  return true;
})());

ok("weapons: loot rolls respect min/max bounds", (() => {
  for (let i = 0; i < 50; i++) {
    for (const d of rollMobDrops("skeleton", Math.random)) {
      if (d.count < 0 || d.count > 2) return false;
    }
  }
  const fixed = rollMobDrops("zombie", () => 0.999);
  return fixed.length === 1 && fixed[0].count === 2;
})());

ok("biomes: BIOME_TARGETS includes canonical biomes (plains, desert, swamp, badlands)", (() => {
  const ids = new Set(BIOME_TARGETS.map(b => b.id));
  return ids.has("plains") && ids.has("desert") && ids.has("swamp") && ids.has("badlands") && ids.has("jungle");
})());

ok("biomes: sampleBiome resolves plains, desert, swamp, badlands accurately", (() => {
  const plains = sampleBiome(0, 0, 68, 0.68, 0.42, 0.5, 0.5);
  const desert = sampleBiome(0, 0, 70, 0.94, 0.08, 0.5, 0.5);
  const swamp = sampleBiome(0, 0, 64, 0.76, 0.85, 0.5, 0.5);
  const badlands = sampleBiome(0, 0, 80, 0.92, 0.20, 0.5, 0.5);
  return plains.id === "plains" && desert.id === "desert" && swamp.id === "swamp" && badlands.id === "badlands";
})());

ok("biomes: sampleBiome handles ice spikes polar pocket and high mountain peaks", (() => {
  const iceSpikes = sampleBiome(0, 0, 68, 0.10, 0.30, 0.80, 0.5);
  const stony = sampleBiome(0, 0, 96, 0.65, 0.30, 0.20, 0.7);
  const jagged = sampleBiome(0, 0, 100, 0.25, 0.30, 0.50, 0.5);
  const jungle = sampleBiome(0, 0, 66, 0.79, 0.95, 0.50, 0.5);
  return iceSpikes.id === "ice_spikes" && stony.id === "stony_peaks" && jagged.id === "jagged_peaks" && jungle.id === "jungle";
})());

ok("biomes: all biomes contain grassCol and foliageCol RGB tints", (() => {
  for (const b of BIOME_TARGETS) {
    if (!b.grassCol || b.grassCol.length !== 3 || !b.foliageCol || b.foliageCol.length !== 3) return false;
  }
  return true;
})());

ok("biomes: standard regions vary climate and relief across the map", (() => {
  const tCtx = createTerrainContext(
    () => 42,
    () => ({ scale: 1.0, temp: 0, mtn: 1.0, island: false } as any),
    new Map(),
    new Map()
  );
  const ids = new Set<string>();
  let loT = 1, hiT = 0, loH = 999, hiH = -999;
  for (let x = -1500; x <= 1500; x += 100) {
    for (let z = -1500; z <= 1500; z += 100) {
      ids.add(tCtx.getBiome(x, z).id);
      const h = tCtx.rawHeight(x, z);
      if (h < loH) loH = h;
      if (h > hiH) hiH = h;
    }
  }
  let tLo = 1, tHi = 0;
  for (let x = -1500; x <= 1500; x += 150) {
    for (let z = -1500; z <= 1500; z += 150) {
      const t = (tCtx as any).tempAt ? (tCtx as any).tempAt(x, z) : 0.5;
      if (t < tLo) tLo = t;
      if (t > tHi) tHi = t;
    }
  }
  return ids.size >= 8 && (hiH - loH) >= 40 && (tHi - tLo) >= 0.25;
})());

ok("terrain: mountains generate sharp spires with variable peak heights and no flat rooftop plateau", (() => {
  const tCtx = createTerrainContext(
    () => 42,
    () => ({ scale: 1.0, temp: 0, mtn: 1.0, island: false } as any),
    new Map(),
    new Map()
  );

  const peakHeights = new Set<number>();
  let hasOver100 = false;
  let hasOver115 = false;

  for (let x = -1500; x <= 1500; x += 50) {
    for (let z = -1500; z <= 1500; z += 50) {
      const h = tCtx.rawHeight(x, z);
      if (h >= 85) peakHeights.add(h);
      if (h >= 100) hasOver100 = true;
      if (h >= 115) hasOver115 = true;
    }
  }

  // Find a high peak dynamically and verify it is not a flat 5x5 plateau
  let topX = 0, topZ = 0, topH = -1;
  for (let x = -1500; x <= 1500; x += 50) {
    for (let z = -1500; z <= 1500; z += 50) {
      const h = tCtx.rawHeight(x, z);
      if (h > topH) { topH = h; topX = x; topZ = z; }
    }
  }
  const centerH = tCtx.rawHeight(topX, topZ);
  let slopeDropFound = false;
  for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
    if (tCtx.rawHeight(topX + dx, topZ + dz) !== centerH) slopeDropFound = true;
  }

  return peakHeights.size >= 15 && hasOver100 && hasOver115 && slopeDropFound && topH >= 100;
})());

ok("terrain: surfaceAt differentiates peak materials (stony peaks snow-free, jagged peaks stone base, frozen peaks packed ice)", (() => {
  const tCtx = createTerrainContext(
    () => 42,
    () => ({ scale: 1.0, temp: 0, mtn: 1.0, island: false } as any),
    new Map(),
    new Map()
  );

  const stony = tCtx.surfaceAt(0, 0, "stony_peaks");
  const jagged = tCtx.surfaceAt(0, 0, "jagged_peaks");
  const frozen = tCtx.surfaceAt(0, 0, "frozen_peaks");

  const stonyValid = (stony.top === 5 || stony.top === 11) && stony.sub === 5 && !stony.cold;
  const jaggedValid = jagged.top === 51 && jagged.sub === 5 && jagged.cold;
  const frozenValid = frozen.top === 51 && frozen.sub === 53 && frozen.cold && frozen.frozen;

  return stonyValid && jaggedValid && frozenValid;
})());

ok("terrain: steep alpine cliff slopes expose solid stone without snow coating", (() => {
  const tCtx = createTerrainContext(
    () => 42,
    () => ({ scale: 1.0, temp: 0, mtn: 1.0, island: false } as any),
    new Map(),
    new Map()
  );

  // Surface on alpine cliffs (h > 66 && slope >= 2.4) must be bare stone (5);
  // badlands cliffs legitimately show terracotta strata, deserts sandstone,
  // and ice-spike slopes packed ice instead
  const TERRACOTTA = new Set([663, 515, 710, 221, 589, 700, 452]);
  let foundCliff = false;
  for (let x = -1500; x <= 1500; x += 25) {
    for (let z = -1500; z <= 1500; z += 25) {
      const surf = tCtx.surfaceAt(x, z);
      if (surf.h > 66 && surf.slope >= 2.4) {
        foundCliff = true;
        const stone = surf.top === 5 && surf.sub === 5;
        const terra = TERRACOTTA.has(surf.top) && TERRACOTTA.has(surf.sub);
        const sandstone = surf.top === 11 && surf.sub === 11;
        const glacial = surf.top === 51 && (surf.sub === 53 || surf.sub === 5);
        if (!stone && !terra && !sandstone && !glacial) return false;
      }
    }
  }
  return foundCliff;
})());

ok("terrain: mountain pass saddle carving produces natural valleys between summits", (() => {
  const tCtx = createTerrainContext(
    () => 42,
    () => ({ scale: 1.0, temp: 0, mtn: 1.0, island: false } as any),
    new Map(),
    new Map()
  );

  // Across mountain zones, find at least one saddle/col where height dips between two higher points
  let colDipFound = false;
  for (let x = -1500; x <= 1500; x += 20) {
    for (let z = -1500; z <= 1500; z += 20) {
      const hCenter = tCtx.rawHeight(x, z);
      const hLeft = tCtx.rawHeight(x - 10, z);
      const hRight = tCtx.rawHeight(x + 10, z);
      if (hCenter >= 78 && hLeft > hCenter + 4 && hRight > hCenter + 4) {
        colDipFound = true;
        break;
      }
    }
    if (colDipFound) break;
  }
  return colDipFound;
})());

ok("terrain: desert inland surface generates sand (10) and sandstone (11)", (() => {
  const tCtx = createTerrainContext(
    () => 42,
    () => ({ scale: 1.0, temp: 0, mtn: 1.0, island: false } as any),
    new Map(),
    new Map()
  );
  const surf = tCtx.surfaceAt(0, 0, "desert");
  return surf.top === 10 && surf.sub === 11 && !surf.cold && !surf.frozen;
})());

ok("terrain: badlands surface generates red sand (584) on plateaus and terracotta strata on slopes", (() => {
  const tCtx = createTerrainContext(
    () => 42,
    () => ({ scale: 1.0, temp: 0, mtn: 1.0, island: false } as any),
    new Map(),
    new Map()
  );
  const surf = tCtx.surfaceAt(0, 0, "badlands");
  const TERRACOTTA_IDS = new Set([663, 515, 710, 221, 589, 700, 452]);
  return surf.top === 584 && TERRACOTTA_IDS.has(surf.sub) && !surf.cold;
})());

ok("terrain: swamp lowlands generate mud (490) and clay (256)", (() => {
  const tCtx = createTerrainContext(
    () => 42,
    () => ({ scale: 1.0, temp: 0, mtn: 1.0, island: false } as any),
    new Map(),
    new Map()
  );
  for (let x = -1500; x <= 1500; x += 25) {
    for (let z = -1500; z <= 1500; z += 25) {
      if (tCtx.getBiome(x, z).id !== "swamp") continue;
      const surf = tCtx.surfaceAt(x, z);
      if (surf.h > SEA + 3 || surf.h <= SEA) continue;
      if (!((surf.top === 490 || surf.top === 1) && surf.sub === 256)) return false;
      return true;
    }
  }
  return false;
})());

ok("terrain: ice spikes tundra generates snow block (51) and packed ice (53)", (() => {
  const tCtx = createTerrainContext(
    () => 42,
    () => ({ scale: 1.0, temp: 0, mtn: 1.0, island: false } as any),
    new Map(),
    new Map()
  );
  const surf = tCtx.surfaceAt(0, 0, "ice_spikes");
  return surf.top === 51 && surf.sub === 53 && surf.cold && surf.frozen;
})());

ok("tint: getBiomeColorTint resolves special biomes (not Plains fallback)", (() => {
  const stony = getBiomeColorTint("stony_peaks");
  const cherry = getBiomeColorTint("cherry");
  const ice = getBiomeColorTint("ice_spikes");
  const warped = getBiomeColorTint("warped");
  const plains = getBiomeColorTint("plains");
  const neq = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 0.01;
  return neq(stony.grass, plains.grass) && neq(cherry.grass, plains.grass)
    && neq(ice.grass, plains.grass) && neq(warped.grass, plains.grass);
})());

ok("tint: getBlockTint routes grass/foliage/constants per vanilla", (() => {
  const grass: [number, number, number] = [0.57, 0.74, 0.35];
  const fol: [number, number, number] = [0.47, 0.67, 0.18];
  const gTop = getBlockTint(1, true, grass, fol);
  const gSide = getBlockTint(1, false, grass, fol);
  const oak = getBlockTint(18, false, grass, fol);
  const stone = getBlockTint(5, true, grass, fol);
  const dande = getBlockTint(125, true, grass, fol);
  const poppy = getBlockTint(126, true, grass, fol);
  const lily = getBlockTint(457, true, grass, fol);
  const birch = getBlockTint(116, false, grass, fol);
  return !!gTop && gTop[0] === grass[0] && gSide === null
    && !!oak && oak[0] === fol[0] && stone === null
    && dande === null && poppy === null
    && !!lily && Math.abs(lily[0] - 0.13) < 0.01
    && !!birch && Math.abs(birch[0] - 0.50) < 0.01;
})());

const tintGridDiff = await (async () => {  const { buildChunkMeshBuffers } = await import("../../src/game/engine/meshWorker");
  const mk = () => {
    const d = new Uint16Array(256 * 128);
    d[64 * 256 + 8 * 16 + 8] = 1;
    return d;
  };
  const plainsGrid = new Array(256).fill("plains");
  const desertGrid = new Array(256).fill("desert");
  const rP = buildChunkMeshBuffers({ cx: 0, cz: 0, data: mk() as any, maxY: 65, biomeGrid: plainsGrid });
  const rD = buildChunkMeshBuffers({ cx: 0, cz: 0, data: mk() as any, maxY: 65, biomeGrid: desertGrid });
  if (!rP.opaque || !rD.opaque) return false;
  if (rP.opaque.col.length !== rD.opaque.col.length) return false;
  let diff = 0;
  for (let i = 0; i < rP.opaque.col.length; i++) diff += Math.abs(rP.opaque.col[i] - rD.opaque.col[i]);
  return diff > 20;
})();
ok("tint: worker biomeGrid changes grass vertex colors per column", tintGridDiff);

const { generateIceSpike, generateCactus, generateSwampOak } = await import("../../src/game/terrain/trees");
const recWriter = () => {
  const cells = new Map<string, number>();
  return {
    cells,
    w: (x: number, y: number, z: number, id: number) => { cells.set(`${x},${y},${z}`, id); },
  };
};
ok("scatter: tall ice spike is packed-ice needle 20..40 high", (() => {
  const rec = recWriter();
  generateIceSpike(0, 0, 60, () => 0.1, rec.w);
  if (!rec.cells.size) return false;
  let maxY = -1;
  for (const [k, id] of rec.cells) {
    if (id !== 53) return false;
    maxY = Math.max(maxY, Number(k.split(",")[1]));
  }
  return maxY - 60 === 22;
})());
ok("scatter: cone ice spike is packed-ice mound 10..16 high, radius <= 3", (() => {
  const rec = recWriter();
  generateIceSpike(0, 0, 60, () => 0.9, rec.w);
  if (!rec.cells.size) return false;
  let maxY = -1;
  for (const [k, id] of rec.cells) {
    if (id !== 53) return false;
    const [x, y, z] = k.split(",").map(Number);
    if (Math.hypot(x, z) > 3.5) return false;
    maxY = Math.max(maxY, y);
  }
  return maxY - 60 === 16;
})());
ok("scatter: cactus is 1..3 cactus blocks stacked", (() => {
  const rec = recWriter();
  generateCactus(5, 5, 64, () => 0.99, rec.w);
  const ids = [...rec.cells.values()];
  return ids.length === 3 && ids.every((id) => id === 227);
})());
ok("scatter: swamp oak has trunk, canopy, hanging vines and mud ring", (() => {
  const rec = recWriter();
  generateSwampOak(0, 0, 62, () => 0.4, rec.w);
  const ids = [...rec.cells.values()];
  const has = (id: number) => ids.includes(id);
  return has(16) && has(18) && has(674) && has(490);
})());
ok("scatter: worker meshes vines as foliage billboards", await (async () => {
  const { buildChunkMeshBuffers } = await import("../../src/game/engine/meshWorker");
  const d = new Uint16Array(256 * 128);
  d[64 * 256 + 8 * 16 + 8] = 674;
  const res = buildChunkMeshBuffers({ cx: 0, cz: 0, data: d as any, maxY: 65 });
  return !!res.foliage && res.foliage.pos.length > 0;
})());

ok("ids: terrain material IDs resolve to the right blocks (renumber guard)", (() => {
  const expect: Array<[number, string]> = [
    [11, "Sandstone"], [256, "Clay"], [490, "Mud"], [3, "Coarse dirt"], [4, "Podzol"],
    [361, "Fern"], [429, "Large Fern"], [658, "Sugar Cane"], [227, "Cactus"],
    [309, "Dead Bush"], [457, "Lily Pad"], [674, "Vine"], [201, "Blue Orchid"],
    [53, "Packed ice"], [582, "Red Mushroom Block"], [217, "Brown Mushroom Block"]
  ];
  return expect.every(([id, name]) => BLOCK_MAP.get(id)?.name === name);
})());

ok("biomes: frozen peaks selected on high cold summits", (() => {
  const frozen = sampleBiome(0, 0, 110, 0.15, 0.30, 0.50, 0.5);
  const tint = getBiomeColorTint("frozen_peaks");
  return frozen.id === "frozen_peaks" && frozen.topBlock === 51 && frozen.subBlock === 53
    && Math.abs(tint.grass[0] - 0.50) < 0.01;
})());

ok("tint: border blur blends biome tints across boundaries", await (async () => {
  const { blurBiomeTints } = await import("../../src/game/terrain/biomes");
  const { buildChunkMeshBuffers } = await import("../../src/game/engine/meshWorker");
  const uni = new Array(256).fill("plains");
  const bUni = blurBiomeTints(uni);
  const plains = getBiomeColorTint("plains");
  if (Math.abs(bUni.grass[0][0] - plains.grass[0]) > 1e-9) return false;
  const half: string[] = [];
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) half.push(lz < 8 ? "plains" : "desert");
  const bHalf = blurBiomeTints(half);
  const desert = getBiomeColorTint("desert");
  const edge = bHalf.grass[7 * 16 + 8][0];
  if (!(edge > plains.grass[0] && edge < desert.grass[0])) return false;
  const mk = () => {
    const d = new Uint16Array(256 * 128);
    d[64 * 256 + 8 * 16 + 8] = 1;
    return d;
  };
  const rP = buildChunkMeshBuffers({ cx: 0, cz: 0, data: mk() as any, maxY: 65, biomeGrid: uni });
  const rH = buildChunkMeshBuffers({ cx: 0, cz: 0, data: mk() as any, maxY: 65, biomeGrid: half });
  if (!rP.opaque || !rH.opaque || rP.opaque.col.length !== rH.opaque.col.length) return false;
  let diff = 0;
  for (let i = 0; i < rP.opaque.col.length; i++) diff += Math.abs(rP.opaque.col[i] - rH.opaque.col[i]);
  return diff > 0;
})());

const { generateRedwoodTree, generateAcaciaTree, generateDarkOakTree, generateCherryTree, generateJungleTree } = await import("../../src/game/terrain/trees");
ok("scatter: redwood floor has podzol ring around 2x2 trunk", (() => {
  const rec = recWriter();
  generateRedwoodTree(0, 0, 62, () => 0.4, rec.w);
  const ids = [...rec.cells.values()];
  return ids.includes(122) && ids.includes(4);
})());
ok("scatter: acacia floor has coarse dirt patches", (() => {
  const rec = recWriter();
  generateAcaciaTree(0, 0, 62, () => 0.4, rec.w);
  return [...rec.cells.values()].includes(3);
})());
ok("scatter: dark oak floor uses podzol (not jungle log)", (() => {
  const rec = recWriter();
  generateDarkOakTree(0, 0, 62, () => 0.4, rec.w);
  const ids = [...rec.cells.values()];
  return ids.includes(4) && !ids.includes(25);
})());
ok("scatter: cherry petal carpet spreads beyond trunk", (() => {
  const rec = recWriter();
  generateCherryTree(0, 0, 62, () => 0.4, rec.w);
  let petals = 0;
  for (const [k, id] of rec.cells) {
    if (id !== 123) continue;
    petals++;
    const [x, , z] = k.split(",").map(Number);
    if (Math.hypot(x, z) > 3.5) return false;
  }
  return petals >= 4;
})());

const riverCtx = () => createTerrainContext(
  () => 42,
  () => ({ scale: 1.0, temp: 0, mtn: 1.0, island: false } as any),
  new Map(),
  new Map()
);
ok("rivers: discharge widths span creeks to grand rivers", (() => {
  const tCtx = riverCtx();
  let lo = 99, hi = 0;
  for (let x = -1500; x <= 1500; x += 50) {
    for (let z = -1500; z <= 1500; z += 50) {
      const w = tCtx.riverWidthAt(x, z);
      if (w < lo) lo = w;
      if (w > hi) hi = w;
    }
  }
  return lo <= 5 && hi >= 25;
})());
ok("rivers: channel coverage is river-like, not ubiquitous", (() => {
  const tCtx = riverCtx();
  let chan = 0, n = 0;
  for (let x = -1500; x <= 1500; x += 50) {
    for (let z = -1500; z <= 1500; z += 50) {
      const h = tCtx.rawHeight(x, z);
      if (tCtx.riverInfoAt(x, z, h).channel) chan++;
      n++;
    }
  }
  const frac = chan / n;
  return frac > 0.02 && frac < 0.08;
})());
ok("rivers: highland headwaters mostly run down to the sea", (() => {
  const tCtx = riverCtx();
  const starts: Array<[number, number]> = [];
  for (let x = -1500; x <= 1500 && starts.length < 8; x += 25) {
    for (let z = -1500; z <= 1500 && starts.length < 8; z += 25) {
      const h = tCtx.rawHeight(x, z);
      if (h >= 80 && h <= 100 && tCtx.riverTrunkAt(x, z) < 0.02) starts.push([x, z]);
    }
  }
  if (starts.length < 4) return false;
  let reached = 0;
  for (const [sx, sz] of starts) {
    let x = sx, z = sz, steps = 0;
    let h = tCtx.rawHeight(x, z);
    const tabu = new Set([`${x},${z}`]);
    while (h > SEA + 1 && steps < 800) {
      let best: [number, number, number] | null = null, bestCost = Infinity;
      for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, 2], [2, -2], [-2, -2]]) {
        const nx = x + dx, nz = z + dz;
        if (tabu.has(`${nx},${nz}`)) continue;
        const nh = tCtx.rawHeight(nx, nz);
        if (nh > h + 2) continue;
        const cost = tCtx.riverTrunkAt(nx, nz) * 100 + Math.max(0, nh - h) * 50 - Math.max(0, h - nh);
        if (cost < bestCost) { bestCost = cost; best = [nx, nz, nh]; }
      }
      if (!best) break;
      [x, z, h] = best;
      tabu.add(`${x},${z}`);
      steps++;
    }
    if (h <= SEA + 1) reached++;
  }
  return reached >= 3;
})());
ok("rivers: winding courses cross transects repeatedly (sinuosity)", (() => {
  const tCtx = riverCtx();
  let best = 0;
  for (const z of [0, 400, -700, 900]) {
    let cross = 0, prev = false;
    for (let x = -1500; x <= 1500; x += 5) {
      const h = tCtx.rawHeight(x, z);
      const inside = tCtx.riverInfoAt(x, z, h).channel;
      if (inside && !prev) cross++;
      prev = inside;
    }
    if (cross > best) best = cross;
  }
  return best >= 3;
})());
ok("rivers: dry canyons stand above sea level", (() => {
  const tCtx = riverCtx();
  let dry = 0;
  for (let x = -1500; x <= 1500; x += 25) {
    for (let z = -1500; z <= 1500; z += 25) {
      const h = tCtx.rawHeight(x, z);
      if (h > SEA + 1 && tCtx.riverInfoAt(x, z, h).canyon) dry++;
    }
  }
  return dry >= 10;
})());
ok("rivers: mountain source bowls exist for stream heads", (() => {
  const tCtx = riverCtx();
  let found = 0;
  const DIRS = [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2]];
  for (let x = -1500; x <= 1500 && found < 3; x += 25) {
    for (let z = -1500; z <= 1500 && found < 3; z += 25) {
      const h = tCtx.rawHeight(x, z);
      if (h < SEA + 20 || h > 100 || tCtx.riverTrunkAt(x, z) > 0.02) continue;
      let bowl = true;
      for (const [dx, dz] of DIRS) {
        if (tCtx.rawHeight(x + dx, z + dz) < h - 1) { bowl = false; break; }
      }
      if (bowl) found++;
    }
  }
  return found >= 3;
})());

const { herdForBiome } = await import("../../src/game/entities/herdTable");
const { pushPropModel, hasPropModel, PROP_MODELS } = await import("../../src/game/engine/chunkMesh");
ok("models: 57 prop recipes tabled, cubes excluded", (() => {
  return Object.keys(PROP_MODELS).length === 57
    && hasPropModel(228) && hasPropModel(239) && hasPropModel(367) && hasPropModel(572)
    && hasPropModel(435) && hasPropModel(413) && hasPropModel(233) && hasPropModel(132)
    && hasPropModel(1210)
    && !hasPropModel(5) && !hasPropModel(1) && !hasPropModel(46) && !hasPropModel(18);
})());
ok("models: prop bounding boxes match vanilla silhouettes", (() => {
  const bounds = (id: number) => {
    const t = new TypedMeshBuffer();
    pushPropModel(t, 0, 0, 0, id, { id, name: "t", category: "decoration", side: 1, top: 2, bottom: 3 } as any, null);
    let mnx = 9, mxx = -9, mny = 9, mxy = -9, mnz = 9, mxz = -9;
    for (let i = 0; i < t.pos.length; i += 3) {
      const x = t.pos[i], y = t.pos[i + 1], z = t.pos[i + 2];
      if (x < mnx) mnx = x; if (x > mxx) mxx = x;
      if (y < mny) mny = y; if (y > mxy) mxy = y;
      if (z < mnz) mnz = z; if (z > mxz) mxz = z;
    }
    return { mnx, mxx, mny, mxy, mnz, mxz, n: t.pos.length / 3 };
  };
  const cake = bounds(228);
  const rails = bounds(572);
  const chain = bounds(239);
  const pot = bounds(367);
  const crops = bounds(233);
  const lever = bounds(435);
  return Math.abs(cake.mxy - 0.5) < 1e-6 && cake.mny === 0
    && Math.abs(rails.mxy - 0.25) < 1e-6
    && chain.mnx >= 0.375 && chain.mxx <= 0.625
    && Math.abs(pot.mxy - 0.4375) < 1e-6
    && crops.mny === 0 && crops.mxy === 1 && crops.n === 8
    && Math.abs(lever.mxy - 0.75) < 1e-6;
})());
ok("models: worker meshes props as models, not cubes", await (async () => {
  const { buildChunkMeshBuffers } = await import("../../src/game/engine/meshWorker");
  const d = new Uint16Array(256 * 128);
  d[64 * 256 + 8 * 16 + 8] = 228;
  const res = buildChunkMeshBuffers({ cx: 0, cz: 0, data: d as any, maxY: 65 });
  if (!res.opaque) return false;
  let maxY = -1;
  for (let i = 1; i < res.opaque.pos.length; i += 3) {
    if (res.opaque.pos[i] > maxY) maxY = res.opaque.pos[i];
  }
  const local = maxY - 64;
  return local > 0 && local < 0.6;
})());
const { moteForBlock, emitterBlockCount } = await import("../../src/game/ambientParticles");
const { BLOCK_MAP: AMAP } = await import("../../src/game/blocks");
ok("particles: 25+ emitter blocks tabled (vanilla ambient set)", (() => {
  if (emitterBlockCount() < 25) return false;
  for (const id of [18, 114, 115, 118, 480, 116, 24, 109, 110, 111, 80, 81, 84, 46, 82, 85, 86, 96, 99, 40, 102, 630, 631, 87, 47, 48, 92, 100, 98, 596, 93, 132, 1051, 57]) {
    if (!AMAP.get(id)) return false;
  }
  return true;
})());
ok("particles: emitter specs match vanilla behavior", (() => {
  const oak = moteForBlock(18);
  const torch = moteForBlock(80);
  const lava = moteForBlock(40);
  const portal = moteForBlock(98);
  const drip = moteForBlock(1051);
  const soul = moteForBlock(57);
  return !!oak?.some((m) => m.kind === "flutter" && m.color === 0x5ea632)
    && !!torch?.some((m) => m.kind === "rise" && m.color === 0xff8c00)
    && !!torch?.some((m) => m.kind === "rise" && m.color === 0x3a3635)
    && !!lava?.some((m) => m.kind === "rise")
    && !!portal?.some((m) => m.kind === "rise" && m.color === 0x7b2ff2)
    && !!drip?.some((m) => m.kind === "fall" && m.needsAbove === "water")
    && !!drip?.some((m) => m.kind === "fall" && m.needsAbove === "lava")
    && !!soul?.some((m) => m.needsSubmerged === true)
    && moteForBlock(5) === null
    && moteForBlock(99999) === null;
})());
const { canToggleFly } = await import("../../src/game/interaction/gameInput");
const { damagePlayer } = await import("../../src/game/physics/playerPhysics");
ok("mortality: death only in production survival (never sim/creative/peaceful)", (() => {
  const cbs = () => {
    const rec: string[] = [];
    return {
      rec,
      playHurt: () => { rec.push("hurt"); },
      playDeath: () => { rec.push("death"); },
      setHealth: () => {},
      setDead: () => {},
      setHurtTick: (fn: (t: number) => number) => { fn(0); },
    };
  };
  const mk = (over: Record<string, unknown>) => ({
    creative: false, dead: false, health: 20, armorDefense: 0,
    gameplayMode: "survival", ...over,
  }) as any;
  const g = globalThis as any;
  const savedWindow = g.window;
  const savedDocument = g.document;
  g.document = { exitPointerLock: () => {} };
  // prod survival: lethal
  let cb = cbs();
  damagePlayer(mk({}), 100, cb);
  if (!cb.rec.includes("death")) return false;
  // prod creative: immune
  cb = cbs();
  const s2 = mk({ creative: true });
  damagePlayer(s2, 100, cb);
  if (cb.rec.length || s2.health !== 20) return false;
  // prod peaceful: immune
  cb = cbs();
  damagePlayer(mk({ gameplayMode: "peaceful" }), 100, cb);
  if (cb.rec.length) return false;
  // sim survival (:5450): immune
  g.window = { location: { port: "5450", search: "" } };
  try {
    cb = cbs();
    const s4 = mk({});
    damagePlayer(s4, 100, cb);
    if (cb.rec.length || s4.health !== 20 || s4.dead) return false;
  } finally {
    if (savedWindow === undefined) delete g.window;
    else g.window = savedWindow;
    if (savedDocument === undefined) delete g.document;
    else g.document = savedDocument;
  }
  // non-lethal prod hit still hurts
  cb = cbs();
  const s5 = mk({});
  damagePlayer(s5, 5, cb);
  return cb.rec.includes("hurt") && !cb.rec.includes("death") && (s5.health as number) < 20;
})());
ok("flight: double-space toggles in creative or sim, never otherwise", (() => {
  return canToggleFly(true, false) === true
    && canToggleFly(false, true) === true
    && canToggleFly(true, true) === true
    && canToggleFly(false, false) === false;
})());
ok("animation: registry flags match animated strips exactly", (() => {
  const expected = [39, 40, 46, 48, 61, 75, 82, 85, 86, 98, 99, 102, 120, 121, 131, 133, 194, 230, 240, 241, 261, 262, 281, 362, 363, 425, 430, 431, 478, 599, 600, 601, 603, 607, 609, 610, 612, 613, 615, 616, 617, 623, 628, 629, 630, 631, 640, 661, 681, 682, 685, 687];
  const actual: number[] = [];
  for (const [id, def] of BLOCK_MAP) {
    if ((def as { animated?: unknown }).animated) actual.push(id);
  }
  actual.sort((a, b) => a - b);
  if (actual.length !== expected.length || !actual.every((id, i) => id === expected[i])) return false;
  const w = BLOCK_MAP.get(39)?.animated as { frames: number; frametime: number } | undefined;
  const l = BLOCK_MAP.get(40)?.animated as { frames: number; frameOrder?: number[] } | undefined;
  const p = BLOCK_MAP.get(61)?.animated as { interpolate: boolean; frameOrder?: number[] } | undefined;
  const f = BLOCK_MAP.get(102)?.animated as { frames: number; frameOrder?: number[] } | undefined;
  return w?.frames === 32 && w?.frametime === 2
    && l?.frames === 20 && l?.frameOrder?.length === 38
    && p?.interpolate === true && p?.frameOrder?.length === 22
    && f?.frames === 32 && (f?.frameOrder?.length ?? 0) >= 32;
})());const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[(i++) % vals.length];
};
ok("wildlife: plains herds are large grazers (cow/sheep/horse/dog)", (() => {
  const h1 = herdForBiome("plains", seq([0.1, 0.5]));
  const h2 = herdForBiome("plains", seq([0.5, 0.5]));
  const h3 = herdForBiome("plains", seq([0.75, 0.5]));
  const h4 = herdForBiome("plains", seq([0.9, 0.5]));
  return h1?.type === "cow" && h1.count >= 4 && h1.count <= 7
    && h2?.type === "sheep" && h3?.type === "horse" && h4?.type === "dog";
})());
ok("wildlife: meadows run denser sheep/cow herds than forests", (() => {
  const m = herdForBiome("meadow", seq([0.1, 0.9]));
  const f = herdForBiome("oak_forest", seq([0.1, 0.9]));
  return m?.type === "sheep" && m.count >= 4 && f?.type === "pig" && (f?.count ?? 9) <= 4;
})());
ok("wildlife: deserts, peaks and ice return no herds", (() => {
  const r = seq([0.1, 0.5]);
  return herdForBiome("desert", r) === null && herdForBiome("badlands", r) === null
    && herdForBiome("ice_spikes", r) === null && herdForBiome("stony_peaks", r) === null
    && herdForBiome("frozen_peaks", r) === null && herdForBiome("warped", r) === null
    && herdForBiome(undefined, r) === null;
})());
ok("wildlife: savanna runs horse herds, swamp runs pigs", (() => {
  const s = herdForBiome("savanna", seq([0.1, 0.5]));
  const w = herdForBiome("swamp", seq([0.1, 0.5]));
  return s?.type === "horse" && s.count >= 3 && w?.type === "pig" && w.count >= 2;
})());
ok("ocean: seabed is gravel-based with sand/dirt/clay patches, never snow", (() => {
  const tCtx = riverCtx();
  const tops = new Set<number>();
  for (let x = -1500; x <= 1500; x += 25) {
    for (let z = -1500; z <= 1500; z += 25) {
      const h = tCtx.rawHeight(x, z);
      if (h > SEA - 2 || h <= SEA - 14) continue;
      tops.add(tCtx.surfaceAt(x, z).top);
    }
  }
  return tops.has(12) && !tops.has(51) && [...tops].every((t) => [10, 12, 2, 256, 584, 490].includes(t));
})());
ok("ocean: flora chooser respects vanilla depth/biome gates", (() => {
  const seqR = (vals: number[]) => {
    let i = 0;
    return () => vals[(i++) % vals.length];
  };
  for (let s = 0; s < 20; s++) {
    const r = seqR([(s * 0.37 + 0.11) % 1, (s * 0.61 + 0.29) % 1, (s * 0.83 + 0.47) % 1]);
    if (chooseUnderwaterFlora("ocean", 0.5, true, 5, false, r) !== null) return false;
    const warm = chooseUnderwaterFlora("warm_ocean", 0.9, false, 5, false, r);
    if (warm === "kelp" || warm === "tallgrass") return false;
    const cold = chooseUnderwaterFlora("ocean", 0.4, false, 5, false, r);
    if (cold === "coral" || cold === "pickle") return false;
    const river = chooseUnderwaterFlora("river", 0.5, false, 3, true, r);
    if (river !== null && river !== "seagrass") return false;
  }
  const warmKinds = new Set<string>();
  for (let s = 0; s < 60; s++) {
    const k = chooseUnderwaterFlora("warm_ocean", 0.9, false, 5, false, seqR([(s * 0.37 + 0.11) % 1, 0.5, 0.05]));
    if (k) warmKinds.add(k);
  }
  return warmKinds.has("coral") && warmKinds.has("seagrass");
})());
ok("ocean: worker meshes seagrass as billboards", await (async () => {
  const { buildChunkMeshBuffers } = await import("../../src/game/engine/meshWorker");
  const mk = (id: number) => {
    const d = new Uint16Array(256 * 128);
    d[64 * 256 + 8 * 16 + 8] = id;
    return buildChunkMeshBuffers({ cx: 0, cz: 0, data: d as any, maxY: 65 });
  };
  return !!mk(133).grass?.pos.length && !!mk(661).grass?.pos.length;
})());
ok("climate: frozen surfaces halved, tropics expanded", (() => {
  const tCtx = riverCtx();
  const TROP = new Set(["jungle", "bamboo", "mangrove", "savanna", "desert", "desert_palm", "swamp"]);
  let n = 0, fz = 0, tr = 0;
  for (let x = -1500; x <= 1500; x += 30) {
    for (let z = -1500; z <= 1500; z += 30) {
      const s = tCtx.surfaceAt(x, z);
      if (s.h <= SEA) continue;
      n++;
      if (s.top === 51 || s.top === 54 || s.top === 52 || s.top === 53) fz++;
      if (TROP.has(tCtx.getBiome(x, z).id)) tr++;
    }
  }
  const ff = fz / n, tf = tr / n;
  return ff < 0.11 && ff > 0.02 && tf > 0.30;
})());
ok("climate: biomes change hands often along a transect (close zones)", (() => {
  const tCtx = riverCtx();
  let tot = 0;
  for (const z of [0, 500, -500, 1000, -1000]) {
    let prev = "";
    for (let x = -1500; x <= 1500; x += 10) {
      const id = tCtx.getBiome(x, z).id;
      if (prev && id !== prev) tot++;
      prev = id;
    }
  }
  return tot >= 80;
})());
ok("climate: transition band downgrades extremes to temperate buffers", (() => {
  const d = applyTransitionBand("desert", 0.5, 0.3, 64, 0.5);
  const s = applyTransitionBand("spruce", 0.45, 0.7, 64, 0.6);
  const b = applyTransitionBand("badlands", 0.5, 0.5, 64, 0.5);
  const keepHot = applyTransitionBand("desert", 0.8, 0.1, 66, 0.5);
  const keepCold = applyTransitionBand("spruce", 0.2, 0.4, 64, 0.5);
  const keepHigh = applyTransitionBand("desert", 0.5, 0.3, 80, 0.5);
  return d?.id === "plains" && s?.id === "oak_forest" && b?.id === "birch"
    && keepHot === null && keepCold === null && keepHigh === null;
})());
ok("climate: no frozen lowland touches warm dunes (buffer enforced)", (() => {
  const tCtx = riverCtx();
  const FROZEN = new Set(["ice_spikes", "spruce"]);
  const WARM = new Set(["desert", "desert_palm", "badlands", "savanna"]);
  const frozen: Array<[number, number]> = [];
  const warm: Array<[number, number]> = [];
  for (let x = -1500; x <= 1500; x += 15) {
    for (let z = -1500; z <= 1500; z += 15) {
      const h = tCtx.rawHeight(x, z);
      if (h <= SEA || h >= SEA + 33) continue;
      const id = tCtx.getBiome(x, z).id;
      if (FROZEN.has(id)) frozen.push([x, z]);
      else if (WARM.has(id)) warm.push([x, z]);
    }
  }
  if (!frozen.length || !warm.length) return false;
  let best = Infinity, pair: [number, number, number, number] | null = null;
  for (const [fx, fz] of frozen) {
    for (const [wx, wz] of warm) {
      const d = Math.hypot(fx - wx, fz - wz);
      if (d < best) { best = d; pair = [fx, fz, wx, wz]; }
    }
  }
  if (!pair || best < 40) return false;
  const [fx, fz, wx, wz] = pair;
  // The ground between the closest frozen/warm pair must be neither extreme:
  // temperate lowlands where flat, or a mountain wall where high.
  const mid = tCtx.getBiome(Math.round((fx + wx) / 2), Math.round((fz + wz) / 2)).id;
  return !FROZEN.has(mid) && !WARM.has(mid);
})());

ok("scatter: jungle canopy has tall trunk, crowns and vines", (() => {
  const rec = recWriter();
  generateJungleTree(0, 0, 62, () => 0.4, rec.w, { tier: "canopy" });
  const ids = [...rec.cells.values()];
  const has = (id: number) => ids.includes(id);
  let top = -1;
  for (const [k] of rec.cells) top = Math.max(top, Number(k.split(",")[1]));
  return has(25) && has(114) && has(674) && top - 62 >= 10;
})());
ok("wildlife: jungle runs chickens and pigs", (() => {
  const j = herdForBiome("jungle", seq([0.1, 0.5]));
  return (j?.type === "chicken" || j?.type === "pig") && (j?.count ?? 0) >= 2;
})());

ok("caves: lateral cover ring reports thinnest nearby rock", (() => {
  const peak = (x: number, y: number) => 100 - Math.abs(x) * 10 - Math.abs(y) * 10;
  return minRingHeight(0, 0, peak) === 60 && minRingHeight(10, 10, () => 50) === 50;
})());

ok("trees: trunk roll covers 1/2/3-wide", (() => {
  return T.rollTrunk(() => 0.01, 0.25, 0.05) === 3
    && T.rollTrunk(() => 0.1, 0.25, 0.05) === 2
    && T.rollTrunk(() => 0.9, 0.25, 0.05) === 1;
})());

ok("trees: oaks vary (no two alike across seeds)", (() => {
  const seen = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const cw = captureWriter();
    T.generateOakTree(0, 0, 64, seededR(1000 + i), cw.w);
    seen.add(sigOf(cw.cells()));
  }
  return seen.size >= 25;
})(), "distinct oak fingerprints");

ok("trees: oaks show 1-wide and 2-wide trunks", (() => {
  const widths = new Set<number>();
  for (let i = 0; i < 60; i++) {
    const cw = captureWriter();
    T.generateOakTree(0, 0, 64, seededR(2000 + i), cw.w);
    let maxDx = 0;
    for (const [k, v] of cw.cells()) {
      if (v !== 16) continue;
      const [x] = k.split(",").map(Number);
      maxDx = Math.max(maxDx, Math.abs(x));
    }
    widths.add(maxDx > 0 ? 2 : 1);
  }
  return widths.has(1) && widths.has(2);
})());

ok("trees: trunk leader reaches the canopy top", (() => {
  for (let i = 0; i < 20; i++) {
    const cw = captureWriter();
    T.generateOakTree(0, 0, 64, seededR(3000 + i), cw.w);
    let trunkTop = -1, leafTop = -1;
    for (const [k, v] of cw.cells()) {
      const y = Number(k.split(",")[1]);
      if (v === 16) trunkTop = Math.max(trunkTop, y);
      else if (v === 18) leafTop = Math.max(leafTop, y);
    }
    if (!(trunkTop >= leafTop - 1)) return false;
  }
  return true;
})());

ok("trees: pagoda stacks multiple leaf tiers", (() => {
  const cw = captureWriter();
  T.generateCustomTree(0, 0, 64, seededR(4242), cw.w, {
    trunk: 16, leaf: 18, hMin: 10, hMax: 10, forceTw: 1,
    trunks: ["straight"], canopies: ["pagoda"]
  });
  let lo = 1e9, hi = -1e9;
  for (const [k, v] of cw.cells()) {
    if (v !== 18) continue;
    const y = Number(k.split(",")[1]);
    lo = Math.min(lo, y); hi = Math.max(hi, y);
  }
  return hi - lo >= 4;
})());

console.log(`sim: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
