import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9380;
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

  // 1. Click on "🌴 San Andreas" category button
  await Runtime.evaluate({
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const saBtn = buttons.find(b => b.textContent && b.textContent.includes("San Andreas"));
      if (saBtn) saBtn.click();
    })()`
  });
  await sleep(800);

  // 2. Click on "Sweet's House"
  await Runtime.evaluate({
    expression: `(async () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const sweetsBtn = buttons.find(b => b.textContent && b.textContent.includes("Sweet's House"));
      if (sweetsBtn) sweetsBtn.click();
    })()`,
    awaitPromise: true
  });
  await sleep(1000);

  // 3. Click "Orbit"
  await Runtime.evaluate({
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const orbitBtn = buttons.find(b => b.textContent && b.textContent.trim() === "Orbit");
      if (orbitBtn) orbitBtn.click();
    })()`
  });
  await sleep(1000);

  const shotSweets = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/san-andreas-sweets-orbit.png", Buffer.from(shotSweets.data, "base64"));
  console.log("[test-sa] Captured snapshots/san-andreas-sweets-orbit.png");

  await client.close();
} finally {
  chrome.kill("SIGTERM");
}
