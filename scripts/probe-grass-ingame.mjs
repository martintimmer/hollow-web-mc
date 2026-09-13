import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9495;
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
  const { Page, Runtime, Emulation } = client;
  await Page.enable();
  await Runtime.enable();
  await Emulation.setDeviceMetricsOverride({
    width: 1400,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  const evalExpr = async (expr) => {
    const res = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || "Eval error");
    return res.result?.value;
  };

  console.log("Navigating to http://127.0.0.1:5400/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/?sim=1" });

  for (let i = 0; i < 25; i++) {
    await sleep(1000);
    const ready = await evalExpr(`(() => {
      const overlay = document.querySelector(".mc-window");
      const loading = overlay && overlay.innerText.toLowerCase().includes("generating");
      return !loading;
    })()`);
    if (ready) {
      console.log(`World generated after ${i + 1}s!`);
      break;
    }
  }

  await sleep(1500);

  // Close sim deck sidebar for clean view
  await evalExpr(`(() => {
    const api = window.__sim?.api;
    const s = window.__sim?.s;
    if (api && s) {
      const px = Math.floor(s.player.x);
      const pz = Math.floor(s.player.z);
      // Stamp Short Grass (124) and High Grass (1200) in front of camera
      api.stampBlock(124, px + 1, pz + 2);
      api.stampBlock(1200, px - 1, pz + 2);

      // Assign High Grass (1200) to hotbar slot 0
      window.__assignToHotbar?.(0, 1200);
    }
  })()`);

  await sleep(1500);

  const shot = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/ingame-grass-world.jpg", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot to ingame-grass-world.jpg");

} catch (err) {
  console.error("Probe error:", err);
} finally {
  chrome.kill("SIGKILL");
}
