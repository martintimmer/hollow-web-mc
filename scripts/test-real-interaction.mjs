import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";

const PORT = 9264;
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

  await Page.navigate({ url: "http://127.0.0.1:5450/" });
  await sleep(4000);

  const testInteraction = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const api = window.__sim?.api;
      if (!s || !api) return { error: "no sim api" };

      // Set player looking down at the grass block beneath them
      s.player.x = 8.5;
      s.player.y = 65.25;
      s.player.z = 8.5;
      s.player.pitch = -Math.PI / 3; // Looking down

      // Select Cobblestone (6) in active slot
      s.hotbar[s.slot] = 6;
      s.hotbarCounts[s.slot] = 64;

      const cv = document.querySelector("canvas");
      // Simulate right click to place
      cv.dispatchEvent(new MouseEvent("mousedown", { button: 2, bubbles: true }));

      return {
        placedBlockCount: s.edits.size,
        heldItem: s.hotbar[s.slot],
        offhandItem: s.offhandItem
      };
    })()`,
    returnByValue: true
  });
  console.log("Interaction Result:", JSON.stringify(testInteraction.result?.value, null, 2));

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
}
