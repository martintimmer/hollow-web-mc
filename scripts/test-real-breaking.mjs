import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";

const PORT = 9267;
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

  const testBreak = await Runtime.evaluate({
    expression: `(async () => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      // Set creative mode for instant break
      s.creative = true;

      // Set player at (8.5, 65.25, 8.5) aiming at grass block at (8, 64, 6)
      s.player.x = 8.5;
      s.player.y = 65.25;
      s.player.z = 8.5;
      s.player.yaw = 0;
      s.player.pitch = -0.5;

      s.camera.rotation.set(s.player.pitch, s.player.yaw, 0, "YXZ");
      s.camera.position.set(s.player.x, s.player.y + 1.62, s.player.z);

      await new Promise(r => setTimeout(r, 50));

      const cv = document.querySelector("canvas");
      // Simulate left click to break
      cv.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true }));

      return {
        breakEdits: Array.from(s.edits.entries()),
        blockAtTarget: s.edits.get("8,64,6") // Should be 0 (Air / Broken)
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("Break Result:", JSON.stringify(testBreak.result?.value, null, 2));

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
}
