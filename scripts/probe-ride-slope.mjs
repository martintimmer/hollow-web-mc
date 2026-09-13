// Verify the RIDDEN mount crosses a 2-block terrain step (no freeze).
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9437","about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
try {
  const c = await CDP({ port: 9437 });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);
  const ev = async (expr) => { const r = await Runtime.evaluate({ expression: expr, returnByValue: true }); return r.result?.value; };

  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    // plateau x=4..9 at y=66 (stone at 65); drop to ground 64 at x=10..15
    api.stampRun("ride-slope:terrain", (w) => {
      for (let x=4;x<=9;x++) for (let z=4;z<=15;z++) { w(x,64,z,5); w(x,65,z,5); }
      for (let x=16;x<=17;x++) for (let z=7;z<=10;z++) { w(x,65,z,5); w(x,66,z,5); } // 2-block wall
    });
    api.spawnAnimal("cow",6,8);
    s.hotbar[0]=1044;s.slot=0;s.player.x=3.6;s.player.y=66.4;s.player.z=8.5;s.player.yaw=-Math.PI/2;s.player.pitch=-0.15;s.player.fly=true;
    s.active=true;s.uiPaused=false;s.timeFlow=false;return 1;})()`);
  await sleep(400);
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyE"}))`);
  await sleep(500);
  await ev(`(()=>{const i=document.querySelector('input[placeholder="Pet name…"]');if(i){const st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;st.call(i,"B");i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));}return 1;})()`);
  await sleep(400);
  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    const cow=api.mobs().animals.find(a=>a.t==="cow");
    s.player.x=cow.x-2.6;s.player.y=cow.y+1.4;s.player.z=cow.z;s.player.yaw=-Math.PI/2;s.player.pitch=-0.15;
    s.hotbar[0]=0;s.slot=0;const cv=document.querySelector("canvas");
    cv.dispatchEvent(new MouseEvent("mousedown",{button:2,bubbles:true,clientX:innerWidth/2,clientY:innerHeight/2}));return 1;})()`);
  await sleep(600);
  const mounted = await ev(`(()=>{const s=window.__sim?.s; return !!(s&&s.riddenAnimal);})()`);
  console.log("mounted:", mounted);
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyW"})); "w"`);
  const sampleN = () => ev(`(()=>{const s=window.__sim?.s; return s&&s.riddenAnimal? {x:+s.riddenAnimal.x.toFixed(1), y:+s.riddenAnimal.y.toFixed(1), z:+s.riddenAnimal.z.toFixed(1)} : null;})()`);
  const hist = [];
  for (let i = 0; i < 12; i++) { await sleep(500); hist.push(await sampleN()); }
  const t0 = hist[0], t1 = hist[11];
  const dropped = t0 && t1 && t1.x > 10.5;
  const wallH = hist.some(h=>h&&h.y>=66.9);
  const crossed = t0 && t1 && t1.x > 17.5; // crossed BOTH drop and 2-wall
  fs.writeFileSync("snapshots/ride-slope-probe.json", JSON.stringify({ hist }));
  console.log("hist y:", JSON.stringify(hist.map(h=>h&&h.y)));
  console.log(wallH ? "PASS · mounted climbed a 2-block wall (y≥67)" : "WARN · did not reach y≥67");
  console.log(crossed ? "PASS · rode across drop + wall" : "FAIL · stuck");
  await c.close();
} catch (e) { console.error("probe error:", e.message); }
chrome.kill();
