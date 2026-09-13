// kbConform.mjs — KB conformance suite: the game obeys the knowledge base.
//
// Unlike kbCoverage (do our anchors exist?), this asserts game DATA matches
// KB-declared specs. Every failure cites the entry that was violated.
// Read-only. Exit 0 = conformant, 1 = drift (fix code or correct the entry).
//
// Usage: node scripts/kbConform.mjs  (wired as `npm run kb:conform`)
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const failures = [];
const passes = [];
function check(name, ok, detail) {
  if (ok) passes.push(name);
  else failures.push(`${name}\n    ${detail}`);
}

function norm(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// --- sources of truth -------------------------------------------------------
const registry = JSON.parse(readFileSync(join(REPO_ROOT, "catalog", "completeRegistry.json"), "utf8"));
const regList = Array.isArray(registry) ? registry : Object.values(registry);
const byId = new Map(regList.map((r) => [r.id, r.name]));
const biomes = JSON.parse(readFileSync(join(REPO_ROOT, "catalog", "biome-registry.json"), "utf8")).biomes;
const villagersSrc = readFileSync(join(REPO_ROOT, "src/game/villagers.ts"), "utf8");
const gameStateSrc = readFileSync(join(REPO_ROOT, "src/game/state/gameState.ts"), "utf8");
const fluidSrc = readFileSync(join(REPO_ROOT, "src/game/terrain/fluidDynamics.ts"), "utf8");
const squidSrc = readFileSync(join(REPO_ROOT, "src/game/entities/squid.ts"), "utf8");
const recipesSrc = readFileSync(join(REPO_ROOT, "src/game/recipes.ts"), "utf8");

// --- spec declarations ------------------------------------------------------
// Entries declare the assertions they own via single-line JSON frontmatter:
//   spec: {"tradeIds": true, "usesLeftDerived": true}
//   spec: {"slots": {"invMain": 27, "hotbar": 9, "chest": 27}}
// Only declared checks run; unknown keys fail (typo guard). This is what makes
// the KB the spec: enforcement is driven by entries, not by this script.
const KNOWN_ASSERTS = new Set(["tradeIds", "slots", "biomesLinked", "usesLeftDerived", "fluidIds", "recipeIds", "consts", "smeltIds"]);
const declared = []; // [{id, key, params}]
{
  const stack = [join(REPO_ROOT, "kb")];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of readdirSync(dir)) {
      if (e === "_templates") continue;
      const full = join(dir, e);
      const st = statSync(full);
      if (st.isDirectory()) { stack.push(full); continue; }
      if (!e.endsWith(".md")) continue;
      const raw = readFileSync(full, "utf8");
      const idM = raw.match(/^id:\s*(.+)$/m);
      const specM = raw.match(/^spec:\s*(\{.*\})\s*$/m);
      if (!idM || !specM) continue;
      let spec;
      try { spec = JSON.parse(specM[1]); }
      catch { failures.push(`spec: ${idM[1].trim()} has unparseable spec JSON (must be single-line JSON)`); continue; }
      for (const [key, params] of Object.entries(spec)) {
        if (!KNOWN_ASSERTS.has(key)) {
          failures.push(`spec: ${idM[1].trim()} declares unknown assertion "${key}" (known: ${[...KNOWN_ASSERTS].join(", ")})`);
          continue;
        }
        declared.push({ id: idM[1].trim(), key, params });
      }
    }
  }
}
const has = (key) => declared.find((d) => d.key === key);
const declarers = (key) => declared.filter((d) => d.key === key).map((d) => d.id).join(", ");

// --- 1. trade label<->id consistency (declared by kb/entities/villager.md) ----
// Catches the id-88 class bug: a VALID id that is the WRONG material. Both the
// cost side and the offer side of every label must name the resolved material.
if (has("tradeIds")) {
  const tradeRe = /\{\s*offerId:\s*(\d+),\s*offerCount:\s*\d+,\s*costId:\s*(\d+),\s*costCount:\s*\d+,\s*label:\s*"([^"]+)"\s*\}/g;
  const trades = [...villagersSrc.matchAll(tradeRe)];
  check("trades: table non-empty", trades.length > 0, "no trades parsed from src/game/villagers.ts PROFESSIONS");
  const bad = [];
  for (const m of trades) {
    const [, offerId, costId, label] = m;
    const sides = label.split("➔").map((s) => s.trim().replace(/\s*×\s*\d+\s*$/, ""));
    const offerName = byId.get(Number(offerId));
    const costName = byId.get(Number(costId));
    if (!offerName) bad.push(`offerId ${offerId} ("${label}") resolves to nothing`);
    else if (sides[1] && norm(sides[1]) !== norm(offerName)) {
      bad.push(`offer "${label}": label says "${sides[1]}" but id ${offerId} is "${offerName}"`);
    }
    if (!costName) bad.push(`costId ${costId} ("${label}") resolves to nothing`);
    else if (sides[0] && norm(sides[0]) !== norm(costName)) {
      bad.push(`cost "${label}": label says "${sides[0]}" but id ${costId} is "${costName}"`);
    }
  }
  check(
    `trades: ${trades.length} labels match resolved ids (kb/entities/villager.md)`,
    bad.length === 0,
    bad.join("\n    ")
  );
}

