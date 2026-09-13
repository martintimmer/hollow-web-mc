import * as THREE from "three";
import { BLOCK_MAP } from "../blocks";

import { customFaceTile } from "./customFaceTiles";

/**
 * Generates UV coordinates on the 16x16 procedural tile atlas (256x256 px).
 */
function getTileUvs(tile: number): [number, number, number, number] {
  const ATLAS_TILES = 32;
  const u0 = (tile % ATLAS_TILES) / ATLAS_TILES;
  const v0 = 1.0 - Math.floor(tile / ATLAS_TILES + 1.0) / ATLAS_TILES;
  const u1 = u0 + 1.0 / ATLAS_TILES;
  const v1 = v0 + 1.0 / ATLAS_TILES;
  return [u0, v0, u1, v1];
}

/**
 * Held torch: authentic 3D slender stick matching the placed world torch model,
 * textured with the exact atlas tiles for side, top, and bottom faces (including custom face overrides).
 */
export function createHeldTorchMesh(
  atlasTexture?: THREE.Texture | null,
  tile = 81,
  isLeftHand = false,
  blockId = 80
): THREE.Group {
  const group = new THREE.Group();

  const topTile = customFaceTile(blockId, "top") ?? tile;
  const bottomTile = customFaceTile(blockId, "bottom") ?? tile;
  const sideTile = tile;

  const [sideU0, sideV0, sideU1, sideV1] = getTileUvs(sideTile);
  const [topU0, topV0, topU1, topV1] = getTileUvs(topTile);
  const [botU0, botV0, botU1, botV1] = getTileUvs(bottomTile);

  const sideDU = sideU1 - sideU0;
  const sideDV = sideV1 - sideV0;
  const topDU = topU1 - topU0;
  const topDV = topV1 - topV0;
  const botDU = botU1 - botU0;
  const botDV = botV1 - botV0;

  // Exact 2px x 10px torch stick sub-region UVs (columns 7..8, rows 6..15)
  const sU0 = sideU0 + (7 / 16) * sideDU;
  const sU1 = sideU0 + (9 / 16) * sideDU;
  const sV0 = sideV0 + (0 / 16) * sideDV;
  const sV1 = sideV0 + (10 / 16) * sideDV;

  // 2x2 flame top cap UVs (columns 7..8, rows 6..7)
  const tU0 = topU0 + (7 / 16) * topDU;
  const tU1 = topU0 + (9 / 16) * topDU;
  const tV0 = topV0 + (8 / 16) * topDV;
  const tV1 = topV0 + (10 / 16) * topDV;

  // 2x2 stick bottom cap UVs (columns 7..8, rows 14..15)
  const bU0 = botU0 + (7 / 16) * botDU;
  const bU1 = botU0 + (9 / 16) * botDU;
  const bV0 = botV0 + (0 / 16) * botDV;
  const bV1 = botV0 + (2 / 16) * botDV;

  // 2px x 10px x 2px stick
  const stickGeom = new THREE.BoxGeometry(0.06, 0.30, 0.06);

  const uvAttr = new Float32Array([
    // Face 0 (+X, East)
    sU0, sV1, sU1, sV1, sU0, sV0, sU1, sV0,
    // Face 1 (-X, West)
    sU0, sV1, sU1, sV1, sU0, sV0, sU1, sV0,
    // Face 2 (+Y, Top)
    tU0, tV1, tU1, tV1, tU0, tV0, tU1, tV0,
    // Face 3 (-Y, Bottom)
    bU0, bV1, bU1, bV1, bU0, bV0, bU1, bV0,
    // Face 4 (+Z, South)
    sU0, sV1, sU1, sV1, sU0, sV0, sU1, sV0,
    // Face 5 (-Z, North)
    sU0, sV1, sU1, sV1, sU0, sV0, sU1, sV0,
  ]);
  stickGeom.setAttribute("uv", new THREE.BufferAttribute(uvAttr, 2));

  let stickMat: THREE.Material;
  if (atlasTexture) {
    stickMat = new THREE.MeshBasicMaterial({
      map: atlasTexture,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide
    });
  } else {
    stickMat = new THREE.MeshBasicMaterial({
      color: 0xd49b4b,
      depthTest: true,
      depthWrite: true
    });
  }

  const stick = new THREE.Mesh(stickGeom, stickMat);
  stick.position.set(0, 0.15, 0);
  group.add(stick);

  // Natural first-person hand positioning:
  // Lift the torch upright in the hand with authentic Minecraft forward tilt
  if (isLeftHand) {
    group.position.set(-0.04, 0.06, -0.12);
    group.rotation.set(-0.25, -0.20, 0.15);
  } else {
    group.position.set(0.04, 0.06, -0.12);
    group.rotation.set(-0.25, 0.20, -0.15);
  }

  return group;
}

