import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9425","about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
try {
  const c = await CDP({ port: 9425 });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);
  const ev = async (expr) => { const r = await Runtime.evaluate({ expression: expr, returnByValue: true }); return r.result?.value; };
  await ev(`(()=>{const api=window.__sim?.api;const s=window.__sim?.s;
    api.stampRun("dbg:wall",(w)=>{for(let wx=14;wx<=17;wx++){w(wx,65,7,5);w(wx,65,8,5);w(wx,65,9,5);w(wx,65,10,5);}});
    api.spawnAnimal("cow",10,8);
    s.hotbar[0]=1044;s.slot=0;s.player.x=8.2;s.player.y=66.4;s.player.z=8.5;s.player.yaw=-Math.PI/2;s.player.pitch=0;s.player.fly=true;
    s.active=true;s.uiPaused=false;s.timeFlow=false;
    return "ok";})()`);
  await sleep(300);
  // name (claim ownership)
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyE"}))`);
  await sleep(500);
  await ev(`(()=>{const i=document.querySelector('input[placeholder="Pet name…"]');if(i){const st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;st.call(i,"B");i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));}return "n";})()`);
  await sleep(500);
  // mount
  await ev(`(()=>{const s=window.__sim?.s;s.hotbar[0]=0;s.slot=0;s.active=true;s.steering=true;const cv=document.querySelector("canvas");cv.dispatchEvent(new MouseEvent("mousedown",{button:2,bubbles:true,clientX:innerWidth/2,clientY:innerHeight/2}));return "m";})()`);
  await sleep(500);
  // push into the wall
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyW"})); "w"`);
  for (let i = 0; i < 10; i++) {
    await sleep(500);
    const dbg = await ev(`(()=>{const mgr=window.__mobMgr; const a=mgr&&mgr.animals.find(x=>x.ridden); if(!a) return "no-ridden";
      return {x:+a.x.toFixed(2), y:+a.y.toFixed(3), z:+a.z.toFixed(2), ground:a.ground, vx:+a.vx.toFixed(1), climb: a.climbTargetY};})()`);
    console.log("t+"+(i+1)*0.5+"s", JSON.stringify(dbg));
  }
  await c.close();
} catch (e) { console.error("probe error:", e.message); }
chrome.kill();
