/**
 * @file catalog/auditTextures2.mjs
 * Ground-truth audit against the RUNTIME block list (src/game/blocks.ts):
 *  - every face tile must be non-empty in the atlas (else renders black/invisible)
 *  - every face tile's source file should match the block's declared textureFiles (else wrong texture)
 */
import fs from "node:fs";
import { PNG } from "pngjs";

const atlas = PNG.sync.read(fs.readFileSync("public/textures/terrain_atlas.png"));
const tileMap = JSON.parse(fs.readFileSync("catalog/textureTileMap.json", "utf8"));
const inv = {};
for (const [f, t] of Object.entries(tileMap)) inv[t] = f;

const src = fs.readFileSync("src/game/blocks.ts", "utf8");
const m = src.match(/export const BLOCKS: BlockDef\[\] = (\[[\s\S]*?\]);\n/);
const BLOCKS = JSON.parse(m[1]);

function slotInfo(tile) {
  const TILE = 16, PER_ROW = 32;
  const gx = (tile % PER_ROW) * TILE, gy = Math.floor(tile / PER_ROW) * TILE;
  let sum = 0, n = 0, alphaMax = 0;
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const i = ((gy + y) * atlas.width + (gx + x)) * 4;
    const a = atlas.data[i + 3];
    if (a > alphaMax) alphaMax = a;
    if (a > 0) { sum += (atlas.data[i] + atlas.data[i + 1] + atlas.data[i + 2]) / 3; n++; }
  }
  return { a: alphaMax, mean: n ? sum / n : 0 };
}

const empty = [], black = [], nameMismatch = [], nonMatch = [];
const PLACEABLE_CATS = ["building","natural","ores","wood","utility","nether_end","colored","decoration","redstone","transportation"];

for (const b of BLOCKS) {
  if (!PLACEABLE_CATS.includes(b.category)) continue;
  const faces = { side: b.side, top: b.top, bottom: b.bottom };
  const declared = b.textureFiles || [];
  for (const [f, tile] of Object.entries(faces)) {
    if (tile == null) { continue; }
    const info = slotInfo(tile);
    const file = inv[tile] ?? "(EMPTY-SLOT)";
    if (info.a === 0) empty.push(`${b.name} (${b.id}) ${f}=${tile} → EMPTY (renders black/invisible)`);
    else if (info.mean < 12) black.push(`${b.name} (${b.id}) ${f}=${tile} → BLACK (${file})`);
    else if (declared.length && !declared.some(d => file.replace(".png","") === d.replace(".png",""))) {
      nonMatch.push(`${b.name} (${b.id}) ${f}=${tile} → "${file}" (declared: ${declared.slice(0,3).join(",")})`);
    }
  }
}
console.log(`EMPTY slots: ${empty.length}`);
console.log(empty.slice(0, 40).join("\n"));
console.log(`BLACK slots: ${black.length}`);
console.log(black.slice(0, 40).join("\n"));
console.log(`TILE-FILE not in declared textureFiles: ${nonMatch.length}`);
console.log(nonMatch.slice(0, 80).join("\n"));

// specific runtime checks
for (const id of [79, 80, 105, 106, 107, 108, 43, 24, 102, 124, 125, 126, 123, 127, 11, 39, 40, 1, 31]) {
  const b = BLOCKS.find(x => x.id === id);
  if (!b) continue;
  const t = b.side;
  console.log(`id ${id} [${b.name}] side=${b.side} top=${b.top} bot=${b.bottom} → slotFile=${inv[t ?? -1] ?? "-"}`);
}
