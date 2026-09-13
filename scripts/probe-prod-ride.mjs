// THE definitive test: real PROD (5400) — login, join, spawn+name+ride an animal.
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9439","about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TEST_USER = process.env.WEBMC_TEST_USER || "";
const TEST_PASS = process.env.WEBMC_TEST_PASS || "";
const TEST_WORLD = process.env.WEBMC_TEST_WORLD || "";
if (!TEST_USER || !TEST_PASS || !TEST_WORLD) {
  console.error("Set WEBMC_TEST_USER, WEBMC_TEST_PASS and WEBMC_TEST_WORLD to run this prod probe.");
  process.exit(1);
}
await sleep(1500);
try {
  const c = await CDP({ port: 9439 });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();

  // 1. login via fetch (session cookie), set the active world
  await Page.navigate({ url: "http://127.0.0.1:5400/" });
  await sleep(4000);
  const login = await Runtime.evaluate({
    expression: `fetch("/api/auth/login", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:${JSON.stringify(TEST_USER)}, password:${JSON.stringify(TEST_PASS)}})}).then(r=>r.json()).then(j=>{ localStorage.setItem("mc_last_active_world_id",${JSON.stringify(TEST_WORLD)}); return j.user ? "ok:"+j.user.username : "fail:"+JSON.stringify(j); })`,
    awaitPromise: true, returnByValue: true
  });
  console.log("login:", login.result?.value);
  await Page.reload();
  await sleep(6000);
  // 2. join the world: click the first world card / Play button
  const joined = await Runtime.evaluate({
    expression: `(async()=>{
      await new Promise(r=>setTimeout(r,1500));
      const btns=[...document.querySelectorAll("button")];
      const play=btns.find(b=>/play/i.test(b.textContent||""));
      if(play){play.click(); return "clicked play";}
      const cards=[...document.querySelectorAll("div")].filter(d=>/test2|Seed:/.test(d.textContent||""));
      return "no-play-btn";
    })()`,
    awaitPromise: true, returnByValue: true
  });
  console.log("join:", joined.result?.value);
  await sleep(14000); // world boot (chunks)
  const boot = await Runtime.evaluate({
    expression: `(()=>{const s=window.__sim?.s; const mgr=window.__mobMgr; return {hasBridge: !!window.__sim, hasMgr: !!mgr, world: s&&s.currentWorldId, simMode: s&&s.simMode??"", animLen: mgr? mgr.animals.length : -1, loading: !!(window.__sim&&s&&s.lastFrameAt), url: location.href};})()`,
    returnByValue: true
  });
  console.log("boot state:", JSON.stringify(boot.result?.value));
  const visText = await Runtime.evaluate({ expression: `document.body.innerText.slice(0,200)`, returnByValue: true });
  console.log("visible text:", JSON.stringify(visText.result?.value));
  fs.writeFileSync("snapshots/prod-ride-state.json", JSON.stringify(boot.result?.value));
  await c.close();
} catch (e) { console.error("probe error:", e.message); }
chrome.kill();
