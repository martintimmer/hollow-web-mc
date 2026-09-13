import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9269;
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

  console.log("Navigating to http://127.0.0.1:5450/editor.html?id=1174 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/editor.html?id=1174" });
  await sleep(3000);

  const screenshot = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/fence-editor-3d.png", Buffer.from(screenshot.data, "base64"));
  console.log("Saved editor preview to snapshots/fence-editor-3d.png");

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
