import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9328;
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

  const cjHouse = JSON.parse(fs.readFileSync("public/catalog/blueprints/bp_cj_house_grove_st.json", "utf8"));

  // 1. Open Sideload Tab
  await Runtime.evaluate({
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const tab = btns.find((b) => b.textContent && b.textContent.trim().toUpperCase() === "SIDELOAD");
        if (tab) tab.click();
      })()
    `
  });
  await sleep(500);

  // 2. Load CJ's House into Sideloader and click "Stamp on Pad"
  const stampResult = await Runtime.evaluate({
    expression: `
      (() => {
        const doc = ${JSON.stringify(cjHouse)};
        const api = window.__sim?.api;
        const dbg = window.__worldDbg;
        const s = dbg?.getS ? dbg.getS() : null;

        if (api && api.stampRun && s) {
          // Stamp at pad center (x=8, z=8, y=65)
          const px = 8, py = 65, pz = 8;
          const ax = doc.anchor?.ax || 0;
          const ay = doc.anchor?.ay || 0;
          const az = doc.anchor?.az || 0;

          const res = api.stampRun("sideload_CJ_House", (w) => {
            for (const b of doc.blocks) {
              w(px + (b.dx - ax), py + (b.dy - ay), pz + (b.dz - az), b.id);
            }
          });

          // Position player standing in front of CJ's House
          s.player.x = 8.0;
          s.player.y = 66.5;
          s.player.z = -2.0;
          s.player.yaw = 0.0;
          s.player.pitch = -0.12;

          return { voxels: res?.voxels, player: s.player };
        }
        return "Failed to stamp";
      })()
    `
  });
  console.log("Stamp result:", stampResult.result.value);

  await sleep(2500);

  const snap = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/cj-house-stamped-in-game.png", Buffer.from(snap.data, "base64"));
  console.log("Saved snapshots/cj-house-stamped-in-game.png");

  await client.close();
} catch (err) {
  console.error("Capture failed:", err);
} finally {
  chrome.kill();
  process.exit(0);
}
