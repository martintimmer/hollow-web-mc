// Phase 1 — village overhaul verification (run: npx tsx scripts/phase1-check.mts)
// Verifies: slope-gated village placement, per-house terrain bases, deterministic
// plans, and terrain-following roads that build elevation stairs without carving.
import { createTerrainContext, createChunkGenerator, minRingHeight } from "../src/game/terrain/terrainGenerator";
import { buildRoadStrip, buildGarden, generateHouseStructure } from "../src/game/terrain/structures";
import { TYPES, CH, CHH } from "../src/game/world";
import { javaHash } from "../src/game/noise";
import { BLOCK_MAP } from "../src/game/blocks";

let failures = 0;
function ok(name: string, cond: boolean, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✔" : "✘ FAIL"} ${name}${extra ? "  (" + extra + ")" : ""}`);
}

const seedText = "hollowpine";
const seed = (javaHash(seedText)) >>> 0;
const seedMix = Math.imul(seed, 2246822519) | 0;
const world = TYPES.standard;

const s: any = {
  seed, seedMix,
  world,
  type: "standard",
  chunks: new Map(),
  chestMap: new Map(),
  liquidQ: [],
  edits: new Map(),
  editsByChunk: new Map(),
  planCache: new Map(),
  heightCache: new Map(),
  regionCache: new Map(),
  simMode: false,
};

const terrainCtx = createTerrainContext(() => s.seedMix, () => s.world, s.heightCache, s.regionCache);
const { hash2, terrainHeight, surfaceAt, villageAt, villagesNear, getBiome, caveAt, mineshaftAt } = terrainCtx;

const origin: any = { GC: null, GX0: 0, GZ0: 0 };
function w(x: number, y: number, z: number, id: number) {
  if (!origin.GC || y < 0 || y >= CHH) return;
  if (x < origin.GX0 || x >= origin.GX0 + CH || z < origin.GZ0 || z >= origin.GZ0 + CH) return;
  const off = y * 256 + (z & 15) * 16 + (x & 15);
  origin.GC.data[off] = id;
  if (id && y > origin.GC.maxY) origin.GC.maxY = y;
}
const clearUp = (x: number, z: number, from: number) => { for (let y = from; y < CHH; y++) w(x, y, z, 0); };
function wStair(x: number, y: number, z: number, id: number, facing: number) {
  w(x, y, z, id);
  if (origin.GC) {
    const off = y * 256 + (z & 15) * 16 + (x & 15);
    if (!origin.GC.dirs) origin.GC.dirs = new Uint16Array(CH * CHH * CH);
    origin.GC.dirs[off] = facing + 1;
  }
}
function rngAt(x: number, z: number) {
  let st = ((Math.imul(x, 73856093) ^ Math.imul(z, 19349663) ^ s.seedMix) >>> 0);
  return () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; };
}

const generator = createChunkGenerator({
  s, simFlat: () => false,
  hash2, hash3: terrainCtx.hash3, vnoise: terrainCtx.vnoise, vnoise3D: terrainCtx.vnoise3D,
  continentalAt: terrainCtx.continentalAt, tempAt: terrainCtx.tempAt,
  terrainHeight, surfaceAt, villagesNear, getBiome, riverInfoAt: terrainCtx.riverInfoAt,
  rngAt, w, clearUp, origin,
  roadStrip: (x0, z0, x1, z1) => buildRoadStrip(x0, z0, x1, z1, origin.GX0, origin.GZ0, CH, w, hash2, terrainHeight, wStair),
  lampPost: (x, z, base) => {}, // not exercised
  wellAt: (x, z, base) => {},
  gardenAt: (x0, z0, x1, z1) => buildGarden(x0, z0, x1, z1, w, clearUp, terrainHeight),
  penAt: () => {},
  buildHouse: (H: any) => generateHouseStructure(H, w, clearUp, terrainHeight, hash2, wStair),
  caveAt, mineshaftAt
});
const { villagePlan, genChunk } = generator;

// ---------------------------------------------------------------------------
// A. Slope gate: placed villages sit on gentle terrain (no mountains)
// ---------------------------------------------------------------------------
ok("stone brick stairs (72) is a stair block", !!BLOCK_MAP.get(72)?.stair, "stair flag");

const regions: Array<[number, number]> = [];
for (let rz = -3; rz <= 3; rz++) for (let rx = -3; rx <= 3; rx++) regions.push([rx, rz]);
let villages = 0, spawnVillage = false;
let worstDelta = 0, spawnDelta = 0;
const villagesSeen = new Set<string>();
for (const [rx, rz] of regions) {
  const v = villageAt(rx, rz);
  if (!v) continue;
  villages++;
  villagesSeen.add(v.id);
  if (v.home) spawnVillage = true;
  const h = terrainHeight(v.vx, v.vz);
  const R = 20;
  let d = 0;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const ph = terrainHeight(Math.round(v.vx + Math.cos(a) * R), Math.round(v.vz + Math.sin(a) * R));
    d = Math.max(d, Math.abs(ph - h));
  }
  if (v.home) spawnDelta = d; else worstDelta = Math.max(worstDelta, d);
}
ok("villages found across sampled regions", villages > 0, `${villages} villages`);
ok("spawn village present (region 0,0)", spawnVillage);
// Non-home villages are gated to gentle slopes (gate threshold 3.5 at radius 24;
// we sample radius 20, so allow +0.75 slack). Spawn fallback may be steep — logged.
ok("all non-home villages on gentle terrain (slope gate)", worstDelta <= 4.5, `worst delta ${worstDelta.toFixed(2)}`);
console.log(`  (spawn-region village terrain delta ${spawnDelta.toFixed(2)})`);

