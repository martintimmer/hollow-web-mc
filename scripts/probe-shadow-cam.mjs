import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
const PORT = 9308;
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader",`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
await sleep(1500);
try{
  const c=await CDP({port:PORT}); const {Page,Runtime}=c; await Page.enable(); await Runtime.enable();
  await Page.navigate({url:"http://127.0.0.1:5450/?sim=1"}); await sleep(7000);
  const r=await Runtime.evaluate({expression:`(()=>{
    const s=window.__sim?.s; const cam=s?.sun?.shadow?.camera;
    if(!cam) return {no:true};
    return { left:cam.left, right:cam.right, top:cam.top, bottom:cam.bottom, near:cam.near, far:cam.far,
             projUpd:cam.projectionMatrixNeedsUpdate,
             elements:Array.from(cam.projectionMatrix.elements).map(v=>Math.round(v*100)/100),
             lightAt:[s.sun.position.x-s.player.x,s.sun.position.y-s.player.y,s.sun.position.z-s.player.z].map(v=>Math.round(v)),
             mapSize:[s.sun.shadow.mapSize.width,s.sun.shadow.mapSize.height],
             shadowEnabled: s.renderer.shadowMap.enabled,
             castOn: s.sun.castShadow };
  })()`, returnByValue:true});
  console.log(JSON.stringify(r.result?.value));
  await c.close();
}catch(e){console.error(e)}finally{chrome.kill()}
