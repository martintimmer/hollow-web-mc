import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9352;
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

  // Position player first
  await Runtime.evaluate({
    expression: `
      (() => {
        const dbg = window.__worldDbg;
        if (dbg && dbg.player) {
          dbg.player.x = 8;
          dbg.player.y = 74;
          dbg.player.z = -12;
          dbg.player.yaw = Math.PI;
          dbg.player.pitch = -0.35;
        }
      })()
    `
  });
  await sleep(500);

  // 1. Click on Designer Tab in SimDeck
  await Runtime.evaluate({
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find(b => b.textContent && b.textContent.includes("Designer"));
      if (btn) btn.click();
    })()`
  });
  await sleep(800);

  // 2. Click "Run AI Recognition"
  await Runtime.evaluate({
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const runBtn = buttons.find(b => b.textContent && b.textContent.includes("Run AI Recognition"));
      if (runBtn) runBtn.click();
    })()`
  });
  await sleep(1500);

  // 3. Switch to "Recipe" sub-tab
  await Runtime.evaluate({
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const recipeBtn = buttons.find(b => b.textContent && b.textContent.includes("Recipe"));
      if (recipeBtn) recipeBtn.click();
    })()`
  });
  await sleep(600);

  // 4. Click "Stamp on Pad"
  await Runtime.evaluate({
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const stampBtn = buttons.find(b => b.textContent && b.textContent.includes("Stamp on Pad"));
      if (stampBtn) stampBtn.click();
    })()`
  });
  await sleep(1200);

  const shotWorld = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/designer-stamped-exterior.png", Buffer.from(shotWorld.data, "base64"));
  console.log("[test-designer] Saved snapshots/designer-stamped-exterior.png successfully!");

  await client.close();
} finally {
  chrome.kill("SIGTERM");
}
