/**
 * @file catalog/generateAllThumbnails.js
 * Generates all 1,173 authentic 3D/2D thumbnails from Minecraft 1.19.3 assets.
 * Outputs:
 * - catalog/thumbnailsCache.json
 * - src/game/engine/thumbnailsData.ts
 */

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const BLOCK_DIR = path.resolve("catalog/textures/block");
const ITEM_DIR = path.resolve("catalog/textures/item");
const ENTITY_DIR = path.resolve("catalog/textures/entity");
const REGISTRY_JSON = path.resolve("catalog/completeRegistry.json");

const OUT_JSON = path.resolve("catalog/thumbnailsCache.json");
const OUT_TS = path.resolve("src/game/engine/thumbnailsData.ts");

function create16Png() {
  const p = new PNG({ width: 16, height: 16 });
  for (let i = 0; i < 16 * 16 * 4; i++) p.data[i] = 0;
  return p;
}

function loadPng(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath);
    return PNG.sync.read(data);
  } catch {
    return null;
  }
}

function pngToBase64(png) {
  const buffer = PNG.sync.write(png);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function fileToBase64(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath);
    const srcPng = PNG.sync.read(data);
    // Upscale 16x16 2D items and cutouts 4x to 64x64 with crisp pixelated nearest-neighbor sampling
    const scale = 4;
    const targetW = srcPng.width * scale;
    const targetH = srcPng.height * scale;
    const upscaled = new PNG({ width: targetW, height: targetH });
    for (let y = 0; y < targetH; y++) {
      const srcY = Math.floor(y / scale);
      for (let x = 0; x < targetW; x++) {
        const srcX = Math.floor(x / scale);
        const sIdx = (srcY * srcPng.width + srcX) * 4;
        const dIdx = (y * targetW + x) * 4;
        upscaled.data[dIdx] = srcPng.data[sIdx];
        upscaled.data[dIdx + 1] = srcPng.data[sIdx + 1];
        upscaled.data[dIdx + 2] = srcPng.data[sIdx + 2];
        upscaled.data[dIdx + 3] = srcPng.data[sIdx + 3];
      }
    }
    return pngToBase64(upscaled);
  } catch {
    return null;
  }
}

/**
 * Render a 48x48 3D Isometric Cube Thumbnail from real 16x16 PNG face textures
 */
