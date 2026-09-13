import * as THREE from "three";
import { BLOCKS, BLOCK_MAP, type BlockDef } from "./blocks";
import type { CustomAssetMeta } from "../services/customAssets";
import { buildVoxelMesh } from "./voxelMesh";
import { apiGetCustomAsset } from "../services/customAssets";

const metadata = new Map<number, CustomAssetMeta>();
const modelCache = new Map<number, THREE.Group>();
let thumbnailRenderer: THREE.WebGLRenderer | null = null;
let thumbnailScene: THREE.Scene | null = null;
let thumbnailCamera: THREE.PerspectiveCamera | null = null;
type CustomBlockDef = BlockDef & { customAssetId?: number };

export function customAssetYaw(facing: number): number {
  return [0, Math.PI, Math.PI / 2, -Math.PI / 2][((Math.round(facing) % 4) + 4) % 4] ?? 0;
}

function customBlockDef(def: BlockDef | undefined): CustomBlockDef | undefined {
  return def as CustomBlockDef | undefined;
}

function addBlockDef(asset: CustomAssetMeta): void {
  const existing = BLOCK_MAP.get(asset.id);
  if (existing) {
    existing.name = asset.name;
    existing.side = -1;
    existing.top = -1;
    existing.bottom = -1;
    (existing as CustomBlockDef).customAssetId = asset.id;
    metadata.set(asset.id, asset);
    return;
  }
  const def = {
    id: asset.id,
    name: asset.name,
    category: "decoration",
    side: -1,
    top: -1,
    bottom: -1,
    solid: 1,
    customAssetId: asset.id
  } as CustomBlockDef;
  BLOCKS.push(def);
  BLOCK_MAP.set(asset.id, def);
  metadata.set(asset.id, asset);
}

export function registerCustomAssets(assets: CustomAssetMeta[], dispatch = true): void {
  assets.forEach(addBlockDef);
  if (dispatch && typeof window !== "undefined") window.dispatchEvent(new Event("custom-assets-updated"));
}

export function isCustomAssetBlock(id: number): boolean {
  return !!customBlockDef(BLOCK_MAP.get(id))?.customAssetId;
}

export function getCustomAssetMeta(id: number): CustomAssetMeta | null {
  return metadata.get(id) || null;
}

export function getCustomAssetMetas(): CustomAssetMeta[] {
  return [...metadata.values()];
}

const voxelFetched = new Set<number>();

export async function ensureAssetVoxel(id: number): Promise<void> {
  const asset = metadata.get(id);
  if (!asset || asset.voxel || voxelFetched.has(id)) return;
  try {
    const full = await apiGetCustomAsset(id);
    if (full && (full as CustomAssetMeta).voxel) {
      asset.voxel = (full as CustomAssetMeta).voxel;
      modelCache.delete(id);
    }
  } catch {
  } finally {
    voxelFetched.add(id);
  }
}

export function clearCustomAssetModelCache(id?: number): void {
  if (id != null) {
    modelCache.delete(id);
  } else {
    modelCache.clear();
  }
}

if (typeof window !== "undefined") {
  (window as any).__debugCustomAssets = () => {
    const info: any = {
      buildTag: (window as any).__BUILD_TAG,
      block1199: (() => {
        try { const b = (window as any).BLOCK_MAP?.get?.(1199) || null; return b ? {id:b.id, name:b.name, side:b.side, customAssetId:(b as any).customAssetId} : null; } catch { return null; }
      })(),
      meta1199: metadata.get(1199) || null,
      cacheKeys: [...modelCache.keys()],
      cacheHas1199: modelCache.has(1199),
      thumbCount: 0,
      entities: 0,
      localStorage1199: (() => { try { const v = localStorage.getItem("mc_custom_atlas_overrides"); return v ? JSON.parse(v)["block_1199_single_side"]?.slice(0,30) : null; } catch { return null; } })()
    };
    try {
      // Try to get entities from Game state if available
      const s = (window as any).__s || (window as any).stateRef?.current;
      if (s && s.customAssetEntities) info.entities = s.customAssetEntities.size;
    } catch {}
    console.log("[debugCustomAssets]", info);
    return info;
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "mc_custom_atlas_overrides" || e.key === "mc_custom_atlas_version") {
      clearCustomAssetModelCache();
    }
  });
}

function loadTileData(url: string): Promise<{ w: number; h: number; data: Uint8ClampedArray } | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const cv = document.createElement("canvas");
          cv.width = img.naturalWidth || img.width;
          cv.height = img.naturalHeight || img.height;
          const ctx = cv.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          resolve({ w: cv.width, h: cv.height, data: ctx.getImageData(0, 0, cv.width, cv.height).data });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

