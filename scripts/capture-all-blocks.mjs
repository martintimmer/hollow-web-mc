/**
 * @file scripts/capture-all-blocks.mjs
 * Sim-mode per-block visual verification:
 *  - places blocks ids START..END in rows of ROW (=12) on the flat pad (spacing 2)
 *  - captures one screenshot per row into snapshots/blocks/row-NNN-START-END.jpg
 *  - writes docs/BLOCK_ROWS.json so the audit can map rows → ids
 * Usage: node scripts/capture-all-blocks.mjs 151 699
 */
import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";
import path from "node:path";

const START = parseInt(process.argv[2] ?? "151", 10);
const END = parseInt(process.argv[3] ?? "699", 10);
const ROW = parseInt(process.argv[4] ?? "12", 10);

const OUT = "snapshots/blocks";
fs.mkdirSync(OUT, { recursive: true });

const PORT = 9400;
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader",`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
await sleep(1500);

try{
  const c=await CDP({port:PORT}); const {Page,Runtime}=c; await Page.enable(); await Runtime.enable();
  await Page.navigate({url:"http://127.0.0.1:5450/?sim=1"}); await sleep(8000);

  // which ids exist & are placeable
  const ids=await Runtime.evaluate({expression:`(()=>{
    const api=window.__sim?.api; const s=window.__sim?.s;
    if(!api) return null;
    return true;
  })()`,returnByValue:true});
  console.log("sim ready:", !!ids.result?.value);

  const rows=[]; // {file, ids[]}
  const perRow=[];
  for (let id=START; id<=END; id++) perRow.push(id);

  const nRows=Math.ceil(perRow.length/ROW);
  for (let r=0;r<nRows;r++){
    const rowIds=perRow.slice(r*ROW,(r+1)*ROW);
    const label=`${String(r+1).padStart(3,"0")}-${rowIds[0]}-${rowIds[rowIds.length-1]}`;
    const file=`row-${label}.jpg`;
    rows.push({ file, ids: rowIds });
    const ok=await Runtime.evaluate({expression:`(()=>{
      const api=window.__sim?.api; const s=window.__sim?.s;
      const ids=${JSON.stringify(rowIds)};
      api.stampRun("row",(w)=>{ for(let i=0;i<ids.length;i++) w(2+i*2, 65, ${r*2}, ids[i]); });
      s.player.x=${2+Math.min(rowIds.length-1,ROW-1)*2/2}; s.player.y=68.5; s.player.z=${12+r*2};
      s.player.yaw=0; s.player.pitch=-0.14; s.player.fly=true;
      s.uiPaused=false; s.active=true; s.time=6000; s.timeFlow=false;
      return true;
    })()`,returnByValue:true});
    if(!ok.result?.value){ console.error("row",label,"FAILED"); process.exitCode=1; break; }
    await sleep(2300);
    const d=await Runtime.evaluate({expression:`(()=>{const s=window.__sim?.s;const cv=s?.renderer?.domElement;return cv?cv.toDataURL("image/jpeg",0.88):null;})()`,returnByValue:true});
    if(d.result?.value){ fs.writeFileSync(path.join(OUT,file), Buffer.from(d.result.value.split(",")[1],"base64")); console.log("saved",file); }
    else { console.error("capture failed", label); }
  }
  fs.writeFileSync("docs/BLOCK_ROWS.json", JSON.stringify(rows,null,2));
  console.log(`rows total: ${rows.length}`);
  await c.close();
}catch(e){ console.error(e); process.exitCode=1; } finally { chrome.kill(); }
