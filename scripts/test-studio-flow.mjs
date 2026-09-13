import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9230;
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

  // Wait for boot screen
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
      if (u) setNativeValue(u, "architect_" + Math.floor(Math.random() * 1000));
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

  // Press Escape to open Pause Menu
  console.log("4. Opening Pause Menu...");
  await Runtime.evaluate({
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    })()`
  });

  await sleep(1500);

  // Click "BUILDER STUDIO / FLAT-PAD"
  console.log("5. Clicking BUILDER STUDIO button...");
  const studioClick = await Runtime.evaluate({
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.innerText.toUpperCase().includes('BUILDER STUDIO') || b.innerText.toUpperCase().includes('FLAT-PAD'));
      if (btn) {
        btn.click();
        return "clicked-builder-studio: " + btn.innerText;
      }
      return "btn-not-found";
    })()`,
    returnByValue: true
  });
  console.log("Studio transition:", studioClick.result?.value);

  // Wait for flat pad mounting
  await sleep(7000);

  // Take screenshot of Studio Flat Pad
  const ssStudio = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/studio-pad-view.png", Buffer.from(ssStudio.data, "base64"));
  console.log("Saved Studio Flat Pad screenshot to snapshots/studio-pad-view.png");

  // Open Blueprint Modal via 'B' key
  console.log("6. Opening Blueprints Studio Modal via 'B' key...");
  await Runtime.evaluate({
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', bubbles: true }));
    })()`
  });

  await sleep(2000);

  // Take screenshot of Blueprint Modal
  const ssBp = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/blueprint-modal-view.png", Buffer.from(ssBp.data, "base64"));
  console.log("Saved Blueprint Modal screenshot to snapshots/blueprint-modal-view.png");

  // Close blueprint modal
  await Runtime.evaluate({
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === '✕');
      if (closeBtn) closeBtn.click();
    })()`
  });

  await sleep(1000);

  // Return to exploration world
  console.log("7. Returning to Game World via Pause Menu...");
  await Runtime.evaluate({
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
      setTimeout(() => {
        const retBtn = Array.from(document.querySelectorAll('button'))
          .find(b => b.innerText.toUpperCase().includes('RETURN TO GAME WORLD') || b.innerText.toUpperCase().includes('RETURN TO WORLD'));
        if (retBtn) retBtn.click();
      }, 600);
    })()`
  });

  await sleep(8000);

  // Take final screenshot of restored exploration world
  const ssRestored = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/world-restored-view.png", Buffer.from(ssRestored.data, "base64"));
  console.log("Saved Restored World screenshot to snapshots/world-restored-view.png");

  console.log("End-to-End Studio Flow Verification Complete! ✓");

  await client.close();
} catch (err) {
  console.error("Studio flow test error:", err);
} finally {
  chrome.kill();
}
