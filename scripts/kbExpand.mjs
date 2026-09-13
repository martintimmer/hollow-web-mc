// kbExpand.mjs — automatically expand the KB toward full game-design coverage.
//
// Scans the game-design sources of truth:
//   - catalog/completeRegistry.json (all 1200+ blocks/items)
//   - catalog/biome-registry.json  (implemented biomes with kb == null)
// and proposes stub entries (from kb/_templates/entry.md) for whatever the KB
// does not document yet (same fuzzy match as scripts/kbCoverage.mjs).
//
// Usage:
//   node scripts/kbExpand.mjs                        dry-run report (default, changes nothing)
//   node scripts/kbExpand.mjs --category ores         filter registry category
//   node scripts/kbExpand.mjs --include biomes        only biomes (blocks|biomes|all)
//   node scripts/kbExpand.mjs --write --limit 20      create up to 20 stubs, then re-sync index
//
// Safety: never overwrites an existing file or a known kb id. Run
// `npm run kb:check` after --write. This is the "keep automatically expanding"
// half of the KB loop; the "always read" half is scripts/kbRead.mjs.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const KB_ROOT = join(REPO_ROOT, "kb");
const REGISTRY_PATH = join(REPO_ROOT, "catalog", "completeRegistry.json");
const BIOME_REGISTRY_PATH = join(REPO_ROOT, "catalog", "biome-registry.json");

const today = new Date().toISOString().slice(0, 10);

function norm(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "") || "unnamed";
}

function wikiSlug(name) {
  return (name || "").trim().replace(/[ /]+/g, "_");
}

// Same fuzzy rule as kbCoverage.mjs: an object counts as documented when any
// KB token (from entry titles/ids/tags) fuzzy-matches its name.
function buildKbTokens() {
  const tokens = new Set();
  const ids = new Set();
  const stack = [KB_ROOT];
  const SKIP = new Set(["_templates"]);
  while (stack.length) {
    const dir = stack.pop();
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      const st = statSync(full);
      if (st.isDirectory()) { if (!SKIP.has(e)) stack.push(full); continue; }
      if (!e.endsWith(".md") || e === "README.md") continue;
      const raw = readFileSync(full, "utf8");
      const fm = raw.match(/^---\n([\s\S]*?)\n---/);
      const idM = raw.match(/^id:\s*(.+)$/m);
      const titleM = raw.match(/^title:\s*(.+)$/m);
      const tagsM = raw.match(/^tags:\s*(.+)$/m);
      if (idM) ids.add(idM[1].trim());
      const hay = `${titleM?.[1] || ""} ${idM?.[1] || ""} ${tagsM?.[1] || ""}`;
      for (const piece of hay.split(/[\s/_\-,[\]]+/)) {
        const t = norm(piece);
        if (t.length >= 3) tokens.add(t);
      }
      void fm;
    }
  }
  return { tokens, ids };
}

function isDocumented(name, kbTokens) {
  const n = norm(name);
  if (!n) return false;
  for (const t of kbTokens) {
    if (t === n || (t.length >= 4 && (t.includes(n) || n.includes(t)))) return true;
  }
  return false;
}

function baseName(name) {
  // Group numbered item variants: "Clock 00".."Clock 47" -> "Clock", "Bow Pulling 0" -> "Bow Pulling".
  return name.replace(/\s+\d+$/, "").trim();
}

function loadRegistry() {
  if (!existsSync(REGISTRY_PATH)) return [];
  try {
    const j = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
    return Array.isArray(j) ? j : Object.values(j);
  } catch { return []; }
}

function loadBiomes() {
  if (!existsSync(BIOME_REGISTRY_PATH)) return [];
  try {
    const j = JSON.parse(readFileSync(BIOME_REGISTRY_PATH, "utf8"));
    return j.biomes || [];
  } catch { return []; }
}

