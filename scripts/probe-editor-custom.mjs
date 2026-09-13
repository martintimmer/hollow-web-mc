import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9366;
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

  // 1. Check selected block
  const editorState = await evalExpr(`(() => {
    const select = document.getElementById("blockSelect");
    const metaName = document.getElementById("metaName")?.textContent;
    const metaId = document.getElementById("metaId")?.textContent;
    const metaTexture = document.getElementById("metaTexture")?.textContent;
    const metaTile = document.getElementById("metaTile")?.textContent;
    const optionValues = Array.from(select.options).map(o => ({ value: o.value, text: o.text }));
    const has1199Option = optionValues.some(o => o.value === "1199");
    const selectedValue = select.value;
    
    // Check pixel canvas context
    const pixelCanvas = document.getElementById("pixelCanvas");
    const pCtx = pixelCanvas.getContext("2d");
    const pData = pCtx.getImageData(0, 0, 320, 320).data;
    let nonZeroPx = 0;
    for (let i = 3; i < pData.length; i += 4) {
      if (pData[i] > 0) nonZeroPx++;
    }

    return {
      has1199Option,
      selectedValue,
      metaName,
      metaId,
      metaTexture,
      metaTile,
      totalOptions: optionValues.length,
      nonZeroPx,
      found1199Text: optionValues.find(o => o.value === "1199")?.text
    };
  })()`);

  console.log("Editor State:", JSON.stringify(editorState, null, 2));

  check("Option 1199 present in dropdown", editorState.has1199Option, `(${editorState.found1199Text})`);
  check("Selected value is 1199", editorState.selectedValue === "1199", `(got ${editorState.selectedValue})`);
  check("metaName displays asset name", editorState.metaName === "Gilded Rune Obsidian", `(got ${editorState.metaName})`);
  check("metaId displays #1199", editorState.metaId === "#1199", `(got ${editorState.metaId})`);
  check("pixelCanvas has active pixels rendered", editorState.nonZeroPx > 1000, `(colored pixels: ${editorState.nonZeroPx})`);
  check("Zero runtime console errors", consoleErrors.length === 0, `(${consoleErrors.join("; ")})`);

  // Capture screenshot
  const shot = await Page.captureScreenshot({ format: "jpeg", quality: 90 });
  const outPath = "snapshots/editor-custom-1199-probe.jpg";
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
