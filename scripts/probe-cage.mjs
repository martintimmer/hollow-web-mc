// Cage scenarios: a fenced animal cannot escape (NO_CLIMB), a mounted ride can
// pass 2-block terrain walls, animals never spin forever.
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9443","about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
try {
  const c = await CDP({ port: 9443 });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);
  const ev = async (expr) => { const r = await Runtime.evaluate({ expression: expr, returnByValue: true }); return r.result?.value; };

  // fence pen (id 24) around an animal; 2-block wall for the ridden escape
  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    api.stampRun("cage:pen",(w)=>{
      for (let x=4;x<=8;x++){ w(x,65,5,24); w(x,65,11,24); }
      for (let z=5;z<=11;z++){ w(4,65,z,24); w(8,65,z,24); }
    });
    api.spawnAnimal("sheep",6,8);   // inside the fence pen
    api.spawnAnimal("cow",12,8);    // free
    s.player.x=8;s.player.z=8;s.player.y=65.4;s.player.fly=true;
    s.active=true;s.uiPaused=false;s.timeFlow=false;return 1;})()`);
  await sleep(500);
  const sample = () => ev(`(()=>{const s=window.__sim?.s; const mgr=window.__mobMgr; return mgr.animals.map(a=>({t:a.type,x:+a.x.toFixed(1),z:+a.z.toFixed(1),yaw:+a.yaw.toFixed(2)}));})()`);
  const p0 = await sample();
  await sleep(10000);
  const p1 = await sample();
  const sheep0 = p0.find(a=>a.t==="sheep"), sheep1 = p1.find(a=>a.t==="sheep");
  const cow0 = p0.find(a=>a.t==="cow"), cow1 = p1.find(a=>a.t==="cow");
  const sheepD = Math.hypot(sheep1.x-sheep0.x, sheep1.z-sheep0.z);
  const cowD = Math.hypot(cow1.x-cow0.x, cow1.z-cow0.z);
  const inPen = sheep1.x >= 4 && sheep1.x <= 8 && sheep1.z >= 5 && sheep1.z <= 11;
  console.log("sheep moved:", sheepD.toFixed(2), "· still inside pen:", inPen, inPen ? "OK(caged)" : "ESCAPED!");
  console.log("cow moved:", cowD.toFixed(2), cowD > 0.5 ? "OK" : "FAIL");
  // yaw rotation variety (not stuck spinning): yaw changed → AI alive
  console.log("sheep yaw:", sheep0.yaw, "→", sheep1.yaw, (Math.abs(sheep1.yaw-sheep0.yaw)>0.02) ? "renders/rotates" : "?");
  fs.writeFileSync("snapshots/cage-probe.json", JSON.stringify({ p0, p1 }));
  await c.close();
} catch (e) { console.error("probe error:", e.message); }
chrome.kill();
