/**
 * @file scripts/capture-individual-blocks.mjs
 * Per-item visual verification: place ONE block, close-up capture, pixel signature, next.
 *  - screenshot → snapshots/blocks/block-<id>.jpg
 *  - signature (face region mean rgb / chroma / grass-bg fraction) → docs/BLOCK_AUDIT_DATA.json
 * Usage: node scripts/capture-individual-blocks.mjs <start> <end>
 */
import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";
import path from "node:path";

const START = parseInt(process.argv[2] ?? "151", 10);
const END = parseInt(process.argv[3] ?? "699", 10);
const OUT = "snapshots/blocks";
fs.mkdirSync(OUT, { recursive: true });

const PORT = 9401;
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader",`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
await sleep(1500);

try{
  const c=await CDP({port:PORT}); const {Page,Runtime}=c; await Page.enable(); await Runtime.enable();
  await Page.navigate({url:"http://127.0.0.1:5450/?sim=1"}); await sleep(8000);
  // ensure engine runs & camera rig static once
  await Runtime.evaluate({expression:`(()=>{
    const s=window.__sim?.s;
    s.player.x=2; s.player.y=66.55; s.player.z=4.0; s.player.yaw=0; s.player.pitch=-0.17;
    s.player.fly=true; s.uiPaused=false; s.active=true; s.time=6000; s.timeFlow=false;
    return true;
  })()`,returnByValue:true});
  await sleep(1500);

  const results=[];
  for (let id=START; id<=END; id++){
    const ok=await Runtime.evaluate({expression:`(()=>{
      const api=window.__sim?.api;
      api.stampRun("one",(w)=>{ w(2,65,0,${id}); });
      return true;
    })()`,returnByValue:true});
    if(!ok.result?.value){ console.error(id,"stamp failed"); continue; }
    await sleep(1300);
    const img=await Runtime.evaluate({expression:`(()=>{
      const s=window.__sim?.s; const cv=s?.renderer?.domElement;
      if(!cv) return null;
      const out=cv.toDataURL("image/jpeg",0.9);
      // pixel signature of the block face (screen center, lower-middle band)
      const probe=document.createElement("canvas");
      probe.width=cv.width; probe.height=cv.height;
      const pctx=probe.getContext("2d",{willReadFrequently:true});
      pctx.drawImage(cv,0,0);
      const w=cv.width,h=cv.height;
      const x0=Math.floor(w*0.38), x1=Math.floor(w*0.62);
      const y0=Math.floor(h*0.62), y1=Math.floor(h*0.88);
      const d=pctx.getImageData(x0,y0,x1-x0,y1-y0).data;
      let n=0,sumR=0,sumG=0,sumB=0,grassPx=0;
      for(let i=0;i<d.length;i+=4){
        const r=d[i],g=d[i+1],b=d[i+2];
        sumR+=r;sumG+=g;sumB+=b;n++;
        // grass/ground green ~ (60..110, 120..170, 40..90)
        if(g>r+20 && g>b+30) grassPx++;
      }
      return { mean:[Math.round(sumR/n),Math.round(sumG/n),Math.round(sumB/n)], grassFrac:+(grassPx/n).toFixed(3), b64: out.split(",")[1] };
    })()`,returnByValue:true});
    if(img.result?.value){
      const v=img.result.value;
      fs.writeFileSync(path.join(OUT,`block-${id}.jpg`), Buffer.from(v.b64,"base64"));
      const [r,g,b]=v.mean;
      const chroma=Math.abs(r-g)+Math.abs(g-b)+Math.abs(r-b);
      results.push({ id, mean: v.mean, chroma, grassFrac: v.grassFrac });
      if(id%25===25) console.log(`done ${id}…`);
    } else {
      console.error(id,"capture failed");
    }
  }
  fs.writeFileSync("docs/BLOCK_AUDIT_DATA.json", JSON.stringify(results));
  console.log(`total ${results.length} items captured`);
  await c.close();
}catch(e){ console.error(e); process.exitCode=1; } finally { chrome.kill(); }
