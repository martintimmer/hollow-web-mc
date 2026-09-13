import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9262;
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
  const { Page, Runtime, Log } = client;
  await Page.enable();
  await Runtime.enable();
  await Log.enable();

  const consoleLogs = [];
  Runtime.consoleAPICalled((params) => {
    consoleLogs.push({ type: params.type, args: params.args.map(a => a.value || a.description) });
  });

  const pageErrors = [];
  Runtime.exceptionThrown((params) => {
    pageErrors.push(params.exceptionDetails);
  });

  console.log("1. Navigating to http://127.0.0.1:5450/ (standard mode)...");
  await Page.navigate({ url: "http://127.0.0.1:5450/" });
  await sleep(5000);

  console.log("2. Inspecting DOM and Canvas...");
  const domState = await Runtime.evaluate({
    expression: `(() => {
      const cv = document.querySelector("canvas");
      const titleScreen = !!document.querySelector("[data-testid='title-screen']") || document.body.innerText.includes("Singleplayer");
      const overlay = document.querySelector(".fixed.inset-0");
      return {
        hasCanvas: !!cv,
        canvasRect: cv ? cv.getBoundingClientRect() : null,
        bodyText: document.body.innerText.slice(0, 300),
        titleScreen,
        overlayClasses: overlay ? overlay.className : null
      };
    })()`,
    returnByValue: true
  });
  console.log("DOM State:", JSON.stringify(domState.result?.value, null, 2));

  console.log("3. Inspecting Sim Engine State...");
  const engineState = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { hasSimState: false };
      return {
        hasSimState: true,
        active: s.active,
        steering: s.steering,
        pointerLocked: s.pointerLocked,
        uiPaused: s.uiPaused,
        menuOpen: s.menuOpen,
        pauseOpen: s.pauseOpen,
        inventoryOpen: s.inventoryOpen,
        player: { ...s.player },
        keys: s.keys,
        currentHeldId: s.currentHeldId,
        offhandItem: s.offhandItem
      };
    })()`,
    returnByValue: true
  });
  console.log("Engine State:", JSON.stringify(engineState.result?.value, null, 2));

  // Try simulating click on canvas
  console.log("4. Simulating click on canvas...");
  const clickResult = await Runtime.evaluate({
    expression: `(() => {
      const cv = document.querySelector("canvas");
      if (!cv) return { ok: false, reason: "no canvas" };
      cv.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 200, clientY: 200, button: 0 }));
      const s = window.__sim?.s;
      return {
        ok: true,
        afterClickActive: s?.active,
        afterClickSteering: s?.steering,
        playerPos: s ? { x: s.player.x, y: s.player.y, z: s.player.z } : null
      };
    })()`,
    returnByValue: true
  });
  console.log("Click Result:", JSON.stringify(clickResult.result?.value, null, 2));

  console.log("5. Simulating WASD movement KeyDown...");
  const moveResult = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { ok: false };
      const startX = s.player.x, startZ = s.player.z;
      
      // Dispatch KeyDown for KeyW
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW", key: "w", bubbles: true }));
      
      return {
        keyW: s.keys["KeyW"],
        keys: Object.keys(s.keys),
        vx: s.player.vx,
        vz: s.player.vz
      };
    })()`,
    returnByValue: true
  });
  console.log("Move Key Result:", JSON.stringify(moveResult.result?.value, null, 2));

  console.log("Console logs:", JSON.stringify(consoleLogs, null, 2));
  console.log("Page exceptions:", JSON.stringify(pageErrors, null, 2));

  await client.close();
} catch (err) {
  console.error("Debug error:", err);
} finally {
  chrome.kill();
}
