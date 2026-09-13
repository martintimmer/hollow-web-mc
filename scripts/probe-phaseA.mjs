import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";
const chrome=spawn("/usr/bin/chromium",["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9415","about:blank"],{stdio:"ignore"});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
await sleep(1500);
const c=await CDP({port:9415}); const {Page,Runtime}=c; await Page.enable(); await Runtime.enable();
await Page.navigate({url:"http://127.0.0.1:5450/?sim=1"}); await sleep(8000);
const ev=async(expr)=>{const r=await Runtime.evaluate({expression:expr,returnByValue:true});return r.result?.value;};

// 1) clouds independent of player
await ev(`(()=>{const s=window.__sim?.s; s.uiPaused=false;s.active=true;s.time=6000;s.timeFlow=false;s.clouds.visible=true; return 1;})()`);
await sleep(600);
const c1=await ev(`(()=>{const s=window.__sim?.s; return { pos:[s.clouds.position.x,s.clouds.position.y,s.clouds.position.z], p:[s.player.x,s.player.z] };})()`);
await sleep(1500);
await ev(`(()=>{const s=window.__sim?.s; s.player.x = s.player.x + 50; s.player.z = s.player.z + 50; return 1;})()`);
await sleep(1200);
const c2=await ev(`(()=>{const s=window.__sim?.s; return { pos:[s.clouds.position.x,s.clouds.position.y,s.clouds.position.z], p:[s.player.x,s.player.z] };})()`);
const cloudMovedOk=Math.abs(c1.pos[0]-c2.pos[0])>0.1 && Math.abs(c1.p[0]-c2.p[0])>40;
console.log("clouds:", cloudMovedOk?"PASS":"FAIL", JSON.stringify({c1,c2}));

// 2) moon visible at night
await ev(`(()=>{const s=window.__sim?.s; s.time=18000; s.clouds.visible=false; return 1;})()`);
await sleep(1500);
const moon=await ev(`(()=>{const s=window.__sim?.s; return { op: +(s.moonBox.material.opacity).toFixed(2), y: +((s.moonBox.position.y - s.player.y)).toFixed(1) };})()`);
console.log("moon:", moon.op>0.5?"PASS":"FAIL", JSON.stringify(moon));

// 3) +6h button works
const before=await ev(`(()=>window.__sim?.s.time)()`);
const clicked=await ev(`(()=>{const b=Array.from(document.querySelectorAll("button")).find(x=>x.textContent.includes("+6h")); if(!b) return false; b.click(); return true;})()`);
await sleep(800);
const after=await ev(`(()=>window.__sim?.s.time)()`);
console.log("+6h:", clicked&&(Math.abs((after-before+24000)%24000-6000)<2)?"PASS":"FAIL", JSON.stringify({before,after,clicked}));

// 4) pig & chicken eyes screenshot
await ev(`(()=>{const api=window.__sim?.api; const s=window.__sim?.s;
  api.stampEntity && api.stampEntity("pig",4,6);
  api.stampEntity && api.stampEntity("chicken",12,6);
  s.player.x=8;s.player.y=66.0;s.player.z=9.5;s.player.yaw=0;s.player.pitch=-0.18;s.player.fly=true;s.time=6000;
  return 1;})()`);
await sleep(2500);
const d=await ev(`(()=>{const s=window.__sim?.s;const cv=s?.renderer?.domElement; cv && s.renderer.render(s.scene,s.camera); return cv?cv.toDataURL("image/jpeg",0.9):null;})()`);
if(d){ fs.writeFileSync("snapshots/eyes-pig-chicken.jpg", Buffer.from(d.split(",")[1],"base64")); console.log("eyes shot saved"); }
await c.close(); chrome.kill();
