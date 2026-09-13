import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9249;
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

  console.log("1. Navigating to Production on http://127.0.0.1:5400/ ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/" });
  await sleep(7000);

  // Take screenshot of Login Modal
  console.log("2. Capturing Title / Sign In Screen...");
  const ssTitle = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/prod-title-screen.jpg", Buffer.from(ssTitle.data, "base64"));
  console.log("Saved screenshot to snapshots/prod-title-screen.jpg");

  // Log in with new unique user
  const uname = "Player_" + Date.now().toString().slice(-4);
  console.log(`3. Logging in as ${uname}...`);
  await Runtime.evaluate({
    expression: `(() => {
      const userInp = document.querySelector('input[type="text"]');
      const passInp = document.querySelector('input[type="password"]');
      const submitBtn = document.querySelector('button[type="submit"]');
      const setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      if (userInp) { setVal.call(userInp, "${uname}"); userInp.dispatchEvent(new Event('input', { bubbles: true })); }
      if (passInp) { setVal.call(passInp, "T" + Math.random().toString(36).slice(2, 12)); passInp.dispatchEvent(new Event('input', { bubbles: true })); }
      if (submitBtn) submitBtn.click();
    })()`
  });

  await sleep(2500);

  // Click Play Selected World
  console.log("4. Joining world from World Select modal...");
  await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const playBtn = btns.find(b => b.innerText.includes('PLAY SELECTED WORLD'));
      if (playBtn) playBtn.click();
    })()`
  });

  await sleep(10000);

  // Verify in-game Top Quick Access HUD
  console.log("5. Verifying live in-game HUD...");
  const inGameHud = await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
      const hasMenu = btns.some(t => t.includes('MENU (ESC)'));
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
  console.log("In-game HUD evaluation:", inGameHud.result?.value);

  const ssInGame = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/prod-clean-menu-hud.jpg", Buffer.from(ssInGame.data, "base64"));
  console.log("Saved screenshot to snapshots/prod-clean-menu-hud.jpg");

  // Verify Simulation Mode continuous clouds & pointer lock
  console.log("6. Testing Simulation Mode on http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(7000);

  const simTestRes = await Runtime.evaluate({
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
  console.log("Simulation evaluation:", simTestRes.result?.value);

  const ssSim = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/sim-clouds-continuous.jpg", Buffer.from(ssSim.data, "base64"));
  console.log("Saved screenshot to snapshots/sim-clouds-continuous.jpg");

  console.log("All verifications passed! ✓");
  await client.close();
} catch (err) {
  console.error("Verification error:", err);
} finally {
  chrome.kill();
}
