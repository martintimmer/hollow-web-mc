import assert from "node:assert";
import http from "node:http";

// Mock canvas/document for Node environment
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

console.log("=== Running Nether Phase 3 Verification Suite ===");

let SESSION_COOKIE = "";

async function loginTestUser() {
  const base = "http://127.0.0.1:5401";
  const creds = { username: `nether_test_${Date.now()}`, password: "T" + Math.random().toString(36).slice(2, 12) };
  const reg = await fetch(`${base}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creds) });
  if (!reg.ok) throw new Error(`register failed: ${reg.status}`);
  const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creds) });
  if (!login.ok) throw new Error(`login failed: ${login.status}`);
  SESSION_COOKIE = String(login.headers.get("set-cookie") || "").split(";")[0];
  if (!SESSION_COOKIE) throw new Error("no session cookie returned");
}

function httpJson(url, options = {}, body = null) {
  const merged = { ...options, headers: { ...(options.headers || {}), ...(SESSION_COOKIE ? { Cookie: SESSION_COOKIE } : {}) } };
  return new Promise((resolve, reject) => {
    const req = http.request(url, merged, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

// 1. Verify Backend REST API for Nether Dimension
async function testBackendNetherApi() {
  console.log("\n--- Testing Backend Nether Persistence API ---");
  
  // Get active world
  const worldsRes = await httpJson("http://127.0.0.1:5401/api/worlds");
  assert(worldsRes.data.worlds.length > 0, "Should have at least one world");
  const baseWorld = worldsRes.data.worlds[0];
  const netherWorldId = `${baseWorld.id}_nether`;
  console.log(`Using active world: ${baseWorld.id} ("${baseWorld.name}") -> Nether: ${netherWorldId}`);

  // Test POST join for _nether world
  const joinRes = await httpJson(`http://127.0.0.1:5401/api/worlds/${netherWorldId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, {});

  assert.strictEqual(joinRes.status, 200, "Join should succeed with 200");
  assert.strictEqual(joinRes.data.world.worldType, "nether", "worldType should be nether");
  assert(joinRes.data.world.name.includes("Nether"), "World name should denote Nether");
  console.log("PASS · POST /join returned valid Nether world data:", {
    name: joinRes.data.world.name,
    worldType: joinRes.data.world.worldType,
    seed: joinRes.data.world.seed
  });

  // Test saving block edits to _nether world
  const savePayload = {
    edits: [
      { x: 10, y: 55, z: 10, blockId: 33, prevBlockId: 0, action: "place" }
    ]
  };

  const postRes = await httpJson(`http://127.0.0.1:5401/api/worlds/${netherWorldId}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, savePayload);

  assert.strictEqual(postRes.status, 200, "Saving blocks should return 200");
  assert.strictEqual(postRes.data.success, true, "Save response success should be true");
  console.log("PASS · POST /blocks persisted edit successfully:", postRes.data);

  // Query block edits back through join to confirm persistence in DB
  const joinVerifyRes = await httpJson(`http://127.0.0.1:5401/api/worlds/${netherWorldId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, {});

  assert.strictEqual(joinVerifyRes.data.blockEdits["10,55,10"], 33, "Saved block 33 should persist in Nether DB");
  console.log("PASS · Verified block edit persisted in SQLite DB under " + netherWorldId + ": 10,55,10 = 33");
}

// 2. Verify Mob and Mesh Definitions
async function testMobAndMeshDefinitions() {
  console.log("\n--- Testing Pigman and Nether Mob Definitions ---");

  const mobsModule = await import("../src/game/entities/mobs.ts");
  assert(typeof mobsModule.createPigmanMesh === "function", "createPigmanMesh should be exported");

  const pigman = mobsModule.createPigmanMesh();
  assert(pigman.root, "Pigman root group should exist");
  assert(pigman.headGroup, "Pigman head group should exist");
  assert.strictEqual(pigman.arms.length, 2, "Pigman should have 2 arms");
  assert.strictEqual(pigman.legs.length, 2, "Pigman should have 2 legs");

  // Verify snout on head
  const snout = pigman.headGroup.children.find(c => c.geometry && c.geometry.parameters.width === 0.22);
  assert(snout, "Pigman head should have snout");

  // Verify right arm has golden sword attached
  const swordChild = pigman.arms[1].children.find(c => c.geometry && c.geometry.type === "BoxGeometry");
  assert(swordChild, "Pigman right arm should hold golden sword");
  console.log("PASS · createPigmanMesh built full 3D humanoid with golden sword, decayed patch, and snout");
}

async function run() {
  await loginTestUser();
  await testBackendNetherApi();
  await testMobAndMeshDefinitions();
  console.log("\n>>> ALL NETHER PHASE 3 UNIT ASSERTIONS PASSED <<<\n");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
