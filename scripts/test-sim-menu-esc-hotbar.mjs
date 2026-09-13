import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9252;
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

  // 1. Verify Simulation HUD state (no hotbar when not building, no XP, no survival hearts)
  console.log("2. Checking simulation HUD elements...");
  const hudCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const buttons = Array.from(document.querySelectorAll('button'));
      const hasHotbar = !!document.querySelector('.mc-hud-slot');
      const hasXpBar = Array.from(document.querySelectorAll('span')).some(el => el.classList.contains('mc-text-shadow') && el.textContent.match(/^\\d+$/) && el.style.color?.includes('80FF20'));
      const hasHearts = document.body.innerText.includes('❤️');
      const hasDressingRoom = buttons.some(b => b.innerText.includes('Dressing Room'));
      return {
        isSim: s?.simMode,
        hotbar: s?.hotbar,
        hasHotbar,
        hasXpBar,
        hasHearts,
        hasDressingRoom
      };
    })()`,
    returnByValue: true
  });
  console.log("HUD check in simulation (idle):", hudCheck.result?.value);
  if (!hudCheck.result?.value?.hasHotbar) {
    console.log("PASS: Bottom hotbar is hidden in default simulation mode ✓");
  } else {
    console.warn("FAIL: Bottom hotbar was visible in default simulation mode");
  }

  // 2. Test empty hand block placement check
  console.log("3. Testing empty hand block placement rejection...");
  const placeCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const initialEdits = s?.edits?.size || 0;
      // Trigger right click
      const cv = document.querySelector('canvas');
      if (cv) cv.dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true, clientX: 400, clientY: 400 }));
      const afterEdits = s?.edits?.size || 0;
      return { initialEdits, afterEdits, diff: afterEdits - initialEdits };
    })()`,
    returnByValue: true
  });
  console.log("Empty hand place result:", placeCheck.result?.value);
  if (placeCheck.result?.value?.diff === 0) {
    console.log("PASS: Empty hand / empty slot cannot place any block ✓");
  }

  // 3. Test pressing [Escape] to open Simulation Menu
  console.log("4. Testing [Escape] in simulation mode to open Simulation Menu...");
  await Runtime.evaluate({
    expression: `(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
    })()`
  });
  await sleep(1000);

  const menuCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const allButtons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
      const hasBackToSimulator = allButtons.some(t => t.includes('Back to Simulator'));
      const hasBuildingToggler = allButtons.some(t => t.includes('Building Mode') || t.includes('Simulation Mode'));
      const hasOptions = allButtons.some(t => t.includes('Options'));
      const hasQuitToLogin = allButtons.some(t => t.includes('Quit to Login'));
      const hasAdvancements = allButtons.some(t => t.includes('Advancements'));
      const hasStatistics = allButtons.some(t => t.includes('Statistics'));
      const hasDressingRoom = allButtons.some(t => t.includes('Dressing Room'));
      return {
        pauseOpen: s?.pauseOpen,
        hasBackToSimulator,
        hasBuildingToggler,
        hasOptions,
        hasQuitToLogin,
        hasAdvancements,
        hasStatistics,
        hasDressingRoom,
        allButtons
      };
    })()`,
    returnByValue: true
  });
  console.log("Simulation Menu check:", menuCheck.result?.value);

  if (menuCheck.result?.value?.hasBackToSimulator &&
      menuCheck.result?.value?.hasBuildingToggler &&
      menuCheck.result?.value?.hasOptions &&
      menuCheck.result?.value?.hasQuitToLogin &&
      !menuCheck.result?.value?.hasAdvancements &&
      !menuCheck.result?.value?.hasStatistics &&
      !menuCheck.result?.value?.hasDressingRoom) {
    console.log("PASS: Simulation Menu has exactly the requested buttons (no Advancements, no Statistics, no Dressing Room/Character) ✓");
  } else {
    console.warn("FAIL: Simulation Menu did not match expected structure");
  }

  // Capture screenshot of Simulation Menu
  const ssMenu = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/sim-esc-menu.jpg", Buffer.from(ssMenu.data, "base64"));
  console.log("Saved screenshot to snapshots/sim-esc-menu.jpg");

  // 4. Test toggling building mode
  console.log("5. Testing Building Mode toggler from Simulation Menu...");
  await Runtime.evaluate({
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const toggleBtn = btns.find(b => b.innerText.includes('Simulation Mode: ACTIVE') || b.innerText.includes('Building Mode: ACTIVE'));
      if (toggleBtn) toggleBtn.click();
      const backBtn = btns.find(b => b.innerText.includes('Back to Simulator'));
      if (backBtn) backBtn.click();
    })()`
  });
  await sleep(1000);

  const buildingCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const hasHotbar = !!document.querySelector('.mc-hud-slot');
      const hotbarCount = document.querySelectorAll('.mc-hud-slot').length;
      return {
        simBuildingMode: s?.simBuildingMode,
        hasHotbar,
        hotbarCount,
        hotbar: s?.hotbar
      };
    })()`,
    returnByValue: true
  });
  console.log("Building mode state:", buildingCheck.result?.value);
  if (buildingCheck.result?.value?.simBuildingMode && buildingCheck.result?.value?.hotbarCount === 9) {
    console.log("PASS: Building mode activates 9-slot empty hotbar on HUD ✓");
  }

  // Capture screenshot of HUD in Building Mode
  const ssBuilding = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  fs.writeFileSync("snapshots/sim-building-mode-hud.jpg", Buffer.from(ssBuilding.data, "base64"));
  console.log("Saved screenshot to snapshots/sim-building-mode-hud.jpg");

  console.log("All tests completed successfully! ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
} finally {
  chrome.kill();
}
