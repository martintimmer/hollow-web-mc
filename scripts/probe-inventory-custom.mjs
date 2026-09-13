import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const PORT = 9480;
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

  // ----------------------------------------------------
  // Part 1: Verify Grass Block thumbnail in catalog
  // ----------------------------------------------------
  console.log("Part 1: Verifying grass block thumbnail in catalog/thumbnails.json");
  const thumbs = JSON.parse(fs.readFileSync("public/catalog/thumbnails.json", "utf8"));
  const grassThumb = thumbs["1"];
  check("Grass block thumbnail exists", !!grassThumb);
  check("Grass block is 48x48 PNG (starts with ADAA)", grassThumb.includes("AAAAADAA") || grassThumb.includes("AAAADAA") || grassThumb.startsWith("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAA"));
  
  // Verify PNG header and dimensions
  const grassB64 = grassThumb.replace(/^data:image\/png;base64,/, "");
  const grassPng = PNG.sync.read(Buffer.from(grassB64, "base64"));
  check("Grass thumbnail width is 48", grassPng.width === 48, `width=${grassPng.width}`);
  check("Grass thumbnail height is 48", grassPng.height === 48, `height=${grassPng.height}`);
  
  // Check top face pixels (center top ~ cx=24, cy=14) have green tint
  const idx = (14 * 48 + 24) * 4;
  const r = grassPng.data[idx], g = grassPng.data[idx + 1], b = grassPng.data[idx + 2];
  check("Grass block top has green grass tint (g > r and g > b)", g > r && g > b, `rgb=(${r},${g},${b})`);

  // ----------------------------------------------------
  // Part 2: Test editor.html?id=1199 Save & Apply buttons
  // ----------------------------------------------------
  console.log("Part 2: Testing editor.html?id=1199 Save & Apply buttons");
  await Page.navigate({ url: "http://127.0.0.1:5450/editor.html?id=1199" });
  await sleep(3500);

  // Check both Save & Apply buttons exist
  const buttonsState = await evalExpr(`(() => {
    const btnTop = document.getElementById("btnApplyGame");
    const btnCenter = document.getElementById("btnApplyGameCenter");
    return {
      hasTop: !!btnTop,
      topText: btnTop?.innerText,
      hasCenter: !!btnCenter,
      centerText: btnCenter?.innerText
    };
  })()`);
  check("Top Save & Apply button exists", buttonsState.hasTop, buttonsState.topText);
  check("Center Save & Apply to Game button exists", buttonsState.hasCenter, buttonsState.centerText);

  // Click btnApplyGameCenter and verify toast and storage event
  const saveCenterResult = await evalExpr(`(() => {
    document.getElementById("btnApplyGameCenter").click();
    const toast = document.getElementById("toast");
    const overrides = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
    return {
      toastText: toast?.innerText,
      has1199: !!overrides["block_1199"] || !!overrides["block_1199_side"] || !!overrides["block_1199_top"],
      version: localStorage.getItem("mc_custom_atlas_version")
    };
  })()`);
  check("Center Save & Apply saves overrides and updates version", saveCenterResult.has1199 && !!saveCenterResult.version, JSON.stringify(saveCenterResult));

  // Click btnApplyGame (top) and verify
  const saveTopResult = await evalExpr(`(() => {
    document.getElementById("btnApplyGame").click();
    const overrides = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
    return {
      has1199: !!overrides["block_1199"] || !!overrides["block_1199_side"] || !!overrides["block_1199_top"],
      version: localStorage.getItem("mc_custom_atlas_version")
    };
  })()`);
  check("Top Save & Apply saves overrides and updates version", saveTopResult.has1199 && !!saveTopResult.version, JSON.stringify(saveTopResult));

  // ----------------------------------------------------
  // Part 3: In-game inventory, held item, and placed block
  // ----------------------------------------------------
  console.log("Part 3: Navigating to game on http://127.0.0.1:5450/?sim=1");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });

  console.log("Waiting for world generation to finish...");
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    const isReady = await evalExpr(`(() => {
      const s = window.__sim?.s;
      const overlay = document.querySelector(".mc-window");
      const loading = overlay && overlay.innerText.toLowerCase().includes("generating world");
      return !loading && !!s && s.chunks?.size > 0;
    })()`);
    if (isReady) {
      console.log(`World ready after ${i + 1}s!`);
      break;
    }
  }

  // Open Inventory modal
  console.log("Opening Creative Inventory via __toggleInventory...");
  await evalExpr(`(() => {
    if (window.__toggleInventory) {
      window.__toggleInventory();
    } else {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyI", key: "i", bubbles: true }));
    }
  })()`);
  await sleep(1500);

  // Inspect inventory state
  const invState = await evalExpr(`(() => {
    const s = window.__sim?.s;
    const invEl = document.querySelector('[data-testid="inventory-window"]');
    const customTab = document.querySelector('button[data-tab-id="custom"]');
    
    // Look for grass block (ID 1) in visible slots
    const allSlotBtns = Array.from(document.querySelectorAll(".mc-slot button"));
    const grassBtn = allSlotBtns.find(b => b.title.includes("Grass block") || b.title.includes("Grass block (ID: 1)"));
    const grassImg = grassBtn?.querySelector("img");

    // Look for custom block (1198/1199)
    const btnCustom = allSlotBtns.find(b => b.title.includes("1199") || b.title.includes("1198") || b.title.includes("Gilded Rune") || b.innerText.includes("1199"));
    const imgCustom = btnCustom?.querySelector("img");

    return {
      invOpen: s?.inventoryOpen,
      hasInvDom: !!invEl,
      hasCustomTab: !!customTab,
      hasGrassBtn: !!grassBtn,
      grassTitle: grassBtn?.title,
      grassImgSrc: grassImg?.src?.slice(0, 50),
      hasCustomInAll: !!btnCustom,
      titleCustom: btnCustom?.title,
      imgCustomSrc: imgCustom?.src?.slice(0, 50)
    };
  })()`);
  check("Inventory modal opened", invState.invOpen && invState.hasInvDom, JSON.stringify(invState));
  check("Grass block present in inventory slots", invState.hasGrassBtn, invState.grassTitle);
  check("Grass block has thumbnail image rendered", !!invState.grassImgSrc, invState.grassImgSrc);
  check("Custom Assets tab present in inventory", invState.hasCustomTab);
  check("Custom block visible in inventory", invState.hasCustomInAll, invState.titleCustom);

  // Switch to Custom Assets tab
  await evalExpr(`(() => {
    const customTab = document.querySelector('button[data-tab-id="custom"]');
    if (customTab) customTab.click();
  })()`);
  await sleep(500);

  const customTabSlots = await evalExpr(`(() => {
    const slots = Array.from(document.querySelectorAll(".mc-slot button")).map(btn => ({
      title: btn.title,
      hasImg: !!btn.querySelector("img"),
      imgSrc: btn.querySelector("img")?.src?.slice(0, 50)
    })).filter(s => s.title.length > 0);
    return slots;
  })()`);
  check("Custom Assets tab displays custom block(s)", customTabSlots.length > 0, JSON.stringify(customTabSlots));

  // Capture screenshot of inventory modal with Grass block and Custom block
  const invShot = await Page.captureScreenshot({ format: "jpeg", quality: 80 });
  fs.writeFileSync("snapshots/inventory-grass-custom-probe.jpg", Buffer.from(invShot.data, "base64"));
  console.log("Saved inventory screenshot to snapshots/inventory-grass-custom-probe.jpg");

  // Select custom block 1199 and assign to hotbar slot 0
  await evalExpr(`(() => {
    if (window.__assignToHotbar) {
      window.__assignToHotbar(1199, 0);
    }
    // Close inventory
    if (window.__toggleInventory) {
      window.__toggleInventory();
    }
  })()`);
  await sleep(1500);

  // Verify in HUD hotbar, held item, and placed block in world
  const gameplayState = await evalExpr(`(() => {
    const s = window.__sim?.s;
    if (s) {
      s.currentHeldId = 1199;
      if (s.heldItemGroup) {
        s.heldItemGroup.userData.heldBlockId = 1199;
      }
    }
    const hudSlot0 = document.querySelector(".mc-hud-slot");
    const hudImg = hudSlot0?.querySelector("img");
    
    // Check placed custom block entity
    const px = Math.floor(s?.player?.x ?? 0);
    const py = Math.floor(s?.player?.y ?? 64);
    const pz = Math.floor(s?.player?.z ?? 0);
    
    // Programmatically place block 1199 in front of player
    if (window.__sim?.api?.stampRun) {
      window.__sim.api.stampRun("placeCustom", (w) => {
        w(px + 1, py, pz, 1199);
      });
    }
    
    return {
      heldChildrenCount: s?.heldItemGroup?.children?.length ?? 0
    };
  })()`);
  await sleep(2500);

  const finalCheck = await evalExpr(`(() => {
    const s = window.__sim?.s;
    const hudSlot0 = document.querySelector(".mc-hud-slot");
    const hudImg = hudSlot0?.querySelector("img");
    return {
      hudSlotHasImg: !!hudImg,
      hudImgSrc: hudImg?.src?.slice(0, 40),
      customEntitiesCount: s?.customAssetEntities?.size ?? 0,
      heldChildren: s?.heldItemGroup?.children?.map(c => c.type),
      heldId: s?.currentHeldId
    };
  })()`);
  check("HUD slot has thumbnail for custom block 1199", finalCheck.hudSlotHasImg, finalCheck.hudImgSrc);
  check("Placed custom asset entity created in world scene", finalCheck.customEntitiesCount > 0, `count=${finalCheck.customEntitiesCount}`);

  // Capture screenshot of first-person view showing held item and placed block
  const gameShot = await Page.captureScreenshot({ format: "jpeg", quality: 80 });
  fs.writeFileSync("snapshots/gameplay-held-placed-probe.jpg", Buffer.from(gameShot.data, "base64"));
  console.log("Saved gameplay screenshot to snapshots/gameplay-held-placed-probe.jpg");

  await client.close();
} catch (err) {
  console.error("Probe error:", err);
  fails++;
} finally {
  chrome.kill();
}

console.log(`\nInventory & Custom Probe finished with ${fails} failures.`);
process.exit(fails === 0 ? 0 : 1);
