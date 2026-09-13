import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import catalog from "../catalog/completeRegistry.json";
import tileMap from "../catalog/textureTileMap.json";
import shapes from "../catalog/block-shapes.json";
import { AUTHENTIC_TERRAIN_ATLAS_BASE64 } from "../src/game/engine/atlasData";
import { createArticulatedChest, updateChestAnimation, ChestEntity, createChestFaceImageData } from "../src/game/chest";
import { saveTextureOverrides } from "../src/services/textureOverrides";
import { customFaceTile, CUSTOM_FACE_TILES } from "../src/game/engine/customFaceTiles";
import { TILE_TO_FILE } from "./shared";

type Entry = {
  id: number;
  name: string;
  category: string;
  side?: number;
  top?: number;
  bottom?: number;
  solid?: number;
  isCustomAsset?: boolean;
  modelUrl?: string;
  stair?: number;
  slab?: number;
};

const gltfLoader = new GLTFLoader();

const $ = (id: string) => document.getElementById(id)!;
const blockSelect = $("blockSelect") as HTMLSelectElement;
const pixelCanvas = $("pixelCanvas") as HTMLCanvasElement;
const pixelCtx = pixelCanvas.getContext("2d", { willReadFrequently: true })!;
const gridOverlay = $("gridOverlay") as HTMLCanvasElement;
const gridCtx = gridOverlay.getContext("2d")!;
const preview3DCanvas = $("preview3DCanvas") as HTMLCanvasElement;
const viewport3D = $("viewport3D") as HTMLDivElement;
const toast = $("toast");

// ── Master Atlas (512x512) ──────────────────────────────────────────────────
const masterAtlasCanvas = document.createElement("canvas");
masterAtlasCanvas.width = masterAtlasCanvas.height = 512;
const masterAtlasCtx = masterAtlasCanvas.getContext("2d", { willReadFrequently: true })!;
let masterAtlasTex: THREE.CanvasTexture | null = null;

// Pristine vanilla atlas (no overrides) — used to detect faces the user has not
// actually edited, so an untouched face never overwrites an edited face that
// shares the same atlas tile (torch side/top/bottom all map to tile 81).
const vanillaAtlasCanvas = document.createElement("canvas");
vanillaAtlasCanvas.width = vanillaAtlasCanvas.height = 512;
const vanillaAtlasCtx = vanillaAtlasCanvas.getContext("2d", { willReadFrequently: true })!;

// ── Discrete 16x16 Face Bundles for Side, Top, and Bottom ────────────────────
function createFaceTextureBundle() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 16;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide
  });
  return { cv, ctx, tex, mat };
}

const sideBundle = createFaceTextureBundle();
const topBundle = createFaceTextureBundle();
const bottomBundle = createFaceTextureBundle();

// Material array for Three.js BoxGeometry (+X, -X, +Y, -Y, +Z, -Z)
const boxMaterialArray: THREE.Material[] = [
  sideBundle.mat,   // 0: +X Right
  sideBundle.mat,   // 1: -X Left
  topBundle.mat,    // 2: +Y Top
  bottomBundle.mat, // 3: -Y Bottom
  sideBundle.mat,   // 4: +Z Front
  sideBundle.mat    // 5: -Z Back
];

// Per-half texture bundles so two-block objects (doors) can show BOTH halves in
// the 3D viewport, each with its own independent side/top/bottom canvases.
type FaceBundle = ReturnType<typeof createFaceTextureBundle>;
const makeBundles = () => ({ side: createFaceTextureBundle(), top: createFaceTextureBundle(), bottom: createFaceTextureBundle() });
const halfBundles: Record<Half, { side: FaceBundle; top: FaceBundle; bottom: FaceBundle }> = {
  single: { side: sideBundle, top: topBundle, bottom: bottomBundle },
  lower: makeBundles(),
  upper: makeBundles()
};
const matArr = (b: { side: FaceBundle; top: FaceBundle; bottom: FaceBundle }): THREE.Material[] => [
  b.side.mat, b.side.mat, b.top.mat, b.bottom.mat, b.side.mat, b.side.mat
];

function isCustomAsset(b: Entry | { id: number; isCustomAsset?: boolean }): boolean {
  if (b.isCustomAsset) return true;
  return (b.id >= 1210 || (b.id >= 1190 && b.id < 1200));
}

async function syncOverridesFromServer(): Promise<void> {
  try {
    const res = await fetch("/api/textures/overrides");
    if (res.ok) {
      const doc = await res.json();
      if (doc.atlas && typeof doc.atlas === "object") {
        const local = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
        const merged = { ...local, ...doc.atlas };
        localStorage.setItem("mc_custom_atlas_overrides", JSON.stringify(merged));
        if (doc.version && doc.version.version) {
          localStorage.setItem("mc_custom_atlas_version", String(doc.version.version));
        }
      }
      if (doc.chestPixels || doc.chest_pixels) {
        localStorage.setItem("mc_custom_chest_pixels", JSON.stringify(doc.chest_pixels || doc.chestPixels));
      }
    }
  } catch {}
}

const atlasReady = (async () => {
  await syncOverridesFromServer();
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = async () => {
      masterAtlasCtx.drawImage(img, 0, 0);
      vanillaAtlasCtx.drawImage(img, 0, 0);

      // Bake per-face custom tiles (torch/porch top/bottom) from base tile
      for (const [key, slot] of Object.entries(CUSTOM_FACE_TILES)) {
        const idStr = key.slice(0, key.indexOf(":"));
        const def = (catalog as Entry[]).find((e) => e.id === Number(idStr));
        const srcTile = def ? (def.side ?? def.top ?? 0) : 0;
        const sc = srcTile % 32, sr = Math.floor(srcTile / 32);
        const dc = slot % 32, dr = Math.floor(slot / 32);
        const srcData = masterAtlasCtx.getImageData(sc * 16, sr * 16, 16, 16);
        masterAtlasCtx.putImageData(srcData, dc * 16, dr * 16);
        vanillaAtlasCtx.putImageData(srcData, dc * 16, dr * 16);
      }

      // Apply any saved overrides from localStorage
      try {
        const saved = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
        const loadPromises: Promise<void>[] = [];
        for (const [key, dataUrl] of Object.entries(saved)) {
          if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) continue;
          let tile = Number(key);
          if (isNaN(tile) && key.startsWith("block_")) {
            const parts = key.split("_");
            const bid = Number(parts[1]);
            const face = parts[parts.length - 1];
            const slot = customFaceTile(bid, face);
            if (slot != null) {
              tile = slot;
            } else {
              const def = (catalog as Entry[]).find((e) => e.id === bid);
              if (def) {
                tile = (face === "top" ? def.top : (face === "bottom" ? def.bottom : def.side)) ?? def.side ?? 0;
              }
            }
          }
          if (!isNaN(tile) && tile >= 0 && tile < 1024) {
            loadPromises.push(new Promise<void>((res) => {
              const tImg = new Image();
              tImg.onload = () => {
                const col = tile % 32;
                const row = Math.floor(tile / 32);
                masterAtlasCtx.clearRect(col * 16, row * 16, 16, 16);
                masterAtlasCtx.drawImage(tImg, col * 16, row * 16, 16, 16);
                res();
              };
              tImg.onerror = () => res();
              tImg.src = dataUrl;
            }));
          }
        }
        await Promise.all(loadPromises);
      } catch {}

      masterAtlasTex = new THREE.CanvasTexture(masterAtlasCanvas);
      masterAtlasTex.magFilter = masterAtlasTex.minFilter = THREE.NearestFilter;
      masterAtlasTex.generateMipmaps = false;
      masterAtlasTex.colorSpace = THREE.SRGBColorSpace;
      resolve();
    };
    img.src = AUTHENTIC_TERRAIN_ATLAS_BASE64;
  });
})();

// ── Editor State ─────────────────────────────────────────────────────────────
let currentBlock: Entry = (catalog as Entry[]).find((e) => e.id === 43) || (catalog as Entry[])[1];
type Half = "single" | "lower" | "upper";
let activeHalf: Half = "single";
let activeFace: "side" | "top" | "bottom" = "side";
let activeTool: "pencil" | "bucket" | "eyedropper" | "replacer" | "eraser" = "pencil";
let currentColor = "#b88235";
let showGrid = true;
let hoverCoord: [number, number] | null = null;

// Two-block objects (placed as two cells in-world): currently doors (all wood +
// iron variants). Each half (lower / upper) is edited independently with its own
// side/top/bottom faces, and the 3D viewport shows both halves.
function twoBlockKind(e: Entry): "door" | null {
  const n = e.name.toLowerCase();
  if (/door/.test(n) && !/trapdoor/.test(n)) return "door";
  return null;
}
const halvesFor = (e: Entry): Half[] => (twoBlockKind(e) === "door" ? ["lower", "upper"] : ["single"]);
const doorWoodPrefix = (name: string) => (name.toLowerCase().match(/^(\w+)\s*door/) || ["", "oak"])[1];
function doorHalfTile(name: string, half: "lower" | "upper"): number {
  const p = doorWoodPrefix(name);
  const suffix = half === "lower" ? "_door_bottom" : "_door_top";
  for (const [file, tile] of Object.entries(tileMap)) if (file === `${p}${suffix}.png`) return Number(tile);
  return half === "lower" ? 107 : 106;
}
const faceKey = (half: Half, face: "side" | "top" | "bottom") => `${half}:${face}`;
const curKey = () => faceKey(activeHalf, activeFace);

// Active 16x16 ImageDatas for the block faces (keyed "half:face")
const faceData: Record<string, ImageData> = {};
const originalFaceData: Record<string, ImageData> = {};

// History for Undo/Redo
type HistoryState = { face: string; data: Uint8ClampedArray };
const undoStack: HistoryState[] = [];
const redoStack: HistoryState[] = [];

function saveHistory() {
  const cur = faceData[curKey()];
  if (!cur) return;
  undoStack.push({ face: curKey(), data: new Uint8ClampedArray(cur.data) });
  if (undoStack.length > 30) undoStack.shift();
  redoStack.length = 0;
}

// ── 3D Viewport Setup (Authentic Minecraft Rendering) ────────────────────────
const renderer3D = new THREE.WebGLRenderer({ canvas: preview3DCanvas, antialias: true, alpha: true });
renderer3D.setPixelRatio(window.devicePixelRatio || 1);
const scene3D = new THREE.Scene();
const cam3D = new THREE.PerspectiveCamera(38, 1, 0.1, 15);
cam3D.position.set(2.4, 1.9, 2.4);
cam3D.lookAt(0, 0, 0);

// Lighting matching Minecraft in-game standard
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x445566, 0.95);
scene3D.add(hemiLight);
const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.15);
dirLight1.position.set(3, 5, 2);
scene3D.add(dirLight1);
const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.35);
dirLight2.position.set(-3, 2, -2);
scene3D.add(dirLight2);

// Root rotating group
const blockGroup = new THREE.Group();
scene3D.add(blockGroup);

// 1×1×1 cell wireframe (matches the in-game cell: x/z centered, y 0…1).
// Always faintly visible as a positioning reference; highlighted in Position mode.
const cellBox = new THREE.BoxGeometry(1, 1, 1);
cellBox.translate(0, 0.5, 0);
const cellWireMat = new THREE.LineBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 0.25, depthWrite: false });
const cellWire = new THREE.LineSegments(new THREE.EdgesGeometry(cellBox), cellWireMat);
// Inside blockGroup so it rotates/moves together with the block (coherent reference).
blockGroup.add(cellWire);

function setCellWireHighlight(on: boolean): void {
  cellWireMat.opacity = on ? 0.95 : 0.25;
  cellWireMat.color.set(on ? 0x66ff99 : 0x88bbff);
  cellWireMat.needsUpdate = true;
}

