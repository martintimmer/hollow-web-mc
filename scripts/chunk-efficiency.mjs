import fs from "fs";

const file = process.argv[2] || "data/telemetry-perf.jsonl";
const sinceArg = process.argv.find((a) => a.startsWith("--since="))?.slice(8);
const worldArg = process.argv.find((a) => a.startsWith("--world="))?.slice(8);
const tailN = Number(process.argv.find((a) => a.startsWith("--tail="))?.slice(7)) || 0;

const pulses = [];
const drops = [];
let stutters = 0;
let stalls = 0;

const lines = fs.readFileSync(file, "utf8").split("\n");
const sel = tailN > 0 ? lines.slice(-tailN) : lines;
for (const line of sel) {
  const t = line.trim();
  if (!t) continue;
  let o;
  try { o = JSON.parse(t); } catch { continue; }
  if (sinceArg && o.ts && o.ts < sinceArg) continue;
  if (o.kind === "PULSE") {
    if (worldArg && (o.ctx || {}).worldId !== worldArg) continue;
    pulses.push(o);
  }
  else if (o.kind === "DROP_END") drops.push(o);
  else if (o.kind === "STUTTER") stutters++;
  else if (o.kind === "CHUNK_OP_STALL") stalls++;
}

const med = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const ctx = (p) => p.ctx || {};

console.log(`file=${file} pulses=${pulses.length} drops=${drops.length} stutters=${stutters} chunkStalls=${stalls}`);
if (!pulses.length) process.exit(0);
console.log(`range=${pulses[0].ts} .. ${pulses[pulses.length - 1].ts}`);

const byRd = new Map();
for (const p of pulses) {
  const rd = ctx(p).renderDist;
  if (!byRd.has(rd)) byRd.set(rd, []);
  byRd.get(rd).push(p);
}
console.log("--- by renderDist: n / fps_med / calls_med / tris_med / meshed_med / heap_med heap_max ---");
for (const rd of [...byRd.keys()].sort((a, b) => (a ?? 99) - (b ?? 99))) {
  const ps = byRd.get(rd);
  console.log(`RD=${rd} n=${ps.length} fps=${med(ps.map((p) => p.fps || 0))} calls=${med(ps.map((p) => ctx(p).renderCalls || 0))} tris=${med(ps.map((p) => ctx(p).triangles || 0))} meshed=${med(ps.map((p) => ctx(p).meshed ?? ctx(p).chunkCount ?? 0))} heap=${med(ps.map((p) => ctx(p).heapMB || 0))}/${Math.max(...ps.map((p) => ctx(p).heapMB || 0))}`);
}

const last = pulses.slice(-30);
const maxQ = Math.max(...last.map((p) => Math.max(ctx(p).genQ || 0, ctx(p).meshQ || 0)));
const heaps = last.map((p) => ctx(p).heapMB || 0).filter((h) => h > 0);
const heapGrowth = heaps.length > 1 ? ((heaps[heaps.length - 1] - heaps[0]) / Math.max(1, (Date.parse(last[last.length - 1].ts) - Date.parse(last[0].ts)) / 60000)) : 0;
const tiles = last.map((p) => ctx(p).horizonTiles).filter((t) => t !== undefined);
const pool = last.map((p) => ctx(p).poolDepth ?? -1).filter((t) => t >= 0);
const busy = last.map((p) => ctx(p).poolBusy ?? -1).filter((t) => t >= 0);
const fb = Math.max(0, ...last.map((p) => ctx(p).fallbacks || 0));
const hms = last.map((p) => ctx(p).horizonMs || 0).filter((h) => h > 0);
console.log(`--- steady state (last ${last.length} pulses): fps_med=${med(last.map((p) => p.fps || 0))} maxQueue=${maxQ} heapMB_per_min=${heapGrowth.toFixed(1)} horizonTiles=${tiles.length ? tiles[tiles.length - 1] : "n/a"} geoms=${ctx(last[last.length - 1]).geoms ?? "n/a"} poolDepth_med=${pool.length ? med(pool) : "n/a"} poolBusy_med=${busy.length ? med(busy) : "n/a"} fallbacks=${fb} horizonMs_med=${hms.length ? med(hms).toFixed(0) + "ms" : "n/a"}`);

const ph = new Map();
for (const d of drops.slice(-60)) for (const k of Object.keys(d.phases || {})) ph.set(k, (ph.get(k) || 0) + 1);
console.log("--- drop phases (last 60): " + [...ph.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" "));
const worst = drops.slice(-60).flatMap((d) => d.chunks || []).sort((a, b) => (b.ms || 0) - (a.ms || 0)).slice(0, 3);
if (worst.length) console.log("--- slowest chunk ops: " + worst.map((c) => `${c.kind}:${c.key}:${Math.round(c.ms)}ms`).join(" "));

const steady = last.filter((p) => (ctx(p).genQ || 0) === 0 && (ctx(p).meshQ || 0) === 0);
const drained = (ctx(last[last.length - 1]).genQ || 0) === 0 && (ctx(last[last.length - 1]).meshQ || 0) === 0;
const renderBound = steady.length > 5 && med(steady.map((p) => p.fps || 0)) < 50 && med(steady.map((p) => ctx(p).renderCalls || 0)) > 1000;
console.log(`--- verdict: streaming=${stalls === 0 && drained ? "EFFICIENT (queues drain, 0 stalls)" : "CHECK QUEUES"} render=${renderBound ? "BOUND (high draw calls at steady state)" : "ok"} memory=${heapGrowth > 20 ? "GROWING FAST" : "ok"} workers=${fb > 0 ? `FALLBACK ACTIVE (${fb} main-thread meshes!)` : "pool ok"}`);
