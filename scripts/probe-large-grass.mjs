import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";
import path from "node:path";

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

  console.log("Navigating to http://127.0.0.1:5400/ ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/" });
  await sleep(4000);

  // Test block definitions via fetch
  const catalogCheck = await evalExpr(`(async () => {
    const reg = await fetch("/catalog/completeRegistry.json").then(r => r.json());
    const g1200 = reg.find(b => b.id === 1200);
    const g1201 = reg.find(b => b.id === 1201);
    return { g1200, g1201 };
  })()`);

  check("Block 1200 exists in registry", !!catalogCheck.g1200, JSON.stringify(catalogCheck.g1200));
  check("Block 1200 solid is 0 (no collision)", catalogCheck.g1200?.solid === 0);
  check("Block 1200 foliage is 1 (animated)", catalogCheck.g1200?.foliage === 1);
  check("Block 1200 side tile is 815", catalogCheck.g1200?.side === 815);
  check("Block 1200 top tile is 816", catalogCheck.g1200?.top === 816);

  check("Block 1201 exists in registry", !!catalogCheck.g1201, JSON.stringify(catalogCheck.g1201));
  check("Block 1201 solid is 0 (no collision)", catalogCheck.g1201?.solid === 0);
  check("Block 1201 foliage is 1 (animated)", catalogCheck.g1201?.foliage === 1);

  // Check thumbnails
  const thumbCheck = await evalExpr(`(async () => {
    const thumbs = await fetch("/catalog/thumbnails.json").then(r => r.json());
    return {
      has1200: !!thumbs["1200"],
      has1201: !!thumbs["1201"]
    };
  })()`);

  check("Thumbnail for 1200 exists", thumbCheck.has1200);
  check("Thumbnail for 1201 exists", thumbCheck.has1201);

  const shot = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/large-grass-probe.jpg", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot to large-grass-probe.jpg");

} catch (err) {
  console.error("Probe error:", err);
  fails++;
} finally {
  chrome.kill("SIGKILL");
}

process.exit(fails > 0 ? 1 : 0);
