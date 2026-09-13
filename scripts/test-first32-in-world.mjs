import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9300;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
  "--enable-unsafe-swiftshader", `--remote-debugging-port=${PORT}`, "about:blank"
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime } = client;
  await Page.enable(); await Runtime.enable();

  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(7000);

  const res = await Runtime.evaluate({
    expression: `(async () => {
      const api = window.__sim?.api;
      const s = window.__sim?.s;
      if (!api || !s) return { ok:false };
      try { api.undo(); } catch {}
      const r = api.stampRun("ts32", (w) => {
        for (let i = 1; i <= 32; i++) w(2 + i * 2, 65, 0, i);
      });
      // camera: 2 cols in front of the row, looking north (-z => yaw 0)
      s.player.x = 36; s.player.y = 68.5; s.player.z = 30;
      s.player.yaw = 0; s.player.pitch = -0.10;
      s.player.fly = true;
      s.uiPaused = false; s.active = true; s.time = 6000; s.timeFlow = false;
      return { ok:true, stamp: r };
    })()`, awaitPromise: true, returnByValue: true
  });
  console.log("stamp:", JSON.stringify(res.result?.value));
  await sleep(8000);

  const grab = async (name, x) => {
    await Runtime.evaluate({
      expression: `(() => { const s = window.__sim.s; s.player.x = ${x}; s.player.y = 68.5; s.player.z = 14; s.player.yaw = 0; s.player.pitch = -0.13; return true; })()`, returnByValue: true
    });
    await sleep(1800);
    const dat = await Runtime.evaluate({
      expression: `(() => {
        const s = window.__sim?.s; const cv = s?.renderer?.domElement;
        return cv ? cv.toDataURL("image/jpeg", 0.92) : null; })()`, returnByValue: true
    });
    if (dat.result?.value) {
      fs.writeFileSync("snapshots/" + name, Buffer.from(dat.result.value.split(",")[1], "base64"));
      console.log("saved " + name);
    } else console.log("no capture " + name);
  };
  await grab("first32-left.jpg", 19);
  await grab("first32-right.jpg", 53);
  await client.close();
} catch (e) { console.error("err:", e); } finally { chrome.kill(); }