let block3DMesh: THREE.Mesh | null = null;
let chest3DEntity: ChestEntity | null = null;
let autoRotate3D = false;

function syncFaceCanvasesTo3D() {
  for (const half of ["single", "lower", "upper"] as Half[]) {
    const b = halfBundles[half];
    for (const face of ["side", "top", "bottom"] as const) {
      const img = faceData[faceKey(half, face)];
      if (!img) continue;
      const fb = b[face];
      const sizeChanged = (fb.cv.width !== img.width || fb.cv.height !== img.height);
      if (sizeChanged) {
        fb.cv.width = img.width;
        fb.cv.height = img.height;
        fb.ctx.imageSmoothingEnabled = false;
      }
      fb.ctx.clearRect(0, 0, img.width, img.height);
      fb.ctx.putImageData(img, 0, 0);

      if (sizeChanged) {
        fb.tex.dispose();
        fb.tex = new THREE.CanvasTexture(fb.cv);
        fb.tex.magFilter = fb.tex.minFilter = THREE.NearestFilter;
        fb.tex.generateMipmaps = false;
        fb.tex.colorSpace = THREE.SRGBColorSpace;
        fb.mat.map = fb.tex;
        fb.mat.needsUpdate = true;
      } else {
        fb.tex.needsUpdate = true;
        fb.mat.needsUpdate = true;
      }
    }
  }
}

function addEditorBox(g: THREE.Group, mats: THREE.Material[], x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const setFaceUv = (f: number, u0: number, v0: number, u1: number, v1: number) => {
    const base = f * 4;
    uv.setXY(base + 0, u0, v1);
    uv.setXY(base + 1, u1, v1);
    uv.setXY(base + 2, u0, v0);
    uv.setXY(base + 3, u1, v0);
  };
  // 0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z
  setFaceUv(0, 1 - z1, y0, 1 - z0, y1);
  setFaceUv(1, z0, y0, z1, y1);
  setFaceUv(2, x0, 1 - z1, x1, 1 - z0);
  setFaceUv(3, x0, z0, x1, z1);
  setFaceUv(4, x0, y0, x1, y1);
  setFaceUv(5, 1 - x1, y0, 1 - x0, y1);
  uv.needsUpdate = true;

  const mesh = new THREE.Mesh(geo, mats);
  mesh.position.set((x0 + x1) / 2 - 0.5, (y0 + y1) / 2 - 0.5, (z0 + z1) / 2 - 0.5);
  g.add(mesh);
  return mesh;
}

function buildEditorDoor(open: boolean): THREE.Group {
  // Two-cell door: solid lower leaf (lowerHalf textures) + upper 2x2 window
  // grille (upperHalf textures) — matches pushDoor / blocks.html.
  const g = new THREE.Group();
  const L = matArr(halfBundles.lower);
  const U = matArr(halfBundles.upper);
  const piece = (mats: THREE.Material[], u0: number, u1: number, y0: number, y1: number) => {
    if (open) addEditorBox(g, mats, 0.0625, y0, 0.9375 - 0.875 * u1, 0.1875, y1, 0.9375 - 0.875 * u0);
    else addEditorBox(g, mats, 0.0625 + 0.875 * u0, y0, 0.8125, 0.0625 + 0.875 * u1, y1, 1.0);
  };
  piece(L, 0, 1, 0, 1);                       // lower leaf (solid panels)
  piece(U, 0, 1, 1.8125, 2.0);                // top rail
  piece(U, 0, 1, 1.0, 1.1875);                // bottom rail
  piece(U, 0, 1, 1.4375, 1.5625);             // center cross-rail
  piece(U, 0, 0.1875, 1.1875, 1.8125);        // left stile
  piece(U, 0.8125, 1, 1.1875, 1.8125);        // right stile
  piece(U, 0.4375, 0.5625, 1.1875, 1.8125);   // center mullion
  g.position.set(-0.5, -1, open ? -0.5 : -0.90625);
  return g;
}

function buildEditorTrapdoor(open: boolean): THREE.Group {
  const g = new THREE.Group();
  const M = matArr(halfBundles.single);
  const piece = (u0: number, u1: number, v0: number, v1: number) => {
    if (open) addEditorBox(g, M, u0, v0, 0.8125, u1, v1, 1.0);
    else addEditorBox(g, M, u0, 0, v0, u1, 0.1875, v1);
  };
  piece(0, 1, 0.8125, 1.0);
  piece(0, 1, 0.0, 0.1875);
  piece(0, 0.1875, 0.1875, 0.8125);
  piece(0.8125, 1, 0.1875, 0.8125);
  piece(0, 1, 0.4375, 0.5625);
  piece(0.4375, 0.5625, 0.1875, 0.8125);
  g.position.set(-0.5, open ? -0.5 : -0.09375, -0.90625);
  return g;
}

let fenceMode: "connected" | "straight" | "post" = "connected";

function buildEditorFence(mode: "connected" | "straight" | "post" = fenceMode): THREE.Group {
  const g = new THREE.Group();
  const M = matArr(halfBundles.single);
  // Central 4x16x4 post
  addEditorBox(g, M, 0.375, 0, 0.375, 0.625, 1.0, 0.625);

  if (mode === "connected" || mode === "straight") {
    // West (x - 1)
    addEditorBox(g, M, 0, 0.75, 0.4375, 0.375, 0.9375, 0.5625);
    addEditorBox(g, M, 0, 0.375, 0.4375, 0.375, 0.5625, 0.5625);
    // East (x + 1)
    addEditorBox(g, M, 0.625, 0.75, 0.4375, 1.0, 0.9375, 0.5625);
    addEditorBox(g, M, 0.625, 0.375, 0.4375, 1.0, 0.5625, 0.5625);
  }

  if (mode === "connected") {
    // North (z - 1)
    addEditorBox(g, M, 0.4375, 0.75, 0, 0.5625, 0.9375, 0.375);
    addEditorBox(g, M, 0.4375, 0.375, 0, 0.5625, 0.5625, 0.375);
    // South (z + 1)
    addEditorBox(g, M, 0.4375, 0.75, 0.625, 0.5625, 0.9375, 1.0);
    addEditorBox(g, M, 0.4375, 0.375, 0.625, 0.5625, 0.5625, 1.0);
  }

  g.position.set(-0.5, -0.5, -0.5);
  return g;
}

function buildEditorCrossBillboard(): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  const pos = [
    -0.5, 0.5, -0.5,  0.5, 0.5, 0.5,  -0.5, -0.5, -0.5,  0.5, -0.5, 0.5,
    -0.5, 0.5,  0.5,  0.5, 0.5,-0.5,  -0.5, -0.5,  0.5,  0.5, -0.5,-0.5
  ];
  const uvs = [
    0, 1, 1, 1, 0, 0, 1, 0,
    0, 1, 1, 1, 0, 0, 1, 0
  ];
  const idx = [
    0, 1, 2,  2, 1, 3,
    4, 5, 6,  6, 5, 7
  ];
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, sideBundle.mat);
  g.add(mesh);
  return g;
}

function buildEditorHighGrass(): THREE.Group {
  const g = new THREE.Group();
  const makeTier = (y0: number, y1: number, mat: THREE.Material) => {
    const geo = new THREE.BufferGeometry();
    const pos = [
      -0.5, y1, -0.5,  0.5, y1, 0.5,  -0.5, y0, -0.5,  0.5, y0, 0.5,
      -0.5, y1,  0.5,  0.5, y1,-0.5,  -0.5, y0,  0.5,  0.5, y0,-0.5
    ];
    const uvs = [
      0, 1, 1, 1, 0, 0, 1, 0,
      0, 1, 1, 1, 0, 0, 1, 0
    ];
    const idx = [
      0, 1, 2,  2, 1, 3,
      4, 5, 6,  6, 5, 7
    ];
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  };

  g.add(makeTier(-0.5, 0.5, sideBundle.mat));
  g.add(makeTier(0.5, 1.5, topBundle.mat));
  g.position.set(0, -0.5, 0);
  g.scale.setScalar(0.75);
  return g;
}

function buildEditorTropicalBush(): THREE.Group {
  const g = new THREE.Group();
  const makeTier = (y0: number, y1: number, mat: THREE.Material) => {
    const geo = new THREE.BufferGeometry();
    const hr = 0.65;
    const pos = [
      -hr, y1, -hr,   hr, y1,  hr,  -hr, y0, -hr,   hr, y0,  hr,
      -hr, y1,  hr,   hr, y1, -hr,  -hr, y0,  hr,   hr, y0, -hr,
      -hr, y1,   0,   hr, y1,   0,  -hr, y0,   0,   hr, y0,   0,
        0, y1, -hr,    0, y1,  hr,    0, y0, -hr,    0, y0,  hr
    ];
    const uvs = [
      0, 1, 1, 1, 0, 0, 1, 0,
      0, 1, 1, 1, 0, 0, 1, 0,
      0, 1, 1, 1, 0, 0, 1, 0,
      0, 1, 1, 1, 0, 0, 1, 0
    ];
    const idx = [
       0,  1,  2,   2,  1,  3,
       4,  5,  6,   6,  5,  7,
       8,  9, 10,  10,  9, 11,
      12, 13, 14,  14, 13, 15
    ];
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  };

  g.add(makeTier(-0.5, 0.5, sideBundle.mat));
  g.add(makeTier(0.5, 1.5, topBundle.mat));
  g.position.set(0, -0.5, 0);
  g.scale.setScalar(0.75);
  return g;
}

function buildEditorPorchStair(mirror = false): THREE.Group {
  const g = new THREE.Group();
  // 1. Bottom slab: full 1x0.5x1 base (y 0..0.5)
  addEditorBox(g, boxMaterialArray, 0, 0, 0, 1, 0.5, 1);
  // 2. Upper step: +Z half (y 0.5..1.0, z 0.5..1.0)
  addEditorBox(g, boxMaterialArray, 0, 0.5, 0.5, 1, 1.0, 1.0);
  // 3. Railing
  const railBox = (lx0: number, y0: number, z0: number, lx1: number, y1: number, z1: number) => {
    const mx0 = mirror ? 1 - lx1 : lx0;
    const mx1 = mirror ? 1 - lx0 : lx1;
    addEditorBox(g, boxMaterialArray, mx0, y0, z0, mx1, y1, z1);
  };
  railBox(0.88, 0, 0.0625, 0.992, 1.0, 0.1875);
  railBox(0.88, 0.5, 0.28125, 0.992, 0.85, 0.34375);
  railBox(0.895, 0.85, 0.1875, 0.98, 0.97, 0.625);
  return g;
}

// ── Block Positioning (offset within the 1×1×1 cell) ──────────────────────────
let positionState = { x: 0, y: 0, z: 0 };
let positionMode = false;

function getSavedOffset(id: number): { x: number; y: number; z: number } {
  try {
    const overrides: Record<string, string> = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
    const raw = overrides[`block_${id}_offset`];
    if (typeof raw === "string") {
      const [x, y, z] = raw.split(",").map(Number);
      if ([x, y, z].every((v) => Number.isFinite(v))) return { x, y, z };
    }
  } catch {}
  return { x: 0, y: 0, z: 0 };
}

function loadPositionUI() {
  const idEl = $("positionBlockId");
  if (idEl) idEl.textContent = `Block #${currentBlock.id}`;
  const sx = $("posX") as HTMLInputElement, sy = $("posY") as HTMLInputElement, sz = $("posZ") as HTMLInputElement;
  if (!sx || !sy || !sz) return;
  sx.value = String(positionState.x);
  sy.value = String(positionState.y);
  sz.value = String(positionState.z);
  const vx = $("posXVal"), vy = $("posYVal"), vz = $("posZVal");
  if (vx) vx.textContent = positionState.x.toFixed(2);
  if (vy) vy.textContent = positionState.y.toFixed(2);
  if (vz) vz.textContent = positionState.z.toFixed(2);
}

