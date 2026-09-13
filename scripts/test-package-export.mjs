import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9385;
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

  // 1. Click on Designer Tab
  await Runtime.evaluate({
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find(b => b.textContent && b.textContent.includes("Designer"));
      if (btn) btn.click();
    })()`
  });
  await sleep(800);

  // 2. Click "Save to /docs & Generate Master AI Prompt"
  const stageRes = await Runtime.evaluate({
    expression: `(async () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const saveBtn = buttons.find(b => b.textContent && b.textContent.includes("Save to /docs & Generate"));
      if (saveBtn) {
        saveBtn.click();
        return "Clicked Save Button";
      }
      return "Save Button not found";
    })()`,
    awaitPromise: true
  });
  console.log("[test-pkg] Result:", stageRes.result.value);
  await sleep(1500);

  // 3. Toggle View Prompt
  await Runtime.evaluate({
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const viewBtn = buttons.find(b => b.textContent && b.textContent.includes("View Prompt"));
      if (viewBtn) viewBtn.click();
    })()`
  });
  await sleep(500);

  const shotUI = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/designer-prompt-exporter.png", Buffer.from(shotUI.data, "base64"));
  console.log("[test-pkg] Saved snapshots/designer-prompt-exporter.png");

  await client.close();
} finally {
  chrome.kill("SIGTERM");
}