function render3DIsoCube(topPng, sideLeftPng, sideRightPng, tintTop = null) {
  const size = 48;
  const out = new PNG({ width: size, height: size });

  for (let i = 0; i < size * size * 4; i++) out.data[i] = 0;

  const cx = 24;
  const cy = 25;
  const rad = 22;
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);

  let tintR = 255, tintG = 255, tintB = 255;
  if (tintTop) {
    const n = parseInt(tintTop.replace("#", ""), 16);
    tintR = (n >> 16) & 255;
    tintG = (n >> 8) & 255;
    tintB = n & 255;
  }

  function setPixel(px, py, r, g, b, a) {
    if (px < 0 || px >= size || py < 0 || py >= size) return;
    const idx = (py * size + px) * 4;
    const srcA = a / 255;
    const dstA = out.data[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA > 0) {
      out.data[idx] = Math.round((r * srcA + out.data[idx] * dstA * (1 - srcA)) / outA);
      out.data[idx + 1] = Math.round((g * srcA + out.data[idx + 1] * dstA * (1 - srcA)) / outA);
      out.data[idx + 2] = Math.round((b * srcA + out.data[idx + 2] * dstA * (1 - srcA)) / outA);
      out.data[idx + 3] = Math.round(outA * 255);
    }
  }

  // 1. Top Face
  if (topPng) {
    for (let sy = 0; sy < 16; sy++) {
      for (let sx = 0; sx < 16; sx++) {
        const u = sx / 16;
        const v = sy / 16;
        const px = Math.round(cx + (u - v) * rad * cos30);
        const py = Math.round(cy - rad + (u + v) * rad * sin30);

        const srcIdx = (sy * topPng.width + sx) * 4;
        const sa = topPng.data[srcIdx + 3];
        if (sa > 0) {
          const sr = Math.round((topPng.data[srcIdx] * tintR) / 255);
          const sg = Math.round((topPng.data[srcIdx + 1] * tintG) / 255);
          const sb = Math.round((topPng.data[srcIdx + 2] * tintB) / 255);
          setPixel(px, py, Math.min(255, sr * 1.05), Math.min(255, sg * 1.05), Math.min(255, sb * 1.05), sa);
          setPixel(px + 1, py, Math.min(255, sr * 1.05), Math.min(255, sg * 1.05), Math.min(255, sb * 1.05), sa);
        }
      }
    }
  }

  // 2. Left Face
  if (sideLeftPng) {
    for (let sy = 0; sy < 16; sy++) {
      for (let sx = 0; sx < 16; sx++) {
        const u = sx / 16;
        const v = sy / 16;
        const px = Math.round(cx - (1 - u) * rad * cos30);
        const py = Math.round(cy - (1 - u) * rad * sin30 + v * rad);

        const srcIdx = (sy * sideLeftPng.width + sx) * 4;
        const sa = sideLeftPng.data[srcIdx + 3];
        if (sa > 0) {
          const sr = sideLeftPng.data[srcIdx] * 0.84;
          const sg = sideLeftPng.data[srcIdx + 1] * 0.84;
          const sb = sideLeftPng.data[srcIdx + 2] * 0.84;
          setPixel(px, py, sr, sg, sb, sa);
          setPixel(px + 1, py, sr, sg, sb, sa);
        }
      }
    }
  }

  // 3. Right Face
  if (sideRightPng) {
    for (let sy = 0; sy < 16; sy++) {
      for (let sx = 0; sx < 16; sx++) {
        const u = sx / 16;
        const v = sy / 16;
        const px = Math.round(cx + u * rad * cos30);
        const actualPy = Math.round(cy - u * rad * sin30 + v * rad);

        const srcIdx = (sy * sideRightPng.width + sx) * 4;
        const sa = sideRightPng.data[srcIdx + 3];
        if (sa > 0) {
          const sr = sideRightPng.data[srcIdx] * 0.68;
          const sg = sideRightPng.data[srcIdx + 1] * 0.68;
          const sb = sideRightPng.data[srcIdx + 2] * 0.68;
          setPixel(px, actualPy, sr, sg, sb, sa);
          setPixel(px + 1, actualPy, sr, sg, sb, sa);
        }
      }
    }
  }
  return pngToBase64(out);
}

