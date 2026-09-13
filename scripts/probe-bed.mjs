import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";
const PORT = 9322;
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader",`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
await sleep(1500);
try{
  const c=await CDP({port:PORT}); const {Page,Runtime}=c; await Page.enable(); await Runtime.enable();
  await Page.navigate({url:"http://127.0.0.1:5450/?sim=1"}); await sleep(8000);
  const r=await Runtime.evaluate({expression:`(()=>{
    const api=window.__sim?.api; const s=window.__sim?.s;
    api.stampRun("bed",(w)=>{ w(14,65,0,1162); });
    // sample the atlas slot 878 in the page
    const cv=s.atlasTex?.image;
    const g=cv?.getContext("2d");
    const px=g?Array.from(g.getImageData((878%32)*16+8, Math.floor(878/32)*16+8, 1, 1).data):null;
    const ch=s.chunks.get("0,0")?.data;
    s.player.x=14; s.player.y=67.4; s.player.z=2.6;
    s.player.yaw=0; s.player.pitch=-0.5; s.player.fly=true;
    s.uiPaused=false; s.active=true; s.time=6000; s.timeFlow=false;
    return { px, cell: ch?.[65*256+0*16+14] };
  })()`, returnByValue:true});
  console.log("probe:", JSON.stringify(r.result?.value));
  await sleep(4500);
  const d=await Runtime.evaluate({expression:`(()=>{const s=window.__sim?.s;const cv=s?.renderer?.domElement;return cv?cv.toDataURL("image/jpeg",0.9):null;})()`,returnByValue:true});
  if(d.result?.value){ fs.writeFileSync("snapshots/bed-close.jpg", Buffer.from(d.result.value.split(",")[1],"base64")); console.log("saved"); }
  await c.close();
}catch(e){console.error(e)}finally{chrome.kill()}