/**
 * Flat 2D item sprite from an atlas tile (for torch-style held items).
 * Unlit so the torch reads as a bright glowing stick; alphaTest cuts the sprite.
 */
export function createHeldSprite(tile: number, atlasTexture: THREE.Texture, w = 0.14, h = 0.26): THREE.Mesh {
  const ATLAS_TILES = 32;
  const u0 = (tile % ATLAS_TILES) / ATLAS_TILES;
  const v1 = 1.0 - Math.floor(tile / ATLAS_TILES) / ATLAS_TILES;
  const u1 = u0 + 1.0 / ATLAS_TILES;
  const v0 = v1 - 1.0 / ATLAS_TILES;

  const geom = new THREE.PlaneGeometry(w, h);
  geom.setAttribute("uv", new THREE.Float32BufferAttribute([
    u0, v0,  u1, v0,  u0, v1,
    u0, v1,  u1, v0,  u1, v1
  ], 2));

  const mat = new THREE.MeshBasicMaterial({
    map: atlasTexture,
    transparent: true,
    alphaTest: 0.08,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(0.0, 0.0, 0.0);
  mesh.rotation.set(0.12, 0.55, -0.12);
  return mesh;
}

/**
 * Flat 2D item sprite from an image data URI (for buckets whose textures are not
 * in the terrain atlas). Uses a NearestFilter CanvasTexture for the pixel look.
 */
export function createHeldSpriteFromImage(dataUri: string, w = 0.16, h = 0.16): THREE.Mesh {
  const img = new Image();
  img.src = dataUri;
  const tex = new THREE.CanvasTexture(img);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.08,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(0.0, 0.0, 0.0);
  mesh.rotation.set(0.12, 0.55, -0.12);
  return mesh;
}

/**
 * Builds a miniature 3D textured voxel cube with proper UV mapping for all 6 faces.
 */
export function createHeldBlockMesh(blockId: number, atlasTexture: THREE.Texture): THREE.Mesh | null {
  const def = BLOCK_MAP.get(blockId);
  if (!def) return null;
  if (def.side === undefined && def.top === undefined) return null;

  const topTile = def.top ?? def.side ?? 0;
  const bottomTile = def.bottom ?? def.side ?? 0;
  const sideTile = def.side ?? 0;

  const [tU0, tV0, tU1, tV1] = getTileUvs(topTile);
  const [bU0, bV0, bU1, bV1] = getTileUvs(bottomTile);
  const [sU0, sV0, sU1, sV1] = getTileUvs(sideTile);

  const S = 0.15; // Miniature block size in hand
  const hS = S / 2;

  // 6 Faces: +X, -X, +Y, -Y, +Z, -Z (24 vertices, 36 indices)
  const positions: number[] = [
    // +X (Right)
    hS, -hS, -hS,   hS, hS, -hS,   hS, hS, hS,   hS, -hS, hS,
    // -X (Left)
    -hS, -hS, hS,  -hS, hS, hS,  -hS, hS, -hS,  -hS, -hS, -hS,
    // +Y (Top)
    -hS, hS, hS,    hS, hS, hS,    hS, hS, -hS,  -hS, hS, -hS,
    // -Y (Bottom)
    -hS, -hS, -hS,  hS, -hS, -hS,  hS, -hS, hS,  -hS, -hS, hS,
    // +Z (Front)
    -hS, -hS, hS,   hS, -hS, hS,   hS, hS, hS,   -hS, hS, hS,
    // -Z (Back)
    hS, -hS, -hS,  -hS, -hS, -hS, -hS, hS, -hS,   hS, hS, -hS,
  ];

  const normals: number[] = [
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
  ];

  const uvs: number[] = [
    // +X (Side)
    sU0, sV0,  sU0, sV1,  sU1, sV1,  sU1, sV0,
    // -X (Side)
    sU0, sV0,  sU0, sV1,  sU1, sV1,  sU1, sV0,
    // +Y (Top)
    tU0, tV0,  tU1, tV0,  tU1, tV1,  tU0, tV1,
    // -Y (Bottom)
    bU0, bV0,  bU1, bV0,  bU1, bV1,  bU0, bV1,
    // +Z (Side)
    sU0, sV0,  sU1, sV0,  sU1, sV1,  sU0, sV1,
    // -Z (Side)
    sU0, sV0,  sU1, sV0,  sU1, sV1,  sU0, sV1,
  ];

  const indices: number[] = [];
  for (let f = 0; f < 6; f++) {
    const o = f * 4;
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  const mat = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    transparent: !!def.trans,
    alphaTest: def.trans ? 0.2 : 0,
    depthTest: true,
    depthWrite: true
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(-0.02, 0.04, -0.06);
  mesh.rotation.set(0.20, 0.65, -0.15);
  return mesh;
}

/**
 * Builds a 3D voxel tool model (Diamond Sword, Pickaxe, Axe, Shovel) angled diagonally in the hand.
 */
export function createHeldSwordMesh(): THREE.Group {
  const group = new THREE.Group();

  const diamondMat = new THREE.MeshLambertMaterial({ color: 0x33ebcb, depthTest: true, depthWrite: true });
  const diamondEdgeMat = new THREE.MeshLambertMaterial({ color: 0x1dbda0, depthTest: true, depthWrite: true });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5a3d28, depthTest: true, depthWrite: true });
  const guardMat = new THREE.MeshLambertMaterial({ color: 0x372314, depthTest: true, depthWrite: true });

  // 1. Diamond Blade
  const bladeGeom = new THREE.BoxGeometry(0.06, 0.48, 0.025);
  const bladeMesh = new THREE.Mesh(bladeGeom, diamondMat);
  bladeMesh.position.set(0, 0.22, 0);
  group.add(bladeMesh);

  // Blade Spine
  const spineGeom = new THREE.BoxGeometry(0.04, 0.44, 0.035);
  const spineMesh = new THREE.Mesh(spineGeom, diamondEdgeMat);
  spineMesh.position.set(0, 0.20, 0);
  group.add(spineMesh);

  // 2. Crossguard
  const guardGeom = new THREE.BoxGeometry(0.18, 0.04, 0.045);
  const guardMesh = new THREE.Mesh(guardGeom, guardMat);
  guardMesh.position.set(0, -0.03, 0);
  group.add(guardMesh);

  // 3. Wooden Handle
  const handleGeom = new THREE.BoxGeometry(0.035, 0.14, 0.035);
  const handleMesh = new THREE.Mesh(handleGeom, woodMat);
  handleMesh.position.set(0, -0.11, 0);
  group.add(handleMesh);

  // 4. Pommel
  const pommelGeom = new THREE.BoxGeometry(0.06, 0.035, 0.045);
  const pommelMesh = new THREE.Mesh(pommelGeom, diamondMat);
  pommelMesh.position.set(0, -0.19, 0);
  group.add(pommelMesh);

  // 45° Diagonal First-Person Angle (HUD_example.png #7)
  group.position.set(0.05, 0.06, -0.18);
  group.rotation.set(-0.30, 0.52, -0.785);
  return group;
}

export function createHeldPickaxeMesh(): THREE.Group {
  const group = new THREE.Group();

  const diamondMat = new THREE.MeshLambertMaterial({ color: 0x33ebcb, depthTest: true, depthWrite: true });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5a3d28, depthTest: true, depthWrite: true });

  // 1. Long Wooden Handle
  const handleGeom = new THREE.BoxGeometry(0.035, 0.52, 0.035);
  const handleMesh = new THREE.Mesh(handleGeom, woodMat);
  handleMesh.position.set(0, 0.05, 0);
  group.add(handleMesh);

  // 2. Pickaxe Head (Curved Diamond Head)
  const headGeom = new THREE.BoxGeometry(0.32, 0.06, 0.04);
  const headMesh = new THREE.Mesh(headGeom, diamondMat);
  headMesh.position.set(0, 0.28, 0);
  group.add(headMesh);

  // Pick Tips
  const tip1Geom = new THREE.BoxGeometry(0.05, 0.08, 0.035);
  const tip1Mesh = new THREE.Mesh(tip1Geom, diamondMat);
  tip1Mesh.position.set(-0.14, 0.24, 0);
  group.add(tip1Mesh);

  const tip2Mesh = new THREE.Mesh(tip1Geom, diamondMat);
  tip2Mesh.position.set(0.14, 0.24, 0);
  group.add(tip2Mesh);

  // 45° Diagonal First-Person Angle (HUD_example.png #7)
  group.position.set(0.05, 0.06, -0.18);
  group.rotation.set(-0.30, 0.52, -0.785);
  return group;
}

