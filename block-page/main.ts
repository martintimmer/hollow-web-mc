import * as THREE from "three";
import catalog from "../catalog/completeRegistry.json";
import tileMap from "../catalog/textureTileMap.json";
import shapes from "../catalog/block-shapes.json";
import { AUTHENTIC_TERRAIN_ATLAS_BASE64 } from "../src/game/engine/atlasData";
import { createArticulatedChest, updateChestAnimation, ChestEntity } from "../src/game/chest";
import { apiGetCustomAssets } from "../src/services/customAssets";
import { loadCustomAssetModel, loadCustomAssetThumbnails, registerCustomAssets } from "../src/game/customAssets";
import { customFaceTile, CUSTOM_FACE_TILES } from "../src/game/engine/customFaceTiles";
import { TILE_TO_FILE } from "./shared";

const $ = (id: string) => document.getElementById(id)!;
const qEl = $("q") as HTMLInputElement;
const catEl = $("cat") as HTMLSelectElement;
const statusEl = $("status") as HTMLSelectElement;
const onlyPlacedEl = $("onlyPlaced") as HTMLInputElement;
const grid = $("grid");
const grid3d = $("grid3d");
const itemsGrid = $("itemsGrid");

const shapeOf = (id: number): string => (shapes as Record<string, string>)[String(id)] || "cube";
const shapePill = (s: string) => {
  const map: Record<string, [string, string]> = {
    cube: ["cube", "cube"], "3d": ["3D model", "d3"], cross: ["cross-billboard", "cross"], flat: ["flat decal", "flat"]
  };
  const [label, cls] = map[s] || ["cube", "cube"];
  return `<span class="pill ${cls}">${label}</span>`;
};

// ── atlas texture (real vanilla 512² atlas) ──────────────────────────────────
let atlasTex: THREE.CanvasTexture | null = null;
const atlasReady = (async () => {
  try {
    const res = await fetch("/api/textures/overrides");
    if (res.ok) {
      const doc = await res.json();
      if (doc.atlas && typeof doc.atlas === "object") {
        const local = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
        const merged = { ...local, ...doc.atlas };
        localStorage.setItem("mc_custom_atlas_overrides", JSON.stringify(merged));
      }
    }
  } catch {}

  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 512;
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // Bake per-face custom tiles from base tile
      for (const [key, slot] of Object.entries(CUSTOM_FACE_TILES)) {
        const idStr = key.slice(0, key.indexOf(":"));
        const def = (catalog as Entry[]).find((e) => e.id === Number(idStr));
        const srcTile = def ? (def.side ?? def.top ?? 0) : 0;
        const sc = srcTile % 32, sr = Math.floor(srcTile / 32);
        const dc = slot % 32, dr = Math.floor(slot / 32);
        ctx.putImageData(ctx.getImageData(sc * 16, sr * 16, 16, 16), dc * 16, dr * 16);
      }

      // Apply any saved overrides from localStorage
      try {
        const overrides = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
        const loadPromises: Promise<void>[] = [];
        for (const [key, dataUrl] of Object.entries(overrides)) {
          if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) continue;
          let tile = Number(key);
          if (isNaN(tile) && typeof key === "string" && key.startsWith("block_")) {
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
              const ovImg = new Image();
              ovImg.onload = () => {
                const col = tile % 32, row = Math.floor(tile / 32);
                ctx.clearRect(col * 16, row * 16, 16, 16);
                ctx.drawImage(ovImg, col * 16, row * 16, 16, 16);
                res();
              };
              ovImg.onerror = () => res();
              ovImg.src = dataUrl;
            }));
          }
        }
        await Promise.all(loadPromises);
      } catch {}

      atlasTex = new THREE.CanvasTexture(cv);
      atlasTex.magFilter = atlasTex.minFilter = THREE.NearestFilter;
      atlasTex.generateMipmaps = false;
      atlasTex.colorSpace = THREE.SRGBColorSpace;
      resolve();
    };
    img.src = AUTHENTIC_TERRAIN_ATLAS_BASE64;
  });
})();

// ── three.js renderer (one shared, offscreen) ────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
renderer.setSize(96, 96);
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 12);
cam.position.set(2.4, 1.9, 2.4);
cam.lookAt(0, 0, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.95));
const dirL = new THREE.DirectionalLight(0xffffff, 1.15);
dirL.position.set(3, 5, 2);
scene.add(dirL);

function tileUvs(tile: number): [number, number, number, number, number, number, number, number] {
  const T = 32;
  const u0 = (tile % T) / T, u1 = (tile % T + 1) / T;
  const row = Math.floor(tile / T);
  const v1 = 1 - row / T, v0 = 1 - (row + 1) / T;
  return [u0, v0, u1, v0, u1, v1, u0, v1];
}

function boxGeometry(top: number, side: number, bottom: number) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let f = 0; f < 6; f++) {
    const t = f === 2 ? top : f === 3 ? bottom : side;
    const col = t % 32;
    const row = Math.floor(t / 32);
    const u0 = col / 32;
    const u1 = (col + 1) / 32;
    const v1 = 1 - row / 32;
    const v0 = 1 - (row + 1) / 32;

    const base = f * 4;
    uv.setXY(base + 0, u0, v1);
    uv.setXY(base + 1, u1, v1);
    uv.setXY(base + 2, u0, v0);
    uv.setXY(base + 3, u1, v0);
  }
  uv.needsUpdate = true;
  return geo;
}

function renderCube(top: number, side: number, bottom: number, scale = 1, rotY = 0): string {
  const geo = boxGeometry(top, side, bottom);
  const mat = new THREE.MeshLambertMaterial({ map: atlasTex || undefined });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(scale);
  mesh.rotation.y = rotY;
  scene.add(mesh);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL("image/png");
  scene.remove(mesh);
  geo.dispose(); mat.dispose();
  return url;
}

function renderChest(scale = 1, rotY = 0, openAngle = 0): string {
  const chest = createArticulatedChest({ yaw: rotY });
  chest.lidGroup.rotation.x = openAngle;
  chest.root.scale.setScalar(scale);
  chest.root.position.set(0, -0.38 * scale, 0);
  scene.add(chest.root);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL("image/png");
  scene.remove(chest.root);
  return url;
}

// ── real in-game shapes for doors, trapdoors and fences ──────────────────────
// Geometry mirrors src/game/engine/chunkMesh.ts (pushDoor / pushTrapdoor /
// pushFence) so the "placed" look matches how the block renders in the world.
function applyTileUvs(geo: THREE.BufferGeometry, tile: number) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const col = tile % 32, row = Math.floor(tile / 32);
  const u0 = col / 32, u1 = (col + 1) / 32, v1 = 1 - row / 32, v0 = 1 - (row + 1) / 32;
  for (let f = 0; f < 6; f++) {
    const base = f * 4;
    uv.setXY(base + 0, u0, v1);
    uv.setXY(base + 1, u1, v1);
    uv.setXY(base + 2, u0, v0);
    uv.setXY(base + 3, u1, v0);
  }
  uv.needsUpdate = true;
}

