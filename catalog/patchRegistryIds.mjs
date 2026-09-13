/**
 * @file catalog/patchRegistryIds.mjs
 * Idempotent fix for the id 700–710 collision (KNOWN_ISSUES U7):
 *
 *   blocks.ts (and completeRegistry.json) list TWO families at ids 700–710:
 *     1. colored/decoration BLOCKS (White Terracotta … Yellow Terracotta)  — no itemTexture
 *     2. ITEMS (Acacia Boat … Bamboo Chest Raft)                          — itemTexture
 *   BLOCK_MAP is built by `new Map(BLOCKS.map(b => [b.id, b]))` so the item
 *   entries silently overwrite the block entries, losing 11 placeable blocks.
 *
 * This patch:
 *   - renumbers the colliding ITEMS 700..710 → 1163..1172 (free, after Red bed 1162)
 *   - assigns the 11 blocks their real atlas tiles (from textureTileMap.json)
 *   - converts `isItemOnly` from the magic `id >= 700` to semantic detection
 *     (itemTexture presence OR item/tools/combat/food category) — this also
 *     stops the Red bed (id 1162) from being misclassified as item-only
 *   - remaps thumbnails: item thumbs move with the renumber; the blocks get
 *     their own flat side-texture icons
 *
 * Run: node catalog/patchRegistryIds.mjs   (safe to run repeatedly)
 */
import fs from "node:fs";
import path from "node:path";

const REGISTRY = "catalog/completeRegistry.json";
const BLOCKS_TS = "src/game/blocks.ts";
const THUMBS_CACHE = "catalog/thumbnailsCache.json";
const TILEMAP = "catalog/textureTileMap.json";
const BLOCK_DIR = "catalog/textures/block";

const ITEM_CATS = new Set(["item", "tools", "combat", "food"]);
const isItem = (e) => !!e.itemTexture || ITEM_CATS.has(e.category);

const tileMap = JSON.parse(fs.readFileSync(TILEMAP, "utf8"));

function tileFor(entry) {
  if (entry.textureFiles && entry.textureFiles.length) {
    const hit = entry.textureFiles.find((f) => tileMap[f] !== undefined);
    if (hit) return tileMap[hit];
  }
  const cleanSnake = entry.name.toLowerCase().replace(/[\s\-()'.]+/g, "_").replace(/_+$/, "");
  if (tileMap[`${cleanSnake}.png`] !== undefined) return tileMap[`${cleanSnake}.png`];
  return null;
}

function fileToBase64(relPath) {
  const p = path.join(BLOCK_DIR, relPath);
  if (!fs.existsSync(p)) return null;
  return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
}

// ── 1. Transform a parsed registry array in place ──
function transform(entries) {
  let nextFree = 1163; // first free id after Red bed (1162)
  const used = new Set(entries.map((e) => e.id));
  while (used.has(nextFree)) nextFree++;

  let moved = 0, tiled = 0;
  for (const e of entries) {
    if (isItem(e)) {
      if (e.id >= 700 && e.id <= 710) {
        while (used.has(nextFree)) nextFree++;
        const old = e.id;
        e.id = nextFree;
        used.add(nextFree);
        nextFree++;
        console.log(`renumber item ${e.name}: ${old} → ${e.id}`);
        moved++;
      }
    } else if (e.id >= 700 && e.id <= 710) {
      const t = tileFor(e);
      if (t != null && (e.side !== t || e.top !== t || e.bottom !== t)) {
        e.side = t; e.top = t; e.bottom = t;
        console.log(`tile ${e.name} (${e.id}) → ${t}`);
        tiled++;
      }
    }
  }
  return { moved, tiled };
}

// ── 2. completeRegistry.json ──
{
  const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  const { moved, tiled } = transform(registry);
  fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2));
  console.log(`registry: ${moved} items renumbered, ${tiled} blocks tiled`);
}

// ── 3. src/game/blocks.ts ──
{
  let src = fs.readFileSync(BLOCKS_TS, "utf8");
  const m = src.match(/export const BLOCKS: BlockDef\[\] = (\[[\s\S]*?\]);/);
  if (!m) throw new Error("BLOCKS array not found in blocks.ts");
  const entries = JSON.parse(m[1]);
  const { moved, tiled } = transform(entries);
  const newArray = JSON.stringify(entries, null, 2);
  src = src.slice(0, m.index) + "export const BLOCKS: BlockDef[] = " + newArray + ";" + src.slice(m.index + m[0].length);

  // isItemOnly: semantic detection (drop the magic id >= 700 boundary)
  const oldIs = /export const isItemOnly = \(id: number\) => id >= 700 \|\| BLOCK_MAP\.get\(id\)\?\.category === "item" \|\| BLOCK_MAP\.get\(id\)\?\.category === "tools" \|\| BLOCK_MAP\.get\(id\)\?\.category === "combat" \|\| BLOCK_MAP\.get\(id\)\?\.category === "food";/;
  const newIs = `export const isItemOnly = (id: number) => {
  const b = BLOCK_MAP.get(id);
  return !!b?.itemTexture || b?.category === "item" || b?.category === "tools" || b?.category === "combat" || b?.category === "food";
};`;
  if (!oldIs.test(src)) throw new Error("isItemOnly signature not found (already patched?)");
  src = src.replace(oldIs, newIs);
  fs.writeFileSync(BLOCKS_TS, src);
  console.log(`blocks.ts: ${moved} items renumbered, ${tiled} blocks tiled, isItemOnly updated`);
}

// ── 4. Thumbnails: move item icons, add block icons ──
{
  const cache = JSON.parse(fs.readFileSync(THUMBS_CACHE, "utf8"));
  // move item thumbs 700..710 → 1163..1172 (only if target not already present)
  let moved = 0;
  for (let i = 0; i < 11; i++) {
    const from = String(700 + i), to = String(1163 + i);
    if (cache[from] !== undefined && cache[to] === undefined) {
      cache[to] = cache[from];
      moved++;
    }
  }
  // replace 700..710 with the 11 blocks' flat side-texture icons
  const files = [
    "white_terracotta.png", "white_tulip.png", "wither_rose.png", "yellow_candle.png",
    "yellow_concrete.png", "yellow_concrete_powder.png", "yellow_glazed_terracotta.png",
    "yellow_shulker_box.png", "yellow_stained_glass.png", "yellow_stained_glass_pane_top.png",
    "yellow_terracotta.png"
  ];
  for (let i = 0; i < 11; i++) {
    const b64 = fileToBase64(files[i]);
    if (b64) cache[String(700 + i)] = b64;
  }
  fs.writeFileSync(THUMBS_CACHE, JSON.stringify(cache, null, 2));
  console.log(`thumbnails: ${moved} item icons moved to 1163-1172, 11 block icons written`);
}

console.log("U7 patch complete. (run catalog/exportThumbnails.mjs to export runtime JSON)");
