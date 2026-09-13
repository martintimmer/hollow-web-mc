import {
  detectObsidianFrame,
  tryIgniteNetherPortal,
  breakPortalAperture,
  getNetherTargetCoords,
  buildObsidianPortalGate,
  isPlayerInsidePortal,
  OBSIDIAN_ID,
  NETHER_PORTAL_ID
} from "../src/game/entities/netherGate.ts";

console.log("Testing Nether Gate System (Phase 2)...");

let fails = 0;
const check = (label, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} · ${label} ${detail}`);
  if (!cond) fails++;
};

// Mock voxel grid
const grid = new Map();
const coordKey = (x, y, z) => `${x},${y},${z}`;
const getBlock = (x, y, z) => grid.get(coordKey(x, y, z)) || 0;
const setBlock = (x, y, z, id) => {
  if (id === 0) grid.delete(coordKey(x, y, z));
  else grid.set(coordKey(x, y, z), id);
};

// 1. Construct a 4x5 Obsidian Frame at X: 10..13, Y: 64..68, Z: 20
// Bottom row
for (let x = 10; x <= 13; x++) setBlock(x, 64, 20, OBSIDIAN_ID);
// Top row
for (let x = 10; x <= 13; x++) setBlock(x, 68, 20, OBSIDIAN_ID);
// Left and right pillars
for (let y = 65; y <= 67; y++) {
  setBlock(10, y, 20, OBSIDIAN_ID);
  setBlock(13, y, 20, OBSIDIAN_ID);
}

// 2. Test frame detection
const detected = detectObsidianFrame(getBlock, 11, 65, 20);
check("Obsidian frame detected", detected !== null);
check("Frame width is 2", detected?.width === 2);
check("Frame height is 3", detected?.height === 3);
check("Frame axis is X", detected?.axis === "x");

// 3. Test ignition
const ignited = tryIgniteNetherPortal(getBlock, setBlock, 11, 65, 20);
check("Portal successfully ignited", ignited === true);

// Count portal blocks inside aperture
let portalCount = 0;
for (let x = 11; x <= 12; x++) {
  for (let y = 65; y <= 67; y++) {
    if (getBlock(x, y, 20) === NETHER_PORTAL_ID) portalCount++;
  }
}
check("2x3 aperture filled with 6 portal blocks", portalCount === 6, `count=${portalCount}`);

// 4. Test player collision
check("Player inside portal detected", isPlayerInsidePortal(getBlock, 11.5, 65.0, 20.0));
check("Player outside portal detected as false", !isPlayerInsidePortal(getBlock, 11.5, 65.0, 25.0));

// 5. Test frame breakage (breaking obsidian clears portal aperture)
setBlock(10, 65, 20, 0); // break left pillar
breakPortalAperture(getBlock, setBlock, 11, 65, 20);
let remainingPortal = 0;
for (let x = 11; x <= 12; x++) {
  for (let y = 65; y <= 67; y++) {
    if (getBlock(x, y, 20) === NETHER_PORTAL_ID) remainingPortal++;
  }
}
check("Portal blocks dispelled when frame breaks", remainingPortal === 0);

// 6. Test 8:1 coordinate translation
const toNether = getNetherTargetCoords(80, 65, 160, "overworld");
check("Overworld -> Nether 8:1 (80, 160 -> 10, 20)", toNether.x === 10 && toNether.z === 20, JSON.stringify(toNether));

const toOverworld = getNetherTargetCoords(10, 65, 20, "nether");
check("Nether -> Overworld 1:8 (10, 20 -> 80, 160)", toOverworld.x === 80 && toOverworld.z === 160, JSON.stringify(toOverworld));

// 7. Test auto-building destination portal gate
grid.clear();
const spawn = buildObsidianPortalGate(setBlock, 50, 40, 80, "x");
check("Destination gate created with safe spawn", spawn.entranceX === 50.5 && spawn.entranceY === 41.1);

// Verify landing platform and portal blocks
let destPortalCount = 0;
for (let x = 50; x <= 51; x++) {
  for (let y = 41; y <= 43; y++) {
    if (getBlock(x, y, 80) === NETHER_PORTAL_ID) destPortalCount++;
  }
}
check("Destination gate has 6 portal blocks", destPortalCount === 6);

let landingBlocks = 0;
for (let dx = -1; dx <= 2; dx++) {
  for (let dz = -1; dz <= 1; dz++) {
    if (getBlock(50 + dx, 39, 80 + dz) === OBSIDIAN_ID) landingBlocks++;
  }
}
check("Destination gate has 4x3 safe landing platform", landingBlocks === 12, `platform=${landingBlocks}/12`);

process.exit(fails > 0 ? 1 : 0);