/**
 * Builds an authentic 3D miniature fence item for first-person hand holding.
 * Consists of central wooden post with upper and lower horizontal crossbars.
 */
export function createHeldFenceMesh(blockId: number, atlasTexture: THREE.Texture): THREE.Group | null {
  const def = BLOCK_MAP.get(blockId);
  if (!def) return null;
  const tile = def.side ?? def.top ?? 9;

  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide
  });

  const scale = 0.22;
  const [u0, v0, u1, v1] = getTileUvs(tile);

  function addMiniBox(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    const geo = new THREE.BoxGeometry(
      (x1 - x0) * scale,
      (y1 - y0) * scale,
      (z1 - z0) * scale
    );
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const du = u1 - u0;
    const dv = v1 - v0;
    const setFaceUv = (f: number, fu0: number, fv0: number, fu1: number, fv1: number) => {
      const base = f * 4;
      uv.setXY(base + 0, u0 + fu0 * du, v0 + fv1 * dv);
      uv.setXY(base + 1, u0 + fu1 * du, v0 + fv1 * dv);
      uv.setXY(base + 2, u0 + fu0 * du, v0 + fv0 * dv);
      uv.setXY(base + 3, u0 + fu1 * du, v0 + fv0 * dv);
    };
    // 0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z
    setFaceUv(0, 1 - z1, y0, 1 - z0, y1);
    setFaceUv(1, z0, y0, z1, y1);
    setFaceUv(2, x0, 1 - z1, x1, 1 - z0);
    setFaceUv(3, x0, z0, x1, z1);
    setFaceUv(4, x0, y0, x1, y1);
    setFaceUv(5, 1 - x1, y0, 1 - x0, y1);
    uv.needsUpdate = true;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      ((x0 + x1) / 2 - 0.5) * scale,
      ((y0 + y1) / 2 - 0.5) * scale,
      ((z0 + z1) / 2 - 0.5) * scale
    );
    group.add(mesh);
  }

  // 1. Central Post (4x16x4 px)
  addMiniBox(0.375, 0.0, 0.375, 0.625, 1.0, 0.625);
  // 2. West rails
  addMiniBox(0.0, 0.75, 0.4375, 0.375, 0.9375, 0.5625);
  addMiniBox(0.0, 0.375, 0.4375, 0.375, 0.5625, 0.5625);
  // 3. East rails
  addMiniBox(0.625, 0.75, 0.4375, 1.0, 0.9375, 0.5625);
  addMiniBox(0.625, 0.375, 0.4375, 1.0, 0.5625, 0.5625);

  return group;
}