function applyPositionFromUI() {
  positionState.x = Number(($("posX") as HTMLInputElement).value);
  positionState.y = Number(($("posY") as HTMLInputElement).value);
  positionState.z = Number(($("posZ") as HTMLInputElement).value);
  const vx = $("posXVal"), vy = $("posYVal"), vz = $("posZVal");
  if (vx) vx.textContent = positionState.x.toFixed(2);
  if (vy) vy.textContent = positionState.y.toFixed(2);
  if (vz) vz.textContent = positionState.z.toFixed(2);
  update3DGeometry();
}

function update3DGeometry() {
  // Clear any existing child meshes from blockGroup
  while (blockGroup.children.length > 0) {
    const child = blockGroup.children[0];
    blockGroup.remove(child);
    if ((child as any).geometry) (child as any).geometry.dispose();
  }
  block3DMesh = null;
  chest3DEntity = null;

  syncFaceCanvasesTo3D();

  const btnAction = $("btn3DAction");

  if (currentBlock.id === 43) {
    // Chest model using discrete side, top, and bottom materials
    chest3DEntity = createArticulatedChest({ yaw: 0, woodMaterial: boxMaterialArray });
    chest3DEntity.root.position.set(0, -0.38, 0);
    blockGroup.add(chest3DEntity.root);
    btnAction.style.display = "block";
    btnAction.innerHTML = "📦 Open Chest";
  } else if (currentBlock.id === 80 || currentBlock.id === 81 || currentBlock.id === 84) {
    // Authentic 3D Slender Torch Post (2px x 2px x 10px stick)
    btnAction.style.display = "none";
    const torchGroup = new THREE.Group();
    const stickGeo = new THREE.BoxGeometry(0.125, 0.625, 0.125);
    const uv = stickGeo.attributes.uv as THREE.BufferAttribute;
    const setFaceUv = (f: number, u0: number, v0: number, u1: number, v1: number) => {
      const base = f * 4;
      uv.setXY(base + 0, u0, v1);
      uv.setXY(base + 1, u1, v1);
      uv.setXY(base + 2, u0, v0);
      uv.setXY(base + 3, u1, v0);
    };
    // Exact 2px x 10px torch stick sub-region UVs matching Minecraft canonical models
    const sU0 = 7 / 16, sU1 = 9 / 16;
    const sV0 = 0 / 16, sV1 = 10 / 16;
    const tV0 = 8 / 16, tV1 = 10 / 16;
    const bV0 = 0 / 16, bV1 = 2 / 16;

    setFaceUv(0, sU0, sV0, sU1, sV1); // Face 0 (+X, East)
    setFaceUv(1, sU0, sV0, sU1, sV1); // Face 1 (-X, West)
    setFaceUv(2, sU0, tV0, sU1, tV1); // Face 2 (+Y, Top flame)
    setFaceUv(3, sU0, bV0, sU1, bV1); // Face 3 (-Y, Bottom base)
    setFaceUv(4, sU0, sV0, sU1, sV1); // Face 4 (+Z, South)
    setFaceUv(5, sU0, sV0, sU1, sV1); // Face 5 (-Z, North)
    uv.needsUpdate = true;

    const stickMesh = new THREE.Mesh(stickGeo, boxMaterialArray);
    stickMesh.position.set(0, 0, 0);
    torchGroup.add(stickMesh);
    torchGroup.scale.set(2.2, 2.2, 2.2);
    blockGroup.add(torchGroup);
    block3DMesh = stickMesh;
  } else if (currentBlock.id === 46 || currentBlock.id === 82) {
    // Authentic 3D Lantern
    btnAction.style.display = "none";
    const lanternGroup = new THREE.Group();
    const cageGeo = new THREE.BoxGeometry(0.3125, 0.375, 0.3125);
    const cageMesh = new THREE.Mesh(cageGeo, boxMaterialArray);
    lanternGroup.add(cageMesh);
    const knobGeo = new THREE.BoxGeometry(0.1875, 0.125, 0.1875);
    const knobMesh = new THREE.Mesh(knobGeo, boxMaterialArray);
    knobMesh.position.set(0, 0.25, 0);
    lanternGroup.add(knobMesh);
    lanternGroup.scale.set(1.4, 1.4, 1.4);
    blockGroup.add(lanternGroup);
    block3DMesh = cageMesh;
  } else if (currentBlock.id === 1205 || currentBlock.id === 1206 || /porch stair/i.test(currentBlock.name)) {
    // Authentic 3D Porch Stair with Railing
    btnAction.style.display = "none";
    blockGroup.add(buildEditorPorchStair(currentBlock.id === 1206 || /right/i.test(currentBlock.name)));
  } else if (currentBlock.stair) {
    // Authentic 3D Stair
    btnAction.style.display = "none";
    const stairGroup = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(1, 0.5, 1);
    const baseMesh = new THREE.Mesh(baseGeo, boxMaterialArray);
    baseMesh.position.set(0, -0.25, 0);
    stairGroup.add(baseMesh);
    const stepGeo = new THREE.BoxGeometry(1, 0.5, 0.5);
    const stepMesh = new THREE.Mesh(stepGeo, boxMaterialArray);
    stepMesh.position.set(0, 0.25, -0.25);
    stairGroup.add(stepMesh);
    blockGroup.add(stairGroup);
    block3DMesh = baseMesh;
  } else if (currentBlock.slab) {
    // Authentic 3D Slab
    btnAction.style.display = "none";
    const geo = new THREE.BoxGeometry(1, 0.5, 1);
    block3DMesh = new THREE.Mesh(geo, boxMaterialArray);
    block3DMesh.position.set(0, -0.25, 0);
    blockGroup.add(block3DMesh);
  } else if (twoBlockKind(currentBlock) === "door") {
    // 2-block door: both halves shown, textured from their own face bundles
    btnAction.style.display = "none";
    const open = /open/i.test(currentBlock.name);
    const doorGroup = buildEditorDoor(open);
    doorGroup.scale.setScalar(0.82);
    blockGroup.add(doorGroup);
  } else if (/trapdoor/i.test(currentBlock.name)) {
    // 3/16 grille plate (closed flat, open vertical)
    btnAction.style.display = "none";
    const open = /open/i.test(currentBlock.name);
    blockGroup.add(buildEditorTrapdoor(open));
  } else if (/fence/i.test(currentBlock.name) && !/gate|particle/i.test(currentBlock.name)) {
    // Fence post + rails
    btnAction.style.display = "block";
    btnAction.innerHTML = `🪵 State: ${fenceMode === "connected" ? "4-Way Connected" : fenceMode === "straight" ? "Straight Rails" : "Standalone Post"}`;
    blockGroup.add(buildEditorFence(fenceMode));
  } else if (currentBlock.id === 1202 || currentBlock.id === 1203 || /tropical bush/i.test(currentBlock.name)) {
    btnAction.style.display = "none";
    blockGroup.add(buildEditorTropicalBush());
  } else if (currentBlock.id === 1200 || currentBlock.id === 1201 || /high grass/i.test(currentBlock.name) || /large grass/i.test(currentBlock.name)) {
    btnAction.style.display = "none";
    blockGroup.add(buildEditorHighGrass());
  } else if (currentBlock.id === 124 || /grass/i.test(currentBlock.name) || /flower/i.test(currentBlock.name) || /dandelion/i.test(currentBlock.name) || /poppy/i.test(currentBlock.name)) {
    btnAction.style.display = "none";
    blockGroup.add(buildEditorCrossBillboard());
  } else if (isCustomAsset(currentBlock)) {
    // Custom asset blocks are 1×1×1 voxel blocks: render the same as the game
    // (box sits 0…1 in the cell), offset per the Positioning tab.
    btnAction.style.display = "none";
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    block3DMesh = new THREE.Mesh(geo, boxMaterialArray);
    block3DMesh.position.set(positionState.x, positionState.y, positionState.z);
    blockGroup.add(block3DMesh);
  } else {
    btnAction.style.display = "none";
    const geo = new THREE.BoxGeometry(1, 1, 1);
    block3DMesh = new THREE.Mesh(geo, boxMaterialArray);
    blockGroup.add(block3DMesh);
  }
}

function resize3D() {
  const w = viewport3D.clientWidth;
  const h = viewport3D.clientHeight;
  if (w > 0 && h > 0) {
    renderer3D.setSize(w, h);
    cam3D.aspect = w / h;
    cam3D.updateProjectionMatrix();
  }
}
const resizeObs = new ResizeObserver(resize3D);
resizeObs.observe(viewport3D);

// ── Extracting & Blitting Face Pixels ─────────────────────────────────────────
function getTileIndexForFace(face: "side" | "top" | "bottom", half: Half = activeHalf): number {
  if (twoBlockKind(currentBlock) === "door" && (half === "lower" || half === "upper")) {
    return doorHalfTile(currentBlock.name, half);
  }
  const custom = customFaceTile(currentBlock.id, face);
  if (custom != null) return custom;
  if (face === "top") return currentBlock.top ?? currentBlock.side ?? 1;
  if (face === "bottom") return currentBlock.bottom ?? currentBlock.side ?? 1;
  return currentBlock.side ?? currentBlock.top ?? 1;
}

function vanillaFaceData(tile: number): ImageData {
  const col = tile % 32;
  const row = Math.floor(tile / 32);
  return vanillaAtlasCtx.getImageData(col * 16, row * 16, 16, 16);
}

function sameFacePixels(a: ImageData, b: ImageData): boolean {
  if (!a || !b || a.data.length !== b.data.length) return false;
  for (let i = 0; i < a.data.length; i++) {
    if (a.data[i] !== b.data[i]) return false;
  }
  return true;
}

function imageToImageData(img: any): ImageData {
  const w = img.naturalWidth || img.videoWidth || img.width || 16;
  const h = img.naturalHeight || img.videoHeight || img.height || 16;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function loadImageDataFromUrl(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(imageToImageData(img));
    img.onerror = () => resolve(new ImageData(16, 16));
    img.src = dataUrl;
  });
}

