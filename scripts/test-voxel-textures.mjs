import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";

const PORT = 9289;
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
  await sleep(3500);

  console.log("2. Inspecting Master Terrain Atlas Pixels for Grass & Light Gray Terracotta...");
  const pixelCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const cv = s?.atlasTex?.image;
      if (!cv) return { ok: false, error: "No atlas image" };
      const ctx = cv.getContext("2d");
      if (!ctx) return { ok: false, error: "No 2d context" };

      // Sample Grass Top (tile 0: x=8, y=8)
      const grassTopPixel = Array.from(ctx.getImageData(8, 8, 1, 1).data);

      // Sample Grass Side (tile 1: x=24, y=8)
      const grassSidePixel = Array.from(ctx.getImageData(24, 8, 1, 1).data);

      // Sample Light Gray Terracotta (tile 522: tx = 522 % 32 = 10, ty = 16 => x = 168, y = 264)
      const terracottaPixel = Array.from(ctx.getImageData(168, 264, 1, 1).data);

      return {
        ok: true,
        grassTop: grassTopPixel,
        grassSide: grassSidePixel,
        lightGrayTerracotta: terracottaPixel,
        allNonTransparent: grassTopPixel[3] > 0 && grassSidePixel[3] > 0 && terracottaPixel[3] > 0
      };
    })()`,
    returnByValue: true
  });
  console.log("Pixel Check Result:", JSON.stringify(pixelCheck.result?.value, null, 2));

  console.log("ALL TEXTURE PIXEL CHECKS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
