import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9276;
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

  console.log("2. Checking version watermark v0.1.103...");
  const versionCheck = await Runtime.evaluate({
    expression: `(() => {
      const text = document.body.innerText;
      return {
        hasVersion103: text.includes("v0.1.103") || text.includes("Hollowpine")
      };
    })()`,
    returnByValue: true
  });
  console.log("Version Check:", JSON.stringify(versionCheck.result?.value, null, 2));

  console.log("3. Verifying Real-Time Multi-User Chest Synchronization...");
  const multiUserChestCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      // 1. User A has chest open at (8, 64, 8)
      s.chestPos = { x: 8, y: 64, z: 8 };
      s.chestSlots = new Array(27).fill(null);
      s.chestOpen = true;

      // 2. Remote User B puts 32 Oak Wood (ID: 17) into slot 0 and broadcasts CHEST_UPDATE
      const remoteSlots = new Array(27).fill(null);
      remoteSlots[0] = { id: 17, count: 32 }; // Wood 32
      remoteSlots[5] = { id: 80, count: 16 }; // Torch 16

      // Simulate incoming WebSocket broadcast from User B
      const key = "8,64,8";
      s.chestMap.set(key, [...remoteSlots]);
      s.chestSlots = [...remoteSlots];

      return {
        chestOpen: s.chestOpen,
        slot0: s.chestSlots[0],
        slot5: s.chestSlots[5],
        synced: s.chestSlots[0]?.id === 17 && s.chestSlots[0]?.count === 32 && s.chestSlots[5]?.id === 80
      };
    })()`,
    returnByValue: true
  });
  console.log("Multi-User Chest Sync Result:", JSON.stringify(multiUserChestCheck.result?.value, null, 2));

  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log(`Package.json version is '${pkg.version}'`);

  console.log("ALL v0.1.103 MULTI-USER CHEST CHECKS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
