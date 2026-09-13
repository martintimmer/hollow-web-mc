import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9241;
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

  console.log("1. Navigating to sim on http://127.0.0.1:5450/ ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/" });
  await sleep(6000);

  // Focus on Door at front (eye level)
  console.log("2. Focusing on Door from front...");
  await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      if (api?.wipe) api.wipe();
      if (api?.edit) {
        api.edit(8, 65, 8, 105);
        api.edit(8, 66, 8, 105);
        api.edit(10, 65, 8, 107); // Closed trapdoor
        api.edit(12, 65, 8, 108); // Open trapdoor
      }
      if (api?.focusBlock) api.focusBlock(8, 65.5, 8, 3.2, 0.05, 0);
    })()`
  });

  await sleep(2500);

  const ssFront = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/door-lower-handle-front.png", Buffer.from(ssFront.data, "base64"));
  console.log("Saved screenshot to snapshots/door-lower-handle-front.png");

  // Focus on Door from 45° angle looking UP
  console.log("3. Focusing on Door from 45° angle looking UP...");
  await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      // pitch = -0.78 rad (-45 deg looking UP at the window cutouts)
      if (api?.focusBlock) api.focusBlock(8, 66, 8, 2.8, -0.75, 0.4);
    })()`
  });

  await sleep(2500);

  const ss45Up = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/door-45deg-up-watertight.png", Buffer.from(ss45Up.data, "base64"));
  console.log("Saved screenshot to snapshots/door-45deg-up-watertight.png");

  // Focus on Door from 45° angle looking DOWN
  console.log("4. Focusing on Door from 45° angle looking DOWN...");
  await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      if (api?.focusBlock) api.focusBlock(8, 66, 8, 2.8, 0.75, -0.4);
    })()`
  });

  await sleep(2500);

  const ss45Down = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/door-45deg-down-watertight.png", Buffer.from(ss45Down.data, "base64"));
  console.log("Saved screenshot to snapshots/door-45deg-down-watertight.png");

  // Focus on Trapdoors (Closed and Open)
  console.log("5. Focusing on Trapdoors (Closed & Open)...");
  await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      if (api?.focusBlock) api.focusBlock(11, 65, 8, 3.5, 0.6, 0);
    })()`
  });

  await sleep(2500);

  const ssTrapdoor = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/trapdoors-closed-and-open.png", Buffer.from(ssTrapdoor.data, "base64"));
  console.log("Saved screenshot to snapshots/trapdoors-closed-and-open.png");

  console.log("Visual angle checks complete! ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
} finally {
  chrome.kill();
}
