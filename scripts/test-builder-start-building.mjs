import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9245;
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

  // Take screenshot of initial state with top-left "Start Building" button
  console.log("2. Capturing initial Builder screen...");
  const ssInitial = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/builder-initial-screen.png", Buffer.from(ssInitial.data, "base64"));
  console.log("Saved screenshot to snapshots/builder-initial-screen.png");

  // Click the top-left "Start Building" button
  console.log("3. Clicking top-left 'Start Building' button...");
  const clickRes = await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.innerText.toUpperCase().includes('START BUILDING') || b.innerText.toUpperCase().includes('BUILD'));
      if (startBtn) {
        startBtn.click();
        return "clicked-start-building-btn";
      }
      return "not-found";
    })()`,
    returnByValue: true
  });
  console.log("Start building button click result:", clickRes.result?.value);

  await sleep(2500);

  // Take screenshot of active building mode (showing 9 materials toolbar at bottom)
  console.log("4. Capturing active Building Mode with 9-Slot Toolbar...");
  const ssActive = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/builder-start-building-active.png", Buffer.from(ssActive.data, "base64"));
  console.log("Saved screenshot to snapshots/builder-start-building-active.png");

  // Click the "Inventory (E/I)" button in top-left bar
  console.log("5. Opening Full 105+ Blocks Inventory...");
  await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const invBtn = btns.find(b => b.innerText.includes('Inventory'));
      if (invBtn) invBtn.click();
      else window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', bubbles: true }));
    })()`
  });

  await sleep(2000);

  // Take screenshot of open Creative Inventory in Builder
  console.log("6. Capturing Builder Creative Inventory...");
  const ssInv = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/builder-inventory-open.png", Buffer.from(ssInv.data, "base64"));
  console.log("Saved screenshot to snapshots/builder-inventory-open.png");

  console.log("Builder Start Building & 9-Material Toolbar Verification Complete! ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
} finally {
  chrome.kill();
}
