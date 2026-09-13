#!/usr/bin/env node
// Usage: node scripts/repo-weight.mjs [N] — top-N heaviest AI-readable files by ~tokens.
import { readdirSync, statSync } from "fs";
import { join } from "path";

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "test-results", ".codex", "data", "snapshots"]);
const SKIP_EXT = new Set([".db", ".png", ".jpg", ".jpeg", ".mp3", ".glb", ".gltf", ".bin", ".log", ".jsonl"]);

function walk(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), out);
    } else if (e.isFile()) {
      const p = join(dir, e.name);
      if ([...SKIP_EXT].some((x) => p.endsWith(x))) continue;
      try { out.push([statSync(p).size, p]); } catch { /* gone */ }
    }
  }
  return out;
}

const rows = walk(".", []).sort((a, b) => b[0] - a[0]);
const N = Number(process.argv[2] || 20);
for (const [bytes, p] of rows.slice(0, N)) {
  console.log(`${String(Math.round(bytes / 4)).padStart(8)} ~tok  ${p}`);
}
const agents = rows.find(([, p]) => p === "AGENTS.md");
if (agents) console.log(`\nAGENTS.md injected per file read: ~${Math.round(agents[0] / 4)} tok`);
