/**
 * @file src/game/engine/thumbnails.ts
 * Runtime thumbnail loader (U4). Thumbnails are no longer baked into the JS
 * bundle — they live at /catalog/thumbnails.json (generated from
 * catalog/thumbnailsCache.json by catalog/exportThumbnails.mjs) and are fetched
 * once at boot, then held in an id → data-URI map.
 *
 * Also regenerates thumbnails for blocks whose atlas tile was overridden by the
 * Block Texture Editor, so hotbar/inventory icons reflect custom textures too.
 */
import { BLOCK_MAP } from "../blocks";
import { customFaceTile } from "./customFaceTiles";
import { renderBlockThumb3D } from "./liveThumbnails";
import { isCustomAssetBlock } from "../customAssets";

// Structural shapes get a real 3D object icon (door 2-tall, fence post + rails,
// trapdoor grille, stairs, slabs, torches, lanterns) instead of a flat tile.
const is3DShape = (def: { id?: number; name: string; stair?: number; slab?: number }) =>
  !!def.stair ||
  !!def.slab ||
  def.id === 1200 ||
  def.id === 1201 ||
  def.id === 1202 ||
  def.id === 1203 ||
  /large grass|high grass|tropical bush/i.test(def.name) ||
  (/door|trapdoor|fence/i.test(def.name) && !/gate|particle/i.test(def.name)) ||
  /torch|lantern/i.test(def.name);

let cache: Map<number, string> | null = null;
let inflight: Promise<Map<number, string>> | null = null;

// Helper: converts a data URI to a blob URL to release heap memory
function dataUriToObjectUrl(dataUri: string): string {
  if (!dataUri.startsWith("data:")) return dataUri;
  try {
    const parts = dataUri.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return dataUri;
  }
}

export function loadThumbnails(assetUrl = "/catalog/thumbnails.json"): Promise<Map<number, string>> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch(assetUrl)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`thumbnails ${r.status}`))))
    .then((raw: Record<string, string>) => {
      const map = new Map<number, string>();
      for (const [k, v] of Object.entries(raw)) {
        // Offload base64 strings into GPU/browser-managed ObjectURLs
        map.set(Number(k), dataUriToObjectUrl(v));
      }
      cache = map;
      return map;
    })
    .catch((err) => {
      inflight = null;
      console.warn("[thumbnails] load failed (UI icons degraded):", err);
      const empty = new Map<number, string>();
      cache = empty;
      return empty;
    });
  return inflight;
}

export function thumbnailsLoaded(): Map<number, string> | null {
  return cache;
}

const ATLAS_KEY = "mc_custom_atlas_overrides";
const ATLAS_TILES = 32;

// Mirrors the cutout decision in catalog/generateAllThumbnails.js so regenerated
// icons keep the same style (flat tile vs 3D iso cube) as the baked originals.
const CUTOUT_NAME = (name: string) =>
  (name.includes("Torch") || name.includes("Flower") || name.includes("Dandelion") ||
  name.includes("Poppy") || name.includes("Tulip") || name.includes("Orchid") ||
  name.includes("Sapling") || name.includes("Lantern") || name.includes("Rail") ||
  name.includes("Chain") || name.includes("Bars") || name.includes("Door") ||
  name.includes("Mushroom") || name.includes("Grass")) && !/grass block/i.test(name);

function tileCanvasFromAtlas(canvas: HTMLCanvasElement, tile: number): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 16;
  const g = cv.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingEnabled = false;
  g.drawImage(canvas, (tile % ATLAS_TILES) * 16, Math.floor(tile / ATLAS_TILES) * 16, 16, 16, 0, 0, 16, 16);
  return cv;
}

function tileCanvasFromDataUrl(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 16;
      const g = cv.getContext("2d", { willReadFrequently: true })!;
      g.imageSmoothingEnabled = false;
      g.drawImage(img, 0, 0, 16, 16);
      resolve(cv);
    };
    img.src = dataUrl;
  });
}

// Port of render3DIsoCube (generateAllThumbnails.js) driven by atlas tiles.
function renderIsoCubeFromTiles(top: HTMLCanvasElement | null, left: HTMLCanvasElement | null, right: HTMLCanvasElement | null): string {
  const size = 48;
  const out = document.createElement("canvas");
  out.width = out.height = size;
  const o = out.getContext("2d")!;
  const img = o.createImageData(size, size);
  const set = (px: number, py: number, r: number, g: number, b: number, a: number) => {
    if (px < 0 || px >= size || py < 0 || py >= size) return;
    const idx = (py * size + px) * 4;
    const sa = a / 255, da = img.data[idx + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa > 0) {
      img.data[idx] = Math.round((r * sa + img.data[idx] * da * (1 - sa)) / oa);
      img.data[idx + 1] = Math.round((g * sa + img.data[idx + 1] * da * (1 - sa)) / oa);
      img.data[idx + 2] = Math.round((b * sa + img.data[idx + 2] * da * (1 - sa)) / oa);
      img.data[idx + 3] = Math.round(oa * 255);
    }
  };
  const cx = 24, cy = 25, rad = 22;
  const cos30 = Math.cos(Math.PI / 6), sin30 = Math.sin(Math.PI / 6);
  const face = (tile: HTMLCanvasElement | null, mode: "top" | "left" | "right", scale: number) => {
    if (!tile) return;
    let tdata: Uint8ClampedArray | null = null;
    try {
      const g = tile.getContext("2d", { willReadFrequently: true });
      if (!g) return;
      tdata = g.getImageData(0, 0, 16, 16).data;
    } catch {
      return;
    }
    if (!tdata) return;
    for (let sy = 0; sy < 16; sy++) {
      for (let sx = 0; sx < 16; sx++) {
        const u = sx / 16, v = sy / 16;
        let px: number, py: number;
        if (mode === "top") {
          px = Math.round(cx + (u - v) * rad * cos30);
          py = Math.round(cy - rad + (u + v) * rad * sin30);
        } else if (mode === "left") {
          px = Math.round(cx - (1 - u) * rad * cos30);
          py = Math.round(cy - (1 - u) * rad * sin30 + v * rad);
        } else {
          px = Math.round(cx + u * rad * cos30);
          py = Math.round(cy - u * rad * sin30 + v * rad);
        }
        const si = (sy * 16 + sx) * 4;
        const a = tdata[si + 3];
        if (a > 0) {
          const r = Math.min(255, tdata[si] * scale);
          const g = Math.min(255, tdata[si + 1] * scale);
          const b = Math.min(255, tdata[si + 2] * scale);
          set(px, py, r, g, b, a);
          set(px + 1, py, r, g, b, a);
        }
      }
    }
  };
  face(top, "top", 1.05);
  face(left, "left", 0.84);
  face(right, "right", 0.68);
  o.putImageData(img, 0, 0);
  return out.toDataURL("image/png");
}

