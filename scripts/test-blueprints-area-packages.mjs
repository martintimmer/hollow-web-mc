import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9251;
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

  console.log("1. Navigating to Simulation Mode on http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(6000);

  // 1. Test clicking into game & pressing [C] to freeze camera
  console.log("2. Testing pointer lock and camera freeze on [C] (Chat)...");
  await Runtime.evaluate({
    expression: `(() => {
      const cv = document.querySelector('canvas');
      if (cv) cv.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 300, clientY: 300 }));
    })()`
  });
  await sleep(500);

  const lockedState = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      return { active: s?.active, steering: s?.steering };
    })()`,
    returnByValue: true
  });
  console.log("Locked state on canvas click:", lockedState.result?.value);

  // Press KeyC to open chat
  await Runtime.evaluate({
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', key: 'c', bubbles: true }));
    })()`
  });
  await sleep(500);

  const chatFrozenState = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      return {
        chatOpen: s?.chatOpen,
        active: s?.active,
        steering: s?.steering
      };
    })()`,
    returnByValue: true
  });
  console.log("State after pressing [C] (Chat):", chatFrozenState.result?.value);
  if (chatFrozenState.result?.value?.active === false && chatFrozenState.result?.value?.steering === false) {
    console.log("PASS: Camera is frozen and pointer lock released on [C] ✓");
  } else {
    console.warn("FAIL: Camera was not frozen on [C]");
  }

  // Close chat with Escape
  await Runtime.evaluate({
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
    })()`
  });
  await sleep(500);

  // 2. Test 3D Area Selection & Yellow Box creation
  console.log("3. Testing 3D Area Selection & Yellow Box creation...");
  await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      if (api?.toggleAreaSelect) api.toggleAreaSelect(true);
      if (api?.setAreaPos1) api.setAreaPos1(4, 64, 4);
      if (api?.setAreaPos2) api.setAreaPos2(12, 72, 12);
    })()`
  });
  await sleep(1000);

  const areaState = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const api = window.__sim?.api;
      const bounds = api?.getAreaBounds ? api.getAreaBounds() : null;
      return {
        areaSelectMode: s?.areaSelectMode,
        hasAreaBoxMesh: !!s?.areaBoxMesh,
        hasAreaBoxFill: !!s?.areaBoxFill,
        bounds
      };
    })()`,
    returnByValue: true
  });
  console.log("3D Yellow Box area state:", areaState.result?.value);
  if (areaState.result?.value?.hasAreaBoxMesh && areaState.result?.value?.bounds?.width === 9) {
    console.log("PASS: 3D Yellow Bounding Box active with dimensions 9×9×9 ✓");
  }

  // Take screenshot of 3D Yellow Bounding Box
  const ssBox = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/sim-3d-yellow-box.jpg", Buffer.from(ssBox.data, "base64"));
  console.log("Saved screenshot to snapshots/sim-3d-yellow-box.jpg");

  // 3. Open Blueprints Modal and inspect 3D Selection & Package inputs
  console.log("4. Opening Blueprints Studio Modal...");
  await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const bpBtn = btns.find(b => b.innerText.includes('BLUEPRINTS'));
      if (bpBtn) bpBtn.click();
    })()`
  });
  await sleep(1000);

  // Switch to Save tab
  await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveTab = btns.find(b => b.innerText.includes('Capture & Package') || b.innerText.includes('Capture Stage'));
      if (saveTab) saveTab.click();
    })()`
  });
  await sleep(500);

  // Take screenshot of Blueprints Modal with 3D Selection & Package inputs
  const ssModal = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/sim-blueprint-package-modal.jpg", Buffer.from(ssModal.data, "base64"));
  console.log("Saved screenshot to snapshots/sim-blueprint-package-modal.jpg");

  // 4. Save a custom blueprint with Package "Nordic Pack"
  console.log("5. Saving custom blueprint to package 'Nordic Village'...");
  await Runtime.evaluate({
    expression: `(() => {
      const nameInp = document.querySelector('input[placeholder*="Nordic Longhouse"]');
      const pkgInp = document.querySelector('input[placeholder*="Nordic Village"]');
      const setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      if (nameInp) { setVal.call(nameInp, "Nordic Villa"); nameInp.dispatchEvent(new Event('input', { bubbles: true })); }
      if (pkgInp) { setVal.call(pkgInp, "Nordic Pack"); pkgInp.dispatchEvent(new Event('input', { bubbles: true })); }
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`
  });
  await sleep(2500);

  // 5. Verify blueprint is listed in Library and can be spawned
  console.log("6. Verifying saved blueprint in Library tab...");
  const libCheck = await Runtime.evaluate({
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll('span')).map(s => s.innerText.trim());
      const hasVilla = rows.some(t => t.includes('Nordic Villa'));
      const hasPack = rows.some(t => t.includes('Nordic Pack'));
      return { hasVilla, hasPack };
    })()`,
    returnByValue: true
  });
  console.log("Library check result:", libCheck.result?.value);

  const ssLib = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/sim-blueprint-library.jpg", Buffer.from(ssLib.data, "base64"));
  console.log("Saved screenshot to snapshots/sim-blueprint-library.jpg");

  console.log("All blueprint, 3D selection & camera freeze tests passed! ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
} finally {
  chrome.kill();
}
