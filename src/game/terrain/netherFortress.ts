/**
 * Nether Fortress & Ruined Portal Procedural Structure Generator
 * Generates grand elevated Nether Brick bridge networks, pillars down to lava lakes,
 * nether wart cultivation rooms, blaze spawner balconies, and loot chests.
 */

export const CH = 16;

// Block ID references
export const NETHER_BRICKS = 58;
export const RED_NETHER_BRICKS = 574;
export const NETHER_BRICK_SLAB = 1196;
export const SOUL_SAND = 57;
export const NETHER_WART = 500;
export const SPAWNER = 633;
export const CHEST = 43;
export const OBSIDIAN = 15;
export const CRYING_OBSIDIAN = 93;
export const GOLD_BLOCK = 33;
export const MAGMA_BLOCK = 76;
export const GLOWSTONE = 47;

export interface StructureVoxel {
  x: number;
  y: number;
  z: number;
  id: number;
}

export interface ChestItem {
  id: number;
  count: number;
}

export interface StructurePlacement {
  voxels: StructureVoxel[];
  chests: Map<string, Array<ChestItem | null>>;
}

/**
 * Deterministic pseudo-random number generator for structure coordinates.
 */
function hashCoords(seed: number, x: number, z: number, offset = 0): number {
  let h = (x * 374761393 + z * 668265263 + seed * 9647 + offset * 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Generates an elevated Nether Fortress layout centered around (fx, fy, fz).
 */
export function generateNetherFortress(
  _seed: number,
  fx: number,
  fy: number,
  fz: number
): StructurePlacement {
  const voxels: StructureVoxel[] = [];
  const chests = new Map<string, Array<ChestItem | null>>();

  const addVoxel = (x: number, y: number, z: number, id: number) => {
    voxels.push({ x, y, z, id });
  };

  // 1. Central 4-Way Crossway: 7x7 platform with arches
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      // Floor
      addVoxel(fx + dx, fy, fz + dz, NETHER_BRICKS);

      // Air clearance
      for (let dy = 1; dy <= 4; dy++) {
        addVoxel(fx + dx, fy + dy, fz + dz, 0);
      }

      // Parapet corners
      const isCorner = Math.abs(dx) === 3 && Math.abs(dz) === 3;
      if (isCorner) {
        addVoxel(fx + dx, fy + 1, fz + dz, RED_NETHER_BRICKS);
        addVoxel(fx + dx, fy + 2, fz + dz, RED_NETHER_BRICKS);
      }
    }
  }

  // Central massive support pillar down to lava/floor (3x3 column)
  for (let dy = 1; dy <= 26; dy++) {
    const py = fy - dy;
    if (py < 28) break;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        addVoxel(fx + dx, py, fz + dz, NETHER_BRICKS);
      }
    }
  }

  // 2. Main Bridge Arms (North, South, East, West)
  const armConfigs: Array<{ dirX: number; dirZ: number; length: number }> = [
    { dirX: 0, dirZ: 1, length: 36 },
    { dirX: 0, dirZ: -1, length: 36 },
    { dirX: 1, dirZ: 0, length: 36 },
    { dirX: -1, dirZ: 0, length: 36 }
  ];

  for (const arm of armConfigs) {
    const isZ = arm.dirZ !== 0;
    for (let step = 4; step <= arm.length; step++) {
      const bx = fx + arm.dirX * step;
      const bz = fz + arm.dirZ * step;

      // 5 wide bridge floor (-2 to 2)
      for (let w = -2; w <= 2; w++) {
        const vx = isZ ? bx + w : bx;
        const vz = isZ ? bz : bz + w;

        // Bridge deck floor
        addVoxel(vx, fy, vz, NETHER_BRICKS);

        // Clearance headroom
        for (let dy = 1; dy <= 4; dy++) {
          addVoxel(vx, fy + dy, vz, 0);
        }

        // Parapets on outer edges (w = -2 or 2)
        if (w === -2 || w === 2) {
          addVoxel(vx, fy + 1, vz, RED_NETHER_BRICKS);
        }
      }

      // Vertical support pillars every 12 blocks along the bridge
      if (step % 12 === 0) {
        for (let dy = 1; dy <= 26; dy++) {
          const py = fy - dy;
          if (py < 28) break;
          for (let pw = -1; pw <= 1; pw++) {
            const px = isZ ? bx + pw : bx;
            const pz = isZ ? bz : bz + pw;
            addVoxel(px, py, pz, NETHER_BRICKS);
          }
        }
      }
    }
  }

  // 3. Nether Wart Chamber at end of North Bridge (fz + 36)
  const nwx = fx;
  const nwy = fy;
  const nwz = fz + 36;
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = 0; dz <= 8; dz++) {
      // Floor
      addVoxel(nwx + dx, nwy, nwz + dz, NETHER_BRICKS);
      // Ceiling
      addVoxel(nwx + dx, nwy + 4, nwz + dz, NETHER_BRICKS);

      // Enclosure walls
      const isWall = dx === -4 || dx === 4 || dz === 8;
      if (isWall) {
        for (let dy = 1; dy <= 3; dy++) {
          addVoxel(nwx + dx, nwy + dy, nwz + dz, NETHER_BRICKS);
        }
      } else {
        // Interior air
        for (let dy = 1; dy <= 3; dy++) {
          addVoxel(nwx + dx, nwy + dy, nwz + dz, 0);
        }
      }

      // Two Soul Sand patches planted with Nether Wart on left & right
      const isLeftGarden = dx >= -3 && dx <= -2 && dz >= 2 && dz <= 6;
      const isRightGarden = dx >= 2 && dx <= 3 && dz >= 2 && dz <= 6;
      if (isLeftGarden || isRightGarden) {
        addVoxel(nwx + dx, nwy, nwz + dz, SOUL_SAND);
        addVoxel(nwx + dx, nwy + 1, nwz + dz, NETHER_WART);
      }
    }
  }

  // Nether Wart Room Treasure Chest at end wall
  const nChestX = nwx;
  const nChestY = nwy + 1;
  const nChestZ = nwz + 7;
  addVoxel(nChestX, nChestY, nChestZ, CHEST);
  chests.set(`${nChestX},${nChestY},${nChestZ}`, [
    { id: 32, count: 2 }, // Diamonds
    { id: 33, count: 4 }, // Gold Block / Ingots
    { id: 30, count: 5 }, // Iron
    { id: 15, count: 3 }, // Obsidian
    { id: 500, count: 6 }, // Nether Wart seeds
    ...Array(22).fill(null)
  ]);

  // 4. Blaze Balcony & Spawner at end of South Bridge (fz - 36)
  const spx = fx;
  const spy = fy;
  const spz = fz - 36;
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -6; dz <= 0; dz++) {
      // Balcony floor
      addVoxel(spx + dx, spy, spz + dz, NETHER_BRICKS);

      // Air clearance above
      for (let dy = 1; dy <= 5; dy++) {
        addVoxel(spx + dx, spy + dy, spz + dz, 0);
      }

      // Balcony railing
      const isBorder = dx === -3 || dx === 3 || dz === -6;
      if (isBorder) {
        addVoxel(spx + dx, spy + 1, spz + dz, RED_NETHER_BRICKS);
      }
    }
  }

  // Monster Spawner on pedestal
  addVoxel(spx, spy + 1, spz - 3, NETHER_BRICKS); // pedestal
  addVoxel(spx, spy + 2, spz - 3, SPAWNER);        // Blaze Spawner!

  // Glowing corner beacons
  addVoxel(spx - 2, spy + 1, spz - 5, GLOWSTONE);
  addVoxel(spx + 2, spy + 1, spz - 5, GLOWSTONE);

  return { voxels, chests };
}

