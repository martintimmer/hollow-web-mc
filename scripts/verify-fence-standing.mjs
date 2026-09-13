import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9265;
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

  console.log("Navigating to http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  const evalRes = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const api = window.__sim?.api;
      if (!s) return { ok: false, reason: "no sim state" };

      // Find ground at player location
      const px = Math.floor(s.player.x);
      const pz = Math.floor(s.player.z);
      const py = Math.floor(s.player.y);

      // Place a fence row
      s.edits.set(\`\${px},\${py},\${pz}\`, 1174);
      s.edits.set(\`\${px+1},\${py},\${pz}\`, 1174);
      s.edits.set(\`\${px-1},\${py},\${pz}\`, 1174);

      // Teleport player directly on top of the fence
      s.player.x = px + 0.5;
      s.player.z = pz + 0.5;
      s.player.y = py + 1.5;
      s.player.vy = 0;
      s.player.ground = true;

      // Track positions across multiple frames
      const ySamples = [];
      for (let i = 0; i < 30; i++) {
        if (window.__sim?.step) window.__sim.step(0.016);
        ySamples.push(Number(s.player.y.toFixed(4)));
      }

      return {
        ok: true,
        fencePos: { x: px, y: py, z: pz },
        finalY: s.player.y,
        expectedY: py + 1.5,
        isGrounded: s.player.ground,
        ySamples
      };
    })()`,
    returnByValue: true
  });

  console.log("Fence standing test results:", JSON.stringify(evalRes.result?.value, null, 2));

  // Take screenshot
  const screenshot = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/fence-standing-verification.png", Buffer.from(screenshot.data, "base64"));
  console.log("Saved screenshot to snapshots/fence-standing-verification.png");

  await client.close();
} catch (e) {
  console.error("Error during fence verification:", e);
} finally {
  chrome.kill();
  process.exit(0);
}
