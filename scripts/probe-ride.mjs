// Headless probe: mount a pet and drive it with WASD.
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";

const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader",
  "--remote-debugging-port=9423", "about:blank"
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const c = await CDP({ port: 9423 });
  const { Page, Runtime } = c;
  await Page.enable();
  await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);

  const ev = async (expr) => {
    const r = await Runtime.evaluate({ expression: expr, returnByValue: true });
    return r.result?.value;
  };

  // 1. spawn cow + name it via bridge state (owner = sim) so mounting is allowed
  const setup = await ev(`(()=>{
    const api=window.__sim?.api; const s=window.__sim?.s;
    if(!api||!s) return "no-bridge";
    api.spawnAnimal("cow", 10, 8);
    // 4-thick 1-block-high wall in the riding path (+X) at x=14..17: cow must
    // CLIMB onto it and stay on top (y=66) while crossing.
    api.stampRun("probe:ride-wall", (w) => {
      for (let wx = 14; wx <= 17; wx++) { w(wx, 65, 7, 5); w(wx, 65, 8, 5); w(wx, 65, 9, 5); w(wx, 65, 10, 5); }
    });
    // set ownership directly through the state object (dev shortcut)
    s.hotbar[0]=0; s.slot=0;
    s.player.x=8.2; s.player.y=66.4; s.player.z=8.5;
    s.player.yaw=-Math.PI/2; s.player.pitch=0; s.player.fly=true;
    s.active=true; s.uiPaused=false; s.timeFlow=false;
    // claim the animal as ours (simulate previous sign naming)
    return "ready";
  })()`);
  console.log("setup:", JSON.stringify(setup));

  // claim ownership via getAnimalsFn is read-only; use the state's animal array? not exposed.
  // Instead: use sign naming flow quickly (dispatch E, type, Enter)
  const claim = await ev(`(()=>{
    const s=window.__sim?.s;
    s.hotbar[0]=1044; s.slot=0;
    window.dispatchEvent(new KeyboardEvent("keydown", {code:"KeyE"}));
    return "E-sign";
  })()`);
  await sleep(800);
  await ev(`(()=>{
    const inp=document.querySelector('input[placeholder="Pet name…"]');
    if(!inp) return "no-input";
    const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
    setter.call(inp,"Bessie"); inp.dispatchEvent(new Event("input",{bubbles:true}));
    inp.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
    return "named";
  })()`);
  await sleep(600);

  // 2. mount: free hand + right-click on canvas center
  const wallCheck = await ev(`(()=>{const s=window.__sim?.s; const c=s.chunks&&s.chunks.get("0,0"); return c ? c.data[65*256 + (8&15)*16 + (14&15)] : "no-chunk";})()`);
  console.log("wall block at (14,65,8):", JSON.stringify(wallCheck));
  const mount = await ev(`(()=>{
    const api=window.__sim?.api; const s=window.__sim?.s;
    const cows=api.mobs().animals.filter(a=>a.t==="cow");
    if(!cows.length) return "no-cow";
    const cow=cows[0];
    s.hotbar[0]=0; s.slot=0;
    s.player.x=cow.x-2.6; s.player.y=cow.y+1.4; s.player.z=cow.z;
    s.player.yaw=-Math.PI/2; s.player.pitch=-0.15; s.player.fly=true;
    s.active=true; s.steering=true;
    const cv=document.querySelector("canvas");
    if(!cv) return "no-canvas";
    cv.dispatchEvent(new MouseEvent("mousedown", {button:2, bubbles:true, clientX:innerWidth/2, clientY:innerHeight/2}));
    return "rclick";
  })()`);
  console.log("mount:", JSON.stringify(mount));
  await sleep(500);
  const mounted = await ev(`(()=>{const s=window.__sim?.s; return s && s.riddenAnimal ? s.riddenAnimal.type : null;})()`);
  console.log("mounted animal:", JSON.stringify(mounted));
  // sprint-hold BEFORE mount (real bug): dispatch Shift keydown first, then mount
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown", {code:"ShiftLeft"})); "shift-down"`);
  await sleep(300);
  const mount2 = await ev(`(()=>{
    const api=window.__sim?.api; const s=window.__sim?.s;
    const cows=api.mobs().animals.filter(a=>a.t==="cow");
    if(!cows.length) return "no-cow";
    const cow=cows[0];
    s.player.x=cow.x-2.6; s.player.y=cow.y+1.4; s.player.z=cow.z;
    s.player.yaw=-Math.PI/2; s.player.pitch=-0.15;
    const cv=document.querySelector("canvas");
    if(cv) cv.dispatchEvent(new MouseEvent("mousedown", {button:2, bubbles:true, clientX:innerWidth/2, clientY:innerHeight/2}));
    return "rclick2";
  })()`);
  await sleep(500);
  const stillMounted = await ev(`(()=>{const s=window.__sim?.s; return !!(s && s.riddenAnimal) ? s.riddenAnimal.type : null;})()`);
  console.log("mounted with Shift held:", JSON.stringify(stillMounted), "(expect cow — no insta-dismount)");
  await ev(`window.dispatchEvent(new KeyboardEvent("keyup", {code:"ShiftLeft"})); "shift-up"`);
  await sleep(300);

  // 3. hold W and sample positions
  await ev(`window.dispatchEvent(new KeyboardEvent("keydown", {code:"KeyW"})); "w-down"`);
  const sample = () => ev(`(()=>{const api=window.__sim?.api; return api&&api.mobs? api.mobs().animals.filter(a=>a.t==="cow") : null;})()`);
  const t0 = await sample();
  // fine-grained y trace DURING the wall crossing (first 2.5s)
  const yTrace = [];
  for (let i = 0; i < 10; i++) {
    await sleep(250);
    const s = await sample();
    if (s && s[0]) yTrace.push(+s[0].y.toFixed(2));
  }
  await sleep(2500);
  const t1 = await sample();
  await sleep(2500);
  const t2 = await sample();
  await ev(`window.dispatchEvent(new KeyboardEvent("keyup", {code:"KeyW"})); "w-up"`);

  const dist = t0 && t2 ? Math.hypot(t2[0].x - t0[0].x, t2[0].z - t0[0].z) : -1;
  const peakY = Math.max(...yTrace);
  const climbed = peakY > 65.8;
  fs.writeFileSync("snapshots/ride-probe.json", JSON.stringify({ mounted, t0, t1, t2, dist, climbed, yTrace }));
  console.log("cow pos t0:", JSON.stringify(t0 && t0[0]));
  console.log("cow pos t2:", JSON.stringify(t2 && t2[0]));
  console.log(`traveled in 5s: ${dist.toFixed(2)} blocks (expect ~25+ at 5.8 m/s)`);
  console.log(climbed ? "PASS · climbed the wall while riding" : "FAIL · wall not climbed while riding");
  console.log(dist > 10 ? "PASS · riding WASD works" : "FAIL · animal did not move");
  await c.close();
} catch (e) {
  console.error("probe error:", e.message);
}
chrome.kill();
