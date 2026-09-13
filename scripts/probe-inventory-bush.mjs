import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9482;
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

let fails = 0;
const check = (label, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} · ${label} ${detail}`);
  if (!cond) fails++;
};

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

  // Test stamping Tropical Bush (1202)
  const stampResult = await evalExpr(`(() => {
    const api = window.__sim?.api;
    const s = window.__sim?.s;
    if (!api || !s) return { error: "no sim api" };

    const px = Math.floor(s.player.x);
    const pz = Math.floor(s.player.z);

    // Stamp Tropical Bush at px + 1, pz + 2
    const r1202 = api.stampBlock(1202, px + 1, pz + 2);

    // Assign Tropical Bush to hotbar slot 0
    s.hotbar[0] = 1202;
    s.slot = 0;
    if (s.updateHeldItem) s.updateHeldItem();

    // Check collision & foliage flags
    const b1202 = window.__BLOCK_MAP?.get(1202);
    const b1203 = window.__BLOCK_MAP?.get(1203);

    return {
      r1202,
      b1202: { name: b1202?.name, solid: b1202?.solid, foliage: b1202?.foliage },
      b1203: { name: b1203?.name, solid: b1203?.solid, foliage: b1203?.foliage }
    };
  })()`);

  console.log("Stamp result:", stampResult);
  check("Tropical Bush stamped (2 voxels for 2-block structure)", stampResult?.r1202?.voxels === 2, `voxels=${stampResult?.r1202?.voxels}`);
  check("Tropical Bush solid is 0 (pass-through / no collision)", stampResult?.b1202?.solid === 0);
  check("Tropical Bush foliage is 1 (animated wind sway)", stampResult?.b1202?.foliage === 1);
  check("Tropical Bush Top solid is 0", stampResult?.b1203?.solid === 0);
  check("Tropical Bush Top foliage is 1", stampResult?.b1203?.foliage === 1);

  // Open inventory and search Tropical Bush
  await evalExpr(`(() => {
    if (window.__toggleInventory) window.__toggleInventory();
  })()`);
  await sleep(1200);

  await evalExpr(`(() => {
    const search = document.querySelector('input[type="search"]') || document.querySelector('input[placeholder*="Search"]');
    if (search) {
      search.value = "Tropical";
      search.dispatchEvent(new Event("input", { bubbles: true }));
    }
  })()`);
  await sleep(1000);

  const invSlots = await evalExpr(`(() => {
    const btns = Array.from(document.querySelectorAll(".mc-slot button"));
    return btns.map(b => ({
      title: b.title,
      img: b.querySelector("img")?.src?.slice(0, 40)
    })).filter(b => b.title && b.title.toLowerCase().includes("tropical bush"));
  })()`);

  console.log("Matching inventory slots for Tropical Bush:", invSlots);
  check("Tropical Bush found in inventory", invSlots.length > 0, JSON.stringify(invSlots));

  const shot = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/ingame-tropical-bush-modal.jpg", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot to ingame-tropical-bush-modal.jpg");

} catch (err) {
  console.error("Probe error:", err);
  fails++;
} finally {
  chrome.kill("SIGKILL");
}

process.exit(fails > 0 ? 1 : 0);
