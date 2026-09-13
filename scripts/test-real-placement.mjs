import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";

const PORT = 9266;
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
    expression: `(async () => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      // Set player at (8.5, 65.25, 8.5)
      s.player.x = 8.5;
      s.player.y = 65.25;
      s.player.z = 8.5;
      s.player.yaw = 0;
      s.player.pitch = -0.5; // Looking down-forward towards z = 6

      // Select Cobblestone (6) in active slot
      s.hotbar[s.slot] = 6;
      s.hotbarCounts[s.slot] = 64;

      // Update camera rotation directly
      s.camera.rotation.set(s.player.pitch, s.player.yaw, 0, "YXZ");
      s.camera.position.set(s.player.x, s.player.y + 1.62, s.player.z);

      // Wait 50ms
      await new Promise(r => setTimeout(r, 50));

      const cv = document.querySelector("canvas");
      // Simulate right click to place
      cv.dispatchEvent(new MouseEvent("mousedown", { button: 2, bubbles: true }));

      return {
        placedBlockCount: s.edits.size,
        edits: Array.from(s.edits.entries()),
        heldItem: s.hotbar[s.slot]
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("Async Aimed Placement Result:", JSON.stringify(testInteraction.result?.value, null, 2));

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
}
