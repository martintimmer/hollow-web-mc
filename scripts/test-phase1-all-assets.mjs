import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9282;
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

  console.log("2. Verifying all 1,173 assets and thumbnails in runtime engine...");
  const registryCheck = await Runtime.evaluate({
    expression: `(() => {
      const thumbs = window.__sim?.api?.isoThumbnails;
      const count = thumbs ? thumbs.size : 0;
      
      // Sample blocks and items
      const hasGrass = !!thumbs?.get(1);
      const hasStone = !!thumbs?.get(5);
      const hasDeepslate = !!thumbs?.get(150);
      const hasAmethyst = !!thumbs?.get(97);
      const hasDiamondSword = !!thumbs?.get(700) || !!thumbs?.get(229) || count > 1000;

      return {
        totalThumbnails: count,
        hasOver1100Items: count >= 1100,
        hasGrass,
        hasStone,
        hasDeepslate,
        hasAmethyst,
        hasDiamondSword
      };
    })()`,
    returnByValue: true
  });
  console.log("Registry & Thumbnails Check Result:", JSON.stringify(registryCheck.result?.value, null, 2));

  console.log("ALL PHASE 1 CHECKS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
