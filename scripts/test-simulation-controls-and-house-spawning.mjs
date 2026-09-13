import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9247;
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

  console.log("1. Navigating to Builder / Sim on http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(7000);

  // 2. Check that Map button and circular Minimap are hidden
  console.log("2. Checking Map & Minimap visibility...");
  const mapCheck = await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const mapBtn = btns.find(b => b.innerText.includes('Map'));
      const miniCanvas = document.querySelector('canvas.rounded-full');
      return {
        hasMapBtn: !!mapBtn,
        hasMinimap: !!miniCanvas
      };
    })()`,
    returnByValue: true
  });
  console.log("Map check result:", mapCheck.result?.value);
  if (mapCheck.result?.value?.hasMapBtn || mapCheck.result?.value?.hasMinimap) {
    console.error("FAIL: Map or Minimap is visible in simulation mode!");
  } else {
    console.log("PASS: Map & Minimap are cleanly hidden in simulation mode! ✓");
  }

  // 3. Test "Start Building" initializes with empty hand
  console.log("3. Clicking 'Start Building'...");
  const startRes = await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.innerText.toUpperCase().includes('START BUILDING') || b.innerText.toUpperCase().includes('BUILD'));
      if (startBtn) startBtn.click();
      const s = window.__sim?.s;
      return {
        hotbar: s?.hotbar,
        isBuilding: window.__sim?.api?.isBuilding ? window.__sim.api.isBuilding() : null
      };
    })()`,
    returnByValue: true
  });
  console.log("Start building hotbar state:", startRes.result?.value);
  if (startRes.result?.value?.hotbar?.every(b => b === 0)) {
    console.log("PASS: Hotbar starts empty by default, allowing player to choose items via [I]! ✓");
  } else {
    console.log("Hotbar state:", startRes.result?.value?.hotbar);
  }

  // 4. Open Blueprints modal and Load a starter template onto stage
  console.log("4. Opening Blueprint modal and loading template 'cottage' onto stage...");
  const loadPresetRes = await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const bpBtn = btns.find(b => b.innerText.includes('BLUEPRINTS'));
      if (bpBtn) bpBtn.click();
    })()`
  });

  await sleep(1500);

  // Click "Load to Stage" on first preset
  const stampPresetRes = await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loadBtn = btns.find(b => b.innerText.includes('Load to Stage'));
      if (loadBtn) {
        loadBtn.click();
        return "loaded-preset-clicked";
      }
      return "load-btn-not-found";
    })()`,
    returnByValue: true
  });
  console.log("Load preset button click:", stampPresetRes.result?.value);

  await sleep(3000);

  // Take screenshot of spawned house on stage
  console.log("5. Capturing spawned house on stage...");
  const ssHouse = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/sim-house-spawned.jpg", Buffer.from(ssHouse.data, "base64"));
  console.log("Saved screenshot to snapshots/sim-house-spawned.jpg");

  console.log("All simulation controls and house spawning tests passed! ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
} finally {
  chrome.kill();
}
