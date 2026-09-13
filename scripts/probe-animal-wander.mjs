// Headless probe: stamp animals, verify they actually WANDER (positions change).
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";

const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader",
  "--remote-debugging-port=9417", "about:blank"
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const c = await CDP({ port: 9417 });
  const { Page, Runtime } = c;
  await Page.enable();
  await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);

  const ev = async (expr) => {
    const r = await Runtime.evaluate({ expression: expr, returnByValue: true });
    return r.result?.value;
  };

  const st = await ev(`(()=>{
    const api=window.__sim?.api; const s=window.__sim?.s;
    if(!api||!s) return "no-bridge";
    api.spawnAnimal("cow", 6, 6); api.spawnAnimal("pig", 10, 6);
    api.spawnAnimal("sheep", 6, 10); api.spawnAnimal("chicken", 10, 10);
    api.spawnAnimal("horse", 8, 6); api.spawnAnimal("dog", 10, 8);
    s.player.x=8; s.player.z=8; s.player.y=65.4; s.player.fly=true;
    s.active=true; s.uiPaused=false; s.timeFlow=false;
    return "stamped";
  })()`);
  console.log("stamp:", JSON.stringify(st));

  const sample = () => ev(`(()=>{const api=window.__sim?.api; return api&&api.mobs? api.mobs().animals : null;})()`);
  await sleep(2000);
  const t0 = await sample();
  await sleep(8000);
  const t1 = await sample();
  await sleep(7000);
  const t2 = await sample();

  let moved = 0, total = 0;
  if (t0 && t1) {
    for (let i = 0; i < t0.length; i++) {
      const a = t0[i];
      const b = t1.find((x) => x.t === a.t) || t1[i];
      if (!b) continue;
      total++;
      const dist = Math.hypot(b.x - a.x, b.z - a.z);
      const blocksPerMin = Math.round((dist / 8) * 60);
      console.log(`- ${a.t}: moved ${dist.toFixed(1)} blocks in 8s (~${blocksPerMin} blocks/min)`);
      if (dist > 0.8) moved++;
    }
  }
  fs.writeFileSync("snapshots/animal-wander-probe.json", JSON.stringify({ t0, t1, t2 }));
  console.log(`animals moved >0.8 blocks in 8s: ${moved}/${total}`);
  console.log("t0:", JSON.stringify(t0));
  console.log("t1:", JSON.stringify(t1));
  await c.close();
} catch (e) {
  console.error("probe error:", e.message);
}
chrome.kill();
