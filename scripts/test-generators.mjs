#!/usr/bin/env node
/**
 * @file scripts/test-generators.mjs
 * Automated Headless Test Runner & Benchmark for Procedural Architectural Generators.
 */

import { generateHouseFromSpec } from "../catalog/ai/generators/houseGenerator.ts";
import { lintBlueprint } from "../src/sim/assetSideloader.ts";

console.log("\n=== Hollowpine Procedural Generator Benchmark & Lint Suite ===\n");

const testSpecs = [
  {
    version: 1,
    id: "spec_test_cottage_small",
    name: "Small Timber Cottage",
    category: "house",
    style: "medieval_timber",
    biomeAffinity: ["plains", "forest"],
    dimensions: { width: 5, height: 5, depth: 5, stories: 1 },
    footprint: { shape: "rectangle", mainWidth: 5, mainDepth: 5 },
    roof: { style: "gable", pitch: 1.0, overhang: 1 },
    features: { lanterns: true },
    palette: {
      foundation: "cobblestone",
      frame: "oak_log",
      walls: "oak_planks",
      roof: "dark_oak_stairs",
      roofTrim: "stone_brick_slab",
      doors: "oak_door",
      windows: "glass_pane",
      lights: "lantern"
    },
    createdAt: new Date().toISOString()
  },
  {
    version: 1,
    id: "spec_test_manor_2story",
    name: "Two-Story Nordic Manor",
    category: "house",
    style: "nordic_taiga",
    biomeAffinity: ["taiga", "mountains"],
    dimensions: { width: 9, height: 8, depth: 7, stories: 2 },
    footprint: { shape: "rectangle", mainWidth: 9, mainDepth: 7 },
    roof: { style: "gable", pitch: 1.0, overhang: 1 },
    features: { lanterns: true },
    palette: {
      foundation: "stone_bricks",
      frame: "spruce_log",
      walls: "spruce_planks",
      roof: "stone_brick_stairs",
      roofTrim: "smooth_stone_slab",
      doors: "oak_door",
      windows: "glass_pane",
      lights: "lantern"
    },
    createdAt: new Date().toISOString()
  }
];

let totalPassed = 0;

for (const spec of testSpecs) {
  const t0 = performance.now();
  const doc = generateHouseFromSpec(spec);
  const elapsed = performance.now() - t0;

  const report = lintBlueprint(doc);

  console.log(`Testing generator for: "${spec.name}"...`);
  console.log(`  ⏱️ Execution time : ${elapsed.toFixed(2)} ms (threshold: <50 ms)`);
  console.log(`  🧱 Total voxels    : ${doc.totalBlocks}`);
  console.log(`  📐 Dimensions      : ${doc.dimensions.width}w × ${doc.dimensions.height}h × ${doc.dimensions.depth}d`);
  console.log(`  🔍 Linter Status   : ${report.valid ? "✅ PASS" : "❌ FAIL"}`);

  if (report.errors.length > 0) {
    report.errors.forEach(e => console.log(`     ❌ Error: ${e}`));
  }
  if (report.warnings.length > 0) {
    report.warnings.forEach(w => console.log(`     ⚠️  Warning: ${w}`));
  }

  if (report.valid && elapsed < 50 && doc.totalBlocks > 0) {
    console.log(`  🎉 Generator assertion PASSED\n`);
    totalPassed++;
  } else {
    console.error(`  💥 Generator assertion FAILED\n`);
  }
}

if (totalPassed === testSpecs.length) {
  console.log(`All ${totalPassed}/${testSpecs.length} procedural generator tests passed!\n`);
  process.exit(0);
} else {
  console.error(`Failed ${testSpecs.length - totalPassed} generator tests.\n`);
  process.exit(1);
}
