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

  console.log("1. Navigating to http://127.0.0.1:5400/ ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/" });
  await sleep(3500);

  console.log("2. Clicking 'Quick Play (Instant Guest)' on :5400 Title Screen...");
  const clickQuickPlay = await Runtime.evaluate({
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.toLowerCase().includes("quick play"));
      if (btn) {
        btn.click();
        return { clicked: true };
      }
      return { clicked: false, buttons: Array.from(document.querySelectorAll("button")).map(b => b.innerText) };
    })()`,
    returnByValue: true
  });
  console.log("Click Quick Play:", JSON.stringify(clickQuickPlay.result?.value, null, 2));

  await sleep(3000);

  console.log("3. Verifying player is active and moving with WASD...");
  const moveCheck = await Runtime.evaluate({
    expression: `(async () => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      const startPos = { x: s.player.x, y: s.player.y, z: s.player.z, active: s.active };
      
      // Press W
      s.keys["KeyW"] = true;
      await new Promise(r => setTimeout(r, 400));
      s.keys["KeyW"] = false;

      const endPos = { x: s.player.x, y: s.player.y, z: s.player.z, active: s.active };

      return {
        startPos,
        endPos,
        moved: startPos.z !== endPos.z || startPos.x !== endPos.x,
        active: s.active,
        uiPaused: s.uiPaused
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("Movement Check Result:", JSON.stringify(moveCheck.result?.value, null, 2));

  const ss = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/port-5400-guest-playing.jpg", Buffer.from(ss.data, "base64"));
  console.log("Saved screenshot to snapshots/port-5400-guest-playing.jpg");

  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
