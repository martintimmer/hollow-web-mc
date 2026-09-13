/**
 * @file catalog/patchCobwebIds.mjs
 * Cobweb density family + spider egg (player request 2026-09-07):
 *
 *   259  Cobweb         → medium density (fire-style 2-plane cross, vanilla cross.json
 *                         parity) + walk-through (solid 0) + alpha (trans 1)
 *   1207 Cobweb Sparse  → low density, single 45° diagonal plane
 *   1208 Cobweb Dense   → high density, 4 intersecting planes
 *   1209 Spider Egg     → item (spider_eye.png icon); right-click a web to hatch
 *                         a decorative web spider (see src/game/entities/webSpider.ts)
 *
 * Idempotent: safe to run repeatedly. Mirrors the patchRegistryIds.mjs pattern —
 * transforms completeRegistry.json AND the embedded BLOCKS array in
 * src/game/blocks.ts (never hand-edit blocks.ts), then block-shapes.json and
 * thumbnailsCache.json. Run catalog/exportThumbnails.mjs afterwards to refresh
 * public/catalog/thumbnails.json.
 *
 * Run: node catalog/patchCobwebIds.mjs
 */
import fs from "node:fs";

const REGISTRY = "catalog/completeRegistry.json";
const BLOCKS_TS = "src/game/blocks.ts";
const SHAPES = "catalog/block-shapes.json";
const THUMBS_CACHE = "catalog/thumbnailsCache.json";

const COBWEB_TILE = 299;

const NEW_ENTRIES = [
  {
    id: 1207,
    name: "Cobweb Sparse",
    category: "building",
    side: COBWEB_TILE,
    top: COBWEB_TILE,
    bottom: COBWEB_TILE,
    solid: 0,
    trans: 1,
    textureFiles: ["cobweb.png"],
  },
  {
    id: 1208,
    name: "Cobweb Dense",
    category: "building",
    side: COBWEB_TILE,
    top: COBWEB_TILE,
    bottom: COBWEB_TILE,
    solid: 0,
    trans: 1,
    textureFiles: ["cobweb.png"],
  },
  {
    id: 1209,
    name: "Spider Egg",
    category: "item",
    solid: 0,
    itemTexture: "spider_eye.png",
  },
  {
    id: 1210,
    name: "Mug",
    category: "decoration",
    side: 865,
    top: 865,
    bottom: 865,
    solid: 0,
    trans: 1,
    textureFiles: ["white_terracotta.png"],
  },
];

function transform(entries) {
  let touched = 0;
  const byId = new Map(entries.map((e) => [e.id, e]));
  // 259 → walk-through alpha web (was a solid opaque cube)
  const web = byId.get(259);
  if (web) {
    if (web.solid !== 0) { web.solid = 0; touched++; console.log("cobweb 259: solid 1 → 0"); }
    if (web.trans !== 1) { web.trans = 1; touched++; console.log("cobweb 259: trans → 1"); }
  } else {
    console.log("WARN: id 259 missing from registry, skipping web update");
  }
  for (const n of NEW_ENTRIES) {
    if (!byId.has(n.id)) {
      entries.push({ ...n });
      byId.set(n.id, n);
      touched++;
      console.log(`add ${n.name}: ${n.id}`);
    }
  }
  entries.sort((a, b) => a.id - b.id);
  return touched;
}

// ── 1. completeRegistry.json ──
{
  const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  const n = transform(registry);
  fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2));
  console.log(`registry: ${n} changes`);
}

// ── 2. src/game/blocks.ts (embedded BLOCKS array only) ──
{
  const src = fs.readFileSync(BLOCKS_TS, "utf8");
  const m = src.match(/export const BLOCKS: BlockDef\[\] = (\[[\s\S]*?\]);/);
  if (!m) throw new Error("BLOCKS array not found in blocks.ts");
  const entries = JSON.parse(m[1]);
  const n = transform(entries);
  entries.sort((a, b) => a.id - b.id);
  const newArray = JSON.stringify(entries, null, 2);
  const out = src.slice(0, m.index) + "export const BLOCKS: BlockDef[] = " + newArray + ";" + src.slice(m.index + m[0].length);
  fs.writeFileSync(BLOCKS_TS, out);
  console.log(`blocks.ts: ${n} changes`);
}

// ── 3. block-shapes.json (catalog UI taxonomy: cube | cross | flat | 3d | item) ──
{
  const shapes = JSON.parse(fs.readFileSync(SHAPES, "utf8"));
  let n = 0;
  for (const [id, shape] of [["259", "cross"], ["1207", "cross"], ["1208", "cross"], ["1210", "3d"]]) {
    if (shapes[id] !== shape) { shapes[id] = shape; n++; console.log(`shape ${id} → ${shape}`); }
  }
  fs.writeFileSync(SHAPES, JSON.stringify(shapes, null, 2));
  console.log(`block-shapes: ${n} changes`);
}

// ── 4. thumbnailsCache.json (copy web + spider-eye icons; export afterwards) ──
{
  const cache = JSON.parse(fs.readFileSync(THUMBS_CACHE, "utf8"));
  let n = 0;
  const copy = (from, to) => {
    if (cache[from] !== undefined && cache[to] === undefined) {
      cache[to] = cache[from];
      n++;
      console.log(`thumb ${from} → ${to}`);
    }
  };
  copy("259", "1207");
  copy("259", "1208");
  copy("1121", "1209"); // Spider Eye icon for the Spider Egg item
  fs.writeFileSync(THUMBS_CACHE, JSON.stringify(cache, null, 2));
  console.log(`thumbnails: ${n} icons copied`);
}

console.log("cobweb patch complete. (run catalog/exportThumbnails.mjs to export runtime JSON)");
