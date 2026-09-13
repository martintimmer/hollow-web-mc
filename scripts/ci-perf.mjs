/**
 * @file scripts/ci-perf.mjs
 * Autonomous perf/visual gate (runbook Phase 0).
 * Modes:
 *   node scripts/ci-perf.mjs --capture    → bake canonical golden frames + record before-limits
 *   node scripts/ci-perf.mjs --gate       → restamp scene, sample metrics, assert limits, frame-diff vs goldens
 * Env: GOLDENS=snapshots/golden, LIMITS=docs/perf-limits.json
 */
import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const MODE = process.argv.includes("--capture") ? "capture" : "gate";
const GOLDEN_DIR = "snapshots/golden";
const LIMITS_FILE = "docs/perf-limits.json";
const CSV = "docs/perf-metrics.csv";
fs.mkdirSync(GOLDEN_DIR, { recursive: true });

// ── canonical scene placed before every measurement (deterministic) ──
const SCENE = `
(() => {
  const api = window.__sim?.api;
  try { for(let i=0;i<8;i++) api.undo(); } catch {}
  const s = window.__sim.s;
  api.stampRun("goldenScene", (w) => {
    for (let y = 65; y <= 70; y++) w(14, y, 0, 5);            // stone pillar
    for (let i = 0; i < 5; i++) { w(34 + i, 65, -2, 19); w(34 + i, 65, 2, 19); } // brick slabs
    w(30, 65, -3, 39);                                        // water source (pools)
    w(14, 70, 1, 80);                                         // torch atop pillar
    w(20, 65, 0, 46);                                         // lantern
    w(38, 65, 0, 1162);                                       // bed
    w(42, 65, 0, 43);                                         // chest
    w(34, 66, -2, 8); w(35, 66, -2, 8);                       // leaves
    w(46, 65, 0, 17);                                         // birch planks
    w(50, 65, 0, 141);                                        // ladder
  });
  s.player.x = 10; s.player.y = 68.3; s.player.z = 5.5;
  s.player.yaw = -2.6; s.player.pitch = -0.14;
  s.player.fly = true;
  s.uiPaused = false; s.active = true; s.time = 6000; s.timeFlow = false;
  s.maxFps = 0;
  if (s.clouds) s.clouds.visible = false; // deterministic sky for frame-diff
  return true;
})()`;

