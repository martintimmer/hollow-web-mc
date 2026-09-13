/**
 * Flags animated blocks in catalog/completeRegistry.json from texture sources.
 *
 * For every textures/block/*.png that is taller than one tile (or has a
 * .mcmeta), resolves tile index via textureTileMap.json, finds all registry
 * blocks using that tile on any face, and stamps:
 *   animated: { frames, frametime, interpolate, frameOrder? }
 * Idempotent — rerun any time sources change.
 */
import fs from "node:fs";
import path from "node:path";

const TEX_DIR = "catalog/textures/block";
const TILE_MAP = "catalog/textureTileMap.json";
const REGISTRY = "catalog/completeRegistry.json";

function pngHeight(buf, file) {
  // minimal PNG parser: width/height live in IHDR at bytes 16..24
  if (buf.readUInt32BE(12) !== 0x49484452) throw new Error(`no IHDR in ${file}`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const tileMap = JSON.parse(fs.readFileSync(TILE_MAP, "utf8"));
const tileToFile = new Map();
for (const [file, tile] of Object.entries(tileMap)) {
  if (!tileToFile.has(tile)) tileToFile.set(tile, file);
}

const stripByTile = new Map(); // tile -> { file, frames, frametime, interpolate, frameOrder }
for (const file of fs.readdirSync(TEX_DIR)) {
  if (!file.endsWith(".png")) continue;
  const buf = fs.readFileSync(path.join(TEX_DIR, file));
  let h;
  try {
    ({ h } = pngHeight(buf, file));
  } catch {
    continue;
  }
  let mc = {};
  const mcPath = path.join(TEX_DIR, file + ".mcmeta");
  if (fs.existsSync(mcPath)) {
    try {
      mc = JSON.parse(fs.readFileSync(mcPath, "utf8")).animation || {};
    } catch (e) {
      console.warn(`bad mcmeta for ${file}: ${e.message}`);
    }
  }
  if (h <= 16 && Object.keys(mc).length === 0) continue;
  const tile = tileMap[file];
  if (tile === undefined) {
    console.warn(`no tile mapping for ${file} — skipped`);
    continue;
  }
  const frames = h > 16 ? Math.round(h / 16) : 1;
  stripByTile.set(tile, {
    file,
    frames,
    frametime: mc.frametime ?? 1,
    interpolate: mc.interpolate ?? false,
    frameOrder: Array.isArray(mc.frames) ? mc.frames : undefined,
  });
}

const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
let flagged = 0;
const flaggedNames = [];
for (const b of registry) {
  delete b.animated;
  const tiles = new Set([b.side, b.top, b.bottom].filter((t) => t !== undefined));
  let best = null;
  for (const t of tiles) {
    const s = stripByTile.get(t);
    if (s && (!best || s.frames > best.frames)) best = s;
  }
  if (best) {
    b.animated = { frames: best.frames, frametime: best.frametime, interpolate: best.interpolate };
    if (best.frameOrder) b.animated.frameOrder = best.frameOrder;
    flagged++;
    flaggedNames.push(`${b.id} ${b.name} <- ${best.file}`);
  }
}

fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + "\n");
console.log(`flagged ${flagged} blocks`);
for (const line of flaggedNames.sort((a, b) => parseInt(a) - parseInt(b))) console.log("  " + line);
