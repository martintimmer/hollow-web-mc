/**
 * Nether Gate & Dimensional Traversal System
 * - Detects and validates Minecraft obsidian portal frames (2x3 opening minimum, 4x5 exterior)
 * - Ignites portal aperture with Nether Portal blocks (ID 98)
 * - Breaks portal aperture when frame obsidian is broken
 * - Translates coordinates with the 8:1 Overworld <-> Nether ratio
 * - Locates or auto-constructs destination obsidian gates with safe landing platforms
 * - Manages player collision, dwell timers, and dimensional transitions
 */

export const OBSIDIAN_ID = 15;
export const NETHER_PORTAL_ID = 98;
export const CRYING_OBSIDIAN_ID = 93;

export interface PortalFrame {
  axis: "x" | "z";
  minX: number;
  minY: number;
  minZ: number;
  width: number;
  height: number;
}

/**
 * Checks if a block ID qualifies as a valid portal frame block (Obsidian or Crying Obsidian)
 */
export function isPortalFrameBlock(id: number): boolean {
  return id === OBSIDIAN_ID || id === CRYING_OBSIDIAN_ID;
}

/**
 * Detects whether the given candidate aperture coordinate (startX, startY, startZ)
 * sits within an obsidian portal frame.
 */
export function detectObsidianFrame(
  getBlock: (x: number, y: number, z: number) => number,
  startX: number,
  startY: number,
  startZ: number
): PortalFrame | null {
  startX = Math.floor(startX);
  startY = Math.floor(startY);
  startZ = Math.floor(startZ);

  // Helper to test if a rectangle along the given axis is bounded by obsidian
  const testAperture = (axis: "x" | "z", minU: number, maxU: number, minV: number, maxV: number): boolean => {
    // Width must be between 2 and 21, height between 3 and 21
    const w = maxU - minU + 1;
    const h = maxV - minV + 1;
    if (w < 2 || w > 21 || h < 3 || h > 21) return false;

    // Check bottom and top boundary
    for (let u = minU; u <= maxU; u++) {
      const bx = axis === "x" ? u : startX;
      const bz = axis === "z" ? u : startZ;
      if (!isPortalFrameBlock(getBlock(bx, minV - 1, bz))) return false;
      if (!isPortalFrameBlock(getBlock(bx, maxV + 1, bz))) return false;
    }

    // Check left and right boundary
    for (let v = minV; v <= maxV; v++) {
      const lx = axis === "x" ? minU - 1 : startX;
      const lz = axis === "z" ? minU - 1 : startZ;
      const rx = axis === "x" ? maxU + 1 : startX;
      const rz = axis === "z" ? maxU + 1 : startZ;
      if (!isPortalFrameBlock(getBlock(lx, v, lz))) return false;
      if (!isPortalFrameBlock(getBlock(rx, v, rz))) return false;
    }

    // Interior must be air or existing portal blocks
    for (let u = minU; u <= maxU; u++) {
      for (let v = minV; v <= maxV; v++) {
        const ix = axis === "x" ? u : startX;
        const iz = axis === "z" ? u : startZ;
        const id = getBlock(ix, v, iz);
        if (id !== 0 && id !== NETHER_PORTAL_ID && id !== 40 /* fire */) return false;
      }
    }

    return true;
  };

  // 1. Try X-Axis frame (X varies, Z is constant)
  {
    let minX = startX, maxX = startX;
    while (minX > startX - 22 && (getBlock(minX - 1, startY, startZ) === 0 || getBlock(minX - 1, startY, startZ) === NETHER_PORTAL_ID)) {
      minX--;
    }
    while (maxX < startX + 22 && (getBlock(maxX + 1, startY, startZ) === 0 || getBlock(maxX + 1, startY, startZ) === NETHER_PORTAL_ID)) {
      maxX++;
    }

    let minY = startY, maxY = startY;
    while (minY > startY - 22 && (getBlock(startX, minY - 1, startZ) === 0 || getBlock(startX, minY - 1, startZ) === NETHER_PORTAL_ID)) {
      minY--;
    }
    while (maxY < startY + 22 && (getBlock(startX, maxY + 1, startZ) === 0 || getBlock(startX, maxY + 1, startZ) === NETHER_PORTAL_ID)) {
      maxY++;
    }

    if (testAperture("x", minX, maxX, minY, maxY)) {
      return {
        axis: "x",
        minX,
        minY,
        minZ: startZ,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      };
    }
  }

  // 2. Try Z-Axis frame (Z varies, X is constant)
  {
    let minZ = startZ, maxZ = startZ;
    while (minZ > startZ - 22 && (getBlock(startX, startY, minZ - 1) === 0 || getBlock(startX, startY, minZ - 1) === NETHER_PORTAL_ID)) {
      minZ--;
    }
    while (maxZ < startZ + 22 && (getBlock(startX, startY, maxZ + 1) === 0 || getBlock(startX, startY, maxZ + 1) === NETHER_PORTAL_ID)) {
      maxZ++;
    }

    let minY = startY, maxY = startY;
    while (minY > startY - 22 && (getBlock(startX, minY - 1, startZ) === 0 || getBlock(startX, minY - 1, startZ) === NETHER_PORTAL_ID)) {
      minY--;
    }
    while (maxY < startY + 22 && (getBlock(startX, maxY + 1, startZ) === 0 || getBlock(startX, maxY + 1, startZ) === NETHER_PORTAL_ID)) {
      maxY++;
    }

    if (testAperture("z", minZ, maxZ, minY, maxY)) {
      return {
        axis: "z",
        minX: startX,
        minY,
        minZ,
        width: maxZ - minZ + 1,
        height: maxY - minY + 1
      };
    }
  }

  return null;
}

