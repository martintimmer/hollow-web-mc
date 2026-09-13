import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9499;
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

  // Search "Tropical Bush" in input #q
  await evalExpr(`(() => {
    const q = document.getElementById("q");
    if (q) {
      q.value = "Tropical";
      q.dispatchEvent(new Event("input", { bubbles: true }));
    }
  })()`);
  await sleep(1500);

  // Scroll to card 1202
  await evalExpr(`(() => {
    const card1202 = Array.from(document.querySelectorAll(".card")).find(c => c.innerText.includes("#1202"));
    if (card1202) card1202.scrollIntoView();
  })()`);
  await sleep(2000);

  const cardDetails = await evalExpr(`(() => {
    const card1202 = Array.from(document.querySelectorAll(".card")).find(c => c.innerText.includes("#1202"));
    const card1203 = Array.from(document.querySelectorAll(".card")).find(c => c.innerText.includes("#1203"));
    return {
      c1202: {
        name: card1202?.querySelector(".bname")?.innerText,
        inv: card1202?.querySelector(".inv")?.src?.slice(0, 40),
        held: card1202?.querySelector(".held")?.src?.slice(0, 40),
        placed: card1202?.querySelector(".placed")?.src?.slice(0, 40)
      },
      c1203: {
        name: card1203?.querySelector(".bname")?.innerText,
        inv: card1203?.querySelector(".inv")?.src?.slice(0, 40),
        held: card1203?.querySelector(".held")?.src?.slice(0, 40),
        placed: card1203?.querySelector(".placed")?.src?.slice(0, 40)
      }
    };
  })()`);
  console.log("Tropical Bush cards in catalog:", cardDetails);

  const shot = await Page.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/blocks-tropical-bush.jpg", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot to blocks-tropical-bush.jpg");

} catch (err) {
  console.error("Probe error:", err);
} finally {
  chrome.kill("SIGKILL");
}