// --- 2. slot-shape invariants (declared via spec.slots, e.g. kb/blocks/chest.md)
if (has("slots")) {
  const params = has("slots").params || {};
  const wants = [
    [`invMain: Array.from({ length: ${params.invMain} }`, `inventory ${params.invMain} main slots`],
    [`hotbarCounts: Array.from({ length: ${params.hotbar} }`, `hotbar ${params.hotbar} slots`],
    [`chestSlots: Array.from({ length: ${params.chest} }`, `chest ${params.chest} slots (${params.chest * 2} for large pair)`],
  ];
  if ([params.invMain, params.hotbar, params.chest].some((n) => !Number.isInteger(n))) {
    failures.push(`spec: ${has("slots").id} slots params must be integers {invMain, hotbar, chest}`);
  } else {
  const missing = wants.filter(([snippet]) => !gameStateSrc.includes(snippet));
  check(
    `slots hold as declared by ${has("slots").id}`,
    missing.length === 0,
    missing.map(([, desc]) => `gameState.ts init missing: ${desc}`).join("\n    ")
  );
  }
}

// --- 3. implemented biomes linked to existing entries (declared by kb/terrain/biomes.md)
if (has("biomesLinked")) {
  const bad = [];
  for (const b of biomes) {
    if (!b.implemented) continue;
    if (!b.kb) bad.push(`"${b.id}" implemented but kb == null`);
    else if (!existsSync(join(REPO_ROOT, "kb", b.kb))) bad.push(`"${b.id}" kb "${b.kb}" missing on disk`);
  }
  const n = biomes.filter((b) => b.implemented).length;
  check(
    `biomes: ${n - bad.length}/${n} implemented linked to files on disk`,
    bad.length === 0,
    bad.join("\n    ")
  );
}

// --- 4. usesLeft derives from trades (declared by kb/entities/villager.md ruleset)
// Both initializations must derive from prof.trades — never a hardcoded length.
if (has("usesLeftDerived")) {
  const sites = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (!["node_modules", "dist", ".git"].includes(e)) walk(full);
      } else if (/\.(ts|tsx)$/.test(e)) {
        const raw = readFileSync(full, "utf8");
        for (const m of raw.matchAll(/usesLeft\s*[:=][^\n;]+/g)) {
          sites.push({ file: full.replace(REPO_ROOT + "/", ""), code: m[0].trim() });
        }
      }
    }
  };
  walk(join(REPO_ROOT, "src"));
  const bad = sites.filter((s) => !s.code.includes(".trades.map("));
  check(
    `usesLeft: ${sites.length} init sites all derive from prof.trades`,
    sites.length > 0 && bad.length === 0,
    sites.length === 0
      ? "no usesLeft initializations found — spawner/restock rewritten?"
      : bad.map((s) => `${s.file}: ${s.code}`).join("\n    ")
  );
}

// --- 5. fluid output ids resolve (declared by kb/mechanics/fluid-dynamics.md)
if (has("fluidIds")) {
  const literalIds = new Set();
  for (const m of fluidSrc.matchAll(/setRaw\(\s*s\s*,[^)]*?,\s*(\d+)\s*\)/g)) {
    if (Number(m[1]) > 0) literalIds.add(Number(m[1]));
  }
  for (const m of squidSrc.matchAll(/===\s*(\d+)\b(?!\s*\.\d)/g)) literalIds.add(Number(m[1]));
  const bad = [...literalIds].filter((id) => !byId.has(id));
  check(
    `fluids: ${literalIds.size} literal block ids resolve (${[...literalIds].sort((a, b) => a - b).join(",")})`,
    bad.length === 0,
    `unresolvable ids: ${bad.join(", ")} — renumbered without updating fluidDynamics.ts/squid.ts?`
  );
}

