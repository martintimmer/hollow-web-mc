import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9284;
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

  console.log("Navigating to editor.html?id=80 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/editor.html?id=80" });
  await sleep(3500);

  // Switch to Top face tab
  await Runtime.evaluate({
    expression: `(() => {
      const topTab = Array.from(document.querySelectorAll("#faceTabs .tab")).find(t => t.getAttribute("data-face") === "top");
      if (topTab) topTab.click();
    })()`
  });

  await sleep(1000);

  const topFaceSs = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/torch-top-face-editor.png", Buffer.from(topFaceSs.data, "base64"));
  console.log("Saved torch top face screenshot to snapshots/torch-top-face-editor.png");

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