function addCellBox(g: THREE.Group, tile: number, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  applyTileUvs(geo, tile);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: atlasTex || undefined }));
  mesh.position.set((x0 + x1) / 2 - 0.5, (y0 + y1) / 2 - 0.5, (z0 + z1) / 2 - 0.5);
  g.add(mesh);
}

function buildDoorMesh(topTile: number, bottomTile: number, open = false): THREE.Group {
  // Two-cell door: solid lower leaf + upper 2x2 window grille (same pieces as pushDoor).
  const g = new THREE.Group();
  const piece = (u0: number, u1: number, y0: number, y1: number, tile: number) => {
    if (open) addCellBox(g, tile, 0.0625, y0, 0.9375 - 0.875 * u1, 0.1875, y1, 0.9375 - 0.875 * u0);
    else addCellBox(g, tile, 0.0625 + 0.875 * u0, y0, 0.8125, 0.0625 + 0.875 * u1, y1, 1.0);
  };
  piece(0, 1, 0, 1, bottomTile);             // lower leaf (solid panels)
  piece(0, 1, 1.8125, 2.0, topTile);         // top rail
  piece(0, 1, 1.0, 1.1875, topTile);         // bottom rail
  piece(0, 1, 1.4375, 1.5625, topTile);      // center cross-rail
  piece(0, 0.1875, 1.1875, 1.8125, topTile); // left stile
  piece(0.8125, 1, 1.1875, 1.8125, topTile); // right stile
  piece(0.4375, 0.5625, 1.1875, 1.8125, topTile); // center mullion
  g.position.set(-0.5, -1, open ? -0.5 : -0.90625);
  return g;
}

function buildTrapdoorMesh(tile: number, open = false): THREE.Group {
  // 3/16-thick grille plate; closed = flat slab, open = vertical panel (pushTrapdoor).
  const g = new THREE.Group();
  const piece = (u0: number, u1: number, v0: number, v1: number) => {
    if (open) addCellBox(g, tile, u0, v0, 0.8125, u1, v1, 1.0);
    else addCellBox(g, tile, u0, 0, v0, u1, 0.1875, v1);
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

function buildFenceMesh(tile: number): THREE.Group {
  // Center post + connecting rails on all four sides (pushFence).
  const g = new THREE.Group();
  addCellBox(g, tile, 0.375, 0, 0.375, 0.625, 1.0, 0.625);
  addCellBox(g, tile, 0.4375, 0.75, 0, 0.5625, 0.9375, 0.375);
  addCellBox(g, tile, 0.4375, 0.375, 0, 0.5625, 0.5625, 0.375);
  addCellBox(g, tile, 0.4375, 0.75, 0.625, 0.5625, 0.9375, 1.0);
  addCellBox(g, tile, 0.4375, 0.375, 0.625, 0.5625, 0.5625, 1.0);
  addCellBox(g, tile, 0, 0.75, 0.4375, 0.375, 0.9375, 0.5625);
  addCellBox(g, tile, 0, 0.375, 0.4375, 0.375, 0.5625, 0.5625);
  addCellBox(g, tile, 0.625, 0.75, 0.4375, 1.0, 0.9375, 0.5625);
  addCellBox(g, tile, 0.625, 0.375, 0.4375, 1.0, 0.5625, 0.5625);
  g.position.set(-0.5, -0.5, -0.5);
  return g;
}

function buildCrossBillboardMesh(tile: number): THREE.Group {
  const g = new THREE.Group();
  const col = tile % 32, row = Math.floor(tile / 32);
  const u0 = col / 32, u1 = (col + 1) / 32, v1 = 1 - row / 32, v0 = 1 - (row + 1) / 32;
  const mat = new THREE.MeshLambertMaterial({ map: atlasTex || undefined, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide });

  const geo = new THREE.BufferGeometry();
  const pos = [
    -0.5, 0.5, -0.5,  0.5, 0.5, 0.5,  -0.5, -0.5, -0.5,  0.5, -0.5, 0.5,
    -0.5, 0.5,  0.5,  0.5, 0.5,-0.5,  -0.5, -0.5,  0.5,  0.5, -0.5,-0.5
  ];
  const uvs = [
    u0, v1,  u1, v1,  u0, v0,  u1, v0,
    u0, v1,  u1, v1,  u0, v0,  u1, v0
  ];
  const idx = [
    0, 1, 2,  2, 1, 3,
    4, 5, 6,  6, 5, 7
  ];
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, mat);
  g.add(mesh);
  return g;
}

function buildHighGrassMesh(botTile = 815, topTile = 816): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ map: atlasTex || undefined, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide });

  const addTier = (y0: number, y1: number, tile: number) => {
    const col = tile % 32, row = Math.floor(tile / 32);
    const u0 = col / 32, u1 = (col + 1) / 32, v1 = 1 - row / 32, v0 = 1 - (row + 1) / 32;
    const geo = new THREE.BufferGeometry();
    const pos = [
      -0.5, y1, -0.5,  0.5, y1, 0.5,  -0.5, y0, -0.5,  0.5, y0, 0.5,
      -0.5, y1,  0.5,  0.5, y1,-0.5,  -0.5, y0,  0.5,  0.5, y0,-0.5
    ];
    const uvs = [
      u0, v1,  u1, v1,  u0, v0,  u1, v0,
      u0, v1,  u1, v1,  u0, v0,  u1, v0
    ];
    const idx = [
      0, 1, 2,  2, 1, 3,
      4, 5, 6,  6, 5, 7
    ];
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, mat));
  };

  addTier(-0.5, 0.5, botTile);
  addTier(0.5, 1.5, topTile);
  g.position.set(0, -0.5, 0);
  return g;
}

function buildTropicalBushMesh(botTile = 496, topTile = 497): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ map: atlasTex || undefined, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide });

  const addTier = (y0: number, y1: number, tile: number) => {
    const col = tile % 32, row = Math.floor(tile / 32);
    const u0 = col / 32, u1 = (col + 1) / 32, v1 = 1 - row / 32, v0 = 1 - (row + 1) / 32;
    const geo = new THREE.BufferGeometry();
    const hr = 0.65;
    const pos = [
      -hr, y1, -hr,   hr, y1,  hr,  -hr, y0, -hr,   hr, y0,  hr,
      -hr, y1,  hr,   hr, y1, -hr,  -hr, y0,  hr,   hr, y0, -hr,
      -hr, y1,   0,   hr, y1,   0,  -hr, y0,   0,   hr, y0,   0,
        0, y1, -hr,    0, y1,  hr,    0, y0, -hr,    0, y0,  hr
    ];
    const uvs = [
      u0, v1,  u1, v1,  u0, v0,  u1, v0,
      u0, v1,  u1, v1,  u0, v0,  u1, v0,
      u0, v1,  u1, v1,  u0, v0,  u1, v0,
      u0, v1,  u1, v1,  u0, v0,  u1, v0
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
    g.add(new THREE.Mesh(geo, mat));
  };

  addTier(-0.5, 0.5, botTile);
  addTier(0.5, 1.5, topTile);
  g.position.set(0, -0.5, 0);
  return g;
}