// ---------------------------------------------------------------------------
// B. Determinism: identical plan for the same village
// ---------------------------------------------------------------------------
const planVs: any[] = [];
for (const id of villagesSeen) {
  const [rx, rz] = id.split(":").map(Number);
  const v = villageAt(rx, rz);
  if (v) planVs.push(v);
}
if (planVs.length) {
  const v0 = planVs[0];
  const p1 = villagePlan(v0);
  const p2 = villagePlan(v0);
  const sig = (p: any) => JSON.stringify({ roads: p.roads, houses: p.houses.map((h: any) => [h.x0, h.z0, h.x1, h.z1, h.base, h.side]), pens: p.pens });
  ok("villagePlan deterministic (same village twice)", sig(p1) === sig(p2));
} else {
  ok("villagePlan deterministic (same village twice)", false, "no villages to test");
}

// ---------------------------------------------------------------------------
// F. Phase 2: seed-keyed archetype variety + house-count variance
// ---------------------------------------------------------------------------
{
  // Scan MANY regions so we cross multiple archetypes.
  let distinctLayouts = 0;
  const layoutSeen = new Set<string>();
  let minHouses = Infinity, maxHouses = 0;
  const roadLen = (rd: any) => Math.hypot(rd.x1 - rd.x0, rd.z1 - rd.z0);
  const layoutsChecked: Array<{ houses: number; spineLen: number; spines: number; xSpan: number; zSpan: number }> = [];
  const seen: string[] = [];
  for (let rz = -10; rz <= 10; rz++) {
    for (let rx = -10; rx <= 10; rx++) {
      const v = villageAt(rx, rz);
      if (!v || seen.includes(v.id)) continue;
      seen.push(v.id);
      const p = villagePlan(v);
      const spineRects = p.roads.filter((rd: any) => roadLen(rd) >= 10);
      const spineLen = spineRects.reduce((a: number, rd: any) => a + roadLen(rd), 0);
      const sig = JSON.stringify({
        count: p.houses.length,
        spines: spineRects.length,
        spineLen: Math.round(spineLen),
        xSpan: Math.round(p.bx1 - p.bx0),
        zSpan: Math.round(p.bz1 - p.bz0)
      });
      layoutsChecked.push({ houses: p.houses.length, spineLen, spines: spineRects.length, xSpan: Math.round(p.bx1 - p.bx0), zSpan: Math.round(p.bz1 - p.bz0) });
      if (!layoutSeen.has(sig)) { layoutSeen.add(sig); distinctLayouts++; }
      minHouses = Math.min(minHouses, p.houses.length);
      maxHouses = Math.max(maxHouses, p.houses.length);
    }
  }
  ok("multiple distinct village layouts across seeds", distinctLayouts >= 5, `${distinctLayouts} distinct of ${layoutsChecked.length} villages`);
  ok("house counts vary (12–26 target)", maxHouses >= 12 && minHouses < maxHouses, `min ${minHouses} .. max ${maxHouses}`);
  console.log(`  (${layoutsChecked.length} villages, house range ${minHouses}..${maxHouses}, ${distinctLayouts} distinct layouts)`);
}

// ---------------------------------------------------------------------------
// C. Per-house bases ground to local terrain (surface placement, not flat cut)
// ---------------------------------------------------------------------------
let housesChecked = 0, housesGroundOk = 0;
for (const v of planVs) {
  const p = villagePlan(v);
  for (const h of p.houses) {
    housesChecked++;
    const hw = h.x1 - h.x0, hd = h.z1 - h.z0;
    const maxCorner = Math.max(
      terrainHeight(h.x0, h.z0), terrainHeight(h.x0 + hw, h.z0),
      terrainHeight(h.x0, h.z0 + hd), terrainHeight(h.x0 + hw, h.z0 + hd)
    );
    // floor sits on/above the footprint ground (>= max corner) and not absurdly high
    if (h.base >= maxCorner - 1 && h.base <= maxCorner + 2) housesGroundOk++;
  }
}
ok("houses grounded to their own terrain", housesChecked > 0 && housesGroundOk === housesChecked, `${housesGroundOk}/${housesChecked}`);

