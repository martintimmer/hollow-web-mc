import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9307;
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader",`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime } = client;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(7000);

  const res = await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api; const s = window.__sim?.s;
      if (!api || !s) return { ok:false };
      try { api.undo(); api.undo(); api.undo(); } catch {}
      api.stampRun("shadow", (w) => {
        for (let y = 65; y <= 70; y++) w(8, y, 0, 5);
        w(10, 65, 0, 5); w(6, 65, 0, 5);
        w(8, 64, 0, 5);
      });
      s.player.x = 15; s.player.y = 66.5; s.player.z = 0.2;
      s.player.yaw = 1.57; s.player.pitch = -0.10;
      s.player.fly = true;
      s.uiPaused = false; s.active = true; s.time = 10000; s.timeFlow = false;
      s.shadowsOn = true;
      if (s.sun) s.sun.castShadow = true;
      if (s.renderer) {
        s.renderer.shadowMap.enabled = true;
        s.renderer.shadowMap.autoUpdate = true;
        
        const cam = s.sun.shadow.camera;
        cam.left = -24; cam.right = 24; cam.top = 24; cam.bottom = -24;
        cam.near = 10; cam.far = 320;
        cam.updateProjectionMatrix();
        if (s.sun.shadow.map) { s.sun.shadow.map.dispose(); s.sun.shadow.map = null; }
        
      }
      return { ok: true };
    })()`, returnByValue: true
  });
  console.log("state:", JSON.stringify(res.result?.value));
  await sleep(1500);
  const dir = await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s; const d = s.sun.position.clone().sub(s.player); return { t: s.time, sunOff: [Math.round(d.x), Math.round(d.y), Math.round(d.z)], target: [Math.round(s.sun.target.position.x), Math.round(s.sun.target.position.y), Math.round(s.sun.target.position.z)] }; })()`, returnByValue: true });
  console.log("light:", JSON.stringify(dir.result?.value));
  await sleep(2500);
  const hasMap = await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s; const m = s?.sun?.shadow?.map; return { hasMap: !!m, size: m ? [m.width, m.height] : null }; })()`, returnByValue: true });
  console.log("shadow.map:", JSON.stringify(hasMap.result?.value));
  await sleep(800);
  const dat = await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s; const cv = s?.renderer?.domElement; return cv ? cv.toDataURL("image/jpeg", 0.92) : null; })()`, returnByValue: true });
  fs.writeFileSync("snapshots/shadow-test.jpg", Buffer.from(dat.result.value.split(",")[1], "base64"));
  console.log("saved shadow-test.jpg");
  await client.close();
} catch (e) { console.error(e); } finally { chrome.kill(); }
