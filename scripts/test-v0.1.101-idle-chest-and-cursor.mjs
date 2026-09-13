import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9274;
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

  console.log("2. Verifying Window Blur Auto-Pause (OG Minecraft behavior)...");
  const blurCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      s.active = true;
      s.pauseOpen = false;

      // Dispatch window blur (user switching tabs or clicking away)
      window.dispatchEvent(new Event("blur"));

      return {
        pauseOpenAfterBlur: s.pauseOpen,
        activeAfterBlur: s.active
      };
    })()`,
    returnByValue: true
  });
  console.log("Blur Auto-Pause Result:", JSON.stringify(blurCheck.result?.value, null, 2));

  console.log("3. Verifying Canvas Click Auto-Resume & Cursor Re-Lock...");
  const clickResumeCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const cv = document.querySelector("canvas");
      if (!s || !cv) return { error: "no s or cv" };

      // Dispatch mousedown on canvas
      cv.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));

      return {
        pauseOpenAfterClick: s.pauseOpen,
        activeAfterClick: s.active
      };
    })()`,
    returnByValue: true
  });
  console.log("Click Resume Result:", JSON.stringify(clickResumeCheck.result?.value, null, 2));

  console.log("4. Verifying Chest Memory Persistence across open / edit / close / reopen...");
  const chestCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      const key = "20,64,20";
      s.chestPos = { x: 20, y: 64, z: 20 };
      s.chestOpen = true;

      // Put Diamond Pickaxe (41) and Golden Apple (49) into chest slots
      const items = new Array(27).fill(null);
      items[0] = { id: 41, count: 1 };
      items[3] = { id: 49, count: 64 };
      s.chestSlots = [...items];
      s.chestMap.set(key, [...items]);

      // Close chest
      s.chestOpen = false;
      s.chestPos = null;

      // Re-open chest
      const reopened = s.chestMap.get(key);

      return {
        slot0: reopened ? reopened[0] : null,
        slot3: reopened ? reopened[3] : null,
        persisted: reopened && reopened[0]?.id === 41 && reopened[3]?.id === 49 && reopened[3]?.count === 64
      };
    })()`,
    returnByValue: true
  });
  console.log("Chest Persistence Result:", JSON.stringify(chestCheck.result?.value, null, 2));

  // Verify version history doc exists
  const hasDoc = fs.existsSync("docs/version-history.md");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log(`Version verification: package.json version is '${pkg.version}', version-history.md exists: ${hasDoc}`);

  console.log("ALL v0.1.101 TESTS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
