import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const ENTRIES = [
  { page: "blocks.html", entry: "block-page/main.ts" },
  { page: "editor.html", entry: "block-page/editor.ts" },
  { page: "seed.html", entry: "seed-page/main.ts" },
];

const TS_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".jsx"]);
const exportCache = new Map();

function resolveModule(fromDir, spec) {
  if (!spec.startsWith(".")) return null;
  const base = resolve(fromDir, spec);
  const candidates = [base];
  if (extname(base) === "") {
    for (const e of [".ts", ".tsx", ".js", ".mjs", ".jsx"]) candidates.push(base + e);
    candidates.push(join(base, "index.ts"));
    candidates.push(join(base, "index.tsx"));
    candidates.push(join(base, "index.js"));
  } else if (statSync(base, { throwIfNoEntry: false })?.isDirectory()) {
    candidates.push(join(base, "index.ts"));
    candidates.push(join(base, "index.tsx"));
    candidates.push(join(base, "index.js"));
  }
  for (const c of candidates) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
}

function collectExports(modPath, seen = new Set()) {
  if (exportCache.has(modPath)) return exportCache.get(modPath);
  const result = { names: new Set(), hasDefault: false, reExports: [] };
  exportCache.set(modPath, result);
  if (seen.has(modPath)) return result;
  seen = new Set(seen); seen.add(modPath);
  let src;
  try { src = readFileSync(modPath, "utf8"); } catch { return result; }
  src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  const declRe = /export\s+(?:async\s+)?(?:function|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/g;
  let m;
  while ((m = declRe.exec(src)) !== null) result.names.add(m[1]);

  const varRe = /export\s+(?:const|let|var)\s+([^;]+?)(?=;|$)/g;
  while ((m = varRe.exec(src)) !== null) {
    for (const part of m[1].split(",")) {
      const name = part.trim().match(/^([A-Za-z0-9_$]+)/);
      if (name) result.names.add(name[1]);
    }
  }

  if (/export\s+default/.test(src)) result.hasDefault = true;

  const namedRe = /export\s*\{([^}]*)\}/g;
  while ((m = namedRe.exec(src)) !== null) {
    const body = m[1];
    const fromMatch = body.match(/}\s*from\s*["']([^"']+)["']/);
    if (fromMatch) { result.reExports.push(fromMatch[1]); continue; }
    for (const part of body.split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) result.names.add(name);
    }
  }

  const starRe = /export\s+\*\s+from\s*["']([^"']+)["']/g;
  while ((m = starRe.exec(src)) !== null) result.reExports.push(m[1]);

  const dir = dirname(modPath);
  for (const re of result.reExports) {
    const rp = resolveModule(dir, re);
    if (rp) {
      const sub = collectExports(rp, seen);
      for (const n of sub.names) result.names.add(n);
      if (sub.hasDefault) result.hasDefault = true;
    }
  }
  return result;
}

