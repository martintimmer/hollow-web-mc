import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9492;
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
  await sleep(1000);

  // Scroll to card 124 and 1200
  await evalExpr(`(() => {
    const card124 = Array.from(document.querySelectorAll(".card")).find(c => c.innerText.includes("#124"));
    if (card124) card124.scrollIntoView();
  })()`);
  await sleep(2000);

  const cardDetails = await evalExpr(`(() => {
    const card124 = Array.from(document.querySelectorAll(".card")).find(c => c.innerText.includes("#124"));
    const card1200 = Array.from(document.querySelectorAll(".card")).find(c => c.innerText.includes("#1200"));
    return {
      c124: {
        name: card124?.querySelector(".bname")?.innerText,
        inv: card124?.querySelector(".inv")?.src?.slice(0, 40),
        held: card124?.querySelector(".held")?.src?.slice(0, 40),
        placed: card124?.querySelector(".placed")?.src?.slice(0, 40)
      },
      c1200: {
        name: card1200?.querySelector(".bname")?.innerText,
        inv: card1200?.querySelector(".inv")?.src?.slice(0, 40),
        held: card1200?.querySelector(".held")?.src?.slice(0, 40),
        placed: card1200?.querySelector(".placed")?.src?.slice(0, 40)
      }
    };
  })()`);
  console.log("Rendered card details:", cardDetails);

  const shot = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/blocks-grass-scrolled.jpg", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot to snapshots/blocks-grass-scrolled.jpg");

} catch (err) {
  console.error("Probe error:", err);
} finally {
  chrome.kill("SIGKILL");
}
