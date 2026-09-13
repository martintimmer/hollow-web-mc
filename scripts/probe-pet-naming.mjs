// Headless probe: E-key on animal with a SIGN opens the naming prompt;
// typing a name + Enter sets the pet name, owner and floating nameplate.
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";

const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader",
  "--remote-debugging-port=9421", "about:blank"
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);

try {
  const c = await CDP({ port: 9421 });
  const { Page, Runtime } = c;
  await Page.enable();
  await Runtime.enable();
  await Page.navigate({ url: "http://127.0.0.1:5450/?sim=1" });
  await sleep(9000);

  const ev = async (expr) => {
    const r = await Runtime.evaluate({ expression: expr, returnByValue: true });
    return r.result?.value;
  };

  // spawn a cow, equip an oak sign (1044) in slot 0, face the cow, press E
  const st = await ev(`(()=>{
    const api=window.__sim?.api; const s=window.__sim?.s;
    if(!api||!s) return "no-bridge";
    api.spawnAnimal("cow", 10, 8);
    s.hotbar[0]=1044; s.slot=0;
    s.player.x=8.5; s.player.y=66.4; s.player.z=8.5;
    s.player.yaw=-Math.PI/2; s.player.pitch=0; s.player.fly=true;
    s.active=true; s.uiPaused=false; s.timeFlow=false;
    window.dispatchEvent(new KeyboardEvent("keydown", {code:"KeyE"}));
    return "E pressed";
  })()`);
  console.log("setup:", JSON.stringify(st));
  await sleep(1500);

  const overlay = await ev(`!!document.querySelector('input[placeholder="Pet name…"]')`);
  console.log("naming prompt open:", overlay);

  const typed = await ev(`(()=>{
    const inp=document.querySelector('input[placeholder="Pet name…"]');
    if(!inp) return "no-input";
    const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
    setter.call(inp,"Bessie");
    inp.dispatchEvent(new Event("input",{bubbles:true}));
    inp.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
    return "typed+enter";
  })()`);
  console.log("type:", typed);
  await sleep(800);

  const result = await ev(`(()=>{
    const s=window.__sim?.s;
    const list=s&&s.getAnimalsFn? s.getAnimalsFn().map(a=>({name:a.name||null,owner:a.ownerId||null,type:a.type})) : null;
    const overlayGone = !document.querySelector('input[placeholder="Pet name…"]');
    return { animals: list, overlayGone };
  })()`);
  fs.writeFileSync("snapshots/pet-naming-probe.json", JSON.stringify(result));
  console.log("result:", JSON.stringify(result));
  const named = result && result.animals && result.animals.some(a => a.name === "Bessie" && !!a.owner);
  console.log(named ? "PASS · animal named + owned via sign/E" : "FAIL · naming did not stick");
  await c.close();
} catch (e) {
  console.error("probe error:", e.message);
}
chrome.kill();
