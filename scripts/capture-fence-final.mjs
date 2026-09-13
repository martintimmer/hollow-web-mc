import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9282;
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

  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  // Click the minimize button '-' on SimDeck
  await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      const s = window.__sim?.s;
      if (!api || !s) return;

      // Minimize SimDeck
      const minimizeBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "-");
      if (minimizeBtn) minimizeBtn.click();

      const px = Math.floor(s.player.x);
      const py = Math.floor(s.player.y);
      const pz = Math.floor(s.player.z);

      // Stamp a clean fence setup on the ground
      api.stampBlock(1174, px, pz - 3);
      api.stampBlock(1174, px - 1, pz - 3);
      api.stampBlock(1174, px + 1, pz - 3);
      api.stampBlock(1174, px, pz - 4);
      api.stampBlock(1174, px, pz - 2);

      // Birch fence line
      api.stampBlock(1177, px - 3, pz - 3);
      api.stampBlock(1177, px - 3, pz - 4);

      // Nether Brick fence line
      api.stampBlock(1184, px + 3, pz - 3);
      api.stampBlock(1184, px + 3, pz - 4);

      s.player.pitch = -0.45;
      s.player.yaw = 0;
      if (s.camera) {
        s.camera.position.set(px + 0.5, py + 1.62, pz + 0.5);
        s.camera.rotation.set(-0.45, 0, 0);
      }
    })()`
  });

  await sleep(2000);

  const screenshot = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/fence-in-game-final.png", Buffer.from(screenshot.data, "base64"));
  console.log("Saved clean in-game fence screenshot to snapshots/fence-in-game-final.png");

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
