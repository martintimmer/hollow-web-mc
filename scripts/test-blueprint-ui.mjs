import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9231;
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

  await Page.navigate({ url: "http://127.0.0.1:5400/" });

  // Wait for boot screen
  await sleep(7000);

  // Fill in login form
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
  await Runtime.evaluate({
    expression: `(() => {
      const playBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.innerText.includes('PLAY') || b.innerText.includes('JOIN') || b.innerText.includes('Play World'));
      if (playBtn) playBtn.click();
    })()`
  });

  await sleep(9000);

  // Press 'B' key to open Blueprint Studio Modal
  console.log("Pressing 'B' key to open Blueprint Studio Modal...");
  await Runtime.evaluate({
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', bubbles: true }));
    })()`
  });

  await sleep(2000);

  // Capture screenshot of open BlueprintModal
  const ss = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/blueprint-modal-open.png", Buffer.from(ss.data, "base64"));
  console.log("Saved screenshot to snapshots/blueprint-modal-open.png");

  await client.close();
} catch (err) {
  console.error("Blueprint UI test error:", err);
} finally {
  chrome.kill();
}