function addCellBoxPerFace(
  g: THREE.Group,
  sideTile: number,
  topTile: number,
  bottomTile: number,
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number
) {
  const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let f = 0; f < 6; f++) {
    const tile = (f === 2) ? topTile : (f === 3) ? bottomTile : sideTile;
    const col = tile % 32, row = Math.floor(tile / 32);
    const u0 = col / 32, u1 = (col + 1) / 32, v1 = 1 - row / 32, v0 = 1 - (row + 1) / 32;
    const base = f * 4;
    uv.setXY(base + 0, u0, v1);
    uv.setXY(base + 1, u1, v1);
    uv.setXY(base + 2, u0, v0);
    uv.setXY(base + 3, u1, v0);
  }
  uv.needsUpdate = true;
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: atlasTex || undefined }));
  mesh.position.set((x0 + x1) / 2 - 0.5, (y0 + y1) / 2 - 0.5, (z0 + z1) / 2 - 0.5);
  g.add(mesh);
}

function buildPorchStairMesh(sideTile: number, topTile: number, bottomTile: number, mirror = false): THREE.Group {
  const g = new THREE.Group();
  addCellBoxPerFace(g, sideTile, topTile, bottomTile, 0, 0, 0, 1, 0.5, 1);
  addCellBoxPerFace(g, sideTile, topTile, bottomTile, 0, 0.5, 0.5, 1, 1.0, 1.0);
  const railBox = (lx0: number, y0: number, z0: number, lx1: number, y1: number, z1: number) => {
    const mx0 = mirror ? 1 - lx1 : lx0;
    const mx1 = mirror ? 1 - lx0 : lx1;
    addCellBoxPerFace(g, sideTile, topTile, bottomTile, mx0, y0, z0, mx1, y1, z1);
  };
  railBox(0.88, 0, 0.0625, 0.992, 1.0, 0.1875);
  railBox(0.88, 0.5, 0.28125, 0.992, 0.85, 0.34375);
  railBox(0.895, 0.85, 0.1875, 0.98, 0.97, 0.625);
  return g;
}

function renderGroup(g: THREE.Group, scale: number, rotY: number): string {
  g.scale.setScalar(scale);
  g.rotation.y = rotY;
  scene.add(g);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL("image/png");
  scene.remove(g);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      (o as THREE.Mesh).geometry.dispose();
      ((o as THREE.Mesh).material as THREE.Material).dispose();
    }
  });
  return url;
}

// Door/trapdoor tiles from the tile map by wood prefix ("Acacia Door" -> acacia_door_top/bottom).
const woodPrefix = (name: string, kind: string): string => {
  const m = name.toLowerCase().match(new RegExp(`^(\\w+)\\s*${kind}`));
  return m ? m[1] : "oak";
};
const doorTiles = (name: string) => {
  const p = woodPrefix(name, "door");
  let top = 0, bottom = 0;
  for (const [file, tile] of Object.entries(tileMap)) {
    if (file === `${p}_door_top.png`) top = Number(tile);
    else if (file === `${p}_door_bottom.png`) bottom = Number(tile);
  }
  return { top: top || 106, bottom: bottom || 107 };
};
const trapdoorTile = (name: string) => {
  const p = woodPrefix(name, "trapdoor");
  for (const [file, tile] of Object.entries(tileMap)) if (file === `${p}_trapdoor.png`) return Number(tile);
  return 108;
};

function setupChestCardAnimation(card: HTMLElement) {
  const placedImg = card.querySelector(".placed") as HTMLImageElement;
  if (!placedImg) return;
  const parent = placedImg.parentElement;
  if (!parent) return;

  const canvas = document.createElement("canvas");
  canvas.width = 190;
  canvas.height = 190;
  canvas.style.cssText = "width:100%;min-width:130px;max-width:190px;aspect-ratio:1/1;display:none;border-radius:8px;background:#05070a;cursor:pointer;";
  canvas.title = "Click to toggle chest opening animation";
  parent.appendChild(canvas);

  const cardRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  cardRenderer.setSize(190, 190);
  cardRenderer.setPixelRatio(window.devicePixelRatio || 1);
  const cardScene = new THREE.Scene();
  const cardCam = new THREE.PerspectiveCamera(38, 1, 0.1, 12);
  cardCam.position.set(2.4, 1.9, 2.4);
  cardCam.lookAt(0, 0, 0);
  cardScene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.95));
  const cardDirL = new THREE.DirectionalLight(0xffffff, 1.15);
  cardDirL.position.set(3, 5, 2);
  cardScene.add(cardDirL);

  const chest = createArticulatedChest({ yaw: 0.2 });
  chest.root.position.set(0, -0.38, 0);
  cardScene.add(chest.root);

  let isOpen = false;
  let animating = false;
  let lastTime = performance.now();

  function animLoop(now: number) {
    if (!animating) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    chest.isOpen = isOpen;
    updateChestAnimation(chest, dt);
    cardRenderer.render(cardScene, cardCam);
    requestAnimationFrame(animLoop);
  }

  function startAnim(openState: boolean) {
    isOpen = openState;
    placedImg.style.display = "none";
    canvas.style.display = "block";
    if (!animating) {
      animating = true;
      lastTime = performance.now();
      requestAnimationFrame(animLoop);
    }
  }

  function stopAnim() {
    isOpen = false;
    chest.isOpen = false;
    const checkClosed = setInterval(() => {
      if (Math.abs(chest.currentAngle) < 0.01) {
        clearInterval(checkClosed);
        animating = false;
        canvas.style.display = "none";
        placedImg.style.display = "block";
      }
    }, 50);
  }

  card.addEventListener("mouseenter", () => startAnim(true));
  card.addEventListener("mouseleave", () => stopAnim());
  canvas.addEventListener("click", (ev) => {
    ev.stopPropagation();
    isOpen = !isOpen;
    startAnim(isOpen);
  });

  const badges = card.querySelector(".badges");
  if (badges) {
    const animPill = document.createElement("span");
    animPill.className = "pill ok";
    animPill.style.cursor = "pointer";
    animPill.innerHTML = "✨ Hover / Click to Open Lid";
    animPill.onclick = (ev) => {
      ev.stopPropagation();
      isOpen = !isOpen;
      startAnim(isOpen);
    };
    badges.appendChild(animPill);
  }
}