async function loadCustomAssetFaces(assetId: number): Promise<void> {
  const overrides: Record<string, string> = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
  const sideOverride = overrides[`block_${assetId}_single_side`] || overrides[`block_${assetId}_side`] || overrides[`block_${assetId}`];
  const topOverride = overrides[`block_${assetId}_single_top`] || overrides[`block_${assetId}_top`];
  const bottomOverride = overrides[`block_${assetId}_single_bottom`] || overrides[`block_${assetId}_bottom`];

  if (sideOverride && topOverride && bottomOverride) {
    const [sideData, topData, bottomData] = await Promise.all([
      loadImageDataFromUrl(sideOverride),
      loadImageDataFromUrl(topOverride),
      loadImageDataFromUrl(bottomOverride)
    ]);
    faceData["single:side"] = sideData;
    faceData["single:top"] = topData;
    faceData["single:bottom"] = bottomData;
    if (!originalFaceData["single:side"]) originalFaceData["single:side"] = new ImageData(new Uint8ClampedArray(sideData.data), sideData.width, sideData.height);
    if (!originalFaceData["single:top"]) originalFaceData["single:top"] = new ImageData(new Uint8ClampedArray(topData.data), topData.width, topData.height);
    if (!originalFaceData["single:bottom"]) originalFaceData["single:bottom"] = new ImageData(new Uint8ClampedArray(bottomData.data), bottomData.width, bottomData.height);
    syncFaceCanvasesTo3D();
    return;
  }

  try {
    const res = await fetch(`/api/custom-assets/${assetId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    const gltf = await new Promise<any>((resolve, reject) => {
      gltfLoader.parse(buffer, "", resolve, reject);
    });

    const foundImages: (HTMLImageElement | ImageBitmap | HTMLCanvasElement)[] = [];
    gltf.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (mat.map?.image) {
            foundImages.push(mat.map.image);
          }
        }
      }
    });

    if (foundImages.length > 0) {
      // Box materials: 0:+X, 1:-X, 2:+Y/top, 3:-Y/bottom, 4:+Z, 5:-Z
      const sideImg = foundImages[0];
      const topImg = foundImages.length >= 4 ? foundImages[2] : foundImages[0];
      const bottomImg = foundImages.length >= 4 ? foundImages[3] : foundImages[0];

      const sideData = sideOverride ? await loadImageDataFromUrl(sideOverride) : imageToImageData(sideImg);
      const topData = topOverride ? await loadImageDataFromUrl(topOverride) : imageToImageData(topImg);
      const bottomData = bottomOverride ? await loadImageDataFromUrl(bottomOverride) : imageToImageData(bottomImg);

      faceData["single:side"] = sideData;
      faceData["single:top"] = topData;
      faceData["single:bottom"] = bottomData;
      if (!originalFaceData["single:side"]) originalFaceData["single:side"] = new ImageData(new Uint8ClampedArray(sideData.data), sideData.width, sideData.height);
      if (!originalFaceData["single:top"]) originalFaceData["single:top"] = new ImageData(new Uint8ClampedArray(topData.data), topData.width, topData.height);
      if (!originalFaceData["single:bottom"]) originalFaceData["single:bottom"] = new ImageData(new Uint8ClampedArray(bottomData.data), bottomData.width, bottomData.height);
    } else {
      const fallback = new ImageData(16, 16);
      faceData["single:side"] = fallback;
      faceData["single:top"] = fallback;
      faceData["single:bottom"] = fallback;
    }
  } catch (err) {
    console.error(`Could not load custom asset ${assetId}:`, err);
  }

  syncFaceCanvasesTo3D();
}

function createTorchFaceImageData(face: "side" | "top" | "bottom", blockId = currentBlock.id): ImageData {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 16;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(16, 16);
  const data = img.data;

  const isSoul = blockId === 81;
  const isRedstone = blockId === 84;

  const hexToRgb = (hex: string): [number, number, number] => {
    const c = parseInt(hex.replace("#", ""), 16);
    return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  };

  const setPx = (x: number, y: number, hex: string) => {
    const idx = (y * 16 + x) * 4;
    const [r, g, b] = hexToRgb(hex);
    data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
  };

  if (face === "top") {
    // 16x16 glowing flame top cap
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5);
        let color: string;
        if (isSoul) {
          color = d < 3.5 ? "#e0ffff" : d < 6 ? "#4deeea" : "#0099cc";
        } else if (isRedstone) {
          color = d < 3.5 ? "#ff7777" : d < 6 ? "#ff0000" : "#990000";
        } else {
          color = d < 3.5 ? "#ffffff" : d < 5.5 ? "#fff59d" : d < 7 ? "#ffb300" : "#ff6f00";
        }
        setPx(x, y, color);
      }
    }
  } else if (face === "bottom") {
    // 16x16 wooden stick cross-section
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = ((x * 7 + y * 13) % 5);
        const col = n === 0 ? "#745124" : n === 1 ? "#8d632c" : n === 2 ? "#9d6e31" : n === 3 ? "#aa7735" : "#845c29";
        setPx(x, y, col);
      }
    }
  } else {
    // 16x16 torch side face fitted (Flame on top 4 rows, charcoal head rows 4..5, oak wood stick rows 6..15)
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        let color: string;
        if (y < 4) {
          const d = Math.abs(x - 7.5);
          if (isSoul) {
            color = y < 2 && d < 4 ? "#e0ffff" : d < 5 ? "#4deeea" : "#0099cc";
          } else if (isRedstone) {
            color = y < 2 && d < 4 ? "#ff7777" : d < 5 ? "#ff0000" : "#aa0000";
          } else {
            color = y === 0 && d < 3 ? "#ffffff" : y < 2 && d < 5 ? "#fff59d" : d < 6 ? "#ffb300" : "#ff6f00";
          }
        } else if (y < 6) {
          const n = (x + y) % 3;
          color = isRedstone ? (n === 0 ? "#880000" : "#550000") : (n === 0 ? "#2b211b" : n === 1 ? "#3a2e26" : "#4a3c31");
        } else {
          const n = ((x * 5 + y * 11) % 5);
          color = n === 0 ? "#745124" : n === 1 ? "#8d632c" : n === 2 ? "#9d6e31" : n === 3 ? "#aa7735" : "#845c29";
        }
        setPx(x, y, color);
      }
    }
  }

  return img;
}

async function loadFaceFromAtlas(face: "side" | "top" | "bottom", half: Half = activeHalf): Promise<void> {
  const tile = getTileIndexForFace(face, half);
  const key = faceKey(half, face);
  try {
    const overrides: Record<string, string> = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
    const slot = customFaceTile(currentBlock.id, face);
    const customDataUrl = overrides[`block_${currentBlock.id}_${half}_${face}`] ||
                          overrides[`block_${currentBlock.id}_${face}`] ||
                          overrides[`block_${currentBlock.id}_single_${face}`] ||
                          (slot != null ? overrides[String(slot)] : null) ||
                          overrides[String(tile)];
    if (customDataUrl && typeof customDataUrl === "string" && customDataUrl.startsWith("data:image/")) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const cv = document.createElement("canvas");
          cv.width = cv.height = 16;
          const ctx = cv.getContext("2d", { willReadFrequently: true })!;
          ctx.drawImage(img, 0, 0, 16, 16);
          faceData[key] = ctx.getImageData(0, 0, 16, 16);
          if (!originalFaceData[key]) {
            originalFaceData[key] = vanillaFaceData(tile);
          }
          if (half === activeHalf && face === activeFace) renderPixelCanvas();
          syncFaceCanvasesTo3D();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = customDataUrl;
      });
      return;
    }
  } catch {}

  if (currentBlock.id === 43) {
    const defaultChestImg = createChestFaceImageData(face);
    faceData[key] = defaultChestImg;
    if (!originalFaceData[key]) {
      originalFaceData[key] = new ImageData(new Uint8ClampedArray(defaultChestImg.data), 16, 16);
    }
    syncFaceCanvasesTo3D();
    return;
  }

  if (currentBlock.id === 80 || currentBlock.id === 81 || currentBlock.id === 84) {
    const defaultTorchImg = createTorchFaceImageData(face, currentBlock.id);
    faceData[key] = defaultTorchImg;
    if (!originalFaceData[key]) {
      originalFaceData[key] = new ImageData(new Uint8ClampedArray(defaultTorchImg.data), 16, 16);
    }
    syncFaceCanvasesTo3D();
    return;
  }

  const col = tile % 32;
  const row = Math.floor(tile / 32);
  const imgData = masterAtlasCtx.getImageData(col * 16, row * 16, 16, 16);
  faceData[key] = new ImageData(new Uint8ClampedArray(imgData.data), 16, 16);

  if (!originalFaceData[key]) {
    originalFaceData[key] = vanillaFaceData(tile);
  }
  syncFaceCanvasesTo3D();
}

function blitFaceToAtlas(face: "side" | "top" | "bottom" = activeFace, half: Half = activeHalf) {
  const data = faceData[faceKey(half, face)];
  if (!data) return;
  const tile = getTileIndexForFace(face, half);
  const col = tile % 32;
  const row = Math.floor(tile / 32);

  if (data.width === 16 && data.height === 16) {
    masterAtlasCtx.putImageData(data, col * 16, row * 16);
  } else {
    const tempCv = document.createElement("canvas");
    tempCv.width = data.width;
    tempCv.height = data.height;
    tempCv.getContext("2d")!.putImageData(data, 0, 0);
    masterAtlasCtx.imageSmoothingEnabled = false;
    masterAtlasCtx.drawImage(tempCv, 0, 0, data.width, data.height, col * 16, row * 16, 16, 16);
  }

  if (masterAtlasTex) masterAtlasTex.needsUpdate = true;
  syncFaceCanvasesTo3D();
}

function renderPixelCanvas() {
  const cur = faceData[curKey()];
  if (!cur) return;
  const w = cur.width || 16;
  const h = cur.height || 16;
  const cellW = 320 / w;
  const cellH = 320 / h;

  pixelCtx.clearRect(0, 0, 320, 320);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = cur.data[idx];
      const g = cur.data[idx + 1];
      const b = cur.data[idx + 2];
      const a = cur.data[idx + 3];
      if (a === 0) {
        // Transparent checkerboard
        const isDark = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0;
        pixelCtx.fillStyle = isDark ? "#121820" : "#1a2230";
      } else {
        pixelCtx.fillStyle = `rgb(${r},${g},${b})`;
      }
      pixelCtx.fillRect(x * cellW, y * cellH, cellW, cellH);
    }
  }

  drawGridOverlay();
  syncFaceCanvasesTo3D();
}

let brushSize = 1;
let lineStart: [number, number] | null = null;

function drawLine(x0: number, y0: number, x1: number, y1: number): void {
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    applyToolAt(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

function drawGridOverlay() {
  gridCtx.clearRect(0, 0, 320, 320);
  const cur = faceData[curKey()];
  const w = cur?.width || 16;
  const h = cur?.height || 16;
  const cellW = 320 / w;
  const cellH = 320 / h;

  // Draw grid lines only when cells are at least 4px wide to avoid whitewashing high-res textures
  if (showGrid && cellW >= 4) {
    gridCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    gridCtx.lineWidth = 1;
    for (let i = 0; i <= w; i++) {
      const p = i * cellW;
      gridCtx.beginPath();
      gridCtx.moveTo(p + 0.5, 0);
      gridCtx.lineTo(p + 0.5, 320);
      gridCtx.stroke();
    }
    for (let i = 0; i <= h; i++) {
      const p = i * cellH;
      gridCtx.beginPath();
      gridCtx.moveTo(0, p + 0.5);
      gridCtx.lineTo(320, p + 0.5);
      gridCtx.stroke();
    }
  }

  // Draw cursor hover highlight box respecting brushSize
  if (hoverCoord) {
    const [hx, hy] = hoverCoord;
    gridCtx.strokeStyle = "#58a6ff";
    gridCtx.lineWidth = Math.max(1, Math.min(2, cellW / 2));
    const bw = brushSize;
    gridCtx.strokeRect(hx * cellW + 1, hy * cellH + 1, Math.max(1, cellW * bw - 2), Math.max(1, cellH * bw - 2));
  }
}

// ── Drawing / Painting Logic ─────────────────────────────────────────────────
function hexToRgba(hex: string): [number, number, number, number] {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
}

function rgbaToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function setPixel(x: number, y: number, r: number, g: number, b: number, a: number) {
  const cur = faceData[curKey()];
  if (!cur || x < 0 || x >= cur.width || y < 0 || y >= cur.height) return;
  const idx = (y * cur.width + x) * 4;
  cur.data[idx] = r;
  cur.data[idx + 1] = g;
  cur.data[idx + 2] = b;
  cur.data[idx + 3] = a;
}

function applyBrush(px: number, py: number, r: number, g: number, b: number, a: number) {
  if (brushSize <= 1) {
    setPixel(px, py, r, g, b, a);
  } else {
    for (let dy = 0; dy < brushSize; dy++) {
      for (let dx = 0; dx < brushSize; dx++) {
        setPixel(px + dx, py + dy, r, g, b, a);
      }
    }
  }
}

function getPixel(x: number, y: number): [number, number, number, number] {
  const cur = faceData[curKey()];
  if (!cur || x < 0 || x >= cur.width || y < 0 || y >= cur.height) return [0, 0, 0, 0];
  const idx = (y * cur.width + x) * 4;
  return [cur.data[idx], cur.data[idx + 1], cur.data[idx + 2], cur.data[idx + 3]];
}

function floodFill(startX: number, startY: number, fillR: number, fillG: number, fillB: number, fillA: number) {
  const cur = faceData[curKey()];
  if (!cur) return;
  const w = cur.width;
  const h = cur.height;
  const [targetR, targetG, targetB, targetA] = getPixel(startX, startY);
  if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

  const total = w * h;
  const queueX = new Int32Array(total);
  const queueY = new Int32Array(total);
  let qHead = 0;
  let qTail = 0;
  const visited = new Uint8Array(total);

  queueX[qTail] = startX;
  queueY[qTail] = startY;
  qTail++;
  visited[startY * w + startX] = 1;

  while (qHead < qTail) {
    const x = queueX[qHead];
    const y = queueY[qHead];
    qHead++;

    setPixel(x, y, fillR, fillG, fillB, fillA);

    const neighbors: [number, number][] = [
      [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
    ];
    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const k = ny * w + nx;
        if (!visited[k]) {
          visited[k] = 1;
          const [r, g, b, a] = getPixel(nx, ny);
          if (Math.abs(r - targetR) < 16 && Math.abs(g - targetG) < 16 && Math.abs(b - targetB) < 16 && Math.abs(a - targetA) < 16) {
            queueX[qTail] = nx;
            queueY[qTail] = ny;
            qTail++;
          }
        }
      }
    }
  }
}

function replaceColor(targetR: number, targetG: number, targetB: number, fillR: number, fillG: number, fillB: number, fillA: number) {
  const cur = faceData[curKey()];
  if (!cur) return;
  const w = cur.width;
  const h = cur.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = getPixel(x, y);
      if (Math.abs(r - targetR) < 15 && Math.abs(g - targetG) < 15 && Math.abs(b - targetB) < 15) {
        setPixel(x, y, fillR, fillG, fillB, fillA);
      }
    }
  }
}

// ── Mouse & Touch Event Handling on Pixel Canvas ─────────────────────────────
let isPainting = false;

function applyToolAt(px: number, py: number) {
  const cur = faceData[curKey()];
  if (!cur || px < 0 || px >= cur.width || py < 0 || py >= cur.height) return;
  const [r, g, b, a] = hexToRgba(currentColor);

  if (activeTool === "pencil") {
    applyBrush(px, py, r, g, b, a);
  } else if (activeTool === "eraser") {
    applyBrush(px, py, 0, 0, 0, 0);
  } else if (activeTool === "eyedropper") {
    const [sr, sg, sb] = getPixel(px, py);
    setColor(rgbaToHex(sr, sg, sb));
    return;
  } else if (activeTool === "bucket") {
    floodFill(px, py, r, g, b, a);
  } else if (activeTool === "replacer") {
    const [tr, tg, tb] = getPixel(px, py);
    replaceColor(tr, tg, tb, r, g, b, a);
  }

  if (!currentBlock.isCustomAsset) {
    blitFaceToAtlas(activeFace);
  } else {
    syncFaceCanvasesTo3D();
  }
  renderPixelCanvas();
}

function getCanvasCoordsFromEvent(clientX: number, clientY: number): [number, number] {
  const cur = faceData[curKey()];
  const w = cur?.width || 16;
  const h = cur?.height || 16;
  const rect = gridOverlay.getBoundingClientRect();
  const rawX = (clientX - rect.left) / rect.width;
  const rawY = (clientY - rect.top) / rect.height;
  const x = Math.max(0, Math.min(w - 1, Math.floor(rawX * w)));
  const y = Math.max(0, Math.min(h - 1, Math.floor(rawY * h)));
  return [x, y];
}

gridOverlay.addEventListener("mousedown", (ev) => {
   ev.preventDefault();
   const [x, y] = getCanvasCoordsFromEvent(ev.clientX, ev.clientY);
   saveHistory();
   isPainting = true;
   hoverCoord = [x, y];
   if (ev.shiftKey && (activeTool === "pencil" || activeTool === "eraser")) {
     // Shift-click: draw a straight line from the previous point to this one.
     if (lineStart) {
       drawLine(lineStart[0], lineStart[1], x, y);
       lineStart = null;
     } else {
       lineStart = [x, y];
       applyToolAt(x, y);
     }
   } else {
     lineStart = null;
     applyToolAt(x, y);
   }
 });

gridOverlay.addEventListener("mousemove", (ev) => {
  const [x, y] = getCanvasCoordsFromEvent(ev.clientX, ev.clientY);
  hoverCoord = [x, y];
  $("canvasCoords").textContent = `X: ${x}, Y: ${y}`;
  if (isPainting && (activeTool === "pencil" || activeTool === "eraser")) {
    applyToolAt(x, y);
  } else {
    drawGridOverlay();
  }
});

gridOverlay.addEventListener("mouseleave", () => {
  hoverCoord = null;
  drawGridOverlay();
});

window.addEventListener("mouseup", () => {
  isPainting = false;
});

// Touch events for mobile/tablets
gridOverlay.addEventListener("touchstart", (ev) => {
  if (ev.touches.length === 1) {
    ev.preventDefault();
    const t = ev.touches[0];
    const [x, y] = getCanvasCoordsFromEvent(t.clientX, t.clientY);
    saveHistory();
    isPainting = true;
    applyToolAt(x, y);
  }
}, { passive: false });

gridOverlay.addEventListener("touchmove", (ev) => {
  if (isPainting && ev.touches.length === 1) {
    ev.preventDefault();
    const t = ev.touches[0];
    const [x, y] = getCanvasCoordsFromEvent(t.clientX, t.clientY);
    if (activeTool === "pencil" || activeTool === "eraser") {
      applyToolAt(x, y);
    }
  }
}, { passive: false });

gridOverlay.addEventListener("touchend", () => {
  isPainting = false;
});

// ── Color Management & Palette ───────────────────────────────────────────────
const MINECRAFT_PALETTE = [
  "#140d07", "#261a11", "#38271a", "#422e1f", "#d89e46", "#c68c3a", "#e8b65c", "#b88032",
  "#a87028", "#1d1d21", "#b02e26", "#5e7c16", "#3c44aa", "#8932b8", "#169c9c", "#9d9d97",
  "#474f52", "#f38baa", "#80c71f", "#fed83d", "#3ab3da", "#c74ebd", "#f9801d", "#f9fffe"
];

function hexToRgbHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16) || 0;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return "#" + [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function setColor(hex: string) {
  currentColor = hex;
  $("currentColorHex").textContent = hex.toUpperCase();
  $("currentColorSwatch").style.background = hex;
  ($("nativeColorPicker") as HTMLInputElement).value = hex;
  const { r, g, b } = hexToRgbHex(hex);
  const ri = $("rgbR") as HTMLInputElement, gi = $("rgbG") as HTMLInputElement, bi = $("rgbB") as HTMLInputElement;
  if (ri) ri.value = String(r);
  if (gi) gi.value = String(g);
  if (bi) bi.value = String(b);
}

// Adaptive preset palette: the 25 most common colors across the last 10 viewed blocks.
const viewedBlocks: number[] = [];
const blockPaletteSamples = new Map<number, Map<string, number>>();

function sampleBlockColors(blockId: number): void {
  const hist = new Map<string, number>();
  const faces: Array<"side" | "top" | "bottom"> = ["side", "top", "bottom"];
  for (const half of halvesFor(currentBlock)) {
    for (const f of faces) {
      const data = faceData[faceKey(half, f)];
      if (!data) continue;
      const d = data.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = (d[i] >> 4) << 4, g = (d[i + 1] >> 4) << 4, b = (d[i + 2] >> 4) << 4;
        const key = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
        hist.set(key, (hist.get(key) || 0) + 1);
      }
    }
  }
  blockPaletteSamples.set(blockId, hist);
}

function pushViewedBlock(blockId: number): void {
  const idx = viewedBlocks.indexOf(blockId);
  if (idx >= 0) viewedBlocks.splice(idx, 1);
  viewedBlocks.unshift(blockId);
  sampleBlockColors(blockId);
  while (viewedBlocks.length > 10) {
    const removed = viewedBlocks.pop();
    if (removed != null) blockPaletteSamples.delete(removed);
  }
}

function recomputePresetPalette(): string[] {
  const agg = new Map<string, number>();
  for (const id of viewedBlocks) {
    const h = blockPaletteSamples.get(id);
    if (!h) continue;
    for (const [c, n] of h) agg.set(c, (agg.get(c) || 0) + n);
  }
  const top = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([c]) => c);
  return top.length ? top : MINECRAFT_PALETTE.slice(0, 25);
}

function renderPalette() {
  const grid = $("paletteGrid");
  grid.innerHTML = "";
  for (const col of recomputePresetPalette()) {
    const dot = document.createElement("div");
    dot.className = "palette-dot";
    dot.style.background = col;
    dot.title = col;
    dot.onclick = () => setColor(col);
    grid.appendChild(dot);
  }
}

// ── HSL Recolor & Filters ────────────────────────────────────────────────────
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360 / 360;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function applyHslFilters() {
  const hueShift = Number(($("sliderHue") as HTMLInputElement).value);
  const satMult = Number(($("sliderSat") as HTMLInputElement).value) / 100;
  const lightShift = Number(($("sliderLight") as HTMLInputElement).value) / 100;
  const contrast = Number(($("sliderContrast") as HTMLInputElement).value) / 100;

  $("valHue").textContent = `${hueShift}°`;
  $("valSat").textContent = `${Math.round(satMult * 100)}%`;
  $("valLight").textContent = `${Math.round(lightShift * 100)}%`;
  $("valContrast").textContent = `${Math.round(contrast * 100)}%`;

  const orig = originalFaceData[curKey()];
  const cur = faceData[curKey()];
  if (!orig || !cur) return;

  for (let i = 0; i < 16 * 16; i++) {
    const idx = i * 4;
    const a = orig.data[idx + 3];
    if (a === 0) continue;

    let [h, s, l] = rgbToHsl(orig.data[idx], orig.data[idx + 1], orig.data[idx + 2]);

    // Apply adjustments
    h = (h + hueShift) % 360;
    s = Math.max(0, Math.min(1, s * satMult));
    l = Math.max(0, Math.min(1, l + lightShift));

    // Contrast
    if (contrast !== 0) {
      l = Math.max(0, Math.min(1, (l - 0.5) * (1 + contrast) + 0.5));
    }

    const [nr, ng, nb] = hslToRgb(h, s, l);
    cur.data[idx] = nr;
    cur.data[idx + 1] = ng;
    cur.data[idx + 2] = nb;
    cur.data[idx + 3] = a;
  }

  blitFaceToAtlas(activeFace);
  renderPixelCanvas();
}

// ── Select Block & Face ──────────────────────────────────────────────────────
function updateHalfTabs() {
  const kinds = twoBlockKind(currentBlock);
  const tabs = $("halfTabs") as HTMLElement;
  const hasTwo = kinds === "door";
  tabs.style.display = hasTwo ? "flex" : "none";
  const btns = tabs.querySelectorAll(".tab");
  btns.forEach((t) => {
    const half = t.getAttribute("data-half");
    if (!half) return;
    t.classList.toggle("active", half === activeHalf);
  });
  if (hasTwo && activeHalf === "single") activeHalf = "lower";
  if (!hasTwo) activeHalf = "single";
}

async function selectBlock(b: Entry) {
  currentBlock = b;
  $("metaName").textContent = b.name;
  $("metaId").textContent = `#${b.id}`;
  $("metaCat").textContent = isCustomAsset(b) ? "Custom Asset" : (b.category || "block");
  history.replaceState(null, "", `?id=${b.id}`);
  positionState = getSavedOffset(b.id);
  loadPositionUI();

  activeHalf = "single";
  updateHalfTabs();

  if (isCustomAsset(b)) {
    $("metaTexture").textContent = "Uploaded Material";
    $("metaTile").textContent = `Block #${b.id}`;
    await loadCustomAssetFaces(b.id);
  } else {
    for (const half of halvesFor(b)) {
      await loadFaceFromAtlas("side", half);
      await loadFaceFromAtlas("top", half);
      await loadFaceFromAtlas("bottom", half);
    }
    const tile = getTileIndexForFace(activeFace, activeHalf);
    const file = TILE_TO_FILE[tile] || "custom.png";
    $("metaTexture").textContent = file;
    $("metaTile").textContent = `Slot ${tile} (col: ${tile % 32}, row: ${Math.floor(tile / 32)})`;
  }

  pushViewedBlock(b.id);
  updateFaceTabs();
  update3DGeometry();
  renderPixelCanvas();
  renderPalette();
}

interface UploadedSource {
  img: HTMLImageElement;
  zoom: number; // default 100
}
const uploadedSources: Record<string, UploadedSource> = {};

let canvasViewZoom = 1;

function updateCanvasViewZoom() {
  const inner = document.getElementById("canvasInner");
  if (inner) {
    inner.style.transform = `scale(${canvasViewZoom})`;
  }
  const zoomLabel = document.getElementById("canvasZoom");
  if (zoomLabel) {
    zoomLabel.textContent = `${canvasViewZoom}x`;
  }
}

function applySourceToFace(key = curKey(), userZoom?: number) {
  const src = uploadedSources[key];
  if (!src) return;
  if (userZoom !== undefined) src.zoom = userZoom;
  const { img, zoom } = src;
  const resSelect = document.getElementById("faceResolutionSelect") as HTMLSelectElement | null;
  const resVal = resSelect?.value || "16";
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;
  const minDim = Math.min(origW, origH);
  const targetDim = resVal === "native" ? Math.min(512, Math.max(16, minDim)) : Number(resVal);

  const zoomFactor = Math.max(0.5, (zoom || 100) / 100);
  const cropSize = minDim / zoomFactor;
  const sx = Math.max(0, (origW - cropSize) / 2);
  const sy = Math.max(0, (origH - cropSize) / 2);

  const cv = document.createElement("canvas");
  cv.width = cv.height = targetDim;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, targetDim, targetDim);
  const newImgData = ctx.getImageData(0, 0, targetDim, targetDim);

  saveHistory();
  faceData[key] = newImgData;

  if (!currentBlock.isCustomAsset) {
    blitFaceToAtlas(activeFace, activeHalf);
  } else {
    syncFaceCanvasesTo3D();
  }

  renderPixelCanvas();
}

function changeFaceResolution(newDim: string) {
  const key = curKey();
  const cur = faceData[key];
  if (!cur) return;
  if (uploadedSources[key]) {
    applySourceToFace(key);
    return;
  }
  const dim = newDim === "native" ? cur.width : Number(newDim);
  if (dim === cur.width && dim === cur.height) return;

  const tempCv = document.createElement("canvas");
  tempCv.width = cur.width;
  tempCv.height = cur.height;
  tempCv.getContext("2d")!.putImageData(cur, 0, 0);

  const cv = document.createElement("canvas");
  cv.width = cv.height = dim;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCv, 0, 0, cur.width, cur.height, 0, 0, dim, dim);

  saveHistory();
  faceData[key] = ctx.getImageData(0, 0, dim, dim);

  if (!currentBlock.isCustomAsset) {
    blitFaceToAtlas(activeFace, activeHalf);
  } else {
    syncFaceCanvasesTo3D();
  }

  renderPixelCanvas();
  showToast(`📐 Changed face resolution to ${dim}×${dim}`);
}

