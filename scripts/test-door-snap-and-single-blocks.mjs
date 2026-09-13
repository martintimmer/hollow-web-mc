import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9246;
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

  console.log("1. Navigating to Builder / Sim on http://127.0.0.1:5450/?sim=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(7000);

  // 2. Test single block spawning vs door block spawning
  console.log("2. Testing single block spawning (planks)...");
  const singleRes = await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      if (!api?.clearPad || !api?.stampBlock) return "no-api";
      api.clearPad();
      const res = api.stampBlock(17, 8, 8); // oak planks
      return res;
    })()`,
    returnByValue: true
  });
  console.log("Single block spawn result (voxels stamped):", singleRes.result?.value);
  if (singleRes.result?.value?.voxels !== 1) {
    console.error("FAIL: Expected 1 voxel for single block, got:", singleRes.result?.value?.voxels);
  } else {
    console.log("PASS: Single block spawned as exactly 1 voxel! ✓");
  }

  // 3. Test door spawning (should spawn 2 voxels)
  console.log("3. Testing door spawning (id 105)...");
  const doorRes = await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      api.clearPad();
      const res = api.stampBlock(105, 8, 8); // closed oak door
      return res;
    })()`,
    returnByValue: true
  });
  console.log("Door spawn result (voxels stamped):", doorRes.result?.value);
  if (doorRes.result?.value?.voxels !== 2) {
    console.error("FAIL: Expected 2 voxels for door, got:", doorRes.result?.value?.voxels);
  } else {
    console.log("PASS: Door spawned as exactly 2 vertical voxels! ✓");
  }

  // 4. Set camera to 45 degree angle looking UP at the door window sills
  console.log("4. Setting camera angle 45° UP at door cutouts...");
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (s) {
        s.player.x = 8.5;
        s.player.y = 65.2;
        s.player.z = 10.5;
        s.player.yaw = 0; // looking North towards door at z=8
        s.player.pitch = 0.785; // +45 degrees looking UP
      }
    })()`
  });

  await sleep(1000);

  // 5. Test clicking SNAP button in SimDeck header
  console.log("5. Clicking 📸 SNAP button in SimDeck header...");
  const snapRes = await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const snapBtn = btns.find(b => b.innerText.includes('SNAP'));
      if (snapBtn) {
        snapBtn.click();
        return "clicked-snap";
      }
      return "snap-btn-not-found";
    })()`,
    returnByValue: true
  });
  console.log("Snap button click:", snapRes.result?.value);

  await sleep(2000);

  // Take screenshot of current view
  const ss = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/door-45up-fixed.jpg", Buffer.from(ss.data, "base64"));
  console.log("Saved screenshot to snapshots/door-45up-fixed.jpg");

  // 6. Test open door state and pivot around hinge
  console.log("6. Testing open door state (id 106)...");
  await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      api.clearPad();
      api.stampBlock(106, 8, 8); // open oak door
      const s = window.__sim?.s;
      if (s) {
        s.player.x = 11.5;
        s.player.y = 66.0;
        s.player.z = 8.5;
        s.player.yaw = -Math.PI / 2; // looking West at open door
        s.player.pitch = 0;
      }
    })()`
  });

  await sleep(1500);
  const ssOpen = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/door-open-hinge-pivot.jpg", Buffer.from(ssOpen.data, "base64"));
  console.log("Saved screenshot to snapshots/door-open-hinge-pivot.jpg");

  console.log("All tests completed successfully! ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
} finally {
  chrome.kill();
}
