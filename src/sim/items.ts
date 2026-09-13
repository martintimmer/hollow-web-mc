// Hollowpine Sim — catalogue item previews.
// Trees & houses get REAL generated previews: the actual worldgen builder is run
// into a mini voxel grid, then isometrically projected by the original-art painter.
// Blocks use the live isoThumbnails; features/mobs get glyph icons.

import * as T from "../game/terrain/trees";
import { STYLES, HOUSE_DESIGN_META, generateHouseStructure } from "../game/terrain/structures";

const ICON_CACHE = new Map<string, string>();

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement("canvas");
  cv.width = 28; cv.height = 28;
  const c = cv.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  return [cv, c];
}

function px(c: CanvasRenderingContext2D, x: number, y: number, col: string) {
  c.fillStyle = col;
  c.fillRect(x, y, 2, 2);
}

function ground(c: CanvasRenderingContext2D) {
  for (let x = 0; x < 28; x += 2) px(c, x, 24, "#3e7d3e");
  px(c, 0, 26, "#356b35"); px(c, 4, 26, "#356b35"); px(c, 8, 26, "#356b35");
  px(c, 12, 26, "#356b35"); px(c, 16, 26, "#356b35"); px(c, 20, 26, "#356b35"); px(c, 24, 26, "#356b35");
}

function treeIcon(canopy: string, canopyDark: string, trunk = "#6b4a2b", tall = false) {
  const [cv, c] = canvas();
  ground(c);
  const top = tall ? 4 : 6;
  for (let y = top; y < 14; y++) {
    const spread = (y - top) * 0.9;
    for (let x = 10 - spread; x < 10 + spread + 2; x += 2) {
      if (Math.abs(x - 10) > spread) continue;
      px(c, x, y, x % 6 === 0 ? canopyDark : canopy);
    }
  }
  for (let y = 14; y < 24; y++) px(c, 13, y, trunk);
  px(c, 12, 14, trunk); px(c, 14, 15, trunk);
  return cv.toDataURL();
}

function houseIcon(wall: string, roof: string) {
  const [cv, c] = canvas();
  ground(c);
  // body
  for (let y = 12; y < 24; y++) for (let x = 4; x < 24; x += 2) px(c, x, y, wall);
  // roof gable
  for (let y = 6; y < 12; y++) {
    for (let x = 4 + (12 - y) * 1.4; x < 24 - (12 - y) * 1.4; x += 2) px(c, x, y, roof);
  }
  // door + window
  for (let y = 18; y < 23; y++) px(c, 13, y, "#4a3520");
  px(c, 7, 14, "#8fd4e8"); px(c, 9, 14, "#8fd4e8");
  return cv.toDataURL();
}

function glyphIcon(draw: (c: CanvasRenderingContext2D) => void) {
  const [cv, c] = canvas();
  ground(c);
  draw(c);
  return cv.toDataURL();
}

/** Palette lookup for a block id (used by the mini voxel renderer). */
function colorOf(id: number): string {
  const P: Record<number, string> = {
    1: "#58b04a", 2: "#7a5a34", 3: "#8a6a3e", 4: "#5f8a4a", 5: "#8a8a8a", 6: "#9a9a9a",
    8: "#a8a8a8", 9: "#8a6a3e", 10: "#7ac0c9", 12: "#4a4a4a", 14: "#2d2d2d", 16: "#7a5836",
    17: "#b09468", 18: "#4c9a3f", 19: "#6b4a2b", 20: "#9a7a52", 21: "#5f8a4a", 22: "#6b4a2b",
    23: "#b09468", 24: "#3a6b45", 25: "#7a5a34", 26: "#b09468", 29: "#5878a8", 37: "#c9e8ee",
    39: "#3a9ad9", 40: "#ff7a2a", 46: "#ffd466", 47: "#ffdd66", 51: "#e8ecf2", 52: "#7ac0e8",
    53: "#cfe8f2", 55: "#7a5a34", 63: "#c0392b", 64: "#3a6bcf", 88: "#2eae54", 96: "#8a8a8a",
    105: "#8a6a3e", 106: "#8a6a3e", 109: "#f2a2c4", 111: "#3a9ad9", 112: "#4c9a3f",
    119: "#f2a2c4", 120: "#b03a2e", 121: "#3fb7a5", 122: "#a06238", 123: "#d8b2cc",
    128: "#4c5a66", 129: "#6a7a86", 130: "#d87a7a", 131: "#3f8f4f", 132: "#55ff88", 133: "#35a64b"
  };
  return P[id] || "#a0a0a0";
}

