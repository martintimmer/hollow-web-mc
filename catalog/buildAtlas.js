/**
 * @file catalog/buildAtlas.js
 * Builds authentic 1.19.3 Minecraft Texture Atlas from catalog PNGs.
 * Outputs:
 * 1. public/textures/terrain_atlas_1_19_3.png (512x512 Master Atlas)
 * 2. catalog/atlasMap.json (UV mapping coordinates)
 */

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { BLOCK_TEXTURE_MAP } from "./textureMap.js";

const BLOCK_DIR = path.resolve("catalog/textures/block");
const PUBLIC_DIR = path.resolve("public/textures");
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const ATLAS_SIZE = 512;
const TILE_SIZE = 16;
const TILES_PER_ROW = ATLAS_SIZE / TILE_SIZE; // 32x32 = 1024 slots

async function loadPng(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const data = fs.readFileSync(filePath);
  return new Promise((resolve) => {
    new PNG().parse(data, (error, data) => {
      if (error) return resolve(null);
      resolve(data);
    });
  });
}

function blitTile(targetAtlas, sourcePng, tileIndex, tintHex = null) {
  const gx = (tileIndex % TILES_PER_ROW) * TILE_SIZE;
  const gy = Math.floor(tileIndex / TILES_PER_ROW) * TILE_SIZE;

  let tintR = 255, tintG = 255, tintB = 255;
  if (tintHex) {
    const n = parseInt(tintHex.replace("#", ""), 16);
    tintR = (n >> 16) & 255;
    tintG = (n >> 8) & 255;
    tintB = n & 255;
  }

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const srcIdx = (y * sourcePng.width + x) * 4;
      const dstIdx = ((gy + y) * ATLAS_SIZE + (gx + x)) * 4;

      const a = sourcePng.data[srcIdx + 3];
      if (a > 0) {
        targetAtlas.data[dstIdx] = Math.round((sourcePng.data[srcIdx] * tintR) / 255);
        targetAtlas.data[dstIdx + 1] = Math.round((sourcePng.data[srcIdx + 1] * tintG) / 255);
        targetAtlas.data[dstIdx + 2] = Math.round((sourcePng.data[srcIdx + 2] * tintB) / 255);
        targetAtlas.data[dstIdx + 3] = a;
      }
    }
  }
}

async function main() {
  console.log("Assembling Official Minecraft 1.19.3 Master Texture Atlas...");
  const atlas = new PNG({ width: ATLAS_SIZE, height: ATLAS_SIZE });

  // Map to store tile coordinates for every texture filename
  const textureTileMap = new Map();
  const blockAtlasMap = {};
  let currentTileIndex = 0;

  // 1. Process all block definitions in BLOCK_TEXTURE_MAP
  for (const [idStr, def] of Object.entries(BLOCK_TEXTURE_MAP)) {
    const blockId = Number(idStr);
    const faces = {
      top: def.top || def.all || "stone.png",
      bottom: def.bottom || def.all || def.top || "stone.png",
      side: def.side || def.all || def.top || "stone.png",
      front: def.front || def.side || def.all || def.top || "stone.png"
    };

    const tileIndices = {};

    for (const [faceKey, filename] of Object.entries(faces)) {
      const fullPath = path.join(BLOCK_DIR, filename);
      let tileIdx = textureTileMap.get(filename);

      if (tileIdx === undefined) {
        const png = await loadPng(fullPath);
        if (png) {
          tileIdx = currentTileIndex++;
          const tint = (faceKey === "top" && def.tintTop) ? def.tintTop : (def.tintAll || null);
          blitTile(atlas, png, tileIdx, tint);
          textureTileMap.set(filename, tileIdx);
        } else {
          console.warn(`[atlas] Warning: Texture not found: ${filename}`);
          tileIdx = 0; // Fallback
        }
      }
      tileIndices[faceKey] = tileIdx;
    }

    blockAtlasMap[blockId] = {
      name: def.name,
      category: def.category,
      tiles: tileIndices,
      uv: {
        top: { u: (tileIndices.top % TILES_PER_ROW) / TILES_PER_ROW, v: Math.floor(tileIndices.top / TILES_PER_ROW) / TILES_PER_ROW },
        bottom: { u: (tileIndices.bottom % TILES_PER_ROW) / TILES_PER_ROW, v: Math.floor(tileIndices.bottom / TILES_PER_ROW) / TILES_PER_ROW },
        side: { u: (tileIndices.side % TILES_PER_ROW) / TILES_PER_ROW, v: Math.floor(tileIndices.side / TILES_PER_ROW) / TILES_PER_ROW },
        front: { u: (tileIndices.front % TILES_PER_ROW) / TILES_PER_ROW, v: Math.floor(tileIndices.front / TILES_PER_ROW) / TILES_PER_ROW }
      },
      transparent: !!def.transparent,
      emissive: !!def.emissive,
      stair: !!def.stair
    };
  }

  // 2. Write Atlas PNG to public/textures/terrain_atlas_1_19_3.png
  const atlasPath = path.join(PUBLIC_DIR, "terrain_atlas_1_19_3.png");
  const buffer = PNG.sync.write(atlas);
  fs.writeFileSync(atlasPath, buffer);
  console.log(`Saved master atlas to ${atlasPath} (${(buffer.length / 1024).toFixed(1)} KB)`);

  // 3. Write atlas mapping JSON
  const mapPath = path.join("catalog", "atlasMap.json");
  fs.writeFileSync(mapPath, JSON.stringify({
    version: "1.19.3",
    atlasSize: ATLAS_SIZE,
    tileSize: TILE_SIZE,
    tilesPerRow: TILES_PER_ROW,
    totalTilesUsed: currentTileIndex,
    blocks: blockAtlasMap
  }, null, 2));
  console.log(`Saved UV atlas map to ${mapPath}`);
}

main().catch(err => {
  console.error("Atlas generation failed:", err);
  process.exit(1);
});
