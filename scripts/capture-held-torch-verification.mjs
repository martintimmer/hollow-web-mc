import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9287;
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

  console.log("Navigating to in-game http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  // Equip Torch in hand and look at placed torch on stone
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const api = window.__sim?.api;
      if (!s) return;

      // Minimize SimDeck UI
      const minimizeBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "-");
      if (minimizeBtn) minimizeBtn.click();

      // Enable first-person arm in sim mode
      s.simMode = false;
      if (s.firstPersonArm) s.firstPersonArm.visible = true;
      if (s.heldItemGroup) s.heldItemGroup.visible = true;

      // Equip Torch (#80) in active hotbar slot
      s.slot = 0;
      s.hotbar[0] = 80;
      s.currentHeldId = -1; // force refresh

      const px = 10, py = 64, pz = 10;
      const setB = (x, y, z, id) => {
        const cx = x >> 4, cz = z >> 4;
        const c = s.chunks.get(cx + "," + cz);
        if (c && c.data) {
          c.data[y * 256 + (z & 15) * 16 + (x & 15)] = id;
        }
      };

      // Place a stone plinth with a world torch directly in front of the player
      setB(px, py - 1, pz - 2, 5); // stone block
      setB(px, py, pz - 2, 80);     // torch on floor

      s.player.x = px + 0.5;
      s.player.y = py + 1.2;
      s.player.z = pz - 1.0;
      s.player.pitch = -0.38;
      s.player.yaw = 0;

      if (s.camera) {
        s.camera.position.set(px + 0.5, py + 1.2, pz - 1.0);
        s.camera.rotation.set(-0.38, 0, 0);
      }

      if (s.rescan) s.rescan(0, 0);
    })()`
  });

  await sleep(2500);

  const screenshot = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/torch-in-hand-and-world-match.png", Buffer.from(screenshot.data, "base64"));
  console.log("Saved screenshot to snapshots/torch-in-hand-and-world-match.png");

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
