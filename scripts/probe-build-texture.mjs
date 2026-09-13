import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9365;
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

  await Page.navigate({ url: "http://127.0.0.1:5450/build.html" });
  await sleep(2500);

  const evalExpr = async (expr) => {
    const res = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || "Eval error: " + JSON.stringify(res.exceptionDetails));
    return res.result?.value;
  };

  // 1. Check mode switch buttons
  const modeSwitchState = await evalExpr(`(() => {
    const modelBtn = document.getElementById("modeModel");
    const texBtn = document.getElementById("modeTexture");
    const options = document.getElementById("textureOptions");
    return {
      hasModelBtn: !!modelBtn,
      hasTexBtn: !!texBtn,
      modelActive: modelBtn?.classList.contains("active"),
      texActive: texBtn?.classList.contains("active"),
      optionsHidden: options?.style.display === "none"
    };
  })()`);
  console.log("Mode switch initial state:", JSON.stringify(modeSwitchState));
  check("mode switch buttons present", modeSwitchState.hasModelBtn && modeSwitchState.hasTexBtn);
  check("3D model is active by default", modeSwitchState.modelActive && modeSwitchState.optionsHidden);

  // 2. Switch to Flat Texture mode
  const switchedState = await evalExpr(`(() => {
    const texBtn = document.getElementById("modeTexture");
    texBtn.click();
    const options = document.getElementById("textureOptions");
    const dropzoneTitle = document.getElementById("dropzoneTitle");
    const assetFile = document.getElementById("assetFile");
    return {
      texActive: texBtn.classList.contains("active"),
      optionsVisible: options.style.display !== "none",
      dropzoneText: dropzoneTitle.innerText,
      accept: assetFile.accept
    };
  })()`);
  console.log("After clicking Flat Texture mode:", JSON.stringify(switchedState));
  check("flat texture mode activated", switchedState.texActive && switchedState.optionsVisible);
  check("accepts PNG and JPG", switchedState.accept.includes("png") && switchedState.accept.includes("jpg"));

  // 3. Synthesize a 32x32 golden rune block texture and upload it via data transfer
  const uploadResult = await evalExpr(`(async () => {
    // Fill prompt
    const promptInput = document.getElementById("promptInput");
    promptInput.value = "Gilded Rune Obsidian";

    // Create 32x32 pixel art texture
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    
    // Deep obsidian background
    ctx.fillStyle = "#16151f";
    ctx.fillRect(0, 0, 32, 32);

    // Stone brick borders
    ctx.fillStyle = "#2a273b";
    ctx.fillRect(0, 0, 32, 2);
    ctx.fillRect(0, 0, 2, 32);
    ctx.fillRect(0, 30, 32, 2);
    ctx.fillRect(30, 0, 2, 32);

    // Glowing golden runic glyph in center
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(14, 6, 4, 20);
    ctx.fillRect(8, 12, 16, 4);
    ctx.fillRect(10, 18, 12, 3);
    ctx.fillStyle = "#ffee77";
    ctx.fillRect(15, 8, 2, 16);
    ctx.fillRect(10, 13, 12, 2);

    // Convert to Blob and File
    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    const file = new File([blob], "gilded_rune_obsidian.png", { type: "image/png" });

    // Feed to file input and trigger change
    const dt = new DataTransfer();
    dt.items.add(file);
    const assetFile = document.getElementById("assetFile");
    assetFile.files = dt.files;
    assetFile.dispatchEvent(new Event("change", { bubbles: true }));

    return { fileName: file.name, fileSize: file.size };
  })()`);
  console.log("Triggered texture upload:", JSON.stringify(uploadResult));

  await sleep(3000);

  // 4. Verify that the 3D block object was created and previewed
  const blockDetails = await evalExpr(`(() => {
    const selectedName = document.getElementById("selectedName")?.innerText;
    const selectedSource = document.getElementById("selectedSource")?.innerText;
    const selectedDimensions = document.getElementById("selectedDimensions")?.innerText;
    const selectedTriangles = document.getElementById("selectedTriangles")?.innerText;
    const status = document.getElementById("assetStatus")?.innerText;
    const inventoryItems = Array.from(document.querySelectorAll(".inventory-item")).map(el => ({
      text: el.innerText.replace(/\\s+/g, " ").trim(),
      isSelected: el.classList.contains("selected")
    }));
    return {
      selectedName,
      selectedSource,
      selectedDimensions,
      selectedTriangles,
      status,
      inventoryItems
    };
  })()`);
  console.log("Created Block Details:", JSON.stringify(blockDetails, null, 2));

  check("block name set", blockDetails.selectedName === "Gilded Rune Obsidian");
  check("source indicates flat texture", blockDetails.selectedSource.includes("Flat texture"));
  check("dimensions are 1x1x1m cube", blockDetails.selectedDimensions.includes("1.00m × 1.00m × 1.00m"));
  check("triangles are 12 (6 cube faces)", blockDetails.selectedTriangles === "12");
  check("status shows 3D block ready", blockDetails.status.includes("ready") || blockDetails.status.includes("place") || blockDetails.status.includes("Created") || blockDetails.status.includes("Obsidian"));

  // 5. Test publishing / inserting into game
  const insertTest = await evalExpr(`(async () => {
    const confirmCheckbox = document.getElementById("confirmId");
    const insertBtn = document.getElementById("insertButton");
    const nextIdText = document.getElementById("nextGameId")?.innerText;

    if (!confirmCheckbox.disabled) {
      confirmCheckbox.checked = true;
      confirmCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise(r => setTimeout(r, 200));
      const canInsert = !insertBtn.disabled;
      if (canInsert) {
        insertBtn.click();
        await new Promise(r => setTimeout(r, 2000));
      }
      return { nextId: nextIdText, inserted: canInsert, status: document.getElementById("assetStatus")?.innerText };
    }
    return { nextId: nextIdText, inserted: false, status: "disabled" };
  })()`);
  console.log("Game Insert Result:", JSON.stringify(insertTest));
  check("insert button handled", insertTest.inserted, JSON.stringify(insertTest));

  // 6. Check console errors
  check("no console errors", consoleErrors.length === 0, consoleErrors.join(" | "));

  // 7. Capture screenshot
  const screenshot = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/build-texture-probe.jpg", Buffer.from(screenshot.data, "base64"));
  console.log("Snapshot saved to snapshots/build-texture-probe.jpg");

  console.log(`\nBuild Texture Probe finished with ${fails} failures.`);
  await client.close();
} catch (e) {
  console.error("Probe error:", e);
  fails++;
} finally {
  chrome.kill();
  process.exit(fails > 0 ? 1 : 0);
}
