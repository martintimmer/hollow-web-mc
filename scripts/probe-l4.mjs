import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
const chrome=spawn("/usr/bin/chromium",["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9412","about:blank"],{stdio:"ignore"});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
await sleep(1500);
const c=await CDP({port:9412}); const {Page,Runtime}=c; await Page.enable(); await Runtime.enable();
const errs=[]; Runtime.exceptionThrown(p=>errs.push(String(p.exceptionDetails?.exception?.description||p.exceptionDetails?.text||"").slice(0,400)));
await Page.navigate({url:"http://127.0.0.1:5450/?sim=1"}); await sleep(8000);
const r=await Runtime.evaluate({expression:`(()=>{const api=window.__sim?.api; const s=window.__sim?.s;
  api.stampRun("far",(w)=>{ for(let i=0;i<3;i++) w(64+i,65,-40,5); });
  s.uiPaused=false; s.active=true; return true;})()`,returnByValue:true});
await sleep(6000);
const r2=await Runtime.evaluate({expression:`(()=>{const s=window.__sim?.s;
  let meshed=0, total=0;
  for(const c of s.chunks.values()){total++; if(c.meshes) meshed++;}
  return { total, meshed, meshQ: s.meshQ.length, q: s.liquidQ.length };})()`,returnByValue:true});
console.log("state:", JSON.stringify(r2.result?.value));
console.log("errors:", errs.slice(0,3).join(" || "));
await c.close(); chrome.kill();