// ── data loading ─────────────────────────────────────────────────────────────
const thumbs = new Map<number, string>();
let catalogEntries: Entry[] = [];
let catalogRevision = "";
let lastCatalogRefresh = 0;
async function loadThumbs() {
  try {
    const r = await fetch("/catalog/thumbnails.json");
    const obj = await r.json();
    for (const [k, v] of Object.entries(obj)) thumbs.set(Number(k), v as string);
  } catch (e) { /* thumbnails unavailable */ }
}

async function loadRuntimeCatalog(): Promise<{ entries: Entry[]; revision: string }> {
  let manifest: { catalogRevision?: string; entries?: Entry[] } = {};
  try {
    const response = await fetch(`/catalog/runtime-manifest.json?ts=${Date.now()}`, { cache: "no-store" });
    if (response.ok) manifest = await response.json();
  } catch {}
  const standard = Array.isArray(manifest.entries) ? manifest.entries : (catalog as Entry[]);
  const byId = new Map<number, Entry>();
  for (const entry of standard) {
    if (entry && Number.isInteger(entry.id) && entry.id > 0) byId.set(entry.id, entry);
  }
  let customSignature = "";
  try {
    const customCatalog = await apiGetCustomAssets();
    registerCustomAssets(customCatalog.assets);
    const customRows = customCatalog.assets.map((asset) => {
      const entry: Entry = {
        id: asset.id,
        name: asset.name || asset.prompt || `Imported asset ${asset.id}`,
        prompt: asset.prompt,
        category: "decoration",
        kind: "custom-asset",
        source: "custom-asset",
        shape: "3d",
        customAssetId: asset.id,
        filename: asset.filename,
        placement: asset.placement,
        images: {
          inventory: `/catalog/previews/${asset.id}/inventory.png`,
          held: `/catalog/previews/${asset.id}/held.png`,
          placed: `/catalog/previews/${asset.id}/placed.png`
        }
      };
      byId.set(asset.id, entry);
      return `${asset.id}:${asset.filename}:${asset.size}:${asset.createdAt}:${asset.placement.width}x${asset.placement.height}:${asset.placement.scale}`;
    });
    customSignature = customRows.join("|");
    const missingThumbs = customCatalog.assets.filter((asset) => !thumbs.has(asset.id));
    if (missingThumbs.length) {
      const generated = await loadCustomAssetThumbnails(missingThumbs);
      for (const [id, uri] of generated) thumbs.set(id, uri);
    }
  } catch {}
  const entries = [...byId.values()].sort((a, b) => a.id - b.id);
  return { entries, revision: `${manifest.catalogRevision || "fallback"}|${customSignature}` };
}

let kbIndex: Record<string, { title?: string; status?: string; path?: string }> = {};
let kbLinks: Record<string, string> = {}; // registry id -> kb entry id (exact, from kb/kb-links.json)
async function loadKb() {
  try {
    const r = await fetch("/kb/index.json");
    kbIndex = await r.json();
  } catch (e) { kbIndex = {}; }
  try {
    const r = await fetch("/kb/kb-links.json");
    kbLinks = (await r.json()).links || {};
  } catch (e) { kbLinks = {}; }
}

let stats: { grandTotal: number; distinctWorlds: number; worlds: Record<string, string>; byBlock: Array<{ blockId: number; count: number; worlds: Record<string, number> }> } = { grandTotal: 0, distinctWorlds: 0, worlds: {}, byBlock: [] };
let entStats: { total: number; byType: Array<{ type: string; count: number; worlds: Record<string, number> }> } = { total: 0, byType: [] };
async function loadStats() {
  try { stats = (await (await fetch("/api/blocks/stats")).json()); } catch (e) {}
  try { entStats = (await (await fetch("/api/entities/stats")).json()); } catch (e) {}
}

// ── wiki / kb / status helpers ───────────────────────────────────────────────
const CUSTOM_WORDS = ["Maple", "Aspen", "Blossom", "Mystic", "Crimson", "Violet", "Golden", "Emerald"];
function wikiUrl(name: string): string | null {
  if (CUSTOM_WORDS.some((w) => name.toLowerCase().includes(w.toLowerCase()))) return null;
  return `https://minecraft.wiki/w/${name.replace(/[ /]/g, "_")}`;
}
function kbEntry(name: string, id?: number) {
  if (id !== undefined) {
    const key = kbLinks[String(id)];
    const hit = key && kbIndex[key];
    if (hit) return { path: hit.path, status: hit.status };
  }
  const n = name.toLowerCase();
  for (const [key, e] of Object.entries(kbIndex)) {
    if (!key.startsWith("blocks/")) continue;
    const t = (e.title || "").toLowerCase();
    if (t && (n === t || n.includes(t) || t.includes(n))) return { path: e.path, status: e.status };
  }
  return null;
}

// ── rendering the catalog ────────────────────────────────────────────────────
type Entry = {
  id: number;
  name: string;
  category: string;
  kind?: "block" | "item" | "custom-asset";
  source?: string;
  shape?: string;
  customAssetId?: number;
  prompt?: string;
  filename?: string;
  placement?: { width: number; height: number; scale: number };
  images?: { inventory?: string; held?: string; placed?: string };
  side?: number;
  top?: number;
  bottom?: number;
  solid?: number;
  trans?: number;
  stair?: number;
  slab?: number;
  fence?: number;
  glow?: number;
  itemTexture?: string;
  textureFiles?: string[];
};

const isPlaceableEntry = (entry: Entry): boolean => entry.kind === "block" || entry.kind === "custom-asset" || "side" in entry || "top" in entry;
const shapeOfEntry = (entry: Entry): string => entry.shape || shapeOf(entry.id);