function render3DIsoFence(plankPng) {
  if (!plankPng) return null;
  const size = 48;
  const out = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size * 4; i++) out.data[i] = 0;

  const cx = 24, cy = 25, rad = 22;
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);

  function setPixel(px, py, r, g, b, a) {
    if (px < 0 || px >= size || py < 0 || py >= size) return;
    const idx = (py * size + px) * 4;
    const srcA = a / 255;
    const dstA = out.data[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA > 0) {
      out.data[idx] = Math.round((r * srcA + out.data[idx] * dstA * (1 - srcA)) / outA);
      out.data[idx + 1] = Math.round((g * srcA + out.data[idx + 1] * dstA * (1 - srcA)) / outA);
      out.data[idx + 2] = Math.round((b * srcA + out.data[idx + 2] * dstA * (1 - srcA)) / outA);
      out.data[idx + 3] = Math.round(outA * 255);
    }
  }

  function drawBox(x0, y0, z0, x1, y1, z1) {
    // 1. Top face (+Y at y1)
    for (let sy = z0; sy < z1; sy++) {
      for (let sx = x0; sx < x1; sx++) {
        const u = sx / 16, v = sy / 16;
        const px = Math.round(cx + (u - v) * rad * cos30);
        const py = Math.round(cy - (y1 / 16) * rad + (u + v) * rad * sin30);
        const sIdx = (sy * plankPng.width + sx) * 4;
        const sa = plankPng.data[sIdx + 3];
        if (sa > 0) {
          setPixel(px, py, plankPng.data[sIdx], plankPng.data[sIdx + 1], plankPng.data[sIdx + 2], sa);
          setPixel(px + 1, py, plankPng.data[sIdx], plankPng.data[sIdx + 1], plankPng.data[sIdx + 2], sa);
        }
      }
    }
    // 2. Left/South face (+Z at z1)
    for (let sy = y0; sy < y1; sy++) {
      for (let sx = x0; sx < x1; sx++) {
        const u = sx / 16, v = (16 - sy) / 16;
        const px = Math.round(cx - (1 - (z1 / 16) - u) * rad * cos30);
        const py = Math.round(cy - (1 - (z1 / 16) - u) * rad * sin30 + v * rad);
        const sIdx = ((15 - sy) * plankPng.width + sx) * 4;
        const sa = plankPng.data[sIdx + 3];
        if (sa > 0) {
          const sr = plankPng.data[sIdx] * 0.84;
          const sg = plankPng.data[sIdx + 1] * 0.84;
          const sb = plankPng.data[sIdx + 2] * 0.84;
          setPixel(px, py, sr, sg, sb, sa);
          setPixel(px + 1, py, sr, sg, sb, sa);
        }
      }
    }
    // 3. Right/East face (+X at x1)
    for (let sy = y0; sy < y1; sy++) {
      for (let sz = z0; sz < z1; sz++) {
        const u = sz / 16, v = (16 - sy) / 16;
        const px = Math.round(cx + (u + (x1 / 16 - 0.5)) * rad * cos30);
        const py = Math.round(cy - (u - (x1 / 16 - 0.5)) * rad * sin30 + v * rad);
        const sIdx = ((15 - sy) * plankPng.width + sz) * 4;
        const sa = plankPng.data[sIdx + 3];
        if (sa > 0) {
          const sr = plankPng.data[sIdx] * 0.68;
          const sg = plankPng.data[sIdx + 1] * 0.68;
          const sb = plankPng.data[sIdx + 2] * 0.68;
          setPixel(px, py, sr, sg, sb, sa);
          setPixel(px + 1, py, sr, sg, sb, sa);
        }
      }
    }
  }

  // Draw Central Post: 4x16x4 px (6..10 in X, 6..10 in Z, 0..16 in Y)
  drawBox(6, 0, 6, 10, 16, 10);
  // Draw Upper Rail: 0..16 in X, 7..9 in Z, 12..15 in Y
  drawBox(0, 12, 7, 16, 15, 9);
  // Draw Lower Rail: 0..16 in X, 7..9 in Z, 6..9 in Y
  drawBox(0, 6, 7, 16, 9, 9);

  return pngToBase64(out);
}

