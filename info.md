# Hollowpine Web Minecraft — Project Info

Using Node.js 20, Tailwind CSS v3.4.19, and Vite v7.2.4.

## Overview

Browser-based 3D voxel sandbox (React 19 + Three.js + TypeScript) with an Express/SQLite backend
(server/index.js; a reverse proxy serves the app and forwards /api + /ws).

## Source layout

- `src/` — client
  - `src/components/Game.tsx` — React host: state, persistence, engine boot, all GUI
  - `src/game/` — pure modules (no React): blocks, armor, world consts, noise,
    inventory, recipes, smelting, crafting/smelt rules, villagers, avatars, visuals, sfx
  - `src/services/` — REST API client + multiplayer WebSocket client
- `server/` — Express + sql.js (db.js, index.js); single-file SQLite at data/minecraft.db
  - Tables: users, worlds, player_state, world_blocks (+block_edits_log), world_chests,
    world_animals (merge-by-id pet/wildlife saves), user_preferences (incl. touch_controls),
    spawn_points (per-user/per-world, `/api/spawns`), custom_assets/blueprints, texture_overrides
- `docs/` — ARCHITECTURE.md, FEATURES.md, AUDIT.md, ROADMAP.md (live status)
- `docs/` — ARCHITECTURE.md, FEATURES.md, AUDIT.md, ROADMAP.md (live status)

## Commands

- `node server/index.js` — game API (Express + SQLite; creates `data/minecraft.db` on first run)
- `npm run dev` — Vite dev server on `127.0.0.1:3000` (proxies `/api` + `/ws` to the API)
- `npm run build` — tsc + production build to dist/
- `npm run preview` — serve the built bundle on `127.0.0.1:4173` (proxies `/api` + `/ws`)
- `npm run lint`, `npm run snapshot`/`rollback` (git tags)

## Structure notes

- `src/game/` modules are pure + `ui → game → three/services` one-way imports.
- Inventory/chests/crafting economic state lives in `stateRef` mirrors; server persists
  player_state (pos, hotbar, inventory), world_blocks (edits), world_chests.
- Chunk pipeline: up-to-8 mesh workers (`recommendedWorkerCount`), mesh-first streaming with
  flight budget boost, no-AO fast meshing beyond render−2, keep ring render+2.
- Far field: tiled horizon LOD (`horizonLOD.ts`, 4/8/16 steps, sun/moon-lit) to the camera far
  plane; weather lighting eases over ~10 s (`weatherMachine.ts`).
- Chunk/streaming efficiency report: `node scripts/chunk-efficiency.mjs` (reads `data/telemetry-perf.jsonl`).