/** True mini-preview: runs the real builder, isometrically projects the voxels. */
function voxelPreview(ids: Array<[number, number, number, number]>): string {
  const W = 84, H = 84;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#141414";
  c.fillRect(0, 0, W, H);
  if (ids.length === 0) return cv.toDataURL();

  // painter's algorithm: draw far-to-near (asc x+z, then y)
  const sorted = [...ids].sort((a, b) => (a[0] + a[2]) - (b[0] + b[2]) || a[1] - b[1]);
  const ox = Math.min(...sorted.map((s) => s[0]));
  const oz = Math.min(...sorted.map((s) => s[2]));
  const oy = Math.min(...sorted.map((s) => s[1]));
  const maxDy = Math.max(...sorted.map((s) => s[1] - oy), 1);
  const maxDx = Math.max(...sorted.map((s) => s[0] - ox), 1);
  const maxDz = Math.max(...sorted.map((s) => s[2] - oz), 1);
  const scale = Math.min(3.2, Math.max(1.0, 52 / Math.max(maxDy * 1.2, (maxDx + maxDz) * 0.9, 10)));

  for (const [x, y, z, id] of sorted) {
    const sx = 42 + ((x - ox) - (z - oz)) * (scale * 0.9);
    const sy = 68 - (y - oy) * scale - ((x - ox) + (z - oz)) * (scale * 0.4);
    const col = colorOf(id);
    // side (left)
    c.fillStyle = col;
    c.globalAlpha = 0.62;
    c.fillRect(sx, sy + scale * 0.55, scale * 0.9, scale * 0.85);
    // top
    c.fillStyle = col;
    c.globalAlpha = 1;
    c.fillRect(sx, sy, scale * 0.9, scale * 0.55);
    // front
    c.globalAlpha = 0.85;
    c.fillRect(sx, sy + scale * 0.55, scale * 0.9, scale * 0.4);
  }
  c.globalAlpha = 1;
  return cv.toDataURL();
}

function previewTree(catalogId: string, params: { height?: number; layers?: number; snowy?: boolean }) {
  const cells: Array<[number, number, number, number]> = [];
  const w = (x: number, y: number, z: number, id: number) => { cells.push([x, y, z, id]); };
  const r = (() => { let s = 1234; return () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 0) % 100000) / 100000; }; })();
  const kid = catalogId.replace("tree.", "");
  switch (kid) {
    case "oak.classic": T.generateOakTree(8, 8, 64, r, w); break;
    case "oak.giant": T.generateOakTree(8, 8, 64, r, w, { height: params.height ?? 12, layers: params.layers ?? 5 }); break;
    case "cherry": T.generateCherryTree(8, 8, 64, r, w); break;
    case "maple": T.generateCrimsonMapleTree(8, 8, 64, r, w); break;
    case "aspen": T.generateGoldenAspenTree(8, 8, 64, r, w); break;
    case "warped": T.generateWarpedTree(8, 8, 64, r, w); break;
    case "bamboo": T.generateBambooGroves(8, 8, 64, r, w, () => 64); break;
    case "redwood": T.generateRedwoodTree(8, 8, 64, r, w); break;
    case "dark_oak": T.generateDarkOakTree(8, 8, 64, r, w); break;
    case "mushroom.red": T.generateHugeMushroom(8, 8, 64, r, w, true); break;
    case "mushroom.brown": T.generateHugeMushroom(8, 8, 64, r, w, false); break;
    case "birch": T.generateBirchTree(8, 8, 64, r, w); break;
    case "mangrove": T.generateMangroveTree(8, 8, 64, r, w); break;
    case "acacia": T.generateAcaciaTree(8, 8, 64, r, w); break;
    case "palm": T.generatePalmTree(8, 8, 64, r, w); break;
    case "meadow": T.generateMeadowTree(8, 8, 64, r, w); break;
    case "alpine": T.generateAlpinePine(8, 8, 64, r, w); break;
    default: T.generateOakTree(8, 8, 64, r, w);
  }
  return voxelPreview(cells);
}

