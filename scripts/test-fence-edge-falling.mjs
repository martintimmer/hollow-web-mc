import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";

const PORT = 9272;
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

  const testResult = await Runtime.evaluate({
    expression: `(() => {
      try {
        const s = window.__sim?.s;
        if (!s) return { ok: false, reason: "No sim" };

        s.active = true;
        s.steering = true;

        const px = 10, py = 64, pz = 10;
        s.edits.set(\`\${px},\${py-1},\${pz}\`, 1);
        s.edits.set(\`\${px},\${py},\${pz}\`, 1174);

        s.player.x = 10.5;
        s.player.y = 65.5;
        s.player.z = 10.5;
        s.player.vx = 0;
        s.player.vy = 0;
        s.player.vz = 0;
        s.player.ground = true;

        for (let i = 0; i < 10; i++) {
          if (window.__sim?.step) window.__sim.step(0.016);
        }
        const standingY = Number(s.player.y.toFixed(4));
        const standingGrounded = s.player.ground;

        // Player moves off fence post
        s.player.vx = 2.5;
        s.keys["KeyD"] = true;

        const fallHistory = [];
        for (let i = 0; i < 40; i++) {
          if (window.__sim?.step) window.__sim.step(0.016);
          fallHistory.push({
            x: Number(s.player.x.toFixed(3)),
            y: Number(s.player.y.toFixed(3)),
            vy: Number(s.player.vy.toFixed(3)),
            ground: s.player.ground
          });
        }

        const finalY = s.player.y;
        const fellDown = finalY < standingY - 0.5;

        return {
          ok: true,
          standingY,
          standingGrounded,
          fellDown,
          finalY: Number(finalY.toFixed(3)),
          fallHistoryCount: fallHistory.length,
          last5: fallHistory.slice(-5)
        };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    })()`,
    returnByValue: true
  });

  console.log("Fence Edge Falling Result:", JSON.stringify(testResult.result?.value, null, 2));
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
  process.exit(0);
}
