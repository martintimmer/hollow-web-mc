/**
 * @file catalog/patchCobwebThumbs.mjs
 * High-visibility inventory icons for the cobweb family + spider egg
 * (player request 2026-09-07 — the old icons were faint/blank at 36px slots):
 *
 *   259  Cobweb        → 96×96 flat web on a dark plate, 2 density pips
 *   1207 Cobweb Sparse → same, 1 pip
 *   1208 Cobweb Dense  → same, 3 pips
 *   1209 Spider Egg    → 96×96 procedural speckled egg (custom item, custom icon)
 *   1121 Spider Eye    → repaired 96×96 nearest-neighbor upscale (was a
 *                        degenerate 16×16 blank in the cache)
 *
 * Idempotent: safe to run repeatedly (overwrites only these five entries).
 * Writes catalog/thumbnailsCache.json AND public/catalog/thumbnails.json,
 * mirroring generateAllThumbnails.js output.
 *
 * Run: node catalog/patchCobwebThumbs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const BLOCK_DIR = "catalog/textures/block";
const ITEM_DIR = "catalog/textures/item";
const CACHE = "catalog/thumbnailsCache.json";
const PUBLIC = "public/catalog/thumbnails.json";

const SIZE = 96;

function loadPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function nnUpscale(src, size) {
  const out = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y * src.height) / size));
    for (let x = 0; x < size; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / size));
      const s = (sy * src.width + sx) * 4;
      const d = (y * size + x) * 4;
      out.data[d] = src.data[s];
      out.data[d + 1] = src.data[s + 1];
      out.data[d + 2] = src.data[s + 2];
      out.data[d + 3] = src.data[s + 3];
    }
  }
  return out;
}

function blend(dst, dx, dy, r, g, b, a) {
  if (dx < 0 || dy < 0 || dx >= dst.width || dy >= dst.height) return;
  const i = (dy * dst.width + dx) * 4;
  const sa = a / 255;
  const da = dst.data[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  dst.data[i] = Math.round((r * sa + dst.data[i] * da * (1 - sa)) / oa);
  dst.data[i + 1] = Math.round((g * sa + dst.data[i + 1] * da * (1 - sa)) / oa);
  dst.data[i + 2] = Math.round((b * sa + dst.data[i + 2] * da * (1 - sa)) / oa);
  dst.data[i + 3] = Math.round(oa * 255);
}

// Dark rounded plate so white web strands read on the mid-gray slot.
function paintPlate(out, inset, radius, r, g, b, a) {
  const s = out.width;
  for (let y = inset; y < s - inset; y++) {
    for (let x = inset; x < s - inset; x++) {
      const cx = Math.min(Math.max(x, inset + radius), s - inset - radius);
      const cy = Math.min(Math.max(y, inset + radius), s - inset - radius);
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) blend(out, x, y, r, g, b, a);
    }
  }
}

// Smooth upscale for the 1px web strands (nearest-neighbor turns them into
// chunky blocks at 96px); pixel-art items keep the crisp nnUpscale above.
function smoothUpscale(src, size) {
  const out = new PNG({ width: size, height: size });
  const px = (x, y, c) => {
    x = Math.min(src.width - 1, Math.max(0, x));
    y = Math.min(src.height - 1, Math.max(0, y));
    return src.data[(y * src.width + x) * 4 + c];
  };
  for (let y = 0; y < size; y++) {
    const gy = ((y + 0.5) * src.height) / size - 0.5;
    const y0 = Math.floor(gy);
    const fy = Math.min(1, Math.max(0, gy - y0));
    for (let x = 0; x < size; x++) {
      const gx = ((x + 0.5) * src.width) / size - 0.5;
      const x0 = Math.floor(gx);
      const fx = Math.min(1, Math.max(0, gx - x0));
      // Premultiplied-alpha bilinear so transparent edges stay clean
      let r = 0, g = 0, b = 0, a = 0;
      for (const [ox, oy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
        const sa = px(x0 + ox, y0 + oy, 3) / 255;
        r += (px(x0 + ox, y0 + oy, 0) * sa) * w;
        g += (px(x0 + ox, y0 + oy, 1) * sa) * w;
        b += (px(x0 + ox, y0 + oy, 2) * sa) * w;
        a += sa * w;
      }
      const d = (y * size + x) * 4;
      if (a > 0.003) {
        out.data[d] = Math.round(r / a);
        out.data[d + 1] = Math.round(g / a);
        out.data[d + 2] = Math.round(b / a);
        out.data[d + 3] = Math.round(Math.min(1, a) * 255);
      }
    }
  }
  return out;
}

function drawWebIcon(pips, mode) {
  const web = smoothUpscale(loadPng(path.join(BLOCK_DIR, "cobweb.png")), SIZE);
  const out = new PNG({ width: SIZE, height: SIZE });
  paintPlate(out, 3, 22, 22, 17, 12, 235);
  const webAt = (x, y) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    const s = (y * SIZE + x) * 4;
    if (web.data[s + 3] <= 0) return null;
    return [web.data[s], web.data[s + 1], web.data[s + 2], web.data[s + 3]];
  };
  const stamp = (x, y, px, brighten, alphaScale) => {
    if (!px) return;
    blend(out, x, y, Math.min(255, px[0] + brighten), Math.min(255, px[1] + brighten), Math.min(255, px[2] + brighten), Math.round(px[3] * alphaScale));
  };
  // Web layer over the plate. Sparse shows only a diagonal band (like the
  // single placed plane); dense layers a second offset sheet (like the
  // 4-plane placed block); medium is the full sheet.
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (mode === "band" && Math.abs(x / SIZE - y / SIZE) > 0.3) continue;
      stamp(x, y, webAt(x, y), 0, 1);
    }
  }
  if (mode === "layered") {
    const ox = 8, oy = -6;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        stamp(x, y, webAt(x - ox, y - oy), 18, 0.55);
      }
    }
  }
  // Density pips (1/2/3): white squares, dark outline, bottom-right
  const ps = 11;
  const gap = 4;
  const total = pips * ps + (pips - 1) * gap;
  let px = SIZE - 6 - total;
  const py = SIZE - 6 - ps;
  for (let p = 0; p < pips; p++) {
    for (let y = -2; y < ps + 2; y++) {
      for (let x = -2; x < ps + 2; x++) {
        const edge = x < 0 || y < 0 || x >= ps || y >= ps;
        if (edge && (x < -2 || y < -2 || x > ps + 1 || y > ps + 1)) continue;
        blend(out, px + x, py + y, ...(edge ? [20, 12, 8, 255] : [240, 235, 220, 255]));
      }
    }
    px += ps + gap;
  }
  return out;
}

function drawEggIcon() {
  const out = new PNG({ width: SIZE, height: SIZE });
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 4;
  const rx = 27;
  const ry = 33;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d <= 1) {
        // Warm off-white shell, shaded at the rim, soft top-left light
        const rim = Math.max(0, Math.min(1, (d - 0.55) / 0.45));
        const light = Math.max(0, 1 - (Math.hypot(x - (cx - 10), y - (cy - 12)) / 55));
        const base = 232 - Math.round(rim * 55) + Math.round(light * 18);
        blend(out, x, y, Math.min(255, base), Math.min(255, base - 12), Math.min(255, base - 38), 255);
      } else if (d <= 1.18) {
        blend(out, x, y, 58, 44, 28, 255); // shell outline
      }
    }
  }
  // Red spider speckles (deterministic positions)
  const spots = [
    [0.42, 0.3, 5], [0.58, 0.38, 4], [0.36, 0.52, 4], [0.62, 0.55, 5],
    [0.47, 0.62, 4], [0.55, 0.72, 3], [0.4, 0.78, 3], [0.6, 0.24, 3],
  ];
  for (const [fx, fy, fr] of spots) {
    const sx = Math.round(fx * SIZE);
    const sy = Math.round(fy * SIZE);
    for (let y = -fr; y <= fr; y++) {
      for (let x = -fr; x <= fr; x++) {
        if (x * x + y * y <= fr * fr) blend(out, sx + x, sy + y, 176, 48, 32, 255);
      }
    }
  }
  return out;
}

const toB64 = (png) => `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;

// Little terracotta mug: tapered body, dark rim + coffee surface, side handle.
function drawMugIcon() {
  const out = new PNG({ width: SIZE, height: SIZE });
  const body = [214, 200, 178];
  const shade = [168, 150, 128];
  const dark = [74, 58, 42];
  for (let y = 14; y < 84; y++) {
    const t = (y - 14) / 70;
    const wHalf = 20 + Math.round(t * 8); // taper outward downward
    for (let x = 34 - wHalf; x < 34 + wHalf; x++) {
      const edge = x <= 34 - wHalf + 1 || x >= 34 + wHalf - 2;
      const c = edge ? shade : body;
      blend(out, x, y, c[0], c[1], c[2], 255);
    }
  }
  // Rim + coffee
  for (let x = 12; x < 56; x++) {
    blend(out, x, 12, dark[0], dark[1], dark[2], 255);
    blend(out, x, 13, dark[0], dark[1], dark[2], 255);
  }
  for (let y = 15; y < 24; y++) {
    for (let x = 15; x < 53; x++) blend(out, x, y, 62, 40, 26, 255);
  }
  // Handle (right side)
  for (let y = 30; y < 62; y++) {
    for (let x = 60; x < 74; x++) {
      const outer = x >= 68 || y <= 33 || y >= 58;
      if (!outer) continue;
      const c = (x >= 71 || y <= 35 || y >= 56) ? dark : body;
      blend(out, x, y, c[0], c[1], c[2], 255);
    }
  }
  return out;
}

const cache = JSON.parse(fs.readFileSync(CACHE, "utf8"));
const made = {
  259: drawWebIcon(2, "full"),
  1207: drawWebIcon(1, "band"),
  1208: drawWebIcon(3, "layered"),
  1209: drawEggIcon(),
  1121: nnUpscale(loadPng(path.join(ITEM_DIR, "spider_eye.png")), SIZE),
  1210: drawMugIcon(),
};
for (const [id, png] of Object.entries(made)) {
  cache[id] = toB64(png);
  fs.writeFileSync(`/tmp/thumb-check-${id}.png`, PNG.sync.write(png));
  console.log(`thumb ${id}: ${png.width}x${png.height}, ${cache[id].length} chars`);
}
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
fs.writeFileSync(PUBLIC, JSON.stringify(cache));
console.log(`wrote ${CACHE} + ${PUBLIC} (preview PNGs in /tmp/thumb-check-*.png)`);