// --- 6. recipe output ids resolve (declared by kb/mechanics/crafting.md ruleset)
// Outputs use named aliases (TABLE = 41) or literals — resolve both, and also
// resolve every key alternative (an ingredient id must exist to be craftable).
if (has("recipeIds")) {
  const aliases = new Map();
  for (const decl of recipesSrc.matchAll(/const\s+([^;]+);/g)) {
    for (const part of decl[1].split(",")) {
      const m = part.trim().match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(\d+)$/);
      if (m) aliases.set(m[1], Number(m[2]));
    }
  }
  const resolveId = (tok) => (/^\d+$/.test(tok) ? Number(tok) : aliases.get(tok));
  const outIds = [...recipesSrc.matchAll(/output:\s*\{\s*id:\s*([A-Z_0-9]+)/g)].map((m) => resolveId(m[1]));
  const keyIds = [...recipesSrc.matchAll(/\[([0-9,\s\]]*)\]/g)]
    .flatMap((m) => m[1].split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0));
  const badOut = outIds.filter((id) => id === undefined || !byId.has(id));
  const badKey = [...new Set(keyIds)].filter((id) => !byId.has(id));
  const recipeCount = (recipesSrc.match(/^\s*\{\s*output:/gm) || []).length;
  check(
    `crafting: ${outIds.length}/${recipeCount} outputs + ${new Set(keyIds).size} key ids resolve in registry`,
    outIds.length === recipeCount && badOut.length === 0 && badKey.length === 0,
    [
      outIds.length !== recipeCount ? `parsed ${outIds.length} of ${recipeCount} outputs` : "",
      badOut.length ? `unresolvable outputs: ${badOut.join(", ")}` : "",
      badKey.length ? `unresolvable ingredient ids: ${badKey.join(", ")}` : "",
    ].filter(Boolean).join("\n    ")
  );
}

// --- 7. named constants hold (declared via spec.consts: {file: {NAME: n}) ----
// Generic engine: first `NAME = <number>` in the target file must equal the
// declared value. Migrates tuning numbers out of prose into enforcement.
for (const d of declared.filter((d) => d.key === "consts")) {
  const mapping = d.params || {};
  for (const [file, values] of Object.entries(mapping)) {
    let raw;
    try { raw = readFileSync(join(REPO_ROOT, file), "utf8"); }
    catch { failures.push(`consts: ${d.id} targets missing file ${file}`); continue; }
    const bad = [];
    for (const [name, want] of Object.entries(values || {})) {
      const m = raw.match(new RegExp(`\\b${name}\\s*=\\s*(-?[\\d.]+)`));
      if (!m) bad.push(`${name}: declaration not found in ${file}`);
      else if (Number(m[1]) !== want) bad.push(`${name}: KB says ${want}, code has ${m[1]} (${file})`);
    }
    check(
      `consts hold as declared by ${d.id} (${file})`,
      bad.length === 0,
      bad.join("\n    ")
    );
  }
}

// --- 8. smelt map + fuel ids resolve (declared by kb/mechanics/furnace.md) --
if (has("smeltIds")) {
  const smeltSrc = readFileSync(join(REPO_ROOT, "src/game/smelt.ts"), "utf8");
  const blocks = [...smeltSrc.matchAll(/(?:SMELT_MAP|FUEL_RATINGS): Record<number, number> = \{([\s\S]*?)\};/g)];
  const ids = new Set();
  for (const b of blocks) for (const m of b[1].matchAll(/(\d+)/g)) ids.add(Number(m[1]));
  const bad = [...ids].filter((id) => !byId.has(id));
  check(
    `smelt: ${ids.size} map/fuel ids resolve in registry`,
    blocks.length === 2 && bad.length === 0,
    blocks.length !== 2
      ? `expected SMELT_MAP + FUEL_RATINGS blocks, parsed ${blocks.length} — smelt.ts restructured?`
      : `unresolvable ids: ${bad.join(", ")}`
  );
}

// --- report -----------------------------------------------------------------
for (const k of KNOWN_ASSERTS) {
  if (!has(k)) console.log(`  info: assertion "${k}" implemented but declared by no entry — orphaned enforcement`);
}
if (declared.length) console.log(`  info: assertions declared by: ${[...new Set(declared.map((d) => d.id))].join(", ")}`);
for (const p of passes) console.log(`  ok: ${p}`);
if (failures.length) {
  console.error(`\nKB CONFORMANCE FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  FAIL: ${f}`);
  process.exit(1);
}
console.log(`\nKB conformance: ${passes.length} checks passed — game matches KB.`);