/**
 * Generates a Ruined Portal structure in the Nether.
 */
export function generateRuinedPortal(
  seed: number,
  px: number,
  py: number,
  pz: number
): StructurePlacement {
  const voxels: StructureVoxel[] = [];
  const chests = new Map<string, Array<ChestItem | null>>();

  const addVoxel = (x: number, y: number, z: number, id: number) => {
    voxels.push({ x, y, z, id });
  };

  // Platform of Magma & Netherrack (5x5)
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const isMagma = ((dx + dz) & 1) === 0;
      addVoxel(px + dx, py, pz + dz, isMagma ? MAGMA_BLOCK : 56);
      for (let dy = 1; dy <= 5; dy++) {
        addVoxel(px + dx, py + dy, pz + dz, 0); // clearance
      }
    }
  }

  // 4x5 Decayed Obsidian Frame (some regular, some crying obsidian)
  // Bottom row (width 4)
  for (let i = -1; i <= 2; i++) {
    const crying = hashCoords(seed, px + i, pz, 1) < 0.35;
    addVoxel(px + i, py + 1, pz, crying ? CRYING_OBSIDIAN : OBSIDIAN);
  }
  // Left column (height 5)
  for (let dy = 2; dy <= 4; dy++) {
    const crying = hashCoords(seed, px - 1, pz, dy) < 0.40;
    addVoxel(px - 1, py + dy, pz, crying ? CRYING_OBSIDIAN : OBSIDIAN);
  }
  // Right column (broken top corner)
  addVoxel(px + 2, py + 2, pz, OBSIDIAN);
  addVoxel(px + 2, py + 3, pz, CRYING_OBSIDIAN);
  // Missing top right corner creates ruined look!

  // Top row (partially collapsed)
  addVoxel(px - 1, py + 5, pz, CRYING_OBSIDIAN);
  addVoxel(px, py + 5, pz, OBSIDIAN);

  // Hidden Gold Block in foundation
  addVoxel(px + 1, py, pz + 1, GOLD_BLOCK);

  // Ruined Portal Chest on pedestal
  addVoxel(px + 1, py + 1, pz - 1, CRYING_OBSIDIAN);
  addVoxel(px + 1, py + 2, pz - 1, CHEST);
  chests.set(`${px + 1},${py + 2},${pz - 1}`, [
    { id: 15, count: 4 }, // Obsidian
    { id: 93, count: 2 }, // Crying Obsidian
    { id: 33, count: 3 }, // Gold
    { id: 45, count: 1 }, // Fire / TNT
    ...Array(23).fill(null)
  ]);

  return { voxels, chests };
}

