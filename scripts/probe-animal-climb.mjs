// Headless probe: animals must AUTO-CLIMB 1-block steps.
// Rings a cow with four 1-block steps; if it can climb, it escapes the ring (y=66).
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";

const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader",
  "--remote-debugging-port=9419", "about:blank"
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const c = await CDP({ port: 9419 });
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
    // 1-block steps ringing the cow spawn (y=65 blocks; cow spawns at y=65)
    api.stampRun("probe:climb-ring", (w) => {
      w(9, 65, 8, 5); w(11, 65, 8, 5); w(10, 65, 7, 5); w(10, 65, 9, 5);
    });
    api.spawnAnimal("cow", 10, 8);
    s.player.x=10; s.player.z=8; s.player.y=65.4; s.player.fly=true;
    s.active=true; s.uiPaused=false; s.timeFlow=false;
    return "ring placed";
  })()`);
  console.log("setup:", JSON.stringify(st));

  const sample = () => ev(`(()=>{const api=window.__sim?.api; return api&&api.mobs? api.mobs().animals.filter(a=>a.t==="cow") : null;})()`);
  let climbed = false, escaped = false;
  const yHistory = [];
  for (let i = 0; i < 12; i++) {
    await sleep(1500);
    const cows = await sample();
    if (cows && cows.length) {
      const cow = cows[0];
      yHistory.push(+cow.y.toFixed(2));
      if (cow.y > 65.8) climbed = true;
      if (Math.abs(cow.x - 10.5) > 2.2 || Math.abs(cow.z - 8.5) > 2.2) escaped = true;
      if (climbed || escaped) { await sleep(1000); break; }
    }
  }
  // oscillation check: a bounce pattern (up >0.5 then back down) before reaching the top
  let bounces = 0;
  for (let i = 2; i < yHistory.length; i++) {
    if (yHistory[i] < yHistory[i - 1] - 0.4 && yHistory[i - 1] > yHistory[i - 2] + 0.4) bounces++;
  }
  fs.writeFileSync("snapshots/animal-climb-probe.json", JSON.stringify({ climbed, escaped, yHistory, bounces }));
  console.log("y history:", JSON.stringify(yHistory), "bounces:", bounces);
  console.log(climbed ? "PASS · cow climbed onto a 1-block step" : "FAIL · no climb detected");
  console.log(bounces === 0 ? "PASS · climb smooth (no up/down oscillation)" : "WARN · oscillation observed");
  await c.close();
} catch (e) {
  console.error("probe error:", e.message);
}
chrome.kill();
