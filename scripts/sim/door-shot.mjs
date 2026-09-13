// Headless verification harness v2 — reads REAL rendered pixels via toDataURL
// (preserveDrawingBuffer=true makes the buffer readable after render(); this bypasses
// the compositor that made earlier page-screenshots come back stale).
// Stages: closed door (7,7) & open door (11,7) (via ?simdoor=1) — captures both states
// from 2 angles each to snapshots/verify-*.jpg.
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9223;
const URL0 = "http://127.0.0.1:5450/?sim=1&simdoor=1";
const SLEEP0 = 8000;

const client = await CDP({ port: PORT });
const { Page, Runtime } = client;
await Page.enable();
await Runtime.enable();
await Page.navigate({ url: URL0 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(SLEEP0);

// wait until stamps are applied
for (let i = 0; i < 12; i++) {
  const dbg = await Runtime.evaluate({ expression: "window.__simDoorDebug || 'waiting'", returnByValue: true });
  if (dbg.result.value === "stamped") break;
  await sleep(1000);
}

async function shot(name, cx, cz, angDeg, dist = 3.2, pitch = -0.05) {
  const ang = (angDeg * Math.PI) / 180;
  const px = cx + Math.cos(ang) * dist;
  const pz = cz + Math.sin(ang) * dist;
  const dx = cx - px, dz = cz - pz;
  const res = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s || !s.renderer) return null;
      s.shadowsOn = false;
      s.renderer.shadowMap.enabled = false;
      if (s.fx) { s.fx.outline.visible = false; s.fx.crack.visible = false; }
      s.player.x = ${px}; s.player.z = ${pz};
      s.player.y = 65.6; s.player.fly = true;
      s.player.yaw = Math.atan2(-(${dx}), -(${dz}));
      s.player.pitch = ${pitch};
      s.camera.position.set(s.player.x, s.player.y + 1.62, s.player.z);
      s.camera.rotation.order = 'YXZ';
      s.camera.rotation.y = s.player.yaw;
      s.camera.rotation.x = s.player.pitch;
      s.renderer.render(s.scene, s.camera);
      return s.renderer.domElement.toDataURL('image/jpeg', 0.92);
    })()`,
    returnByValue: true
  });
  const url = res.result.value;
  if (!url) { console.log(`shot ${name}: NO DATA`); return; }
  const buf = Buffer.from(String(url).split(",")[1], "base64");
  fs.writeFileSync(`snapshots/${name}.jpg`, buf);
  fs.writeFileSync(`snapshots/${name}.jpg`, buf);
  console.log(`shot ${name}: ${buf.length} bytes`);
}

// closed door at (7,7): front + 3/4
await shot("verify-closed-0", 7, 7, -90, 3.2);
await shot("verify-closed-1", 7, 7, -60, 3.2);
// open door at (11,7): front + 3/4
await shot("verify-open-0", 11, 7, -90, 3.2);
await shot("verify-open-1", 11, 7, -60, 3.2);
// TOP-DOWN over the closed door: identifies the stray ground square
{
  const res = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s || !s.renderer) return null;
      s.shadowsOn = false; s.renderer.shadowMap.enabled = false;
      s.player.x = 7.5; s.player.z = 7.5; s.player.y = 70; s.player.fly = true;
      s.player.yaw = 0; s.player.pitch = -1.5;
      s.camera.position.set(7.5, 71.6, 7.5);
      s.camera.rotation.order = 'YXZ';
      s.camera.rotation.y = 0; s.camera.rotation.x = -1.5;
      s.renderer.render(s.scene, s.camera);
      return s.renderer.domElement.toDataURL('image/jpeg', 0.92);
    })()`,
    returnByValue: true
  });
  const url = res.result.value;
  if (url) {
    const buf = Buffer.from(String(url).split(",")[1], "base64");
    fs.writeFileSync("snapshots/verify-top.jpg", buf);
    fs.writeFileSync("snapshots/verify-top.jpg", buf);
    console.log("shot verify-top:", buf.length);
  }
}

const state = await Runtime.evaluate({
  expression: `(() => { const logs = window.__simLogRing?.() || []; return JSON.stringify(logs.slice(-4)); })()`,
  returnByValue: true
});
console.log("LOGS:", state.result.value);
// profile shot: eye-level at the square, looking along +X at the closed door base
{
  const res = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s || !s.renderer) return null;
      s.shadowsOn = false; s.renderer.shadowMap.enabled = false;
      s.player.x = 5.2; s.player.z = 7.9; s.player.y = 64.8; s.player.fly = true;
      s.player.yaw = -Math.PI / 2; s.player.pitch = -0.03; // looking +X? yaw -90 => facing +X? use lookAt math instead
      const cx = 7, cz = 7;
      const yaw = Math.atan2(-(cx - s.player.x), -(cz - s.player.z));
      s.player.yaw = yaw; s.player.pitch = -0.05;
      s.camera.position.set(s.player.x, 65.4, s.player.z);
      s.camera.rotation.order = 'YXZ';
      s.camera.rotation.y = yaw; s.camera.rotation.x = -0.05;
      s.renderer.render(s.scene, s.camera);
      return s.renderer.domElement.toDataURL('image/jpeg', 0.92);
    })()`,
    returnByValue: true
  });
  const url = res.result.value;
  if (url) {
    const buf = Buffer.from(String(url).split(",")[1], "base64");
    fs.writeFileSync("snapshots/verify-profile.jpg", buf);
    console.log("shot verify-profile:", buf.length);
  }
}
// block-id dump around the doors (decides what the gray plate really is)
{
  const d = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s; if (!s) return 'no-s';
      const c = s.chunks.get('0,0'); if (!c) return 'no-chunk';
      const id = (x,y,z) => c.data[y*256 + (z&15)*16 + (x&15)];
      const out = [];
      for (let y = 62; y <= 68; y++) {
        out.push('y'+y+': ' + [6,7,8,9].map(x => [id(x,y,6), id(x,y,7), id(x,y,8), id(x,y,9)].join('/')).join(' | '));
      }
      return out.join('\\n');
    })()`,
    returnByValue: true
  });
  console.log("CHUNK DUMP around (6..9, 62..68):\n" + d.result.value);
}
await client.close();
process.exit(0);
