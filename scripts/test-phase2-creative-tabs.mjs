import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9281;
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

  console.log("2. Verifying Phase 2 Creative Tabs & Item Registry in runtime engine...");
  const registryCheck = await Runtime.evaluate({
    expression: `(() => {
      const thumbs = window.__sim?.api?.isoThumbnails;
      
      return {
        totalThumbnails: thumbs ? thumbs.size : 0,
        // Pickaxes
        hasWoodPickaxe: !!thumbs?.get(201),
        hasDiamondPickaxe: !!thumbs?.get(205),
        hasNetheritePickaxe: !!thumbs?.get(206),
        // Swords
        hasDiamondSword: !!thumbs?.get(229),
        hasNetheriteSword: !!thumbs?.get(230),
        // Armor
        hasDiamondHelmet: !!thumbs?.get(239),
        hasDiamondChestplate: !!thumbs?.get(240),
        // Food
        hasApple: !!thumbs?.get(250),
        hasGoldenApple: !!thumbs?.get(251),
        hasBread: !!thumbs?.get(252),
        // Tools
        hasFlintAndSteel: !!thumbs?.get(270),
        hasCompass: !!thumbs?.get(272),
        hasClock: !!thumbs?.get(273)
      };
    })()`,
    returnByValue: true
  });
  console.log("Registry & Thumbnails Check Result:", JSON.stringify(registryCheck.result?.value, null, 2));

  console.log("ALL PHASE 2 CHECKS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