function blockStub(group) {
  // group: { base, category, members: [{id,name,category}] }
  const slugBase = slugify(group.base);
  const wiki = `https://minecraft.wiki/w/${wikiSlug(group.base)}`;
  const memberRows = group.members
    .map((m) => `| ${m.id} | ${m.name} | ${m.category} |`)
    .join("\n");
  return `---
id: blocks/${slugBase}
title: "${group.base}"
kind: block
wiki: ${wiki}
game_version: "1.19.3 (Java)"
fetched_at: ${today}
updated_at: ${today}
status: absent
tags: [${group.category}]
related_docs: []
---

# ${group.base}

STUB — auto-created by \`scripts/kbExpand.mjs\` on ${today}. Fill in from ${wiki} before implementing.

## Vanilla specs

- TODO: hardness, blast resistance, stackability, transparency, light, behavior rules.

## Our implementation

| Concern | Where |
|---|---|
| Registry | \`catalog/completeRegistry.json\` (${group.members.length} entr${group.members.length === 1 ? "y" : "ies"} — see table below) |
| Block ids | \`src/game/blocks.ts\` |
| Meshing | \`src/game/engine/chunkMesh.ts\` / \`src/game/engine/meshWorker.ts\` |
| Interaction | \`src/components/Game.tsx\` |

${memberRows ? `| id | name | category |\n|---|---|---|\n${memberRows}` : ""}

## Deviations / limitations

- TODO: where we intentionally differ from vanilla.

## Ruleset when modifying

- Edit via \`catalog/completeRegistry.json\`, never hand-edit \`src/game/blocks.ts\`.
- Keep worker/main-thread mesher parity (\`meshWorker.ts\` + \`Game.tsx advanceMeshJob\`).
- Gates: \`npm run kb:check\`, \`node scripts/test-worker-meshing.mjs\`.

## Open work

- Research vanilla specs from the wiki link above; flip \`status:\` to \`partial\`/\`implemented\` once real.
`;
}

function biomeStub(b) {
  const custom = !b.vanilla || b.vanilla === "custom";
  const slugBase = slugify(custom ? b.id : b.vanilla);
  const wiki = b.wiki || (custom ? "null" : `https://minecraft.wiki/w/${wikiSlug(b.vanilla)}`);
  const facts = [
    `| registry id | \`${b.id}\` |`,
    `| vanilla | ${b.vanilla || "custom (no vanilla equivalent)"} |`,
    `| tree | ${b.tree || "—"} |`,
    `| density | ${b.density ?? "—"} |`,
    `| map color | ${Array.isArray(b.mapCol) ? `rgb(${b.mapCol.join(", ")})` : "—"} |`,
    `| notes | ${b.notes || "—"} |`,
  ].join("\n");
  return `---
id: terrain/${slugBase}
title: "${b.name} (${b.vanilla || b.id} biome)"
kind: terrain
wiki: ${wiki}
game_version: "1.19.3 (Java)"
fetched_at: ${today}
updated_at: ${today}
status: absent
tags: [biome, terrain, ${slugBase}]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md]
---

# ${b.name}

STUB — auto-created by \`scripts/kbExpand.mjs\` on ${today}. Facts below are
from \`catalog/biome-registry.json\`; vanilla behavior still needs research
from ${wiki === "null" ? "N/A (custom biome, no wiki page)" : wiki} before implementing.

## Registry facts (source of truth: \`catalog/biome-registry.json\`)

${facts}

## Vanilla specs

- TODO: temperature, downfall, precipitation, surface blocks, flora, fauna, structures.

## Our implementation

| Concern | Where |
|---|---|
| Registry | \`catalog/biome-registry.json\` id \`${b.id}\` (implemented, \`kb\` was null) |
| Selection | \`src/game/terrain/biomes.ts\` |
| Surface/scatter | \`src/game/terrain/terrainGenerator.ts\` |
| Visualizer | \`seed-page/main.ts\` (\`/seed.html\` links \`/kb/terrain/${slugBase}\`) |

## Deviations / limitations

- TODO: where the generator differs from vanilla.

## Ruleset when modifying

- Keep \`catalog/biome-registry.json\` as source of truth (re-seeded into the worldgen DB on boot).
- Set the biome's \`kb:\` field to \`terrain/${slugBase}.md\` once this entry is real.
- Gates: \`npm run kb:check\`, \`npm run sim:test\`.

## Open work

- Research vanilla specs from the wiki link above; flip \`status:\` to \`partial\`/\`implemented\` once real.
`;
}

