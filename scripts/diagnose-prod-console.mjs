import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9268;
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
  const { Page, Runtime, Log } = client;
  await Page.enable();
  await Runtime.enable();
  await Log.enable();

  const consoleLogs = [];
  Runtime.consoleAPICalled((params) => {
    consoleLogs.push({ type: params.type, args: params.args.map(a => a.value || a.description) });
  });

  const pageErrors = [];
  Runtime.exceptionThrown((params) => {
    pageErrors.push(params.exceptionDetails);
  });

  console.log("1. Navigating to http://127.0.0.1:5400/ (Production Game)...");
  await Page.navigate({ url: "http://127.0.0.1:5400/" });
  await sleep(4000);

  const dom = await Runtime.evaluate({
    expression: `(() => {
      const cv = document.querySelector("canvas");
      const titleScreen = !!document.querySelector("[data-testid='title-screen']") || document.body.innerText.includes("Singleplayer");
      const buttons = Array.from(document.querySelectorAll("button")).map(b => b.innerText.trim());
      const inputs = Array.from(document.querySelectorAll("input")).map(i => i.placeholder || i.name || i.type);
      return {
        hasCanvas: !!cv,
        titleScreen,
        buttons,
        inputs,
        bodyTextSnippet: document.body.innerText.slice(0, 300)
      };
    })()`,
    returnByValue: true
  });
  console.log("Port 5400 Initial DOM:", JSON.stringify(dom.result?.value, null, 2));

  // Take screenshot of port 5400 initial screen
  const ss1 = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/port-5400-initial.jpg", Buffer.from(ss1.data, "base64"));
  console.log("Saved screenshot to snapshots/port-5400-initial.jpg");

  // If there's an Auth modal or Title Screen, let's login or select world
  console.log("2. Checking if world needs to be joined on :5400...");
  const joinResult = await Runtime.evaluate({
    expression: `(async () => {
      // Find Singleplayer button or World Select or Play button
      const singleplayerBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Singleplayer") || b.innerText.includes("Play"));
      if (singleplayerBtn) {
        singleplayerBtn.click();
        await new Promise(r => setTimeout(r, 1000));
      }

      // If world list is shown, click the first world or Create World
      const worldItem = document.querySelector(".cursor-pointer, [data-world-id], button");
      return {
        clickedSingleplayer: !!singleplayerBtn,
        currentButtons: Array.from(document.querySelectorAll("button")).map(b => b.innerText.trim())
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("Join Result:", JSON.stringify(joinResult.result?.value, null, 2));

  console.log("Logs on :5400:", JSON.stringify(consoleLogs, null, 2));
  console.log("Errors on :5400:", JSON.stringify(pageErrors, null, 2));

  await client.close();
} catch (e) {
  console.error("Port 5400 error:", e);
} finally {
  chrome.kill();
}
