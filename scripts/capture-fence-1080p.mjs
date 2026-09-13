import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9270;
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
  const { Page, Emulation } = client;
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  await Page.navigate({ url: "http://127.0.0.1:5450/editor.html?id=1174" });
  await sleep(3500);

  const ss = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/fence-editor-full.png", Buffer.from(ss.data, "base64"));
  console.log("Saved full editor screenshot to snapshots/fence-editor-full.png");

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