const blockCards = new Map<number, HTMLElement>();
function buildCard(e: Entry): HTMLElement {
  const card = document.createElement("div");
  card.className = "card";
  const cat = (e.category || "item");
  const isBlock = isPlaceableEntry(e);
  const kb = kbEntry(e.name, e.id);
  const wiki = wikiUrl(e.name);
  const custom = e.kind === "custom-asset" || wiki === null;
  const cleanSnake = e.name.toLowerCase().replace(/[\s\-\(\)\'\.]+/g, "_").replace(/_+$/, "");
  const itemFile = (e as any).itemTexture || `${cleanSnake}.png`;
  const textureFiles = e.kind === "custom-asset"
    ? (e.filename ? [e.filename] : [])
    : isBlock
    ? [TILE_TO_FILE[e.side ?? 0], TILE_TO_FILE[e.top ?? 0], TILE_TO_FILE[e.bottom ?? 0]].filter(Boolean)
    : [itemFile];
  const pl = stats.byBlock.find((s) => s.blockId === e.id);
  const placedCount = pl ? pl.count : 0;
  const placedWorlds = pl ? Object.entries(pl.worlds).map(([wid, c]) => `${stats.worlds[wid] || wid}×${c}`).join(", ") : "";

  const thumb = thumbs.get(e.id);
  const shape = shapeOfEntry(e);
  card.innerHTML = `
    <div class="looks">
      <div class="look"><span class="lbl">inventory</span><img class="inv" data-id="${e.id}" alt="" /></div>
      <div class="look"><span class="lbl">held</span><img class="held" data-id="${e.id}" alt="rendering…" /></div>
      <div class="look"><span class="lbl">placed</span><img class="placed" data-id="${e.id}" alt="rendering…" /></div>
    </div>
    <div class="bname" title="${e.name}">${e.name} ${wiki ? `<a href="${wiki}" target="_blank" style="font-weight:400;font-size:12px">wiki</a>` : ""}</div>
    <div class="bid">#${e.id} · ${cat}</div>
    <div class="badges">
      ${shapePill(shape)}
      ${custom ? `<span class="pill custom">custom</span>` : ""}
      ${kb ? `<span class="pill kb" title="KB: ${kb.path}">kb:${kb.status || "?"}</span>` : (isBlock ? `<span class="pill ok">in-world</span>` : `<span class="pill item">item</span>`)}
      ${textureFiles.length ? `<span class="pill plan" title="${textureFiles.join(", ")}">${textureFiles[0]}</span>` : ""}
      ${isBlock ? `<a href="/editor.html?id=${e.id}" class="pill ok" style="text-decoration:none;cursor:pointer;" onclick="event.stopPropagation()">🎨 Recolor</a>` : ""}
    </div>
    <div class="statsline">${placedCount > 0 ? `<span class="place">placed ×${placedCount}</span> — ${placedWorlds}` : "not hand-placed"}</div>`;
  const inv = card.querySelector(".inv") as HTMLImageElement;
  if (thumb) inv.src = thumb;
  else if (e.images?.inventory) {
    inv.src = e.images.inventory;
    inv.onerror = () => { inv.style.visibility = "hidden"; };
  } else inv.style.visibility = "hidden";

  // Card click opens 3D inspection modal
  card.addEventListener("click", () => openModal(e));

  blockCards.set(e.id, card);
  return card;
}

function renderCustomAssetModel(model: THREE.Group, targetSize: number, rotY: number): string {
  const root = model.clone(true);
  root.rotation.y = rotY;
  root.updateMatrixWorld(true);
  const initialBounds = new THREE.Box3().setFromObject(root);
  const initialSize = initialBounds.getSize(new THREE.Vector3());
  const maxSize = Math.max(initialSize.x, initialSize.y, initialSize.z, 0.0001);
  root.scale.multiplyScalar(targetSize / maxSize);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.y -= bounds.min.y;
  root.position.z -= center.z;
  scene.add(root);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL("image/png");
  scene.remove(root);
  return url;
}

function createCustomModalModel(model: THREE.Group): THREE.Group {
  const root = model.clone(true);
  root.rotation.y = 0.4;
  root.updateMatrixWorld(true);
  const initial = new THREE.Box3().setFromObject(root);
  const size = initial.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z, 0.0001);
  root.scale.multiplyScalar(1.15 / maxSize);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.y -= bounds.min.y;
  root.position.z -= center.z;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.frustumCulled = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => { material.side = THREE.DoubleSide; });
  });
  return root;
}

async function renderEntryPreviews(e: Entry): Promise<{ inventory: string | null; held: string | null; placed: string | null }> {
  const inventory = thumbs.get(e.id) || null;
  if (e.kind === "custom-asset" && e.customAssetId) {
    const model = await loadCustomAssetModel(e.customAssetId);
    if (!model) return { inventory, held: null, placed: null };
    return {
      inventory,
      held: renderCustomAssetModel(model, 0.68, 0.65),
      placed: renderCustomAssetModel(model, 1.0, 0.2)
    };
  }
  const isBlock = isPlaceableEntry(e);
  const side = e.side ?? e.top ?? 1, top = e.top ?? e.side ?? 1, bottom = e.bottom ?? e.side ?? 1;
  const low = e.name.toLowerCase();
  if (e.id === 43) {
    return { inventory, held: renderChest(0.62, 0.65, 0), placed: renderChest(1.0, 0.2, 0) };
  }
  if (isBlock && low.includes("trapdoor")) {
    const open = low.includes("open");
    return {
      inventory,
      held: renderGroup(buildTrapdoorMesh(trapdoorTile(e.name), open), 0.62, 0.65),
      placed: renderGroup(buildTrapdoorMesh(trapdoorTile(e.name), open), 1, 0.2)
    };
  }
  if (isBlock && low.includes("door")) {
    const open = low.includes("open");
    const tiles = doorTiles(e.name);
    return {
      inventory,
      held: renderGroup(buildDoorMesh(tiles.top, tiles.bottom, open), 0.45, 0.65),
      placed: renderGroup(buildDoorMesh(tiles.top, tiles.bottom, open), 0.7, 0.2)
    };
  }
  if (isBlock && low.includes("fence") && !low.includes("gate") && !low.includes("particle")) {
    const tile = e.side ?? e.top ?? 9;
    return {
      inventory,
      held: renderGroup(buildFenceMesh(tile), 0.62, 0.65),
      placed: renderGroup(buildFenceMesh(tile), 1, 0.2)
    };
  }
  if (isBlock && (e.id === 1202 || e.id === 1203 || low.includes("tropical bush"))) {
    return {
      inventory,
      held: renderGroup(buildTropicalBushMesh(496, 497), 0.45, 0.65),
      placed: renderGroup(buildTropicalBushMesh(496, 497), 0.75, 0.2)
    };
  }
  if (isBlock && (e.id === 1200 || e.id === 1201 || low.includes("high grass") || low.includes("large grass"))) {
    return {
      inventory,
      held: renderGroup(buildHighGrassMesh(815, 816), 0.45, 0.65),
      placed: renderGroup(buildHighGrassMesh(815, 816), 0.75, 0.2)
    };
  }
  if (isBlock && (e.id === 1205 || e.id === 1206 || low.includes("porch stair"))) {
    const isRight = e.id === 1206 || low.includes("right");
    const sideTile = customFaceTile(e.id, "side") ?? e.side ?? 890;
    const topTile = customFaceTile(e.id, "top") ?? e.top ?? sideTile;
    const bottomTile = customFaceTile(e.id, "bottom") ?? e.bottom ?? sideTile;
    const invPreview = inventory || renderGroup(buildPorchStairMesh(sideTile, topTile, bottomTile, isRight), 0.75, 0.4);
    return {
      inventory: invPreview,
      held: renderGroup(buildPorchStairMesh(sideTile, topTile, bottomTile, isRight), 0.62, 0.65),
      placed: renderGroup(buildPorchStairMesh(sideTile, topTile, bottomTile, isRight), 1, 0.2)
    };
  }
  if (isBlock && (e.id === 124 || shapeOfEntry(e) === "cross" || (e.foliage && e.trans && !e.solid))) {
    const tile = e.side ?? e.top ?? 129;
    return {
      inventory,
      held: renderGroup(buildCrossBillboardMesh(tile), 0.62, 0.65),
      placed: renderGroup(buildCrossBillboardMesh(tile), 1, 0.2)
    };
  }
  if (isBlock) return { inventory, held: renderCube(top, side, bottom, 0.62, 0.65), placed: renderCube(top, side, bottom, 1, 0.2) };
  return { inventory, held: inventory, placed: inventory };
}

