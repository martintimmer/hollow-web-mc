// Headless probe: hostile mobs burn in daylight and die ~10s later.
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";

const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader",
  "--remote-debugging-port=9427", "about:blank"
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const c = await CDP({ port: 9427 });
  const { Page, Runtime } = c;
  await Page.enable();
  await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);

  const ev = async (expr) => {
    const r = await Runtime.evaluate({ expression: expr, returnByValue: true });
    return r.result?.value;
  };

  const st = await ev(`(()=>{
    const api=window.__sim?.api; const s=window.__sim?.s;
    if(!api||!s) return "no-bridge";
    s.time=6000; s.timeFlow=false; s.active=true; s.uiPaused=false; // day
    api.stampMob("zombie", 10, 8);
    s.player.x=16; s.player.y=65.4; s.player.z=16; s.player.fly=true;
    return "zombie stamped";
  })()`);
  console.log("setup:", JSON.stringify(st));

  const count = () => ev(`(()=>{const mgr=window.__mobMgr; if(!mgr) return -1; const z=mgr.mobs.filter(m=>m.type==="zombie"); return z.length ? {n:z.length, burn: +(z[0].burnTimer||0).toFixed(1), y: +z[0].y.toFixed(1)} : {n:0};})()`);
  const trace = [];
  for (let i = 0; i < 14; i++) {
    await sleep(1000);
    trace.push(await count());
  }
  fs.writeFileSync("snapshots/mob-burn-probe.json", JSON.stringify(trace));
  console.log("trace:", JSON.stringify(trace.map((t, i) => `${(i + 1)}s:${JSON.stringify(t)}`)));
  // verdict: burning observed (burn>0) AND at least one burnout death (n decreased
  // after a mob's burn timer approached 10s) — the replenisher keeps re-spawning.
  const sawBurn = trace.some((t) => t && t.n > 0 && t.burn > 2);
  let deaths = 0;
  for (let i = 1; i < trace.length; i++) {
    if (trace[i].n < trace[i - 1].n) deaths++;
  }
  const burnedOut = sawBurn && deaths > 0;
  console.log(burnedOut ? `PASS · zombies burn in daylight and die (${deaths} death events)` : "FAIL · no burning/deaths observed");
  await c.close();
} catch (e) {
  console.error("probe error:", e.message);
}
chrome.kill();
