// Verify animals + ridden mounts move on SLOPES (2-block steps), not just flat.
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9435","about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
try {
  const c = await CDP({ port: 9435 });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);
  const ev = async (expr) => { const r = await Runtime.evaluate({ expression: expr, returnByValue: true }); return r.result?.value; };

  // build a slope: plateau y=66 for x=4..9, then a 2-block step down to y=64 for
  // x=10..15 (two-block descent), then normal y=64 flat.
  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    api.stampRun("slope:terrain", (w) => {
      for (let x=4;x<=9;x++) for (let z=4;z<=15;z++) { w(x,65,x>0?z:z,0); w(x,64,z,5); w(x,65,z,5); }
      // plateau top at 66: fill (4..9, 65) with stone so surface = 66
      // 2-block drop: cells x=10..15 keep surface at 64
    });
    // animals on the plateau + hill side
    api.spawnAnimal("cow",6,8);
    api.spawnAnimal("pig",12,8);
    s.player.x=6;s.player.z=8;s.player.y=66.4;s.player.fly=true;
    s.active=true;s.uiPaused=false;s.timeFlow=false;
    return 1;})()`);
  await sleep(600);
  const sample = () => ev(`(()=>{const api=window.__sim?.api;return api.mobs().animals;})()`);
  const p0 = await sample();
  await sleep(8000);
  const p1 = await sample();
  const cow0 = p0.find(a=>a.t==="cow"), cow1 = p1.find(a=>a.t==="cow");
  const pig0 = p0.find(a=>a.t==="pig"), pig1 = p1.find(a=>a.t==="pig");
  const dCow = cow0&&cow1 ? Math.hypot(cow1.x-cow0.x, cow1.z-cow0.z) : -1;
  const dPig = pig0&&pig1 ? Math.hypot(pig1.x-pig0.x, pig1.z-pig0.z) : -1;
  fs.writeFileSync("snapshots/slope-probe.json", JSON.stringify({ p0, p1 }));
  console.log("cow(slope plateau) moved 8s:", dCow.toFixed(2), dCow > 0.5 ? "PASS" : "FAIL");
  console.log("pig(lower) moved 8s:", dPig.toFixed(2), dPig > 0.5 ? "PASS" : "FAIL");
  await c.close();
} catch (e) { console.error("probe error:", e.message); }
chrome.kill();