function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const ci = argv.indexOf("--category");
  const categoryFilter = ci >= 0 ? (argv[ci + 1] || "").toLowerCase() : "";
  const ii = argv.indexOf("--include");
  const include = ii >= 0 ? (argv[ii + 1] || "all").toLowerCase() : "all";
  const li = argv.indexOf("--limit");
  const limit = li >= 0 ? Math.max(1, parseInt(argv[li + 1] || "20", 10) || 20) : 20;

  const { tokens, ids } = buildKbTokens();
  const usedSlugs = new Set(
    [...ids].map((id) => id.split("/").slice(1).join("/")).filter(Boolean)
  );
  for (const f of readdirSync(join(KB_ROOT, "blocks"))) usedSlugs.add(f.replace(/\.md$/, ""));
  try {
    for (const f of readdirSync(join(KB_ROOT, "terrain"))) usedSlugs.add("t:" + f.replace(/\.md$/, ""));
  } catch { /* terrain dir always exists, ignore */ }

  const proposals = []; // { kind, file, id, title, content, reason }

  if (include === "all" || include === "blocks") {
    const reg = loadRegistry();
    // Group numbered variants so "Clock 00..47" becomes one stub, not 48.
    const groups = new Map();
    for (const r of reg) {
      if (!r || !r.name) continue;
      if (categoryFilter && (r.category || "").toLowerCase() !== categoryFilter) continue;
      if (norm(r.name) === "air") continue; // not documentable
      const base = baseName(r.name);
      const key = `${(r.category || "").toLowerCase()}::${base.toLowerCase()}`;
      if (!groups.has(key)) groups.set(key, { base, category: r.category || "misc", members: [] });
      groups.get(key).members.push({ id: r.id, name: r.name, category: r.category });
    }
    const sorted = [...groups.values()].sort((a, b) => a.base.localeCompare(b.base));
    for (const g of sorted) {
      if (isDocumented(g.base, tokens)) continue;
      // If every member variant is individually documented, skip too.
      if (g.members.every((m) => isDocumented(m.name, tokens))) continue;
      let slug = slugify(g.base);
      if (usedSlugs.has(slug) || ids.has(`blocks/${slug}`)) {
        slug = `${slug}-${g.members[0].id}`;
        if (usedSlugs.has(slug) || ids.has(`blocks/${slug}`)) continue;
      }
      const file = join(KB_ROOT, "blocks", `${slug}.md`);
      if (existsSync(file)) continue;
      usedSlugs.add(slug);
      proposals.push({
        kind: "block", file, id: `blocks/${slug}`, title: g.base,
        content: blockStub(g),
        reason: `${g.members.length} registry entr${g.members.length === 1 ? "y" : "ies"} (${g.category}) undocumented`,
      });
    }
  }

  if (include === "all" || include === "biomes") {
    for (const b of loadBiomes()) {
      if (!b || !b.implemented || b.kb) continue;
      const slug = slugify(b.vanilla && b.vanilla !== "custom" ? b.vanilla : b.id);
      if (ids.has(`terrain/${slug}`)) continue;
      const file = join(KB_ROOT, "terrain", `${slug}.md`);
      if (existsSync(file)) continue; // covered by a shared entry (e.g. beach.md) — set kb field manually
      proposals.push({
        kind: "biome", file, id: `terrain/${slug}`, title: b.name,
        content: biomeStub(b),
        reason: `implemented biome "${b.id}" has kb == null`,
      });
    }
  }

  const rel = (f) => relative(REPO_ROOT, f);
  if (!write) {
    const blocks = proposals.filter((p) => p.kind === "block");
    const biomes = proposals.filter((p) => p.kind === "biome");
    console.log(`KB auto-expand dry-run (${today}): ${proposals.length} missing entries proposed, nothing written.`);
    if (blocks.length) {
      const byCat = {};
      for (const p of blocks) {
        const m = p.reason.match(/\(([^)]+)\)/);
        const c = m ? m[1] : "misc";
        (byCat[c] = byCat[c] || []).push(p);
      }
      console.log("\n## Blocks/items by category (registry undocumented)");
      for (const c of Object.keys(byCat).sort((a, b) => byCat[b].length - byCat[a].length)) {
        const list = byCat[c];
        console.log(`- ${c}: ${list.length}  e.g. ${list.slice(0, 5).map((p) => p.title).join(", ")}${list.length > 5 ? ", …" : ""}`);
      }
    }
    if (biomes.length) {
      console.log(`\n## Implemented biomes with kb == null (${biomes.length})`);
      for (const p of biomes) console.log(`- ${p.id} — ${p.title}  (${p.reason})`);
    }
    if (!proposals.length) console.log("\nNothing missing — KB covers the registry and all implemented biomes.");
    else console.log(`\nTo create stubs: node scripts/kbExpand.mjs --write --limit 20${categoryFilter ? ` --category ${categoryFilter}` : ""}`);
    process.exit(0);
  }

  const batch = proposals.slice(0, limit);
  if (!batch.length) {
    console.log("KB auto-expand: nothing missing, nothing written.");
    process.exit(0);
  }
  for (const p of batch) writeFileSync(p.file, p.content);
  console.log(`KB auto-expand: wrote ${batch.length} stub(s):`);
  for (const p of batch) console.log(`  + ${rel(p.file)}  (${p.reason})`);
  if (proposals.length > batch.length) {
    console.log(`  … ${proposals.length - batch.length} more pending — re-run with --limit ${limit}.`);
  }
  try {
    execFileSync("node", [join(__dirname, "syncKbIndex.mjs")], { cwd: REPO_ROOT, stdio: "inherit" });
  } catch { /* sync script prints its own error */ }
  console.log("Next: fill each stub from its wiki link, set biome kb fields, then run npm run kb:check.");
}

main();
