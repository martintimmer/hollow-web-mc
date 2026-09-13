import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
const PORT = 9305;
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader",`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime } = client;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(7000);
  const r = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const cv = s?.atlasTex?.image;
      if (!cv) return { ok: false };
      const g = cv.getContext("2d");
      const sample = (tile) => {
        const gx = (tile % 32) * 16, gy = Math.floor(tile / 32) * 16;
        let n = 0, sumC = 0, m = 0;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const d = g.getImageData(gx + x, gy + y, 1, 1).data;
          if (d[3] > 0) { n++; sumC += Math.abs(d[0]-d[1]) + Math.abs(d[1]-d[2]) + Math.abs(d[0]-d[2]); m += (d[0]+d[1]+d[2])/3; }
        }
        return n ? { mean: Math.round(m/n), chroma: Math.round(sumC/n) } : null;
      };
      return {
        ok: true,
        dark_oak116: sample(116),
        mangrove118: sample(118),
        grass129: sample(129),
        oak8: sample(8),
        atlasWidth: cv.width
      };
    })()`, returnByValue: true
  });
  console.log(JSON.stringify(r.result?.value));
  await client.close();
} catch (e) { console.error(e); } finally { chrome.kill(); }
