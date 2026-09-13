import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9305;
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

  // Click on "Sideload" Tab in SimDeck
  await Runtime.evaluate({
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const sideloadTab = btns.find((b) => b.textContent && b.textContent.trim().toUpperCase() === "SIDELOAD");
        if (sideloadTab) sideloadTab.click();
      })()
    `
  });
  await sleep(1000);

  // Simulate loading sample blueprint into sideloader state
  await Runtime.evaluate({
    expression: `
      (() => {
        const sample = {
          version: 1,
          id: "bp_nordic_cottage_demo",
          name: "Nordic Timber Cottage",
          category: "house",
          packageName: "Nordic Village",
          dimensions: { width: 7, height: 7, depth: 7 },
          blocks: [
            { dx: 0, dy: 0, dz: 0, id: 19 },
            { dx: 6, dy: 0, dz: 0, id: 19 },
            { dx: 0, dy: 0, dz: 6, id: 19 },
            { dx: 6, dy: 0, dz: 6, id: 19 },
            { dx: 3, dy: 1, dz: 0, id: 503 },
            { dx: 3, dy: 3, dz: 3, id: 535 }
          ]
        };
        // Register in sideloader
        window.__sideloadDemoDoc = sample;
      })()
    `
  });

  const snap = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/sideload-tab-verified.png", Buffer.from(snap.data, "base64"));
  console.log("Saved snapshots/sideload-tab-verified.png");

  await client.close();
} catch (err) {
  console.error("Capture failed:", err);
} finally {
  chrome.kill();
  process.exit(0);
}
