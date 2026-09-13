import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_ROOT = join(__dirname, "..", "kb");
const INDEX_PATH = join(KB_ROOT, "index.json");

const IGNORE_DIRS = new Set(["_templates"]);
const IGNORE_FILES = new Set(["README.md", "index.json"]);

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
      if (val === "") {
        data[curKey] = "";
      } else if (val.startsWith("[") || val.startsWith("{")) {
        try {
          data[curKey] = JSON.parse(val);
        } catch {
          data[curKey] = val;
        }
      } else {
        data[curKey] = val.replace(/^["']|["']$/g, "");
      }
    } else if (curKey && line.trim().startsWith("- ")) {
      const arr = Array.isArray(data[curKey]) ? data[curKey] : [];
      arr.push(line.trim().slice(2).replace(/^["']|["']$/g, ""));
      data[curKey] = arr;
    }
  }
  return data;
}

function buildIndex() {
  const files = walk(KB_ROOT);
  const index = {};
  const errors = [];
  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const fm = parseFrontMatter(raw);
    if (!fm) {
      errors.push(`No front-matter: ${relative(KB_ROOT, file)}`);
      continue;
    }
    if (!fm.id || !fm.title || !fm.status) {
      errors.push(`Missing id/title/status in ${relative(KB_ROOT, file)}`);
      continue;
    }
    const rel = relative(KB_ROOT, file).split("\\").join("/");
    const expectedPath = fm.id + ".md";
    if (expectedPath !== rel) {
      errors.push(`id/path mismatch in ${rel}: id "${fm.id}" implies "${expectedPath}"`);
    }
    index[fm.id] = {
      path: rel,
      title: fm.title,
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      status: fm.status,
      updated: fm.updated_at || ""
    };
  }
  return { index, errors };
}

function loadIndex() {
  if (!existsSync(INDEX_PATH)) return null;
  try {
    return JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  } catch {
    return null;
  }
}

const mode = process.argv.includes("--check") ? "check" : "write";

if (mode === "write") {
  const { index, errors } = buildIndex();
  if (errors.length) {
    for (const e of errors) console.error("WARN:", e);
  }
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
  console.log(`kb/index.json synced: ${Object.keys(index).length} entries`);
  if (errors.length) process.exit(2);
  process.exit(0);
}

const { index: fresh, errors } = buildIndex();
const existing = loadIndex();

let failed = false;
if (errors.length) {
  for (const e of errors) console.error("ERROR:", e);
  failed = true;
}
if (existing === null) {
  console.error("ERROR: index.json missing or unparseable");
  failed = true;
} else {
  const a = JSON.stringify(fresh, null, 2);
  const b = JSON.stringify(existing, null, 2);
  if (a !== b) {
    console.error("ERROR: kb/index.json is out of sync with entries.");
    console.error("Run `node scripts/syncKbIndex.mjs` to regenerate.");
    failed = true;
  } else {
    console.log(`OK: kb/index.json in sync (${Object.keys(fresh).length} entries)`);
  }
}
process.exit(failed ? 1 : 0);
