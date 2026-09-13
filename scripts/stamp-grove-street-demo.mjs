import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9325;
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

  // Open Sideload tab in SimDeck
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

  // Clear pad and stamp Grove Street Pack
  await Runtime.evaluate({
    expression: `
      (() => {
        const api = window.__sim?.api;
        const dbg = window.__worldDbg;
        const s = dbg?.getS ? dbg.getS() : null;

        if (api && api.stampRun && s) {
          api.clearPad?.();

          const cjH = ${JSON.stringify(cjHouse)};
          const cjG = ${JSON.stringify(cjGarage)};
          const swH = ${JSON.stringify(sweetsHouse)};
          const palm = ${JSON.stringify(palmTree)};
          const pole = ${JSON.stringify(utilityPole)};

          const groundY = 64;

          api.stampRun("grove_street_pack", (w) => {
            // 1. Stamp CJ's House (center: x = 10, z = 10)
            const hx = 10, hz = 10;
            for (const b of cjH.blocks) {
              w(hx + (b.dx - 6), groundY + b.dy, hz + (b.dz - 5), b.id);
            }

            // 2. Attached Garage (x = 1, z = 12)
            const gx = 1, gz = 12;
            for (const b of cjG.blocks) {
              w(gx + (b.dx - 3), groundY + b.dy, gz + b.dz, b.id);
            }

            // 3. Sweet's Green House (x = -9, z = 12)
            const sx = -9, sz = 12;
            for (const b of swH.blocks) {
              w(sx + (b.dx - 4), groundY + b.dy, sz + b.dz, b.id);
            }

            // 4. Palm Trees
            for (const b of palm.blocks) {
              w(18 + b.dx, groundY + b.dy, 8 + b.dz, b.id);
              w(-14 + b.dx, groundY + b.dy, 6 + b.dz, b.id);
              w(4 + b.dx, groundY + b.dy, 24 + b.dz, b.id);
            }

            // 5. Utility Telephone Poles
            for (const b of pole.blocks) {
              w(18 + b.dx, groundY + b.dy, 16 + b.dz, b.id);
              w(-14 + b.dx, groundY + b.dy, 16 + b.dz, b.id);
            }
          });

          // Camera setup in front of CJ's House
          s.player.x = 8.0;
          s.player.y = groundY + 5.0;
          s.player.z = -6.0;
          s.player.yaw = 0.0;
          s.player.pitch = -0.15;
        }
      })()
    `
  });

  await sleep(2500);
  const snap1 = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/cj-house-grove-st-front.png", Buffer.from(snap1.data, "base64"));
  console.log("Saved snapshots/cj-house-grove-st-front.png");

  // Orbit view 2: Wide Angle
  await Runtime.evaluate({
    expression: `
      (() => {
        const dbg = window.__worldDbg;
        const s = dbg?.getS ? dbg.getS() : null;
        if (s) {
          s.player.x = -6.0;
          s.player.y = 64 + 8.0;
          s.player.z = -8.0;
          s.player.yaw = -0.45;
          s.player.pitch = -0.22;
        }
      })()
    `
  });

  await sleep(2000);
  const snap2 = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/cj-house-grove-st-wide.png", Buffer.from(snap2.data, "base64"));
  console.log("Saved snapshots/cj-house-grove-st-wide.png");

  await client.close();
} catch (err) {
  console.error("Capture failed:", err);
} finally {
  chrome.kill();
  process.exit(0);
}
