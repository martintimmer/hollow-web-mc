import * as THREE from "three";
import { createChestFaceImageData } from "../chest";
import { BLOCK_MAP } from "../blocks";
import { CUSTOM_FACE_TILES, customFaceTile } from "./customFaceTiles";
import { isCustomAssetBlock } from "../customAssets";

const ATLAS_PNG_URL = "/textures/terrain_atlas.png";

let atlasFirstDraw = false;

export function isAtlasReady(): boolean {
  return atlasFirstDraw;
}

export interface TextureAtlasResult {
  atlasCanvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  isoThumbnails: Map<number, string>;
}

/**
 * Dedicated 512x512 celestial texture so sun/moon live in their own canvas instead of
 * sharing terrain-atlas slots 79/80 (which held acacia_log_top / acacia_sapling —
 * the infamous "wood block sun").
 * The image is laid out on the same 32x32-cell grid as the terrain atlas:
 * sun = tile 0 (x 0..16, y 496..512), moon = tile 1 (x 16..32, y 496..512).
 * This keeps the existing ATLAS_TILES UV math (createVoxelCelestialBox) unchanged.
 */
export function createCelestialTexture(): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 512;
  const g = cv.getContext("2d")!;
  // CanvasTexture has flipY=true → v=1 corresponds to the TOP row of the canvas image.
  // The UV cell (v 0.96875..1, u 0..1/32) therefore samples canvas rows 0..16 — the old
  // "bottom rows 496..512" placement landed on the flipped (empty) region → invisible sun.
  const top = 0, LEFT = 0, RIGHT = 16;

  // SUN (tile 0): single plain square core, vanilla-style (no rays)
  g.fillStyle = "#fff7ae";
  g.fillRect(LEFT + 3, top + 3, 10, 10);
  g.fillStyle = "#ffe53c";
  g.fillRect(LEFT + 5, top + 5, 6, 6);

  // MOON (tile 1): pale disc with craters
  g.fillStyle = "#e8e8e0";
  g.fillRect(RIGHT + 2, top + 2, 12, 12);
  g.fillStyle = "#d3d3ca";
  g.fillRect(RIGHT + 3, top + 6, 4, 4);
  g.fillRect(RIGHT + 8, top + 9, 3, 3);
  g.fillStyle = "#9fb2c2";
  g.fillRect(RIGHT + 4, top + 8, 2, 2);
  g.fillRect(RIGHT + 9, top + 3, 2, 2);

  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTextureAtlas(): TextureAtlasResult {
  const atlasCanvas = document.createElement("canvas");
  atlasCanvas.width = atlasCanvas.height = 512;
  const g = atlasCanvas.getContext("2d", { willReadFrequently: true })!;

  const authenticImg = new Image();
  authenticImg.src = ATLAS_PNG_URL;

  const texture = new THREE.CanvasTexture(atlasCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;

  const redrawAtlas = () => {
    if (authenticImg.naturalWidth > 0) {
      g.clearRect(0, 0, 512, 512);
      g.drawImage(authenticImg, 0, 0);
      atlasFirstDraw = true;

      // Default slot 877 to dark-border golden wood chest face
      try {
        const defChestSide = createChestFaceImageData("side");
        const col877 = 877 % 32;
        const row877 = Math.floor(877 / 32);
        g.clearRect(col877 * 16, row877 * 16, 16, 16);
        g.putImageData(defChestSide, col877 * 16, row877 * 16);
      } catch {}

      // Bake per-face custom tiles (torch top/bottom) from the block's shared
      // tile so the mesher can always sample them; a per-face override below
      // overwrites the slot when the editor saved a distinct face texture.
      for (const [key, slot] of Object.entries(CUSTOM_FACE_TILES)) {
        const idStr = key.slice(0, key.indexOf(":"));
        const def = BLOCK_MAP.get(Number(idStr));
        const srcTile = def ? (def.side ?? def.top ?? 0) : 0;
        const sc = srcTile % 32;
        const sr = Math.floor(srcTile / 32);
        const dc = slot % 32;
        const dr = Math.floor(slot / 32);
        g.putImageData(g.getImageData(sc * 16, sr * 16, 16, 16), dc * 16, dr * 16);
      }

      // Apply custom user-recolored overrides from Block Texture Editor
      try {
        const overrides = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
        // Apply generic numeric-tile overrides AFTER per-face (block_*) overrides
        // so a per-face copy can't clobber the canonical texture for a tile they
        // share (e.g. torch: side/top/bottom all resolve to tile 81 — the editor
        // writes tile 81 once from the side face, which must win).
        const entries = Object.entries(overrides).sort(([a], [b]) => {
          const aNum = /^\d+$/.test(a);
          const bNum = /^\d+$/.test(b);
          return (aNum ? 1 : 0) - (bNum ? 1 : 0);
        });
        for (const [key, dataUrl] of entries) {
          if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) continue;
          let tile = Number(key);
          if (isNaN(tile) && key.startsWith("block_")) {
            const parts = key.split("_");
            const bid = Number(parts[1]);
            // Custom asset blocks are rendered as discrete 3D entities with GLTF models and custom materials.
            // They do NOT occupy terrain atlas tiles and must NEVER overwrite vanilla terrain atlas tiles (like tile 1 = grass side).
            const bdef = BLOCK_MAP.get(bid);
            if (isCustomAssetBlock(bid) || (bdef && bdef.side === -1)) continue;

            const face = parts[parts.length - 1];
            const customSlot = customFaceTile(bid, face);
            if (customSlot != null) {
              tile = customSlot;
            } else {
              if (bdef) {
                tile = (face === "top" ? bdef.top : (face === "bottom" ? bdef.bottom : bdef.side)) ?? bdef.side ?? 0;
              }
            }
          }
          if (isNaN(tile) && key.startsWith("block_43")) tile = 877;
          if (!isNaN(tile) && tile >= 0 && tile < 1024) {
            const drawTile = (imgEl: HTMLImageElement) => {
              const col = tile % 32;
              const row = Math.floor(tile / 32);
              g.imageSmoothingEnabled = false;
              g.clearRect(col * 16, row * 16, 16, 16);
              g.drawImage(imgEl, col * 16, row * 16, 16, 16);
              scheduleTextureUpload();
            };
            let tileImg = imageCache.get(dataUrl);
            if (tileImg && tileImg.complete && tileImg.naturalWidth > 0) {
              drawTile(tileImg);
            } else if (tileImg) {
              tileImg.addEventListener("load", () => drawTile(tileImg!));
            } else {
              tileImg = new Image();
              imageCache.set(dataUrl, tileImg);
              tileImg.onload = () => drawTile(tileImg!);
              tileImg.src = dataUrl;
            }
          }
        }
      } catch {}

      scheduleTextureUpload();
    }
  };

  const imageCache = new Map<string, HTMLImageElement>();

  let rafUploadId: number | null = null;
  function scheduleTextureUpload() {
    if (rafUploadId !== null) return;
    rafUploadId = requestAnimationFrame(() => {
      rafUploadId = null;
      texture.needsUpdate = true;
    });
  }

  if (authenticImg.complete && authenticImg.naturalWidth > 0) {
    redrawAtlas();
  } else {
    authenticImg.onload = redrawAtlas;
  }

  // Force re-load new textures whenever user saves in editor tab or focuses game
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === "mc_custom_atlas_overrides" || e.key === "mc_custom_atlas_version") {
        redrawAtlas();
      }
    });
    window.addEventListener("focus", () => {
      redrawAtlas();
    });
  }

  // Thumbnails are fetched lazily from /catalog/thumbnails.json (U4) — see
  // src/game/engine/thumbnails.ts. The map starts empty and is populated by
  // loadThumbnails() in Game.tsx after boot.
  const thumbs = new Map<number, string>();

  return {
    atlasCanvas,
    texture,
    isoThumbnails: thumbs
  };
}
