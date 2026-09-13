/**
 * @file catalog/auditTextures.mjs
 * Audits the master terrain atlas against the block registry:
 *  - finds EMPTY (alpha=0) and BLACK slots referenced by block defs → "rendered black/invisible"
 *  - shows which files landed in legacy slots 79/80 (sun/moon) and 106-108/142-143 (doors)
 */
import fs from "node:fs";
import { PNG } from "pngjs";

const atlas = PNG.sync.read(fs.readFileSync("public/textures/terrain_atlas.png"));
const tileMap = JSON.parse(fs.readFileSync("catalog/textureTileMap.json", "utf8"));
const registry = JSON.parse(fs.readFileSync("catalog/completeRegistry.json", "utf8"));

const TILE = 16, PER_ROW = 32;
const inv = {}; // tile -> file
for (const [f, t] of Object.entries(tileMap)) inv[t] = f;

function slotInfo(tile) {
  const gx = (tile % PER_ROW) * TILE, gy = Math.floor(tile / PER_ROW) * TILE;
  let sum = 0, n = 0, alphaMax = 0;
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const i = ((gy + y) * atlas.width + (gx + x)) * 4;
    let a = atlas.data[i + 3];
    if (a > alphaMax) alphaMax = a;
    if (a > 0) { sum += (atlas.data[i] + atlas.data[i + 1] + atlas.data[i + 2]) / 3; n++; }
  }
  return { a: alphaMax, mean: n ? sum / n : 0 };
}

// 1. Legacy slot statuses that matter visually
for (const t of [79, 80, 81, 82, 106, 107, 108, 142, 143, 144, 145, 11, 52, 77, 10, 78, 17, 56, 129, 130]) {
  const info = slotInfo(t);
  console.log(`slot ${String(t).padStart(4)}: file=${inv[t] ?? "(empty)"} alphaMax=${info.a} mean=${info.mean.toFixed(0)}`);
}

// 2. Block defs referencing empty/black slots
const bad = [];
const missingTex = [];
for (const b of registry) {
  if (!(["building","natural","ores","wood","utility","nether_end","colored","decoration","redstone","transportation"].includes(b.category))) continue;
  const faces = { side: b.side, top: b.top, bottom: b.bottom };
  for (const [f, tile] of Object.entries(faces)) {
    if (tile == null) { missingTex.push(`${b.name} (${b.id}): no ${f}`); continue; }
    const info = slotInfo(tile);
    if (info.a === 0) bad.push(`${b.name} (${b.id}) ${f}=${tile} → EMPTY slot (renders black/invisible)`);
    else if (info.mean < 10) bad.push(`${b.name} (${b.id}) ${f}=${tile} → BLACK slot (mean ${info.mean.toFixed(0)})`);
  }
}
console.log(`\n=== blocks with missing/empty/black faces (${bad.length + missingTex.length}) ===`);
console.log([...bad, ...missingTex].slice(0, 80).join("\n"));

// 3. Blocks whose three faces all map to the same slot but that slot is grass/top-like (likely "no texture found" default)
const defaults = [];
for (const b of registry) {
  if (!b.side) continue;
  if (b.side === b.top && b.top === b.bottom && [0, 1, 3].includes(b.side)) {
    defaults.push(`${b.name} (${b.id}) side/top/bottom=${b.top} (grass/stone default — likely never matched a source file)`);
  }
}
console.log(`\n=== blocks using default grass/stone slots (${defaults.length}) ===`);
console.log(defaults.slice(0, 60).join("\n"));
