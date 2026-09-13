import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

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

  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return;

      const px = Math.floor(s.player.x);
      const pz = Math.floor(s.player.z);
      const py = Math.floor(s.player.y);

      // Place 4 connected fences in a cross and a standalone post
      s.edits.set(\`\${px},\${py},\${pz-2}\`, 1174);
      s.edits.set(\`\${px+1},\${py},\${pz-2}\`, 1174);
      s.edits.set(\`\${px-1},\${py},\${pz-2}\`, 1174);
      s.edits.set(\`\${px},\${py},\${pz-3}\`, 1174);
      s.edits.set(\`\${px},\${py},\${pz-1}\`, 1174);

      // Look slightly down towards the fences
      s.player.pitch = -0.45;
      s.player.yaw = 0;
      if (s.camera) {
        s.camera.position.set(px + 0.5, py + 2.2, pz + 1.0);
        s.camera.rotation.set(-0.45, 0, 0);
      }
    })()`,
    returnByValue: true
  });

  await sleep(1000);
  const screenshot = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/fence-3d-view.png", Buffer.from(screenshot.data, "base64"));
  console.log("Saved screenshot to snapshots/fence-3d-view.png");

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