const PORT = 9410;
const chrome = spawn("/usr/bin/chromium", ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader",`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1800);

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function p95(arr) { if (!arr.length) return 0; const s = [...arr].sort((a,b)=>a-b); return s[Math.floor(s.length * 0.95)]; }

try {
  const c = await CDP({ port: PORT });
  const { Page, Runtime } = c;
  await Page.enable(); await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(8000);
  await Runtime.evaluate({ expression: SCENE, returnByValue: true });
  await sleep(9000); // settle flows + meshes

  const shot = async (name, time) => {
    await Runtime.evaluate({ expression: `(() => { const s = window.__sim.s; s.time = ${time}; return 1; })()`, returnByValue: true });
    await sleep(1800);
    const d = await Runtime.evaluate({
      expression: `(() => { const s = window.__sim?.s; if (!s?.renderer) return null;
        s.renderer.render(s.scene, s.camera);
        const cv = s.renderer.domElement; return cv ? cv.toDataURL("image/png") : null; })()`,
      returnByValue: true
    });
    if (d.result?.value) {
      const file = path.join(GOLDEN_DIR, name);
      fs.writeFileSync(file, Buffer.from(d.result.value.split(",")[1], "base64"));
      return file;
    }
    return null;
  };

  // metrics sampling (day, 8 s)
  await Runtime.evaluate({ expression: `(() => { const s = window.__sim.s; s.time = 6000; return 1; })()`, returnByValue: true });
  await sleep(1200);
  let t0 = performance.now();
  const frames = [], calls = [], tris = [], heapVals = [], meshQ = [];
  for (let i = 0; i < 32; i++) {
    await sleep(250);
    const r = await Runtime.evaluate({
      expression: `(() => { const s = window.__sim?.s; if (!s?.renderer) return null;
        return { fps: s.lastFpsCalc ?? 0, calls: s.renderer.info.render.calls, tris: s.renderer.info.render.triangles,
                 heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : 0, meshQ: s.meshQ.length }; })()`,
      returnByValue: true
    });
    if (r.result?.value) { calls.push(r.result.value.calls); tris.push(r.result.value.tris); heapVals.push(r.result.value.heap); meshQ.push(r.result.value.meshQ); }
  }
  const metrics = {
    callsP50: Math.round(mean(calls)),
    trisP50: Math.round(mean(tris)),
    heapMax: Math.max(...heapVals),
    meshQEnd: meshQ[meshQ.length - 1],
    fps: Math.round((32 * 4000) / ((performance.now() - t0))) * 0 // fps derived from frameMs below
  };

  // real frame timing via rAF (SwiftShader — relaxed gate tuned later for real GPU)
  t0 = performance.now();
  const timing = await Runtime.evaluate({
    expression: `(async () => {
      const s = window.__sim?.s;
      const km = [];
      let last = performance.now(), t0 = performance.now();
      await new Promise((res) => {
        const step = (now) => { km.push(now - last); last = now;
          if (performance.now() - t0 < 4000) requestAnimationFrame(step); else res(); };
        requestAnimationFrame(step);
      });
      return km;
    })()`, awaitPromise: true, returnByValue: true
  });
  const km = (timing.result?.value || []).slice(4);
  metrics.frameP95 = Math.round(p95(km));
  metrics.frameP50 = Math.round(mean(km));

  // goldens — capture mode only (gate mode reuses the stored goldens; shots() would
  // leave the scene at night and poison the "day-now" comparison)
  let g1 = null, g2 = null;
  if (MODE === "capture") {
    g1 = await shot("golden-day.png", 6000);
    g2 = await shot("golden-night.png", 14000);
  }

  // CSV row
  const row = { ts: new Date().toISOString(), mode: MODE, ...metrics, day: g1 ? path.basename(g1) : null, night: g2 ? path.basename(g2) : null };
  if (!fs.existsSync(CSV)) fs.writeFileSync(CSV, "ts,mode,callsP50,trisP50,heapMax,meshQEnd,frameP50,frameP95,day,night\n");
  fs.appendFileSync(CSV, [row.ts, row.mode, row.callsP50, row.trisP50, row.heapMax, row.meshQEnd, row.frameP50, row.frameP95, row.day, row.night].join(",") + "\n");
  console.log("metrics:", JSON.stringify(row));

  if (MODE === "capture") {
    const limits = {
      calls: row.callsP50 + 60,
      tris: row.trisP50 + 150000,
      heap: row.heapMax + 80,
      meshQEnd: 0,
      frameP95: 160 // SwiftShader; real-GPU baseline recorded via telemetry PULSE
    };
    fs.writeFileSync(LIMITS_FILE, JSON.stringify(limits, null, 2));
    console.log("goldens saved + limits:", JSON.stringify(limits));
  } else {
    const limits = JSON.parse(fs.readFileSync(LIMITS_FILE, "utf8"));
    let fail = 0;
    const chk = (label, got, want) => { const ok = got <= want; console.log(`${ok ? "PASS" : "FAIL"} · ${label} ${got} (limit ${want})`); if (!ok) fail++; };
    chk("calls", row.callsP50, limits.calls);
    chk("tris", row.trisP50, limits.tris);
    chk("heap", row.heapMax, limits.heap);
    chk("meshQEnd", row.meshQEnd, limits.meshQEnd);
    chk("frameP95", row.frameP95, limits.frameP95);
    // frame diff vs goldens
    const FRAME_THRESH = process.env.FRAME_MAE_THRESH ?? 6;
    for (const [imgName, goldenName] of [["day", "golden-day.png"], ["night", "golden-night.png"]]) {
      const cur = path.join(GOLDEN_DIR, imgName + "-now.png");
      if (imgName === "day") {
        await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s; s.time = 6000; return 1; })()`, returnByValue: true });
        await sleep(1800);
      } else {
        await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s; s.time = 14000; return 1; })()`, returnByValue: true });
        await sleep(1800);
      }
      const d = await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s; if (!s?.renderer) return null;
        s.renderer.render(s.scene, s.camera);
        const cv = s.renderer.domElement; return cv ? cv.toDataURL("image/png") : null; })()`, returnByValue: true });
      if (d.result?.value) fs.writeFileSync(cur, Buffer.from(d.result.value.split(",")[1], "base64"));
      const ref = path.join(GOLDEN_DIR, goldenName);
      if (!fs.existsSync(ref) || !fs.existsSync(cur)) { console.log(`SKIP frame-diff (missing golden: ${goldenName})`); continue; }
      const out = execSync(`node catalog/frameDiff.mjs "${ref}" "${cur}"`, { encoding: "utf8" }).trim();
      const v = JSON.parse(out);
      const ok = v.mae <= Number(FRAME_THRESH);
      console.log(`${ok ? "PASS" : "FAIL"} · frame-diff ${imgName} MAE ${v.mae.toFixed(2)} peak ${v.peak}`);
      if (!ok) fail++;
    }
    await c.close();
    console.log(fail ? `GATE RED (${fail})` : "GATE GREEN");
    process.exit(fail ? 1 : 0);
  }
  await c.close();
} catch (e) {
  console.error("ci-perf error:", e);
  process.exit(2);
} finally {
  chrome.kill();
}
