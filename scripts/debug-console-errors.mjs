import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";

const PORT = 9390;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--window-size=1920,1080",
  `--remote-debugging-port=${PORT}`,
  "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime } = client;
  await Page.enable();
  await Runtime.enable();

  const exceptions = [];
  const logs = [];

  Runtime.exceptionThrown((params) => {
    exceptions.push(params);
    console.error("[BROWSER EXCEPTION]", params.exceptionDetails.text, params.exceptionDetails.exception?.description);
  });

  Runtime.consoleAPICalled((params) => {
    const text = params.args.map(a => a.value || a.description || JSON.stringify(a)).join(" ");
    logs.push(text);
    if (params.type === "error") {
      console.error("[BROWSER CONSOLE ERROR]", text);
    }
  });

  console.log("Navigating to /?sim=1...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  // Click on every tab in SimDeck
  const tabs = ["catalog", "params", "placed", "tests", "inspect", "scenes", "sideload", "designer"];
  for (const tab of tabs) {
    console.log(`Clicking tab: ${tab}`);
    await Runtime.evaluate({
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes("${tab}"));
        if (btn) btn.click();
      })()`
    });
    await sleep(500);
  }

  // Click on every subtab in Designer
  const subtabs = ["photos", "report", "recipe", "scene", "transform"];
  for (const sub of subtabs) {
    console.log(`Clicking designer subtab: ${sub}`);
    await Runtime.evaluate({
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes("${sub}"));
        if (btn) btn.click();
      })()`
    });
    await sleep(500);
  }

  // Click on Catalog category buttons
  const catGroups = ["trees", "blocks", "houses", "san_andreas", "features", "mobs", "villagers", "entities"];
  for (const grp of catGroups) {
    console.log(`Clicking catalog category: ${grp}`);
    await Runtime.evaluate({
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes("${grp.replace('_', ' ')}"));
        if (btn) btn.click();
      })()`
    });
    await sleep(500);
  }

  console.log("Total exceptions caught:", exceptions.length);
  await client.close();
} finally {
  chrome.kill("SIGTERM");
}
