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
  slog("stamp: " + await ev("(() => { const api = window.__sim.api; const out = []; const row = [[\"tree.oak.classic\", 6], [\"tree.oak.classic\", 9], [\"tree.oak.classic\", 12], [\"tree.oak.giant\", 12], [\"tree.birch\", 9], [\"tree.oak.classic\", 14]]; let x = 30; for (const pair of row) { try { api.stampTree(pair[0], { height: pair[1], layers: 4 }, x, 10); out.push(pair[0] + h(pair[1])); } catch (e) { out.push(\"ERR\" + e.message); } x += 9; } function h(n) { return \"@\" + n; } return out.join(\" \"); })()"));
  await sleep(8000);
  const aim = async (ex, ey, ez, tx, ty, tz, name) => {
    for (let a = 0; a < 10; a++) {
      await ev("(() => { const s = window.__sim.s; s.player.x = " + ex + "; s.player.y = " + ey + "; s.player.z = " + ez + "; s.player.vx = 0; s.player.vy = 0; s.player.vz = 0; s.player.fly = true; const dx = " + tx + "-" + ex + ", dy = " + ty + "-" + ey + ", dz = " + tz + "-" + ez + "; s.player.yaw = Math.atan2(-dx, -dz); s.player.pitch = Math.atan2(dy, Math.hypot(dx, dz)); s.camera.position.set(" + ex + ", " + (ey + 1.62) + ", " + ez + "); return 1; })()");
      await sleep(1000);
      const got = await ev("(() => { const c = window.__sim.s.camera.position; return [c.x, c.y, c.z].map(v => Math.round(v)).join(\",\"); })()");
      const p = String(got).split(",").map(Number);
      if (Math.abs(p[0] - ex) < 2 && Math.abs(p[2] - ez) < 2) break;
    }
    const png = await ev("(async () => { const cv = document.querySelector(\"canvas\"); return await new Promise((res) => requestAnimationFrame(() => { try { res(cv.toDataURL(\"image/png\")); } catch (e) { res(\"ERR\"); } })); })()");
    if (String(png).length > 5000) fs.writeFileSync("snapshots/" + name, Buffer.from(String(png).split(",")[1], "base64"));
    slog("saved " + name);
  };
  await aim(52, 68.5, 24, 52, 67, 10, "trees-row.png");
  await aim(40, 67.5, 17, 36, 68, 10, "trees-close.png");
  await client.close();
} catch (e) { slog("FATAL " + (e && e.message)); }
chrome.kill();
process.exit(0);
