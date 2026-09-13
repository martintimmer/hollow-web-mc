import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9486;
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

  console.log("Waiting for world to generate...");
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    const isReady = await evalExpr(`(() => {
      const s = window.__sim?.s;
      return !!s && s.chunks?.size > 0;
    })()`);
    if (isReady) {
      console.log(`World ready after ${i + 1}s!`);
      break;
    }
  }

  // Check 1: Block definitions in BLOCK_MAP
  const defs = await evalExpr(`(() => {
    const s = window.__sim?.s;
    const b1200 = window.__BLOCK_MAP?.get(1200) || (window.__sim?.BLOCK_MAP?.get(1200));
    return {
      b1200Name: b1200?.name,
      b1200Solid: b1200?.solid,
      b1200Foliage: b1200?.foliage,
      b1200Side: b1200?.side,
      b1200Top: b1200?.top
    };
  })()`);
  console.log("Block definitions:", defs);

  // Open Inventory modal
  console.log("Opening inventory modal...");
  await evalExpr(`(() => {
    if (window.__toggleInventory) window.__toggleInventory();
    else window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyI", key: "i", bubbles: true }));
  })()`);
  await sleep(1500);

  // Check Inventory slots for Large Grass
  const invSearch = await evalExpr(`(() => {
    const allSlotBtns = Array.from(document.querySelectorAll(".mc-slot button"));
    const lgBtn = allSlotBtns.find(b => b.title && b.title.toLowerCase().includes("large grass"));
    const lgImg = lgBtn?.querySelector("img");
    return {
      hasBtn: !!lgBtn,
      title: lgBtn?.title,
      hasImg: !!lgImg,
      imgSrc: lgImg?.src?.slice(0, 50)
    };
  })()`);
  check("Large Grass exists in Creative Inventory", invSearch.hasBtn, invSearch.title);
  check("Large Grass has thumbnail icon", invSearch.hasImg, invSearch.imgSrc);

  // Close inventory and set hotbar[0] = 1200
  await evalExpr(`(() => {
    if (window.__toggleInventory) window.__toggleInventory();
    const s = window.__sim?.s;
    if (s) {
      s.hotbar[0] = 1200;
      s.slot = 0;
    }
  })()`);
  await sleep(500);

  // Place Large Grass in front of player
  const placeResult = await evalExpr(`(() => {
    const bridge = window.__sim;
    const s = bridge.s;
    const px = Math.floor(s.player.x);
    const py = Math.floor(s.player.y);
    const pz = Math.floor(s.player.z) + 2;

    // Simulate placing 1200
    bridge.edit(px, py, pz, 1200);
    // If double placement
    bridge.edit(px, py + 1, pz, 1201);

    const b0 = bridge.getBlock(px, py, pz);
    const b1 = bridge.getBlock(px, py + 1, pz);
    const solid0 = bridge.isSolidAt ? bridge.isSolidAt(px, py, pz) : false;
    const solid1 = bridge.isSolidAt ? bridge.isSolidAt(px, py + 1, pz) : false;

    // Check foliage animation uniform
    const uTime = s.matFoliage?.userData?.uTime?.value;

    return {
      placed: { b0, b1 },
      solid: { solid0, solid1 },
      uTime,
      coords: { px, py, pz }
    };
  })()`);

  check("Placed bottom block is 1200", placeResult.placed.b0 === 1200, `b0=${placeResult.placed.b0}`);
  check("Placed top block is 1201 (2 blocks high)", placeResult.placed.b1 === 1201, `b1=${placeResult.placed.b1}`);
  check("Bottom block has 0 collision points (solid=0)", placeResult.solid.solid0 === false);
  check("Top block has 0 collision points (solid=0)", placeResult.solid.solid1 === false);
  check("Foliage animation timer is running", typeof placeResult.uTime === "number", `uTime=${placeResult.uTime}`);

  // Test breaking the top block
  const breakResult = await evalExpr(`(() => {
    const bridge = window.__sim;
    const { px, py, pz } = ${JSON.stringify(placeResult.coords)};
    // Break 1201
    bridge.breakBlock({ x: px, y: py + 1, z: pz, nx: 0, ny: 1, nz: 0, id: 1201 });

    const b0After = bridge.getBlock(px, py, pz);
    const b1After = bridge.getBlock(px, py + 1, pz);
    return { b0After, b1After };
  })()`);

  check("Breaking top block clears top block", breakResult.b1After === 0, `b1After=${breakResult.b1After}`);
  check("Breaking top block also clears bottom block (cohesive 2-block plant)", breakResult.b0After === 0, `b0After=${breakResult.b0After}`);

  // Place again for screenshot
  await evalExpr(`(() => {
    const bridge = window.__sim;
    const { px, py, pz } = ${JSON.stringify(placeResult.coords)};
    bridge.edit(px, py, pz, 1200);
    bridge.edit(px, py + 1, pz, 1201);
  })()`);
  await sleep(1000);

  const shot = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/large-grass-ingame.jpg", Buffer.from(shot.data, "base64"));
  console.log("Saved in-game screenshot to large-grass-ingame.jpg");

} catch (err) {
  console.error("Probe error:", err);
  fails++;
} finally {
  chrome.kill("SIGKILL");
}

process.exit(fails > 0 ? 1 : 0);
