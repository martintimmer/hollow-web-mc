import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9322;
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

  fs.mkdirSync("snapshots", { recursive: true });

  console.log("Navigating to In-Game Sim...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  // Click on "HOUSES" category button in catalog
  await Runtime.evaluate({
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const housesBtn = btns.find((b) => b.textContent && b.textContent.trim().toUpperCase() === "HOUSES");
        if (housesBtn) housesBtn.click();
      })()
    `
  });
  await sleep(500);

  // Click on "Manor" house button
  const res = await Runtime.evaluate({
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const manorBtn = btns.find((b) => b.textContent && b.textContent.includes("Manor"));
        if (manorBtn) {
          manorBtn.click();
          return "Clicked Manor";
        }
        return "Manor button not found";
      })()
    `
  });
  console.log("Result:", res.result.value);

  await sleep(2000);

  // Click "Snap View" to frame the house
  await Runtime.evaluate({
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const snapBtn = btns.find((b) => b.textContent && b.textContent.includes("Snap View"));
        if (snapBtn) snapBtn.click();
      })()
    `
  });
  await sleep(1500);

  const snap = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/simdeck-house-test.png", Buffer.from(snap.data, "base64"));
  console.log("Saved snapshots/simdeck-house-test.png");

  await client.close();
} catch (err) {
  console.error("Capture failed:", err);
} finally {
  chrome.kill();
  process.exit(0);
}
