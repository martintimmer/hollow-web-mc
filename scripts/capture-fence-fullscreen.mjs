import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9268;
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
  const { Page, Runtime, Input } = client;
  await Page.enable();
  await Runtime.enable();

  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  // Press ESC to close modal
  await Input.dispatchKeyEvent({ type: "keyDown", key: "Escape", code: "Escape" });
  await Input.dispatchKeyEvent({ type: "keyUp", key: "Escape", code: "Escape" });
  await sleep(500);

  // Setup fence stage and camera
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return;

      const px = 10, py = 65, pz = 10;
      s.player.x = px;
      s.player.y = py + 1.0;
      s.player.z = pz;
      s.player.pitch = -0.32;
      s.player.yaw = 0;

      // Clear ground in front
      for (let dx = -4; dx <= 4; dx++) {
        for (let dz = -6; dz <= 2; dz++) {
          s.edits.set(\`\${px+dx},\${py-1},\${pz+dz}\`, 1); // grass below
          s.edits.set(\`\${px+dx},\${py},\${pz+dz}\`, 0);
          s.edits.set(\`\${px+dx},\${py+1},\${pz+dz}\`, 0);
        }
      }

      // Place 4-Way connected fence
      s.edits.set(\`\${px},\${py},\${pz-3}\`, 1174);
      s.edits.set(\`\${px-1},\${py},\${pz-3}\`, 1174);
      s.edits.set(\`\${px+1},\${py},\${pz-3}\`, 1174);
      s.edits.set(\`\${px},\${py},\${pz-4}\`, 1174);
      s.edits.set(\`\${px},\${py},\${pz-2}\`, 1174);

      // Place straight line of Birch and Nether brick fences
      s.edits.set(\`\${px-3},\${py},\${pz-3}\`, 1177); // Birch
      s.edits.set(\`\${px-3},\${py},\${pz-4}\`, 1177);
      s.edits.set(\`\${px+3},\${py},\${pz-3}\`, 1184); // Nether brick
      s.edits.set(\`\${px+3},\${py},\${pz-4}\`, 1184);

      if (s.camera) {
        s.camera.position.set(px, py + 1.8, pz);
        s.camera.rotation.set(-0.32, 0, 0);
      }

      // Rebuild chunk mesh
      if (window.__sim?.api?.rebuildDirtyChunks) {
        window.__sim.api.rebuildDirtyChunks();
      }
    })()`,
    returnByValue: true
  });

  await sleep(1500);

  // Hide any remaining overlay divs via DOM query
  await Runtime.evaluate({
    expression: `(() => {
      document.querySelectorAll("div").forEach(d => {
        if (d.innerText && d.innerText.includes("SIM DECK")) d.style.display = "none";
      });
    })()`
  });
  await sleep(500);

  const screenshot = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/fence-fullscreen-view.png", Buffer.from(screenshot.data, "base64"));
  console.log("Saved screenshot to snapshots/fence-fullscreen-view.png");

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
