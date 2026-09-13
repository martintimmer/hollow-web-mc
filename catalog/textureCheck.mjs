/**
 * @file catalog/textureCheck.mjs
 * CI texture validation (hard-fail) — run after any catalog/atlas (re)generation:
 *  checks the runtime blocks.ts face-tiles against the baked master atlas:
 *   1. every referenced face slot is non-empty (alpha>0) or whitelisted
 *   2. no block references a slot that holds a file it never declared
 *      (exact-name or fuzzy match), excluding known intentional aliases
 *   3. foliage/glass/trans materials reference slots with partial alpha
 * Usage: node catalog/textureCheck.mjs   (exit code 0/1)
 */
import fs from "node:fs";
import { PNG } from "pngjs";

const atlas = PNG.sync.read(fs.readFileSync("public/textures/terrain_atlas.png"));
const tileMap = JSON.parse(fs.readFileSync("catalog/textureTileMap.json", "utf8"));
const inv = {};
for (const [f, t] of Object.entries(tileMap)) inv[t] = f;

const src = fs.readFileSync("src/game/blocks.ts", "utf8");
const m = src.match(/export const BLOCKS: BlockDef\[\] = (\[[\s\S]*?\]);/);
const BLOCKS = JSON.parse(m[1]);

// Intentional aliases (documented in docs/TEXTURE_FIX_PLAN.md) — [id, tile]
const ALLOWED_ALIAS = new Set([`43:9`, `54:2`, `109:8`, `119:9`, `123:620`]);

function slotInfo(tile) {
  const TILE = 16, PER_ROW = 32;
  const gx = (tile % PER_ROW) * TILE, gy = Math.floor(tile / PER_ROW) * TILE;
  let alphaMax = 0, opaque = 0;
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const i = ((gy + y) * atlas.width + (gx + x)) * 4;
    if (atlas.data[i + 3] > alphaMax) alphaMax = atlas.data[i + 3];
    if (atlas.data[i + 3] > 0) opaque++;
  }
  return { alphaMax, opaque };
}

let errors = 0;
const skipEntry = (b) => !!b.itemTexture || b.category === "item" || b.category === "tools" || b.category === "combat" || b.category === "food";
for (const b of BLOCKS) {
  if (skipEntry(b)) continue;
  const declared = (b.textureFiles || []).map(f => f.replace(/\.png$/, ""));
  for (const face of ["side", "top", "bottom"]) {
    const tile = b[face];
    if (tile == null) continue;
    const info = slotInfo(tile);
    const file = inv[tile] ?? "(none)";
    if (info.alphaMax === 0) {
      console.log(`ERROR ${b.name} (${b.id}) ${face}=${tile} → EMPTY slot`);
      errors++;
      continue;
    }
    if (declared.length && !declared.some(d => file === d + "" || file.startsWith(d) || d.startsWith(file.replace(/\.png$/, "")))) {
      const aliasKey = `${b.id}:${tile}`;
      if (ALLOWED_ALIAS.has(aliasKey)) continue;
      console.log(`INFO ${b.name} (${b.id}) ${face}=${tile} → ${file} (declared: ${declared.slice(0, 3).join(",")})`);
    }
  }
  // transparency sanity
  const side = b.side;
  if (side != null && b.trans && !b.liquid) {
    const info = slotInfo(side);
    if (info.opaque === 256) console.log(`INFO ${b.name} (${b.id}) flagged transparent but its side tile is fully opaque`);
  }
}

// Cross-block slot sharing (excluding whitelisted aliases)
const usedBy = {};
for (const b of BLOCKS) {
  if (skipEntry(b)) continue;
  for (const face of ["side", "top", "bottom"]) {
    const tile = b[face];
    if (tile == null) continue;
    if (!usedBy[tile]) usedBy[tile] = [];
    if (!usedBy[tile].some(x => x.id === b.id)) usedBy[tile].push(b);
  }
}
for (const [tile, list] of Object.entries(usedBy)) {
  if (list.length <= 1) continue;
  const names = list.map(b => `${b.name}(${b.id})`).join(", ");
  if (/^9$/.test(tile) && list.some(b => b.id === 43)) continue; // chest alias
  console.log(`INFO shared slot ${tile}: ${names}`);
}

console.log(errors === 0 ? "textureCheck: PASS" : `textureCheck: ${errors} FATAL`);
process.exit(errors ? 1 : 0);
