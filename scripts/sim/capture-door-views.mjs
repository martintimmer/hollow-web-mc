import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import fs from "node:fs";

const PORT = 9235;
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  `--remote-debugging-port=${PORT}`,
  "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const client = await CDP({ port: PORT });
  const { Page, Runtime } = client;
  await Page.enable();
  await Runtime.enable();

  console.log("Navigating to http://127.0.0.1:5450/?sim=1&simdoor=1 ...");
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1&simdoor=1" });

  await sleep(7000);

  // Stamp door and trapdoors on pad
  await Runtime.evaluate({
    expression: `(() => {
      const api = window.__sim?.api;
      if (api?.edit) {
        api.edit(7, 65, 7, 105);
        api.edit(7, 66, 7, 105);
        api.edit(9, 65, 7, 107); // Closed trapdoor
        api.edit(11, 65, 7, 108); // Open trapdoor
      }
    })()`
  });

  await sleep(1000);

  async function shot(name, cx, cz, angDeg, dist = 3.2, pitch = -0.05, eyeY = 64.6) {
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
        s.player.y = ${eyeY}; s.player.fly = true;
        s.player.yaw = Math.atan2(-(${dx}), -(${dz}));
        s.player.pitch = ${pitch};
        s.camera.position.set(s.player.x, s.player.y + 1.62, s.player.z);
        s.camera.rotation.order = 'YXZ';
        s.camera.rotation.y = s.player.yaw;
        s.camera.rotation.x = s.player.pitch;
        s.renderer.render(s.scene, s.camera);
        return s.renderer.domElement.toDataURL('image/jpeg', 0.95);
      })()`,
      returnByValue: true
    });
    const url = res.result?.value;
    if (!url) { console.log(`shot ${name}: NO DATA`); return; }
    const buf = Buffer.from(String(url).split(",")[1], "base64");
    fs.writeFileSync(`snapshots/${name}.jpg`, buf);
    console.log(`shot ${name}: ${buf.length} bytes`);
  }

  // 1. Direct Front of Door (eye level on handle and upper 2x2 window)
  await shot("focus-2", 7, 7, -90, 2.8, -0.02, 64.6);
  await shot("focus-0", 7, 7, -135, 3.0, -0.02, 64.6);

  // 2. 45° Angle looking UP at Door (verifying solid watertight inner face geometry)
  await shot("door-45up", 7, 7, -90, 2.5, 0.72, 63.2);

  // 3. 45° Angle looking DOWN at Door (verifying solid sills & bevels)
  await shot("door-45down", 7, 7, -90, 2.5, -0.72, 66.0);

  // 4. Closed Trapdoor (Horizontal with 2x2 wooden grille & real cutouts)
  await shot("trapdoor-closed", 9, 7, -90, 2.5, -0.75, 65.8);

  // 5. Open Trapdoor (Vertical against wall with 2x2 wooden grille)
  await shot("trapdoor-open", 11, 7, -90, 2.5, -0.15, 64.6);

  console.log("All snapshots captured successfully! ✓");
  await client.close();
} catch (err) {
  console.error("Test error:", err);
} finally {
  chrome.kill();
}