/**
 * Rebuilds the thumbnail for every block whose atlas tile is currently overridden.
 * Flat cutout blocks (torch, flowers, doors…) take the override image directly;
 * cubes get a 3D iso render from the (possibly overridden) atlas tiles.
 * Returns the ids → new data-URI (only entries that actually changed).
 */
export async function refreshOverrideThumbnails(atlasCanvas: HTMLCanvasElement | null): Promise<Map<number, string>> {
  let overrides: Record<string, string> = {};
  try {
    overrides = JSON.parse(localStorage.getItem(ATLAS_KEY) || "{}");
  } catch {}
  const tileOverrides: Record<number, string> = {};

  // Same precedence as atlas.ts redrawAtlas: per-face block_* keys first, then
  // generic numeric tile keys win for shared slots.
  const resolveTile = (key: string): number => {
    let tile = Number(key);
    if (isNaN(tile) && key.startsWith("block_")) {
      const parts = key.split("_");
      const bid = Number(parts[1]);
      const def = BLOCK_MAP.get(bid);
      if (isCustomAssetBlock(bid) || (def && def.side === -1)) return NaN;
      const face = parts[parts.length - 1];
      const customSlot = customFaceTile(bid, face);
      if (customSlot != null) {
        tile = customSlot;
      } else {
        if (def) {
          tile = (face === "top" ? def.top : (face === "bottom" ? def.bottom : def.side)) ?? def.side ?? 0;
        }
      }
    }
    if (isNaN(tile) && key.startsWith("block_43")) tile = 877;
    return tile;
  };
  const entries = Object.entries(overrides).filter(([, v]) => typeof v === "string" && v.startsWith("data:image/"));
  const sorted = [...entries.filter(([k]) => !/^\d+$/.test(k)), ...entries.filter(([k]) => /^\d+$/.test(k))];
  for (const [key, v] of sorted) {
    const tile = resolveTile(key);
    if (!isNaN(tile) && tile >= 0 && tile < 1024) tileOverrides[tile] = v;
  }
  const overriddenTiles = Object.keys(tileOverrides).map(Number);
  if (overriddenTiles.length === 0) return new Map();

  const tileBlocks: Record<number, number[]> = {};
  for (const def of BLOCK_MAP.values()) {
    if (isCustomAssetBlock(def.id) || def.side === -1) continue;
    const ts = new Set<number>();
    if (typeof def.side === "number" && def.side >= 0) ts.add(def.side);
    if (typeof def.top === "number" && def.top >= 0) ts.add(def.top);
    if (typeof def.bottom === "number" && def.bottom >= 0) ts.add(def.bottom);
    for (const face of ["side", "top", "bottom"]) {
      const slot = customFaceTile(def.id, face);
      if (slot != null) ts.add(slot);
    }
    for (const t of ts) (tileBlocks[t] || (tileBlocks[t] = [])).push(def.id);
  }

  const updated = new Map<number, string>();
  const faceFor = async (tile: number): Promise<HTMLCanvasElement | null> => {
    if (tileOverrides[tile] !== undefined) return tileCanvasFromDataUrl(tileOverrides[tile]);
    if (!atlasCanvas) return null;
    return tileCanvasFromAtlas(atlasCanvas, tile);
  };

  for (const tile of overriddenTiles) {
    for (const id of tileBlocks[tile] || []) {
      if (id <= 0 || id === 43) continue; // chest uses its own entity texture path
      const def = BLOCK_MAP.get(id);
      if (!def) continue;
      const sideTile = def.side ?? def.top ?? 0;
      if (atlasCanvas && is3DShape(def)) {
        // Real 3D object shape (door 2-tall, fence, trapdoor, stair, slab, torch…)
        const uri = renderBlockThumb3D(def, atlasCanvas);
        if (uri) updated.set(id, uri);
        continue;
      }
      if (CUTOUT_NAME(def.name)) {
        // Flat cutout: the override image is the 16×16 icon itself.
        const src = tileOverrides[sideTile] ?? tileOverrides[tile];
        if (src) updated.set(id, src);
        continue;
      }
      const topC = await faceFor(def.top ?? sideTile);
      const sideC = await faceFor(sideTile);
      updated.set(id, renderIsoCubeFromTiles(topC, sideC, sideC));
    }
  }
  return updated;
}
