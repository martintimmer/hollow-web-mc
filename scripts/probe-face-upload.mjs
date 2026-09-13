import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9367;
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

  console.log("Navigating to http://127.0.0.1:5450/editor.html?id=1199");
  await Page.navigate({ url: "http://127.0.0.1:5450/editor.html?id=1199" });
  await sleep(3500);

  const evalExpr = async (expr) => {
    const res = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || "Eval error: " + JSON.stringify(res.exceptionDetails));
    return res.result?.value;
  };

  // 1. Initial face selection check
  const initFace = await evalExpr(`(() => {
    return {
      indicator: document.getElementById("activeFaceIndicator")?.textContent,
      targetName: document.getElementById("uploadFaceTargetName")?.textContent,
      canvasFace: document.getElementById("canvasFaceName")?.textContent
    };
  })()`);

  console.log("Initial face UI:", JSON.stringify(initFace));
  check("Initial face indicator is SIDE", initFace.indicator === "SIDE", `(${initFace.indicator})`);
  check("Initial upload button target is SIDE", initFace.targetName === "SIDE", `(${initFace.targetName})`);

  // 2. Click Top face tab
  const topFaceRes = await evalExpr(`(() => {
    const topTab = document.querySelector('.tab[data-face="top"]');
    if (!topTab) return { clicked: false };
    topTab.click();
    return {
      clicked: true,
      indicator: document.getElementById("activeFaceIndicator")?.textContent,
      targetName: document.getElementById("uploadFaceTargetName")?.textContent,
      canvasFace: document.getElementById("canvasFaceName")?.textContent
    };
  })()`);

  console.log("After clicking Top tab:", JSON.stringify(topFaceRes));
  check("Top face tab clicked", topFaceRes.clicked);
  check("Indicator updated to TOP", topFaceRes.indicator === "TOP", `(${topFaceRes.indicator})`);
  check("Upload button target updated to TOP", topFaceRes.targetName === "TOP", `(${topFaceRes.targetName})`);
  check("Canvas face footer updated to TOP", topFaceRes.canvasFace === "TOP", `(${topFaceRes.canvasFace})`);

  // 3. Generate a distinct test texture for Top face: Bright Cyan Diamond Star pattern
  const topTextureUploaded = await evalExpr(`(() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 32;
    const ctx = cv.getContext("2d");
    // Background deep navy
    ctx.fillStyle = "#0c1b33";
    ctx.fillRect(0, 0, 32, 32);
    // Diamond star in vibrant cyan
    ctx.fillStyle = "#00f0ff";
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.lineTo(30, 16);
    ctx.lineTo(16, 30);
    ctx.lineTo(2, 16);
    ctx.closePath();
    ctx.fill();
    // Inner core
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(16, 16, 6, 0, Math.PI * 2);
    ctx.fill();

    return new Promise((resolve) => {
      cv.toBlob((blob) => {
        const file = new File([blob], "top_cyan_star.png", { type: "image/png" });
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.getElementById("faceTextureFileInput");
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        setTimeout(() => {
          resolve({
            triggered: true,
            toastText: document.getElementById("toast")?.textContent
          });
        }, 300);
      }, "image/png");
    });
  })()`);

  console.log("Top texture upload result:", JSON.stringify(topTextureUploaded));
  await sleep(1000);

  // 4. Verify that Top face was updated while Side face remained original
  const facesState = await evalExpr(`(() => {
    // Check Top face pixels vs Side face pixels
    const sideTab = document.querySelector('.tab[data-face="side"]');
    const topTab = document.querySelector('.tab[data-face="top"]');

    // Switch to top tab to sample pixel canvas
    topTab.click();
    const pCanvas = document.getElementById("pixelCanvas");
    const pCtx = pCanvas.getContext("2d");
    // Sample center pixel (should be white or cyan: r > 200, g > 200, b > 200)
    const topCenter = pCtx.getImageData(160, 160, 1, 1).data;

    // Switch to side tab to sample side pixel canvas
    sideTab.click();
    const sideCenter = pCtx.getImageData(160, 160, 1, 1).data;

    // Switch back to top
    topTab.click();

    return {
      topCenterRgb: [topCenter[0], topCenter[1], topCenter[2]],
      sideCenterRgb: [sideCenter[0], sideCenter[1], sideCenter[2]],
      toastMsg: document.getElementById("toast")?.textContent
    };
  })()`);

  console.log("Faces comparison state:", JSON.stringify(facesState));
  // Top center should be white core [255, 255, 255]
  check("Top face has white/cyan center pixel", facesState.topCenterRgb[0] > 200 && facesState.topCenterRgb[2] > 200, `(got ${facesState.topCenterRgb})`);
  // Side center is the golden rune [255, 238, 119]
  check("Side face preserved original gold rune", facesState.sideCenterRgb[0] > 200 && facesState.sideCenterRgb[1] > 180 && facesState.sideCenterRgb[2] < 150, `(got ${facesState.sideCenterRgb})`);
  check("Top face and Side face are distinctly different", facesState.topCenterRgb[2] !== facesState.sideCenterRgb[2]);

  // 5. Test saving and applying to game
  const saveResult = await evalExpr(`(() => {
    const saveBtn = document.getElementById("btnApplyGame");
    saveBtn.click();
    const overrides = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
    return {
      hasTopOverride: !!overrides["block_1199_single_top"] || !!overrides["block_1199_top"],
      hasSideOverride: !!overrides["block_1199_single_side"] || !!overrides["block_1199_side"],
      totalOverrides: Object.keys(overrides).length
    };
  })()`);

  console.log("Save to game result:", JSON.stringify(saveResult));
  check("Top override stored in localStorage", saveResult.hasTopOverride);
  check("Side override stored in localStorage", saveResult.hasSideOverride);

  // 6. Capture screenshot showing 3D cube with new top face and original side face
  await sleep(1500);
  const shot = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  const outPath = "snapshots/editor-per-face-upload-probe.jpg";
  fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
  console.log(`Saved screenshot to ${outPath}`);

  check("Zero runtime console errors", consoleErrors.length === 0, `(${consoleErrors.join("; ")})`);

  await client.close();
} catch (e) {
  console.error("Probe error:", e);
  fails++;
} finally {
  chrome.kill();
}

process.exit(fails > 0 ? 1 : 0);
