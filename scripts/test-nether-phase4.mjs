import assert from "node:assert";

console.log("=== Running Nether Phase 4 Verification Suite ===");

async function run() {
  const fortressModule = await import("../src/game/terrain/netherFortress.ts");
  const netherGenModule = await import("../src/game/terrain/netherGenerator.ts");

  // 1. Test standalone Nether Fortress Generation
  console.log("\n--- Testing Standalone Nether Fortress Generation ---");
  const fx = 100, fy = 58, fz = 100;
  const fortress = fortressModule.generateNetherFortress(12345, fx, fy, fz);

  assert(fortress.voxels.length > 500, `Fortress should generate hundreds of voxels, got ${fortress.voxels.length}`);
  console.log(`Fortress generated ${fortress.voxels.length} structure voxels.`);

  // Check for Nether Bricks (ID 58)
  const hasNetherBricks = fortress.voxels.some(v => v.id === 58);
  assert(hasNetherBricks, "Fortress must contain Nether Bricks (ID 58)");

  // Check for Soul Sand (ID 57) and Nether Wart (ID 500)
  const hasSoulSand = fortress.voxels.some(v => v.id === 57);
  const hasNetherWart = fortress.voxels.some(v => v.id === 500);
  assert(hasSoulSand, "Fortress Nether Wart room must contain Soul Sand (ID 57)");
  assert(hasNetherWart, "Fortress Nether Wart room must contain Nether Wart (ID 500)");

  // Check for Blaze Spawner (ID 633)
  const hasSpawner = fortress.voxels.some(v => v.id === 633);
  assert(hasSpawner, "Fortress must contain a Monster Spawner (ID 633) on the balcony");

  // Check for Fortress Chests & Loot
  assert(fortress.chests.size > 0, "Fortress must contain at least 1 treasure chest");
  const firstChest = Array.from(fortress.chests.values())[0];
  assert(firstChest.some(item => item && item.id === 32), "Chest should contain Diamonds (ID 32)");
  assert(firstChest.some(item => item && item.id === 33), "Chest should contain Gold (ID 33)");
  console.log("PASS · Nether Fortress contains Nether Bricks, Nether Wart garden, Blaze Spawner, and loot chest with diamonds!");

  // 2. Test Ruined Portal Generation
  console.log("\n--- Testing Ruined Portal Generation ---");
  const portal = fortressModule.generateRuinedPortal(54321, 200, 45, 200);
  assert(portal.voxels.length > 30, "Ruined portal should have voxels");
  const hasCryingObsidian = portal.voxels.some(v => v.id === 93);
  const hasGoldBlock = portal.voxels.some(v => v.id === 33);
  assert(hasCryingObsidian, "Ruined portal must contain Crying Obsidian (ID 93)");
  assert(hasGoldBlock, "Ruined portal must contain a hidden Gold Block (ID 33)");
  assert(portal.chests.size > 0, "Ruined portal must have a loot chest");
  console.log("PASS · Ruined Portal generated with Crying Obsidian, Gold Block, and loot chest!");

  // 3. Test Integrated Chunk Generation with Structures
  console.log("\n--- Testing Chunk Generator Structure Integration ---");
  const gen = netherGenModule.createNetherGenerator(99999);
  
  let fortressChunks = [];
  const recordedChests = new Map();

  for (let cx = 0; cx < 16; cx++) {
    for (let cz = 0; cz < 16; cz++) {
      const c = gen.generateChunk(cx, cz, undefined, (k, items) => {
        recordedChests.set(k, items);
      });
      for (let i = 0; i < c.data.length; i++) {
        if (c.data[i] === 58) {
          fortressChunks.push({ cx, cz });
          break;
        }
      }
    }
  }

  assert(fortressChunks.length > 0, "Should find chunks with Nether Fortress voxels in 16x16 region");
  console.log(`PASS · Found Nether Fortress spanning ${fortressChunks.length} chunks across region`);
  console.log(`PASS · Captured ${recordedChests.size} structure chests with items:`, Array.from(recordedChests.keys()));
  assert(recordedChests.size > 0, "Should generate structure chests within region");

  // 4. Benchmark Chunk Generation Performance
  console.log("\n--- Benchmarking Generation Speed with Structure Checks ---");
  const N = 20;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    gen.generateChunk(i, i);
  }
  const avgMs = (performance.now() - t0) / N;
  console.log(`PASS · Average generation speed: ${avgMs.toFixed(2)} ms/chunk (Target: < 5 ms)`);
  assert(avgMs < 5.0, "Generation must remain fast with structure checks");

  console.log("\n>>> ALL NETHER PHASE 4 ASSERTIONS PASSED <<<\n");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
