import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9299;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
  "--enable-unsafe-swiftshader", `--remote-debugging-port=${PORT}`, "about:blank"
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

let fails = 0;
const check = (label, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} · ${label} ${detail}`); if (!cond) fails++; };

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime } = client;
  await Page.enable(); await Runtime.enable();

  await Page.navigate({ url: "http://127.0.0.1:5400/" });
  await sleep(4000);
  await Runtime.evaluate({
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.toLowerCase().includes("quick play"));
      if (btn) btn.click(); return !!btn; })()`, returnByValue: true
  });
  await sleep(5000);
  await Runtime.evaluate({
    expression: `(() => { const s = window.__sim?.s; if (!s) return {ok:false};
      s.uiPaused = false; s.active = true; s.menuOpen = false; s.pauseOpen = false;
      s.time = 6000; s.timeFlow = false;
      // look up at the sun
      s.player.pitch = 1.1;
      return { ok:true }; })()`, returnByValue: true
  });
  await sleep(4000);

  const px = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const map = s.sunBox?.material?.map;
      const cv = map?.image;
      if (!cv) return { ok:false };
      const g = cv.getContext("2d");
      const sun = Array.from(g.getImageData(8, 503, 1, 1).data);   // sun core (tile 0)
      const moon = Array.from(g.getImageData(24, 503, 1, 1).data); // moon body (tile 1)
      return { ok:true, sun, moon, sunMapHeight: cv.height };
    })()`, returnByValue: true
  });
  const v = px.result?.value;
  console.log("celestial pixels:", JSON.stringify(v));
  check("sun uses dedicated celestial texture (not acacia/wood)", v?.ok && v.sun[0] > 230 && v.sun[1] > 200 && v.sun[3] === 255, JSON.stringify(v?.sun));
  check("moon pale disc", v?.ok && v.moon[0] > 190 && v.moon[1] > 190, JSON.stringify(v?.moon));

  const dat = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s; const cv = s?.renderer?.domElement;
      return cv ? cv.toDataURL("image/jpeg", 0.85) : null; })()`, returnByValue: true
  });
  if (dat.result?.value) {
    fs.writeFileSync("snapshots/sun-fixed-canvas.jpg", Buffer.from(dat.result.value.split(",")[1], "base64"));
    console.log("canvas saved");
  }
  await client.close();
} catch (e) { console.error("err:", e); fails++; } finally { chrome.kill(); }
console.log(fails ? `${fails} FAILURES` : "ALL SUN/TEXTURE CHECKS PASS");
process.exit(fails ? 1 : 0);