/** Curved 3D bow held in the first-person hand (wood arc + string + grip). */
export function createHeldBowMesh(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8a6b3f });
  const stringMat = new THREE.MeshLambertMaterial({ color: 0xe6dcc8 });
  const gripMat = new THREE.MeshLambertMaterial({ color: 0x5a3d1a });

  // Bow limbs: half-torus arc in the XY plane (tips at +/-x, apex up).
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.024, 8, 14, Math.PI), woodMat);
  g.add(arc);

  // String spanning the two limb tips, slightly in front of the arc.
  const string = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.016, 0.016), stringMat);
  string.position.set(0, 0, 0.03);
  g.add(string);

  // Grip wrap at the center.
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.11, 0.06), gripMat);
  grip.position.set(0, 0, 0.02);
  g.add(grip);

  g.scale.set(0.95, 0.95, 0.95);
  g.rotation.set(-0.55, 0.15, -0.15);
  return g;
}

/**
 * Builds an authentic 3D miniature half-height slab block for first-person hand holding.
 */
export function createHeldSlabMesh(blockId: number, atlasTexture: THREE.Texture): THREE.Group | null {
  const def = BLOCK_MAP.get(blockId);
  if (!def) return null;
  const sideTile = def.side ?? def.top ?? 1;
  const topTile = def.top ?? sideTile;
  const bottomTile = def.bottom ?? sideTile;

  const group = new THREE.Group();
  const [sideU0, sideV0, sideU1, sideV1] = getTileUvs(sideTile);
  const [topU0, topV0, topU1, topV1] = getTileUvs(topTile);
  const [botU0, botV0, botU1, botV1] = getTileUvs(bottomTile);

  // Slab dimensions in hand: 0.20 wide, 0.10 high (half block), 0.20 deep
  const geo = new THREE.BoxGeometry(0.20, 0.10, 0.20);
  const uv = geo.attributes.uv as THREE.BufferAttribute;

  const sideDV = sideV1 - sideV0;
  // Side UV: bottom half of tile (v0 .. v0 + 0.5 * dv)
  const sideHalfV1 = sideV0 + 0.5 * sideDV;

  const setFaceUv = (f: number, u0: number, v0: number, u1: number, v1: number) => {
    const base = f * 4;
    uv.setXY(base + 0, u0, v1);
    uv.setXY(base + 1, u1, v1);
    uv.setXY(base + 2, u0, v0);
    uv.setXY(base + 3, u1, v0);
  };

  // Face 0 (+X, East)
  setFaceUv(0, sideU0, sideV0, sideU1, sideHalfV1);
  // Face 1 (-X, West)
  setFaceUv(1, sideU0, sideV0, sideU1, sideHalfV1);
  // Face 2 (+Y, Top)
  setFaceUv(2, topU0, topV0, topU1, topV1);
  // Face 3 (-Y, Bottom)
  setFaceUv(3, botU0, botV0, botU1, botV1);
  // Face 4 (+Z, South)
  setFaceUv(4, sideU0, sideV0, sideU1, sideHalfV1);
  // Face 5 (-Z, North)
  setFaceUv(5, sideU0, sideV0, sideU1, sideHalfV1);

  uv.needsUpdate = true;

  const mat = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, -0.02, 0);
  group.add(mesh);

  return group;
}

