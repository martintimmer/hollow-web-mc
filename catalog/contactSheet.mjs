/**
 * @file catalog/contactSheet.mjs
 * Builds two visual artifacts from the runtime atlas for the first 32 block ids:
 *  - snapshots/tiles-bedrock-slab.png  (slab view: side tile, scaled 3x)
 *  (Per-face crops + filenames are printed; the montage is inspected for sanity.)
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
const byId = {};
for (const b of BLOCKS) byId[b.id] = b;
const START = parseInt(process.env.START ?? "1", 10);
const COUNT = parseInt(process.env.COUNT ?? "32", 10);

const CROP = (tile) => {
  const T = 16, R = 32;
  const gx = (tile % R) * T, gy = Math.floor(tile / R) * T;
  const out = new PNG({ width: 16, height: 16 });
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const si = ((gy + y) * atlas.width + (gx + x)) * 4;
    const di = (y * 16 + x) * 4;
    for (let k = 0; k < 4; k++) out.data[di + k] = atlas.data[si + k];
  }
  return out;
};
const scale3 = (png) => {
  const o = new PNG({ width: 48, height: 48 });
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const si = ((y >> 1) * 16 + (x >> 1)) * 4;
    const di = (y * 48 + x) * 4;
    for (let k = 0; k < 4; k++) o.data[di + k] = png.data[si + k];
  }
  return o;
};

// Montage: 8 columns x 4 rows of side tiles (48px cell + 8px separator)
const W = 8 * 56, H = 4 * 56;
const sheet = new PNG({ width: W, height: H });
for (let i = 0; i < W * H * 4; i++) sheet.data[i] = 0;
for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) {
  const xx = j * 56 + 4, yy = i * 56 + 4;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const si = (y * 48 + x) * 4;
    const di = ((yy + y) * W + (xx + x)) * 4;
    for (let k = 0; k < 4; k++) sheet.data[di + k] = sheet.data[di + k]; // placeholder
  }
}
// Explicit montage writer (separators above)
const blocks = [];
for (let i = 0; i < COUNT; i++) {
  const b = byId[START + i];
  blocks.push(b);
  const tile = b.side ?? 3;
  const c = scale3(CROP(tile));
  const row = i >> 3, col = i & 7;
  const xx = col * 56 + 4, yy = row * 56 + 4;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const si = (y * 48 + x) * 4;
    const di = ((yy + y) * W + (xx + x)) * 4;
    sheet.data[di] = c.data[si]; sheet.data[di + 1] = c.data[si + 1]; sheet.data[di + 2] = c.data[si + 2]; sheet.data[di + 3] = 255;
  }
}
fs.writeFileSync("snapshots/tiles-check-32.png", PNG.sync.write(sheet));

console.log("montage rows = 8 cols x 4 rows; index = (row*8)+col");
for (let i = 0; i < COUNT; i++) {
  const b = byId[START + i];
  const f = inv[b.side] ?? "-";
  const a = CROP(b.side);
  let m2 = 0, vib = 0; let n = 0;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const di = (y * 16 + x) * 4; const r = a.data[di], gg = a.data[di + 1], bb = a.data[di + 2];
    if (a.data[di + 3] === 0) continue; n++;
    m2 += (r + gg + bb) / 3; vib += Math.abs(r - gg) + Math.abs(gg - bb) + Math.abs(r - bb);
  }
  console.log(`${i+1}\t${b.id}\t${b.name}\ttile=${b.side} (${f})\tmean=${n ? (m2 / n).toFixed(0) : "-"}\tchroma=${n ? (vib / n).toFixed(0) : "-"}\topaque=${n}/256`);
}
