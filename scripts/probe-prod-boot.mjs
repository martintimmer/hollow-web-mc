import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--remote-debugging-port=9453","about:blank"], { stdio: "ignore" });
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
  const c = await CDP({ port: 9453 });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5400/" });
  await sleep(4000);
  await Runtime.evaluate({ expression: `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:${JSON.stringify(TEST_USER)},password:${JSON.stringify(TEST_PASS)}})}).then(r=>r.json()).then(j=>{localStorage.setItem("mc_last_active_world_id",${JSON.stringify(TEST_WORLD)});return !!j.user;})`, awaitPromise: true, returnByValue: true });
  await Page.reload();
  await sleep(6000);
  await Runtime.evaluate({ expression: `(async()=>{await new Promise(r=>setTimeout(r,1500));const b=[...document.querySelectorAll("button")].find(x=>/play/i.test(x.textContent||""));if(b)b.click();return !!b;})()`, awaitPromise: true, returnByValue: true });
  await sleep(16000);
  const ev = (expr) => Runtime.evaluate({ expression: expr, returnByValue: true });
  console.log("page text:", JSON.stringify((await ev(`document.body.innerText.slice(0,300)`)).result?.value));
  console.log("state:", JSON.stringify((await ev(`(()=>{const s=window.__worldDbg?.getS?.(); return s?{loading:s.loading??"", uiPaused:s.uiPaused, active:s.active, chunks:s.chunks? s.chunks.size:-1, lastFrameAt:s.lastFrameAt}:null})()`)).result?.value));
  await c.close();
} catch (e) { console.error("probe error:", e.message); }
chrome.kill();
