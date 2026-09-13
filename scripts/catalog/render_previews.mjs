import { spawn } from "node:child_process";
import fs from "node:fs";
import CDP from "chrome-remote-interface";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i].startsWith("--")) args.set(process.argv[i], process.argv[i + 1]);
}
const baseUrl = args.get("--base-url") || "http://127.0.0.1:5450";
const jobPath = args.get("--job");
if (!jobPath) throw new Error("--job is required");
const job = JSON.parse(fs.readFileSync(jobPath, "utf8"));
const port = 9600 + (process.pid % 200);
const chrome = spawn("/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${port}`, "about:blank"
], { stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  await sleep(1200);
  const client = await CDP({ port });
  const { Page, Runtime } = client;
  await Page.enable();
  await Runtime.enable();
  await Page.navigate({ url: `${baseUrl.replace(/\/$/, "")}/blocks.html?renderPreviews=1` });
  await sleep(1200);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = await Runtime.evaluate({ expression: "typeof window.__blocksCatalogRenderPreviews === 'function'", returnByValue: true });
    if (ready.result?.value) break;
    await sleep(500);
    if (attempt === 59) throw new Error("blocks catalog preview renderer did not become ready");
  }
  const ids = job.ids || [];
  for (let start = 0; start < ids.length; start += 8) {
    const batch = ids.slice(start, start + 8);
    const expression = `window.__blocksCatalogRenderPreviews(${JSON.stringify(batch)})`;
    const evaluated = await Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true });
    const payload = evaluated.result?.value;
    if (!payload?.previews) throw new Error(evaluated.exceptionDetails?.text || "preview render returned no data");
    for (const [id, previews] of Object.entries(payload.previews)) {
      const outDir = `${process.cwd()}/public/catalog/previews/${id}`;
      fs.mkdirSync(outDir, { recursive: true });
      for (const view of ["inventory", "held", "placed"]) {
        const dataUri = previews[view];
        if (!dataUri || !dataUri.startsWith("data:image/")) continue;
        fs.writeFileSync(`${outDir}/${view}.png`, Buffer.from(dataUri.split(",", 2)[1], "base64"));
      }
    }
    console.log(`rendered previews ${Math.min(start + batch.length, ids.length)}/${ids.length}`);
  }
  await client.close();
} finally {
  chrome.kill();
}
