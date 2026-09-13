import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9340;
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
            // 1. Stamp CJ's House (center: x = 6, z = 10)
            for (const b of cjH.blocks) {
              w(6 + (b.dx - 6), groundY + b.dy, 10 + (b.dz - 5), b.id);
            }

            // 2. Attached Garage (x = -4, z = 11)
            for (const b of cjG.blocks) {
              w(-4 + (b.dx - 3), groundY + b.dy, 11 + b.dz, b.id);
            }

            // 3. Sweet's House (x = -15, z = 12)
            for (const b of swH.blocks) {
              w(-15 + (b.dx - 4), groundY + b.dy, 12 + b.dz, b.id);
            }

            // 4. Palm Trees
            for (const b of palm.blocks) {
              w(16 + b.dx, groundY + b.dy, 6 + b.dz, b.id);
              w(-20 + b.dx, groundY + b.dy, 6 + b.dz, b.id);
              w(-1 + b.dx, groundY + b.dy, 24 + b.dz, b.id);
            }

            // 5. Utility Telephone Poles
            for (const b of pole.blocks) {
              w(16 + b.dx, groundY + b.dy, 16 + b.dz, b.id);
              w(-20 + b.dx, groundY + b.dy, 16 + b.dz, b.id);
            }

            // 6. Cul-de-Sac Asphalt Road in front (z = -6..4)
            for (let rx = -24; rx <= 24; rx++) {
              for (let rz = -6; rz <= 4; rz++) {
                const isPatch = ((rx * 11 + rz * 7) % 5 === 0);
                w(rx, groundY, rz, isPatch ? 3 : 73);
              }
            }
          });

          // 3/4 Perspective Camera matching cj-house1.jpeg reference!
          s.player.x = 18.0;
          s.player.y = groundY + 4.8;
          s.player.z = -5.0;
          s.player.yaw = Math.PI - 0.72;
          s.player.pitch = -0.14;
        }
      })()
    `
  });

  await sleep(3500);

  const snap = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/grove-street-34-matched.png", Buffer.from(snap.data, "base64"));
  console.log("Saved snapshots/grove-street-34-matched.png");

  await client.close();
} catch (err) {
  console.error("Capture failed:", err);
} finally {
  chrome.kill();
  process.exit(0);
}
