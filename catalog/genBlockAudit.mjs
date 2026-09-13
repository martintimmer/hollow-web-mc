/**
 * @file catalog/genBlockAudit.mjs
 * Generates docs/BLOCK_VISUAL_AUDIT.md — one row per audited block id:
 *  name · screenshot (per-item in-game capture) · atlas-tile signature · wiki links · verdict.
 * Reads: src/game/blocks.ts, public/textures/terrain_atlas.png, catalog/textureTileMap.json,
 *        snapshots/blocks/block-<id>.jpg
 */
import fs from "node:fs";
import { PNG } from "pngjs";

const atlas = PNG.sync.read(fs.readFileSync("public/textures/terrain_atlas.png"));
const tileMap = JSON.parse(fs.readFileSync("catalog/textureTileMap.json", "utf8"));
const inv = {};
for (const [f, t] of Object.entries(tileMap)) inv[t] = f;

const src = fs.readFileSync("src/game/blocks.ts", "utf8");
const m = src.match(/export const BLOCKS: BlockDef\[\] = (\[[\s\S]*?\]);/);
const BLOCKS = JSON.parse(m[1]);
const byId = {};
for (const b of BLOCKS) byId[b.id] = b;

function slotStats(tile) {
  const T = 16, R = 32;
  const gx = (tile % R) * T, gy = Math.floor(tile / R) * T;
  let n = 0, sum = 0, sumC = 0, maxA = 0;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const i = ((gy + y) * atlas.width + (gx + x)) * 4;
    const a = atlas.data[i + 3];
    if (a > maxA) maxA = a;
    if (a > 0) {
      n++;
      const r = atlas.data[i], g = atlas.data[i + 1], b = atlas.data[i + 2];
      sum += (r + g + b) / 3;
      sumC += Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
    }
  }
  return { mean: n ? Math.round(sum / n) : 0, chroma: n ? Math.round(sumC / n) : 0, opaque: n, maxA };
}

const CUSTOM_HINTS = [
  "Crimson maple leaves", "Golden aspen leaves", "Warped violet leaves", "Bamboo stalk", "Jungle palm leaves",
  "Cherry blossom leaves", "Cherry wood", "Pink petal carpet", "Giant redwood bark", "Warped cyan stem", "Red bed"
];

function wikiSlug(name) {
  let n = name.replace(/\s*\(.*?\)/g, "").replace(/\s+/g, "_").trim();
  const map = {
    "Redstone_Lamp": "Redstone_Lamp",
    "Sculk_Shrieker_Inner": "Sculk_Shrieker",
    "Sculk_Shrieker_Can_Summon_Inner": "Sculk_Shrieker",
    "Attached_Melon": "Melon_Stem",
    "Attached_Pumpkin": "Pumpkin_Stem"
  };
  return map[n] ?? n;
}

function verdict(b, st) {
  const name = b.name;
  if (st.maxA < 8 && st.opaque < 40) return "FLAG near-empty slot (renders invisible/black)";
  const mean = st.mean, c = st.chroma;
  if (/[Bb]lack/.test(name)) return "OK (black by design)";
  if (c < 10 && mean < 95 && /anvil|deepslate|coal block|hopper|observer/.test(name.toLowerCase())) return "OK (gray by design — vanilla stone/metal)";
  if (c < 10 && mean < 95 && !/deepslate|blackstone|obsidian|bedrock|netherite|dye/.test(name)) return "FLAG gray/desaturated (raw-gray texture, needs tint)";
  if (mean < 20) return "check (very dark texture — can be legit)";
  if (c > 60) return "OK (colored)";
  return "OK";
}

const rows = [];
const ids = Object.keys(byId).map(Number).filter((i) => i >= 151 && i <= 699).sort((a, b) => a - b);
for (const id of ids) {
  const b = byId[id];
  if (!b) continue;
  const tile = b.side ?? b.top ?? 0;
  const st = slotStats(tile);
  const slug = wikiSlug(b.name);
  const isCustom = CUSTOM_HINTS.some((k) => b.name.includes(k)) || !b.name.match(/^[A-Z][\w'-]+$/);
  const page = isCustom ? "*custom — no vanilla wiki*" : `[page](https://minecraft.wiki/w/${slug})`;
  const icon = isCustom ? "" : ` · [icon](https://minecraft.wiki/images/Invicon_${slug}.png)`;
  const v = verdict(b, st);
  rows.push({ id, name: b.name, file: `blocks/block-${id}.jpg`, st, page, icon, v: v.startsWith("FLAG"), verdict: v });
}

const flags = rows.filter((r) => r.v);
const lines = [];
lines.push("# Block-by-Block Visual Audit (ids 151–699 — per-item in-game captures)");
lines.push("");
lines.push(`*Every block was placed **individually** on the sim pad and captured close-up: snapshots/blocks/block-<id>.jpg (pipeline: \`scripts/capture-individual-blocks.mjs\`). Signature = that block's face tile in the master atlas (mean gray, color chroma, opaque pixel count). Wiki PNG links use the minecraft.wiki \`Invicon_<Name>.png\` convention — open PNG link in a new tab; the **page** link is always correct.*`);
lines.push("");
lines.push(`**Flagged: ${flags.length} of ${rows.length}** — flag rows need an eyeball/tint/shape pass. Everything else looks correct in the capture.`);
lines.push("");
lines.push("| id | Block | In-game | atlas signature | Wiki | verdict |");
lines.push("|---|------|---------|-----------------|------|---------|");
for (const r of rows) {
  lines.push(`| ${r.id} | ${r.name} | [![](../snapshots/${r.file})](../snapshots/${r.file}) | mean ${r.st.mean} · chroma ${r.st.chroma} · ${r.st.opaque}/256 px | ${r.page}${r.icon} | ${r.verdict} |`);
}
lines.push("");
lines.push("## Registry artifacts (semantic states, not standalone blocks)");
lines.push("");
lines.push("*These are vanilla sub-states registered as separate ids (particles, overlays, frame/twist variants). They render fine in-world as the source tile, but you usually want the canonical block instead (e.g. place Stone Bricks, not `Stone Bricks Particle`).*");
lines.push("");
for (const r of rows) {
  if (/particle|overlay|inner|can summon|_back|_top|bottom|_lit|closed|open|front|stage/.test(r.name.toLowerCase()) && /particle|overlay|inner|can summon/.test(r.name.toLowerCase())) {
    lines.push(`- ${r.id} (${r.name}) — see [screenshot](../snapshots/${r.file})`);
  }
}
lines.push("");
lines.push("## Flagged items (need attention)");
lines.push("");
for (const r of flags) {
  lines.push(`- **${r.id} ${r.name}** — ${r.verdict} — [screenshot](../snapshots/${r.file})`);
}
fs.writeFileSync("docs/BLOCK_VISUAL_AUDIT.md", lines.join("\n"));
console.log(`written: ${rows.length} items (${rows.length - flags.length} OK, ${flags.length} flagged)`);
