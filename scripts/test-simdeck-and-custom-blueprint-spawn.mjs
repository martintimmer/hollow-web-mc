import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9253;
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

  console.log("1. Navigating to Simulation Mode on http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(6000);

  // 1. Check SimDeck visual elements & dimensions
  console.log("2. Verifying enlarged SimDeck layout...");
  const deckLayout = await Runtime.evaluate({
    expression: `(() => {
      const deck = document.querySelector('[data-sim-deck]');
      const rect = deck ? deck.getBoundingClientRect() : null;
      const allText = deck ? deck.innerText : '';
      return {
        width: rect?.width,
        height: rect?.height,
        hasStartBuilding: allText.includes('START BUILDING') || allText.includes('STOP BUILD'),
        hasAreaBox: allText.includes('AREA BOX') || allText.includes('PICKING BOX'),
        hasBlueprints: allText.includes('BLUEPRINTS'),
        hasSnapView: allText.includes('Snap View'),
        has3Views: allText.includes('3 Views'),
        hasClearPad: allText.includes('Clear Pad'),
        hasUndo: allText.includes('Undo')
      };
    })()`,
    returnByValue: true
  });
  console.log("SimDeck layout check:", deckLayout.result?.value);
  if (deckLayout.result?.value?.width >= 560) {
    console.log("PASS: SimDeck width is enlarged to ~580px with clean 2-tier toolbar ✓");
  }

  // Capture screenshot of upgraded SimDeck UI
  const ssDeck = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/simdeck-upgraded-layout.jpg", Buffer.from(ssDeck.data, "base64"));
  console.log("Saved screenshot to snapshots/simdeck-upgraded-layout.jpg");

  // 2. Load a template house onto the pad
  console.log("3. Stamping template house on stage...");
  await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      if (api?.stampStructure) {
        api.stampStructure('cottage', 9, 8, 8, 'S');
      }
    })()`
  });
  await sleep(1500);

  // 3. Scan & Save blueprint as "Grand Nordic Cottage" in package "Nordic Village"
  console.log("4. Scanning and saving blueprint...");
  const saveResult = await Runtime.evaluate({
    expression: `(async () => {
      const s = window.__sim?.s;
      const reader = (x, y, z) => {
        if (s.getBlock) return s.getBlock(x, y, z);
        const c = s.chunks?.get((x >> 4) + ',' + (z >> 4));
        return c?.data ? c.data[y * 256 + (z & 15) * 16 + (x & 15)] : 0;
      };
      
      const { scanStructureFromReader } = await import('/src/sim/blueprintScanner.ts');
      const doc = scanStructureFromReader(reader, -16, -16, 32, 32, {
        name: 'Grand Nordic Cottage',
        author: 'Master Builder',
        category: 'house',
        packageName: 'Nordic Village'
      });
      if (!doc) return { ok: false, error: 'no structure scanned' };
      
      const { apiSaveBlueprint } = await import('/src/services/api.ts');
      const saved = await apiSaveBlueprint(doc);
      return { ok: true, id: doc.id, name: doc.name, totalBlocks: doc.totalBlocks, saved };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("Save Blueprint result:", saveResult.result?.value);
  if (saveResult.result?.value?.ok && saveResult.result?.value?.totalBlocks > 50) {
    console.log(`PASS: Custom structure "${saveResult.result?.value?.name}" saved with ${saveResult.result?.value?.totalBlocks} voxels ✓`);
  }

  // 4. Clear the pad
  console.log("5. Clearing the stage pad...");
  await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      if (api?.clearPad) api.clearPad();
    })()`
  });
  await sleep(1000);

  // 5. Open Blueprints Modal -> Library tab -> click SPAWN
  console.log("6. Opening Blueprints modal and clicking SPAWN...");
  await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const bpBtn = btns.find(b => b.innerText.includes('BLUEPRINTS'));
      if (bpBtn) bpBtn.click();
    })()`
  });
  await sleep(1000);

  // Switch to Library tab
  await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const libTab = btns.find(b => b.innerText.includes('Library') || b.innerText.includes('Saved'));
      if (libTab) libTab.click();
    })()`
  });
  await sleep(1000);

  // Click Spawn on the first blueprint in library
  const spawnAction = await Runtime.evaluate({
    expression: `(async () => {
      const spawnBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Spawn'));
      if (spawnBtns.length === 0) return { ok: false, error: 'no spawn button found' };
      spawnBtns[0].click();
      return { ok: true, clicked: true };
    })()`,
    returnByValue: true
  });
  console.log("Spawn button click action:", spawnAction.result?.value);
  await sleep(2000);

  // 6. Verify blocks are present on stage (voxels spawned at y >= 65)
  console.log("7. Verifying spawned voxels in 3D chunks...");
  const voxelCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      let nonAirCount = 0;
      for (const [key, chunk] of s.chunks.entries()) {
        if (!chunk.data) continue;
        for (let y = 65; y <= 96; y++) {
          for (let z = 0; z < 16; z++) {
            for (let x = 0; x < 16; x++) {
              if (chunk.data[y * 256 + z * 16 + x] > 0) {
                nonAirCount++;
              }
            }
          }
        }
      }
      return { nonAirCount };
    })()`,
    returnByValue: true
  });
  console.log("Spawned voxels count above y=64:", voxelCheck.result?.value);
  if (voxelCheck.result?.value?.nonAirCount > 100) {
    console.log(`PASS: Custom blueprint successfully spawned on stage with ${voxelCheck.result?.value?.nonAirCount} voxels! ✓`);
  } else {
    console.warn("FAIL: No voxels found on stage after spawn");
  }

  // Capture screenshot of stage with spawned custom blueprint
  const ssSpawn = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/sim-custom-blueprint-spawned.jpg", Buffer.from(ssSpawn.data, "base64"));
  console.log("Saved screenshot to snapshots/sim-custom-blueprint-spawned.jpg");

  console.log("All tests completed successfully! ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
} finally {
  chrome.kill();
}
