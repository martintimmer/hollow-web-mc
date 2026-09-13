import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
const chrome=spawn("/usr/bin/chromium",["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9414","about:blank"],{stdio:"ignore"});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
await sleep(1500);
const c=await CDP({port:9414}); const {Page,Runtime}=c; await Page.enable(); await Runtime.enable();
await Page.navigate({url:"http://127.0.0.1:5400/"}); await sleep(4000);
await Runtime.evaluate({expression:`(()=>{const b=Array.from(document.querySelectorAll("button")).find(b=>b.innerText.toLowerCase().includes("quick play")); if(b)b.click(); return !!b;})()`,returnByValue:true});
await sleep(8000);
await Runtime.evaluate({expression:`(()=>{const s=window.__sim?.s; if(!s)return{ok:false}; s.uiPaused=false;s.active=true;s.menuOpen=false;s.pauseOpen=false; return {ok:true};})()`,returnByValue:true});
await sleep(3000);
const r=await Runtime.evaluate({expression:`(async ()=>{
  const s=window.__sim?.s; let frames=0; const t0=performance.now();
  await new Promise(res=>{ const step=(n)=>{ frames++; if(performance.now()-t0<5000) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
  const info=s.renderer.info.render;
  return { frames, span: performance.now()-t0, fps: (frames*1000/(performance.now()-t0)).toFixed(1), tris: info.triangles, calls: info.calls, meshQ: s.meshQ.length, genQ: s.genQ.length };
})()`, awaitPromise:true, returnByValue:true});
console.log("fps probe:", JSON.stringify(r.result?.value));
await c.close(); chrome.kill();
