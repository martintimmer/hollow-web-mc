import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";

const PORT = 9279;
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

  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(4000);

  // Setup standalone fence on top of a single block, with pits all around it
  const setupResult = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { ok: false };
      s.creative = false;
      s.player.fly = false;
      s.active = true;
      s.steering = true;

      const px = 10, py = 64, pz = 10;

      const setB = (x, y, z, id) => {
        const cx = x >> 4, cz = z >> 4;
        const c = s.chunks.get(cx + "," + cz);
        if (c && c.data) {
          c.data[y * 256 + (z & 15) * 16 + (x & 15)] = id;
        }
      };

      // Set ground under fence
      setB(px, py - 1, pz, 1);
      // Set fence post
      setB(px, py, pz, 1174);

      // Deep pit on the east (+X) side: clear columns x=11..16, y=50..65
      for (let dx = 1; dx <= 6; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let y = 50; y <= 66; y++) {
            setB(px + dx, y, pz + dz, 0);
          }
        }
      }

      // Stand on top of the fence post
      s.player.x = px + 0.5;
      s.player.y = py + 1.5;
      s.player.z = pz + 0.5;
      s.player.vx = 0;
      s.player.vy = 0;
      s.player.vz = 0;
      s.player.ground = true;

      return {
        standingY: s.player.y,
        blockUnderPlayer: s.getBlock(px, py, pz),
        blockInPit: s.getBlock(px + 1, py, pz)
      };
    })()`,
    returnByValue: true
  });
  console.log("Setup result:", setupResult.result?.value);

  await sleep(500);

  // Press KeyD to walk +X off the edge into the pit
  await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (s) {
        s.keys["KeyD"] = true;
      }
    })()`
  });

  // Let player walk for 1.2 seconds into the pit
  await sleep(1200);

  const afterWalkCheck = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      return {
        finalPos: {
          x: Number(s.player.x.toFixed(3)),
          y: Number(s.player.y.toFixed(3)),
          z: Number(s.player.z.toFixed(3))
        },
        ground: s.player.ground,
        fellDown: s.player.y < 65.5 - 1.0
      };
    })()`,
    returnByValue: true
  });
  console.log("After walking off fence post into pit:", afterWalkCheck.result?.value);

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
  process.exit(0);
}