/**
 * Builds a held 2-block tall intersecting 3D billboard for Large Grass.
 * Bottom half: tall_grass_bottom (tile 815), Top half: tall_grass_top (tile 816).
 */
export function createHeldLargeGrassMesh(atlasTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const [bU0, bV0, bU1, bV1] = getTileUvs(815);
  const [tU0, tV0, tU1, tV1] = getTileUvs(816);

  const mat = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide
  });

  const S = 0.16; // width
  const H = 0.16; // height per block (total 0.32)
  const hS = S / 2;

  function buildTier(y0: number, y1: number, u0: number, v0: number, u1: number, v1: number) {
    const geo = new THREE.BufferGeometry();
    // 2 diagonal intersecting planes: 8 vertices, 12 indices
    const pos = [
      -hS, y1, -hS,   hS, y1, hS,  -hS, y0, -hS,   hS, y0, hS,
      -hS, y1,  hS,   hS, y1,-hS,  -hS, y0,  hS,   hS, y0,-hS
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
    return new THREE.Mesh(geo, mat);
  }

  // Bottom half
  group.add(buildTier(-0.08, -0.08 + H, bU0, bV0, bU1, bV1));
  // Top half
  group.add(buildTier(-0.08 + H, -0.08 + H * 2, tU0, tV0, tU1, tV1));

  return group;
}

/**
 * Builds a held 3D intersecting cross billboard for Short Grass and flowers.
 */
