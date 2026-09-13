import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9493;
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
  const { Page, Runtime, Emulation } = client;
  await Page.enable();
  await Runtime.enable();
  await Emulation.setDeviceMetricsOverride({
    width: 1400,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log("Navigating to http://127.0.0.1:5400/editor.html?id=124 ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/editor.html?id=124" });
  await sleep(3500);

  const shot124 = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/editor-124-probe.jpg", Buffer.from(shot124.data, "base64"));
  console.log("Saved editor 124 screenshot.");

  console.log("Navigating to http://127.0.0.1:5400/editor.html?id=1200 ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/editor.html?id=1200" });
  await sleep(3500);

  const shot1200 = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/editor-1200-probe.jpg", Buffer.from(shot1200.data, "base64"));
  console.log("Saved editor 1200 screenshot.");

} catch (err) {
  console.error("Probe error:", err);
} finally {
  chrome.kill("SIGKILL");
}