function render3DIsoSlab(topPng, sideLeftPng, sideRightPng) {
  if (!topPng && !sideLeftPng && !sideRightPng) return null;
  const size = 48;
  const out = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size * 4; i++) out.data[i] = 0;

  const cx = 24, cy = 28, rad = 22;
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);

  function setPixel(px, py, r, g, b, a) {
    if (px < 0 || px >= size || py < 0 || py >= size) return;
    const idx = (py * size + px) * 4;
    const srcA = a / 255;
    const dstA = out.data[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA > 0) {
      out.data[idx] = Math.round((r * srcA + out.data[idx] * dstA * (1 - srcA)) / outA);
      out.data[idx + 1] = Math.round((g * srcA + out.data[idx + 1] * dstA * (1 - srcA)) / outA);
      out.data[idx + 2] = Math.round((b * srcA + out.data[idx + 2] * dstA * (1 - srcA)) / outA);
      out.data[idx + 3] = Math.round(outA * 255);
    }
  }

  // 1. Top face (at height y = 0.5 * rad)
  if (topPng) {
    for (let sy = 0; sy < 16; sy++) {
      for (let sx = 0; sx < 16; sx++) {
        const u = sx / 16;
        const v = sy / 16;
        const px = Math.round(cx + (u - v) * rad * cos30);
        const py = Math.round(cy - 0.5 * rad + (u + v) * rad * sin30);

        const srcIdx = (sy * topPng.width + sx) * 4;
        const sa = topPng.data[srcIdx + 3];
        if (sa > 0) {
          const sr = topPng.data[srcIdx];
          const sg = topPng.data[srcIdx + 1];
          const sb = topPng.data[srcIdx + 2];
          setPixel(px, py, Math.min(255, sr * 1.05), Math.min(255, sg * 1.05), Math.min(255, sb * 1.05), sa);
          setPixel(px + 1, py, Math.min(255, sr * 1.05), Math.min(255, sg * 1.05), Math.min(255, sb * 1.05), sa);
        }
      }
    }
  }

  // 2. Left / South Face (bottom 8 rows)
  if (sideLeftPng) {
    for (let sy = 8; sy < 16; sy++) {
      for (let sx = 0; sx < 16; sx++) {
        const u = sx / 16;
        const v = (sy - 8) / 16;
        const px = Math.round(cx - (1 - u) * rad * cos30);
        const py = Math.round(cy - (1 - u) * rad * sin30 + v * rad);

        const srcIdx = (sy * sideLeftPng.width + sx) * 4;
        const sa = sideLeftPng.data[srcIdx + 3];
        if (sa > 0) {
          const sr = sideLeftPng.data[srcIdx] * 0.84;
          const sg = sideLeftPng.data[srcIdx + 1] * 0.84;
          const sb = sideLeftPng.data[srcIdx + 2] * 0.84;
          setPixel(px, py, sr, sg, sb, sa);
          setPixel(px + 1, py, sr, sg, sb, sa);
        }
      }
    }
  }

  // 3. Right / East Face (bottom 8 rows)
  if (sideRightPng) {
    for (let sy = 8; sy < 16; sy++) {
      for (let sx = 0; sx < 16; sx++) {
        const u = sx / 16;
        const v = (sy - 8) / 16;
        const px = Math.round(cx + u * rad * cos30);
        const actualPy = Math.round(cy - u * rad * sin30 + v * rad);

        const srcIdx = (sy * sideRightPng.width + sx) * 4;
        const sa = sideRightPng.data[srcIdx + 3];
        if (sa > 0) {
          const sr = sideRightPng.data[srcIdx] * 0.68;
          const sg = sideRightPng.data[srcIdx + 1] * 0.68;
          const sb = sideRightPng.data[srcIdx + 2] * 0.68;
          setPixel(px, actualPy, sr, sg, sb, sa);
          setPixel(px + 1, actualPy, sr, sg, sb, sa);
        }
      }
    }
  }

  return pngToBase64(out);
}

