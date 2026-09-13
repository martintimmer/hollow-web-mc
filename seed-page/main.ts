import { createTerrainContext } from "../src/game/terrain/terrainGenerator";
import { TYPES, SEA } from "../src/game/world";
import { javaHash } from "../src/game/noise";
import registry from "../catalog/biome-registry.json";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = (id: string) => document.getElementById(id)!;
const seedEl = $("seed") as HTMLInputElement;
const wtypeEl = $("wtype") as HTMLSelectElement;
const sizeEl = $("size") as HTMLSelectElement;
const biomeCv = $("biome") as HTMLCanvasElement;
const heightCv = $("height") as HTMLCanvasElement;
const cavesCv = $("caves") as HTMLCanvasElement;

// ── seed → seedMix (mirrors setSeed in Game.tsx) ─────────────────────────────
function computeSeed(text: string) {
  const st = String(text ?? "").trim();
  const seed = (/^-?\d+$/.test(st) ? (Number(st) | 0) : javaHash(st)) >>> 0;
  return { seed, seedMix: Math.imul(seed, 2246822519) | 0 };
}

function makeCtx(seedText: string, worldTypeKey: string) {
  const { seedMix } = computeSeed(seedText);
  const world = TYPES[worldTypeKey] || TYPES.standard;
  const heightCache = new Map<string, number>();
  const regionCache = new Map<string, unknown>();
  const ctx = createTerrainContext(() => seedMix, () => world, heightCache, regionCache);
  return { ctx, world };
}

// ── rendering helpers ─────────────────────────────────────────────────────────
const WATER = [63, 118, 228] as const;
const SAND = [226, 217, 176] as const;
const SNOW = [245, 247, 250] as const;

function renderMaps(ctx: ReturnType<typeof createTerrainContext>, n: number) {
  const bc = biomeCv.getContext("2d")!;
  const hc = heightCv.getContext("2d")!;
  const cc = cavesCv.getContext("2d")!;
  biomeCv.width = biomeCv.height = n;
  heightCv.width = heightCv.height = n;
  cavesCv.width = cavesCv.height = n;
  const bImg = bc.createImageData(n, n);
  const hImg = hc.createImageData(n, n);
  const cImg = cc.createImageData(n, n);
  const counts = new Map<string, number>();
  let minH = Infinity, maxH = -Infinity;
  const hs = new Float32Array(n * n);

  const half = n / 2;
  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      const wx = Math.round(px - half), wz = Math.round(py - half);
      const surf = ctx.surfaceAt(wx, wz);
      const h = surf.h;
      const i = py * n + px;
      hs[i] = h;
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;

      const o = i * 4;
      let r: number, g: number, b: number;
      if (h <= SEA) {
        const depth = Math.min(1, (SEA - h) / 24);
        r = WATER[0] * (1 - depth * 0.5); g = WATER[1] * (1 - depth * 0.5); b = WATER[2] * (1 - depth * 0.4);
      } else if (surf.top === 10) {
        [r, g, b] = SAND;
      } else if (surf.top === 51) {
        [r, g, b] = SNOW;
      } else {
        const bio = ctx.getBiome(wx, wz);
        const col = bio.mapCol || [120, 120, 120];
        [r, g, b] = col;
        counts.set(bio.id, (counts.get(bio.id) || 0) + 1);
      }
      bImg.data[o] = r; bImg.data[o + 1] = g; bImg.data[o + 2] = b; bImg.data[o + 3] = 255;

      // ── Subterranean Cave & Mineshaft sampling (X-Ray depth slice) ──────────
      let cR = 18, cG = 22, cB = 28; // Bedrock / deep stone default
      const maxSampleY = Math.min(Math.round(h - 2), 48);
      for (let sy = maxSampleY; sy >= 6; sy -= 2) {
        const mine = ctx.mineshaftAt(wx, sy, wz);
        if (mine.isMine) {
          if (mine.blockId === 572) {
            cR = 230; cG = 230; cB = 245; // Rail track
            break;
          } else if (mine.blockId === 17 || mine.blockId === 1174) {
            cR = 210; cG = 140; cB = 50; // Mine oak support
            break;
          } else if (mine.blockId === 43) {
            cR = 255; cG = 220; cB = 100; // Torch glow
            break;
          } else if (mine.blockId === 45) {
            cR = 255; cG = 180; cB = 20; // Chest
            break;
          } else {
            cR = 135; cG = 105; cB = 75; // Mine corridor air
            break;
          }
        }
        const cave = ctx.caveAt(wx, sy, wz, h);
        if (cave.isCave) {
          if (cave.isLava) {
            cR = 255; cG = 80; cB = 20; // Magma lake
            break;
          } else if (cave.isGrotto) {
            cR = 40; cG = 200; cB = 180; // Sculk / grotto lake
            break;
          } else {
            const depthF = 0.5 + 0.5 * (sy / 48);
            cR = Math.round(90 * depthF); cG = Math.round(120 * depthF); cB = Math.round(160 * depthF); // 3D worm cave
            break;
          }
        }
      }
      cImg.data[o] = cR; cImg.data[o + 1] = cG; cImg.data[o + 2] = cB; cImg.data[o + 3] = 255;
    }
  }

  const span = Math.max(1, maxH - minH);
  for (let i = 0; i < n * n; i++) {
    const t = Math.max(0, Math.min(1, (hs[i] - minH) / span));
    const o = i * 4;
    // sea→land gradient: dark blue → deep green → tan → snow white
    let r: number, g: number, b: number;
    if (hs[i] <= SEA) {
      const d = Math.max(0, Math.min(1, (SEA - hs[i]) / 20));
      r = 20 + 40 * d; g = 30 + 60 * d; b = 90 + 120 * d;
    } else {
      r = 40 + 180 * t; g = 80 + 140 * t; b = 30 + 160 * t;
    }
    hImg.data[o] = r; hImg.data[o + 1] = g; hImg.data[o + 2] = b; hImg.data[o + 3] = 255;
  }

  bc.putImageData(bImg, 0, 0);
  hc.putImageData(hImg, 0, 0);
  cc.putImageData(cImg, 0, 0);

  const total = n * n;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const nonWater = total - countWater(ctx, n);
  renderBars(sorted, total, nonWater);
  renderStats(sorted, total, minH, maxH);
  return counts;
}