function renderLooks(card: HTMLElement, e: Entry) {
  const inv = card.querySelector(".inv") as HTMLImageElement;
  const held = card.querySelector(".held") as HTMLImageElement;
  const placed = card.querySelector(".placed") as HTMLImageElement;
  void renderEntryPreviews(e).then((previews) => {
    if (!card.isConnected) return;
    if (previews.inventory && (!inv.src || inv.style.visibility === "hidden")) {
      inv.src = previews.inventory;
      inv.style.visibility = "";
    }
    if (previews.held) held.src = previews.held;
    if (previews.placed) placed.src = previews.placed;
    if (e.id === 43) setupChestCardAnimation(card);
  });
}

// ── Interactive 3D Modal ─────────────────────────────────────────────────────
let modalRenderer: THREE.WebGLRenderer | null = null;
let modalScene: THREE.Scene | null = null;
let modalCam: THREE.PerspectiveCamera | null = null;
let modalAnimId: number | null = null;
let modalChest: ChestEntity | null = null;
let modalObject: THREE.Object3D | null = null;
let modalAssetRequest = 0;
let autoRotate = true;
let modalRotY = 0.4;
let modalPitch = 0.35;
let modalDistance = 2.8;

function initModal3D() {
  const canvas = $("modalCanvas") as HTMLCanvasElement;
  modalRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  modalRenderer.setPixelRatio(window.devicePixelRatio || 1);
  modalScene = new THREE.Scene();
  modalCam = new THREE.PerspectiveCamera(38, 1, 0.1, 15);
  modalCam.position.set(0, 1.2, 2.8);
  modalCam.lookAt(0, 0, 0);

  modalScene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.0));
  const dirL1 = new THREE.DirectionalLight(0xffffff, 1.2);
  dirL1.position.set(4, 6, 3);
  modalScene.add(dirL1);
  const dirL2 = new THREE.DirectionalLight(0xffffff, 0.4);
  dirL2.position.set(-4, 2, -3);
  modalScene.add(dirL2);

  // Drag to rotate controls
  let isDragging = false;
  let prevX = 0, prevY = 0;
  canvas.addEventListener("mousedown", (ev) => {
    isDragging = true;
    prevX = ev.clientX; prevY = ev.clientY;
    autoRotate = false;
  });
  window.addEventListener("mousemove", (ev) => {
    if (!isDragging) return;
    const dx = ev.clientX - prevX;
    const dy = ev.clientY - prevY;
    prevX = ev.clientX; prevY = ev.clientY;
    modalRotY += dx * 0.01;
    modalPitch = Math.max(-1.2, Math.min(1.2, modalPitch + dy * 0.01));
  });
  window.addEventListener("mouseup", () => { isDragging = false; });

  canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    modalDistance = Math.max(1.5, Math.min(6.0, modalDistance + ev.deltaY * 0.003));
  }, { passive: false });

  $("modalClose").addEventListener("click", closeModal);
  $("modalOverlay").addEventListener("click", (ev) => {
    if (ev.target === $("modalOverlay")) closeModal();
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeModal();
  });
}

