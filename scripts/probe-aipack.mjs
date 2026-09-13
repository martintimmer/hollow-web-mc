import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";
const chrome=spawn("/usr/bin/chromium",["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9417","about:blank"],{stdio:"ignore"});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
await sleep(1500);
const c=await CDP({port:9417}); const {Page,Runtime}=c; await Page.enable(); await Runtime.enable();
await Page.navigate({url:"http://127.0.0.1:5400/"}); await sleep(4000);
const ev=async(expr)=>{const r=await Runtime.evaluate({expression:expr,returnByValue:true});return r.result?.value;};
await ev(`(()=>{const b=Array.from(document.querySelectorAll("button")).find(b=>b.innerText.toLowerCase().includes("quick play")); if(b)b.click(); return !!b;})()`);
await sleep(9000);
let fails=0; const chk=(l,ok,d="")=>{console.log(`${ok?"PASS":"FAIL"} · ${l} ${d}`); if(!ok)fails++;};

await ev(`(()=>{const s=window.__sim?.s; const api=window.__sim?.api;
  if(!s||!api) return {ok:false};
  s.uiPaused=false;s.active=true;s.menuOpen=false;s.pauseOpen=false;
  const px=Math.floor(s.player.x), pz=Math.floor(s.player.z);
  api.stampRun("scene",(w)=>{ for(let y=0;y<=4;y++){ w(px+6, Math.floor(s.player.y)+y-2, pz-8, 4); } w(px-4, Math.floor(s.player.y)-1, pz-6, 39); });
  api.spawnAnimal("pig",px+1,pz+1); api.spawnAnimal("pig",px+3,pz+2); api.spawnAnimal("pig",px+2,pz+4);
  return {ok:true, px, pz, y: Math.floor(s.player.y)};})()`);
await sleep(9000);

// herd: min pairwise distance over 12s
const herd=await ev(`(async ()=>{
  const s=window.__sim?.s;
  let minD=999;
  for(let i=0;i<24;i++){ await new Promise(r=>setTimeout(r,500));
    const list=window.__sim.api.mobs().animals.filter(a=>a.t==="pig");
    for(let x=0;x<list.length;x++) for(let y=x+1;y<list.length;y++){
      const d=Math.hypot(list[x].x-list[y].x, list[x].z-list[y].z); if(d<minD)minD=d; }
  }
  return { minD: Math.round(minD*10)/10, n: window.__sim.api.mobs().animals.length };
})()`);
console.log("herd:", JSON.stringify(herd));
chk("pigs herd toward each other (minDist < 3.5 within 12s)", herd && herd.minD < 3.5, JSON.stringify(herd));

// wall: no pig inside the wall segment / pond: no pig in water
const geo=await ev(`(()=>{
  const s=window.__sim?.s; const api=window.__sim?.api;
  const px=Math.floor(s.player.x), pz=Math.floor(s.player.z);
  const list=api.mobs().animals;
  let inside=0, inWater=0;
  for(const a of list){
    const d=Math.min(
      Math.hypot(a.x-(px+6), a.z-(pz-8)),
      Math.hypot(a.x-(px+7), a.z-(pz-8)),
      Math.hypot(a.x-(px+6), a.z-(pz-7)));
    if(d<0.45) inside++;
    const c=s.chunks.get(String(Math.floor(a.x)>>4)+","+String(Math.floor(a.z)>>4))?.data;
    if(c){ const off=Math.floor(a.y)*256+((Math.floor(a.z)&15)*16)+(Math.floor(a.x)&15);
      if(c[off]===39) inWater++; }
  }
  return { total: list.length, inside, inWater };
})()`);
console.log("geo:", JSON.stringify(geo));
chk("no animal inside the wall core", geo.inside === 0, JSON.stringify(geo));
chk("no animal standing in a water cell", geo.inWater === 0, JSON.stringify(geo));

const d=await ev(`(()=>{const s=window.__sim?.s;const cv=s?.renderer?.domElement; cv&&s.renderer.render(s.scene,s.camera); return cv?cv.toDataURL("image/jpeg",0.85):null;})()`);
if(d) fs.writeFileSync("snapshots/aipack.jpg", Buffer.from(d.split(",")[1],"base64"));
console.log(fails?`${fails} FAILURES`:"AI PACK PROBES DONE");
await c.close(); chrome.kill();
