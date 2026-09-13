/**
 * @file catalog/patchBlockTiles.mjs
 * One-shot tile corrections for blocks whose auto-assignment picked the wrong
 * texture (collisions with leaked legacy slots / name-match misses).
 * Reference: catalog/auditTextures2.mjs + docs/TEXTURE_FIX_PLAN.md
 */
import fs from "node:fs";

const F = "src/game/blocks.ts";

const CUSTOM = JSON.parse(fs.readFileSync("catalog/customTiles.json", "utf8"));
const CHEST_TILE = CUSTOM.chest ?? 9; // custom baked chest tile (falls back to oak planks)

// ── Red Bed registration (idempotent) ──
const BED_TILE = CUSTOM.bed ?? 3;
const bedMark = "id + 9000"; // label used once
const FIND_BED = /"name": "Red bed"/;
let BED_ID = 0;
{
  const srcNow = fs.readFileSync(F, "utf8");
  const mB = srcNow.match(/"id": (\d+),\n\s*"name": "Red bed"/);
  if (!mB) {
    // first free id >= 711 (items live up to 1173; placeable ids < 700 are all used)
    const ids = new Set([...srcNow.matchAll(/"id": (\d+),/g)].map((mm) => Number(mm[1])));
    BED_ID = 711;
    while (ids.has(BED_ID)) BED_ID++;
    if (BED_ID >= 1180) throw new Error("no free id for red bed");
    const blockDef = `,\n  {\n    "id": ${BED_ID},\n    "name": "Red bed",\n    "category": "utility",\n    "side": ${BED_TILE},\n    "top": ${BED_TILE},\n    "bottom": ${BED_TILE},\n    "solid": 1\n  }\n];\n\nexport const BED_ID = ${BED_ID};\n`;
    const marker = "export const BLOCKS: BlockDef[] = [";
    const arrStart = srcNow.indexOf(marker);
    const arrEnd = srcNow.indexOf("];", arrStart);
    const patched = srcNow.slice(0, arrEnd) + blockDef + srcNow.slice(arrEnd + 2);
    fs.writeFileSync(F, patched);
    console.log(`Registered Red bed → id ${BED_ID} (tile ${BED_TILE})`);
  } else {
    BED_ID = Number(mB[1]);
  }
}

// Bed thumbnail: reuse the red-wool iso thumb (id 63) until the baker is rerun.
// Thumbnails are stored in catalog/thumbnailsCache.json (see exportThumbnails.mjs).
{
  const C = "catalog/thumbnailsCache.json";
  const cache = JSON.parse(fs.readFileSync(C, "utf8"));
  if (cache["63"] && cache[String(BED_ID)] !== cache["63"]) {
    cache[String(BED_ID)] = cache["63"];
    fs.writeFileSync(C, JSON.stringify(cache));
    console.log(`Bed thumbnail aliased (id ${BED_ID} ← red wool)`);
  }
}

// id -> [side, top, bottom] tile overrides
const PATCH = {
  21: [117, 117, 117],  // Birch leaves → birch_leaves.png (tile 117)
  27: [115, 115, 115],  // Jungle leaves → jungle_leaves.png (tile 115)
  169: [114, 114, 114], // Bamboo (plant) → bamboo_stalk (was bamboo_block)
  110: [116, 116, 116], // Crimson maple leaves → dark oak leaves (was crimson_fungus cube)
  111: [117, 117, 117], // Golden aspen leaves → birch leaves (was warped_fungus cube)
  112: [113, 113, 113], // Warped violet leaves → warped_roots (violet-teal, colored in vanilla set — was mangrove/gray)
  85: [257, 257, 257], // Campfire     → campfire_log_lit (was plain campfire_log)
  86: [765, 765, 765], // Soul campfire → soul_campfire_log_lit
  103: [231, 231, 231], // Brewing stand → brewing_stand (was torch!)
  43: [CHEST_TILE, CHEST_TILE, CHEST_TILE], // Chest → custom tile baked from entity/chest/normal.png
  109: [8, 8, 8],     // Cherry leaves → oak leaves placeholder (cherry is 1.20)
  119: [9, 9, 9],     // Cherry wood    → oak planks placeholder
  123: [620, 620, 620], // Pink petal carpet → pink tulip placeholder
  281: [122, 122, 122], // Crimson      → crimson_stem (was crimson_door_bottom)
  410: [472, 472, 472], // Hopper       → hopper_outside (was hopper_inside)
  494: [575, 575, 575], // Mushroom     → mushroom_stem (was mushroom_block_inside)
  595: [702, 702, 702], // Redstone Dust Overlay → redstone_dust_dot (was EMPTY slot 705)
  616: [744, 744, 744], // Sculk Shrieker Inner → sculk_shrieker_inner_top (was sculk)
  681: [124, 124, 124]  // Warped       → warped_stem (was warped_door_bottom)
};

let src = fs.readFileSync(F, "utf8");
let patched = 0;
for (const [id, vals] of Object.entries(PATCH)) {
  const idLine = src.search(new RegExp(`"id": ${id},`));
  if (idLine < 0) { console.log(`id ${id}: NOT FOUND`); continue; }
  const objEnd = src.indexOf("},", idLine);
  if (objEnd < 0) { console.log(`id ${id}: object end not found`); continue; }
  const slice = src.slice(idLine, objEnd);
  const [side, top, bottom] = vals;
  const updated = slice
    .replace(/"side":\s*\d+/, `"side": ${side}`)
    .replace(/"top":\s*\d+/, `"top": ${top}`)
    .replace(/"bottom":\s*\d+/, `"bottom": ${bottom}`);
  if (updated === slice) { console.log(`id ${id}: no change (fields missing?)`); continue; }
  src = src.slice(0, idLine) + updated + src.slice(objEnd);
  patched++;
  console.log(`id ${id} → side ${side}, top ${top}, bottom ${bottom}`);
}
fs.writeFileSync(F, src);
console.log(`patched ${Object.keys(PATCH).length} ids total (${patched} changed)`);
