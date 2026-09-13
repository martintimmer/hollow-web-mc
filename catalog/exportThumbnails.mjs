/**
 * @file catalog/exportThumbnails.mjs
 * Exports catalog/thumbnailsCache.json → public/catalog/thumbnails.json so the
 * ~2.5 MB thumbnail map is served as a fetched asset instead of being bundled
 * into the JS (U4). Run after any thumbnail regeneration.
 */
import fs from "node:fs";

const CACHE = "catalog/thumbnailsCache.json";
const OUT = "public/catalog/thumbnails.json";

const cache = JSON.parse(fs.readFileSync(CACHE, "utf8"));
fs.mkdirSync("public/catalog", { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(cache));
console.log(`Exported ${Object.keys(cache).length} thumbnails → ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB)`);
