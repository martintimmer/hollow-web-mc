import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9289;
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

  // 1. Editor view for Oak Fence (id 1174)
  console.log("Navigating to http://127.0.0.1:5450/editor.html?id=1174 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/editor.html?id=1174" });
  await sleep(3500);
  const editorSs = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/oak-fence-editor-investigation.png", Buffer.from(editorSs.data, "base64"));
  console.log("Saved snapshots/oak-fence-editor-investigation.png");

  // 2. In-game view with oak fence placed and held in hand + inventory opened
  console.log("Navigating to http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return;

      // Equip Oak Fence (#1174) in active hotbar slot
      s.slot = 0;
      s.hotbar[0] = 1174;
      s.currentHeldId = -1;
      s.simMode = false;
      if (s.firstPersonArm) s.firstPersonArm.visible = true;
      if (s.heldItemGroup) s.heldItemGroup.visible = true;

      const px = 10, py = 64, pz = 10;
      const setB = (x, y, z, id) => {
        const cx = x >> 4, cz = z >> 4;
        const c = s.chunks.get(cx + "," + cz);
        if (c && c.data) {
          c.data[y * 256 + (z & 15) * 16 + (x & 15)] = id;
        }
      };

      // Place single fence post and connecting 2-fence line
      setB(px, py - 1, pz - 2, 5);
      setB(px, py, pz - 2, 1174); // single post

      setB(px + 2, py - 1, pz - 2, 5);
      setB(px + 2, py, pz - 2, 1174); // connected post 1
      setB(px + 3, py - 1, pz - 2, 5);
      setB(px + 3, py, pz - 2, 1174); // connected post 2

      s.player.x = px + 0.5;
      s.player.y = py + 1.2;
      s.player.z = pz - 0.9;
      s.player.pitch = -0.32;
      s.player.yaw = 0;

      if (s.camera) {
        s.camera.position.set(px + 0.5, py + 1.2, pz - 0.9);
        s.camera.rotation.set(-0.32, 0, 0);
      }

      if (s.rescan) s.rescan(0, 0);
    })()`
  });

  await sleep(2000);

  const gameSs = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/oak-fence-game-investigation.png", Buffer.from(gameSs.data, "base64"));
  console.log("Saved snapshots/oak-fence-game-investigation.png");

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
