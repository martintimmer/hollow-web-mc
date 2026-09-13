import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9273;
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

  // Setup standalone fence and player on top
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return;
      s.active = true;
      s.steering = true;

      const px = 10, py = 64, pz = 10;
      s.edits.set(\`\${px},\${py-1},\${pz}\`, 1); // ground
      s.edits.set(\`\${px},\${py},\${pz}\`, 1174); // fence post

      s.player.x = px + 0.5;
      s.player.y = py + 1.5;
      s.player.z = pz + 0.5;
      s.player.vx = 0;
      s.player.vy = 0;
      s.player.vz = 0;
      s.player.yaw = 0;
      s.player.pitch = 0;
      s.player.ground = true;
    })()`
  });

  await sleep(500);

  // Player presses KeyD to walk eastward off the fence post
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (s) {
        s.keys["KeyD"] = true;
      }
    })()`
  });

  // Let player walk for 1.2 seconds in real-time
  await sleep(1200);

  const res = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { ok: false };
      return {
        ok: true,
        finalPos: { x: Number(s.player.x.toFixed(3)), y: Number(s.player.y.toFixed(3)), z: Number(s.player.z.toFixed(3)) },
        isGrounded: s.player.ground,
        fellDown: s.player.y < 65.5 - 0.5
      };
    })()`,
    returnByValue: true
  });

  console.log("Walk Off Fence Post Result:", JSON.stringify(res.result?.value, null, 2));

  // Take in-game snapshot
  const screenshot = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/fence-edge-drop-verified.png", Buffer.from(screenshot.data, "base64"));
  console.log("Saved screenshot to snapshots/fence-edge-drop-verified.png");

  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
  process.exit(0);
}
