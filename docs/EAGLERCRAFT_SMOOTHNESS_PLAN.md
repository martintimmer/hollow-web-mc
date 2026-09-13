# Eaglercraft-Smoothness — AUTONOMOUS AGENTIC RUNBOOK (v2)

**Winner in the room:** one AI agent. No other engineers, no human code review, no human QA.
**Therefore:** every step below must be **executable, verifiable, and reversible by the agent itself** — machine-gated success criteria, pixel-diff goldens instead of eyeballs, automatic tuning loops, automatic commits/tags, automatic fallbacks, and an auto-generated report. This document is the agent's runbook, not a plan for a team.

**Scope:** the 9 performance levers (L1–L9 of `PERFORMANCE_INVESTIGATION.md §10b`), targets, phases, and the autonomy machinery around them.

---

## 0. Operating model

```
┌──────────────────────────── ONE AUTONOMOUS CYCLE ────────────────────────────┐
│ 1. READ state      docs/AUTONOMY_STATE.md (phase pointer, open issues)       │
│ 2. INSTRUMENT      ensure this cycle's measurement harness exists & green    │
│ 3. CHANGE          one lever per cycle (or one unit of a lever), small diff  │
│ 4. VERIFY          machine gates: build + sim:test + textureCheck +          │
│                    texture metrics + frame-diff vs goldens + perf gate       │
│ 5. TUNE LOOP       if gate fails: auto-diagnose → auto-tune → repeat (max 5) │
│ 6. RESOLVE         all gates green → commit + tag → update AUDIT + STATE     │
│                    else → revert path (auto) → log root cause, next attempt  │
│ 7. REPORT          autos append to docs/AGENT_LOG.md + auto-fill numbers     │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Hard constraints on the agent (immutable):**
- NEVER edit <game-db> by hand; never delete player worlds.
- NEVER redistribute the asset pack; keep `catalog/textures` internal (see BROWSER_MC_FEASIBILITY.md §Licenses).
- NEVER leave a red gate unreported. A red gate + unreported = failed cycle.
- Every cycle ends with: `git tag perf-<phase>-<n>` + one-line changelog entry + STATE move.
- Time box: max **2 cycles (≈3 h)** per lever; if exceeded → park lever in STATE "blocked: <signal>" and move on (wins are stackable, not all-or-nothing).

**State file** `docs/AUTONOMY_STATE.md` (agent-maintained table):
`Lever | status | gates | numbers before/after | fallback used | next action`.

---

## 1. Phase 0 — Build the self-verification apparatus FIRST (autonomy prerequisite)

Deliverables (each is an executable script; the agent writes them before touching perf code):

| Tool | Path | Purpose |
|---|---|---|
| Perf gate | `scripts/ci-perf.mjs` | boots game (CDP), waits for mesh drain, samples 8 s, asserts: `meshQ=0`, `tris ≤ limit`, `calls ≤ limit`, `render ms ≤ limit`, `heap ≤ limit`. Limits read from `docs/perf-limits.json` (auto-bumped per phase). Exit code = gate. |
| Visual golden harness | `scripts/frame-diff.mjs` + `catalog/frameDiff.mjs` | captures N canonical frames (day@spawn, day@hill, cave, underwater, night@torch, sim pad row) as **PNG** via canvas toDataURL with fixed camera/time, then compares against `snapshots/golden/<name>.png` with per-frame **MAE + per-channel peak** using pngjs. Thresholds in `docs/golden-thresholds.json` (default MAE ≤ 6, peak ≤ 64; per-frame region masks: leave a mask for the HUD-less center region only). |
| Metric logger | `scripts/metrics.mjs` | runs `ci-perf` continuously, appends rows to `docs/perf-metrics.csv`, and auto-updates the tables in `docs/PERFORMANCE_INVESTIGATION.md §10b` + this runbook §12 from the CSV (string-replace script). |
| Full gate | `npm run ci:perf` | `tsc -b && npm run build:textures && npm run build && sim:test && textureCheck && test-worker-meshing && test-bed-and-water && test-sun-and-textures && ci-perf && frame-diff`. One command, machine-gated. |

**Golden baseline capture (first run):** with the CURRENT build: capture the 6 canonical frames + record `perf-limits.json` current numbers ("before" column). Goldens change ONLY with explicit re-baseline (env var `REBASELINE=1`) — the agent may rebaseline only after it has manually reasoned in AGENT_LOG why the change is expected & desired.

---

## 2. What "done" means (machine-checked)

| Metric | Gate command | Before | Target |
|---|---|---|---|
| tris/frame | metrics.csv | 1.16–1.28 M | ≤ 400 K |
| calls/frame | metrics.csv | 373–543 | ≤ 170 |
| render ms (P90) | metrics.csv | 6–9 | ≤ 5 |
| heap steady MB | metrics.csv | 270–430 | ≤ 180 |
| meshQ drain | ci-perf | ~0 | = 0 within 30 s |
| 60 FPS stability (P95 frame ≤ 20 ms) | ci-perf + real-device capture | dips | stable |
| visual regression | frame-diff | baseline | MAE ≤ threshold (changes allowed only in regions declared "expected to change" per lever in this doc, with REBASELINE reasoning record) |
| tests | ci:perf | 71/71 | 71/71, textureCheck PASS |

---

## 3. Phase 1 — L1 Greedy meshing + L3 vertex packing (autonomous cycles)

### 3.1 Change units (each = one cycle)
1. `c01`: build `pushQuad`-based greedy core in `chunkMesh.ts` — merge only axis-aligned full-face runs of identical `(tile, shade)` — no AO special-casing yet. Keep the old per-face path behind a const flag `GREEDY=false` for A/B.
2. `c02`: AO-aware diagonal selection on merged quads + same-tile/same-shade guards.
3. `c03`: vertex packing (`normal u8×3, uv u16×2, color u8×3, pos f32`) with scratch-buffer pool; `toGeomTyped`/`toGeom` parity.
4. `c04`: port to `meshWorker.ts` (worker builds the same buffers; main-thread path used only as debug toggle).
5. `c05`: T-junction fallback (center-vertex triangulation) if `frame-diff` flags seams at merged-fragment borders.

### 3.2 Decision table (auto)
| frame-diff symptom | auto-remedy | then |
|---|---|---|
| black seams on merged lines | enable T-junction fallback (c05) | re-gate |
| AO triangle flip (diagonal lighting visibly wrong) | switch diagonal rule: `ao0+ao2 >= ao1+ao3` tri vs opposite | re-gate |
| artifacts on leaves/water (wrong masks) | exclude `trans`/liquid ids from merge (mask rule) | re-gate |
| perf gate red (mesh too slow) | reduce mask pass overhead (typed arrays over bitmaps) | re-gate |

### 3.3 Gate for the phase (automated)
`ci:perf` + tris ≤ 700 K + frame-diff MAE ≤ threshold for the 6 goldens. If the MAE is dominated by legitimately-changed pixels (merged faces shade identical), regions are pre-masked: the harness evaluates **non-flat regions** with the same tolerance and **flat-planar regions** with a tighter one... if the goldens fail but the diff is strictly benign (e.g., AO diagonal, no black pixels), the agent must write a 3-line justification in AGENT_LOG and REBASELINE=1 — *not silently*.

---

## 4. Phase 2 — L2 light baking + L4 material merge

### 4.1 Change units
1. `c06`: `lightR` side-band (4+4 bit) computed per chunk at gen (pure function; pure & testable in node — unit gates in `sim:test`).
2. `c07`: bake light into vertex colors (corner interpolation rule) + 3×3 border strip exchange (extend `ChunkMeshRequest`).
3. `c08`: delete 25-point-light pool; single held-torch light; move `registerEmitter` (glow) readings into bake path.
4. `c09`: single-material merged chunk geometry (α-test Lambert) + global water buffer (1 draw for all water, positions static per chunk — rebuilt on remesh).
5. `c10`: drop wind-sway OR keep as isolated foliage pass (decision by frame-diff: if muted sway passes visual MAE at day-golden, drop it — 1.5.2 has none anyway).

### 4.2 Light-tuning loop (agent-driven, parametric — NO human judgment)
- Exposed tunables: `LIGHT_GAMMA` (0.6–1.2), `BLOCKLIGHT_SPREAD` (4–8), `SKY_FALLOFF`.
- Auto-tune: for `gamma in [0.7,0.82,0.95,1.05]`: run day-golden → compute region MAE vs baseline; pick gamma minimizing MAE (bounded local search). Log chosen values. This converts "does it look right?" into an optimization.
- Cave-golden targeted: blocklight BFS radius tuned so torch-lit caves are readable: assert **min luminance within 3 of torch ≥ 40/255**.

### 4.3 Gates
`ci:perf` all + calls ≤ 200 + heap ≤ 250 MB + goldens with the tuned parameter record.

---

## 5. Phase 3 — L5 mipmapped atlas + L6 compositing
1. `c11`: generator: 1024², 32-px cells, 1-px replicated pad; re-bake chain (`npm run build:textures`); `textureCheck` must PASS (cell math unchanged).
2. `c12`: `atlas.ts` minFilter `NearestMipmapNearestFilter`, anisotropy 2, mips on; `sampleAtlasColor` offsets updated; celestial texture unaffected (own canvas).
3. `c13`: `preserveDrawingBuffer:false` + snapshot re-render (both encoder paths).
- Auto gate: mip-bleed probe = sample the **pad ring** of each tile against its own edges (MAE 0 expected since padding duplicates edges) + goldens + perf gate (texture-cache usually improves `render ms`).
- Fallback: if bleed shows anywhere → `NearestMipmapNearest`→`LinearMipmapNearest`? No — bleed fix = pad (already); if still bleeding (rare, anisotropic), drop anisotropy to 1 and re-gate.

## 6. Phase 4 — L7 memory/stream + L8 shadow policy
1. `c14`: `keep` 11→9; `mapTiles` LRU (cap 64); scratch pool wired; dropMesh shreds buffers.
2. `c15`: shadows 512² PCF, 500 ms cadence; presets: Balanced=ON, Smooth=OFF; mobile default OFF + contact-shadow decal pass (mobs/chests, 1 draw).
3. Gates: heap ≤ 180 MB (steady), calls ≤ 150 (mobile)/≤ 200 (desktop), golden "day" MAE small (shadow crispness change is an *expected-region* change: the harness masks shadow areas? No — better: goldens re-baselined after c15 — with a full AGENT_LOG reasoning note).
4. If shadow pipeline is broken on a device class (signal from telemetry), auto-fallback: shadows OFF everywhere + blobs ON; open a `docs/AGENT_LOG.md` ticket for the deep pipeline bug.

## 7. Phase 5 — Hardening & auto-report
1. Device sweep via telemetry `worldId`-agnostic markers already in `telemetry-perf.jsonl`: after shipping, look for PULSE `fps<30` clusters (auto-alert = row in STATE).
2. `metrics.mjs` auto-updates `PERFORMANCE_INVESTIGATION.md` numbers (regex parses sections + csv, writes new table).
3. Regenerate `BLOCK_VISUAL_AUDIT.md` (visuals changed → re-run capture harness? Yes: `capture-individual-blocks` is also autonomously runnable; only flag rows are reviewed by the agent via frame-diff against the old audit image?... simpler: rerun + record new signatures; any OK→FLAG transition auto-listed).
4. Final: one consolidated `docs/AGENT_REPORT_EAGLERCRAFT_SMOOTH.md` generated with: numbers before/after (auto), tuning values chosen (auto), gate log (auto), remaining risks (agent-written from STATE).

---

## 8. Autonomy specifics

- **Scheduling:** cycles are resumable; each begins by reading STATE and ends by writing it. A cycle that hits a hard error mid-way is rolled back (git revert) *before* the next cycle starts. Resumed session = reads `AUTONOMY_STATE.md`, `git log --oneline -5`.
- **Self-test anything uncertain:** the agent may write throwaway probes under `scripts/` (e.g., `probe-*.mjs`) — they're cheap; the folder already follows this pattern (prof3, diag-canvas etc.). Kill two-passes rule: probe twice (before & after) before reverting.
- **Repository hygiene:** one commit per completed unit cycle: `feat(perf-LX): <what> — gates: tsc/sim/texture/perf/framediff — <numbers>`. Tag on phase completion. Never `--force` anything; never amend.
- **No dangling breakage:** at end of every cycle `dist` is rebuilt once; server (nginx serve `dist`) picks it up on next load — hot-swap happens automatically.
- **Never do** (as listed in §0) + never delete `snapshots/golden/**` without a REBASELINE record.
- **Lever independence priority order** if time-boxed: L1 (greedy) → L3 (packing) → L4 (material merge) → L2 (light) → L6 (compositing) → L5 (mips) → L7 (memory) → L8 (shadow). Each is independently shippable — partial wins stack.

---

## 9. Complete autonomy checklist (Definition of Done for the RUNBOOK)

- [ ] `npm run ci:perf` = one command that builds, tests, gates perf & visuals (Phase 0)
- [ ] `docs/perf-metrics.csv` + auto-table updater running
- [ ] `docs/AUTONOMY_STATE.md` live (lever statuses)
- [ ] All 9 levers through their gates with numbers recorded (no "looks fine" anywhere)
- [ ] `docs/AGENT_REPORT_EAGLERCRAFT_SMOOTH.md` generated
- [ ] State doc closed with `remaining risks` ≤ 3 items and next actions

*This runbook is the authoritative instruction set: when in doubt, the agent reads §0 and the gate scripts — they are the source of truth, not memory.*