function updateFaceTabs() {
  const tabs = $("faceTabs").querySelectorAll(".tab");
  tabs.forEach((t) => {
    const face = t.getAttribute("data-face");
    if (face === "position") t.classList.toggle("active", positionMode);
    else t.classList.toggle("active", !positionMode && face === activeFace);
  });

  const panel = document.getElementById("positionPanel");
  const canvasCard = document.getElementById("modePaintCard");
  const zoomPanel = document.getElementById("textureZoomPanel");
  const uploadLabel = document.getElementById("lblUploadFace");
  const faceUploadWrap = uploadLabel?.parentElement as HTMLElement | null;
  if (panel) panel.style.display = positionMode ? "flex" : "none";
  if (canvasCard) canvasCard.style.display = positionMode ? "none" : "";
  if (zoomPanel) zoomPanel.style.display = positionMode ? "none" : "";
  if (uploadLabel) uploadLabel.style.display = positionMode ? "none" : "";
  if (faceUploadWrap) faceUploadWrap.style.display = positionMode ? "none" : "";
  if (positionMode) loadPositionUI();
  setCellWireHighlight(positionMode);

  const faceLabel = positionMode ? "POSITIONING" : `${activeHalf !== "single" ? activeHalf + " " : ""}${activeFace.toUpperCase()}`;
  const indicator = document.getElementById("activeFaceIndicator");
  if (indicator) indicator.textContent = faceLabel;
  const targetName = document.getElementById("uploadFaceTargetName");
  if (targetName) targetName.textContent = faceLabel;
  const canvasFace = document.getElementById("canvasFaceName");
  if (canvasFace) canvasFace.textContent = faceLabel;

  const key = curKey();
  const src = uploadedSources[key];
  const slider = document.getElementById("sliderTextureZoom") as HTMLInputElement | null;
  const valLabel = document.getElementById("valTextureZoom");
  if (slider && valLabel) {
    const z = src ? src.zoom : 100;
    slider.value = String(z);
    valLabel.textContent = `${z}%`;
  }

  const cur = faceData[key];
  const resSelect = document.getElementById("faceResolutionSelect") as HTMLSelectElement | null;
  if (resSelect && cur) {
    if (cur.width === 16) resSelect.value = "16";
    else if (cur.width === 32) resSelect.value = "32";
    else if (cur.width === 64) resSelect.value = "64";
    else resSelect.value = "native";
  }
}

