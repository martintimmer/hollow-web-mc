// Focused: mount (robust re-aim) then SPACE jump on a RIDDEN cow.
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9457","about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
try {
  const c = await CDP({ port: 9457 });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);
  const ev = async (expr) => { const r = await Runtime.evaluate({ expression: expr, returnByValue: true }); return r.result?.value; };
  await ev(`(()=>{const api=window.__sim.api;const s=window.__sim.s;
    api.spawnAnimal("cow",10,8);
    s.hotbar[0]=1044;s.slot=0;s.player.x=8.2;s.player.y=66.4;s.player.z=8.5;s.player.yaw=-Math.PI/2;s.player.pitch=-0.15;s.player.fly=true;
    s.active=true;s.uiPaused=false;s.timeFlow=false;return 1;})()`);
  await sleep(400);
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyE"}))`);
  await sleep(500);
  await ev(`(()=>{const i=document.querySelector('input[placeholder="Pet name…"]');if(i){const st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;st.call(i,"J");i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));}return 1;})()`);
  await sleep(500);
  // re-aim EXACTLY then mount
  await ev(`(()=>{const api=window.__sim.api;const s=window.__sim.s;
    const cow=api.mobs().animals.find(a=>a.t==="cow");
    s.player.x=cow.x-2.5;s.player.y=cow.y+1.4;s.player.z=cow.z;s.player.yaw=-Math.PI/2;s.player.pitch=-0.1;
    s.hotbar[0]=0;s.slot=0;const cv=document.querySelector("canvas");
    cv.dispatchEvent(new MouseEvent("mousedown",{button:2,bubbles:true,clientX:innerWidth/2,clientY:innerHeight/2}));return 1;})()`);
  await sleep(600);
  const mounted = await ev(`(()=>{const s=window.__sim.s;return !!s.riddenAnimal;})()`);
  console.log("mounted:", mounted);
  if (mounted) {
    const y0 = await ev(`(()=>{const s=window.__sim.s;return +s.riddenAnimal.y.toFixed(2);})()`);
    await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"Space"}))`);
    let peak = y0;
    for (let i = 0; i < 10; i++) { await sleep(120); const y = await ev(`(()=>{const s=window.__sim.s;return +s.riddenAnimal.y.toFixed(2);})()`); if (y > peak) peak = y; }
    await ev(`window.dispatchEvent(new KeyboardEvent("keyup",{code:"Space"}))`);
    console.log(`y0=${y0} peak=${peak} → ${peak - y0 > 0.8 ? "PASS · jumps ~1 block" : "FAIL"}`);
  }
  await c.close();
} catch (e) { console.error("probe error:", e.message); }
chrome.kill();
