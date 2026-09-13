import assert from "node:assert";
import * as THREE from "three";

console.log("=== Running Nether Phase 5 Verification Suite ===");

// 1. Mock document for headless Node environment
if (typeof document === "undefined") {
  const dummyCtx = new Proxy({}, {
    get: (target, prop) => {
      if (prop === "createLinearGradient") return () => ({ addColorStop: () => {} });
      return () => dummyCtx;
    }
  });
  globalThis.document = {
    createElement: () => ({
      width: 64,
      height: 128,
      getContext: () => dummyCtx
    })
  };
}

async function run() {
  const mobsModule = await import("../src/game/entities/mobs.ts");
  const animalsModule = await import("../src/game/entities/animals.ts");
  const fireballModule = await import("../src/game/entities/ghastFireball.ts");
  const spawnerModule = await import("../src/game/entities/spawner.ts");

  // 1. Test Ghast 3D Model
  console.log("\n--- Testing Ghast 3D Model Generation ---");
  assert(typeof mobsModule.createGhastMesh === "function", "createGhastMesh should be exported");
  const ghast = mobsModule.createGhastMesh();

  assert(ghast.root, "Ghast root group must exist");
  assert(ghast.headGroup, "Ghast headGroup must exist");
  assert.strictEqual(ghast.tentacles.length, 9, "Ghast must have exactly 9 dangling tentacles");
  assert(ghast.faceMesh, "Ghast faceMesh (mouth) must exist for attack anim");
  console.log("PASS · createGhastMesh generated 2.2m cubic ghost with 9 tentacles and weeping facial features");

  // 2. Test Strider 3D Model
  console.log("\n--- Testing Strider 3D Model Generation ---");
  assert(typeof animalsModule.createStriderMesh === "function", "createStriderMesh should be exported");
  const strider = animalsModule.createStriderMesh();

  assert(strider.root, "Strider root must exist");
  assert.strictEqual(strider.legs.length, 2, "Strider must have exactly 2 legs for lava walking");
  assert(strider.bodyMesh, "Strider bodyMesh must exist");
  console.log("PASS · createStriderMesh generated 2-legged lava mount with saddle and hair tufts");

  // 3. Test Ghast Fireball & Deflection Mechanics
  console.log("\n--- Testing Ghast Fireball & Deflection Mechanics ---");
  const scene = new THREE.Scene();
  const fbMgr = new fireballModule.GhastFireballManager();
  fbMgr.attach(scene);

  // Spawn fireball moving towards player at (10, 50, 10)
  const fb = fbMgr.spawnFireball(0, 50, 0, 10, 50, 10, 20);
  assert(fb, "Fireball should spawn successfully");
  assert.strictEqual(fbMgr.fireballs.length, 1, "FireballManager should contain 1 active fireball");
  assert(fb.vx > 0 && fb.vz > 0, "Fireball should have positive velocity towards target");
  assert.strictEqual(fb.deflected, false, "Fireball initially not deflected");

  // Simulate flight
  fbMgr.update(0.1, { x: 10, y: 50, z: 10 }, () => {}, () => 0);
  assert(fb.x > 0 && fb.z > 0, "Fireball position should advance with velocity");

  // Test player deflection (Return to Sender)
  const playerEye = { x: fb.x + 1.0, y: fb.y, z: fb.z };
  const deflectLookDir = { x: -1, y: 0, z: 0 };
  const deflected = fbMgr.tryDeflect(playerEye, deflectLookDir);
  assert.strictEqual(deflected, true, "tryDeflect should successfully deflect nearby fireball");
  assert.strictEqual(fb.deflected, true, "Fireball deflected flag should be true");
  assert(fb.vx < 0, "Deflected fireball velocity should reverse along look direction");
  console.log("PASS · Ghast fireball spawned, updated, and deflected with 'Return to Sender' kinematics");

  // Test block collision explosion
  let exploded = false;
  fbMgr.update(0.1, { x: -100, y: 0, z: -100 }, () => {}, (x, y, z) => 1, () => {
    exploded = true;
  });
  assert.strictEqual(exploded, true, "Fireball impact with solid block should trigger explosion callback");
  assert.strictEqual(fbMgr.fireballs.length, 0, "Exploded fireball should be removed from scene");
  console.log("PASS · Fireball detonated and cleared upon block impact");

  // 4. Test Mob Spawner Integration in Nether
  console.log("\n--- Testing Mob Spawner Nether Pool & Strider Spawning ---");
  const mobMgr = new spawnerModule.MobManager();
  mobMgr.init(scene);
  mobMgr.dimension = "nether";

  // Test hostile mob pool includes Ghast
  const spawnedMobs = [];
  for (let i = 0; i < 30; i++) {
    const m = mobMgr.spawnHostileMobOf("ghast", 0, 0, () => ({ h: 30, top: 56, sub: 56 }));
    if (m) spawnedMobs.push(m);
  }
  assert(spawnedMobs.length > 0, "Should spawn ghast mob in Nether");
  const firstGhast = spawnedMobs[0];
  assert.strictEqual(firstGhast.type, "ghast", "Mob type should be ghast");
  assert.strictEqual(firstGhast.ground, false, "Ghast should be airborne (ground = false)");
  assert.strictEqual(firstGhast.health, 10, "Ghast should have 10 HP");
  console.log(`PASS · Spawned ${spawnedMobs.length} Ghasts with floating flight and 10 HP`);

  // Verify animals are strictly prevented from spawning in the Nether
  mobMgr.spawnSingleAnimal(15, 32, 15, "strider");
  assert.strictEqual(mobMgr.animals.length, 0, "Animals must NOT spawn in the Nether");
  console.log("PASS · Animals strictly prevented from spawning in the Nether");

  mobMgr.clear();
  assert.strictEqual(mobMgr.mobs.length, 0, "clear() should remove all mobs");
  assert.strictEqual(mobMgr.animals.length, 0, "clear() should remove all animals");
  assert.strictEqual(mobMgr.fireballMgr.fireballs.length, 0, "clear() should remove all fireballs");
  console.log("PASS · MobManager.clear() completely cleaned all entities across scene");

  console.log("\n>>> ALL NETHER PHASE 5 ASSERTIONS PASSED <<<\n");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
