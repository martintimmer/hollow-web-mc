// REAL PROD (5400): login, join test2, then read the LIVE animal state for 15s.
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9445","about:blank"], { stdio: "ignore" });
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
  const c = await CDP({ port: 9445 });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5400/" });
  await sleep(4000);
  await Runtime.evaluate({ expression: `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:${JSON.stringify(TEST_USER)},password:${JSON.stringify(TEST_PASS)}})}).then(r=>r.json()).then(j=>{localStorage.setItem("mc_last_active_world_id",${JSON.stringify(TEST_WORLD)});return !!j.user;})`, awaitPromise: true, returnByValue: true });
  await Page.reload();
  await sleep(6000);
  const join = await Runtime.evaluate({ expression: `(async()=>{await new Promise(r=>setTimeout(r,1500));const b=[...document.querySelectorAll("button")].find(x=>/play|play/i.test(x.textContent||""));if(b){b.click();return "play";}return "no-btn";})()`, awaitPromise: true, returnByValue: true });
  console.log("join:", join.result?.value);
  await sleep(16000);

  const ev = (expr) => Runtime.evaluate({ expression: expr, returnByValue: true });
  const dump = `(()=>{const D=window.__worldDbg; if(!D) return "no-dbg";
    return D.mobMgr.animals.slice(0,6).map(a=>({t:a.type,x:+a.x.toFixed(1),y:+a.y.toFixed(1),z:+a.z.toFixed(1),yaw:+a.yaw.toFixed(1),vx:+a.vx.toFixed(2),vz:+a.vz.toFixed(2),wt:a.walkTimer===undefined?null:+a.walkTimer.toFixed(1),it:a.idleTimer===undefined?null:+a.idleTimer.toFixed(1),g:a.ground,stk:a.stuckT?a.stuckT.toFixed(1):0}));
  })()`;
  const first = (await ev(dump)).result?.value;
  console.log("animals t0:", JSON.stringify(first));
  await sleep(8000);
  const second = (await ev(dump)).result?.value;
  console.log("animals t8s:", JSON.stringify(second));
  await sleep(8000);
  const third = (await ev(dump)).result?.value;
  console.log("animals t16s:", JSON.stringify(third));
  const fps = (await ev(`(()=>{const m=document.body.innerText.match(/(\\d+) FPS/);return m?+m[1]:-1;})()`)).result?.value;
  console.log("FPS:", fps);
  fs.writeFileSync("snapshots/prod-animals.json", JSON.stringify({ first, second, third, fps }));
  await c.close();
} catch (e) { console.error("probe error:", e.message); }
chrome.kill();
