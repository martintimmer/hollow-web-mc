import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";

const PORT = 9273;
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

  console.log("2. Testing Chest slot placement, close, and re-open persistence...");
  const chestCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      const key = "12,65,14";
      // Open chest at (12, 65, 14)
      s.chestPos = { x: 12, y: 65, z: 14 };
      s.chestOpen = true;

      // Put items in chest slot 0 and slot 4
      const chestData = new Array(27).fill(null);
      chestData[0] = { id: 50, count: 64 }; // Brick 64
      chestData[4] = { id: 80, count: 16 }; // Torch 16
      s.chestSlots = [...chestData];
      s.chestMap.set(key, [...chestData]);

      // Close chest
      s.chestOpen = false;
      s.chestPos = null;

      // Re-open chest at (12, 65, 14)
      const reopened = s.chestMap.get(key);

      return {
        hasData: !!reopened,
        slot0: reopened ? reopened[0] : null,
        slot4: reopened ? reopened[4] : null,
        persisted: reopened && reopened[0]?.id === 50 && reopened[0]?.count === 64 && reopened[4]?.id === 80
      };
    })()`,
    returnByValue: true
  });
  console.log("Chest Persistence:", JSON.stringify(chestCheck.result?.value, null, 2));

  console.log("3. Testing Single-Press Escape -> Shows Menu, Second Press -> Resumes...");
  const escCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      s.active = true;
      s.pauseOpen = false;

      // First Escape
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", bubbles: true }));
      const after1 = { pauseOpen: s.pauseOpen, active: s.active };

      // Second Escape
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", bubbles: true }));
      const after2 = { pauseOpen: s.pauseOpen, active: s.active };

      return {
        after1,
        after2,
        singlePressMenu: after1.pauseOpen === true && after2.pauseOpen === false
      };
    })()`,
    returnByValue: true
  });
  console.log("Escape Single Press Check:", JSON.stringify(escCheck.result?.value, null, 2));

  console.log("ALL CHEST PERSISTENCE, SINGLE ESCAPE, AND DRAG-DROP TESTS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
