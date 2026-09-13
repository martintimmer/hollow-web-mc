import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const KB_ROOT = join(REPO_ROOT, "kb");
const REGISTRY_PATH = join(REPO_ROOT, "catalog", "completeRegistry.json");
const REPORT_PATH = join(REPO_ROOT, "kb-coverage-report.md");

const IGNORE_DIRS = new Set(["_templates"]);
const IGNORE_FILES = new Set(["README.md", "index.json"]);
const CODE_EXT = new Set(["ts", "tsx", "js", "mjs", "py", "json"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!IGNORE_DIRS.has(entry)) walk(full, out);
    } else if (st.isFile() && entry.endsWith(".md") && !IGNORE_FILES.has(entry)) {
      out.push(full);
    }
  }
  return out;
}

function parseFrontMatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const block = m[1];
  const data = {};
  const lines = block.split("\n");
  let curKey = null;
  for (const line of lines) {
    const keyMatch = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (keyMatch) {
      curKey = keyMatch[1];
      let val = keyMatch[2].trim();
      if (val === "") data[curKey] = "";
      else if (val.startsWith("[") || val.startsWith("{")) {
        try { data[curKey] = JSON.parse(val); } catch { data[curKey] = val; }
      } else data[curKey] = val.replace(/^["']|["']$/g, "");
    } else if (curKey && line.trim().startsWith("- ")) {
      const arr = Array.isArray(data[curKey]) ? data[curKey] : [];
      arr.push(line.trim().slice(2).replace(/^["']|["']$/g, ""));
      data[curKey] = arr;
    }
  }
  return data;
}

const ANCHOR_RE = /`([^\s`]+\.(?:ts|tsx|js|mjs|py|json))(?::(\d+))?`/g;
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "build", "coverage"]);
const KNOWN_PREFIXES = ["src/", "server/", "scripts/", "catalog/", "docs/", "kb/", "data/", "public/", "seed-page/", "block-page/", "build-page/"];

function extractAnchors(body) {
  const out = [];
  let m;
  while ((m = ANCHOR_RE.exec(body)) !== null) {
    out.push({ file: m[1], line: m[2] ? Number(m[2]) : null });
  }
  return out;
}

const lineCache = new Map();
function fileLineCount(p) {
  if (lineCache.has(p)) return lineCache.get(p);
  const n = readFileSync(p, "utf8").split("\n").length;
  lineCache.set(p, n);
  return n;
}

function findByBasename(name) {
  const parts = name.split("/");
  const base = parts[parts.length - 1];
  let found = null;
  const stack = [REPO_ROOT];
  while (stack.length && !found) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir); } catch { continue; }
    for (const e of entries) {
      if (SKIP_DIRS.has(e)) continue;
      const full = join(dir, e);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) stack.push(full);
      else if (e === base) { found = full; break; }
    }
  }
  return found;
}

function resolveAnchor(file) {
  const exact = resolve(REPO_ROOT, file);
  if (existsSync(exact)) return { abs: exact, how: "exact" };
  const byBase = findByBasename(file);
  if (byBase) return { abs: byBase, how: "basename" };
  return null;
}

function looksLikeSource(file) {
  if (file.includes("*") || file.includes("?")) return false;
  for (const p of KNOWN_PREFIXES) if (file.startsWith(p)) return true;
  return false;
}

function checkAnchors(fm, body) {
  const rawAnchors = extractAnchors(body);
  const seen = new Set();
  const results = [];
  for (const a of rawAnchors) {
    const key = a.file + (a.line ? ":" + a.line : "");
    if (seen.has(key)) continue;
    seen.add(key);

    if (a.file.includes("*") || a.file.includes("?")) {
      results.push({ file: a.file, line: a.line, state: "illustrative" });
      continue;
    }
    const resolved = resolveAnchor(a.file);
    if (!resolved) {
      const state = looksLikeSource(a.file) ? "missing" : "illustrative";
      results.push({ file: a.file, line: a.line, state });
      continue;
    }
    if (a.line !== null) {
      const total = fileLineCount(resolved.abs);
      if (a.line > total) results.push({ file: a.file, line: a.line, state: "line-oob", total });
    }
  }
  return results;
}

function norm(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildKbTokenSet(entries) {
  const tokens = new Set();
  for (const e of entries) {
    const fm = e.fm;
    const raw = [fm.title, fm.id, ...(Array.isArray(fm.tags) ? fm.tags : [])].join(" ");
    for (const piece of raw.split(/[\s/_\-]+/)) {
      const t = norm(piece);
      if (t.length >= 3) tokens.add(t);
    }
  }
  return tokens;
}

function isDocumented(name, kbTokens) {
  const n = norm(name);
  if (!n) return false;
  for (const t of kbTokens) {
    if (t === n || (t.length >= 4 && (t.includes(n) || n.includes(t)))) return true;
  }
  return false;
}

function loadRegistry() {
  if (!existsSync(REGISTRY_PATH)) return null;
  try { return JSON.parse(readFileSync(REGISTRY_PATH, "utf8")); } catch { return null; }
}

function main() {
  const files = walk(KB_ROOT);
  const entries = [];
  const stale = [];
  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const fm = parseFrontMatter(raw);
    if (!fm || !fm.id) continue;
    const rel = relative(KB_ROOT, file).split("\\").join("/");
    const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
    const anchors = checkAnchors(fm, body);
    entries.push({ fm, rel, anchors, body, lines: raw.split("\n").length });
    for (const a of anchors) {
      if (a.state === "missing" || a.state === "line-oob") {
        stale.push({ id: fm.id, rel, ...a });
      }
    }
  }

  const kbTokens = buildKbTokenSet(entries);
  const registry = loadRegistry();

  let coverage = null;
  if (registry) {
    const byCat = {};
    for (const k in registry) {
      const o = registry[k];
      const cat = o.category || "(none)";
      const b = (byCat[cat] = byCat[cat] || { total: 0, documented: 0, samples: [] });
      b.total++;
      if (isDocumented(o.name, kbTokens)) b.documented++;
      else if (b.samples.length < 8) b.samples.push(o.name);
    }
    coverage = byCat;
  }

  const orphanDocs = entries.filter((e) => {
    const name = e.fm.title || e.fm.id;
    return !isDocumented(name, kbTokens) && registry &&
      !["system", "ui", "mechanic"].includes(e.fm.kind);
  });

  const illustrative = [];
  for (const e of entries) for (const a of e.anchors) if (a.state === "illustrative") illustrative.push({ id: e.fm.id, ...a });

  // Depth report (warn-only by design — never fails CI). Chest-standard is the
  // bar (see kb/README.md); system-kind entries legitimately have no vanilla
  // counterpart, and DEPTH_EXEMPT names entries whose shape is intentional.
  const REQUIRED_ALL = ["vanilla spec", "our implementation", "deviation", "ruleset", "open work"];
  const REQUIRED_SYSTEM = ["our implementation", "ruleset", "open work"];
  const DEPTH_EXEMPT = new Map([
    ["environments", "ports/topology note, no vanilla counterpart by design"],
  ]);
  const SHALLOW_LINES = 45;
  const depth = entries.map((e) => {
    const req = e.fm.kind === "system" ? REQUIRED_SYSTEM : REQUIRED_ALL;
    const low = e.body.toLowerCase();
    const missing = DEPTH_EXEMPT.has(e.fm.id) ? [] : req.filter((s) => !low.includes(s));
    // Code refs: backticked paths AND markdown [x](file:///...) links both count
    // (e.anchors only carries problem anchors, so count references directly).
    const refs = e.body.match(/(?:src|server|scripts|catalog|docs|seed-page|block-page|build-page)\/[^\s`)\]]+/g) || [];
    const codeRefs = new Set(refs.map((r) => r.replace(/[`\]"']+$/, ""))).size;
    const emptyTags = !e.fm.tags || (Array.isArray(e.fm.tags) && e.fm.tags.length === 0);
    return {
      id: e.fm.id, kind: e.fm.kind || "?", status: e.fm.status || "?",
      lines: e.lines, missing, anchors: codeRefs, emptyTags,
      exempt: DEPTH_EXEMPT.get(e.fm.id) || "",
      shallow: e.lines < SHALLOW_LINES,
    };
  }).sort((a, b) => (b.missing.length - a.missing.length) || (a.lines - b.lines));
  const offSpec = depth.filter((d) => d.missing.length || d.shallow);

  const md = renderReport({ entries, stale, illustrative, coverage, orphanDocs, registryCount: registry ? Object.keys(registry).length : null, depth, offSpec });

  // Reverse index: code file -> kb ids. Powers `kbRead --file` ("which entries
  // constrain this file?") and any future UI linking. Regenerated on every run.
  const CODE_REF_RE = /(?:src|server|scripts|catalog|docs|seed-page|block-page|build-page)\/[^\s`)\]]+/g;
  const reverse = {};
  for (const e of entries) {
    const refs = e.body.match(CODE_REF_RE) || [];
    for (let r of refs) {
      r = r.replace(/[`\]"']+$/, "");
      if (/[*?]/.test(r)) continue;
      (reverse[r] = reverse[r] || []);
      if (!reverse[r].includes(e.fm.id)) reverse[r].push(e.fm.id);
    }
  }
  const codeIndex = { generated: new Date().toISOString().slice(0, 10), entries: entries.length, index: reverse };
  writeFileSync(join(KB_ROOT, "code-index.json"), JSON.stringify(codeIndex, null, 2) + "\n");
  console.log(`Reverse index: kb/code-index.json (${Object.keys(reverse).length} files → ${entries.length} entries)`);

  // Registry linkage: registry id -> kb id. Exact slug match first, same fuzzy
  // rule as coverage otherwise. Consumed by /blocks.html (exact pill, no more
  // fuzzy guessing) and any future in-game debug overlay.
  const slugOf = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const entryById = new Map(entries.map((e) => [e.fm.id, e]));
  const links = {};
  const unresolved = [];
  if (registry) {
    const items = Array.isArray(registry) ? registry : Object.values(registry);
    for (const r of items) {
      if (!r || r.name == null || r.id == null) continue;
      const exact = `blocks/${slugOf(r.name)}`;
      if (entryById.has(exact)) { links[r.id] = exact; continue; }
      // fuzzy fallback mirrors isDocumented, but records the matched entry
      const n = norm(r.name);
      let hit = null;
      if (n) {
        for (const e of entries) {
          if (!e.fm.id.startsWith("blocks/")) continue;
          const hay = [e.fm.title, e.fm.id, ...(Array.isArray(e.fm.tags) ? e.fm.tags : [])].join(" ");
          const matched = hay.split(/[\s/_\-]+/).map(norm).some((t) => t === n || (t.length >= 4 && (t.includes(n) || n.includes(t))));
          if (matched) { hit = e.fm.id; break; }
        }
      }
      if (hit) links[r.id] = hit;
      else unresolved.push({ id: r.id, name: r.name });
    }
  }
  writeFileSync(join(KB_ROOT, "kb-links.json"), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), links, unresolved: unresolved.length }, null, 2) + "\n");
  console.log(`Registry linkage: kb/kb-links.json (${Object.keys(links).length} linked, ${unresolved.length} without entry)`);
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, md);

  console.log(`KB entries scanned: ${entries.length}`);
  console.log(`Stale anchors (missing files): ${stale.filter((s) => s.state === "missing").length}`);
  console.log(`Stale anchors (line out-of-range): ${stale.filter((s) => s.state === "line-oob").length}`);
  console.log(`Illustrative/planned anchors (info only): ${illustrative.length}`);
  console.log(`Off-spec/shallow entries (info only, see report §5): ${offSpec.length}`);
  if (coverage) {
    const total = Object.values(coverage).reduce((a, b) => a + b.total, 0);
    const documented = Object.values(coverage).reduce((a, b) => a + b.documented, 0);
    console.log(`Registry objects: ${total}, documented (approx): ${documented}`);
  }
  console.log(`Report: ${relative(REPO_ROOT, REPORT_PATH)}`);

  if (stale.length) {
    console.error("\nSTALE ANCHORS (CI failure):");
    for (const s of stale) {
      const where = s.line ? `${s.file}:${s.line}` : s.file;
      const detail = s.state === "line-oob" ? ` (line ${s.line} > ${s.total})` : " (file missing)";
      console.error(`  [${s.id}] ${where}${detail}`);
    }
    process.exit(1);
  }
  process.exit(0);
}

function renderReport({ entries, stale, illustrative, coverage, orphanDocs, registryCount, depth, offSpec }) {
  const lines = [];
  lines.push("# KB Coverage Report");
  lines.push("");
  lines.push(`_Generated by scripts/kbCoverage.mjs — ${new Date().toISOString().slice(0, 10)}_`);
  lines.push("");
  lines.push(`KB entries scanned: **${entries.length}**`);
  lines.push(`Registry objects: **${registryCount ?? "n/a"}**`);
  lines.push(`Stale anchors: **${stale.length}** (missing files / out-of-range lines)`);
  lines.push("");

  lines.push("## 1. Stale anchors (should fail CI)");
  lines.push("");
  if (!stale.length) lines.push("_None._");
  else {
    lines.push("| Entry | Anchor | Issue |");
    lines.push("|---|---|---|");
    for (const s of stale) {
      const where = s.line ? `${s.file}:${s.line}` : s.file;
      const issue = s.state === "line-oob" ? `line ${s.line} > ${s.total}` : "file missing";
      lines.push(`| ${s.id} | \`${where}\` | ${issue} |`);
    }
  }
  lines.push("");

  lines.push("## 2. Coverage by registry category");
  lines.push("");
  if (!coverage) {
    lines.push("_Registry not found — cannot reconcile._");
  } else {
    lines.push("| Category | Objects | Documented (approx) | Undocumented | Samples of undocumented |");
    lines.push("|---|---|---|---|---|");
    const cats = Object.keys(coverage).sort((a, b) => coverage[b].total - coverage[a].total);
    for (const c of cats) {
      const b = coverage[c];
      const undoc = b.total - b.documented;
      lines.push(`| ${c} | ${b.total} | ${b.documented} | ${undoc} | ${b.samples.join(", ")} |`);
    }
  }
  lines.push("");

  lines.push("## 3. KB entries not matched to any registry object (informational)");
  lines.push("");
  if (!orphanDocs.length) lines.push("_None._");
  else for (const e of orphanDocs) lines.push(`- \`${e.fm.id}\` (${e.fm.kind}) — ${e.fm.title}`);
  lines.push("");

  lines.push("## 4. Illustrative / planned anchors (not yet in repo — info only)");
  lines.push("");
  if (!illustrative.length) lines.push("_None._");
  else {
    lines.push("| Entry | Anchor |");
    lines.push("|---|---|");
    for (const s of illustrative) {
      const where = s.line ? `${s.file}:${s.line}` : s.file;
      lines.push(`| ${s.id} | \`${where}\` |`);
    }
  }
  lines.push("");

  lines.push("## 5. Entry depth vs chest-standard (warn-only, never fails CI)");
  lines.push("");
  lines.push("_Bar: `kb/blocks/chest.md`. Off-spec = missing required sections; shallow = < 45 lines._");
  lines.push("");
  if (!offSpec.length) lines.push("_None — every entry is at chest-standard._");
  else {
    lines.push("| Entry | Lines | Missing sections | Code refs | Flags |");
    lines.push("|---|---|---|---|---|");
    for (const d of offSpec) {
      const flags = [
        d.exempt ? `exempt (${d.exempt})` : "",
        d.shallow && !d.missing.length ? "shallow" : "",
        d.emptyTags ? "empty tags" : "",
      ].filter(Boolean).join("; ");
      lines.push(`| ${d.id} | ${d.lines} | ${d.missing.join(", ") || "—"} | ${d.anchors} | ${flags || "—"} |`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

main();
