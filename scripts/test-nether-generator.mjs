import { createNetherGenerator, BEDROCK_ID, LAVA_ID, NETHERRACK_ID, GLOWSTONE_ID } from "../src/game/terrain/netherGenerator.ts";

console.log("Testing Nether Generator (Phase 1)...");

const gen = createNetherGenerator("hollowpine_nether_test");

let fails = 0;
const check = (label, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} · ${label} ${detail}`);
  if (!cond) fails++;
};

// 1. Performance benchmark: generate 25 chunks
const t0 = performance.now();
const chunks = [];
for (let cx = -2; cx <= 2; cx++) {
  for (let cz = -2; cz <= 2; cz++) {
    chunks.push(gen.generateChunk(cx, cz));
  }
}
const elapsed = performance.now() - t0;
const avgMs = elapsed / chunks.length;
console.log(`Generated ${chunks.length} chunks in ${elapsed.toFixed(1)}ms (avg ${avgMs.toFixed(2)}ms/chunk)`);
check("Fast generation (<10ms per chunk)", avgMs < 10, `${avgMs.toFixed(2)}ms`);

// 2. Bedrock boundary checks
let floorBedrockOk = true;
let ceilingBedrockOk = true;
for (const c of chunks) {
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      if (c.data[0 * 256 + lz * 16 + lx] !== BEDROCK_ID) floorBedrockOk = false;
      if (c.data[127 * 256 + lz * 16 + lx] !== BEDROCK_ID) ceilingBedrockOk = false;
    }
  }
}
check("Bedrock floor (Y=0) is 100% solid", floorBedrockOk);
check("Bedrock ceiling (Y=127) is 100% solid", ceilingBedrockOk);

// 3. Block distribution analysis
const counts = new Map();
for (const c of chunks) {
  for (let i = 0; i < c.data.length; i++) {
    const id = c.data[i];
    counts.set(id, (counts.get(id) || 0) + 1);
  }
}

console.log("\nNether block distribution (25 chunks):");
for (const [id, count] of counts.entries()) {
  if (count > 20) {
    console.log(`  ID ${id}: ${count.toLocaleString()} voxels`);
  }
}

check("Netherrack present", (counts.get(NETHERRACK_ID) || 0) > 10000);
check("Lava ocean present", (counts.get(LAVA_ID) || 0) > 5000);
check("Air cavities present", (counts.get(0) || 0) > 20000);
check("Glowstone stalactites present", (counts.get(GLOWSTONE_ID) || 0) > 20);

// 4. Biome survey across wide coordinates
const biomesFound = new Set();
for (let x = -500; x <= 500; x += 50) {
  for (let z = -500; z <= 500; z += 50) {
    biomesFound.add(gen.getBiomeAt(x, z));
  }
}
console.log("\nBiomes found across world grid:", Array.from(biomesFound));
check("All 5 Nether biomes present", biomesFound.size === 5, `count=${biomesFound.size}`);

// 5. Safe spawn coordinate check
const spawn = gen.safeSpawnCoord(0, 0);
console.log(`\nSafe spawn at (0, 0) ->`, spawn);
check("Spawn Y is above lava ocean (> 31)", spawn.y > 31);
check("Spawn Y is below ceiling (< 120)", spawn.y < 120);

process.exit(fails > 0 ? 1 : 0);
