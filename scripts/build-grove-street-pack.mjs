/**
 * @file scripts/build-grove-street-pack.mjs
 * Generates high-fidelity BlueprintDocs for the complete Grove Street (GTA San Andreas) asset pack
 * with accurate Atlas block IDs.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const BLUEPRINTS_DIR = path.join(ROOT_DIR, "public", "catalog", "blueprints");
const MANIFEST_PATH = path.join(BLUEPRINTS_DIR, "manifest.json");

fs.mkdirSync(BLUEPRINTS_DIR, { recursive: true });

function loadManifest() {
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    } catch {
      return [];
    }
  }
  return [];
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

// Exact Atlas Block IDs
const ID = {
  OAK_PLANKS: 17,
  OAK_LOG: 16,
  BIRCH_PLANKS: 20,
  STONE_BRICKS: 8,
  COBBLESTONE: 6,
  COBBLE_SLAB: 1186,
  STONE_BRICK_SLAB: 1188,
  STONE_SLAB: 1185,
  SMOOTH_STONE_SLAB: 626,
  OAK_STAIRS: 70,
  SPRUCE_STAIRS: 77,
  STONE_BRICK_STAIRS: 72,
  OAK_FENCE: 1174,
  OAK_DOOR: 105,
  GLASS_PANE: 377,
  GLASS_BLOCK: 37,
  LANTERN: 46,
  QUARTZ_BLOCK: 569,
  GREEN_TERRACOTTA: 400,
  GREEN_CONCRETE: 394,
  JUNGLE_LOG: 25,
  LEAVES: 18,
  IRON_BARS: 45,
  GRAY_CONCRETE: 389,
  BLACK_CONCRETE: 186,
  COARSE_DIRT: 3,
  TORCH: 50
};

// -------------------------------------------------------------
// 1. Asset 1: CJ's House (The Johnson House)
// -------------------------------------------------------------
function buildCJHouse() {
  const blocks = [];
  const added = new Set();
  const put = (dx, dy, dz, id) => {
    const key = `${dx},${dy},${dz}`;
    if (added.has(key)) return;
    added.add(key);
    blocks.push({ dx, dy, dz, id });
  };

  const w = 12; // width
  const d = 10; // depth

  // Foundation & Porch Crawlspace (dy = 0)
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      put(x, 0, z, ID.STONE_BRICKS);
    }
  }

  // Front Porch Platform (dy = 1, front z = 0..2)
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < 3; z++) {
      put(x, 1, z, ID.OAK_PLANKS);
    }
  }

  // Porch Steps (dy = 1, center x = 5..6, z = -1)
  put(5, 1, -1, ID.OAK_STAIRS);
  put(6, 1, -1, ID.OAK_STAIRS);

  // Porch Railing Fences (dy = 2, front edge)
  for (let x = 0; x < w; x++) {
    if (x === 5 || x === 6) continue; // Stair opening
    put(x, 2, 0, ID.OAK_FENCE);
  }
  put(0, 2, 1, ID.OAK_FENCE);
  put(0, 2, 2, ID.OAK_FENCE);
  put(w - 1, 2, 1, ID.OAK_FENCE);
  put(w - 1, 2, 2, ID.OAK_FENCE);

  // Ground Floor Interior & Walls (dy = 1..4, main body z = 3..d-1)
  for (let y = 1; y <= 4; y++) {
    // Interior Floor
    if (y === 1) {
      for (let x = 1; x < w - 1; x++) {
        for (let z = 3; z < d - 1; z++) {
          put(x, y, z, ID.BIRCH_PLANKS);
        }
      }
    }

    // Porch Support Pillars
    if (y > 1 && y <= 4) {
      put(0, y, 0, ID.OAK_LOG);
      put(w - 1, y, 0, ID.OAK_LOG);
      put(4, y, 0, ID.OAK_LOG);
      put(7, y, 0, ID.OAK_LOG);
    }

    // Main House Walls (z = 3 is front wall)
    for (let x = 0; x < w; x++) {
      for (let z = 3; z < d; z++) {
        const isCorner = (x === 0 || x === w - 1) && (z === 3 || z === d - 1);
        const isFront = z === 3;
        const isBack = z === d - 1;
        const isLeft = x === 0;
        const isRight = x === w - 1;
        const isWall = isFront || isBack || isLeft || isRight;

        if (!isWall) continue;

        if (isCorner) {
          put(x, y, z, ID.OAK_LOG);
        } else if (isFront && (x === 5 || x === 6) && y === 1) {
          put(x, y, z, ID.OAK_DOOR);
        } else if (isFront && (x === 5 || x === 6) && y === 2) {
          put(x, y, z, 0); // Door opening
        } else if (isFront && (x === 2 || x === 9) && (y === 2 || y === 3)) {
          put(x, y, z, ID.GLASS_PANE); // Front windows
        } else if (isBack && (x === 3 || x === 8) && (y === 2 || y === 3)) {
          put(x, y, z, ID.GLASS_PANE); // Back windows
        } else if ((isLeft || isRight) && (z === 5 || z === 7) && (y === 2 || y === 3)) {
          put(x, y, z, ID.GLASS_PANE); // Side windows
        } else {
          put(x, y, z, ID.OAK_PLANKS);
        }
      }
    }
  }

  // Second Floor (Balcony + Upper Floor, dy = 5)
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      put(x, 5, z, ID.OAK_PLANKS);
    }
  }

  // Balcony Fences on 2nd floor (dy = 6, z = 0..2)
  for (let x = 0; x < w; x++) {
    put(x, 6, 0, ID.OAK_FENCE);
  }
  put(0, 6, 1, ID.OAK_FENCE);
  put(0, 6, 2, ID.OAK_FENCE);
  put(w - 1, 6, 1, ID.OAK_FENCE);
  put(w - 1, 6, 2, ID.OAK_FENCE);

  // Second Floor Walls (dy = 6..8, main house z = 3..d-1)
  for (let y = 6; y <= 8; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 3; z < d; z++) {
        const isCorner = (x === 0 || x === w - 1) && (z === 3 || z === d - 1);
        const isFront = z === 3;
        const isBack = z === d - 1;
        const isLeft = x === 0;
        const isRight = x === w - 1;
        const isWall = isFront || isBack || isLeft || isRight;

        if (!isWall) continue;

        if (isCorner) {
          put(x, y, z, ID.OAK_LOG);
        } else if (isFront && (x === 5 || x === 6) && y === 6) {
          put(x, y, z, ID.OAK_DOOR); // Balcony door
        } else if (isFront && (x === 2 || x === 3 || x === 8 || x === 9) && y === 7) {
          put(x, y, z, ID.GLASS_PANE); // 2nd floor front window pairs
        } else if (isBack && (x === 3 || x === 8) && y === 7) {
          put(x, y, z, ID.GLASS_PANE); // 2nd floor back windows
        } else if ((isLeft || isRight) && (z === 5 || z === 7) && y === 7) {
          put(x, y, z, ID.GLASS_PANE); // 2nd floor side windows
        } else {
          put(x, y, z, ID.OAK_PLANKS);
        }
      }
    }
  }

  // 3. Hipped Roof with Front Dormer (dy = 9..12)
  const roofOverhang = 1;
  for (let layer = 0; layer <= 3; layer++) {
    const ry = 9 + layer;
    const minX = layer - roofOverhang;
    const maxX = w - 1 - layer + roofOverhang;
    const minZ = layer - roofOverhang;
    const maxZ = d - 1 - layer + roofOverhang;

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const isBorder = x === minX || x === maxX || z === minZ || z === maxZ;
        if (isBorder) {
          put(x, ry, z, ID.SPRUCE_STAIRS);
        } else if (layer === 3) {
          put(x, ry, z, ID.STONE_BRICK_SLAB); // Flat ridge cap
        }
      }
    }
  }

  // Front Triangular Dormer (dy = 9..11, center x = 4..7, z = 0..3)
  for (let dy = 0; dy < 3; dy++) {
    const y = 9 + dy;
    const x0 = 4 + dy;
    const x1 = 7 - dy;
    for (let x = x0; x <= x1; x++) {
      put(x, y, 1, ID.OAK_PLANKS);
      put(x, y, 2, ID.OAK_PLANKS);
    }
    put(x0 - 1, y, 1, ID.SPRUCE_STAIRS);
    put(x1 + 1, y, 1, ID.SPRUCE_STAIRS);
  }

  // Porch & Interior Lanterns
  put(2, 4, 1, ID.LANTERN);
  put(9, 4, 1, ID.LANTERN);
  put(Math.floor(w / 2), 4, 6, ID.LANTERN);
  put(Math.floor(w / 2), 8, 6, ID.LANTERN);

  const materialsCount = {};
  for (const b of blocks) {
    materialsCount[`Block #${b.id}`] = (materialsCount[`Block #${b.id}`] || 0) + 1;
  }

  return {
    version: 1,
    id: "bp_cj_house_grove_st",
    name: "CJ's House (The Johnson House)",
    author: "Hollowpine Studio",
    category: "house",
    packageName: "Grove Street Pack",
    biomeAffinity: ["plains", "desert"],
    spawnNaturally: true,
    dimensions: { width: w + 2, height: 13, depth: d + 2 },
    anchor: { ax: Math.floor(w / 2), ay: 0, az: Math.floor(d / 2) },
    foundationDepth: 6,
    blocks: blocks.filter(b => b.id > 0),
    materialsCount,
    totalBlocks: blocks.filter(b => b.id > 0).length,
    createdAt: new Date().toISOString()
  };
}

// -------------------------------------------------------------
// 2. Asset 2: Attached Concrete / Quartz 1-Car Garage
// -------------------------------------------------------------
function buildCJGarage() {
  const blocks = [];
  const added = new Set();
  const put = (dx, dy, dz, id) => {
    const key = `${dx},${dy},${dz}`;
    if (added.has(key)) return;
    added.add(key);
    blocks.push({ dx, dy, dz, id });
  };

  const w = 6;
  const h = 4;
  const d = 7;

  // Foundation & Floor
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      put(x, 0, z, ID.STONE_BRICKS);
    }
  }

  // Garage Walls (dy = 1..h)
  for (let y = 1; y <= h; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isWall = x === 0 || x === w - 1 || z === 0 || z === d - 1;
        if (!isWall) continue;

        if (z === 0) {
          // Front Garage Door
          if (x === 0 || x === w - 1) {
            put(x, y, z, ID.QUARTZ_BLOCK);
          } else if (y === h) {
            put(x, y, z, ID.QUARTZ_BLOCK); // Header
          } else {
            put(x, y, z, ID.QUARTZ_BLOCK); // Roll-up Door Panel
          }
        } else {
          put(x, y, z, ID.QUARTZ_BLOCK);
        }
      }
    }
  }

  // Flat Overhanging Roof (dy = h + 1)
  for (let x = -1; x <= w; x++) {
    for (let z = -1; z <= d; z++) {
      put(x, h + 1, z, ID.STONE_BRICK_SLAB);
    }
  }

  put(Math.floor(w / 2), h, Math.floor(d / 2), ID.LANTERN);

  const materialsCount = {};
  for (const b of blocks) {
    materialsCount[`Block #${b.id}`] = (materialsCount[`Block #${b.id}`] || 0) + 1;
  }

  return {
    version: 1,
    id: "bp_cj_garage_grove_st",
    name: "CJ's Attached Garage",
    author: "Hollowpine Studio",
    category: "house",
    packageName: "Grove Street Pack",
    biomeAffinity: ["plains", "desert"],
    spawnNaturally: true,
    dimensions: { width: w + 2, height: h + 2, depth: d + 2 },
    anchor: { ax: Math.floor(w / 2), ay: 0, az: 0 },
    foundationDepth: 4,
    blocks: blocks.filter(b => b.id > 0),
    materialsCount,
    totalBlocks: blocks.filter(b => b.id > 0).length,
    createdAt: new Date().toISOString()
  };
}

// -------------------------------------------------------------
// 3. Asset 3: Sweet's House (Green Ranch House)
// -------------------------------------------------------------
function buildSweetsHouse() {
  const blocks = [];
  const added = new Set();
  const put = (dx, dy, dz, id) => {
    const key = `${dx},${dy},${dz}`;
    if (added.has(key)) return;
    added.add(key);
    blocks.push({ dx, dy, dz, id });
  };

  const w = 9;
  const h = 4;
  const d = 8;

  // Foundation
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      put(x, 0, z, ID.STONE_BRICKS);
    }
  }

  // Floor
  for (let x = 1; x < w - 1; x++) {
    for (let z = 1; z < d - 1; z++) {
      put(x, 1, z, ID.BIRCH_PLANKS);
    }
  }

  // Single Story Walls (dy = 1..h)
  for (let y = 1; y <= h; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isWall = x === 0 || x === w - 1 || z === 0 || z === d - 1;
        if (!isWall) continue;

        if (z === 0 && x === 3 && y === 1) {
          put(x, y, z, ID.OAK_DOOR);
        } else if (z === 0 && (x === 6 || x === 7) && y === 2) {
          put(x, y, z, ID.GLASS_PANE);
        } else if (z === d - 1 && (x === 3 || x === 6) && y === 2) {
          put(x, y, z, ID.GLASS_PANE);
        } else if ((x === 0 || x === w - 1) && (z === 3 || z === 5) && y === 2) {
          put(x, y, z, ID.GLASS_PANE);
        } else {
          put(x, y, z, ID.GREEN_TERRACOTTA);
        }
      }
    }
  }

  // Low-pitch overhanging roof
  for (let x = -1; x <= w; x++) {
    for (let z = -1; z <= d; z++) {
      put(x, h + 1, z, ID.SMOOTH_STONE_SLAB);
    }
  }

  // Front yard picket fence (z = -2)
  for (let x = -1; x <= w; x++) {
    if (x === 3) continue; // gate opening
    put(x, 1, -2, ID.OAK_FENCE);
  }
  put(-1, 1, -1, ID.OAK_FENCE);
  put(w, 1, -1, ID.OAK_FENCE);

  put(Math.floor(w / 2), h, Math.floor(d / 2), ID.LANTERN);

  const materialsCount = {};
  for (const b of blocks) {
    materialsCount[`Block #${b.id}`] = (materialsCount[`Block #${b.id}`] || 0) + 1;
  }

  return {
    version: 1,
    id: "bp_sweets_house_grove_st",
    name: "Sweet's House (Grove Street)",
    author: "Hollowpine Studio",
    category: "house",
    packageName: "Grove Street Pack",
    biomeAffinity: ["plains", "desert"],
    spawnNaturally: true,
    dimensions: { width: w + 2, height: h + 2, depth: d + 3 },
    anchor: { ax: Math.floor(w / 2), ay: 0, az: 0 },
    foundationDepth: 4,
    blocks: blocks.filter(b => b.id > 0),
    materialsCount,
    totalBlocks: blocks.filter(b => b.id > 0).length,
    createdAt: new Date().toISOString()
  };
}

// -------------------------------------------------------------
// 4. Asset 4: West Coast Fan Palm Tree
// -------------------------------------------------------------
function buildPalmTree() {
  const blocks = [];
  const added = new Set();
  const put = (dx, dy, dz, id) => {
    const key = `${dx},${dy},${dz}`;
    if (added.has(key)) return;
    added.add(key);
    blocks.push({ dx, dy, dz, id });
  };

  // Tall slender trunk (dy = 0..11)
  for (let y = 0; y <= 11; y++) {
    put(0, y, 0, ID.JUNGLE_LOG);
  }

  // Canopy top dome & drooping fronds (dy = 12..13)
  put(0, 12, 0, ID.JUNGLE_LOG);
  put(0, 13, 0, ID.LEAVES);

  // 4-way radial fronds
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  for (const [dx, dz] of dirs) {
    put(dx, 12, dz, ID.LEAVES);
    put(dx * 2, 12, dz * 2, ID.LEAVES);
    put(dx * 2, 11, dz * 2, ID.LEAVES); // Droop down
    put(dx * 3, 10, dz * 3, ID.LEAVES); // Tip droop
  }

  const materialsCount = {};
  for (const b of blocks) {
    materialsCount[`Block #${b.id}`] = (materialsCount[`Block #${b.id}`] || 0) + 1;
  }

  return {
    version: 1,
    id: "bp_fan_palm_grove_st",
    name: "California Fan Palm",
    author: "Hollowpine Studio",
    category: "foliage",
    packageName: "Grove Street Pack",
    biomeAffinity: ["desert", "plains"],
    spawnNaturally: true,
    dimensions: { width: 7, height: 14, depth: 7 },
    anchor: { ax: 0, ay: 0, az: 0 },
    foundationDepth: 2,
    blocks: blocks.filter(b => b.id > 0),
    materialsCount,
    totalBlocks: blocks.filter(b => b.id > 0).length,
    createdAt: new Date().toISOString()
  };
}

// -------------------------------------------------------------
// 5. Asset 5: Wooden Utility Pole & Power Fixture
// -------------------------------------------------------------
function buildUtilityPole() {
  const blocks = [];
  const added = new Set();
  const put = (dx, dy, dz, id) => {
    const key = `${dx},${dy},${dz}`;
    if (added.has(key)) return;
    added.add(key);
    blocks.push({ dx, dy, dz, id });
  };

  // Vertical pole (dy = 0..9)
  for (let y = 0; y <= 9; y++) {
    put(0, y, 0, ID.OAK_LOG);
  }

  // Crossarm Top (dy = 8, x = -2..2)
  for (let x = -2; x <= 2; x++) {
    if (x !== 0) put(x, 8, 0, ID.OAK_FENCE);
  }

  // Crossarm Upper (dy = 9, x = -1..1)
  put(-1, 9, 0, ID.OAK_FENCE);
  put(1, 9, 0, ID.OAK_FENCE);

  // Electrical Transformer Box on side (Gray Concrete)
  put(0, 7, 1, ID.GRAY_CONCRETE);
  put(0, 6, 1, ID.IRON_BARS);

  // Insulator details
  put(-2, 9, 0, ID.IRON_BARS);
  put(2, 9, 0, ID.IRON_BARS);
  put(0, 10, 0, ID.TORCH);

  const materialsCount = {};
  for (const b of blocks) {
    materialsCount[`Block #${b.id}`] = (materialsCount[`Block #${b.id}`] || 0) + 1;
  }

  return {
    version: 1,
    id: "bp_utility_pole_grove_st",
    name: "Wooden Telephone Utility Pole",
    author: "Hollowpine Studio",
    category: "object",
    packageName: "Grove Street Pack",
    biomeAffinity: ["plains", "desert"],
    spawnNaturally: true,
    dimensions: { width: 5, height: 11, depth: 3 },
    anchor: { ax: 0, ay: 0, az: 0 },
    foundationDepth: 2,
    blocks: blocks.filter(b => b.id > 0),
    materialsCount,
    totalBlocks: blocks.filter(b => b.id > 0).length,
    createdAt: new Date().toISOString()
  };
}

// -------------------------------------------------------------
// Build All and Sideload into Catalog
// -------------------------------------------------------------
const assets = [
  buildCJHouse(),
  buildCJGarage(),
  buildSweetsHouse(),
  buildPalmTree(),
  buildUtilityPole()
];

const manifest = loadManifest();

console.log("\n=== Generating Grove Street Asset Pack ===\n");

for (const doc of assets) {
  const destFile = path.join(BLUEPRINTS_DIR, `${doc.id}.json`);
  fs.writeFileSync(destFile, JSON.stringify(doc, null, 2), "utf8");

  const existingIdx = manifest.findIndex(m => m.id === doc.id);
  const entry = {
    id: doc.id,
    name: doc.name,
    category: doc.category,
    packageName: doc.packageName,
    totalBlocks: doc.totalBlocks,
    dimensions: doc.dimensions,
    file: `${doc.id}.json`,
    createdAt: doc.createdAt
  };

  if (existingIdx >= 0) {
    manifest[existingIdx] = entry;
  } else {
    manifest.push(entry);
  }

  console.log(`✅ Generated: ${doc.name} [${doc.id}]`);
  console.log(`   🧱 ${doc.totalBlocks} voxels | 📐 ${doc.dimensions.width}×${doc.dimensions.height}×${doc.dimensions.depth}`);
}

saveManifest(manifest);
console.log(`\n🎉 Successfully built & sideloaded all ${assets.length} Grove Street assets into catalog!\n`);