function previewHouse(styleKey: string) {
  const S = STYLES.find((st) => st.key === styleKey) || STYLES[0];
  const wDim = Math.min(S.wMax, S.wMin + 2);
  const x0 = 8 - Math.floor(wDim / 2), z0 = 8 - Math.floor(wDim / 2);
  const cells: Array<[number, number, number, number]> = [];
  const w = (x: number, y: number, z: number, id: number) => { cells.push([x, y, z, id]); };
  const H = { x0, z0, x1: x0 + wDim - 1, z1: z0 + wDim - 1, base: 64, style: S, side: "S" };
  generateHouseStructure(H as never, w, () => {}, () => 64, () => 0.5, (x, y, z, id) => w(x, y, z, id));
  return voxelPreview(cells);
}

function previewHouseDesign(designKey: string) {
  const meta = HOUSE_DESIGN_META.find((d) => d.key === designKey);
  const S = STYLES.find((st) => st.key === (meta ? meta.shell : "cottage")) || STYLES[0];
  const wDim = meta ? Math.min(S.wMax, Math.max(S.wMin, meta.w)) : Math.min(S.wMax, S.wMin + 2);
  const x0 = 8 - Math.floor(wDim / 2), z0 = 8 - Math.floor(wDim / 2);
  const cells: Array<[number, number, number, number]> = [];
  const w = (x: number, y: number, z: number, id: number) => { cells.push([x, y, z, id]); };
  const H = { x0, z0, x1: x0 + wDim - 1, z1: z0 + wDim - 1, base: 64, style: S, side: "S", designKey: meta ? meta.key : undefined };
  generateHouseStructure(H as never, w, () => {}, () => 64, () => 0.5, (x, y, z, id) => w(x, y, z, id));
  return voxelPreview(cells);
}