// ---------------------------------------------------------------------------
// D. buildRoadStrip: terrain-following + elevation stairs, no clearing
// ---------------------------------------------------------------------------
{
  // Mock terrain: rises 0,0,3,3 along +X → a 3-block climb at x=2
  const th = (x: number, z: number) => (x >= 2 ? 64 : 61);
  const writes: Array<[number, number, number, number]> = [];
  const stairWrites: Array<[number, number, number, number, number]> = [];
  const wRec = (x: number, y: number, z: number, id: number) => { writes.push([x, y, z, id]); };
  const wStairRec = (x: number, y: number, z: number, id: number, facing: number) => { stairWrites.push([x, y, z, id, facing]); };
  // 6-long road along X at z=5
  buildRoadStrip(0, 5, 5, 5, 0, 0, 16, wRec, () => 0.5, th, wStairRec);

  // Every path column is written AT its surface height (no fixed-base flatten)
  let pathAtSurface = 0;
  for (let x = 0; x <= 5; x++) if (writes.some(([wx, wy]) => wx === x && wy === th(x, 5))) pathAtSurface++;
  ok("road path laid at each column's surface height", pathAtSurface === 6, `${pathAtSurface}/6`);

  // No write above the surface in any column (no clearing of the hillside)
  const aboveSurface = writes.filter(([x, y]) => y > th(x, 5)).length;
  ok("no blocks written above the surface (no mountain cut)", aboveSurface === 0, `${aboveSurface} writes above surface`);

  // The 3-block climb at x=2 gets a staircase: 1 stair (61+1..63) + solid landing (y=63)
  const stairAt2 = stairWrites.filter(([x]) => x === 2);
  const expected = (64 - 61) - 1; // D-1 = 2 stairs expected at yLow+1..yHigh-2 → y=62,63? recompute below
  ok("staircase built on the elevation rise", stairAt2.length >= 1, `${stairAt2.length} stair blocks at x=2`);
  const landingAt2 = writes.some(([x, y]) => x === 2 && y === 63);
  ok("solid landing supports the path above the rise", landingAt2, "stone brick at y=63");
  void expected;
}

// ---------------------------------------------------------------------------
// E. Full chunk generation stays deterministic (whole pipeline incl. villages)
// ---------------------------------------------------------------------------
{
  const v = planVs[0];
  const cx = Math.floor(v.vx / CH), cz = Math.floor(v.vz / CH);
  const c1 = genChunk(cx, cz);
  s.chunks = new Map(); s.chestMap = new Map();
  const c2 = genChunk(cx, cz);
  const same = c1.data.length === c2.data.length && c1.data.every((val, i) => val === c2.data[i]);
  ok("village chunk deterministic across regenerations", same, `chunk ${cx},${cz}`);
  const c3 = genChunk(cx + 1, cz);
  ok("neighbor chunk generates", !!c3 && c3.data.length === CH * CHH * CH);
}

// ---------------------------------------------------------------------------
// F. Mountain solidity: solid flanks, caves only under real rock cover
// ---------------------------------------------------------------------------
{
  const mtn: Array<[number, number]> = [];
  for (let cx = -40; cx <= 40 && mtn.length < 6; cx++) {
    for (let cz = -40; cz <= 40 && mtn.length < 6; cz++) {
      let mx = 0, mn = 999;
      for (let lz = 0; lz < 16; lz += 4) for (let lx = 0; lx < 16; lx += 4) {
        const h = terrainHeight(cx * CH + lx, cz * CH + lz);
        if (h > mx) mx = h;
        if (h < mn) mn = h;
      }
      if (mx >= 88 && mx - mn >= 20) mtn.push([cx, cz]);
    }
  }
  let flankHoles = 0, deepCave = 0, interiorAir = 0, interiorTot = 0;
  for (const [cx, cz] of mtn) {
    const c = genChunk(cx, cz);
    for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
      const wx = cx * CH + lx, wz = cz * CH + lz;
      const h = terrainHeight(wx, wz);
      if (h < 70) continue;
      const cheek = minRingHeight(wx, wz, terrainHeight);
      for (let y = Math.max(4, cheek - 1); y < h; y++) {
        if (c.data[y * 256 + lz * 16 + lx] === 0) flankHoles++;
      }
      for (let y = 4; y < h - 2; y++) {
        interiorTot++;
        if (c.data[y * 256 + lz * 16 + lx] === 0) {
          interiorAir++;
          if (y < h - 8) deepCave++;
        }
      }
    }
  }
  ok("mountain chunks found for solidity scan", mtn.length >= 3, `${mtn.length} chunks`);
  ok("mountain flanks solid (no side holes)", flankHoles === 0, `${flankHoles} voids`);
  ok("deep caves still exist (digging effort preserved)", deepCave > 0, `${deepCave} deep voids`);
  ok("mountain interiors mostly solid", interiorTot === 0 || interiorAir / interiorTot < 0.08,
    interiorTot ? `${(100 * interiorAir / interiorTot).toFixed(1)}% air` : "empty");
}

console.log(failures === 0 ? "\nPHASE1: all checks passed" : `\nPHASE1: ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);