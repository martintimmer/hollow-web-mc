import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9293;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--window-size=1280,800",
  `--remote-debugging-port=${PORT}`,
  "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
await sleep(1500);

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime, Emulation, Log } = client;
  await Page.enable();
  await Runtime.enable();
  // headless pages report hidden, which pauses the game loop — spoof visible
  await Page.addScriptToEvaluateOnNewDocument({ source: `try { localStorage.setItem("mc_onboarding_dismissed", "1"); } catch {} Object.defineProperty(document, "hidden", { value: false, configurable: true }); Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); document.hasFocus = () => true;` });
  try { await Log.enable(); Log.entryAdded((e) => errors.push(e.entry.text || e.entry.url || "?")); } catch {}
  await Emulation.setDeviceMetricsOverride({ width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  console.log("loading game...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  // wait for sim boot (player + chunks) AND veil gone AND live loop, up to 90s
  let ready = "";
  for (let i = 0; i < 90; i++) {
    await sleep(1000);
    const r = await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s; const veil = document.body.textContent.includes("GENERATING WORLD");
      if (!(s && s.player && s.chunks && s.chunks.size > 12 && !veil)) return "wait";
      if (!s.reqId || !(s.lastFrameAt > 0)) return "wait-loop";
      const d = Math.hypot(s.camera.position.x - s.player.x, s.camera.position.z - s.player.z);
      return d < 5 ? ("READY n=" + s.chunks.size) : "wait-cam"; })()` });
    ready = r.result?.value || "wait";
    if (ready.startsWith("READY")) break;
  }
  console.log("boot:", ready);
  // dismiss onboarding primer + collapse sim deck for a clear frame
  await Runtime.evaluate({ expression: `(() => {
    try { localStorage.setItem("mc_onboarding_dismissed", "1"); } catch {}
    const btns = [...document.querySelectorAll("button")];
    const got = btns.find(b => (b.textContent || "").includes("Got it"));
    if (got) got.click();
  })()` });
  await sleep(1500);

  const setup = await Runtime.evaluate({ expression: `(() => {
    const s = window.__sim?.s;
    if (!s || !s.chunks) return "NO-SIM";
    const FY = 117, PY = 118, RZ = 10;
    const dirty = new Set();
    const setB = (x, y, z, id) => {
      if (window.__simWriteCell) window.__simWriteCell(x, y, z, id, dirty);
      else {
        const c = s.chunks.get(((x >> 4) + "," + (z >> 4)));
        if (c && c.data && y >= 0 && y < 128) c.data[y * 256 + (z & 15) * 16 + (x & 15)] = id;
      }
    };
    for (let x = 5; x <= 17; x++) for (let z = 7; z <= 14; z++) setB(x, FY, z, 5);
    for (let x = 20; x <= 26; x++) for (let z = 7; z <= 14; z++) for (let y = 115; y <= 116; y++) setB(x, y, z, 5);
    for (let x = 20; x <= 26; x++) for (let z = 7; z <= 14; z++) { if (x === 23 && z === 10) continue; setB(x, 117, z, 5); }
    setB(7, PY, RZ, 228);   // cake
    setB(9, PY, RZ, 46);    // lantern
    setB(11, PY, RZ, 85);   // campfire
    setB(13, PY, RZ, 80);   // torch (control)
    setB(15, PY, RZ, 46);   // 2nd lantern (glow check)
    setB(23, PY, RZ, 85);   // campfire on 3-thick floor (hole test)
    s.time = 6000;
    if (s.buildMesh) { s.buildMesh(0, 0); s.buildMesh(1, 0); }
    else if (s.rescan) s.rescan(0, 0);
    if (s.weatherMachine) s.weatherMachine.force("clear");
    return "OK chunks=" + s.chunks.size;
  })()` });
  console.log("setup:", setup.result?.value);
  await sleep(7000);

  const aim = async (ex, ey, ez, tx, ty, tz) => {
    for (let attempt = 0; attempt < 12; attempt++) {
      await Runtime.evaluate({ expression: `(() => {
        const s = window.__sim?.s; if (!s) return;
        const dx = ${tx} - ${ex}, dy = ${ty} - ${ey}, dz = ${tz} - ${ez};
        s.player.x = ${ex}; s.player.y = ${ey}; s.player.z = ${ez};
        s.player.vx = 0; s.player.vy = 0; s.player.vz = 0;
        s.player.yaw = Math.atan2(-dx, -dz);
        s.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
        if (s.camera) { s.camera.position.set(${ex}, ${ey} + 1.62, ${ez}); }
      })()` });
      await sleep(1000);
      const chk = await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s; const c = s?.camera?.position;
        return s && c ? [c.x, c.y, c.z].map(v=>Math.round(v*10)/10).join(",") : "?"; })()` });
      const got = chk.result?.value || "?";
      const parts = got.split(",").map(Number);
      if (Math.abs(parts[0] - ex) < 1 && Math.abs(parts[2] - ez) < 1 && Math.abs(parts[1] - (ey + 1.62)) < 3) return;
      console.log("aim retry", attempt, "cam at", got);
    }
  };
  const shot = async (name) => {
    const w = await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s;
      if (s && s.weatherMachine && "${name}".includes("thick")) s.weatherMachine.force("clear");
      return s ? (s.weatherType + "/" + s.cloudWeather) : "?"; })()` });
    console.log(name, "weather:", w.result?.value);    const r = await Runtime.evaluate({ awaitPromise: true, expression: `(async () => {
      const cv = document.querySelector("canvas");
      return await new Promise((res) => requestAnimationFrame(() => {
        try { res(cv.toDataURL("image/png")); } catch (e) { res("ERR"); }
      }));
    })()` });
    const png = r.result?.value || "";
    if (png.length > 5000) {
      fs.writeFileSync("snapshots/" + name, Buffer.from(png.split(",")[1], "base64"));
      console.log("saved", name);
    } else console.log("SHOT-FAILED", name, png.length);
  };

  await aim(11, 118.4, 13.2, 11, 117.6, 10);   // wide front, eye level
  await shot("props-wide-day.png");
  await aim(5.6, 118.6, 11.4, 11, 117.7, 10);  // close side profile
  await shot("props-side-day.png");
  await aim(11, 119.2, 10.6, 11, 117.5, 10);     // top-down
  await shot("props-top-day.png");
  await aim(23, 118.4, 13.2, 23, 117.6, 10);   // campfire on 3-thick floor
  await shot("props-thick-day.png");
  await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s;
    if (!s) return;
    const dirty = new Set();
    const setB = (x, y, z, id) => {
      if (window.__simWriteCell) window.__simWriteCell(x, y, z, id, dirty);
    };
    setB(30, 118, 10, 85); setB(32, 118, 10, 5); setB(34, 118, 10, 228);
    if (s.buildMesh) { s.buildMesh(1, 0); s.buildMesh(2, 0); } })()` });
  await sleep(5000);
  await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s;
    if (s && s.player) { s.player.fly = true; s.player.vy = 0; } })()` });
  await aim(32, 118.6, 15.5, 32, 117.8, 10);   // floating campfire/stone/cake row
  await shot("props-float-day.png");
  await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s;
    if (s && s.sun) s.sun.castShadow = false;
    if (s && s.renderer) s.renderer.shadowMap.enabled = false;
    if (s && s.scene) s.scene.traverse((o) => {
      if (o.isMesh && o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) m.needsUpdate = true;
      }
    }); })()` });
  await sleep(6000);
  await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s;
    window.__shadowState = (s.renderer.shadowMap.enabled ? "MAP-ON" : "MAP-OFF") + "/" + (s.sun.castShadow ? "SUN-ON" : "SUN-OFF"); })()` });
  await aim(23, 118.4, 13.2, 23, 117.6, 10);
  await shot("props-noshadow-day.png");
  const sh = await Runtime.evaluate({ expression: `window.__shadowState` });
  console.log("shadow state:", sh.result?.value);
  await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s;
    if (s) s.time = 9000; })()` });
  await sleep(6000);
  await aim(23, 118.4, 13.2, 23, 117.6, 10);
  await shot("props-morning-day.png");

  await Runtime.evaluate({ expression: `(() => { const s = window.__sim?.s; if (s) s.time = 18000; })()` });
  await sleep(5000);
  await aim(11, 118.4, 13.2, 11, 117.6, 10);
  await shot("props-wide-night.png");

  console.log("CONSOLE-ERRORS:", errors.length ? errors.slice(0, 8) : "none");
  await client.close();
} catch (e) {
  console.error("FATAL", e);
} finally {
  chrome.kill();
  try { require("child_process").execSync("pkill -9 -f 'chromium.*9293'"); } catch {}
  process.exit(0);
}
