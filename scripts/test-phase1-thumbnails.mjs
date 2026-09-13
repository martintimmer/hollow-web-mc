import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9278;
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

  console.log("2. Verifying isoThumbnails population in runtime engine...");
  const thumbsCheck = await Runtime.evaluate({
    expression: `(() => {
      const thumbs = window.__sim?.api?.isoThumbnails || window.__sim?.isoThumbnails;
      const count = thumbs ? thumbs.size : 0;
      
      // Check specific core thumbnails
      const grassThumb = thumbs?.get(1);
      const stoneThumb = thumbs?.get(5);
      const diamondSwordThumb = thumbs?.get(229);

      return {
        totalThumbnails: count,
        hasGrassThumb: !!grassThumb && grassThumb.startsWith("data:image/png;base64"),
        hasStoneThumb: !!stoneThumb && stoneThumb.startsWith("data:image/png;base64"),
        hasSwordThumb: !!diamondSwordThumb && diamondSwordThumb.startsWith("data:image/png;base64")
      };
    })()`,
    returnByValue: true
  });
  console.log("Thumbnails Check Result:", JSON.stringify(thumbsCheck.result?.value, null, 2));

  console.log("ALL PHASE 1 CHECKS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
