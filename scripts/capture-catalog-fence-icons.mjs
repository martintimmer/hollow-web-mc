import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9291;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--window-size=1920,1080",
  `--remote-debugging-port=${PORT}`,
  "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime, Emulation } = client;
  await Page.enable();
  await Runtime.enable();
  await Emulation.setDeviceMetricsOverride({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log("Navigating to http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return;

      s.slot = 0;
      s.hotbar[0] = 1174;
      s.currentHeldId = -1;
      s.simMode = false;
      if (s.firstPersonArm) s.firstPersonArm.visible = true;
      if (s.heldItemGroup) s.heldItemGroup.visible = true;

      // Select BLOCKS tab
      const blocksTab = Array.from(document.querySelectorAll("button, div")).find(b => b.innerText?.trim() === "BLOCKS");
      if (blocksTab) blocksTab.click();

      // Find search input
      const searchInputs = document.querySelectorAll('input');
      for (const input of searchInputs) {
        if (input.placeholder && input.placeholder.includes("catalog")) {
          // Native value setter for React
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeInputValueSetter.call(input, "fence");
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    })()`
  });

  await sleep(2000);

  const gameSs = await Page.captureScreenshot({ format: "png" });
  fs.writeFileSync("snapshots/oak-fence-catalog-icons-verified.png", Buffer.from(gameSs.data, "base64"));
  console.log("Saved snapshots/oak-fence-catalog-icons-verified.png");

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