function countWater(ctx: ReturnType<typeof createTerrainContext>, n: number) {
  let w = 0;
  const half = n / 2;
  for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
    if (ctx.surfaceAt(Math.round(px - half), Math.round(py - half)).h <= SEA) w++;
  }
  return w;
}

function renderBars(sorted: [string, number][], total: number, nonWater: number) {
  const bars = $("bars");
  bars.innerHTML = "";
  const max = sorted.length ? sorted[0][1] : 1;
  for (const [id, cnt] of sorted.slice(0, 14)) {
    const col = registry.biomes.find((b) => b.id === id)?.mapCol || [120, 120, 120];
    const row = document.createElement("div");
    row.className = "bar";
    const pct = ((cnt / (nonWater || 1)) * 100).toFixed(1);
    row.innerHTML = `<span class="swatch" style="background:rgb(${col.join(",")})"></span>
      <span style="width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${id}</span>
      <div class="track"><div class="fill" style="width:${(cnt / max) * 100}%"></div></div>
      <span class="pct">${pct}%</span>`;
    bars.appendChild(row);
  }
  if (total - nonWater > 0) {
    const row = document.createElement("div");
    row.className = "bar";
    row.innerHTML = `<span class="swatch" style="background:rgb(63,118,228)"></span>
      <span style="width:150px">ocean/water</span>
      <div class="track"><div class="fill" style="width:${((total - nonWater) / total) * 100}%"></div></div>
      <span class="pct">${(((total - nonWater) / total) * 100).toFixed(1)}%</span>`;
    bars.appendChild(row);
  }
}

function renderStats(sorted: [string, number][], total: number, minH: number, maxH: number) {
  $("stats").innerHTML = `
    <span>Sampled <b>${total}</b> blocks (${sizeEl.value}×${sizeEl.value} around spawn)</span>
    <span>Elevation <b>${minH}</b> … <b>${maxH}</b> (span <b>${maxH - minH}</b>m, sea ${SEA})</span>
    <span>Distinct biomes <b>${sorted.length}</b></span>
    <span>Subterranean: <b>3D Caves &amp; Mines Active</b></span>
    <span>Generator: <b>${(TYPES[wtypeEl.value] || TYPES.standard).label}</b></span>`;
}

// ── tables / panels ──────────────────────────────────────────────────────────
function renderPipeline() {
  const list = $("pipeline");
  list.innerHTML = (registry.structure?.pipeline || []).map((s: string) => `<li><code>${s}</code></li>`).join("");
}

function renderPresets() {
  const t = $("presets");
  const head = "<thead><tr><th>key</th><th>label</th><th>scale</th><th>hill</th><th>mtn</th><th>temp</th><th>island</th></tr></thead>";
  const rows = registry.presets.map((p: any) => `<tr><td>${p.key}</td><td>${p.label}</td><td>${p.scale}</td><td>${p.hill}</td><td>${p.mtn}</td><td>${p.temp}</td><td>${p.island}</td></tr>`).join("");
  t.innerHTML = head + "<tbody>" + rows + "</tbody>";
  // populate the select too
  wtypeEl.innerHTML = registry.presets.map((p: any) => `<option value="${p.key}">${p.label}</option>`).join("");
}

