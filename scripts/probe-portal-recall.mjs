import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9484;
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

  // 1. Clear any previous portals for clean test
  await evalExpr(`(() => {
    localStorage.removeItem("hollowpine_portals_default");
  })()`);

  // 2. Open Portal Modal at (10, 64, 20)
  console.log("Testing portal placement at (10, 64, 20)...");
  await evalExpr(`(() => {
    window.__openPortalModal(10, 64, 20);
  })()`);
  await sleep(600);

  const modal1Open = await evalExpr(`(() => {
    return document.getElementById("portalNameInput") !== null;
  })()`);
  check("Portal Modal opened on placement", modal1Open);

  // Set name to "Base Alpha" via native setter
  await evalExpr(`(() => {
    const inp = document.getElementById("portalNameInput");
    if (inp) {
      const setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setVal.call(inp, "Base Alpha");
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const chk = document.getElementById("setAsHomeCheckbox");
    if (chk && !chk.checked) chk.click();
  })()`);
  await sleep(300);

  const shotModal1 = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/portal-modal-1.jpg", Buffer.from(shotModal1.data, "base64"));
  console.log("Saved portal-modal-1.jpg");

  await evalExpr(`(() => {
    const btn = document.getElementById("btnSavePortal");
    if (btn) btn.click();
  })()`);
  await sleep(600);

  const portalsAfter1 = await evalExpr(`(() => window.__getPortalsList())()`);
  const homeAfter1 = await evalExpr(`(() => window.__getHomePortal())()`);
  console.log("Portals after 1st save:", portalsAfter1);
  check("Portal 1 saved in list", portalsAfter1?.length === 1, `count=${portalsAfter1?.length}`);
  check("Portal 1 name is Base Alpha", portalsAfter1?.[0]?.name === "Base Alpha", `name=${portalsAfter1?.[0]?.name}`);
  check("Portal 1 is marked as Home", homeAfter1?.name === "Base Alpha" && homeAfter1?.isHome === true);

  // 3. Place second portal at (50, 70, 80)
  console.log("Testing second portal placement at (50, 70, 80)...");
  await evalExpr(`(() => {
    window.__openPortalModal(50, 70, 80);
  })()`);
  await sleep(600);

  // Set name to "Mining Outpost" and uncheck Home
  await evalExpr(`(() => {
    const inp = document.getElementById("portalNameInput");
    if (inp) {
      const setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setVal.call(inp, "Mining Outpost");
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const chk = document.getElementById("setAsHomeCheckbox");
    if (chk && chk.checked) chk.click();
  })()`);
  await sleep(300);

  const shotModal2 = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/portal-modal-2.jpg", Buffer.from(shotModal2.data, "base64"));
  console.log("Saved portal-modal-2.jpg");

  await evalExpr(`(() => {
    const btn = document.getElementById("btnSavePortal");
    if (btn) btn.click();
  })()`);
  await sleep(600);

  const portalsAfter2 = await evalExpr(`(() => window.__getPortalsList())()`);
  const homeAfter2 = await evalExpr(`(() => window.__getHomePortal())()`);
  console.log("Portals after 2nd save:", portalsAfter2);
  check("Multiple spawn points saved (length = 2)", portalsAfter2?.length === 2, `count=${portalsAfter2?.length}`);
  check("Base Alpha remains primary Home", homeAfter2?.name === "Base Alpha");

  // 4. Move player away to (100, 65, 100)
  await evalExpr(`(() => {
    const s = window.__sim?.s;
    if (s) {
      s.player.x = 100;
      s.player.y = 65;
      s.player.z = 100;
    }
  })()`);

  // 5. Trigger Recall Modal (R key)
  console.log("Triggering Recall Modal ('R' key)...");
  await evalExpr(`(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyR", bubbles: true }));
  })()`);
  await sleep(600);

  const recallModalVisible = await evalExpr(`(() => {
    return document.getElementById("btnRecallConfirm") !== null;
  })()`);
  check("Recall Modal 'Spawn Home?' appeared on R key", recallModalVisible);

  const shotRecall = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/recall-modal-open.jpg", Buffer.from(shotRecall.data, "base64"));
  console.log("Saved recall-modal-open.jpg");

  // 6. Test Cancel button
  await evalExpr(`(() => {
    const cancelBtn = document.getElementById("btnRecallCancel");
    if (cancelBtn) cancelBtn.click();
  })()`);
  await sleep(400);

  const playerPosAfterCancel = await evalExpr(`(() => {
    const s = window.__sim?.s;
    return { x: s?.player.x, z: s?.player.z };
  })()`);
  check("Cancel does not teleport player", Math.floor(playerPosAfterCancel?.x) === 100);

  // 7. Trigger R key again and click OK to Recall Home
  await evalExpr(`(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyR", bubbles: true }));
  })()`);
  await sleep(600);

  await evalExpr(`(() => {
    const okBtn = document.getElementById("btnRecallConfirm");
    if (okBtn) okBtn.click();
  })()`);
  await sleep(600);

  const playerPosAfterRecall = await evalExpr(`(() => {
    const s = window.__sim?.s;
    return { x: s?.player.x, y: s?.player.y, z: s?.player.z };
  })()`);
  console.log("Player position after recall:", playerPosAfterRecall);
  check("Player recalled to Home X (10.5)", Math.floor(playerPosAfterRecall?.x) === 10, `x=${playerPosAfterRecall?.x}`);
  check("Player recalled to Home Z (20.5)", Math.floor(playerPosAfterRecall?.z) === 20, `z=${playerPosAfterRecall?.z}`);

  const shotRecalled = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/recalled-home.jpg", Buffer.from(shotRecalled.data, "base64"));
  console.log("Saved recalled-home.jpg");

} catch (err) {
  console.error("Probe error:", err);
  fails++;
} finally {
  chrome.kill("SIGKILL");
}

process.exit(fails > 0 ? 1 : 0);