function handleFaceTextureUpload(file: File) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("⚠️ Please select a valid image file (PNG, JPG, WebP)");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const key = curKey();
      uploadedSources[key] = { img, zoom: 100 };

      const slider = document.getElementById("sliderTextureZoom") as HTMLInputElement | null;
      if (slider) slider.value = "100";
      const valLabel = document.getElementById("valTextureZoom");
      if (valLabel) valLabel.textContent = "100%";

      applySourceToFace(key, 100);

      const faceLabel = `${activeHalf !== "single" ? activeHalf + " " : ""}${activeFace.toUpperCase()}`;
      showToast(`📁 Uploaded ${file.name} to ${faceLabel} face!`);
    };
    img.onerror = () => {
      showToast("⚠️ Error loading image file");
    };
    img.src = reader.result as string;
  };
  reader.onerror = () => {
    showToast("⚠️ Error reading file");
  };
  reader.readAsDataURL(file);
}

// ── Save & Export & Reset Functions ──────────────────────────────────────────
function showToast(msg: string) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function applyToGame() {
  const overrides: Record<string, string> = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
  const chestPixels: Record<string, number[]> = {};

  const faces: Array<"side" | "top" | "bottom"> = ["side", "top", "bottom"];
  const halves = halvesFor(currentBlock);

  if (isCustomAsset(currentBlock)) {
    for (const half of halves) {
      for (const f of faces) {
        const data = faceData[faceKey(half, f)];
        if (!data) continue;
        const cv = document.createElement("canvas");
        cv.width = data.width;
        cv.height = data.height;
        const ctx = cv.getContext("2d")!;
        ctx.putImageData(data, 0, 0);
        const dataUrl = cv.toDataURL("image/png");
        overrides[`block_${currentBlock.id}_${half}_${f}`] = dataUrl;
        overrides[`block_${currentBlock.id}_${f}`] = dataUrl;
        if (f === "side") overrides[`block_${currentBlock.id}`] = dataUrl;
      }
    }
  } else if (currentBlock.id === 43) {
    // Chest keeps the legacy write path — its faces live on the chest entity
    // canvas (chest.ts), not plain atlas tiles, and it reads the flat keys here.
    for (const half of halves) {
      for (const f of faces) {
        const data = faceData[faceKey(half, f)];
        if (!data) continue;
        const tile = getTileIndexForFace(f, half);
        const cv = document.createElement("canvas");
        cv.width = cv.height = 16;
        const ctx = cv.getContext("2d")!;
        ctx.putImageData(data, 0, 0);
        const dataUrl = cv.toDataURL("image/png");
        overrides[`block_${currentBlock.id}_${half}_${f}`] = dataUrl;
        if (f === "side") overrides[String(tile)] = dataUrl;
        chestPixels[f] = Array.from(data.data);
      }
    }
    localStorage.setItem("mc_custom_chest_pixels", JSON.stringify(chestPixels));
  } else {
    // Drop every override this block previously wrote (per-half + legacy flat
    // keys + custom face slots) so a stale untouched face can no longer clobber
    // the shared tile or a custom per-face tile.
    for (const half of halves) {
      for (const f of faces) {
        delete overrides[`block_${currentBlock.id}_${half}_${f}`];
        delete overrides[`block_${currentBlock.id}_${f}`];
        const slot = customFaceTile(currentBlock.id, f);
        if (slot != null) delete overrides[String(slot)];
      }
    }

    // Persist only faces that actually differ from the vanilla tile. Faces that
    // share one tile (torch: side/top/bottom all use tile 81) must not write
    // their unedited copy — the game's last-wins redraw would then overwrite the
    // user's edit with vanilla, which is the "torch edit doesn't apply" bug.
    const writtenTiles = new Set<number>();
    for (const half of halves) {
      for (const f of faces) {
        const data = faceData[faceKey(half, f)];
        if (!data) continue;
        const tile = getTileIndexForFace(f, half);
        if (sameFacePixels(data, vanillaFaceData(tile))) continue;
        const cv = document.createElement("canvas");
        cv.width = cv.height = 16;
        const ctx = cv.getContext("2d")!;
        ctx.putImageData(data, 0, 0);
        const dataUrl = cv.toDataURL("image/png");
        overrides[`block_${currentBlock.id}_${half}_${f}`] = dataUrl;
        overrides[`block_${currentBlock.id}_${f}`] = dataUrl;
        // Faces that map to a dedicated per-face slot (non-cube models like the
        // torch) write there so a separate top/bottom texture actually renders.
        const slot = customFaceTile(currentBlock.id, f);
        if (slot != null) {
          overrides[String(slot)] = dataUrl;
        } else if (!writtenTiles.has(tile)) {
          // The generic numeric tile override is written once per tile, from the
          // first modified face (side is processed first), so the game's redraw
          // resolves the shared slot to the canonical side texture.
          writtenTiles.add(tile);
          overrides[String(tile)] = dataUrl;
        }
      }
    }
  }

async function exportCurrentBlockToGlb(): Promise<ArrayBuffer | null> {
  const exporter = new GLTFExporter();
  const geom = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geom, boxMaterialArray);
  return new Promise((resolve) => {
    exporter.parse(
      mesh,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          resolve(null);
        }
      },
      (error) => {
        console.error("GLTFExporter error:", error);
        resolve(null);
      },
      { binary: true }
    );
  });
}

