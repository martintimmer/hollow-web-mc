// Verify: mount → dismount on GROUND (not canopy) → animal keeps wandering.
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9433","about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
try {
  const c = await CDP({ port: 9433 });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);
  const ev = async (expr) => { const r = await Runtime.evaluate({ expression: expr, returnByValue: true }); return r.result?.value; };

  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    api.spawnAnimal("cow",10,8);
    s.hotbar[0]=1044;s.slot=0;s.player.x=8.2;s.player.y=66.4;s.player.z=8.5;s.player.yaw=-Math.PI/2;s.player.pitch=-0.15;s.player.fly=true;
    s.active=true;s.uiPaused=false;s.timeFlow=false;return 1;})()`);
  await sleep(400);
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyE"}))`);
  await sleep(500);
  await ev(`(()=>{const i=document.querySelector('input[placeholder="Pet name…"]');if(i){const st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;st.call(i,"B");i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));}return 1;})()`);
  await sleep(400);
  // aim + mount
  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    const cow=api.mobs().animals.find(a=>a.t==="cow");
    s.player.x=cow.x-2.6;s.player.y=cow.y+1.4;s.player.z=cow.z;s.player.yaw=-Math.PI/2;s.player.pitch=-0.15;
    s.hotbar[0]=0;s.slot=0;
    const cv=document.querySelector("canvas");
    cv.dispatchEvent(new MouseEvent("mousedown",{button:2,bubbles:true,clientX:innerWidth/2,clientY:innerHeight/2}));return 1;})()`);
  await sleep(500);
  // ride a moment
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyW"}))`);
  await sleep(1500);
  await ev(`window.dispatchEvent(new KeyboardEvent("keyup",{code:"KeyW"}))`);
  // fresh Shift press = dismount
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"ShiftLeft"}))`);
  await sleep(300);
  await ev(`window.dispatchEvent(new KeyboardEvent("keyup",{code:"ShiftLeft"}))`);
  await sleep(300);
  const after = await ev(`(()=>{const s=window.__sim?.s;return {ridden:!!s.riddenAnimal, playerY:+s.player.y.toFixed(1), px:+s.player.x.toFixed(1), pz:+s.player.z.toFixed(1)};})()`);
  console.log("after dismount:", JSON.stringify(after), "(playerY ~65-66 = ground beside animal, NOT canopy)");
  // animal must keep wandering: sample its position twice
  const sample = () => ev(`(()=>{const api=window.__sim?.api; const c=api.mobs().animals.find(a=>a.t==="cow"); return c?{x:c.x,z:c.z}:null;})()`);
  const p0 = await sample();
  await sleep(6000);
  const p1 = await sample();
  const moved = p0 && p1 ? Math.hypot(p1.x - p0.x, p1.z - p0.z) : -1;
  fs.writeFileSync("snapshots/ride-dismount-probe.json", JSON.stringify({ after, p0, p1, moved }));
  console.log("animal moved after dismount (6s):", moved.toFixed(2), moved > 0.5 ? "PASS · animal keeps wandering" : "FAIL · animal frozen");
  await c.close();
} catch (e) { console.error("probe error:", e.message); }
chrome.kill();
