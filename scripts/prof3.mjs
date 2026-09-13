import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";

// Live gameplay profiler: Quick Play → resume engine → 15s idle sampling → 12s W-move sampling.
// Use after any meshing/render change to compare: meshQ drain, draw calls, triangles, heap.
const PORT = 9293;
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
  await sleep(8000);

  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { ok:false };
      s.uiPaused = false; s.active = true; s.menuOpen = false; s.pauseOpen = false;
      return { ok:true, render:s.render, keep:s.keep };
    })()`, returnByValue: true
  });
  await sleep(2000);

  const sample = async (seconds, extra, label) => {
    await Runtime.evaluate({
      expression: `(async () => { window.__profSamples = []; window.__profEnd = ${seconds};
        const s = window.__sim.s; const t0 = performance.now();
        const cb = () => {
          window.__profSamples.push({ t: Math.round(performance.now()-t0),
            meshes: [...s.chunks.values()].filter(c=>c.meshes).length,
            meshQ: s.meshQ.length, genQ: s.genQ.length, chunks: s.chunks.size,
            calls: s.renderer.info.render.calls, tris: s.renderer.info.render.triangles,
            heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : 0 });
          if (performance.now() - t0 < ${seconds}*1000) requestAnimationFrame(cb);
        };
        requestAnimationFrame(cb); return true;
      })()`, awaitPromise: true, returnByValue: true
    });
    await sleep((seconds + 1.5) * 1000);
    const r = await Runtime.evaluate({
      expression: `window.__profSamples.filter((_,i)=>i%${Math.max(1, Math.floor(seconds * 2))}===0)`,
      returnByValue: true
    });
    console.log(`== ${label} ==`);
    console.log(JSON.stringify(r.result?.value));
  };

  await sample(15, null, "IDLE 15s");
  await Runtime.evaluate({ expression: `window.__sim.s.keys["KeyW"] = true; true;` });
  await sample(12, null, "MOVE (W) 12s");
  await Runtime.evaluate({ expression: `window.__sim.s.keys["KeyW"] = false; true;` });
  await client.close();
} catch (e) {
  console.error("err:", e);
} finally {
  chrome.kill();
}
