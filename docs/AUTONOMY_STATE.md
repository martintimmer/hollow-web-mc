# AUTONOMY STATE — Eaglercraft-Smooth runbook

Authoritative progress file. Each autonomous session reads §Lever table first, then `git log --oneline -6`.

| Lever | Status | Gates (last run) | Before → after | Fallback used | Next action |
|---|---|---|---|---|---|
| L0 apparatus (Phase 0) | ✅ done | gate GREEN (calls 53/tris 110 446/heap 35/meshQ 0/P95 34 ms; frame-diff day 0.00 night 0.77) | goldens baked @ v0.1.118 | — | commit; then c01 |
| L1 greedy meshing | ⚠️ parked (gated ✗) | tris 110 446 → 64 967 (−41%) when on; day MAE 6.28 > 6 | 65k when merged | none | trace checker/gray-slab artifact; hypotheses in notes |
| L4 material merge | ✅ done | ci-perf GREEN (MAE 0.03) · smoke ALL PASS | 4 → 1-2 draws/chunk | — | committed (L4) |
| L3 vertex packing | ✅ done | ci-perf GREEN (day MAE 3.95) | 44→24 B/vtx | — | committed 4996d7e |
| L4 material merge | ✅ done | ci-perf GREEN (MAE 0.03) · smoke ALL PASS | 4 → 1-2 draws/chunk | — | committed (L4) |
| L4 material merge | pending | — | — | — | — |
| L5 mipmap atlas | pending | — | — | — | — |
| L6 compositing | ✅ done | ci-perf GREEN (day MAE 0.02) | preserve off + re-render-before-capture | — | committed |
| L7 memory/stream | ✅ done | ci-perf GREEN · smoke PASS @ keep 9 | keep 11→9 | — | committed |
| L8 shadow policy | ✅ done | ci-perf GREEN (512² PCF) | 1024² PCFSoft → 512² PCF, 500 ms, mobile OFF | — | committed |

## L1 open hypotheses (ordered)
1. Sub-rect UV interpolation vs pushFace 2-value inset (checker alternates per 16px zone).
2. Merged-quad T-junction with unmerged neighbors (gray slab = tall brick region top?).
3. AO corner sign for −Y/diagonal neighbors (contributed ~1.6 MAE of 7.9).
4. Suspect: `visited`/`findIndex` scanning picks zone-cells reused across y (pad at y64/y65 brick pairs).
Next experiment: dump merged quads (pos+uv) for chunk 0,0 pad region & compare with a reference quad; then enable per-zone only.

## Open issues / notes
- perf PULSE telemetry (real-GPU fps) baseline still from Aug-26 build — will re-measure after L1–L6 ship.
- SwiftShader gate uses relaxed frameP95 (160 ms); real-GPU acceptance via telemetry PULSE clusters.
- Golden scene on sim pad (deterministic; clouds off; time locked).
