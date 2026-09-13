import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9370;
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

  // 1. Select TOP face tab
  const selectTop = await evalExpr(`(() => {
    const topTab = document.querySelector('.tab[data-face="top"]');
    if (!topTab) return false;
    topTab.click();
    return true;
  })()`);
  check("Selected TOP face tab", selectTop);

  // 2. Upload a 64x64 multi-color test texture to the TOP face
  const uploadRes = await evalExpr(`(() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const ctx = cv.getContext("2d");
    // Outer border dark violet
    ctx.fillStyle = "#4a0e4e";
    ctx.fillRect(0, 0, 64, 64);
    // Middle ring vibrant magenta
    ctx.fillStyle = "#ff007f";
    ctx.fillRect(12, 12, 40, 40);
    // Center bright gold square
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(24, 24, 16, 16);

    return new Promise((resolve) => {
      cv.toBlob((blob) => {
        const file = new File([blob], "mystic_gem_64.png", { type: "image/png" });
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.getElementById("faceTextureFileInput");
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        setTimeout(() => {
          resolve({
            toast: document.getElementById("toast")?.textContent,
            resValue: document.getElementById("faceResolutionSelect")?.value,
            zoomValue: document.getElementById("sliderTextureZoom")?.value
          });
        }, 500);
      }, "image/png");
    });
  })()`);

  console.log("Upload result:", JSON.stringify(uploadRes));
  check("Upload toast displayed", uploadRes.toast?.includes("Uploaded"), `(${uploadRes.toast})`);

  // 3. Test changing texture crop zoom (e.g. to 180%)
  const zoomCropRes = await evalExpr(`(() => {
    const slider = document.getElementById("sliderTextureZoom");
    slider.value = "180";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    return {
      label: document.getElementById("valTextureZoom")?.textContent,
      sliderVal: slider.value
    };
  })()`);

  console.log("Zoom crop change:", JSON.stringify(zoomCropRes));
  check("Texture crop zoom updated to 180%", zoomCropRes.label === "180%", `(${zoomCropRes.label})`);

  // 4. Test changing face resolution to 16x16
  const resChange = await evalExpr(`(() => {
    const sel = document.getElementById("faceResolutionSelect");
    sel.value = "16";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    return {
      selVal: sel.value,
      toast: document.getElementById("toast")?.textContent
    };
  })()`);

  console.log("Resolution change:", JSON.stringify(resChange));
  check("Face resolution changed to 16x16", resChange.selVal === "16");

  // 5. Test canvas view zoom (+ and -)
  const canvasZoomRes = await evalExpr(`(() => {
    const btnIn = document.getElementById("btnZoomIn");
    btnIn.click();
    const z1 = document.getElementById("canvasZoom")?.textContent;
    btnIn.click();
    const z2 = document.getElementById("canvasZoom")?.textContent;
    const btnOut = document.getElementById("btnZoomOut");
    btnOut.click();
    const z3 = document.getElementById("canvasZoom")?.textContent;
    return { z1, z2, z3 };
  })()`);

  console.log("Canvas view zoom steps:", JSON.stringify(canvasZoomRes));
  check("Canvas view zoom in worked", canvasZoomRes.z1 === "1.5x" && canvasZoomRes.z2 === "2x");
  check("Canvas view zoom out worked", canvasZoomRes.z3 === "1.5x");

  // Reset view zoom
  await evalExpr(`document.getElementById("btnZoomReset")?.click()`);

  // 6. Test brush size tabs
  const brushSizeRes = await evalExpr(`(() => {
    const b2 = document.querySelector('.tab[data-brush="2"]');
    b2.click();
    return b2.classList.contains("active");
  })()`);
  check("Brush size 2px activated", brushSizeRes);

  // 7. Test pencil modification on the uploaded face
  const pencilRes = await evalExpr(`(() => {
    // Select pencil tool and set color to neon green #00ff00
    const pencilBtn = document.querySelector('.tool-btn[data-tool="pencil"]');
    pencilBtn.click();
    const colorPicker = document.getElementById("nativeColorPicker");
    colorPicker.value = "#00ff00";
    colorPicker.dispatchEvent(new Event("input", { bubbles: true }));

    // Simulate mousedown at coordinates (2, 2) on the 16x16 grid
    const overlay = document.getElementById("gridOverlay");
    const rect = overlay.getBoundingClientRect();
    // (2.5 / 16) * rect.width
    const clientX = rect.left + (2.5 / 16) * rect.width;
    const clientY = rect.top + (2.5 / 16) * rect.height;

    overlay.dispatchEvent(new MouseEvent("mousedown", { clientX, clientY, bubbles: true }));
    overlay.dispatchEvent(new MouseEvent("mouseup", { clientX, clientY, bubbles: true }));

    // Read pixel canvas at coordinate (2, 2)
    const pCv = document.getElementById("pixelCanvas");
    const pCtx = pCv.getContext("2d");
    // (2 * 20 + 10, 2 * 20 + 10) = (50, 50)
    const px = pCtx.getImageData(50, 50, 1, 1).data;
    return {
      r: px[0],
      g: px[1],
      b: px[2]
    };
  })()`);

  console.log("Pencil modification pixel check:", JSON.stringify(pencilRes));
  // Neon green should have g > 200, r < 50, b < 50
  check("Pencil successfully modified uploaded texture with neon green", pencilRes.g > 200 && pencilRes.r < 50, `(got rgb: ${pencilRes.r}, ${pencilRes.g}, ${pencilRes.b})`);

  // 8. Test bucket fill tool
  const fillRes = await evalExpr(`(() => {
    const bucketBtn = document.querySelector('.tool-btn[data-tool="bucket"]');
    bucketBtn.click();
    const colorPicker = document.getElementById("nativeColorPicker");
    colorPicker.value = "#00ffff"; // Cyan fill
    colorPicker.dispatchEvent(new Event("input", { bubbles: true }));

    const overlay = document.getElementById("gridOverlay");
    const rect = overlay.getBoundingClientRect();
    const clientX = rect.left + (8.5 / 16) * rect.width;
    const clientY = rect.top + (8.5 / 16) * rect.height;

    overlay.dispatchEvent(new MouseEvent("mousedown", { clientX, clientY, bubbles: true }));
    overlay.dispatchEvent(new MouseEvent("mouseup", { clientX, clientY, bubbles: true }));

    const pCv = document.getElementById("pixelCanvas");
    const pCtx = pCv.getContext("2d");
    const px = pCtx.getImageData(170, 170, 1, 1).data;
    return {
      r: px[0],
      g: px[1],
      b: px[2]
    };
  })()`);

  console.log("Bucket fill pixel check:", JSON.stringify(fillRes));
  check("Bucket fill successfully recolored target area with cyan", fillRes.g > 200 && fillRes.b > 200, `(got rgb: ${fillRes.r}, ${fillRes.g}, ${fillRes.b})`);

  // 9. Verify 3D Live View is active and error-free
  await sleep(1000);
  check("Zero runtime console errors", consoleErrors.length === 0, `(${consoleErrors.join("; ")})`);

  // 10. Capture visual artifact
  const shot = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  const outPath = "snapshots/editor-zoom-modify-probe.jpg";
  fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
  console.log(`Saved screenshot to ${outPath}`);

  await client.close();
} catch (e) {
  console.error("Probe error:", e);
  fails++;
} finally {
  chrome.kill();
}

process.exit(fails > 0 ? 1 : 0);