/** Generated/derived preview per catalogue id (cached). */
export function iconFor(catalogId: string): string {
  const hit = ICON_CACHE.get(catalogId);
  if (hit) return hit;
  let url: string | undefined;
  if (catalogId.startsWith("tree.")) url = previewTree(catalogId, {});
  else if (catalogId.startsWith("house-design:")) url = previewHouseDesign(catalogId.slice(13));
  else if (catalogId.startsWith("house:")) url = previewHouse(catalogId.slice(6));
  else if (catalogId.startsWith("block:")) url = undefined; // blocks use live isoThumbnails
  else switch (catalogId) {
    case "tree.oak.giant": url = treeIcon("#54a746", "#418535", "#6b4a2b", true); break;
    case "tree.cherry": url = treeIcon("#f2a2c4", "#d97fa5", "#5d4632"); break;
    case "tree.maple": url = treeIcon("#b03a2e", "#8f2d24", "#4a3520"); break;
    case "tree.aspen": url = treeIcon("#d8b23c", "#b8931f", "#c9cbc9"); break;
    case "tree.warped": url = treeIcon("#3fb7a5", "#2e948a", "#43606b"); break;
    case "tree.bamboo": url = treeIcon("#8fce4f", "#6fae3a", "#5f8a36"); break;
    case "tree.redwood": url = treeIcon("#a06238", "#7d4d2c", "#6b4a2b", true); break;
    case "tree.dark_oak": url = treeIcon("#2f5d30", "#234a24", "#4a3520"); break;
    case "tree.mushroom.red": url = glyphIcon((c) => { for (let y = 10; y < 22; y++) px(c, 13, y, "#d8d3c7"); for (let x = 6; x < 22; x += 2) { px(c, x, 6, "#c0392b"); px(c, x, 8, "#a93226"); } px(c, 10, 6, "#f5e9e0"); }); break;
    case "tree.mushroom.brown": url = glyphIcon((c) => { for (let y = 10; y < 22; y++) px(c, 13, y, "#d8d3c7"); for (let x = 6; x < 22; x += 2) { px(c, x, 6, "#8b5a2b"); px(c, x, 8, "#74491f"); } }); break;
    case "tree.birch": url = treeIcon("#7fbf6b", "#639851", "#e8e4d8"); break;
    case "tree.mangrove": url = treeIcon("#3f8f5f", "#2f7150", "#5f4632", true); break;
    case "tree.acacia": url = treeIcon("#c9c26a", "#a8a050", "#6b4a2b"); break;
    case "tree.palm": url = glyphIcon((c) => { for (let y = 8; y < 23; y++) px(c, 12, y, "#8a5a33"); for (let i = 0; i < 8; i++) { const dx = i < 4 ? 2 + i * 3 : 26 - (i - 3) * 3; px(c, dx, 8 - (i > 3 ? 0 : 0), "#3f9f4f"); } px(c, 10, 8, "#3f9f4f"); px(c, 14, 8, "#3f9f4f"); }); break;
    case "tree.meadow": url = treeIcon("#6faf4f", "#578e3e"); break;
    case "tree.alpine": url = treeIcon("#3a6b45", "#2d5436", "#6b4a2b", true); break;
    case "tree.spruce": url = treeIcon("#3f6b45", "#315636", "#6b4a2b", true); break;
    case "house:cottage": url = houseIcon("#c9a96a", "#8a4a2b"); break;
    case "house:forge": url = houseIcon("#7a7a7a", "#4a4a4a"); break;
    case "house:townhouse": url = houseIcon("#b9a06a", "#a84a2b"); break;
    case "house:library": url = houseIcon("#9f8dcf", "#3f2b6b"); break;
    case "house:tavern": url = houseIcon("#c9a96a", "#6b3a1f"); break;
    case "house:watchtower": url = glyphIcon((c) => { for (let y = 6; y < 22; y += 2) px(c, 11, y, "#8a8a8a"); px(c, 9, 6, "#6b3a1f"); px(c, 11, 6, "#6b3a1f"); px(c, 13, 6, "#6b3a1f"); }); break;
    case "house:manor": url = houseIcon("#b9b2a0", "#58608a"); break;
    case "house:cathedral": url = glyphIcon((c) => { for (let y = 8; y < 22; y += 2) px(c, 10, y, "#8f8f8f"); px(c, 8, 8, "#5a3a2b"); px(c, 10, 8, "#5a3a2b"); px(c, 12, 8, "#5a3a2b"); px(c, 10, 4, "#5a3a2b"); }); break;
    case "feature:well": url = glyphIcon((c) => { for (let x = 6; x < 22; x += 2) { px(c, x, 12, "#7a7a7a"); px(c, x, 16, "#7a7a7a"); } px(c, 6, 14, "#7a7a7a"); px(c, 20, 14, "#7a7a7a"); px(c, 12, 14, "#4aa3d8"); }); break;
    case "feature:lamp": url = glyphIcon((c) => { px(c, 9, 8, "#d8b23c"); px(c, 11, 8, "#d8b23c"); px(c, 13, 8, "#f0d260"); for (let y = 12; y < 23; y++) px(c, 12, y, "#4a3520"); }); break;
    case "feature:garden": url = glyphIcon((c) => { for (let x = 6; x < 22; x += 4) { px(c, x, 12, "#e0605a"); px(c, x + 2, 12, "#f0c24f"); } px(c, 6, 16, "#3f7d3f"); px(c, 10, 18, "#3f7d3f"); px(c, 14, 16, "#3f7d3f"); }); break;
    case "feature:fountain": url = glyphIcon((c) => { for (let x = 8; x < 20; x += 2) px(c, x, 16, "#7a7a7a"); px(c, 12, 12, "#4aa3d8"); px(c, 10, 10, "#4aa3d8"); px(c, 14, 10, "#4aa3d8"); }); break;
    case "feature:stilt": url = treeIcon("#9a6a3a", "#7d5430", "#5f4632", true); break;
    case "feature:coral": url = glyphIcon((c) => { for (let y = 10; y < 23; y += 2) px(c, 10, y, "#e97a7a"); px(c, 14, 10, "#f0a06a"); px(c, 18, 10, "#d893b8"); }); break;
    case "feature:kelp": url = glyphIcon((c) => { for (let y = 4; y < 23; y += 2) { px(c, 10, y, "#3f8f4f"); px(c, 14, y, "#2f7d3f"); px(c, 18, y, "#3f8f4f"); } }); break;
    case "feature:wreck": url = glyphIcon((c) => { for (let y = 8; y < 22; y++) { px(c, 6, y, "#6b4a2b"); px(c, 20, y, "#6b4a2b"); } for (let y = 8; y < 12; y++) for (let x = 8; x < 19; x += 2) px(c, x, y, "#8a5f37"); }); break;
    case "mob:zombie": url = glyphIcon((c) => { for (let y = 12; y < 23; y++) px(c, 11, y, "#5f8a4a"); px(c, 8, 12, "#5f8a4a"); px(c, 14, 12, "#5f8a4a"); px(c, 9, 6, "#6f9a55"); px(c, 11, 6, "#6f9a55"); px(c, 13, 6, "#6f9a55"); px(c, 10, 7, "#2d4a20"); }); break;
    case "mob:creeper": url = glyphIcon((c) => { for (let y = 12; y < 23; y++) px(c, 11, y, "#4c9a3f"); for (let y = 5; y < 12; y++) px(c, 11, y, "#4c9a3f"); px(c, 9, 6, "#1d3318"); px(c, 13, 6, "#1d3318"); px(c, 11, 9, "#1d3318"); }); break;
    case "mob:skeleton": url = glyphIcon((c) => { for (let y = 12; y < 23; y++) px(c, 11, y, "#d8d8d8"); px(c, 9, 6, "#e8e8e8"); px(c, 11, 6, "#e8e8e8"); px(c, 13, 6, "#e8e8e8"); px(c, 10, 7, "#333"); px(c, 12, 7, "#333"); }); break;
    case "mob:spider": url = glyphIcon((c) => { for (let y = 12; y < 20; y++) px(c, 11, y, "#2d2d2d"); px(c, 7, 16, "#3d3d3d"); px(c, 15, 16, "#3d3d3d"); px(c, 9, 10, "#c0392b"); px(c, 13, 10, "#c0392b"); }); break;
    case "mob:all": url = glyphIcon((c) => { px(c, 5, 6, "#4c9a3f"); px(c, 11, 6, "#d8d8d8"); px(c, 17, 6, "#2d2d2d"); px(c, 8, 16, "#5f8a4a"); }); break;
    case "villager:farmer": url = glyphIcon((c) => { for (let y = 12; y < 23; y++) px(c, 11, y, "#8b5a2b"); px(c, 11, 7, "#d8a47f"); for (let x = 6; x < 18; x += 2) px(c, x, 5, "#dbb758"); }); break;
    case "villager:librarian": url = glyphIcon((c) => { for (let y = 12; y < 23; y++) px(c, 11, y, "#d9cca9"); px(c, 11, 7, "#d8a47f"); px(c, 11, 5, "#9b1b1b"); }); break;
    case "villager:weaponsmith": url = glyphIcon((c) => { for (let y = 12; y < 23; y++) px(c, 11, y, "#2e2926"); px(c, 11, 7, "#d8a47f"); px(c, 11, 5, "#4a4a4a"); }); break;
    case "villager:cleric": url = glyphIcon((c) => { for (let y = 12; y < 23; y++) px(c, 11, y, "#6e2c8a"); px(c, 11, 7, "#d8a47f"); px(c, 11, 5, "#47165c"); }); break;
    case "villager:desert_nomad": url = glyphIcon((c) => { for (let y = 12; y < 23; y++) px(c, 11, y, "#dfd3b0"); px(c, 11, 7, "#b47953"); px(c, 11, 5, "#b59b58"); }); break;
    case "villager:tundra_fur": url = glyphIcon((c) => { for (let y = 12; y < 23; y++) px(c, 11, y, "#4a627a"); px(c, 11, 7, "#d8a47f"); px(c, 11, 5, "#f0f5fa"); }); break;
    case "entity:cow": url = glyphIcon((c) => { for (let y = 10; y < 21; y++) for (let x = 8; x < 20; x += 2) px(c, x, y, "#4a3222"); px(c, 10, 12, "#eae6df"); px(c, 16, 16, "#eae6df"); px(c, 6, 8, "#d69a85"); }); break;
    case "entity:sheep": url = glyphIcon((c) => { for (let y = 10; y < 20; y++) for (let x = 8; x < 20; x += 2) px(c, x, y, "#f0f0f0"); px(c, 6, 12, "#d8a47f"); }); break;
    case "entity:pig": url = glyphIcon((c) => { for (let y = 12; y < 21; y++) for (let x = 8; x < 20; x += 2) px(c, x, y, "#f2a2a2"); px(c, 6, 14, "#e08080"); }); break;
    case "entity:chicken": url = glyphIcon((c) => { for (let y = 14; y < 22; y++) for (let x = 10; x < 18; x += 2) px(c, x, y, "#ffffff"); px(c, 12, 10, "#ffffff"); px(c, 10, 12, "#e67e22"); px(c, 12, 14, "#e74c3c"); }); break;
    case "entity:horse": url = glyphIcon((c) => { for (let y = 8; y < 21; y++) for (let x = 8; x < 20; x += 2) px(c, x, y, "#7c4722"); px(c, 10, 6, "#6e3d1c"); px(c, 14, 6, "#6e3d1c"); px(c, 10, 10, "#482914"); px(c, 14, 10, "#ffffff"); px(c, 16, 10, "#120d08"); px(c, 8, 14, "#24160d"); }); break;
    case "entity:dog": url = glyphIcon((c) => { for (let y = 11; y < 21; y++) for (let x = 8; x < 20; x += 2) px(c, x, y, "#d6cfc4"); px(c, 10, 8, "#d6cfc4"); px(c, 16, 8, "#d6cfc4"); px(c, 12, 13, "#d32f2f"); px(c, 14, 13, "#d32f2f"); px(c, 10, 11, "#ffffff"); px(c, 12, 11, "#1a110a"); px(c, 14, 11, "#ffffff"); px(c, 16, 11, "#1a110a"); px(c, 13, 14, "#1f1a17"); }); break;
    case "entity:chest": url = glyphIcon((c) => { for (let y = 10; y < 22; y++) for (let x = 6; x < 22; x += 2) px(c, x, y, "#b88235"); px(c, 13, 14, "#dcdcdc"); }); break;
    case "entity:boat": url = glyphIcon((c) => { for (let x = 4; x < 24; x += 2) px(c, x, 18, "#8a5a33"); px(c, 4, 16, "#6b4a2b"); px(c, 22, 16, "#6b4a2b"); }); break;
    case "entity:painting": url = glyphIcon((c) => { for (let y = 8; y < 22; y++) for (let x = 6; x < 22; x += 2) px(c, x, y, "#d4c4a8"); for (let x = 6; x < 22; x += 2) { px(c, x, 8, "#5c3a21"); px(c, x, 21, "#5c3a21"); } }); break;
    default: url = undefined;
  }
  if (!url && catalogId.startsWith("villager:")) {
    url = glyphIcon((c) => { for (let y = 12; y < 23; y++) px(c, 11, y, "#8b5a2b"); px(c, 11, 7, "#d8a47f"); });
  }
  if (!url && catalogId.startsWith("entity:")) {
    url = glyphIcon((c) => { for (let y = 10; y < 20; y++) for (let x = 8; x < 20; x += 2) px(c, x, y, "#8a8a8a"); });
  }
  if (!url) {
    const [cv, c] = canvas();
    ground(c);
    px(c, 8, 8, "#c9c9c9"); px(c, 10, 8, "#c9c9c9"); px(c, 8, 10, "#b5b5b5");
    url = cv.toDataURL();
  }
  ICON_CACHE.set(catalogId, url);
  return url;
}
