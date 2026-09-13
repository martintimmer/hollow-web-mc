import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9380;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--enable-unsafe-swiftshader",
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
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });

  const consoleErrors = [];
  Runtime.consoleAPICalled((p) => {
    if (p.type === "error") {
      const msg = p.args.map((a) => a.value ?? a.description ?? "").join(" ");
      consoleErrors.push(msg);
    }
  });

  const evalExpr = async (expr) => {
    const res = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || "Eval error: " + JSON.stringify(res.exceptionDetails));
    return res.result?.value;
  };

  // 1. Navigate to editor.html?id=1199
  console.log("Step 1: Navigating to editor.html?id=1199");
  await Page.navigate({ url: "http://127.0.0.1:5450/editor.html?id=1199" });
  await sleep(3000);

  // Select TOP face and upload a high-contrast magenta and gold star
  await evalExpr(`(() => {
    const topTab = document.querySelector('.tab[data-face="top"]');
    topTab.click();
  })()`);

  const editAndSaveRes = await evalExpr(`(() => {
    // Fill top face with distinct vivid magenta #ff00ff and a gold #ffff00 center
    const cv = document.createElement("canvas");
    cv.width = cv.height = 16;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#ff00ff";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#ffff00";
    ctx.fillRect(6, 6, 4, 4);

    return new Promise((resolve) => {
      cv.toBlob((blob) => {
        const file = new File([blob], "vivid_star_16.png", { type: "image/png" });
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.getElementById("faceTextureFileInput");
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));

        setTimeout(() => {
          // Click Save & Apply to Game button
          const saveBtn = document.getElementById("btnApplyGameCenter");
          saveBtn.click();
          setTimeout(() => {
            const overrides = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
            const topOverride = overrides["block_1199_top"] || overrides["block_1199_single_top"];
            resolve({
              hasTopOverride: Boolean(topOverride),
              topOverridePrefix: topOverride?.slice(0, 30),
              version: localStorage.getItem("mc_custom_atlas_version")
            });
          }, 800);
        }, 500);
      }, "image/png");
    });
  })()`);

  console.log("Editor save result:", JSON.stringify(editAndSaveRes));
  check("Editor saved override in localStorage", editAndSaveRes.hasTopOverride);

  // 2. Verify dev backend (5402) and prod backend (5401) both have the override in DB
  await sleep(1000);
  const devDbRes = await fetch("http://127.0.0.1:5402/api/textures/overrides").then((r) => r.json());
  const prodDbRes = await fetch("http://127.0.0.1:5401/api/textures/overrides").then((r) => r.json());

  const devHasOverride = Boolean(devDbRes.atlas?.["block_1199_top"] || devDbRes.atlas?.["block_1199_single_top"]);
  const prodHasOverride = Boolean(prodDbRes.atlas?.["block_1199_top"] || prodDbRes.atlas?.["block_1199_single_top"]);

  check("Dev server :5402 has block 1199 override in DB", devHasOverride);
  check("Prod server :5401 received peer-synced override in DB", prodHasOverride);

  // 3. Navigate to build.html on dev :5450 and verify 3D preview has the override applied
  console.log("Step 2: Navigating to build.html");
  await Page.navigate({ url: "http://127.0.0.1:5450/build.html" });
  await sleep(3000);

  const buildPreviewCheck = await evalExpr(`(() => {
    // Find the item with Game ID 1199 in the inventory list
    const items = Array.from(document.querySelectorAll(".inventory-item"));
    const item1199 = items.find((it) => it.textContent.includes("1199"));
    if (!item1199) return { found: false };
    item1199.click();

    // Check the previewRoot materials
    return new Promise((resolve) => {
      setTimeout(() => {
        let hasCustomTopTex = false;
        let matsCount = 0;
        // Search Three.js scene from global or scene inspect
        // Check window.scene or check preview canvas data
        const cv = document.querySelector("#viewport canvas");
        resolve({
          found: true,
          itemText: item1199.textContent,
          canvasWidth: cv?.width,
          canvasHeight: cv?.height
        });
      }, 1000);
    });
  })()`);

  console.log("Build preview check:", JSON.stringify(buildPreviewCheck));
  check("Found and selected block 1199 in build.html", buildPreviewCheck.found);

  // Capture screenshot of build.html showing block 1199 in Asset Workshop preview
  const shotBuild = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  const buildShotPath = "snapshots/build-preview-sync-probe.jpg";
  fs.writeFileSync(buildShotPath, Buffer.from(shotBuild.data, "base64"));
  console.log(`Saved build.html screenshot to ${buildShotPath}`);

  // 4. Navigate to production game on :5400
  console.log("Step 3: Navigating to production game on http://127.0.0.1:5400");
  await Page.navigate({ url: "http://127.0.0.1:5400" });
  await sleep(4000);

  const prodGameCheck = await evalExpr(`(() => {
    const overrides = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
    const topOverride = overrides["block_1199_top"] || overrides["block_1199_single_top"];
    return {
      hasTopOverride: Boolean(topOverride),
      version: localStorage.getItem("mc_custom_atlas_version")
    };
  })()`);

  console.log("Production game state:", JSON.stringify(prodGameCheck));
  check("Production game has block 1199 override loaded", prodGameCheck.hasTopOverride);

  // Capture screenshot of production game
  const shotProd = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  const prodShotPath = "snapshots/prod-game-sync-probe.jpg";
  fs.writeFileSync(prodShotPath, Buffer.from(shotProd.data, "base64"));
  console.log(`Saved prod game screenshot to ${prodShotPath}`);

  await client.close();
} catch (e) {
  console.error("Probe error:", e);
  fails++;
} finally {
  chrome.kill();
}

process.exit(fails > 0 ? 1 : 0);
