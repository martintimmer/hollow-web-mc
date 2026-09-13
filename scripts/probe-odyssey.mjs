import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9360;
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
    width: 1300,
    height: 1100,
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

  await Page.navigate({ url: "http://127.0.0.1:5450/seed.html" });
  await sleep(3000);

  const evalExpr = async (expr) => {
    const res = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || "Eval error");
    return res.result?.value;
  };

  // 1. Select 'standard' and 512 size, then generate
  const setupResult = await evalExpr(`(() => {
    const wtype = document.getElementById("wtype");
    wtype.value = "standard";
    const size = document.getElementById("size");
    size.value = "512";
    document.getElementById("gen").click();
    return { wtype: wtype.value, size: size.value };
  })()`);
  check("switched to standard preset", setupResult.wtype === "standard", JSON.stringify(setupResult));

  await sleep(3000);

  // 2. Read stats line
  const statsInfo = await evalExpr(`(() => {
    const statsEl = document.getElementById("stats");
    return statsEl ? statsEl.innerText : "";
  })()`);
  console.log("Seed Visualizer Stats:", statsInfo);
  check("stats populated", statsInfo.includes("Standard"), statsInfo);

  // 3. Inspect biome census & elevation span
  const runDetails = await evalExpr(`(() => {
    const counts = window.__lastCounts ? Array.from(window.__lastCounts.entries()) : [];
    const bars = Array.from(document.querySelectorAll("#bars .bar")).map(b => b.innerText.replace(/\\s+/g, " ").trim());
    return {
      distinctBiomes: counts.length,
      biomesList: counts.map(([id, c]) => id),
      barRows: bars
    };
  })()`);

  console.log("Distinct Biomes count:", runDetails.distinctBiomes);
  console.log("Biomes found:", runDetails.biomesList.join(", "));
  check("regional biome variety (>= 6 biomes)", runDetails.distinctBiomes >= 6, `got ${runDetails.distinctBiomes} biomes`);

  // 4. Check elevation extremes on canvas
  const elevationSpan = await evalExpr(`(() => {
    const text = document.getElementById("stats")?.innerText || "";
    const m = text.match(/Elevation\\s+(\\d+)\\s+…\\s+(\\d+)/i);
    if (!m) return null;
    return { minH: Number(m[1]), maxH: Number(m[2]), span: Number(m[2]) - Number(m[1]) };
  })()`);
  console.log("Elevation Range:", JSON.stringify(elevationSpan));
  check("elevation span >= 60m", elevationSpan && elevationSpan.span >= 60, `span: ${elevationSpan?.span}m (min ${elevationSpan?.minH}, max ${elevationSpan?.maxH})`);

  // 5. Check caves canvas rendering
  const cavesInfo = await evalExpr(`(() => {
    const cv = document.getElementById("caves");
    if (!cv) return null;
    const ctx = cv.getContext("2d");
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    let cavePx = 0, minePx = 0, lavaPx = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
      // Lava: red >= 240, green ~ 80, blue ~ 20
      if (r > 230 && g < 120 && b < 40) lavaPx++;
      // Mineshaft wood/rail: gold timber r~210, g~140, b~50 or rail metal r~230, g~230, b~245
      else if ((r > 190 && g > 120 && b < 80) || (r > 200 && g > 200 && b > 200)) minePx++;
      // Worm cave tunnel / grotto
      else if (b > 100 && (b > r || g > 150)) cavePx++;
    }
    return {
      width: cv.width,
      height: cv.height,
      lavaPx,
      minePx,
      cavePx,
      totalPx: cv.width * cv.height
    };
  })()`);
  console.log("Subterranean Caves & Mines Canvas:", JSON.stringify(cavesInfo));
  check("caves canvas exists and sized", cavesInfo && cavesInfo.width === 512 && cavesInfo.height === 512);
  check("caves and mines rendered on canvas", cavesInfo && (cavesInfo.cavePx > 1000) && (cavesInfo.minePx > 100), `cavePx: ${cavesInfo?.cavePx}, minePx: ${cavesInfo?.minePx}, lavaPx: ${cavesInfo?.lavaPx}`);

  // 6. Check console errors
  check("no console errors", consoleErrors.length === 0, consoleErrors.join(" | "));

  // 6. Capture screenshot
  const screenshot = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/standard-seed-probe.jpg", Buffer.from(screenshot.data, "base64"));
  console.log("Snapshot saved to snapshots/standard-seed-probe.jpg");

  console.log(`\nStandard Probe finished with ${fails} failures.`);
  await client.close();
} catch (e) {
  console.error("Probe error:", e);
  fails++;
} finally {
  chrome.kill();
  process.exit(fails > 0 ? 1 : 0);
}
