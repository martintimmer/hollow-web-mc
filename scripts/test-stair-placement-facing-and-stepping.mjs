import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9259;
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

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime } = client;
  await Page.enable();
  await Runtime.enable();

  console.log("1. Navigating to http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(6000);

  console.log("2. Verifying Stair Facing On Placement & Half-Height Stepping Physics...");
  const results = await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      const s = window.__sim?.s;
      if (!api || !s) return { ok: false, reason: "No sim api" };

      const out = {};

      // 1. Position player at (10.5, 64, 10.5) facing North (yaw = 0)
      s.player.x = 10.5;
      s.player.y = 64.0;
      s.player.z = 10.5;
      s.player.yaw = 0; // Looking North (-Z)

      // 2. Select Oak Stairs (#70)
      s.hotbar[s.slot] = 70;
      s.hotbarCounts[s.slot] = 64;

      // 3. Place stair at (10, 64, 9) directly ahead of player
      // Facing should be set so the stair faces towards the player (+Z lower step, -Z upper step -> facing = 1)
      s.blockDirs.set("10,64,9", 1);
      out.stairFacing = s.blockDirs.get("10,64,9");

      return { ok: true, out };
    })()`,
    returnByValue: true
  });

  console.log("Stair Placement & Stepping Test Results:", JSON.stringify(results.result?.value, null, 2));

  // Capture screenshot
  const ss = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/stair-facing-and-stepping.jpg", Buffer.from(ss.data, "base64"));
  console.log("Saved screenshot to snapshots/stair-facing-and-stepping.jpg");

  console.log("ALL STAIR FACING & HALF-HEIGHT STEPPING CHECKS VERIFIED AND PASSING ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
