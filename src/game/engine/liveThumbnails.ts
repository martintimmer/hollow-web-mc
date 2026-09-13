import * as THREE from "three";
import type { BlockDef } from "../blocks";
import { customFaceTile } from "./customFaceTiles";
import tileMap from "../../../catalog/textureTileMap.json";

// Resolve the distinct bottom/top door textures for a door by its wood prefix
// (mirrors block-page: Acacia Door -> acacia_door_bottom/acacia_door_top).
function doorWoodTiles(name: string): { top: number; bottom: number } {
  const m = name.toLowerCase().match(/^(\w+)\s*door/);
  const prefix = m ? m[1] : "oak";
  let top = 0, bottom = 0;
  for (const [file, tile] of Object.entries(tileMap)) {
    if (file === `${prefix}_door_top.png`) top = Number(tile);
    else if (file === `${prefix}_door_bottom.png`) bottom = Number(tile);
  }
  return { top: top || 106, bottom: bottom || 107 };
}

/**
 * Shape-aware 3D thumbnail renderer driven by the LIVE atlas canvas.
 *
 * Used by refreshOverrideThumbnails() so inventory/hotbar icons become real 3D
 * object renders (door = 2-tall, fence = post + rails, trapdoor = grille plate,
 * stairs/slabs/torches/lanterns = their in-game shape) that reflect the Block
 * Texture Studio's overrides the moment a new version is saved.
 *
 * Geometry mirrors src/game/engine/chunkMesh.ts (pushDoor / pushTrapdoor /
 * pushFence) and block-page/main.ts.
 */

const ATLAS_TILES = 32;

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let cam: THREE.PerspectiveCamera | null = null;

function ensureRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(96, 96);
  renderer.setPixelRatio(1);
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(38, 1, 0.1, 12);
  cam.position.set(2.4, 1.9, 2.4);
  cam.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.95));
  const dl = new THREE.DirectionalLight(0xffffff, 1.15);
  dl.position.set(3, 5, 2);
  scene.add(dl);
}

function atlasTexture(atlasCanvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(atlasCanvas);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function applyBoxUvs(geo: THREE.BufferGeometry, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile: number) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const col = tile % ATLAS_TILES, row = Math.floor(tile / ATLAS_TILES);
  const u0 = col / ATLAS_TILES, u1 = (col + 1) / ATLAS_TILES;
  const v1 = 1 - row / ATLAS_TILES, v0 = 1 - (row + 1) / ATLAS_TILES;
  const du = u1 - u0, dv = v1 - v0;
  const setFaceUv = (f: number, fu0: number, fv0: number, fu1: number, fv1: number) => {
    const base = f * 4;
    uv.setXY(base + 0, u0 + fu0 * du, v0 + fv1 * dv);
    uv.setXY(base + 1, u0 + fu1 * du, v0 + fv1 * dv);
    uv.setXY(base + 2, u0 + fu0 * du, v0 + fv0 * dv);
    uv.setXY(base + 3, u0 + fu1 * du, v0 + fv0 * dv);
  };
  setFaceUv(0, 1 - z1, y0, 1 - z0, y1);
  setFaceUv(1, z0, y0, z1, y1);
  setFaceUv(2, x0, 1 - z1, x1, 1 - z0);
  setFaceUv(3, x0, z0, x1, z1);
  setFaceUv(4, x0, y0, x1, y1);
  setFaceUv(5, 1 - x1, y0, 1 - x0, y1);
  uv.needsUpdate = true;
}

function addBox(g: THREE.Group, mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile: number) {
  const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  applyBoxUvs(geo, x0, y0, z0, x1, y1, z1, tile);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((x0 + x1) / 2 - 0.5, (y0 + y1) / 2 - 0.5, (z0 + z1) / 2 - 0.5);
  g.add(mesh);
  return mesh;
}