/**
 * Fills the interior aperture of a detected portal frame with Nether Portal blocks (ID 98).
 */
export function igniteNetherPortal(
  edit: (x: number, y: number, z: number, id: number) => void,
  frame: PortalFrame
): void {
  for (let dy = 0; dy < frame.height; dy++) {
    for (let dw = 0; dw < frame.width; dw++) {
      const x = frame.axis === "x" ? frame.minX + dw : frame.minX;
      const y = frame.minY + dy;
      const z = frame.axis === "z" ? frame.minZ + dw : frame.minZ;
      edit(x, y, z, NETHER_PORTAL_ID);
    }
  }
}

/**
 * Attempts to ignite an obsidian frame given a clicked target or adjacent block.
 */
export function tryIgniteNetherPortal(
  getBlock: (x: number, y: number, z: number) => number,
  edit: (x: number, y: number, z: number, id: number) => void,
  clickX: number,
  clickY: number,
  clickZ: number
): boolean {
  // If clicked inside an empty block, test directly
  let frame = detectObsidianFrame(getBlock, clickX, clickY, clickZ);
  if (frame) {
    igniteNetherPortal(edit, frame);
    return true;
  }

  // If clicked on an obsidian frame block, test adjacent air blocks
  const dirs = [
    [0, 1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1]
  ];
  for (const [dx, dy, dz] of dirs) {
    const nx = clickX + dx, ny = clickY + dy, nz = clickZ + dz;
    if (getBlock(nx, ny, nz) === 0) {
      frame = detectObsidianFrame(getBlock, nx, ny, nz);
      if (frame) {
        igniteNetherPortal(edit, frame);
        return true;
      }
    }
  }

  return false;
}

/**
 * Breaks all connected portal blocks inside an aperture when a frame block is broken.
 */
