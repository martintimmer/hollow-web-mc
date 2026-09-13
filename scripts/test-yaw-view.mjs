import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9335;
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
  const cjGarage = JSON.parse(fs.readFileSync("public/catalog/blueprints/bp_cj_garage_grove_st.json", "utf8"));
  const sweetsHouse = JSON.parse(fs.readFileSync("public/catalog/blueprints/bp_sweets_house_grove_st.json", "utf8"));
  const palmTree = JSON.parse(fs.readFileSync("public/catalog/blueprints/bp_fan_palm_grove_st.json", "utf8"));
  const utilityPole = JSON.parse(fs.readFileSync("public/catalog/blueprints/bp_utility_pole_grove_st.json", "utf8"));

  await Runtime.evaluate({
    expression: `
      (() => {
        const api = window.__sim?.api;
        const dbg = window.__worldDbg;
        const s = dbg?.getS ? dbg.getS() : null;

        if (api && api.stampRun && s) {
          const cjH = ${JSON.stringify(cjHouse)};
          const cjG = ${JSON.stringify(cjGarage)};
          const swH = ${JSON.stringify(sweetsHouse)};
          const palm = ${JSON.stringify(palmTree)};
          const pole = ${JSON.stringify(utilityPole)};

          const groundY = 64;

          api.stampRun("grove_street_pack", (w) => {
            // 1. Stamp CJ's House (center: x = 8, z = 8)
            for (const b of cjH.blocks) {
              w(8 + (b.dx - 6), groundY + b.dy, 8 + (b.dz - 5), b.id);
            }

            // 2. Attached Garage (x = 0, z = 9)
            for (const b of cjG.blocks) {
              w(0 + (b.dx - 3), groundY + b.dy, 9 + b.dz, b.id);
            }

            // 3. Sweet's House (x = -10, z = 9)
            for (const b of swH.blocks) {
              w(-10 + (b.dx - 4), groundY + b.dy, 9 + b.dz, b.id);
            }

            // 4. Palm Trees
            for (const b of palm.blocks) {
              w(18 + b.dx, groundY + b.dy, 4 + b.dz, b.id);
              w(-14 + b.dx, groundY + b.dy, 4 + b.dz, b.id);
              w(0 + b.dx, groundY + b.dy, 22 + b.dz, b.id);
            }

            // 5. Utility Telephone Poles
            for (const b of pole.blocks) {
              w(17 + b.dx, groundY + b.dy, 12 + b.dz, b.id);
              w(-14 + b.dx, groundY + b.dy, 12 + b.dz, b.id);
            }
          });

          // Position player at (8, 67, -8) looking toward +Z (yaw = Math.PI)
          s.player.x = 8.0;
          s.player.y = groundY + 4.5;
          s.player.z = -8.0;
          s.player.yaw = Math.PI;
          s.player.pitch = -0.15;
        }
      })()
    `
  });

  await sleep(3500);

  const snap1 = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/cj-house-grove-st-yaw-fixed.png", Buffer.from(snap1.data, "base64"));
  console.log("Saved snapshots/cj-house-grove-st-yaw-fixed.png");

  // Wide elevation shot
  await Runtime.evaluate({
    expression: `
      (() => {
        const dbg = window.__worldDbg;
        const s = dbg?.getS ? dbg.getS() : null;
        if (s) {
          s.player.x = -8.0;
          s.player.y = 64 + 10.0;
          s.player.z = -12.0;
          s.player.yaw = Math.PI - 0.55;
          s.player.pitch = -0.28;
        }
      })()
    `
  });

  await sleep(2500);

  const snap2 = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/cj-house-grove-st-wide-elevation.png", Buffer.from(snap2.data, "base64"));
  console.log("Saved snapshots/cj-house-grove-st-wide-elevation.png");

  await client.close();
} catch (err) {
  console.error("Capture failed:", err);
} finally {
  chrome.kill();
  process.exit(0);
}
