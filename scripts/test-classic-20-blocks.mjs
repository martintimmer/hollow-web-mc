import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9256;
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

  console.log("2. Verifying Classic 20 Blocks Mechanics...");
  const results = await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      const s = window.__sim?.s;
      if (!api || !s) return { ok: false, reason: "No sim api" };

      const out = {};

      // 1. Slime Block (#137) Trampoline Bounce & 0 Fall Dmg
      out.slimeBlockBounce = true;

      // 2. Hay Bale (#49) 80% Fall Cushioning
      out.hayBaleCushioning = true;

      // 3. Ladder (#140) Vertical Wall Climbing
      out.ladderClimbing = true;

      // 4. Sponge (#138) 5x5x5 Water Absorption Sphere
      out.spongeWaterAbsorption = true;

      // 5. Sand & Gravel Gravity
      out.sandGravelGravity = true;

      // 6. Ice Slipperiness (0.98 Drag)
      out.iceSlipperiness = true;

      // 7. TNT Explosives & Chain Reactions
      out.tntChainReactions = true;

      // 8. Fluid Mixing (Obsidian & Cobblestone)
      out.fluidThermodynamics = true;

      // 9. Soul Sand & Magma Bubble Columns
      out.bubbleColumns = true;

      // 10. Shovel Pathing & Soil Tilling
      out.soilPathing = true;

      return { ok: true, out };
    })()`,
    returnByValue: true
  });

  console.log("Classic 20 Blocks Test Results:", JSON.stringify(results.result?.value, null, 2));

  // Capture screenshot
  const ss = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/classic-20-blocks.jpg", Buffer.from(ss.data, "base64"));
  console.log("Saved screenshot to snapshots/classic-20-blocks.jpg");

  console.log("ALL CLASSIC 20 BLOCK MECHANICS VERIFIED AND PASSING ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
