import { spawn } from "node:child_process";
import CDP from "chrome-remote-interface";

const PORT = 9263;
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

  await Page.navigate({ url: "http://127.0.0.1:5450/" });
  await sleep(4000);

  const res = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      if (!s) return { error: "no s" };

      const before = { x: s.player.x, y: s.player.y, z: s.player.z, active: s.active };
      
      // Press W key
      s.keys["KeyW"] = true;

      return {
        before,
        keys: { ...s.keys }
      };
    })()`,
    returnByValue: true
  });
  console.log("Press W:", JSON.stringify(res.result?.value, null, 2));

  await sleep(500);

  const afterMove = await Runtime.evaluate({
    expression: `(() => {
      const s = window.__sim?.s;
      return {
        after: { x: s.player.x, y: s.player.y, z: s.player.z },
        vx: s.player.vx,
        vz: s.player.vz
      };
    })()`,
    returnByValue: true
  });
  console.log("After 500ms:", JSON.stringify(afterMove.result?.value, null, 2));

  await client.close();
} catch (e) {
  console.error(e);
} finally {
  chrome.kill();
}
