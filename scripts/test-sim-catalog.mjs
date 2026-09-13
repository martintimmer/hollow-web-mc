import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
const PORT = 9310;
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader",`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
await sleep(1500);
try{
  const c=await CDP({port:PORT}); const {Page,Runtime}=c; await Page.enable(); await Runtime.enable();
  await Page.navigate({url:"http://127.0.0.1:5450/?sim=1"}); await sleep(8000);
  // open the sim deck & blocks tab via the exposed api (deck is React UI; use its own state via DOM clicks)
  const r=await Runtime.evaluate({expression:`(()=>{
    // fall back: verify blocksPickList logic through the sim bridge (items count & no item-only ids)
    return { ok: true };
  })()`, returnByValue:true});
  // direct DOM interaction: click deck 'blocks' tab if visible
  const dom=await Runtime.evaluate({expression:`(async ()=>{
    const tab = Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim().toLowerCase()==="blocks");
    if (tab) tab.click();
    await new Promise(r=>setTimeout(r,1500));
    const grid = Array.from(document.querySelectorAll("button")).filter(b=>b.textContent.startsWith("Block")||/:\\s/.test(b.textContent));
    const showMore = Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Show more"));
    const full = Array.from(document.querySelectorAll("div")).find(d=>d.textContent.includes("full catalog loaded")===false);
    const info = document.body.innerText.match(/\d+ items[^\n]*/);
    return { gridButtons: grid.length, showMore: !!showMore, infoText: info ? info[0] : null };
  })()`, awaitPromise:true, returnByValue:true});
  console.log(JSON.stringify(dom.result?.value));
  await c.close();
}catch(e){console.error(e)}finally{chrome.kill()}
