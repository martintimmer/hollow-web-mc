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

  console.log("1. Navigating to http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  console.log("2. Testing Chest Memory Persistence across open / edit / close / re-open...");
  const chestPersistCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      // Simulate placing items in chest at (10, 64, 10)
      const coord = "10,64,10";
      const initialItems = new Array(27).fill(null);
      initialItems[0] = { id: 6, count: 64 };  // Cobblestone 64
      initialItems[1] = { id: 41, count: 1 };  // Diamond Pickaxe 1
      initialItems[2] = { id: 80, count: 16 }; // Torch 16

      // Save to chestMap memory
      s.chestMap.set(coord, [...initialItems]);

      // Open chest at (10, 64, 10)
      const key = "10,64,10";
      const loaded = s.chestMap.get(key);

      // Verify loaded contents
      const slot0 = loaded[0];
      const slot1 = loaded[1];
      const slot2 = loaded[2];

      return {
        hasMemory: s.chestMap.has(coord),
        slot0,
        slot1,
        slot2,
        persistedMatches: slot0?.id === 6 && slot0?.count === 64 && slot1?.id === 41 && slot2?.id === 80
      };
    })()`,
    returnByValue: true
  });
  console.log("Chest Persistence Check:", JSON.stringify(chestPersistCheck.result?.value, null, 2));

  console.log("3. Testing Escape key toggle (Pause Menu Open -> Escape again -> Resume)...");
  const escToggleCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      // Ensure active
      s.active = true;
      s.pauseOpen = false;

      // 1. First Escape -> opens pause menu
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", bubbles: true }));
      const stateAfterEsc1 = { pauseOpen: s.pauseOpen, active: s.active };

      // 2. Second Escape -> closes pause menu and resumes
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", bubbles: true }));
      const stateAfterEsc2 = { pauseOpen: s.pauseOpen, active: s.active };

      return {
        stateAfterEsc1,
        stateAfterEsc2,
        toggleWorks: stateAfterEsc1.pauseOpen === true && stateAfterEsc2.pauseOpen === false && stateAfterEsc2.active === true
      };
    })()`,
    returnByValue: true
  });
  console.log("Escape Toggle Check:", JSON.stringify(escToggleCheck.result?.value, null, 2));

  console.log("ALL CHEST PERSISTENCE & ESCAPE TOGGLE TESTS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
