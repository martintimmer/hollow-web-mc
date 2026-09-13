import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9288;
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

  console.log("Navigating to http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  // Setup torch in hand
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return;

      // Close SimDeck UI
      const minimizeBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "-");
      if (minimizeBtn) minimizeBtn.click();

      s.simMode = false;
      if (s.firstPersonArm) s.firstPersonArm.visible = true;
      if (s.heldItemGroup) s.heldItemGroup.visible = true;

      s.slot = 0;
      s.hotbar[0] = 80;
      s.currentHeldId = -1;

      const px = 10, py = 64, pz = 10;
      const setB = (x, y, z, id) => {
        const cx = x >> 4, cz = z >> 4;
        const c = s.chunks.get(cx + "," + cz);
        if (c && c.data) {
          c.data[y * 256 + (z & 15) * 16 + (x & 15)] = id;
        }
      };

      setB(px, py - 1, pz - 2, 5);
      setB(px, py, pz - 2, 80);

      s.player.x = px + 0.5;
      s.player.y = py + 1.2;
      s.player.z = pz - 1.0;
      s.player.pitch = -0.35;
      s.player.yaw = 0;
    })()`
  });

  // 1. Capture at FOV 70 (Normal)
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (s && s.camera) {
        s.camera.fov = 70;
        s.baseFov = 70;
        s.camera.updateProjectionMatrix();
      }
    })()`
  });
  await sleep(1000);
  const ss70 = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/held-torch-fov-70.png", Buffer.from(ss70.data, "base64"));
  console.log("Saved snapshots/held-torch-fov-70.png");

  // 2. Capture at FOV 100 (Quake Pro)
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (s && s.camera) {
        s.camera.fov = 100;
        s.baseFov = 100;
        s.camera.updateProjectionMatrix();
      }
    })()`
  });
  await sleep(1000);
  const ss100 = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/held-torch-fov-100.png", Buffer.from(ss100.data, "base64"));
  console.log("Saved snapshots/held-torch-fov-100.png");

  // 3. Capture at FOV 35 (Zoom)
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (s && s.camera) {
        s.camera.fov = 35;
        s.baseFov = 35;
        s.camera.updateProjectionMatrix();
      }
    })()`
  });
  await sleep(1000);
  const ss35 = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/held-torch-fov-35.png", Buffer.from(ss35.data, "base64"));
  console.log("Saved snapshots/held-torch-fov-35.png");

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