const kbHref = (kb: string | null) => (kb ? `<a href="/kb/${kb}" target="_blank">${kb}</a>` : "—");
const wikiHref = (wiki: string | null) => (wiki ? `<a href="${wiki}" target="_blank">wiki</a>` : "—");

function renderBiomes() {
  const cur = registry.biomes.filter((b: any) => b.implemented);
  $("implCount").textContent = `${cur.length} implemented`;
  const t = $("biomes");
  t.innerHTML = "<thead><tr><th>id</th><th>name</th><th>≈vanilla</th><th>tree</th><th>density</th><th>kb</th><th>wiki</th><th>notes</th></tr></thead><tbody>" +
    cur.map((b: any) => `<tr>
      <td>${b.id}</td><td>${b.name}</td><td>${b.vanilla}</td><td>${b.tree || "—"}</td><td>${b.density || 0}</td>
      <td>${kbHref(b.kb)}</td><td>${wikiHref(b.wiki)}</td><td class="note">${b.notes || ""}</td></tr>`).join("") +
    "</tbody>";
}

function renderPlanned() {
  const planned = registry.biomes.filter((b: any) => !b.implemented);
  $("planCount").textContent = `${planned.length} planned`;
  const t = $("planned");
  t.innerHTML = "<thead><tr><th>id</th><th>name</th><th>≈vanilla</th><th>wiki</th><th>notes</th></tr></thead><tbody>" +
    planned.map((b: any) => `<tr>
      <td>${b.id}</td><td>${b.name}</td><td>${b.vanilla}</td><td>${wikiHref(b.wiki)}</td><td class="note">${b.notes || ""}</td></tr>`).join("") +
    "</tbody>";
}

function renderKbProgress(impl: number, kb: number, planned: number) {
  const pct = impl ? Math.round((kb / impl) * 100) : 0;
  $("kbFill").style.width = `${pct}%`;
  $("kbText").textContent = `${kb} / ${impl} implemented biomes have a KB entry`;
  $("kbNote").textContent = `Each new biome gets a kb/terrain/*.md entry (sourced from the wiki) before it lands in the generator — this page tracks that learning progress.`;
}

// ── report to worldgen.db ────────────────────────────────────────────────────
async function reportSeed(counts: Map<string, number>) {
  const { seed, seedMix } = computeSeed(seedEl.value);
  try {
    const res = await fetch("/api/worldgen/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seedText: seedEl.value,
        seedInt: seed,
        worldType: wtypeEl.value,
        sampledPx: Number(sizeEl.value) ** 2,
        biomeCounts: Object.fromEntries(counts)
      })
    });
    await res.json();
    await loadReports();
  } catch (e) {
    $("err").style.display = "";
    $("err").textContent = `report failed: ${e}`;
  }
}

async function loadReports() {
  const el = $("reports");
  try {
    const res = await fetch("/api/worldgen/reports");
    const list = await res.json();
    if (!list.length) { el.textContent = "No reports yet — click “Report this seed”. (worldgen.db is empty.)"; return; }
    el.innerHTML = list.map((r: any) => `<div>${r.createdAt.slice(0, 19)} · seed “${r.seedText}” (${r.seedInt}) · ${r.worldType} · ${r.sampledPx}px · ${Object.keys(r.biomeCounts || {}).length} biomes</div>`).join("");
  } catch (e) {
    el.textContent = `(unavailable: ${e})`;
  }
}

// ── wire up ──────────────────────────────────────────────────────────────────
let currentCtx: ReturnType<typeof createTerrainContext> | null = null;

function generate() {
  try {
    $("err").style.display = "none";
    const n = Number(sizeEl.value);
    const { ctx } = makeCtx(seedEl.value, wtypeEl.value);
    currentCtx = ctx;
    const counts = renderMaps(ctx, n);
    (window as any).__lastCounts = counts;
  } catch (e) {
    $("err").style.display = "";
    $("err").textContent = `generation error: ${e}`;
  }
}

$("gen").addEventListener("click", generate);
$("report").addEventListener("click", () => reportSeed((window as any).__lastCounts || new Map()));

renderPipeline();
renderPresets();
renderBiomes();
renderPlanned();
renderKbProgress(0, 0, 0);
generate();
loadReports();

// Pull the server-backed registry (separate worldgen.db) and reconcile counts.
(async () => {
  try {
    const res = await fetch("/api/worldgen/summary");
    const s = await res.json();
    renderKbProgress(s.implemented, s.kbLearned, s.planned);
    if (s.presets?.length) wtypeEl.innerHTML = s.presets.map((p: any) => `<option value="${p.key}">${p.label}</option>`).join("");
    $("implCount").textContent = `${s.implemented} implemented`;
    $("planCount").textContent = `${s.planned} planned`;
  } catch (e) {
    // server not reachable — bundled JSON registry already rendered
  }
})();

document.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") generate(); });