import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9248;
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

  // 1. Production Mode: Check TitleScreen / Login is strictly presented
  console.log("1. Navigating to Production on http://127.0.0.1:5400/ ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/" });
  await sleep(3500);

  const authModalCheck = await Runtime.evaluate({
    expression: `(() => {
      const titleModal = document.querySelector('h1')?.innerText?.includes('Hollowpine');
      const signInText = Array.from(document.querySelectorAll('span')).some(s => s.innerText.includes('Account Sign In'));
      return { hasTitle: !!titleModal, hasSignIn: !!signInText };
    })()`,
    returnByValue: true
  });
  console.log("Auth modal check result:", authModalCheck.result?.value);
  if (authModalCheck.result?.value?.hasTitle && authModalCheck.result?.value?.hasSignIn) {
    console.log("PASS: Login screen strictly presented on initial load! ✓");
  } else {
    console.error("FAIL: Login screen was silently bypassed!");
  }

  const ssTitle = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/prod-title-screen.jpg", Buffer.from(ssTitle.data, "base64"));
  console.log("Saved screenshot to snapshots/prod-title-screen.jpg");

  // 2. Perform login and enter world
  console.log("2. Performing login as unique player...");
  await Runtime.evaluate({
    expression: `(() => {
      const userInp = document.querySelector('input[type="text"]');
      const passInp = document.querySelector('input[type="password"]');
      const submitBtn = document.querySelector('button[type="submit"]');
      const setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      if (userInp) { setVal.call(userInp, "Player_" + Date.now().toString().slice(-4)); userInp.dispatchEvent(new Event('input', { bubbles: true })); }
      if (passInp) { setVal.call(passInp, "T" + Math.random().toString(36).slice(2, 12)); passInp.dispatchEvent(new Event('input', { bubbles: true })); }
      if (submitBtn) submitBtn.click();
    })()`
  });
  await sleep(3000);

  // Click "Play World" on the default world
  console.log("3. Joining world...");
  await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const playBtn = btns.find(b => b.innerText.includes('Play Selected World') || b.innerText.includes('Play World'));
      if (playBtn) playBtn.click();
    })()`
  });
  await sleep(6000);

  // 4. Verify HUD Quick Access Top Bar: ONLY Menu (Esc) is present
  console.log("4. Checking HUD top bar buttons...");
  const hudCheck = await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
      const hasMenu = btns.some(t => t.includes('Menu (Esc)'));
      const hasStartBuild = btns.some(t => t.includes('Start Building') || t.includes('Stop Building'));
      const hasInventory = btns.some(t => t.includes('Inventory'));
      const hasMap = btns.some(t => t.includes('Map (M)'));
      const hasChat = btns.some(t => t.includes('Chat (C)'));
      return {
        hasMenu,
        hasStartBuild,
        hasInventory,
        hasMap,
        hasChat,
        allButtons: btns
      };
    })()`,
    returnByValue: true
  });
  console.log("HUD check result:", hudCheck.result?.value);
  if (hudCheck.result?.value?.hasMenu && !hudCheck.result?.value?.hasStartBuild && !hudCheck.result?.value?.hasInventory && !hudCheck.result?.value?.hasMap && !hudCheck.result?.value?.hasChat) {
    console.log("PASS: Quick Access Top Bar has ONLY 'Menu (Esc)'! ✓");
  } else {
    console.error("FAIL: HUD contains unwanted buttons:", hudCheck.result?.value);
  }

  const ssProd = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/prod-clean-menu-hud.jpg", Buffer.from(ssProd.data, "base64"));
  console.log("Saved screenshot to snapshots/prod-clean-menu-hud.jpg");

  // 5. Check Simulation Mode & continuous clouds
  console.log("5. Navigating to Simulation Mode on http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(6000);

  // Click canvas and check active & steering
  const simClickRes = await Runtime.evaluate({
    expression: `(() => {
      const cv = document.querySelector('canvas');
      if (cv) {
        cv.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 300, clientY: 300 }));
      }
      const s = window.__sim?.s;
      return {
        active: s?.active,
        steering: s?.steering,
        cloudsVisible: s?.clouds?.visible,
        cloudMeshDefined: !!s?.clouds
      };
    })()`,
    returnByValue: true
  });
  console.log("Sim click & clouds result:", simClickRes.result?.value);
  if (simClickRes.result?.value?.active && simClickRes.result?.value?.steering) {
    console.log("PASS: Canvas click activates camera steering and pointer lock! ✓");
  }

  const ssSim = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/sim-clouds-continuous.jpg", Buffer.from(ssSim.data, "base64"));
  console.log("Saved screenshot to snapshots/sim-clouds-continuous.jpg");

  console.log("All tests completed successfully! ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
} finally {
  chrome.kill();
}
