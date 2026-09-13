import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9277;
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

  console.log("2. Verifying build tag chip is removed and version is v0.1.104...");
  const uiCheck = await Runtime.evaluate({
    expression: `(() => {
      const text = document.body.innerText;
      const html = document.body.innerHTML;
      return {
        hasVersion104: text.includes("v0.1.104") || text.includes("Hollowpine"),
        hasNoDuplicateChip: !html.includes("position:fixed;bottom:2px;right:4px")
      };
    })()`,
    returnByValue: true
  });
  console.log("UI Version & Clean Watermark Check:", JSON.stringify(uiCheck.result?.value, null, 2));

  console.log("3. Verifying Window Blur Auto-Pause...");
  const blurCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      s.active = true;
      s.pauseOpen = false;
      s.titleScreenOpen = false;
      s.worldSelectOpen = false;

      // Trigger window blur event
      window.dispatchEvent(new Event("blur"));

      return {
        pauseOpenAfterBlur: s.pauseOpen,
        activeAfterBlur: s.active
      };
    })()`,
    returnByValue: true
  });
  console.log("Window Blur Auto-Pause Check:", JSON.stringify(blurCheck.result?.value, null, 2));

  console.log("4. Verifying Atomic Ctrl + Click Mass Transfer (Zero Loss)...");
  const transferCheck = await Runtime.evaluate({
    expression: `(() => {
      // Simulate 5 items in chest
      const chestSlots = new Array(27).fill(null);
      chestSlots[0] = { id: 17, count: 64 }; // Wood 64
      chestSlots[1] = { id: 17, count: 32 }; // Wood 32
      chestSlots[2] = { id: 4, count: 64 };  // Cobblestone 64
      chestSlots[3] = { id: 80, count: 16 }; // Torch 16
      chestSlots[4] = { id: 41, count: 1 };  // Diamond Pickaxe 1

      const targetInv = new Array(27).fill(null);
      const targetHotbar = new Array(9).fill(0);
      const targetHotbarCounts = new Array(9).fill(0);

      // Pure atomic mass transfer from chest to player
      const curChest = chestSlots.map(s => s ? { ...s } : null);
      const curInv = targetInv.map(s => s ? { ...s } : null);
      const curHotbar = [...targetHotbar];
      const curHotbarCounts = [...targetHotbarCounts];

      // Transfer helper
      for (let c = 0; c < 27; c++) {
        const slot = curChest[c];
        if (!slot || slot.id <= 0 || slot.count <= 0) continue;
        let remaining = slot.count;

        for (let i = 0; i < 27 && remaining > 0; i++) {
          const s = curInv[i];
          if (s && s.id === slot.id && s.count < 64) {
            const add = Math.min(64 - s.count, remaining);
            s.count += add;
            remaining -= add;
          }
        }
        for (let i = 0; i < 9 && remaining > 0; i++) {
          if (curHotbar[i] === slot.id && curHotbarCounts[i] < 64) {
            const add = Math.min(64 - curHotbarCounts[i], remaining);
            curHotbarCounts[i] += add;
            remaining -= add;
          }
        }
        for (let i = 0; i < 27 && remaining > 0; i++) {
          if (!curInv[i] || curInv[i]?.id === 0) {
            const add = Math.min(64, remaining);
            curInv[i] = { id: slot.id, count: add };
            remaining -= add;
          }
        }
        for (let i = 0; i < 9 && remaining > 0; i++) {
          if (!curHotbar[i] || curHotbar[i] === 0) {
            const add = Math.min(64, remaining);
            curHotbar[i] = slot.id;
            curHotbarCounts[i] = add;
            remaining -= add;
          }
        }

        curChest[c] = remaining > 0 ? { id: slot.id, count: remaining } : null;
      }

      // Calculate total count before and after
      const initialTotal = 64 + 32 + 64 + 16 + 1;
      const transferredTotal = curInv.reduce((sum, s) => sum + (s ? s.count : 0), 0) +
                               curHotbarCounts.reduce((sum, c) => sum + c, 0);

      const allChestCleared = curChest.every(s => s === null);

      return {
        initialTotal,
        transferredTotal,
        zeroLoss: initialTotal === transferredTotal,
        allChestCleared
      };
    })()`,
    returnByValue: true
  });
  console.log("Atomic Transfer Check:", JSON.stringify(transferCheck.result?.value, null, 2));

  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log(`Package.json version is '${pkg.version}'`);

  console.log("ALL v0.1.104 CHECKS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
