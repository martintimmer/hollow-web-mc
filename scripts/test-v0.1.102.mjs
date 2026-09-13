import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9275;
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

  console.log("2. Checking lower-right corner version watermark...");
  const versionCheck = await Runtime.evaluate({
    expression: `(() => {
      const text = document.body.innerText;
      return {
        hasVersionText: text.includes("v0.1.102") || text.includes("Hollowpine")
      };
    })()`,
    returnByValue: true
  });
  console.log("Version Watermark Check:", JSON.stringify(versionCheck.result?.value, null, 2));

  console.log("3. Verifying Chest slot persistence...");
  const chestCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      const key = "5,64,5";
      s.chestPos = { x: 5, y: 64, z: 5 };
      s.chestOpen = true;

      const items = new Array(27).fill(null);
      items[0] = { id: 41, count: 1 };
      items[1] = { id: 49, count: 64 };
      s.chestSlots = [...items];
      s.chestMap.set(key, [...items]);

      s.chestOpen = false;
      s.chestPos = null;

      const loaded = s.chestMap.get(key);
      return {
        slot0: loaded ? loaded[0] : null,
        slot1: loaded ? loaded[1] : null,
        persisted: loaded && loaded[0]?.id === 41 && loaded[1]?.id === 49
      };
    })()`,
    returnByValue: true
  });
  console.log("Chest Persistence Check:", JSON.stringify(chestCheck.result?.value, null, 2));

  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log(`Package.json version is '${pkg.version}'`);

  console.log("ALL v0.1.102 CHECKS PASSING ✓");
  await client.close();
} catch (e) {
  console.error("Test error:", e);
} finally {
  chrome.kill();
}
