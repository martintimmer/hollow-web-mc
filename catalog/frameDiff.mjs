/**
 * @file catalog/frameDiff.mjs
 * Pixel comparator for golden-frame regression (used by scripts/ci-perf.mjs).
 * Usage: node catalog/frameDiff.mjs <ref.png> <cur.png>   →  {"mae":..,"peak":..}
 */
import fs from "node:fs";
import { PNG } from "pngjs";

const [a, b] = process.argv.slice(2);
const pa = PNG.sync.read(fs.readFileSync(a));
const pb = PNG.sync.read(fs.readFileSync(b));
if (pa.width !== pb.width || pa.height !== pb.height) {
  console.log(JSON.stringify({ mae: 999, peak: 999, reason: "size-mismatch" }));
  process.exit(0);
}
const n = pa.width * pa.height;
let sum = 0, peak = 0;
for (let i = 0; i < n * 4; i += 4) {
  const d = Math.abs(pa.data[i] - pb.data[i]) + Math.abs(pa.data[i + 1] - pb.data[i + 1]) + Math.abs(pa.data[i + 2] - pb.data[i + 2]);
  sum += d;
  if (d > peak) peak = d;
}
console.log(JSON.stringify({ mae: (sum / (n * 3)).toFixed(2) * 1, peak }));