/**
 * Queries structures that intersect a specific chunk (cx, cz).
 */
export function getStructuresForChunk(
  seed: number,
  cx: number,
  cz: number
): StructurePlacement {
  const result: StructurePlacement = {
    voxels: [],
    chests: new Map()
  };

  const xMin = cx * CH;
  const xMax = (cx + 1) * CH - 1;
  const zMin = cz * CH;
  const zMax = (cz + 1) * CH - 1;

  // 1. Check Nether Fortress Regions (every 16 chunks = 256 blocks)
  const REGION_SIZE = 16;
  const rx = Math.floor(cx / REGION_SIZE);
  const rz = Math.floor(cz / REGION_SIZE);

  // Check current region and adjacent regions in case fortress spans across boundary
  for (let drx = -1; drx <= 1; drx++) {
    for (let drz = -1; drz <= 1; drz++) {
      const curRx = rx + drx;
      const curRz = rz + drz;

      const rHashX = hashCoords(seed, curRx, curRz, 10);
      const rHashZ = hashCoords(seed, curRx, curRz, 20);

      const fx = curRx * REGION_SIZE * CH + Math.floor(48 + rHashX * 160);
      const fz = curRz * REGION_SIZE * CH + Math.floor(48 + rHashZ * 160);
      const fy = 58; // canonical elevated fortress level above lava ocean

      // Approximate fortress bounding box: 100x100 blocks
      if (fx + 50 >= xMin && fx - 50 <= xMax && fz + 50 >= zMin && fz - 50 <= zMax) {
        const fortress = generateNetherFortress(seed, fx, fy, fz);
        for (const v of fortress.voxels) {
          if (v.x >= xMin && v.x <= xMax && v.z >= zMin && v.z <= zMax) {
            result.voxels.push(v);
          }
        }
        for (const [key, items] of fortress.chests.entries()) {
          const [cx0, , cz0] = key.split(",").map(Number);
          if (cx0 >= xMin && cx0 <= xMax && cz0 >= zMin && cz0 <= zMax) {
            result.chests.set(key, items);
          }
        }
      }
    }
  }

  // 2. Check Ruined Portals (every 10 chunks)
  const PORTAL_REGION = 10;
  const prx = Math.floor(cx / PORTAL_REGION);
  const prz = Math.floor(cz / PORTAL_REGION);

  for (let drx = -1; drx <= 1; drx++) {
    for (let drz = -1; drz <= 1; drz++) {
      const curPrx = prx + drx;
      const curPrz = prz + drz;

      const pxHash = hashCoords(seed, curPrx, curPrz, 77);
      const pzHash = hashCoords(seed, curPrx, curPrz, 88);

      const px = curPrx * PORTAL_REGION * CH + Math.floor(24 + pxHash * 110);
      const pz = curPrz * PORTAL_REGION * CH + Math.floor(24 + pzHash * 110);
      const py = 42; // on low cavern shelf

      if (px + 6 >= xMin && px - 6 <= xMax && pz + 6 >= zMin && pz - 6 <= zMax) {
        const portal = generateRuinedPortal(seed, px, py, pz);
        for (const v of portal.voxels) {
          if (v.x >= xMin && v.x <= xMax && v.z >= zMin && v.z <= zMax) {
            result.voxels.push(v);
          }
        }
        for (const [key, items] of portal.chests.entries()) {
          const [cx0, , cz0] = key.split(",").map(Number);
          if (cx0 >= xMin && cx0 <= xMax && cz0 >= zMin && cz0 <= zMax) {
            result.chests.set(key, items);
          }
        }
      }
    }
  }

  return result;
}