export function breakPortalAperture(
  getBlock: (x: number, y: number, z: number) => number,
  edit: (x: number, y: number, z: number, id: number) => void,
  startX: number,
  startY: number,
  startZ: number
): void {
  const visited = new Set<string>();
  const queue: Array<[number, number, number]> = [[startX, startY, startZ]];

  while (queue.length > 0) {
    const [x, y, z] = queue.pop()!;
    const key = `${x},${y},${z}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (getBlock(x, y, z) === NETHER_PORTAL_ID) {
      edit(x, y, z, 0); // Dispel portal block back to air

      // Spread to neighbors
      const neighbors: Array<[number, number, number]> = [
        [x + 1, y, z],
        [x - 1, y, z],
        [x, y + 1, z],
        [x, y - 1, z],
        [x, y, z + 1],
        [x, y, z - 1]
      ];
      for (const [nx, ny, nz] of neighbors) {
        if (!visited.has(`${nx},${ny},${nz}`) && getBlock(nx, ny, nz) === NETHER_PORTAL_ID) {
          queue.push([nx, ny, nz]);
        }
      }
    }
  }
}

/**
 * Translates coordinates between Overworld and Nether (8:1 ratio).
 */
export function getNetherTargetCoords(
  x: number,
  y: number,
  z: number,
  fromDimension: "overworld" | "nether"
): { x: number; y: number; z: number } {
  if (fromDimension === "overworld") {
    return {
      x: Math.floor(x / 8),
      y: Math.max(35, Math.min(100, Math.floor(y))),
      z: Math.floor(z / 8)
    };
  } else {
    return {
      x: Math.floor(x * 8),
      y: Math.max(64, Math.min(110, Math.floor(y))),
      z: Math.floor(z * 8)
    };
  }
}

/**
 * Searches for an existing active Nether Portal near target coordinates.
 */
export function findNearbyPortal(
  getBlock: (x: number, y: number, z: number) => number,
  centerX: number,
  centerY: number,
  centerZ: number,
  radius = 16
): { x: number; y: number; z: number } | null {
  centerX = Math.floor(centerX);
  centerY = Math.floor(centerY);
  centerZ = Math.floor(centerZ);

  for (let r = 0; r <= radius; r += 2) {
    for (let dx = -r; dx <= r; dx += 2) {
      for (let dz = -r; dz <= r; dz += 2) {
        for (let y = Math.max(5, centerY - 25); y <= Math.min(120, centerY + 25); y++) {
          if (getBlock(centerX + dx, y, centerZ + dz) === NETHER_PORTAL_ID) {
            return { x: centerX + dx, y, z: centerZ + dz };
          }
        }
      }
    }
  }
  return null;
}

/**
 * Auto-constructs a standard complete 4x5 Obsidian Nether Gate with
 * 6 active portal blocks and a 4x3 safe landing platform.
 */
export function buildObsidianPortalGate(
  edit: (x: number, y: number, z: number, id: number) => void,
  baseX: number,
  baseY: number,
  baseZ: number,
  axis: "x" | "z" = "x"
): { entranceX: number; entranceY: number; entranceZ: number } {
  baseX = Math.floor(baseX);
  baseY = Math.floor(baseY);
  baseZ = Math.floor(baseZ);

  // 1. Landing Platform: 6x7 obsidian platform at baseY - 1
  for (let dx = -2; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const px = axis === "x" ? baseX + dx : baseX + dz;
      const pz = axis === "z" ? baseZ + dx : baseZ + dz;
      edit(px, baseY - 1, pz, OBSIDIAN_ID);
    }
  }

  // 2. Clear clearance space: 6 wide x 6 tall x 7 deep air pocket
  for (let dx = -2; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      for (let dy = 0; dy <= 5; dy++) {
        const px = axis === "x" ? baseX + dx : baseX + dz;
        const pz = axis === "z" ? baseZ + dx : baseZ + dz;
        edit(px, baseY + dy, pz, 0); // Air
      }
    }
  }

  // 2b. Glowstone beacons on the platform corners for ambient terrace lighting
  edit(axis === "x" ? baseX - 2 : baseX, baseY, axis === "x" ? baseZ + 2 : baseZ - 2, 47);
  edit(axis === "x" ? baseX + 3 : baseX, baseY, axis === "x" ? baseZ + 2 : baseZ + 3, 47);

  // 3. Construct 4x5 Obsidian Frame
  // Bottom row (width 4)
  for (let i = -1; i <= 2; i++) {
    const px = axis === "x" ? baseX + i : baseX;
    const pz = axis === "z" ? baseZ + i : baseZ;
    edit(px, baseY, pz, OBSIDIAN_ID);
  }
  // Top row (width 4)
  for (let i = -1; i <= 2; i++) {
    const px = axis === "x" ? baseX + i : baseX;
    const pz = axis === "z" ? baseZ + i : baseZ;
    edit(px, baseY + 4, pz, OBSIDIAN_ID);
  }
  // Left pillar (height 3)
  for (let dy = 1; dy <= 3; dy++) {
    const px = axis === "x" ? baseX - 1 : baseX;
    const pz = axis === "z" ? baseZ - 1 : baseZ;
    edit(px, baseY + dy, pz, OBSIDIAN_ID);
  }
  // Right pillar (height 3)
  for (let dy = 1; dy <= 3; dy++) {
    const px = axis === "x" ? baseX + 2 : baseX;
    const pz = axis === "z" ? baseZ + 2 : baseZ;
    edit(px, baseY + dy, pz, OBSIDIAN_ID);
  }

  // 4. Fill 2x3 Interior with Nether Portal blocks (ID 98)
  for (let i = 0; i <= 1; i++) {
    for (let dy = 1; dy <= 3; dy++) {
      const px = axis === "x" ? baseX + i : baseX;
      const pz = axis === "z" ? baseZ + i : baseZ;
      edit(px, baseY + dy, pz, NETHER_PORTAL_ID);
    }
  }

  return {
    entranceX: baseX + 0.5,
    entranceY: baseY + 1.1,
    entranceZ: axis === "x" ? baseZ + 1.2 : baseZ + 0.5
  };
}

/**
 * Checks whether the player's bounding volume is currently inside a Nether Portal block.
 */
export function isPlayerInsidePortal(
  getBlock: (x: number, y: number, z: number) => number,
  px: number,
  py: number,
  pz: number
): boolean {
  const feet = getBlock(Math.floor(px), Math.floor(py + 0.1), Math.floor(pz));
  const waist = getBlock(Math.floor(px), Math.floor(py + 0.9), Math.floor(pz));
  const head = getBlock(Math.floor(px), Math.floor(py + 1.6), Math.floor(pz));
  return feet === NETHER_PORTAL_ID || waist === NETHER_PORTAL_ID || head === NETHER_PORTAL_ID;
}