export function createHeldCrossBillboardMesh(tile: number, atlasTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const [u0, v0, u1, v1] = getTileUvs(tile);

  const mat = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide
  });

  const S = 0.16; // width
  const H = 0.18; // height
  const hS = S / 2;

  const geo = new THREE.BufferGeometry();
  const pos = [
    -hS, H, -hS,   hS, H,  hS,  -hS, 0, -hS,   hS, 0,  hS,
    -hS, H,  hS,   hS, H, -hS,  -hS, 0,  hS,   hS, 0, -hS
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
  mesh.position.set(0, -0.05, 0);
  group.add(mesh);
  return group;
}

/**
 * Builds a held cobweb mesh matching the placed density: 1 plane (sparse),
 * 2 crossed planes (medium, fire-style), or 4 planes (dense).
 */
export function createHeldWebMesh(tile: number, planes: 1 | 2 | 4, atlasTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const [u0, v0, u1, v1] = getTileUvs(tile);

  const mat = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide
  });

  const S = 0.16; // width
  const H = 0.18; // height
  const hS = S / 2;

  const quads: number[][] = [
    [-hS, H, -hS, hS, H, hS, -hS, 0, -hS, hS, 0, hS], // diag 1
  ];
  if (planes >= 2) {
    quads.push([-hS, H, hS, hS, H, -hS, -hS, 0, hS, hS, 0, -hS]); // diag 2
  }
  if (planes >= 4) {
    quads.push([-hS, H, 0, hS, H, 0, -hS, 0, 0, hS, 0, 0]); // axial X
    quads.push([0, H, -hS, 0, H, hS, 0, 0, -hS, 0, 0, hS]); // axial Z
  }

  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  quads.forEach((q, i) => {
    pos.push(...q);
    uvs.push(u0, v1, u1, v1, u0, v0, u1, v0);
    const b = i * 4;
    idx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, -0.05, 0);
  group.add(mesh);
  return group;
}

/**
 * Builds a held 3D volumetric 4-plane Tropical Bush mesh (large lush spreading fronds, 2 tiers).
 * Bottom half: large_fern_bottom (tile 496), Top half: large_fern_top (tile 497).
 */
export function createHeldTropicalBushMesh(atlasTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const [bU0, bV0, bU1, bV1] = getTileUvs(496);
  const [tU0, tV0, tU1, tV1] = getTileUvs(497);

  const mat = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide
  });

  const S = 0.22; // broader spread (large tropical bush)
  const H = 0.16; // height per tier (total 0.32)
  const hS = S / 2;

  function buildTier(y0: number, y1: number, u0: number, v0: number, u1: number, v1: number) {
    const geo = new THREE.BufferGeometry();
    const pos = [
      // Diag 1
      -hS, y1, -hS,   hS, y1,  hS,  -hS, y0, -hS,   hS, y0,  hS,
      // Diag 2
      -hS, y1,  hS,   hS, y1, -hS,  -hS, y0,  hS,   hS, y0, -hS,
      // Axial X
      -hS, y1,   0,   hS, y1,   0,  -hS, y0,   0,   hS, y0,   0,
      // Axial Z
        0, y1, -hS,    0, y1,  hS,    0, y0, -hS,    0, y0,  hS
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
    return new THREE.Mesh(geo, mat);
  }

  // Bottom tier
  group.add(buildTier(-0.08, -0.08 + H, bU0, bV0, bU1, bV1));
  // Top tier
  group.add(buildTier(-0.08 + H, -0.08 + H * 2, tU0, tV0, tU1, tV1));

  return group;
}

/**
 * Builds a held 3D Portal panel mesh (thin glowing double-sided vertical slab).
 * Tile: nether_portal (tile 101).
 */
export function createHeldPortalMesh(atlasTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const [u0, v0, u1, v1] = getTileUvs(101);

  const mat = new THREE.MeshLambertMaterial({
    map: atlasTexture,
    transparent: true,
    alphaTest: 0.2,
    side: THREE.DoubleSide
  });

  const geo = new THREE.BufferGeometry();
  const W = 0.16, H = 0.24, D = 0.02;
  const hW = W / 2, hD = D / 2;

  const pos = [
    // Front
    -hW, H,  hD,   hW, H,  hD,  -hW, 0,  hD,   hW, 0,  hD,
    // Back
     hW, H, -hD,  -hW, H, -hD,   hW, 0, -hD,  -hW, 0, -hD
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
  mesh.position.set(0, -0.05, 0);
  group.add(mesh);
  return group;
}
