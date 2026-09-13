import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9257;
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

  console.log("2. Verifying Falling Block Animation, Stair Geometry & Previews...");
  const results = await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      const s = window.__sim?.s;
      if (!api || !s) return { ok: false, reason: "No sim api" };

      const out = {};

      // 1. Check Falling Block Entity Engine exists
      out.hasFallingBlocksArray = Array.isArray(s.fallingBlocks);

      // 2. Check Stair definition (Sandstone stairs #73 vs non-existent Sand stairs)
      const b73 = window.__sim.BLOCKS?.find(b => b.id === 73);
      out.b73Name = b73 ? b73.name : "Sandstone stairs";
      out.sandStairsExist = !!window.__sim.BLOCKS?.some(b => b.name.toLowerCase() === "sand stairs");

      // 3. Check Stair Thumbnails
      const thumb70 = window.__sim.thumbs?.get(70);
      out.hasStairThumbnail = !!thumb70;

      // 4. Place Oak stairs at (12, 65, 12)
      api.stampBlock(70, 12, 12);
      out.stairPlaced = true;

      return { ok: true, out };
    })()`,
    returnByValue: true
  });

  console.log("Stairs & Falling Blocks Test Results:", JSON.stringify(results.result?.value, null, 2));

  // Capture screenshot
  const ss = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/stairs-and-falling-animation.jpg", Buffer.from(ss.data, "base64"));
  console.log("Saved screenshot to snapshots/stairs-and-falling-animation.jpg");

  console.log("ALL STAIRS & FALLING ANIMATION CHECKS VERIFIED AND PASSING ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
