import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9297;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
  "--enable-unsafe-swiftshader", `--remote-debugging-port=${PORT}`, "about:blank"
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime } = client;
  await Page.enable();
  await Runtime.enable();

  await Page.navigate({ url: "http://127.0.0.1:5400/" });
  await sleep(4000);
  await Runtime.evaluate({
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.toLowerCase().includes("quick play"));
      if (btn) btn.click();
      return !!btn;
    })()`, returnByValue: true
  });
  await sleep(6000);
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s; if (!s) return { ok:false };
      s.uiPaused = false; s.active = true; s.menuOpen = false; s.pauseOpen = false;
      return { ok:true };
    })()`, returnByValue: true
  });

  // Wait until the render circle is fully meshed
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    const st = await Runtime.evaluate({
      expression: `(() => { const s = window.__sim?.s; return s ? { m: [...s.chunks.values()].filter(c=>c.meshes).length, q: s.meshQ.length } : null; })()`,
      returnByValue: true
    });
    const v = st.result?.value;
    console.log(`t+${i}s meshes=${v?.m} meshQ=${v?.q}`);
    if (v && v.m >= 120 && v.q === 0) break;
  }

  // Grab raw pixels of the WebGL canvas (this is the actual 3D view)
  const dataUrl = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      const cv = s?.renderer?.domElement;
      if (!cv) return null;
      return cv.toDataURL("image/jpeg", 0.85);
    })()`, returnByValue: true
  });
  const url = dataUrl.result?.value;
  if (url) {
    fs.writeFileSync("snapshots/worker-canvas.jpg", Buffer.from(url.split(",")[1], "base64"));
    console.log("canvas captured:", url.length, "chars");
  } else {
    console.log("no canvas dataurl");
  }
  await client.close();
} catch (e) { console.error("err:", e); } finally { chrome.kill(); }
