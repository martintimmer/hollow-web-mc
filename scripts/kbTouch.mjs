// kbTouch.mjs — change gate: which KB entries own the files you touched?
//
// Compares the working tree (git status) against kb/code-index.json and
// reports, per touched source file, the owning KB entries and whether each
// entry was itself updated in this tree. Run at session close-out:
//
//   node scripts/kbTouch.mjs            report (exit 0, warn-only)
//   node scripts/kbTouch.mjs --strict   exit 1 if any owning entry untouched
//
// Warn-only by default: two sessions share this tree, so "untouched" may
// belong to the other session. Graduate to --strict in CI once ownership
// (owner: frontmatter) is universal.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const strict = process.argv.includes("--strict");

function trackedFiles() {
  const out = execFileSync("git", ["status", "--porcelain"], { cwd: REPO_ROOT, encoding: "utf8" });
  return out.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim()).map((l) => {
    let p = l.slice(3).trim();
    if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);
    // rename format: "old -> new"
    if (p.includes(" -> ")) p = p.split(" -> ").pop();
    return { flag: l.slice(0, 2).trim(), path: p };
  });
}

const CODE_RE = /^(src|server|scripts|catalog|seed-page|block-page|build-page)\//;
const GENERATED = new Set(["src/buildTag.ts", "src/game/blocks.ts", "kb/index.json", "kb/code-index.json", "kb/kb-links.json", "kb-coverage-report.md", "kb-wiki-report.md"]);

function main() {
  const ciPath = join(REPO_ROOT, "kb", "code-index.json");
  if (!existsSync(ciPath)) {
    console.error("kb/code-index.json missing — run npm run kb:check first.");
    process.exit(2);
  }
  const ci = JSON.parse(readFileSync(ciPath, "utf8")).index || {};
  // file -> entries, plus substring fallback for moved/renamed paths
  const ownersOf = (f) => {
    if (ci[f]) return ci[f];
    const low = f.toLowerCase();
    const hits = new Set();
    for (const [file, ids] of Object.entries(ci)) {
      const base = file.split("/").pop().toLowerCase();
      if (low.endsWith("/" + base) || base === low.split("/").pop()) for (const id of ids) hits.add(id);
    }
    return [...hits];
  };

  const changed = trackedFiles();
  const touchedKb = new Set(changed.filter((c) => c.path.startsWith("kb/") && c.path.endsWith(".md")).map((c) => {
    const m = c.path.replace(/^kb\//, "").replace(/\.md$/, "");
    return m;
  }));
  const rows = [];
  for (const c of changed) {
    if (!CODE_RE.test(c.path) || GENERATED.has(c.path) || c.flag === "?") continue;
    const owners = ownersOf(c.path);
    if (!owners.length) continue;
    const stale = owners.filter((id) => !touchedKb.has(id));
    rows.push({ file: c.path, flag: c.flag, owners, stale });
  }

  if (!rows.length) {
    console.log("kbTouch: no touched source files map to KB entries — nothing to update.");
    process.exit(0);
  }
  let staleCount = 0;
  for (const r of rows) {
    const mark = r.stale.length ? "STALE" : "ok";
    if (r.stale.length) staleCount++;
    console.log(`[${mark}] ${r.file} → ${r.owners.map((id) => `kb/${id}.md`).join(", ")}`);
    if (r.stale.length) console.log(`       update or confirm current: ${r.stale.map((id) => `kb/${id}.md`).join(", ")}`);
  }
  console.log(`\nkbTouch: ${rows.length} touched files map to entries, ${staleCount} with untouched owners.`);
  console.log("Rule: whoever touches a system leaves its entry current (anchors, deviations, updated_at).");
  process.exit(strict && staleCount ? 1 : 0);
}

main();