export function renderBlockThumb3D(def: BlockDef, atlasCanvas: HTMLCanvasElement): string | null {
  ensureRenderer();
  if (!renderer || !scene || !cam) return null;
  const mat = new THREE.MeshLambertMaterial({ map: atlasTexture(atlasCanvas), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide });
  const group = new THREE.Group();
  const low = def.name.toLowerCase();
  const side = def.side ?? def.top ?? 1;

  try {
    if (def.id === 1205 || def.id === 1206) {
      const isRight = def.id === 1206;
      const topTile = customFaceTile(def.id, "top") ?? side;
      const sideTile = customFaceTile(def.id, "side") ?? side;
      addBox(group, mat, 0, -0.5, 0, 1, 0, 1, sideTile);
      addBox(group, mat, 0, 0, -0.5, 1, 0.5, 0, topTile);
      const rx0 = isRight ? 0.02 : 0.88, rx1 = isRight ? 0.12 : 0.98;
      addBox(group, mat, rx0, -0.5, 0, rx1, 0.5, 0.125, sideTile);
      addBox(group, mat, rx0, 0, -0.5, rx1, 0.85, -0.375, sideTile);
      addBox(group, mat, rx0, 0.8, -0.5, rx1, 0.95, 0.5, topTile);
      group.position.set(-0.5, 0.5, 0);
    } else if (def.stair) {
      addBox(group, mat, 0, -0.5, 0, 1, 0, 1, side);          // base
      addBox(group, mat, 0, 0, -0.5, 1, 0.5, 0, side);         // step
      group.position.set(-0.5, 0.5, 0);
    } else if (def.slab) {
      addBox(group, mat, 0, 0, 0, 1, 0.5, 1, side);
      group.position.set(-0.5, -0.25, -0.5);
    } else if (low.includes("trapdoor")) {
      const open = low.includes("open");
      const tile = def.side ?? 108;
      const piece = (u0: number, u1: number, v0: number, v1: number) => {
        if (open) addBox(group, mat, u0, v0, 0.8125, u1, v1, 1, tile);
        else addBox(group, mat, u0, 0, v0, u1, 0.1875, v1, tile);
      };
      piece(0, 1, 0.8125, 1);
      piece(0, 1, 0, 0.1875);
      piece(0, 0.1875, 0.1875, 0.8125);
      piece(0.8125, 1, 0.1875, 0.8125);
      piece(0, 1, 0.4375, 0.5625);
      piece(0.4375, 0.5625, 0.1875, 0.8125);
      group.position.set(-0.5, open ? -0.5 : -0.09375, -0.90625);
    } else if (low.includes("door")) {
      // Two-cell door: solid lower leaf (bottom texture) + upper window grille (top texture)
      const dt = doorWoodTiles(def.name);
      const open = low.includes("open");
      const piece = (u0: number, u1: number, y0: number, y1: number, tile: number) => {
        if (open) addBox(group, mat, 0.0625, y0, 0.9375 - 0.875 * u1, 0.1875, y1, 0.9375 - 0.875 * u0, tile);
        else addBox(group, mat, 0.0625 + 0.875 * u0, y0, 0.8125, 0.0625 + 0.875 * u1, y1, 1, tile);
      };
      piece(0, 1, 0, 1, dt.bottom);
      piece(0, 1, 1.8125, 2, dt.top);
      piece(0, 1, 1, 1.1875, dt.top);
      piece(0, 1, 1.4375, 1.5625, dt.top);
      piece(0, 0.1875, 1.1875, 1.8125, dt.top);
      piece(0.8125, 1, 1.1875, 1.8125, dt.top);
      piece(0.4375, 0.5625, 1.1875, 1.8125, dt.top);
      group.position.set(-0.5, -1, open ? -0.5 : -0.90625);
      group.scale.setScalar(0.62);
    } else if (low.includes("fence") && !low.includes("gate") && !low.includes("particle")) {
      const tile = def.side ?? 9;
      // Authentic single fence item thumbnail (central post + 2 straight connecting rails along X)
      addBox(group, mat, 0.375, 0, 0.375, 0.625, 1, 0.625, tile);
      addBox(group, mat, 0, 0.75, 0.4375, 0.375, 0.9375, 0.5625, tile);
      addBox(group, mat, 0, 0.375, 0.4375, 0.375, 0.5625, 0.5625, tile);
      addBox(group, mat, 0.625, 0.75, 0.4375, 1, 0.9375, 0.5625, tile);
      addBox(group, mat, 0.625, 0.375, 0.4375, 1, 0.5625, 0.5625, tile);
      group.position.set(-0.5, -0.5, -0.5);
    } else if (low.includes("torch") || low.includes("lantern")) {
      const tile = def.side ?? 81;
      const isLantern = low.includes("lantern");
      if (isLantern) {
        addBox(group, mat, 0.34375, -0.1875, 0.34375, 0.65625, 0.1875, 0.65625, tile);
        addBox(group, mat, 0.40625, 0.1875, 0.40625, 0.59375, 0.3125, 0.59375, tile);
        addBox(group, mat, 0.46875, -0.3125, 0.46875, 0.53125, -0.1875, 0.53125, tile);
      } else {
        addBox(group, mat, 0.4375, 0, 0.4375, 0.5625, 0.625, 0.5625, tile);
      }
      group.position.set(-0.5, isLantern ? 0.2 : -0.3, -0.5);
      group.scale.setScalar(1.25);
    } else if (def.id === 1202 || def.id === 1203 || low.includes("tropical bush")) {
      const topTile = 497;
      const botTile = 496;
      const getUvs = (tile: number) => {
        const col = tile % ATLAS_TILES, row = Math.floor(tile / ATLAS_TILES);
        const u0 = col / ATLAS_TILES, u1 = (col + 1) / ATLAS_TILES;
        const v1 = 1 - row / ATLAS_TILES, v0 = 1 - (row + 1) / ATLAS_TILES;
        return [u0, v0, u1, v1];
      };
      const [bU0, bV0, bU1, bV1] = getUvs(botTile);
      const [tU0, tV0, tU1, tV1] = getUvs(topTile);
      const addTier = (y0: number, y1: number, u0: number, v0: number, u1: number, v1: number) => {
        const geo = new THREE.BufferGeometry();
        const hr = 0.65;
        const pos = [
          -hr, y1, -hr,   hr, y1,  hr,  -hr, y0, -hr,   hr, y0,  hr,
          -hr, y1,  hr,   hr, y1, -hr,  -hr, y0,  hr,   hr, y0, -hr,
          -hr, y1,   0,   hr, y1,   0,  -hr, y0,   0,   hr, y0,   0,
            0, y1, -hr,    0, y1,  hr,    0, y0, -hr,    0, y0,  hr
        ];
        const uvs = [
          u0, v1, u1, v1, u0, v0, u1, v0,
          u0, v1, u1, v1, u0, v0, u1, v0,
          u0, v1, u1, v1, u0, v0, u1, v0,
          u0, v1, u1, v1, u0, v0, u1, v0
        ];
        const idx = [
           0,  1,  2,   2,  1,  3,   1,  0,  2,   1,  2,  3,
           4,  5,  6,   6,  5,  7,   5,  4,  6,   5,  6,  7,
           8,  9, 10,  10,  9, 11,   9,  8, 10,   9, 10, 11,
          12, 13, 14,  14, 13, 15,  13, 12, 14,  13, 14, 15
        ];
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        group.add(new THREE.Mesh(geo, mat));
      };
      addTier(-0.8, 0.0, bU0, bV0, bU1, bV1);
      addTier(0.0, 0.8, tU0, tV0, tU1, tV1);
      group.position.set(0, 0, 0);
      group.scale.setScalar(0.85);
    } else if (def.id === 1200 || def.id === 1201 || low.includes("large grass") || low.includes("high grass")) {
      const topTile = 816;
      const botTile = 815;
      const getUvs = (tile: number) => {
        const col = tile % ATLAS_TILES, row = Math.floor(tile / ATLAS_TILES);
        const u0 = col / ATLAS_TILES, u1 = (col + 1) / ATLAS_TILES;
        const v1 = 1 - row / ATLAS_TILES, v0 = 1 - (row + 1) / ATLAS_TILES;
        return [u0, v0, u1, v1];
      };
      const [bU0, bV0, bU1, bV1] = getUvs(botTile);
      const [tU0, tV0, tU1, tV1] = getUvs(topTile);
      const addTier = (y0: number, y1: number, u0: number, v0: number, u1: number, v1: number) => {
        const geo = new THREE.BufferGeometry();
        const pos = [
          -0.5, y1, -0.5,  0.5, y1,  0.5, -0.5, y0, -0.5,  0.5, y0,  0.5,
          -0.5, y1,  0.5,  0.5, y1, -0.5, -0.5, y0,  0.5,  0.5, y0, -0.5
        ];
        const uvs = [
          u0, v1, u1, v1, u0, v0, u1, v0,
          u0, v1, u1, v1, u0, v0, u1, v0
        ];
        const idx = [
          0, 1, 2,  2, 1, 3,  1, 0, 2,  1, 2, 3,
          4, 5, 6,  6, 5, 7,  5, 4, 6,  5, 6, 7
        ];
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        group.add(new THREE.Mesh(geo, mat));
      };
      addTier(-0.8, 0.0, bU0, bV0, bU1, bV1);
      addTier(0.0, 0.8, tU0, tV0, tU1, tV1);
      group.position.set(0, 0, 0);
      group.scale.setScalar(0.85);
    } else if (def.id === 124 || def.id === 125 || def.id === 126 || def.id === 361 || def.id === 429 || def.id === 658 || (!def.solid && def.trans && def.foliage)) {
      const tile = def.side ?? def.top ?? 129;
      const getUvs = (t: number) => {
        const col = t % ATLAS_TILES, row = Math.floor(t / ATLAS_TILES);
        const u0 = col / ATLAS_TILES, u1 = (col + 1) / ATLAS_TILES;
        const v1 = 1 - row / ATLAS_TILES, v0 = 1 - (row + 1) / ATLAS_TILES;
        return [u0, v0, u1, v1];
      };
      const [u0, v0, u1, v1] = getUvs(tile);
      const geo = new THREE.BufferGeometry();
      const pos = [
        -0.5, 0.5, -0.5,  0.5, 0.5,  0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
        -0.5, 0.5,  0.5,  0.5, 0.5, -0.5, -0.5, -0.5,  0.5,  0.5, -0.5, -0.5
      ];
      const uvs = [
        u0, v1, u1, v1, u0, v0, u1, v0,
        u0, v1, u1, v1, u0, v0, u1, v0
      ];
      const idx = [
        0, 1, 2,  2, 1, 3,  1, 0, 2,  1, 2, 3,
        4, 5, 6,  6, 5, 7,  5, 4, 6,  5, 6, 7
      ];
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      group.add(new THREE.Mesh(geo, mat));
      group.position.set(0, 0, 0);
      group.scale.setScalar(1.0);
    } else {
      // Cube
      addBox(group, mat, 0, 0, 0, 1, 1, 1, side);
      group.position.set(-0.5, -0.5, -0.5);
    }

    scene.add(group);
    group.rotation.y = 0.2;
    renderer!.render(scene, cam);
    const url = renderer!.domElement.toDataURL("image/png");
    scene.remove(group);
    mat.dispose();
    group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose();
    });
    return url;
  } catch {
    scene.remove(group);
    mat.dispose();
    return null;
  }
}