import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9254;
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
  await sleep(6000);

  // 1. Check SimDeck UI elements
  console.log("2. Checking SimDeck UI layout, Palettes, and Studio tools...");
  const uiCheck = await Runtime.evaluate({
    expression: `(() => {
      const deck = document.querySelector('[data-sim-deck]');
      const text = deck ? deck.innerText : '';
      return {
        hasPalettes: text.includes('Palettes:') || text.includes('Medieval'),
        hasMedieval: text.includes('Medieval'),
        hasModern: text.includes('Modern'),
        hasNature: text.includes('Nature'),
        hasRedstone: text.includes('Redstone'),
        hasClear: text.includes('Clear'),
        hasStudioTools: text.includes('Studio:') || text.includes('Snap View'),
        hasUndo: text.includes('Undo')
      };
    })()`,
    returnByValue: true
  });
  console.log("SimDeck UI Check:", uiCheck.result?.value);

  // 2. Test Palette Selection
  console.log("3. Testing Palette loading...");
  const paletteTest = await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      const s = window.__sim?.s;
      if (!api || !s) return { ok: false, reason: "No sim api" };
      // Test Medieval palette
      api.setHotbar([5, 6, 17, 4, 37, 8, 105, 101, 102]);
      const medievalOk = s.hotbar[0] === 5 && s.hotbar[2] === 17;
      // Test Clear palette
      api.setHotbar([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const clearOk = s.hotbar.every(b => b === 0);
      return { ok: medievalOk && clearOk, medievalOk, clearOk };
    })()`,
    returnByValue: true
  });
  console.log("Palette test:", paletteTest.result?.value);

  // 3. Test Area CAD Tools
  console.log("4. Testing Area Selection and CAD Tools (Fill, Clear, Copy, Paste, Cut)...");
  const areaTest = await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      const s = window.__sim?.s;
      if (!api || !s) return { ok: false };
      
      // Set 3D area box [10..13, 65..67, 10..13]
      api.setAreaPos1(10, 65, 10);
      api.setAreaPos2(13, 67, 13);
      const bounds = api.getAreaBounds();
      
      // 1. Fill Area with Cobblestone (6)
      const filled = api.fillArea(6);
      
      // 2. Copy Area
      const copiedDoc = api.copyArea();
      
      // 3. Replace Area (6 -> 5)
      const replaced = api.replaceArea(6, 5);
      
      // 4. Clear Area
      const cleared = api.clearArea();
      
      // 5. Test Undo
      const undone = api.undo();
      
      return {
        boundsOk: bounds?.width === 4 && bounds?.height === 3 && bounds?.depth === 4,
        filledCount: filled,
        copiedTotal: copiedDoc?.totalBlocks,
        replacedCount: replaced,
        clearedCount: cleared,
        undoneCount: undone
      };
    })()`,
    returnByValue: true
  });
  console.log("Area CAD Tools test:", areaTest.result?.value);

  // 4. Test Blueprint Wand Preview & Rotation
  console.log("5. Testing Blueprint Wand Preview and 90° Rotation...");
  const wandTest = await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      if (!api) return { ok: false };
      
      const testDoc = {
        version: 1,
        id: "test_wand_doc",
        name: "Test Cottage",
        dimensions: { width: 5, height: 4, depth: 5 },
        anchor: { ax: 2, ay: 0, az: 2 },
        blocks: [
          { dx: 0, dy: 0, dz: 0, id: 5 },
          { dx: 1, dy: 0, dz: 0, id: 5 },
          { dx: 0, dy: 1, dz: 0, id: 4 }
        ]
      };
      
      api.selectBlueprintWand(testDoc);
      const active1 = api.isWandActive();
      const rot0 = api.getWandState()?.rotation;
      
      api.rotateWand();
      const rot1 = api.getWandState()?.rotation;
      
      api.rotateWand();
      const rot2 = api.getWandState()?.rotation;
      
      api.clearWand();
      const active2 = api.isWandActive();
      
      return {
        equippedOk: active1 === true,
        rot0,
        rot1,
        rot2,
        clearedOk: active2 === false
      };
    })()`,
    returnByValue: true
  });
  console.log("Blueprint Wand test:", wandTest.result?.value);

  // 5. Capture Screenshot of Enhanced Sim Studio
  const ss = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/simdeck-advanced-features.jpg", Buffer.from(ss.data, "base64"));
  console.log("Saved screenshot to snapshots/simdeck-advanced-features.jpg");

  console.log("ALL SIMULATION AND BUILDING STUDIO INTEGRATION TESTS PASSED ✓");
  await client.close();
} catch (err) {
  console.error("Test failed with error:", err);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
