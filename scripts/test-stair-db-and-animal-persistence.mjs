import { getDb } from "../server/db.js";

const BASE_URL = "http://127.0.0.1:5400";

async function runTests() {
  console.log("1. Verifying Database schema has dir column in world_blocks...");
  const db = await getDb();
  const tableInfo = db.exec("PRAGMA table_info(world_blocks)");
  const cols = tableInfo[0].values.map(v => v[1]);
  console.log("world_blocks columns:", cols);
  if (!cols.includes("dir")) {
    throw new Error("Missing 'dir' column in world_blocks table!");
  }
  console.log("PASS: world_blocks has 'dir' column.");

  const worldsRes = await fetch(`${BASE_URL}/api/worlds`);
  const worldsData = await worldsRes.json();
  if (!worldsData.worlds || !worldsData.worlds.length) throw new Error("No worlds found");
  const targetWorldId = worldsData.worlds[0].id;
  console.log(`Using target world: ${targetWorldId} (${worldsData.worlds[0].name})`);

  console.log(`2. Testing /api/worlds/${targetWorldId}/blocks with directional stairs...`);
  const saveRes = await fetch(`${BASE_URL}/api/worlds/${targetWorldId}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      edits: [
        { x: 15, y: 64, z: 15, blockId: 70, dir: 2, action: "place" },
        { x: 16, y: 64, z: 16, blockId: 80, dir: 1, action: "place" }
      ]
    })
  });
  if (!saveRes.ok) throw new Error("Failed to save block edits with dir");
  console.log("PASS: Saved block edits with dir.");

  console.log(`3. Testing /api/worlds/${targetWorldId}/join returns blockDirs with rotations...`);
  const joinRes = await fetch(`${BASE_URL}/api/worlds/${targetWorldId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  if (!joinRes.ok) throw new Error("Failed to join world");
  const joinData = await joinRes.json();
  console.log("Loaded blockEdits:", joinData.blockEdits["15,64,15"], joinData.blockEdits["16,64,16"]);
  console.log("Loaded blockDirs:", joinData.blockDirs?.["15,64,15"], joinData.blockDirs?.["16,64,16"]);

  if (joinData.blockDirs?.["15,64,15"] !== 2 || joinData.blockDirs?.["16,64,16"] !== 1) {
    throw new Error(`Rotation mismatch! Expected 2 and 1, got ${joinData.blockDirs?.["15,64,15"]} and ${joinData.blockDirs?.["16,64,16"]}`);
  }
  console.log("PASS: Block rotations persisted and loaded accurately!");

  console.log("4. Testing Animal Chunk Persistence...");
  const animalsToSave = [
    { id: "test_cow_1", type: "cow", name: "Bessie", sex: "female", x: 120.5, y: 64, z: 150.5, yaw: 1.57 },
    { id: "test_horse_1", type: "horse", name: "Spirit", sex: "male", x: 200.0, y: 65, z: 220.0, yaw: 3.14 }
  ];
  const saveAnimRes = await fetch(`${BASE_URL}/api/worlds/${targetWorldId}/animals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ animals: animalsToSave })
  });
  if (!saveAnimRes.ok) throw new Error("Failed to save animals");
  
  const joinAnimRes = await fetch(`${BASE_URL}/api/worlds/${targetWorldId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  const joinAnimData = await joinAnimRes.json();
  const foundCow = joinAnimData.animals.find(a => a.id === "test_cow_1");
  const foundHorse = joinAnimData.animals.find(a => a.id === "test_horse_1");
  if (!foundCow || !foundHorse || foundCow.x !== 120.5 || foundHorse.x !== 200) {
    throw new Error("Animals not properly persisted in chunk/database!");
  }
  console.log(`PASS: Found saved animals in distant chunks: Cow at (${foundCow.x}, ${foundCow.z}), Horse at (${foundHorse.x}, ${foundHorse.z})`);

  console.log("\nALL STAIR ROTATION & ANIMAL PERSISTENCE GATES PASS ✓");
  process.exit(0);
}

runTests().catch(e => {
  console.error("FAILED:", e);
  process.exit(1);
});
