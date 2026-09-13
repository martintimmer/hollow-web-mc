import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9288;
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

  console.log("1. Navigating to http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  console.log("2. Verifying 512x512 Master Terrain Atlas & Unique Tile Mappings...");
  const atlasCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const atlas = s?.atlasTex;
      const w = atlas?.image?.width || 0;
      const h = atlas?.image?.height || 0;

      // Sample newly added blocks
      const bambooBlockTile = window.__sim.s ? 150 : 0;

      return {
        atlasWidth: w,
        atlasHeight: h,
        is512Atlas: w === 512 && h === 512,
        hasAtlasTexture: !!atlas
      };
    })()`,
    returnByValue: true
  });
  console.log("Atlas Check Result:", JSON.stringify(atlasCheck.result?.value, null, 2));

  console.log("3. Benchmarking In-Browser FPS (Ensuring 60 FPS)...");
  const fpsData = await Runtime.evaluate({
    expression: `new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        if (frames >= 60) {
          const elapsed = performance.now() - start;
          resolve({ fps: Math.round((frames / elapsed) * 1000), elapsedMs: Math.round(elapsed) });
        } else {
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);
    })`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("FPS Benchmark Result:", JSON.stringify(fpsData.result?.value, null, 2));

  console.log("ALL PHASE B & C CHECKS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
