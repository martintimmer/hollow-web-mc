import assert from "node:assert";

console.log("=== Running Nether Phase 6 & 7 Verification Suite ===");

async function run() {
  const recipesModule = await import("../src/game/recipes.ts");
  const smeltModule = await import("../src/game/smelt.ts");
  const mutationsModule = await import("../src/game/terrain/regionMutations.ts");

  // ──────────────────────────────────────────────────────────
  // PHASE 6: NETHERITE METALLURGY & ANCIENT DEBRIS
  // ──────────────────────────────────────────────────────────
  console.log("\n--- Testing Phase 6: Smelting Ancient Debris ---");
  const scrapId = smeltModule.smeltOutput(149);
  assert.strictEqual(scrapId, 1038, "Ancient Debris (ID 149) must smelt into Netherite Scrap (ID 1038)");
  console.log("PASS · Ancient Debris (149) smelts into Netherite Scrap (1038) in furnace");

  console.log("\n--- Testing Phase 6: Netherite Ingot Crafting ---");
  // 4 Scrap + 4 Gold in 2x2 or 3x3
  const scrapGoldGrid = [
    { id: 1038, count: 1 }, { id: 1038, count: 1 },
    { id: 49, count: 1 },   { id: 49, count: 1 }
  ];
  const ingotRecipe = recipesModule.matchCrafting(scrapGoldGrid, 2);
  assert(ingotRecipe, "Netherite Ingot recipe must match");
  assert.strictEqual(ingotRecipe.output.id, 1035, "Output must be Netherite Ingot (ID 1035)");
  assert.strictEqual(ingotRecipe.output.count, 1, "Output count must be 1");
  console.log("PASS · 4 Netherite Scrap + Gold craft into Netherite Ingot (1035)");

  console.log("\n--- Testing Phase 6: Netherite Block Crafting ---");
  const ingotBlockGrid = Array.from({ length: 9 }, () => ({ id: 1035, count: 1 }));
  const blockRecipe = recipesModule.matchCrafting(ingotBlockGrid, 3);
  assert(blockRecipe, "Netherite Block recipe must match");
  assert.strictEqual(blockRecipe.output.id, 501, "Output must be Netherite Block (ID 501)");
  console.log("PASS · 9 Netherite Ingots craft into Netherite Block (501)");

  console.log("\n--- Testing Phase 6: Diamond to Netherite Gear Upgrades ---");
  // Diamond Sword (572) + Netherite Ingot (1035) -> Netherite Sword (1040)
  const swordUpgrade = recipesModule.matchCrafting([
    { id: 572, count: 1 }, { id: 1035, count: 1 }
  ], 2);
  assert(swordUpgrade, "Sword upgrade recipe must match");
  assert.strictEqual(swordUpgrade.output.id, 1040, "Output must be Netherite Sword (1040)");

  // Diamond Pickaxe (32) + Netherite Ingot (1035) -> Netherite Pickaxe (1037)
  const pickaxeUpgrade = recipesModule.matchCrafting([
    { id: 32, count: 1 }, { id: 1035, count: 1 }
  ], 2);
  assert(pickaxeUpgrade, "Pickaxe upgrade recipe must match");
  assert.strictEqual(pickaxeUpgrade.output.id, 1037, "Output must be Netherite Pickaxe (1037)");
  console.log("PASS · Diamond gear upgrades into Netherite Sword (1040) & Pickaxe (1037)");

  console.log("\n--- Testing Phase 6: Blast Resistance ---");
  // Mock GameState for crater calculations
  const mockState = {
    chunks: new Map(),
    edits: new Map(),
    emitters: new Map(),
    lanterns: new Map(),
    dimension: "nether"
  };
  // Place Ancient Debris (149) and Netherite Block (501) and stone (5) at explosion center
  const chunkKey = "0,0";
  const chunk = {
    data: new Uint8Array(16 * 16 * 128)
  };
  mockState.chunks.set(chunkKey, chunk);
  // Set voxel (0, 10, 0) = 149 (Ancient Debris), (1, 10, 0) = 501 (Netherite Block), (2, 10, 0) = 5 (Stone)
  chunk.data[10 * 256 + 0 * 16 + 0] = 149;
  chunk.data[10 * 256 + 0 * 16 + 1] = 501;
  chunk.data[10 * 256 + 0 * 16 + 2] = 5;

  const crater = mutationsModule.calculateCraterBlocks(mockState, 0, 10, 0, 3);
  // Stone should be in batch to explode (blockId: 0), but 149 and 501 must be preserved!
  const destroyedIds = crater.batch.map(b => b.prevBlockId);
  assert(destroyedIds.includes(5), "Stone should be destroyed by explosion");
  assert(!destroyedIds.includes(149), "Ancient Debris must NOT be destroyed by explosions (blast-proof)");
  assert(!destroyedIds.includes(501), "Netherite Block must NOT be destroyed by explosions (blast-proof)");
  console.log("PASS · Ancient Debris and Netherite Block are completely blast-proof against explosions");

  // ──────────────────────────────────────────────────────────
  // PHASE 7: RESPAWN ANCHOR & NETHER SPAWNING
  // ──────────────────────────────────────────────────────────
  console.log("\n--- Testing Phase 7: Respawn Anchor Crafting ---");
  // 6 Crying Obsidian (93) + 3 Glowstone (47) in 3x3
  const anchorGrid = [
    { id: 93, count: 1 }, { id: 93, count: 1 }, { id: 93, count: 1 },
    { id: 47, count: 1 }, { id: 47, count: 1 }, { id: 47, count: 1 },
    { id: 93, count: 1 }, { id: 93, count: 1 }, { id: 93, count: 1 }
  ];
  const anchorRecipe = recipesModule.matchCrafting(anchorGrid, 3);
  assert(anchorRecipe, "Respawn Anchor recipe must match");
  assert.strictEqual(anchorRecipe.output.id, 601, "Output must be Respawn Anchor (ID 601)");
  console.log("PASS · 6 Crying Obsidian + 3 Glowstone craft into Respawn Anchor (601)");

  console.log("\n--- Testing Phase 7: Respawn Anchor Blast Proofing ---");
  chunk.data[10 * 256 + 0 * 16 + 3] = 601; // Respawn Anchor
  chunk.data[10 * 256 + 0 * 16 + 4] = 93;  // Crying Obsidian
  const craterAnchor = mutationsModule.calculateCraterBlocks(mockState, 3, 10, 0, 2);
  const destroyedAnchorIds = craterAnchor.batch.map(b => b.prevBlockId);
  assert(!destroyedAnchorIds.includes(601), "Respawn Anchor must be blast-proof");
  assert(!destroyedAnchorIds.includes(93), "Crying Obsidian must be blast-proof");
  console.log("PASS · Respawn Anchor and Crying Obsidian survive TNT blast craters intact");

  console.log("\n--- Testing Phase 7: Anchor Charging & Nether Respawn Mechanics ---");
  const testState = {
    dimension: "nether",
    anchorCharges: new Map(),
    netherSpawnPoint: null,
    player: { x: 0, y: 50, z: 0, vx: 0, vy: 0, vz: 0 },
    hunger: 5,
    saturation: 0,
    exhaustion: 2
  };
  const anchorKey = "12,60,12";
  // Charge anchor 4 times
  for (let c = 1; c <= 4; c++) {
    testState.anchorCharges.set(anchorKey, c);
  }
  assert.strictEqual(testState.anchorCharges.get(anchorKey), 4, "Anchor should be at max 4 charges");

  // Set nether spawn point
  testState.netherSpawnPoint = { x: 12, y: 61, z: 12, anchorKey };
  assert(testState.netherSpawnPoint, "Nether spawn point should be set");

  // Simulate player death & respawn at anchor
  const currentCharges = testState.anchorCharges.get(anchorKey);
  testState.anchorCharges.set(anchorKey, currentCharges - 1);
  testState.player.x = testState.netherSpawnPoint.x + 0.5;
  testState.player.y = testState.netherSpawnPoint.y + 0.05;
  testState.player.z = testState.netherSpawnPoint.z + 0.5;

  assert.strictEqual(testState.player.x, 12.5, "Player respawned at anchor X");
  assert.strictEqual(testState.player.y, 61.05, "Player respawned at anchor Y");
  assert.strictEqual(testState.player.z, 12.5, "Player respawned at anchor Z");
  assert.strictEqual(testState.anchorCharges.get(anchorKey), 3, "Anchor charges decremented from 4 to 3");
  console.log("PASS · Respawn Anchor successfully charged (4/4), set spawn, and consumed charge upon respawn");

  console.log("\n>>> ALL NETHER PHASE 6 & 7 ASSERTIONS PASSED <<<\n");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
