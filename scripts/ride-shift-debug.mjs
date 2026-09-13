import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9431","about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
try {
  const c = await CDP({ port: 9431 });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);
  const ev = async (expr) => { const r = await Runtime.evaluate({ expression: expr, returnByValue: true }); return r.result?.value; };
  // name a cow, then hold Shift, mount, and watch the state
  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    api.spawnAnimal("cow",10,8);
    s.hotbar[0]=1044;s.slot=0;s.player.x=8.2;s.player.y=66.4;s.player.z=8.5;s.player.yaw=-Math.PI/2;s.player.pitch=-0.15;s.player.fly=true;
    s.active=true;s.uiPaused=false;s.timeFlow=false;return 1;})()`);
  await sleep(400);
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyE"}))`);
  await sleep(500);
  await ev(`(()=>{const i=document.querySelector('input[placeholder="Pet name…"]');if(i){const st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;st.call(i,"B");i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));}return 1;})()`);
  await sleep(500);
  // re-aim at the cow, hold Shift, then right-click mount
  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    const cow=api.mobs().animals.find(a=>a.t==="cow");
    s.player.x=cow.x-2.6;s.player.y=cow.y+1.4;s.player.z=cow.z;s.player.yaw=-Math.PI/2;s.player.pitch=-0.15;
    s.hotbar[0]=0;s.slot=0;return 1;})()`);
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"ShiftLeft"})); "shift"`);
  await sleep(200);
  await ev(`(()=>{const cv=document.querySelector("canvas");cv.dispatchEvent(new MouseEvent("mousedown",{button:2,bubbles:true,clientX:innerWidth/2,clientY:innerHeight/2}));return 1;})()`);
  for (let i = 0; i < 6; i++) {
    await sleep(300);
    const st = await ev(`(()=>{const s=window.__sim?.s;return {ridden:!!s.riddenAnimal, shiftHeld:s.rideShiftHeld, keyShift:!!s.keys["ShiftLeft"], lastDismount:s.lastDismountAt};})()`);
    console.log("t+" + (i + 1) * 0.3 + "s", JSON.stringify(st));
  }
  await c.close();
} catch (e) { console.error("probe error:", e.message); }
chrome.kill();
