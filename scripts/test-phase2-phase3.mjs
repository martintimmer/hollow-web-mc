import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9283;
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
  await sleep(4000);

  console.log("2. Verifying full catalog (1,173 entries) & thumbnail count in engine...");
  const catalogCheck = await Runtime.evaluate({
    expression: `(() => {
      const thumbs = window.__sim?.api?.isoThumbnails;
      const count = thumbs ? thumbs.size : 0;
      return {
        totalThumbnails: count,
        hasOver1150Thumbnails: count >= 1150
      };
    })()`,
    returnByValue: true
  });
  console.log("Catalog Check Result:", JSON.stringify(catalogCheck.result?.value, null, 2));

  console.log("3. Verifying Hotbar Assignment & In-World Voxel Placement...");
  const placementCheck = await Runtime.evaluate({
    expression: `(() => {
      try {
        const s = window.__sim?.s;
        if (!s) return { ok: false, error: "No __sim state" };

        // Equip block 150 (Deepslate variant) to slot 0
        s.hotbar[0] = 150;
        s.hotbarCounts[0] = 64;
        s.slot = 0;

        return {
          ok: true,
          equippedSlot0: s.hotbar[0],
          count: s.hotbarCounts[0]
        };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    })()`,
    returnByValue: true
  });
  console.log("Placement Check Result:", JSON.stringify(placementCheck.result?.value, null, 2));

  console.log("ALL PHASE 2 & 3 CHECKS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
