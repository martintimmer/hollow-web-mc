// 1) animal walks THROUGH tall grass/flowers (no collision), 2) mounted Space jump.
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9455","about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
try {
  const c = await CDP({ port: 9455 });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);
  const ev = async (expr) => { const r = await Runtime.evaluate({ expression: expr, returnByValue: true }); return r.result?.value; };

  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    // field of tall grass (124) + dandelions (125) between 8..14 at z=8
    api.stampRun("flower:field",(w)=>{ for(let x=8;x<=13;x++){ w(x,65,8,124); w(x,65,9,125); }});
    api.spawnAnimal("cow",6,8);
    s.player.x=10;s.player.z=12;s.player.y=65.4;s.player.fly=true;
    s.active=true;s.uiPaused=false;s.timeFlow=false;return 1;})()`);
  await sleep(400);
  const sample = () => ev(`(()=>{const s=window.__sim?.s;const mgr=window.__mobMgr;const a=mgr.animals.find(a=>a.type==="cow");return a?{x:+a.x.toFixed(1),z:+a.z.toFixed(1)}:null;})()`);
  const p0 = await sample();
  await sleep(8000);
  const p1 = await sample();
  const moved = p0 && p1 ? Math.hypot(p1.x-p0.x,p1.z-p0.z) : -1;
  console.log("cow moved through grass/flowers:", moved.toFixed(2), moved > 1 ? "PASS (walks through)" : "FAIL (blocked?)");

  // mounted jump: name cow, mount, ride, press Space, sample y
  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    s.hotbar[0]=1044;s.slot=0;
    const c=api.mobs().animals.find(a=>a.type==="cow");
    s.player.x=c.x-2.6;s.player.y=c.y+1.4;s.player.z=c.z;s.player.yaw=-Math.PI/2;s.player.pitch=-0.15;
    window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyE"}));return 1;})()`);
  await sleep(600);
  await ev(`(()=>{const i=document.querySelector('input[placeholder="Pet name…"]');if(i){const st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;st.call(i,"J");i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));}return 1;})()`);
  await sleep(400);
  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    const c=api.mobs().animals.find(a=>a.type==="cow");
    s.player.x=c.x-2.6;s.player.y=c.y+1.4;s.player.z=c.z;s.player.yaw=-Math.PI/2;s.player.pitch=-0.15;
    s.hotbar[0]=0;s.slot=0;const cv=document.querySelector("canvas");
    cv.dispatchEvent(new MouseEvent("mousedown",{button:2,bubbles:true,clientX:innerWidth/2,clientY:innerHeight/2}));return 1;})()`);
  await sleep(600);
  const y0 = (await ev(`(()=>{const s=window.__sim.s;return s&&s.riddenAnimal?+s.riddenAnimal.y.toFixed(2):-1;})()`)).result?.value;
  console.log("mounted at y:", y0);
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"Space"})); "space"`);
  let peak = y0;
  for (let i = 0; i < 8; i++) {
    await sleep(150);
    const y = (await ev(`(()=>{const s=window.__sim.s;return s&&s.riddenAnimal?+s.riddenAnimal.y.toFixed(2):-1;})()`)).result?.value;
    if (y > peak) peak = y;
  }
  await ev(`window.dispatchEvent(new KeyboardEvent("keyup",{code:"Space"}))`);
  console.log("jump peak y:", peak, "of", y0, peak - y0 > 0.8 ? "PASS (jumps ~1 block)" : "FAIL (no jump)");
  fs.writeFileSync("snapshots/flowers-jump.json", JSON.stringify({ p0, p1, y0, peak }));
  await c.close();
} catch (e) { console.error("probe error:", e.message); }
chrome.kill();
