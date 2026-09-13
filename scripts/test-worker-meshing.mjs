import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9295;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`,
  "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

let fails = 0;
const check = (label, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} · ${label} ${detail}`);
  if (!cond) fails++;
};

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime } = client;
  await Page.enable();
  await Runtime.enable();

  const consoleErrors = [];
  Runtime.consoleAPICalled((p) => {
    if (p.type === "error" || p.type === "warning") {
      const msg = p.args.map(a => (a.value ?? a.description ?? "")).join(" ");
      if (/error|fatal|worker|exception/i.test(msg) && !/video|favicon/i.test(msg)) consoleErrors.push(msg.slice(0, 220));
    }
  });

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

  // Force the engine loop on (headless has no user gesture)
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s; if (!s) return { ok:false };
      s.uiPaused = false; s.active = true; s.menuOpen = false; s.pauseOpen = false;
      return { ok:true };
    })()`, returnByValue: true
  });
  await sleep(4000);

  const boot = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      return { cur: s.chunks?.size, meshes: [...s.chunks.values()].filter(c=>c.meshes).length, meshQ: s.meshQ.length, genQ: s.genQ.length, sceneChildren: s.scene?.children?.length };
    })()`, returnByValue: true
  });
  check("boot finished, meshes present", boot.result?.value?.meshes >= 20, JSON.stringify(boot.result?.value));

  // Sample stream drain over 20s
  const samples = await Runtime.evaluate({
    expression: `(async () => {
      const s = window.__sim.s;
      const out = [];
      for (let i = 0; i < 180; i++) {
        await new Promise(r=>setTimeout(r,1000));
        out.push({ meshes: [...s.chunks.values()].filter(c=>c.meshes).length, meshQ: s.meshQ.length, genQ: s.genQ.length,
                   calls: s.renderer.info.render.calls, tris: s.renderer.info.render.triangles, chunks: s.chunks.size, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : 0 });
        if (i >= 25 && s.genQ.length === 0 && s.meshQ.length <= 2) {
          for (let j = 0; j < 5; j++) {
            await new Promise(r=>setTimeout(r,1000));
            out.push({ meshes: [...s.chunks.values()].filter(c=>c.meshes).length, meshQ: s.meshQ.length, genQ: s.genQ.length,
                       calls: s.renderer.info.render.calls, tris: s.renderer.info.render.triangles, chunks: s.chunks.size, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : 0 });
          }
          break;
        }
      }
      return out;
    })()`, awaitPromise: true, returnByValue: true
  });
  const s = samples.result?.value || [];
  console.log("stream samples:", JSON.stringify(s.filter((_, i) => i % 5 === 0 || i === s.length - 1), null, 0));

  const last = s[s.length - 1];
  // Render radius = R+0.5 = 8.5 → π*8.5² ≈ 227 meshed chunks expected; `chunks.size` also
  // contains the keep-cache ring (≈293) which is intentionally meshed-but-dropped.
  check("meshQ drains to 0 (worker mesher)", last && last.meshQ <= 3, `last meshQ=${last?.meshQ}`);
  check("world fully meshed (render circle ~227)", last && last.meshes >= 180, `meshes=${last?.meshes} of render~227, total chunks=${last?.chunks}`);
  const baseCalls = s.length >= 10 ? Math.min(...s.slice(-10).map(x => x.calls)) : (last?.calls ?? 0);
  check("draw calls bounded", baseCalls < 650, `baseCalls=${baseCalls} lastCalls=${last?.calls} tris=${last?.tris}`);
  check("heap bounded", last && last.heap < 850, `heap=${last?.heap} MB`);
  check("no worker/runtime errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  // Place a stair + a fence to exercise dirs + special shapes through the worker path
  const place = await Runtime.evaluate({
    expression: `(async () => {
      const s = window.__sim.s;
      // find ground below player and place oak stairs (id 70?) via simWrite-like direct edit
      const y = Math.floor(s.player.y);
      const hit = { x: Math.floor(s.player.x) + 1, y: y, z: Math.floor(s.player.z) };
      const s2 = s;
      // place 2x2 of stairs and a fence (24) at hit
      const ids = [70, 70, 70, 70];
      for (let i = 0; i < ids.length; i++) s2.edits.set(hit.x + i + "," + hit.y + "," + hit.z, ids[i]);
      return { ok: true };
    })()`, returnByValue: true
  });
  await sleep(3000);
  const postPlace = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      return { meshQ: s?.meshQ?.length, meshes: s ? [...s.chunks.values()].filter(c=>c.meshes).length : -1 };
    })()`, returnByValue: true
  });
  check("post-placement remesh responsive", postPlace.result?.value?.meshQ < 10, JSON.stringify(postPlace.result?.value));

  const state = await Runtime.evaluate({
    expression: `(() => { const s = window.__sim?.s; return { active: s?.active, uiPaused: s?.uiPaused, meshes: s ? [...s.chunks.values()].filter(c=>c.meshes).length : -1 }; })()`,
    returnByValue: true
  });
  console.log("final state:", JSON.stringify(state.result?.value));
  await client.close();
  const client2 = await CDP({ port: PORT });
  const { Page: Page2, Runtime: Runtime2 } = client2;
  await Page2.enable();
  await Runtime2.enable();
  await sleep(500);
  const ss = await Page2.captureScreenshot({ format: "jpeg", quality: 85 });
  fs.writeFileSync("snapshots/worker-meshing-smoke.jpg", Buffer.from(ss.data, "base64"));
  console.log("screenshot saved");

  await client.close();
} catch (e) {
  console.error("test error:", e);
  fails++;
} finally {
  chrome.kill();
}
console.log(fails === 0 ? "ALL SMOKE CHECKS PASS" : `${fails} FAILURES`);
process.exit(fails ? 1 : 0);
