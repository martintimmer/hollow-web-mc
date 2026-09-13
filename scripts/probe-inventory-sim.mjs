import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9498;
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
  const { Page, Runtime, Emulation } = client;
  await Page.enable();
  await Runtime.enable();
  await Emulation.setDeviceMetricsOverride({
    width: 1400,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  const evalExpr = async (expr) => {
    const res = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || "Eval error");
    return res.result?.value;
  };

  console.log("Navigating to http://127.0.0.1:5400/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/?sim=1" });

  for (let i = 0; i < 25; i++) {
    await sleep(1000);
    const ready = await evalExpr(`(() => {
      const overlay = document.querySelector(".mc-window");
      const loading = overlay && overlay.innerText.toLowerCase().includes("generating");
      return !loading;
    })()`);
    if (ready) {
      console.log(`World generated after ${i + 1}s!`);
      break;
    }
  }

  await sleep(1000);

  // Open inventory
  console.log("Opening inventory modal...");
  await evalExpr(`(() => {
    if (window.__toggleInventory) window.__toggleInventory();
  })()`);
  await sleep(1200);

  // Search "Grass" in inventory search input
  await evalExpr(`(() => {
    const search = document.querySelector('input[type="search"]') || document.querySelector('input[placeholder*="Search"]');
    if (search) {
      search.value = "Grass";
      search.dispatchEvent(new Event("input", { bubbles: true }));
    }
  })()`);
  await sleep(1000);

  const inventorySlots = await evalExpr(`(() => {
    const btns = Array.from(document.querySelectorAll(".mc-slot button"));
    return btns.map(b => ({
      title: b.title,
      img: b.querySelector("img")?.src?.slice(0, 40)
    })).filter(b => b.title && b.title.toLowerCase().includes("grass"));
  })()`);

  console.log("Matching inventory slots:", inventorySlots);

  const shot = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/inventory-grass-modal.jpg", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot to inventory-grass-modal.jpg");

} catch (err) {
  console.error("Probe error:", err);
} finally {
  chrome.kill("SIGKILL");
}
