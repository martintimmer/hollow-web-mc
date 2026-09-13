import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9485;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  `--remote-debugging-port=${PORT}`,
  "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

let fails = 0;
const check = (label, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} · ${label} ${detail}`);
  if (!cond) fails++;
};

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime, Emulation } = client;
  await Page.enable();
  await Runtime.enable();
  await Emulation.setDeviceMetricsOverride({
    width: 1400,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  const evalExpr = async (expr) => {
    const res = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || "Eval error");
    return res.result?.value;
  };

  console.log("Navigating to http://127.0.0.1:5400/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/?sim=1" });

  for (let i = 0; i < 25; i++) {
    await sleep(1000);
    const ready = await evalExpr(`(() => {
      const overlay = document.querySelector(".mc-window");
      const loading = overlay && overlay.innerText.toLowerCase().includes("generating");
      return !loading;
    })()`);
    if (ready) {
      console.log(`World generated after ${i + 1}s!`);
      break;
    }
  }

  await sleep(1000);

  // 1. Verify initial dimension is overworld
  const dim0 = await evalExpr(`(() => window.__getDimension())()`);
  check("Initial dimension is overworld", dim0 === "overworld", `dim=${dim0}`);

  // 2. Build Obsidian Portal Frame at (10, 64, 20)
  console.log("Building Obsidian Portal Frame...");
  await evalExpr(`(() => {
    const s = window.__sim?.s;
    if (!s) return;
    const setBlock = (x, y, z, id) => {
      s.edits.set(x + "," + y + "," + z, id);
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
      const c = s.chunks.get(cx + "," + cz);
      if (c) c.data[y * 256 + (z & 15) * 16 + (x & 15)] = id;
    };
    // Bottom
    for (let x = 10; x <= 13; x++) setBlock(x, 64, 20, 15);
    // Top
    for (let x = 10; x <= 13; x++) setBlock(x, 68, 20, 15);
    // Pillars
    for (let y = 65; y <= 67; y++) {
      setBlock(10, y, 20, 15);
      setBlock(13, y, 20, 15);
    }
    // Fill 2x3 portal
    for (let x = 11; x <= 12; x++) {
      for (let y = 65; y <= 67; y++) {
        setBlock(x, y, 20, 98);
      }
    }
    s.rescan?.(0, 1);
  })()`);
  await sleep(600);

  const shotIgnited = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/nether-gate-ignited.jpg", Buffer.from(shotIgnited.data, "base64"));
  console.log("Saved nether-gate-ignited.jpg");

  // 3. Teleport to Nether
  console.log("Crossing through the gate into the Nether...");
  await evalExpr(`(() => window.__teleportToDimension("nether"))()`);
  await sleep(3500);

  const dim1 = await evalExpr(`(() => window.__getDimension())()`);
  check("Dimension transitioned to nether", dim1 === "nether", `dim=${dim1}`);

  const netherPos = await evalExpr(`(() => {
    const s = window.__sim?.s;
    return { x: s?.player.x, y: s?.player.y, z: s?.player.z, chunks: s?.chunks.size };
  })()`);
  // Step player out of the portal onto the landing platform and look back at the gate
  await evalExpr(`(() => {
    const s = window.__sim?.s;
    if (s) {
      s.player.z += 2.0;
      s.player.yaw = 0;
      s.player.pitch = -0.1;
    }
  })()`);
  await sleep(1000);

  const surroundings = await evalExpr(`(() => {
    const s = window.__sim?.s;
    const px = Math.floor(s.player.x), py = Math.floor(s.player.y), pz = Math.floor(s.player.z);
    const getB = s?.getBlock || ((x, y, z) => {
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
      const c = s.chunks.get(cx + "," + cz);
      return c ? c.data[y * 256 + (z & 15) * 16 + (x & 15)] : 0;
    });
    return {
      underFeet: getB(px, py - 1, pz),
      atFeet: getB(px, py, pz),
      behind: getB(px, py, pz - 2),
      blocksInChunk: s.chunks.get("0,0") ? "chunk(0,0) loaded" : "missing",
      meshedChunks: Array.from(s.chunks.values()).filter(c => !!c.meshes).length
    };
  })()`);
  console.log("Surrounding blocks in Nether:", surroundings);

  const shotNether = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/in-the-nether.jpg", Buffer.from(shotNether.data, "base64"));
  console.log("Saved in-the-nether.jpg");

  // 4. Place a persistent unique block in the Nether (Gold Block ID 33 at Nether coord 5, 60, 5)
  console.log("Placing persistent marker in Nether...");
  await evalExpr(`(() => {
    const s = window.__sim?.s;
    if (s) {
      s.edits.set("5,60,5", 33);
    }
  })()`);

  // 5. Return to Overworld
  console.log("Crossing back through the gate into the Overworld...");
  await evalExpr(`(() => window.__teleportToDimension("overworld"))()`);
  await sleep(1500);

  const dim2 = await evalExpr(`(() => window.__getDimension())()`);
  check("Dimension returned to overworld", dim2 === "overworld", `dim=${dim2}`);

  const shotOverworld = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/back-in-overworld.jpg", Buffer.from(shotOverworld.data, "base64"));
  console.log("Saved back-in-overworld.jpg");

  // 6. Return to Nether and verify persistence
  console.log("Re-entering the Nether to verify block persistence...");
  await evalExpr(`(() => window.__teleportToDimension("nether"))()`);
  await sleep(1500);

  const dim3 = await evalExpr(`(() => window.__getDimension())()`);
  check("Re-entered nether", dim3 === "nether");

  const markerId = await evalExpr(`(() => {
    const s = window.__sim?.s;
    return s?.edits.get("5,60,5");
  })()`);
  check("Nether placed block persisted (ID 33 Gold Block)", markerId === 33, `marker=${markerId}`);

  const shotPersisted = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/nether-persisted.jpg", Buffer.from(shotPersisted.data, "base64"));
  console.log("Saved nether-persisted.jpg");

} catch (err) {
  console.error("Probe error:", err);
  fails++;
} finally {
  chrome.kill("SIGKILL");
}

process.exit(fails > 0 ? 1 : 0);