function updateIndexedDbCustomAsset(gameId: number, glbBuffer: ArrayBuffer): void {
  try {
    const req = indexedDB.open("hollow-pine-build-assets");
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("inventory")) return;
      const tx = db.transaction("inventory", "readwrite");
      const store = tx.objectStore("inventory");
      const getAll = store.getAll();
      getAll.onsuccess = () => {
        const items = getAll.result as any[];
        const match = items.find((it) => it.gameId === gameId);
        if (match) {
          match.buffer = glbBuffer;
          match.size = glbBuffer.byteLength;
          store.put(match);
        }
      };
    };
  } catch {}
}

  overrides[`block_${currentBlock.id}_offset`] = `${positionState.x},${positionState.y},${positionState.z}`;

  localStorage.setItem("mc_custom_atlas_overrides", JSON.stringify(overrides));
  const version = Date.now();
  localStorage.setItem("mc_custom_atlas_version", String(version));
  window.dispatchEvent(new StorageEvent("storage", { key: "mc_custom_atlas_version", newValue: String(version) }));
  window.dispatchEvent(new StorageEvent("storage", { key: "mc_custom_atlas_overrides", newValue: JSON.stringify(overrides) }));
  window.dispatchEvent(new CustomEvent("custom-assets-updated", { detail: { id: currentBlock.id, version } }));

  syncFaceCanvasesTo3D();

  // If this is a custom asset block, re-export the binary GLB and update server + IndexedDB
  if (isCustomAsset(currentBlock)) {
    exportCurrentBlockToGlb().then(async (glbBuffer) => {
      if (glbBuffer) {
        updateIndexedDbCustomAsset(currentBlock.id, glbBuffer);
        try {
          await fetch(`/api/custom-assets/${currentBlock.id}/data`, {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: glbBuffer
          });
        } catch (e) {
          console.error("Failed to update custom asset GLB data:", e);
        }
        if (location.port === "5450") {
          try {
            await fetch(`${location.protocol}//${location.hostname}:5400/api/custom-assets/${currentBlock.id}/data`, {
              method: "PUT",
              headers: { "Content-Type": "application/octet-stream" },
              body: glbBuffer
            });
          } catch {}
        }
      }
    });
  }

  // Persist to the DB (worldgen/config db) so the overrides survive reloads and
  // reach any game tab/device; the game's poll re-applies on the fly.
  saveTextureOverrides(overrides, chestPixels, version).then((ok) => {
    showToast(ok ? "💾 Saved to DB + applied in-game!" : "💾 Saved locally (DB sync failed)");
  });
  // Also push to the production backend so textures reach production game
  if (location.port === "5450") {
    const prodUrl = `${location.protocol}//${location.hostname}:5400/api/textures/overrides`;
    fetch(prodUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atlas: overrides, chestPixels, version })
    }).then((r) => {
      if (r.ok) showToast("🚀 Pushed to production!");
    }).catch(() => {});
  }
  showToast("💾 Saved! Custom textures applied and active in-game!");
}

function downloadCurrentFacePng() {
  const cur = faceData[curKey()];
  if (!cur) return;
  const cv = document.createElement("canvas");
  cv.width = cur.width;
  cv.height = cur.height;
  cv.getContext("2d")!.putImageData(cur, 0, 0);

  const tile = getTileIndexForFace(activeFace, activeHalf);
  const name = (TILE_TO_FILE[tile] || `${currentBlock.name.toLowerCase().replace(/\s+/g, "_")}_${activeHalf}_${activeFace}.png`);

  const a = document.createElement("a");
  a.href = cv.toDataURL("image/png");
  a.download = name;
  a.click();
  showToast(`⬇️ Downloaded ${name}!`);
}

function resetFace() {
  saveHistory();
  if (currentBlock.id === 43) {
    const def = createChestFaceImageData(activeFace);
    faceData[curKey()] = def;
    originalFaceData[curKey()] = new ImageData(new Uint8ClampedArray(def.data), 16, 16);
    blitFaceToAtlas(activeFace, activeHalf);
    renderPixelCanvas();
    showToast(`🔄 Reset ${activeHalf !== "single" ? activeHalf + " " : ""}${activeFace} face to official dark border texture!`);
    return;
  }

  if (currentBlock.id === 80 || currentBlock.id === 81 || currentBlock.id === 84) {
    const def = createTorchFaceImageData(activeFace, currentBlock.id);
    faceData[curKey()] = def;
    originalFaceData[curKey()] = new ImageData(new Uint8ClampedArray(def.data), 16, 16);
    blitFaceToAtlas(activeFace, activeHalf);
    renderPixelCanvas();
    showToast(`🔄 Reset ${activeFace} face to fitted torch texture!`);
    return;
  }

  const orig = originalFaceData[curKey()];
  if (orig && faceData[curKey()]) {
    faceData[curKey()].data.set(orig.data);
    if (!currentBlock.isCustomAsset) {
      blitFaceToAtlas(activeFace, activeHalf);
    } else {
      syncFaceCanvasesTo3D();
    }
    renderPixelCanvas();

    // Remove this tile override + per-half block override + custom face slot
    // from localStorage if present
    try {
      const overrides = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
      const tile = getTileIndexForFace(activeFace, activeHalf);
      delete overrides[String(tile)];
      delete overrides[`block_${currentBlock.id}_${activeHalf}_${activeFace}`];
      delete overrides[`block_${currentBlock.id}_${activeFace}`];
      const slot = customFaceTile(currentBlock.id, activeFace);
      if (slot != null) delete overrides[String(slot)];
      localStorage.setItem("mc_custom_atlas_overrides", JSON.stringify(overrides));
    } catch {}

    showToast(`🔄 Reset ${activeHalf !== "single" ? activeHalf + " " : ""}${activeFace} face to vanilla texture!`);
  }
}

// ── Undo / Redo ──────────────────────────────────────────────────────────────
const applyHistory = (state: HistoryState, dir: "undo" | "redo") => {
  const cur = faceData[state.face];
  if (!cur) return;
  const [h, f] = state.face.split(":") as [Half, "side" | "top" | "bottom"];
  if (!f || (h !== "lower" && h !== "upper" && h !== "single")) return;
  if (dir === "undo") redoStack.push({ face: state.face, data: new Uint8ClampedArray(cur.data) });
  else undoStack.push({ face: state.face, data: new Uint8ClampedArray(cur.data) });
  cur.data.set(state.data);
  activeHalf = h;
  activeFace = f;
  updateHalfTabs();
  updateFaceTabs();
  blitFaceToAtlas(f, h);
  renderPixelCanvas();
};

$("btnUndo").addEventListener("click", () => {
  if (undoStack.length === 0) return;
  applyHistory(undoStack.pop()!, "undo");
});

$("btnRedo").addEventListener("click", () => {
  if (redoStack.length === 0) return;
  applyHistory(redoStack.pop()!, "redo");
});

