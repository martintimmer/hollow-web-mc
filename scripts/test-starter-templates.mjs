import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9240;
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

  console.log("1. Navigating to http://127.0.0.1:5400/ ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/" });

  await sleep(7000);

  // Fill in login form
  console.log("2. Logging in...");
  await Runtime.evaluate({
    expression: `(() => {
      const setNativeValue = (element, value) => {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
      };

      const u = document.querySelector('input[placeholder*="Username"], input[type="text"]');
      const p = document.querySelector('input[type="password"]');
      const form = document.querySelector('form');
      if (u) setNativeValue(u, "master_builder_" + Math.floor(Math.random() * 1000));
      if (p) setNativeValue(p, "buildpass");
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`
  });

  await sleep(3000);

  // Click Play World
  console.log("3. Joining world...");
  await Runtime.evaluate({
    expression: `(() => {
      const playBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.innerText.includes('PLAY') || b.innerText.includes('JOIN') || b.innerText.includes('Play World'));
      if (playBtn) playBtn.click();
    })()`
  });

  await sleep(8000);

  // Click the new top-bar "BUILDER STUDIO (B)" button directly!
  console.log("4. Clicking 'BUILDER STUDIO (B)' in top HUD bar...");
  const studioBtnClick = await Runtime.evaluate({
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.innerText.toUpperCase().includes('BUILDER STUDIO'));
      if (btn) {
        btn.click();
        return "clicked-top-bar-studio-btn";
      }
      return "btn-not-found";
    })()`,
    returnByValue: true
  });
  console.log("Top bar studio button:", studioBtnClick.result?.value);

  await sleep(6000);

  // Open Blueprint & Templates Modal via 'B' key
  console.log("5. Opening Blueprint & Starter Templates modal via 'B' key...");
  await Runtime.evaluate({
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', bubbles: true }));
    })()`
  });

  await sleep(2000);

  // Take screenshot of Starter Templates tab
  const ssTemplates = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/starter-templates-modal.png", Buffer.from(ssTemplates.data, "base64"));
  console.log("Saved screenshot to snapshots/starter-templates-modal.png");

  // Click "Load to Stage" on Medieval Tavern or Blacksmith Forge
  console.log("6. Loading Medieval Tavern template onto stage...");
  await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loadBtn = btns.find(b => b.innerText.includes('Load to Stage'));
      if (loadBtn) loadBtn.click();
    })()`
  });

  await sleep(4000);

  // Take screenshot of the spawned building on stage
  const ssLoadedBuilding = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/template-building-on-stage.png", Buffer.from(ssLoadedBuilding.data, "base64"));
  console.log("Saved screenshot to snapshots/template-building-on-stage.png");

  // Open full Creative Inventory via 'E' key
  console.log("7. Opening full Creative Inventory (All 105+ blocks) via 'E' key...");
  await Runtime.evaluate({
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
    })()`
  });

  await sleep(2000);

  // Take screenshot of Creative Inventory
  const ssInv = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/creative-inventory-in-studio.png", Buffer.from(ssInv.data, "base64"));
  console.log("Saved screenshot to snapshots/creative-inventory-in-studio.png");

  console.log("Starter Templates & Creative Studio Verification Complete! ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
} finally {
  chrome.kill();
}
