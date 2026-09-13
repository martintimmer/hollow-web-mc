import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9491;
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

  console.log("Navigating to http://127.0.0.1:5400/blocks.html ...");
  await Page.navigate({ url: "http://127.0.0.1:5400/blocks.html" });
  await sleep(3500);

  // Search for "Grass" in input #q
  await evalExpr(`(() => {
    const q = document.getElementById("q");
    if (q) {
      q.value = "Grass";
      q.dispatchEvent(new Event("input", { bubbles: true }));
    }
  })()`);
  await sleep(1500);

  const cardInfo = await evalExpr(`(() => {
    const cards = Array.from(document.querySelectorAll(".card"))
      .filter(c => c.style.display !== "none")
      .map(c => ({
        name: c.querySelector(".bname")?.innerText,
        id: c.querySelector(".bid")?.innerText,
        held: c.querySelector(".held")?.src?.slice(0, 30),
        placed: c.querySelector(".placed")?.src?.slice(0, 30)
      }));
    return cards;
  })()`);
  console.log("Filtered grass cards:", cardInfo);

  const shot = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/blocks-grass-filtered.jpg", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot to snapshots/blocks-grass-filtered.jpg");

} catch (err) {
  console.error("Probe error:", err);
} finally {
  chrome.kill("SIGKILL");
}
