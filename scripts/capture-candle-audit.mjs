import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn("/usr/bin/chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--window-size=1280,800", "--remote-debugging-port=9295", "about:blank"], { stdio: "ignore" });
await sleep(1500);
const slog = (m) => { console.log(m); };
try {
  const client = await CDP({ port: 9295 });
  const { Page, Runtime } = client;
  const ev = async (code) => {
    const isAsync = code.trimStart().startsWith("(async");
    for (let i = 0; i < 4; i++) {
      try {
        const r = await Runtime.evaluate(isAsync ? { expression: code, awaitPromise: true } : { expression: code });
        const v = ((r || {}).result || {}).value;
        if (v !== undefined) return v;
      } catch (e) {}
      await sleep(2000);
    }
    return "NO-RESULT";
  };
  await Page.enable();
  await Runtime.enable();
  await Page.addScriptToEvaluateOnNewDocument({ source: "try { localStorage.setItem(\"mc_onboarding_dismissed\", \"1\"); } catch (e) {} Object.defineProperty(document, \"hidden\", { value: false, configurable: true }); Object.defineProperty(document, \"visibilityState\", { value: \"visible\", configurable: true });" });
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  for (let i = 0; i < 200; i++) {
    await sleep(1000);
    const st = await ev("window.__sim && window.__sim.s && window.__sim.s.reqId ? \"READY\" : \"wait\"");
    if (String(st).startsWith("READY")) break;
  }
  await sleep(2000);
  slog("setup: " + await ev("(() => { const s = window.__sim.s; const wb = (x, y, z, id) => window.__simWriteCell(x, y, z, id, new Set()); for (let x = 4; x <= 12; x++) { for (let z = 7; z <= 12; z++) { wb(x, 117, z, 5); } } wb(6, 118, 9, 232); wb(8, 118, 9, 693); wb(10, 118, 9, 80); s.buildMesh(0, 0); s.player.x = 8; s.player.y = 118.4; s.player.z = 12.5; s.player.yaw = 0; s.player.pitch = -0.22; return \"ok\"; })()"));
  await sleep(7000);
  const shot = async (name) => {
    const png = await ev("(async () => { const cv = document.querySelector(\"canvas\"); return await new Promise((res) => requestAnimationFrame(() => { try { res(cv.toDataURL(\"image/png\")); } catch (e) { res(\"ERR\"); } })); })()");
    if (String(png).length > 5000) fs.writeFileSync("snapshots/" + name, Buffer.from(String(png).split(",")[1], "base64"));
    slog("saved " + name);
  };
  await shot("candle-row.png");
  await client.close();
} catch (e) { slog("FATAL " + (e && e.message)); }
chrome.kill();
process.exit(0);
