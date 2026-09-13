# Bandwidth Investigation Log — 2026-09-04

Question: game used to load a few MB once, then went quiet. Now it streams
continuously (~120 MB/hr observed) and browsers accumulate 180+ MB.

## Method
- Aggregated `nginx access log` (744 req, 23.8 MB, ~12 min window, gzip'd wire bytes).
- Sized API payloads directly (`/api/custom-assets` = 7.7 MB raw, `/api/textures/overrides` = 3.0 MB raw).
- Traced every repeating initiator in `src/` (intervals, focus handlers, boot/join paths).

## Findings (wire bytes, ~12 min window)

| Source | Bytes | Count | Design intent | File |
|---|---|---|---|---|
| `GET /api/textures/overrides` (full) | 8.7 MB (~1 MB each) | 8 | Boot needs overrides before first mesh; editor live-apply without reload | `src/services/textureOverrides.ts:34,78-100`, `server/index.js:1554` |
| `GET /api/textures/overrides?meta=1` | ~0 (304s) | 212 | 3 s version poll so the full 3 MB blob ships ONLY on change — light path works | same |
| `GET /catalog/thumbnails.json` (2.5 MB) | 8.6 MB | 5 | U4: thumbnails out of the JS bundle, fetched once per boot | `src/game/engine/thumbnails.ts:51` |
| `GET /assets/index-[hash].js` | 4.4 MB (~0.9 MB gzip each) | 5 | 6 deploys today → new hash → full re-download each (expected; inflated by dev iteration) | build |
| `GET /api/custom-assets` (7.7 MB raw, Tractor voxel 7.5 MB inside) | 2.2 MB gzip | 4 full + 34×304 | Single-endpoint convenience; refetch on boot + every world join + every window focus (catches uploads from sibling `/build.html` tab) | `server/customAssets.js:50`, `Game.tsx:1177,1633,1636` |
| `POST .../join` (all world_blocks) | 298 KB | 1 | One-shot world load | `server/index.js` join |
| `POST .../state` + `.../animals` + `/api/debug/perf` | ~18 KB | 444 | 2.5 s crash-proof autosave + 2 s perf telemetry (always on, incl. prod) | `Game.tsx:1439`, `telemetry.ts:189` |
| WS `/ws` multiplayer frames | NOT in nginx log | n/a | 20 Hz `PLAYER_MOVE` + broadcasts; per-move SQLite write server-side | `server/index.js:1197`, `renderLoop.ts:277` |

## Why it never goes quiet
1. Per-boot uncacheables: ~4–5 MB every page load (bundle + thumbs + overrides + asset list) — all `no-store` except `/assets/*.js`.
2. 3 s override version poll + focus-triggered 7.7 MB catalog refetch keep firing while playing.
3. 2.5 s autosaves + 2 s telemetry POSTs forever (small each, constant chatter + 60 MB DB rewrites server-side).
4. Multiplayer move traffic invisible to nginx logs — unmeasured blind spot.

## Blind spots / open measurements
- WS bytes (needs client-side counter or tcpdump; Chrome DevTools WS frames per session).
- Whether `?meta=1` 304s carry ETag cost server-side (sql.js full `SELECT key,value` per poll — 3 MB parsed every 3 s per client! CPU, not bandwidth).

## Decisions (user, 2026-09-04)
- Texture live-apply: MANUAL refresh only (pause-menu ↻ button); 3 s poll removed.
- Prod telemetry: SCRAPPED (all perf/error/snapshot uploads gated behind `?telemetry=1`; analyzer still works when opted in).
- Autosave: KEEP 2.5 s always. Multiplayer: KEEP 20 Hz.

## Shipped fixes + measured results
- `/api/custom-assets` list: 7,769,057 → **1,954 bytes** (voxels stripped; fetched per-id on demand via `ensureAssetVoxel`).
- `/api/textures/overrides?meta=1`: full-table SELECT → version-row-only SELECT.
- Nginx: `/catalog/*` → 1 h, `/textures/*` → 1 d, hashed page assets immutable; dev `:DEV` `/assets/` immutable. (The live dev conf mirrors `server/nginx-dev.conf`; deployment paths are private.)
- Bundle 2.39 → 1.89 MB (atlas PNG unbundled to `/textures/terrain_atlas.png`, async boot load).
- `thumbnails.json` now lazy on first inventory open (hotbar keeps procedural thumbs until then).
- Per-boot floor is now roughly: JS ~0.5 MB gzip + atlas PNG ~0.3 MB + overrides ~1 MB gzip (first visit) + asset list ~2 KB — and repeat visits serve nearly all of it from disk cache.