async function main() {
  console.log("Generating Authentic Thumbnails for all 1,173 Registry Entries...");

  const registry = JSON.parse(fs.readFileSync(REGISTRY_JSON, "utf8"));
  const thumbnailsMap = {};
  let renderedCount = 0;

  const blockFiles = fs.readdirSync(BLOCK_DIR);
  const itemFiles = fs.readdirSync(ITEM_DIR);

  for (const entry of registry) {
    const id = entry.id;
    if (id === 0) continue;

    const cleanSnake = entry.name.toLowerCase().replace(/[\s\-\(\)\'\.]+/g, "_").replace(/_+$/, "");

    // 1. Check if it's an Item
    if (entry.itemTexture || entry.category === "item" || entry.category === "tools" || entry.category === "combat" || entry.category === "food") {
      let filename = entry.itemTexture || `${cleanSnake}.png`;
      let fullPath = path.join(ITEM_DIR, filename);

      if (!fs.existsSync(fullPath)) {
        // Try finding matching item PNG
        const match = itemFiles.find(f => f.startsWith(cleanSnake) || cleanSnake.startsWith(f.replace(/\.png$/, "")));
        if (match) fullPath = path.join(ITEM_DIR, match);
      }

      const b64 = fileToBase64(fullPath);
      if (b64) {
        thumbnailsMap[id] = b64;
        renderedCount++;
        continue;
      }
    }

    // 2. Check if it's a Flat Cutout Block (Torch, Flower, Sapling, Rail, Lantern)
    const isCutout = entry.name.includes("Torch") ||
                     entry.name.includes("Flower") ||
                     entry.name.includes("Dandelion") ||
                     entry.name.includes("Poppy") ||
                     entry.name.includes("Tulip") ||
                     entry.name.includes("Orchid") ||
                     entry.name.includes("Sapling") ||
                     entry.name.includes("Lantern") ||
                     entry.name.includes("Rail") ||
                     entry.name.includes("Chain") ||
                     entry.name.includes("Bars") ||
                     entry.name.includes("Door") ||
                     entry.name.includes("Mushroom") ||
                     ((entry.name.includes("Grass") || entry.name.includes("Fern")) && !/grass block/i.test(entry.name));

    if (isCutout) {
      let blockMatch = blockFiles.find(f => f.startsWith(cleanSnake) || cleanSnake.startsWith(f.replace(/\.png$/, "")));
      if (blockMatch) {
        const fullPath = path.join(BLOCK_DIR, blockMatch);
        const b64 = fileToBase64(fullPath);
        if (b64) {
          thumbnailsMap[id] = b64;
          renderedCount++;
          continue;
        }
      }
    }

    // 3. Custom Entity / Chest Rendering
    if (id === 43 || cleanSnake === "chest" || cleanSnake === "ender_chest" || cleanSnake === "trapped_chest") {
      const chestPngPath = cleanSnake === "ender_chest"
        ? path.join(ENTITY_DIR, "chest/ender.png")
        : cleanSnake === "trapped_chest"
        ? path.join(ENTITY_DIR, "chest/trapped.png")
        : path.join(ENTITY_DIR, "chest/normal.png");
      if (fs.existsSync(chestPngPath)) {
        const chestPng = PNG.sync.read(fs.readFileSync(chestPngPath));
        const topPng = create16Png();
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            const sx = Math.min(13, Math.max(0, x - 1)) + 14;
            const sy = Math.min(13, Math.max(0, y - 1)) + 0;
            const sIdx = (sy * 64 + sx) * 4;
            const dIdx = (y * 16 + x) * 4;
            for (let c = 0; c < 4; c++) topPng.data[dIdx + c] = chestPng.data[sIdx + c];
          }
        }
        const sidePng = create16Png();
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            const sx = Math.min(13, Math.max(0, x - 1)) + 0;
            let sy = y < 5 ? 14 + y : (y < 15 ? 33 + (y - 5) : 42);
            const sIdx = (sy * 64 + sx) * 4;
            const dIdx = (y * 16 + x) * 4;
            for (let c = 0; c < 4; c++) sidePng.data[dIdx + c] = chestPng.data[sIdx + c];
          }
        }
        const frontPng = create16Png();
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            const sx = Math.min(13, Math.max(0, x - 1)) + 14;
            let sy = y < 5 ? 14 + y : (y < 15 ? 33 + (y - 5) : 42);
            const sIdx = (sy * 64 + sx) * 4;
            const dIdx = (y * 16 + x) * 4;
            for (let c = 0; c < 4; c++) frontPng.data[dIdx + c] = chestPng.data[sIdx + c];
          }
        }
        for (let ly = 0; ly < 4; ly++) {
          for (let lx = 0; lx < 2; lx++) {
            const sx = lx + 1;
            const sy = ly + 1;
            const sIdx = (sy * 64 + sx) * 4;
            const dx = lx + 7;
            const dy = ly + 4;
            const dIdx = (dy * 16 + dx) * 4;
            for (let c = 0; c < 4; c++) frontPng.data[dIdx + c] = chestPng.data[sIdx + c];
          }
        }
        const b64 = render3DIsoCube(topPng, sidePng, frontPng, null);
        if (b64) {
          thumbnailsMap[id] = b64;
          renderedCount++;
          continue;
        }
      }
    }

    // 4. Check if it's a Fence
    if (entry.fence || (entry.name && entry.name.toLowerCase().includes("fence") && !entry.name.toLowerCase().includes("gate") && !entry.name.toLowerCase().includes("particle"))) {
      let plankFile = null;
      if (entry.textureFiles && entry.textureFiles.length > 0) {
        plankFile = entry.textureFiles[0];
      }
      if (!plankFile) {
        const match = blockFiles.find(f => f.startsWith(cleanSnake) || cleanSnake.startsWith(f.replace(/\.png$/, "")));
        plankFile = match || "oak_planks.png";
      }
      const plankPng = loadPng(path.join(BLOCK_DIR, plankFile)) || loadPng(path.join(BLOCK_DIR, "oak_planks.png"));
      const b64 = render3DIsoFence(plankPng);
      if (b64) {
        thumbnailsMap[id] = b64;
        renderedCount++;
        continue;
      }
    }

    // 5. Check if it's a Slab
    if (entry.slab || (entry.name && entry.name.toLowerCase().includes("slab"))) {
      let topFile = null, sideFile = null, frontFile = null;

      if (entry.textureFiles && entry.textureFiles.length > 0) {
        for (const tf of entry.textureFiles) {
          if (tf.includes("_top") || tf.includes("_end")) topFile = tf;
          else if (tf.includes("_front")) frontFile = tf;
          else if (tf.includes("_side") || !sideFile) sideFile = tf;
        }
      }

      if (!sideFile) {
        const match = blockFiles.find(f => f.startsWith(cleanSnake) || cleanSnake.startsWith(f.replace(/\.png$/, "")));
        sideFile = match || "stone.png";
      }
      if (!topFile) topFile = sideFile;
      if (!frontFile) frontFile = sideFile;

      const topPng = loadPng(path.join(BLOCK_DIR, topFile));
      const sidePng = loadPng(path.join(BLOCK_DIR, sideFile));
      const frontPng = loadPng(path.join(BLOCK_DIR, frontFile));

      const b64 = render3DIsoSlab(topPng, sidePng, frontPng);
      if (b64) {
        thumbnailsMap[id] = b64;
        renderedCount++;
        continue;
      }
    }

    // 6. 3D Solid / Stair Cube
    let topFile = null, sideFile = null, frontFile = null;

    if (id === 1 || cleanSnake === "grass_block") {
      topFile = "grass_block_top.png";
      sideFile = "grass_block_side.png";
      frontFile = "grass_block_side.png";
    } else if (entry.textureFiles && entry.textureFiles.length > 0) {
      for (const tf of entry.textureFiles) {
        if (tf.includes("_top") || tf.includes("_end")) topFile = tf;
        else if (tf.includes("_front")) frontFile = tf;
        else if (tf.includes("_side") || !sideFile) sideFile = tf;
      }
    }

    if (!sideFile) {
      const match = blockFiles.find(f => f.startsWith(cleanSnake) || cleanSnake.startsWith(f.replace(/\.png$/, "")));
      sideFile = match || "stone.png";
    }
    if (!topFile) topFile = sideFile;
    if (!frontFile) frontFile = sideFile;

    const topPng = loadPng(path.join(BLOCK_DIR, topFile));
    const sidePng = loadPng(path.join(BLOCK_DIR, sideFile));
    const frontPng = loadPng(path.join(BLOCK_DIR, frontFile));

    let tint = null;
    if (entry.name.includes("Grass")) tint = "#79c05a";
    if (entry.name.includes("Leaves") || entry.foliage) tint = "#59ae30";

    const b64 = render3DIsoCube(topPng, sidePng, frontPng, tint);
    if (b64) {
      thumbnailsMap[id] = b64;
      renderedCount++;
    }
  }

  console.log(`Generated ${renderedCount} / ${registry.length} thumbnails.`);

  // Write JSON cache + the runtime asset (thumbnails are fetched at boot — U4)
  fs.writeFileSync(OUT_JSON, JSON.stringify(thumbnailsMap, null, 2));
  fs.mkdirSync("public/catalog", { recursive: true });
  fs.writeFileSync("public/catalog/thumbnails.json", JSON.stringify(thumbnailsMap));
  console.log(`Saved thumbnails cache to ${OUT_JSON} and /public/catalog/thumbnails.json`);
}

main().catch(err => {
  console.error("Thumbnail generation failed:", err);
  process.exit(1);
});
