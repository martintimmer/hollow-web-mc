import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9301;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--window-size=1920,1080",
  `--remote-debugging-port=${PORT}`,
  "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime, Emulation } = client;
  await Page.enable();
  await Runtime.enable();
  await Emulation.setDeviceMetricsOverride({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  fs.mkdirSync("snapshots", { recursive: true });

  console.log("Navigating to In-Game Sim...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  // 1. Open BLOCKS tab
  await Runtime.evaluate({
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const blocksTab = btns.find((b) => b.textContent && b.textContent.trim().toUpperCase() === "BLOCKS");
        if (blocksTab) blocksTab.click();
      })()
    `
  });
  await sleep(500);

  // 2. Type "slab"
  await Runtime.evaluate({
    expression: `
      (() => {
        const input = document.querySelector('input[placeholder*="catalog"]');
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(input, "slab");
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      })()
    `
  });
  await sleep(1000);

  // 3. Stamp 5 different stone slabs in a 5-step staircase / platform on the pad
  await Runtime.evaluate({
    expression: `
      (() => {
        const api = window.__sim?.api;
        if (api && api.stampRun) {
          api.stampRun("slab_stairs", (w) => {
            // Row 1: Stone Slab (1185)
            w(6, 1, 8, 1185); w(7, 1, 8, 1185); w(8, 1, 8, 1185);
            // Row 2: Stone Brick Slab (1188)
            w(6, 1, 9, 1188); w(7, 1, 9, 1188); w(8, 1, 9, 1188);
            // Row 3: Cobblestone Slab (1186)
            w(6, 1, 10, 1186); w(7, 1, 10, 1186); w(8, 1, 10, 1186);
            // Row 4: Smooth Stone Slab (626)
            w(6, 1, 11, 626); w(7, 1, 11, 626); w(8, 1, 11, 626);
            // Row 5: Quartz Slab (1195)
            w(6, 1, 12, 1195); w(7, 1, 12, 1195); w(8, 1, 12, 1195);
            // Row 6: Brick Slab (1193)
            w(6, 1, 13, 1193); w(7, 1, 13, 1193); w(8, 1, 13, 1193);
            // Row 7: Sandstone Slab (1194)
            w(6, 1, 14, 1194); w(7, 1, 14, 1194); w(8, 1, 14, 1194);
            // Row 8: Nether Brick Slab (1196)
            w(6, 1, 15, 1196); w(7, 1, 15, 1196); w(8, 1, 15, 1196);
          });
        }
      })()
    `
  });
  await sleep(1500);

  // Click 3 Views or Orbit
  await Runtime.evaluate({
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const orbitBtn = btns.find((b) => b.textContent && b.textContent.includes("Orbit"));
        if (orbitBtn) orbitBtn.click();
      })()
    `
  });
  await sleep(1000);

  const snap = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/slabs-in-game-showcase.png", Buffer.from(snap.data, "base64"));
  console.log("Saved snapshots/slabs-in-game-showcase.png");

  await client.close();
} catch (err) {
  console.error("Capture failed:", err);
} finally {
  chrome.kill();
  process.exit(0);
}
