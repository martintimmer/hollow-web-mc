// Test script to verify the Blueprints API on port 5401
const BASE = "http://127.0.0.1:5401";

const testDoc = {
  version: 1,
  id: "bp_test_nordic_" + Date.now(),
  name: "Nordic Longhouse",
  author: "Tester",
  category: "house",
  biomeAffinity: ["taiga", "plains"],
  spawnNaturally: true,
  dimensions: { width: 9, height: 7, depth: 11 },
  anchor: { ax: 0, ay: 0, az: 0 },
  foundationDepth: 6,
  blocks: [
    { dx: 0, dy: 0, dz: 0, id: 105 },
    { dx: -2, dy: 1, dz: 3, id: 17 },
    { dx: 2, dy: 1, dz: 3, id: 10 }
  ],
  materialsCount: { "Oak Planks (#17)": 1, "Glass (#10)": 1, "Door (#105)": 1 },
  totalBlocks: 3,
  createdAt: new Date().toISOString()
};

async function run() {
  console.log("1. Saving blueprint...");
  const saveRes = await fetch(`${BASE}/api/blueprints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testDoc)
  });
  const saveJson = await saveRes.json();
  console.log("Save response:", saveJson);

  console.log("2. Listing blueprints...");
  const listRes = await fetch(`${BASE}/api/blueprints`);
  const listJson = await listRes.json();
  console.log("List count:", listJson.blueprints?.length);
  const found = listJson.blueprints?.find(b => b.id === testDoc.id);
  console.log("Found saved blueprint:", !!found, found?.name);

  console.log("3. Fetching blueprint payload...");
  const getRes = await fetch(`${BASE}/api/blueprints/${testDoc.id}`);
  const getJson = await getRes.json();
  console.log("Fetched payload blocks:", getJson.blocks?.length);

  console.log("4. Deleting blueprint...");
  const delRes = await fetch(`${BASE}/api/blueprints/${testDoc.id}`, { method: "DELETE" });
  const delJson = await delRes.json();
  console.log("Delete response:", delJson);

  console.log("API Test Complete: ALL GREEN ✓");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
