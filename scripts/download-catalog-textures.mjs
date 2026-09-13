import fs from "node:fs";
import path from "node:path";

const CATALOG_ROOT = path.resolve("catalog");
const BASE_URL = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19.3/assets/minecraft/textures";

const CATEGORIES = [
  { name: "block", urlPath: "block", localDir: "textures/block" },
  { name: "item", urlPath: "item", localDir: "textures/item" },
  { name: "entity/chest", urlPath: "entity/chest", localDir: "textures/entity/chest" }
];

async function downloadCategory(cat) {
  const targetDir = path.join(CATALOG_ROOT, cat.localDir);
  fs.mkdirSync(targetDir, { recursive: true });

  console.log(`\nFetching ${cat.name} texture list from GitHub 1.19.3...`);
  const listRes = await fetch(`${BASE_URL}/${cat.urlPath}/_list.json`);
  if (!listRes.ok) {
    console.warn(`Could not fetch _list.json for ${cat.name} (${listRes.status}). Trying single files.`);
    return;
  }
  const allData = await listRes.json();
  const allFiles = Array.isArray(allData) ? allData : (allData.files || []);
  const pngFiles = allFiles.filter(f => f.endsWith(".png"));
  const mcmetaFiles = allFiles.filter(f => f.endsWith(".mcmeta"));

  console.log(`Found ${pngFiles.length} PNGs and ${mcmetaFiles.length} metadata files for ${cat.name}.`);

  const CONCURRENCY = 25;
  let downloadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  async function downloadFile(filename) {
    const dest = path.join(targetDir, filename);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      skippedCount++;
      return;
    }
    try {
      const url = `${BASE_URL}/${cat.urlPath}/${encodeURIComponent(filename)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(arrayBuffer));
      downloadedCount++;
    } catch (err) {
      console.error(`Failed to download ${filename}:`, err.message);
      errorCount++;
    }
  }

  const queue = [...pngFiles, ...mcmetaFiles];
  const total = queue.length;
  let active = 0;
  let index = 0;

  await new Promise((resolve) => {
    function next() {
      if (index >= total && active === 0) return resolve();
      while (active < CONCURRENCY && index < total) {
        const file = queue[index++];
        active++;
        downloadFile(file).finally(() => {
          active--;
          if ((downloadedCount + skippedCount + errorCount) % 50 === 0 || (downloadedCount + skippedCount + errorCount) === total) {
            process.stdout.write(`\r[${cat.name}] Progress: ${downloadedCount + skippedCount}/${total} (New: ${downloadedCount}, Cached: ${skippedCount}, Err: ${errorCount})`);
          }
          next();
        });
      }
    }
    next();
  });
  console.log(`\nCompleted ${cat.name}!`);
}

async function main() {
  for (const cat of CATEGORIES) {
    await downloadCategory(cat);
  }

  // Summary manifest
  const blockFiles = fs.readdirSync(path.join(CATALOG_ROOT, "textures/block")).filter(f => f.endsWith(".png"));
  const itemFiles = fs.existsSync(path.join(CATALOG_ROOT, "textures/item")) ? fs.readdirSync(path.join(CATALOG_ROOT, "textures/item")).filter(f => f.endsWith(".png")) : [];
  const entityFiles = fs.existsSync(path.join(CATALOG_ROOT, "textures/entity/chest")) ? fs.readdirSync(path.join(CATALOG_ROOT, "textures/entity/chest")).filter(f => f.endsWith(".png")) : [];

  const manifest = {
    version: "1.19.3",
    source: "https://github.com/InventivetalentDev/minecraft-assets",
    downloadedAt: new Date().toISOString(),
    summary: {
      blocksCount: blockFiles.length,
      itemsCount: itemFiles.length,
      chestEntitiesCount: entityFiles.length,
      totalPngTextures: blockFiles.length + itemFiles.length + entityFiles.length
    },
    blocks: blockFiles.sort(),
    items: itemFiles.sort()
  };

  fs.writeFileSync(path.join(CATALOG_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\n✅ Full catalog manifest written to catalog/manifest.json (${manifest.summary.totalPngTextures} total PNG textures).`);
}

main().catch(err => {
  console.error("Downloader failed:", err);
  process.exit(1);
});
