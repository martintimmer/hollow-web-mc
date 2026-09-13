import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

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

  console.log("Navigating to production game...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  // Close SimDeck, place fences, set third-person / front camera
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return;

      // Close SimDeck UI
      s.mapOpen = false;
      const simdeck = document.querySelector(".fixed.inset-0");
      if (simdeck) simdeck.style.display = "none";
      const deckUi = document.querySelector("[data-testid='sim-deck']") || document.querySelector(".bg-neutral-900\\\\/95");
      if (deckUi) deckUi.style.display = "none";

      const px = Math.floor(s.player.x);
      const pz = Math.floor(s.player.z);
      const py = Math.floor(s.player.y);

      // Clear area in front
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -5; dz <= 1; dz++) {
          for (let dy = 0; dy <= 3; dy++) {
            s.edits.set(\`\${px+dx},\${py+dy},\${pz+dz}\`, 0);
          }
        }
      }

      // Build a neat fence setup:
      // 1. A 3-block fence straight line (Oak fence 1174)
      s.edits.set(\`\${px-1},\${py},\${pz-2}\`, 1174);
      s.edits.set(\`\${px},\${py},\${pz-2}\`, 1174);
      s.edits.set(\`\${px+1},\${py},\${pz-2}\`, 1174);

      // 2. A 4-way cross connected fence
      s.edits.set(\`\${px-2},\${py},\${pz-4}\`, 1174);
      s.edits.set(\`\${px-1},\${py},\${pz-4}\`, 1174);
      s.edits.set(\`\${px},\${py},\${pz-4}\`, 1174);
      s.edits.set(\`\${px},\${py},\${pz-5}\`, 1174);
      s.edits.set(\`\${px},\${py},\${pz-3}\`, 1174);

      // 3. A standalone post
      s.edits.set(\`\${px+2},\${py},\${pz-3}\`, 1174);

      // Position camera looking directly down at the fences
      s.player.x = px + 0.5;
      s.player.y = py + 1.2;
      s.player.z = pz;
      s.player.pitch = -0.38;
      s.player.yaw = 0;

      if (s.camera) {
        s.camera.position.set(px + 0.5, py + 2.2, pz + 0.8);
        s.camera.rotation.set(-0.38, 0, 0);
      }

      // Advance one meshing frame
      if (window.__sim?.step) window.__sim.step(0.05);
    })()`,
    returnByValue: true
  });

  await sleep(1500);
  const screenshot = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/fence-clean-in-game.png", Buffer.from(screenshot.data, "base64"));
  console.log("Saved screenshot to snapshots/fence-clean-in-game.png");

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