export async function loadCustomAssetModel(id: number): Promise<THREE.Group | null> {
  const cached = modelCache.get(id);
  if (cached) return cached;
  await ensureAssetVoxel(id);
  const asset = metadata.get(id);
  if (!asset || !asset.voxel) return null;
  let side: string | null = null, top: string | null = null, bottom: string | null = null;
  let offset = { x: 0, y: 0, z: 0 };
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const o = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
      side = o[`block_${id}_single_side`] || o[`block_${id}_side`] || null;
      top = o[`block_${id}_single_top`] || o[`block_${id}_top`] || null;
      bottom = o[`block_${id}_single_bottom`] || o[`block_${id}_bottom`] || null;
      const offRaw = o[`block_${id}_offset`];
      if (typeof offRaw === "string") {
        const [ox, oy, oz] = offRaw.split(",").map(Number);
        if ([ox, oy, oz].every((v) => Number.isFinite(v))) offset = { x: ox, y: oy, z: oz };
      }
    } catch {}
  }
  const group = buildVoxelMesh(asset.voxel, { side, top, bottom }, offset, asset.voxel.tile ? await loadTileData(asset.voxel.tile) : null);
  modelCache.set(id, group);
  return group;
}

function ensureThumbnailRenderer(): boolean {
  if (typeof document === "undefined") return false;
  if (thumbnailRenderer && thumbnailScene && thumbnailCamera) return true;
  try {
    thumbnailRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    thumbnailRenderer.setSize(96, 96, false);
    thumbnailRenderer.setPixelRatio(1);
    thumbnailRenderer.outputColorSpace = THREE.SRGBColorSpace;
    thumbnailRenderer.setClearColor(0x000000, 0);
    thumbnailScene = new THREE.Scene();
    thumbnailScene.add(new THREE.HemisphereLight(0xffffff, 0x6f7b8c, 2.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 5, 4);
    thumbnailScene.add(key);
    const fill = new THREE.DirectionalLight(0x9ec5ff, 0.7);
    fill.position.set(-3, 2, -2);
    thumbnailScene.add(fill);
    thumbnailCamera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
    thumbnailCamera.position.set(2.6, 1.8, 2.6);
    thumbnailScene.add(thumbnailCamera);
    return true;
  } catch (error) {
    console.warn("[custom-assets] thumbnail renderer unavailable:", error);
    thumbnailRenderer?.dispose();
    thumbnailRenderer = null;
    thumbnailScene = null;
    thumbnailCamera = null;
    return false;
  }
}

function renderCustomAssetThumbnail(model: THREE.Group): string | null {
  if (!ensureThumbnailRenderer() || !thumbnailRenderer || !thumbnailScene || !thumbnailCamera) return null;
  // For 1199, bypass 3D entirely and use the first texture's image directly (guaranteed visible, like editor)
  try {
    let directUri: string | null = null;
    model.traverse((o: any) => {
      if (directUri || !o.isMesh) return;
      const mats: any = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        const tex: any = m.map as THREE.Texture | undefined;
        if (tex && tex.image) {
          try {
            const img: any = tex.image as HTMLImageElement | HTMLCanvasElement;
            const cv = document.createElement("canvas");
            cv.width = cv.height = 96;
            const g: any = cv.getContext("2d")!;
            g.imageSmoothingEnabled = false;
            g.clearRect(0, 0, 96, 96);
            g.fillStyle = "#8B8B8B";
            g.fillRect(0, 0, 96, 96);
            g.drawImage(img as any, 8, 8, 80, 80);
            directUri = cv.toDataURL("image/png");
            break;
          } catch {}
        }
      }
    });
    if (directUri) return directUri;
  } catch {}
  const root = model.clone(true);
  root.rotation.y = 0.55;
  root.updateMatrixWorld(true);
  const initialBounds = new THREE.Box3().setFromObject(root);
  const initialSize = initialBounds.getSize(new THREE.Vector3());
  const maxSize = Math.max(initialSize.x, initialSize.y, initialSize.z, 0.0001);
  root.scale.multiplyScalar(1.25 / maxSize);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.y -= bounds.min.y;
  root.position.z -= center.z;
  thumbnailCamera.position.set(2.6, 1.8, 2.6);
  thumbnailCamera.lookAt(0, 0.55, 0);
  thumbnailScene.add(root);
  thumbnailRenderer.render(thumbnailScene, thumbnailCamera);
  try {
    const ctx = thumbnailRenderer.domElement.getContext("2d");
    if (ctx) {
      const data = ctx.getImageData(0, 0, 96, 96).data;
      let opaque = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 20) opaque++;
      if (opaque < 1000) {
        thumbnailScene.remove(root);
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0x8a6b3f, side: THREE.DoubleSide });
        const cube = new THREE.Mesh(geo, mat);
        cube.scale.setScalar(0.9);
        cube.position.set(0, 0.45, 0);
        cube.rotation.y = 0.55;
        thumbnailScene.add(cube);
        thumbnailRenderer.render(thumbnailScene, thumbnailCamera);
        const fb = thumbnailRenderer.domElement.toDataURL("image/png");
        thumbnailScene.remove(cube);
        return fb;
      }
    }
  } catch {}
  const uri = thumbnailRenderer.domElement.toDataURL("image/png");
  thumbnailScene.remove(root);
  return uri;
}

export async function loadCustomAssetThumbnails(assets: CustomAssetMeta[] = getCustomAssetMetas()): Promise<Map<number, string>> {
  const thumbnails = new Map<number, string>();
  for (const asset of assets) {
    const model = await loadCustomAssetModel(asset.id);
    if (!model) continue;
    const uri = renderCustomAssetThumbnail(model);
    if (uri) thumbnails.set(asset.id, uri);
  }
  return thumbnails;
}
