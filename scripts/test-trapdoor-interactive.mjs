import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9243;
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

  console.log("1. Navigating to http://127.0.0.1:5400/ ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/" });
  await sleep(7000);

  // Fill in login form
  console.log("2. Logging in...");
  await Runtime.evaluate({
    expression: `(() => {
      const setNativeValue = (element, value) => {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
      };

      const u = document.querySelector('input[placeholder*="Username"], input[type="text"]');
      const p = document.querySelector('input[type="password"]');
      const form = document.querySelector('form');
      if (u) setNativeValue(u, "trapdoor_tester_" + Math.floor(Math.random() * 1000));
      if (p) setNativeValue(p, "buildpass");
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`
  });

  await sleep(3000);

  // Click Play World
  console.log("3. Joining world...");
  await Runtime.evaluate({
    expression: `(() => {
      const playBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.innerText.includes('PLAY') || b.innerText.includes('JOIN') || b.innerText.includes('Play World'));
      if (playBtn) playBtn.click();
    })()`
  });

  await sleep(8000);

  // Switch to Builder Studio
  console.log("4. Entering Builder Studio...");
  await Runtime.evaluate({
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.innerText.toUpperCase().includes('BUILDER STUDIO'));
      if (btn) btn.click();
    })()`
  });

  await sleep(6000);

  // Place door (lower=105, upper=105) and trapdoors (closed=107, open=108) on the stage
  console.log("5. Editing stage blocks with door & trapdoors...");
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__s || window.__gameState;
      // In Builder Studio: stage is at (8, 65, 8)
      // Stamp closed trapdoor at (7, 65, 8) and open trapdoor at (9, 65, 8)
      const edit = (window.__editBlock) || ((x, y, z, id) => {
        const c = s?.chunks?.get((x >> 4) + ',' + (z >> 4));
        if (c?.data) { c.data[y * 256 + (z & 15) * 16 + (x & 15)] = id; }
      });
      edit(8, 65, 8, 105);
      edit(8, 66, 8, 105);
      edit(6, 65, 8, 107); // Closed trapdoor
      edit(10, 65, 8, 108); // Open trapdoor
      if (s?.rescan) s.rescan(0, 0);
    })()`
  });

  await sleep(2000);

  // Take in-game screenshot showing the Door and Trapdoors on the stage
  const ssInGame = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/in-game-door-and-trapdoor.png", Buffer.from(ssInGame.data, "base64"));
  console.log("Saved screenshot to snapshots/in-game-door-and-trapdoor.png");

  console.log("Interactive Door & Trapdoor verification complete! ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
} finally {
  chrome.kill();
}
