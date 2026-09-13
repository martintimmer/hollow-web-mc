// Headless probe: torch looks — floor, wall, ceiling orientations + held item.
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";

const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader",
  "--remote-debugging-port=9429", "about:blank"
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const c = await CDP({ port: 9429 });
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
    // wall pillar at (7,7) y=65..67, ceiling block at (11,66,9)
    api.stampRun("torch:props", (w) => {
      w(7,65,7,5); w(7,66,7,5); w(7,67,7,5);
      w(11,66,9,5);
    });
    // floor torch (8,65,8); wall torch cell (7,66,8) attached to pillar's +Z;
    // ceiling torch cell (11,65,9) hung under the block.
    const setDir = (X,Y,Z,orient) => {
      const cc = s.chunks.get((X>>4)+","+(Z>>4));
      if (!cc) return;
      if (!cc.dirs) cc.dirs = new Uint16Array(16*128*16);
      cc.dirs[Y*256+(Z&15)*16+(X&15)] = orient;
    };
    setDir(8,65,8,0);      // floor
    setDir(7,66,8,1);      // N wall (stick +Z, head into cell)
    setDir(11,65,9,5);     // ceiling (head down)
    api.stampRun("torch:place", (w) => {
      w(8,65,8,80); w(7,66,8,80); w(11,65,9,80);
    });
    // camera framing
    s.player.x=8; s.player.z=13; s.player.y=65.4; s.player.yaw=0; s.player.pitch=-0.05; s.player.fly=true;
    s.active=true; s.uiPaused=false; s.time=6000; s.timeFlow=false;
    return "torches stamped";
  })()`);
  console.log("setup:", JSON.stringify(st));
  await sleep(2500);

  const grab = async (name) => {
    const d = await ev(`(()=>{const s=window.__sim?.s;const cv=s?.renderer?.domElement; if(!cv) return null; s.renderer.render(s.scene,s.camera); return cv.toDataURL("image/jpeg",0.9);})()`);
    if (d) fs.writeFileSync(`snapshots/${name}.jpg`, Buffer.from(d.split(",")[1], "base64"));
    console.log("saved", name);
  };
  await grab("torch-looks");
  // close-up: turn camera toward the wall torch
  await ev(`(()=>{const s=window.__sim?.s; s.player.x=7; s.player.z=11.5; s.player.y=65.4; s.player.yaw=0; s.player.pitch=-0.05; return 1;})()`);
  await grab("torch-wall");
  // ceiling close-up
  await ev(`(()=>{const s=window.__sim?.s; s.player.x=11; s.player.z=11.5; s.player.y=65.1; s.player.yaw=0; s.player.pitch=-0.05; return 1;})()`);
  await grab("torch-ceiling");
  // held torch in hand
  await ev(`(()=>{const s=window.__sim?.s; if(!s||!s.firstPersonArm) return 0; s.simMode=false; s.firstPersonArm.visible=true; s.hotbar[0]=80; s.hotbarCounts[0]=64; s.slot=0; s.currentHeldId=-1; return 1;})()`);
  await sleep(500);
  await grab("torch-held");
  console.log("DONE");
  await c.close();
} catch (e) {
  console.error("probe error:", e.message);
}
chrome.kill();