function parseImports(src) {
  const imports = [];
  const nsRe = /import\s+\*\s+as\s+\w+\s+from\s*["']([^"']+)["']/g;
  let m;
  while ((m = nsRe.exec(src)) !== null) imports.push({ kind: "namespace", path: m[1] });
  const stdRe = /import\s+(?:([\w*$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*["']([^"']+)["']/g;
  while ((m = stdRe.exec(src)) !== null) {
    const def = m[1] && m[1] !== "*" ? m[1] : null;
    const namedRaw = m[2];
    const path = m[3];
    const names = [];
    if (namedRaw) {
      for (const part of namedRaw.split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (name) names.push(name);
      }
    }
    imports.push({ kind: def ? "default" : "named", defaultName: def, names, path });
  }
  return imports;
}

function localHelpers(src) {
  const IGNORE = new Set(["$", "THREE"]);
  const names = new Set();
  const re = /^(?:export\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (!IGNORE.has(m[1])) names.add(m[1]);
  }
  return names;
}

function mtime(p) {
  try { return statSync(p).mtimeMs; } catch { return 0; }
}

function main() {
  const errors = [];
  const warnings = [];
  const sharedCount = {};
  const helperDefs = {};

  for (const { page, entry } of ENTRIES) {
    const entryPath = resolve(REPO_ROOT, entry);
    if (!existsSync(entryPath)) { errors.push(`[${page}] entry missing: ${entry}`); continue; }
    const src = readFileSync(entryPath, "utf8");
    const imports = parseImports(src);
    const localDeps = [entryPath];

    const seenMods = new Set();
    for (const imp of imports) {
      if (!imp.path.startsWith(".")) continue;
      const modPath = resolveModule(dirname(entryPath), imp.path);
      if (!modPath) {
        if (imp.path.endsWith(".json")) { errors.push(`[${page}] missing JSON: ${imp.path}`); }
        else { errors.push(`[${page}] unresolved module: ${imp.path}`); }
        continue;
      }
      localDeps.push(modPath);
      if (imp.path.endsWith(".json")) continue;
      if (seenMods.has(modPath)) {
        if (imp.kind === "named") for (const n of imp.names) sharedCount[modPath] = (sharedCount[modPath] || 0);
        continue;
      }
      seenMods.add(modPath);
      const ex = collectExports(modPath);
      if (imp.kind === "default" && !ex.hasDefault) {
        errors.push(`[${page}] ${imp.path} has no default export (imported as default \`${imp.defaultName}\`)`);
      }
      for (const n of imp.names) {
        if (!ex.names.has(n)) {
          errors.push(`[${page}] ${imp.path} does not export \`${n}\` (imported by ${page})`);
        }
      }
    }

    sharedCount[entry] = sharedCount[entry] || 0;
    for (const d of localDeps) if (d !== entryPath) sharedCount[d] = (sharedCount[d] || 0) + 1;

    helperDefs[page] = localHelpers(src);
  }

  const dupHelpers = {};
  const allPages = Object.keys(helperDefs);
  for (let i = 0; i < allPages.length; i++) {
    for (let j = i + 1; j < allPages.length; j++) {
      for (const name of helperDefs[allPages[i]]) {
        if (helperDefs[allPages[j]].has(name)) {
          (dupHelpers[name] = dupHelpers[name] || new Set()).add(allPages[i]).add(allPages[j]);
        }
      }
    }
  }

  const ALLOW_DUP = new Set(["atlasReady"]);
  for (const name of Object.keys(dupHelpers)) {
    if (ALLOW_DUP.has(name)) continue;
    warnings.push(`helper \`${name}\` defined in multiple pages (${[...dupHelpers[name]].join(", ")}) — consider extracting to src/`);
  }

  const sharedMods = Object.entries(sharedCount).filter(([, c]) => c >= 2).map(([p]) => p);
  console.log(`Pages checked: ${ENTRIES.length}`);
  console.log(`Shared modules (imported by >=2 pages): ${sharedMods.length}`);
  for (const p of sharedMods) console.log(`  - ${relativeSafe(p)}`);

  const distStale = [];
  for (const { page, entry } of ENTRIES) {
    const distPath = resolve(REPO_ROOT, "dist", page);
    if (!existsSync(distPath)) { warnings.push(`${page}: dist/${page} missing (run npm run build)`); continue; }
    const distTime = mtime(distPath);
    const entryPath = resolve(REPO_ROOT, entry);
    let newest = mtime(entryPath);
    const src2 = readFileSync(entryPath, "utf8");
    for (const imp of parseImports(src2)) {
      if (!imp.path.startsWith(".")) continue;
      const mp = resolveModule(dirname(entryPath), imp.path);
      if (mp) newest = Math.max(newest, mtime(mp));
    }
    if (distTime < newest - 1000) distStale.push(page);
    else console.log(`${page}: dist up to date`);
  }
  if (distStale.length) errors.push(`stale dist builds (older than sources): ${distStale.join(", ")}`);

  console.log("");
  if (warnings.length) {
    console.log("WARNINGS:");
    for (const w of warnings) console.log(`  - ${w}`);
  }
  if (errors.length) {
    console.error("ERRORS:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("\nAll pages consistent: imports resolve, shared symbols exist, dist fresh.");
  process.exit(0);
}

function relativeSafe(p) {
  try { return p.startsWith(REPO_ROOT) ? p.slice(REPO_ROOT.length + 1) : p; } catch { return p; }
}

main();