// ── Wire UI Event Listeners ──────────────────────────────────────────────────
async function initStudio() {
  await atlasReady;

  // Populate block selector (filterable by object shape: cube / custom / 3D / cross / flat)
  const blockEntries: Entry[] = (catalog as Entry[]).filter((e) => e.id > 0 && ("side" in e || "top" in e));

  // Dynamically load custom assets from /api/custom-assets
  try {
    const customRes = await fetch("/api/custom-assets");
    if (customRes.ok) {
      const customData = await customRes.json();
      if (Array.isArray(customData.assets)) {
        for (const asset of customData.assets) {
          if (!blockEntries.some((e) => e.id === asset.id)) {
            blockEntries.push({
              id: asset.id,
              name: asset.name,
              category: "custom",
              isCustomAsset: true
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch custom assets:", err);
  }

  // Check URL param ?id= (defaults to Chest #43 if not specified or id=43)
  const params = new URLSearchParams(window.location.search);
  const targetId = params.has("id") ? Number(params.get("id")) : 43;

  if (isCustomAsset({ id: targetId }) && !blockEntries.some((e) => e.id === targetId)) {
    try {
      const singleRes = await fetch(`/api/custom-assets/${targetId}`);
      if (singleRes.ok) {
        blockEntries.push({
          id: targetId,
          name: `Custom Block #${targetId}`,
          category: "custom",
          isCustomAsset: true
        });
      }
    } catch {}
  }

  const shapeOf = (id: number) => {
    const e = blockEntries.find((b) => b.id === id);
    if (e && isCustomAsset(e)) return "custom";
    return (shapes as Record<string, string>)[String(id)] || "cube";
  };

  function renderBlockList() {
    const shape = ($("shapeFilter") as HTMLSelectElement).value;
    const filtered = shape === "all"
      ? blockEntries
      : shape === "custom"
      ? blockEntries.filter((e) => isCustomAsset(e))
      : blockEntries.filter((e) => shapeOf(e.id) === shape);
    blockSelect.innerHTML = filtered.map((e) => `<option value="${e.id}">#${e.id} · ${e.name} (${shapeOf(e.id)})</option>`).join("");
    if (!filtered.some((e) => e.id === currentBlock?.id)) {
      const pick = filtered.find((e) => e.id === targetId) || filtered.find((e) => e.id === 43) || filtered[0];
      if (pick) { blockSelect.value = String(pick.id); void selectBlock(pick); }
    } else {
      blockSelect.value = String(currentBlock.id);
    }
  }

  const initial = blockEntries.find((e) => e.id === targetId) || blockEntries.find((e) => e.id === 43) || blockEntries[0];
  renderBlockList();
  blockSelect.value = String(initial.id);
  ($("shapeFilter") as HTMLSelectElement).addEventListener("change", renderBlockList);

  await selectBlock(initial);
  renderPalette();

  blockSelect.addEventListener("change", () => {
    const b = blockEntries.find((e) => e.id === Number(blockSelect.value));
    if (b) void selectBlock(b);
  });

  // Half tabs (Lower / Upper) for two-block objects like doors
  $("halfTabs").addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement).closest(".tab");
    if (!t) return;
    const h = t.getAttribute("data-half");
    if (h === "lower" || h === "upper") {
      activeHalf = h;
      updateHalfTabs();
      renderPixelCanvas();
      const tile = getTileIndexForFace(activeFace, activeHalf);
      $("metaTexture").textContent = TILE_TO_FILE[tile] || "custom.png";
      $("metaTile").textContent = `Slot ${tile} (col: ${tile % 32}, row: ${Math.floor(tile / 32)})`;
    }
  });

  // Face tabs (Side, Top, Bottom)
  $("faceTabs").addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement).closest(".tab");
    if (!t) return;
    const f = t.getAttribute("data-face");
    if (f === "position") {
      positionMode = true;
      activeFace = "side"; // face view stays on side; position panel shows
      updateFaceTabs();
      return;
    }
    if (f === "side" || f === "top" || f === "bottom") {
      positionMode = false;
      activeFace = f;
      updateFaceTabs();
      renderPixelCanvas();
      const tile = getTileIndexForFace(activeFace);
      $("metaTexture").textContent = TILE_TO_FILE[tile] || "custom.png";
      $("metaTile").textContent = `Slot ${tile} (col: ${tile % 32}, row: Math.floor(tile / 32))`;
    }
  });

  // Positioning tab controls
  (["posX", "posY", "posZ"] as const).forEach((id) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    el?.addEventListener("input", applyPositionFromUI);
  });
  document.getElementById("posCenterY")?.addEventListener("click", () => {
    positionState = { x: positionState.x, y: -0.5, z: positionState.z };
    loadPositionUI();
    update3DGeometry();
    showToast("⏹ Y offset set to -0.5 (centered in cell)");
  });
  document.getElementById("posReset")?.addEventListener("click", () => {
    positionState = { x: 0, y: 0, z: 0 };
    loadPositionUI();
    update3DGeometry();
    showToast("↺ Positioning reset to default (0,0,0)");
  });
  document.getElementById("btn3DPosition")?.addEventListener("click", () => {
    positionMode = true;
    activeFace = "side";
    updateFaceTabs();
    showToast("📐 Position the block within the 1×1×1 cell, then Save & Apply");
  });
  document.getElementById("posSave")?.addEventListener("click", () => {
    applyToGame();
  });

  // Resizable split between the texture area and the 3D viewport (persisted).
  const splitHandle = document.getElementById("splitHandle");
  const studio = document.querySelector(".studio-container") as HTMLElement | null;
  if (splitHandle && studio) {
    const savedW = Number(localStorage.getItem("mc_editor_right_width"));
    if (savedW > 0) studio.style.setProperty("--right-w", savedW + "px");
    let splitDragging = false;
    const onSplitMove = (ev: MouseEvent) => {
      if (!splitDragging) return;
      const rect = studio.getBoundingClientRect();
      const rightW = Math.max(220, Math.min(rect.width - 340, rect.right - ev.clientX));
      studio.style.setProperty("--right-w", rightW + "px");
      resize3D();
    };
    const onSplitUp = () => {
      splitDragging = false;
      document.body.style.cursor = "";
      const w = parseFloat(studio.style.getPropertyValue("--right-w")) || 340;
      localStorage.setItem("mc_editor_right_width", String(Math.round(w)));
      window.removeEventListener("mousemove", onSplitMove);
      window.removeEventListener("mouseup", onSplitUp);
    };
    splitHandle.addEventListener("mousedown", (ev) => {
      splitDragging = true;
      ev.preventDefault();
      document.body.style.cursor = "col-resize";
      window.addEventListener("mousemove", onSplitMove);
      window.addEventListener("mouseup", onSplitUp);
    });
  }

  // Face texture file upload
  const fileInput = document.getElementById("faceTextureFileInput") as HTMLInputElement;
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (file) {
        handleFaceTextureUpload(file);
        fileInput.value = "";
      }
    });
  }

  // Drag & drop texture image onto the canvas card
  const canvasWrap = document.getElementById("canvasWrap");
  if (canvasWrap) {
    canvasWrap.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      canvasWrap.classList.add("drag-over");
    });
    canvasWrap.addEventListener("dragleave", () => {
      canvasWrap.classList.remove("drag-over");
    });
    canvasWrap.addEventListener("drop", (ev) => {
      ev.preventDefault();
      canvasWrap.classList.remove("drag-over");
      const file = ev.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        handleFaceTextureUpload(file);
      }
    });
  }

  // Face resolution change
  const resSelect = document.getElementById("faceResolutionSelect") as HTMLSelectElement | null;
  if (resSelect) {
    resSelect.addEventListener("change", () => {
      changeFaceResolution(resSelect.value);
    });
  }

  // Texture crop zoom slider
  const zoomSlider = document.getElementById("sliderTextureZoom") as HTMLInputElement | null;
  const zoomVal = document.getElementById("valTextureZoom");
  if (zoomSlider) {
    zoomSlider.addEventListener("input", () => {
      const z = Number(zoomSlider.value);
      if (zoomVal) zoomVal.textContent = `${z}%`;
      applySourceToFace(curKey(), z);
    });
  }

  // Brush size tabs
  const brushTabs = document.getElementById("brushSizeTabs");
  if (brushTabs) {
    brushTabs.addEventListener("click", (ev) => {
      const t = (ev.target as HTMLElement).closest(".tab");
      if (!t) return;
      const b = Number(t.getAttribute("data-brush") || "1");
      brushSize = b;
      brushTabs.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.toggle("active", tab === t);
      });
      drawGridOverlay();
    });
  }

  // Canvas View Zoom controls
  const btnZoomIn = document.getElementById("btnZoomIn");
  const btnZoomOut = document.getElementById("btnZoomOut");
  const btnZoomReset = document.getElementById("btnZoomReset");
  if (btnZoomIn) {
    btnZoomIn.addEventListener("click", () => {
      if (canvasViewZoom < 4) {
        canvasViewZoom = Math.min(4, canvasViewZoom + 0.5);
        updateCanvasViewZoom();
      }
    });
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener("click", () => {
      if (canvasViewZoom > 0.5) {
        canvasViewZoom = Math.max(0.5, canvasViewZoom - 0.5);
        updateCanvasViewZoom();
      }
    });
  }
  if (btnZoomReset) {
    btnZoomReset.addEventListener("click", () => {
      canvasViewZoom = 1;
      updateCanvasViewZoom();
    });
  }

  // Tool buttons
  document.querySelectorAll(".tool-btn[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tool-btn[data-tool]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeTool = btn.getAttribute("data-tool") as any;
    });
  });

  $("btnGridToggle").addEventListener("click", () => {
    showGrid = !showGrid;
    $("btnGridToggle").classList.toggle("active", showGrid);
    $("btnGridToggle").innerHTML = showGrid ? "<span class=\"icon\">▦</span>Grid On" : "<span class=\"icon\">▢</span>Grid Off";
    drawGridOverlay();
  });

  // Color picker
  $("nativeColorPicker").addEventListener("input", (ev) => {
    setColor((ev.target as HTMLInputElement).value);
  });
  (["rgbR", "rgbG", "rgbB"] as const).forEach((id) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    el?.addEventListener("input", () => {
      const r = Number(($("rgbR") as HTMLInputElement).value) || 0;
      const g = Number(($("rgbG") as HTMLInputElement).value) || 0;
      const b = Number(($("rgbB") as HTMLInputElement).value) || 0;
      setColor(rgbToHex(r, g, b));
    });
  });

  // Mode tabs (Paint vs HSL)
  $("tabModePaint").addEventListener("click", () => {
    $("tabModePaint").classList.add("active");
    $("tabModeSliders").classList.remove("active");
    $("modePaintCard").style.display = "flex";
    $("modeSlidersCard").style.display = "none";
  });
  $("tabModeSliders").addEventListener("click", () => {
    $("tabModeSliders").classList.add("active");
    $("tabModePaint").classList.remove("active");
    $("modePaintCard").style.display = "none";
    $("modeSlidersCard").style.display = "flex";
  });

  // Sliders
  ["sliderHue", "sliderSat", "sliderLight", "sliderContrast"].forEach((id) => {
    $(id).addEventListener("input", applyHslFilters);
  });

  // Quick Filters
  $("btnFilterInvert").addEventListener("click", () => {
    saveHistory();
    const cur = faceData[curKey()];
    if (!cur) return;
    for (let i = 0; i < 16 * 16 * 4; i += 4) {
      cur.data[i] = 255 - cur.data[i];
      cur.data[i + 1] = 255 - cur.data[i + 1];
      cur.data[i + 2] = 255 - cur.data[i + 2];
    }
    blitFaceToAtlas(activeFace);
    renderPixelCanvas();
  });

  $("btnFilterGrayscale").addEventListener("click", () => {
    saveHistory();
    const cur = faceData[curKey()];
    if (!cur) return;
    for (let i = 0; i < 16 * 16 * 4; i += 4) {
      const avg = Math.round(cur.data[i] * 0.299 + cur.data[i + 1] * 0.587 + cur.data[i + 2] * 0.114);
      cur.data[i] = cur.data[i + 1] = cur.data[i + 2] = avg;
    }
    blitFaceToAtlas(activeFace);
    renderPixelCanvas();
  });

  const tintPreset = (tr: number, tg: number, tb: number) => {
    saveHistory();
    const cur = faceData[curKey()];
    if (!cur) return;
    for (let i = 0; i < 16 * 16 * 4; i += 4) {
      cur.data[i] = Math.round((cur.data[i] * tr) / 255);
      cur.data[i + 1] = Math.round((cur.data[i + 1] * tg) / 255);
      cur.data[i + 2] = Math.round((cur.data[i + 2] * tb) / 255);
    }
    blitFaceToAtlas(activeFace);
    renderPixelCanvas();
  };

  $("btnFilterRuby").addEventListener("click", () => tintPreset(255, 60, 60));
  $("btnFilterGold").addEventListener("click", () => tintPreset(255, 210, 50));
  $("btnFilterAmethyst").addEventListener("click", () => tintPreset(210, 110, 255));
  $("btnFilterEmerald").addEventListener("click", () => tintPreset(60, 255, 120));

  // Save & Apply actions (Header & Center Action Bar)
  $("btnApplyGame").addEventListener("click", applyToGame);
  $("btnApplyGameCenter").addEventListener("click", applyToGame);
  const envTag = document.getElementById("envTag");
  if (envTag) {
    const port = location.port;
    envTag.textContent = port === "5400" ? "this is production" : `dev :${port} → save is stored in the dev DB`;
  }

  // Reset actions (Header & Center Action Bar)
  $("btnResetFace").addEventListener("click", resetFace);
  $("btnResetFaceCenter").addEventListener("click", resetFace);

  // Download actions (Header & Center Action Bar)
  $("btnDownload").addEventListener("click", downloadCurrentFacePng);
  $("btnDownloadCenter").addEventListener("click", downloadCurrentFacePng);

  // 3D Actions
  $("btn3DRotate").addEventListener("click", () => {
    autoRotate3D = !autoRotate3D;
    $("btn3DRotate").classList.toggle("primary", autoRotate3D);
  });

  $("btn3DAction").addEventListener("click", () => {
    if (chest3DEntity) {
      chest3DEntity.isOpen = !chest3DEntity.isOpen;
      $("btn3DAction").innerHTML = chest3DEntity.isOpen ? "🔒 Close Chest" : "📦 Open Chest";
      return;
    }
    if (/fence/i.test(currentBlock.name) && !/gate|particle/i.test(currentBlock.name)) {
      fenceMode = fenceMode === "connected" ? "straight" : fenceMode === "straight" ? "post" : "connected";
      update3DGeometry();
      return;
    }
  });

  // Lighting select
  $("lightSelect").addEventListener("change", (ev) => {
    const val = (ev.target as HTMLSelectElement).value;
    if (val === "noon") {
      hemiLight.color.setHex(0xffffff); hemiLight.intensity = 0.95;
      dirLight1.color.setHex(0xffffff); dirLight1.intensity = 1.15;
    } else if (val === "sunset") {
      hemiLight.color.setHex(0xffb07c); hemiLight.intensity = 0.8;
      dirLight1.color.setHex(0xff8030); dirLight1.intensity = 1.4;
    } else if (val === "cave") {
      hemiLight.color.setHex(0x1a1a24); hemiLight.intensity = 0.3;
      dirLight1.color.setHex(0xff9922); dirLight1.intensity = 1.6;
    } else if (val === "night") {
      hemiLight.color.setHex(0x101530); hemiLight.intensity = 0.25;
      dirLight1.color.setHex(0x4060aa); dirLight1.intensity = 0.4;
    }
  });

  // Drag controls for 3D Viewport
  let isDragging3D = false;
  let prevX = 0, prevY = 0;
  preview3DCanvas.addEventListener("mousedown", (ev) => {
    isDragging3D = true;
    prevX = ev.clientX; prevY = ev.clientY;
    autoRotate3D = false;
    $("btn3DRotate").classList.remove("primary");
  });
  window.addEventListener("mousemove", (ev) => {
    if (!isDragging3D) return;
    const dx = ev.clientX - prevX;
    const dy = ev.clientY - prevY;
    prevX = ev.clientX; prevY = ev.clientY;
    if (positionMode && isCustomAsset(currentBlock) && block3DMesh) {
      // Position mode: drag translates the block within the 1×1×1 cell.
      positionState.x = Math.max(-0.5, Math.min(0.5, positionState.x + dx * 0.005));
      positionState.y = Math.max(-0.5, Math.min(0.5, positionState.y - dy * 0.005));
      loadPositionUI();
      block3DMesh.position.set(positionState.x, positionState.y, positionState.z);
    } else {
      blockGroup.rotation.y += dx * 0.015;
      blockGroup.rotation.x = Math.max(-0.8, Math.min(0.8, blockGroup.rotation.x + dy * 0.015));
    }
  });
  window.addEventListener("mouseup", () => { isDragging3D = false; });

  // 3D Render Loop
  resize3D();
  let lastTime = performance.now();
  function render3DLoop(now: number) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    // Authentic smooth horizontal auto-rotation
    if (autoRotate3D) {
      blockGroup.rotation.y += dt * 0.8;
    }

    if (chest3DEntity) {
      updateChestAnimation(chest3DEntity, dt);
    }

    renderer3D.render(scene3D, cam3D);
    requestAnimationFrame(render3DLoop);
  }
  requestAnimationFrame(render3DLoop);
}

initStudio();