function openModal(e: Entry) {
  if (!modalRenderer) initModal3D();
  const overlay = $("modalOverlay");
  const title = $("modalTitle");
  const sub = $("modalSub");
  const badges = $("modalBadges");
  const controls = $("modalControls");
  const details = $("modalDetails");

  title.textContent = e.name;
  sub.textContent = `#${e.id} · ${e.category || "item"}`;
  badges.innerHTML = shapePill(shapeOfEntry(e));
  controls.innerHTML = "";

  const cleanSnake = e.name.toLowerCase().replace(/[\s\-\(\)\'\.]+/g, "_").replace(/_+$/, "");
  const itemFile = (e as any).itemTexture || `${cleanSnake}.png`;
  const textureFiles = e.kind === "custom-asset"
    ? (e.filename ? [e.filename] : [])
    : isPlaceableEntry(e)
    ? [TILE_TO_FILE[e.side ?? 0], TILE_TO_FILE[e.top ?? 0], TILE_TO_FILE[e.bottom ?? 0]].filter(Boolean)
    : [itemFile];

  details.innerHTML = `
    <div><b>Category:</b> ${e.category || "item"}</div>
    <div><b>Textures:</b> <code>${textureFiles.join(", ") || "none"}</code></div>
    <div><b>Wikipedia:</b> ${wikiUrl(e.name) ? `<a href="${wikiUrl(e.name)}" target="_blank">${wikiUrl(e.name)}</a>` : "Custom"}</div>
  `;

  // Clear previous scene objects
  if (modalObject && modalScene) {
    modalScene.remove(modalObject);
    modalObject = null;
  }
  modalChest = null;
  const assetRequest = ++modalAssetRequest;
  autoRotate = true;
  modalRotY = 0.4;
  modalPitch = 0.35;
  modalDistance = 2.8;

  // Add 3D object to modal scene
  if (e.id === 43) {
    modalChest = createArticulatedChest();
    modalChest.root.position.set(0, -0.4, 0);
    modalScene!.add(modalChest.root);
    modalObject = modalChest.root;

    // Interactive Open/Close Chest button
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "modal-btn primary";
    toggleBtn.innerHTML = "📦 Open Chest";
    toggleBtn.onclick = () => {
      if (!modalChest) return;
      modalChest.isOpen = !modalChest.isOpen;
      toggleBtn.innerHTML = modalChest.isOpen ? "🔒 Close Chest" : "📦 Open Chest";
    };
    controls.appendChild(toggleBtn);
  } else if (e.kind === "custom-asset" && e.customAssetId) {
    void loadCustomAssetModel(e.customAssetId).then((model) => {
      if (!model || assetRequest !== modalAssetRequest || !modalScene || !overlay.classList.contains("open")) return;
      const root = createCustomModalModel(model);
      modalScene.add(root);
      modalObject = root;
    });
  } else if (isPlaceableEntry(e)) {
    const low = e.name.toLowerCase();
    let obj: THREE.Object3D | null = null;
    if (low.includes("trapdoor")) {
      obj = buildTrapdoorMesh(trapdoorTile(e.name), low.includes("open"));
    } else if (low.includes("door")) {
      const { top, bottom } = doorTiles(e.name);
      obj = buildDoorMesh(top, bottom, low.includes("open"));
      obj.scale.setScalar(0.75);
    } else if (low.includes("fence") && !low.includes("gate") && !low.includes("particle")) {
      obj = buildFenceMesh(e.side ?? e.top ?? 9);
    } else if (e.id === 1202 || e.id === 1203 || low.includes("tropical bush")) {
      obj = buildTropicalBushMesh(496, 497);
      obj.scale.setScalar(0.85);
    } else if (e.id === 1200 || e.id === 1201 || low.includes("high grass") || low.includes("large grass")) {
      obj = buildHighGrassMesh(815, 816);
      obj.scale.setScalar(0.85);
    } else if (e.id === 1205 || e.id === 1206 || low.includes("porch stair")) {
      const isRight = e.id === 1206 || low.includes("right");
      const sideTile = customFaceTile(e.id, "side") ?? e.side ?? 890;
      const topTile = customFaceTile(e.id, "top") ?? e.top ?? sideTile;
      const bottomTile = customFaceTile(e.id, "bottom") ?? e.bottom ?? sideTile;
      obj = buildPorchStairMesh(sideTile, topTile, bottomTile, isRight);
      obj.scale.setScalar(0.95);
    } else if (e.id === 124 || shapeOfEntry(e) === "cross" || (e.foliage && e.trans && !e.solid)) {
      const tile = e.side ?? e.top ?? 129;
      obj = buildCrossBillboardMesh(tile);
    } else {
      const side = e.side ?? e.top ?? 1, top = e.top ?? e.side ?? 1, bottom = e.bottom ?? e.side ?? 1;
      const geo = boxGeometry(top, side, bottom);
      const mat = new THREE.MeshLambertMaterial({ map: atlasTex || undefined });
      obj = new THREE.Mesh(geo, mat);
    }
    modalScene!.add(obj);
    modalObject = obj;
  }

  // Auto-rotate toggle button
  const rotBtn = document.createElement("button");
  rotBtn.className = "modal-btn";
  rotBtn.innerHTML = "🔄 Auto Rotate";
  rotBtn.onclick = () => { autoRotate = !autoRotate; };
  controls.appendChild(rotBtn);

  // Edit in Studio button
  if (isPlaceableEntry(e)) {
    const editBtn = document.createElement("a");
    editBtn.className = "modal-btn primary";
    editBtn.href = `/editor.html?id=${e.id}`;
    editBtn.style.textDecoration = "none";
    editBtn.innerHTML = "🎨 Open in Texture Studio";
    controls.appendChild(editBtn);
  }

  overlay.classList.add("open");

  // Start modal animation loop
  let lastTime = performance.now();
  function modalLoop(now: number) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (autoRotate) modalRotY += dt * 0.7;

    if (modalChest) {
      updateChestAnimation(modalChest, dt);
    }

    if (modalCam) {
      const cx = Math.sin(modalRotY) * Math.cos(modalPitch) * modalDistance;
      const cz = Math.cos(modalRotY) * Math.cos(modalPitch) * modalDistance;
      const cy = Math.sin(modalPitch) * modalDistance;
      modalCam.position.set(cx, cy, cz);
      modalCam.lookAt(0, 0, 0);
    }

    const wrap = $("modalCanvas").parentElement;
    if (wrap && modalRenderer) {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (modalRenderer.domElement.width !== w || modalRenderer.domElement.height !== h) {
        modalRenderer.setSize(w, h);
        if (modalCam) { modalCam.aspect = w / h; modalCam.updateProjectionMatrix(); }
      }
      modalRenderer.render(modalScene!, modalCam!);
    }

    modalAnimId = requestAnimationFrame(modalLoop);
  }

  if (modalAnimId) cancelAnimationFrame(modalAnimId);
  modalAnimId = requestAnimationFrame(modalLoop);
}

function closeModal() {
  $("modalOverlay").classList.remove("open");
  if (modalAnimId) {
    cancelAnimationFrame(modalAnimId);
    modalAnimId = null;
  }
}

// ── filters ──────────────────────────────────────────────────────────────────
function currentFilter() {
  const q = qEl.value.trim().toLowerCase();
  const cat = catEl.value;
  const status = statusEl.value;
  const onlyPlaced = onlyPlacedEl.checked;
  return (e: Entry) => {
    if (q) {
      const qClean = q.replace(/[\(\)\[\]\-]/g, " ").trim();
      const nameClean = e.name.toLowerCase().replace(/[\(\)\[\]\-]/g, " ");
      const idStr = String(e.id);
      const catStr = (e.category || "").toLowerCase();
      const terms = qClean.split(/\s+/).filter(Boolean);
      const matchesAll = terms.every((t) => nameClean.includes(t) || idStr.includes(t) || catStr.includes(t));
      if (!matchesAll) return false;
    }
    if (cat !== "all" && e.category !== cat) return false;
    const kb = kbEntry(e.name, e.id);
    const isBlock = isPlaceableEntry(e);
    const custom = e.kind === "custom-asset" || wikiUrl(e.name) === null;
    const placed = stats.byBlock.some((s) => s.blockId === e.id);
    if (onlyPlaced && !placed) return false;
    if (status === "implemented" && !(isBlock && !custom)) return false;
    if (status === "partial" && !(!isBlock)) return false;
    if (status === "custom" && !custom) return false;
    return true;
  };
}

function applyFilters() {
  const f = currentFilter();
  const entries = catalogEntries;
  let shown = 0;
  for (const e of entries) {
    if (e.id <= 0) continue;
    const card = blockCards.get(e.id);
    if (!card) continue;
    const show = f(e);
    card.style.display = show ? "" : "none";
    if (show) shown++;
  }
  $("prog").textContent = `Showing ${shown} / ${entries.length} entries (visible cards render their held/placed looks).`;
}

// ── entities table ───────────────────────────────────────────────────────────
const ENTITY_WIKI: Record<string, string> = {
  cow: "Cow", sheep: "Sheep", pig: "Pig", chicken: "Chicken", horse: "Horse", dog: "Wolf",
  zombie: "Zombie", creeper: "Creeper", skeleton: "Skeleton", spider: "Spider", enderman: "Enderman",
  witch: "Witch", zombie_villager: "Zombie_Villager", slime: "Slime", bat: "Bat", turtle: "Turtle", glow_squid: "Glow_Squid"
};
function renderEntities() {
  const kbNames: Record<string, string> = {};
  for (const [key, e] of Object.entries(kbIndex)) if (key.startsWith("entities/")) kbNames[((e.title) || "").toLowerCase()] = e.path;
  const rows = entStats.byType.map((t) => {
    const wiki = ENTITY_WIKI[t.type] ? `https://minecraft.wiki/w/${ENTITY_WIKI[t.type]}` : null;
    const kb = kbNames[t.type] || null;
    const worlds = Object.entries(t.worlds).map(([wid, c]) => `${stats.worlds[wid] || wid}×${c}`).join(", ");
    return `<tr><td>${t.type}</td><td>${t.count}</td><td>${worlds || "—"}</td><td>${kb ? `<a href="/kb/${kb}" target="_blank">kb</a>` : "—"}</td><td>${wiki ? `<a href="${wiki}" target="_blank">wiki</a>` : "—"}</td></tr>`;
  }).join("");
  $("entities").innerHTML = "<thead><tr><th>type</th><th>count</th><th>per world</th><th>KB</th><th>wiki</th></tr></thead><tbody>" + rows + "</tbody>";
}

// ── audits / overview ────────────────────────────────────────────────────────
function renderOverview() {
  const entries = catalogEntries;
  const blocks = entries.filter(isPlaceableEntry);
  const items = entries.filter((e) => e.id > 0 && !isPlaceableEntry(e));
  const cube = blocks.filter((e) => shapeOfEntry(e) === "cube").length;
  const d3 = blocks.length - cube;
  const withKb = entries.filter((e) => kbEntry(e.name, e.id)).length;
  const textureFiles = new Set<string>();
  for (const e of blocks) { const f = TILE_TO_FILE[e.side ?? 0]; if (f) textureFiles.add(f); }
  $("statbar").innerHTML = `
    <span>Catalog <b>${entries.length}</b></span>
    <span>Cube blocks <b>${cube}</b></span>
    <span>3D-model blocks <b>${d3}</b></span>
    <span>Items <b>${items.length}</b></span>
    <span>KB-backed <b>${withKb}</b></span>
    <span>Hand-placed total <b>${stats.grandTotal}</b></span>
    <span>Worlds <b>${stats.distinctWorlds}</b></span>
    <span>Animals/mobs <b>${entStats.total}</b></span>`;
  $("audit").innerHTML = `
    <span>Vanilla texture files used: <b>${textureFiles.size}</b> of ${Object.keys(TILE_TO_FILE).length} atlas tiles</span>
    <span>Source: <b>InventivetalentDev/minecraft-assets 1.19.3</b></span>`;
}

// ── boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  await Promise.all([loadThumbs(), loadKb(), loadStats()]);
  const initialCatalog = await loadRuntimeCatalog();
  catalogEntries = initialCatalog.entries;
  catalogRevision = initialCatalog.revision;
  lastCatalogRefresh = Date.now();

  // render held/placed looks for cards near the viewport (scroll-driven, deterministic)
  const pend = new Set<number>();
  let drainBusy = false;
  function enqueueVisible() {
    const vh = window.innerHeight || 600;
    const top = window.scrollY - 500, bottom = window.scrollY + vh + 500;
    for (const [id, card] of blockCards) {
      if (card.style.display === "none" || card.dataset.rendered) continue;
      const r = card.getBoundingClientRect();
      const absTop = window.scrollY + r.top;
      if (absTop >= top && absTop <= bottom) pend.add(id);
    }
    if (!drainBusy) drain();
  }
  function drain() {
    drainBusy = true;
    const ids = [...pend];
    pend.clear();
    for (const id of ids) {
      const card = blockCards.get(id);
      const e = catalogEntries.find((x) => x.id === id);
      if (card && e) { card.dataset.rendered = "1"; renderLooks(card, e); }
    }
    drainBusy = false;
    if (pend.size) setTimeout(drain, 0);
  }
  function renderCatalogCards() {
    blockCards.clear();
    grid.innerHTML = "";
    grid3d.innerHTML = "";
    itemsGrid.innerHTML = "";
    const placeable = catalogEntries.filter((e) => e.id > 0 && isPlaceableEntry(e));
    const cubeBlocks = placeable.filter((e) => shapeOfEntry(e) === "cube");
    const nonCube = placeable.filter((e) => shapeOfEntry(e) !== "cube");
    const items = catalogEntries.filter((e) => e.id > 0 && !isPlaceableEntry(e));
    $("cubeTitle").textContent = `⬜ Cube blocks (${cubeBlocks.length})`;
    $("d3Title").textContent = `🧊 3D-model blocks — doors, torches, signs, crops, flowers, rails… (${nonCube.length})`;
    const frag = document.createDocumentFragment();
    for (const e of cubeBlocks) frag.appendChild(buildCard(e));
    grid.appendChild(frag);
    const frag3 = document.createDocumentFragment();
    for (const e of nonCube) frag3.appendChild(buildCard(e));
    grid3d.appendChild(frag3);
    const frag2 = document.createDocumentFragment();
    for (const e of items) frag2.appendChild(buildCard(e));
    itemsGrid.appendChild(frag2);
    const cats = [...new Set(catalogEntries.map((e) => e.category).filter(Boolean))].sort();
    const currentCategory = catEl.value;
    catEl.innerHTML = '<option value="all">all</option>' + cats.map((c) => `<option>${c}</option>`).join("");
    if (cats.includes(currentCategory)) catEl.value = currentCategory;
    renderOverview();
    renderEntities();
    applyFilters();
    $("prog").textContent = `${cubeBlocks.length} cube + ${nonCube.length} 3D-model blocks + ${items.length} items — rendering looks on scroll…`;
  }
  renderCatalogCards();
  window.addEventListener("scroll", enqueueVisible, { passive: true });
  enqueueVisible();

  let refreshBusy = false;
  const refreshCatalog = async () => {
    if (refreshBusy || Date.now() - lastCatalogRefresh < 2000) return;
    refreshBusy = true;
    try {
      const next = await loadRuntimeCatalog();
      await loadStats();
      lastCatalogRefresh = Date.now();
      if (next.revision !== catalogRevision) {
        catalogEntries = next.entries;
        catalogRevision = next.revision;
        renderCatalogCards();
        enqueueVisible();
      }
    } finally {
      refreshBusy = false;
    }
  };
  window.addEventListener("focus", refreshCatalog);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshCatalog(); });
  window.setInterval(refreshCatalog, 15000);

  qEl.addEventListener("input", applyFilters);
  catEl.addEventListener("change", applyFilters);
  statusEl.addEventListener("change", applyFilters);
  onlyPlacedEl.addEventListener("change", applyFilters);
}

let catalogBootPromise: Promise<void> | null = null;
await atlasReady;
catalogBootPromise = boot();

(window as any).__blocksCatalogRenderPreviews = async (ids?: number[]) => {
  await catalogBootPromise;
  const wanted = Array.isArray(ids) && ids.length
    ? ids.map(Number).filter((id) => Number.isInteger(id))
    : catalogEntries.map((entry) => entry.id);
  const result: Record<string, { inventory: string | null; held: string | null; placed: string | null }> = {};
  for (const id of wanted) {
    const entry = catalogEntries.find((candidate) => candidate.id === id);
    if (!entry) continue;
    result[String(id)] = await renderEntryPreviews(entry);
  }
  return { catalogRevision, previews: result };
};

// debug hook for the headless probe / manual inspection
(window as any).__blocksDebug = {
  renderCube: (top: number, side: number, bottom: number) => renderCube(top, side, bottom),
  rendererCanvas: renderer.domElement
};
