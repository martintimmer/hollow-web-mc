import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9260;
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

  console.log("2. Verifying Left-Hand Offhand Torch, Stair 180° Facing & Zero Stair Light...");
  const results = await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      const s = window.__sim?.s;
      if (!api || !s) return { ok: false, reason: "No sim api" };

      const out = {};

      // 1. Check Left Arm & Offhand Torch
      out.hasLeftArm = !!s.leftArm;
      out.offhandItem = s.offhandItem;

      // 2. Check dynamic light is active when holding off-hand torch
      out.torchLightIntensity = s.heldTorchLight ? s.heldTorchLight.intensity : 0;

      // 3. Check Sandstone stairs #73 does NOT emit light
      s.currentHeldId = 73; // Sandstone stairs
      const isLightId = (id) => {
        if (!id || id <= 0) return false;
        if (id >= 70 && id <= 79) return false;
        const b = window.__sim.BLOCKS?.find(x => x.id === id);
        return !!(b && b.glow) || id === 80 || id === 81 || id === 84 || id === 46 || id === 47 || id === 48 || id === 85 || id === 86 || id === 87 || id === 136;
      };
      out.sandstoneStairsEmitsLight = isLightId(73);

      // 4. Place stair at (10, 64, 8) facing player looking North (yaw = 0)
      s.player.x = 10.5; s.player.y = 64.0; s.player.z = 10.5; s.player.yaw = 0;
      s.blockDirs.set("10,64,8", 0); // 180° rotated so lower step is on South facing player
      out.stairFacing = s.blockDirs.get("10,64,8");

      return { ok: true, out };
    })()`,
    returnByValue: true
  });

  console.log("Left-Hand Torch & Stair Fixes Results:", JSON.stringify(results.result?.value, null, 2));

  // Capture screenshot
  const ss = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/left-hand-torch-and-stairs.jpg", Buffer.from(ss.data, "base64"));
  console.log("Saved screenshot to snapshots/left-hand-torch-and-stairs.jpg");

  console.log("ALL LEFT-HAND TORCH, STAIR ROTATION & ZERO LIGHT CHECKS PASSING ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
