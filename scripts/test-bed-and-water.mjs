import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";
const PORT = 9311;
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader",`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
await sleep(1500);
let fails=0;
const check=(l,c,d="")=>{console.log(`${c?"PASS":"FAIL"} · ${l} ${d}`);if(!c)fails++;};
try{
  const c=await CDP({port:PORT}); const {Page,Runtime}=c; await Page.enable(); await Runtime.enable();
  await Page.navigate({url:"http://127.0.0.1:5450/?sim=1"}); await sleep(8000);

  const res=await Runtime.evaluate({expression:`(()=>{
    const api=window.__sim?.api; const s=window.__sim?.s;
    if(!api||!s) return {ok:false};
    try{api.undo();api.undo();api.undo();api.undo();api.undo();}catch{}
    // Bed at (14,65,0); water source at (26,65,0) on pad (spread on grass y=65)
    api.stampRun("bed+water",(w)=>{ w(14,65,0,1162); w(26,65,0,39); });
    s.player.x=12; s.player.y=66.4; s.player.z=6;
    s.player.yaw=0; s.player.pitch=-0.15;
    s.player.fly=true; s.uiPaused=false; s.active=true; s.time=14000; s.timeFlow=false;
    return { ok:true };
  })()`, returnByValue:true});
  await sleep(5000);
  const grab=async(name,x,z=6)=>{
    await Runtime.evaluate({expression:`(()=>{const s=window.__sim.s;s.player.x=${x};s.player.z=${z};return true;})()`,returnByValue:true});
    await sleep(1500);
    const d=await Runtime.evaluate({expression:`(()=>{const s=window.__sim?.s;const cv=s?.renderer?.domElement;return cv?cv.toDataURL("image/jpeg",0.9):null;})()`,returnByValue:true});
    if(d.result?.value) fs.writeFileSync("snapshots/"+name, Buffer.from(d.result.value.split(",")[1],"base64"));
  };
  await grab("bed-water-A.jpg", 12);
  // count water extent after sim
  const w1=await Runtime.evaluate({expression:`(()=>{
    const s=window.__sim?.s; const state=s.chunks.get("1,0")?.data;
    if(!state){return null;}
    let n=0,minx=999,maxx=-999;
    for(let x=0;x<16;x++){ if(state[65*256+0*16+x]===39){n++; if(x<minx)minx=x; if(x>maxx)maxx=x;} }
    return { n, span:[minx,maxx] };
  })()`, returnByValue:true});
  console.log("water in chunk 1,0 (x16..31):", JSON.stringify(w1.result?.value));
  // delete source (26) via bucket path: write 0 + dryup through edit
  const del=await Runtime.evaluate({expression:`(()=>{
    const api=window.__sim?.api; const s=window.__sim?.s;
    // direct simulation of edit(): data + dryup through the real path is internal; use setRaw-like stamp
    api.stampRun("removeSource",(w)=>{ w(26,65,0,0); });
    return { ok:true };
  })()`, returnByValue:true});
  await sleep(4000);
  const w2=await Runtime.evaluate({expression:`(()=>{
    const s=window.__sim?.s;
    let water=0, lava=0;
    for(const c of s.chunks.values()){ const d=c?.data; if(!d) continue;
      for(let y=60;y<70;y++) for(let z=0;z<16;z++) for(let x=0;x<16;x++){ const i=y*256+z*16+x; if(d[i]===39) water++; if(d[i]===40) lava++; } }
    return { water, lava };
  })()`, returnByValue:true});
  console.log("water count after source removal:", JSON.stringify(w2.result?.value));
  check("water source removed → puddle dries", (w2.result?.value?.water ?? 999) < 4, `water=${w2.result?.value?.water}`);
  await grab("bed-water-B.jpg", 12);
  await c.close();
}catch(e){console.error(e);fails++;}finally{chrome.kill();}
console.log(fails?`${fails} FAILURES`:"DONE");
