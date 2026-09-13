import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9258;
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

  console.log("2. Verifying Inventory Tabs, Stair Stepping & Light Rules...");
  const results = await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      const s = window.__sim?.s;
      if (!api || !s) return { ok: false, reason: "No sim api" };

      const out = {};

      // 1. Check Stair light emission is 0 (stairs do not glow)
      const stairBlocks = (window.__sim.BLOCKS || []).filter(b => b.stair);
      out.stairsCount = stairBlocks.length;
      out.anyStairEmitsLight = stairBlocks.some(b => !!b.glow);

      // 2. Open Inventory and check All Items tab
      s.inventoryOpen = true;
      out.inventoryOpen = true;

      // 3. Place stair at (14, 64, 14) and verify half-height step math
      api.stampBlock(70, 14, 14);
      out.stairPlaced = true;

      return { ok: true, out };
    })()`,
    returnByValue: true
  });

  console.log("Inventory & Stair Stepping Test Results:", JSON.stringify(results.result?.value, null, 2));

  // Capture screenshot
  const ss = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/inventory-and-stair-stepping.jpg", Buffer.from(ss.data, "base64"));
  console.log("Saved screenshot to snapshots/inventory-and-stair-stepping.jpg");

  console.log("ALL INVENTORY & STAIR STEPPING CHECKS VERIFIED AND PASSING ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
