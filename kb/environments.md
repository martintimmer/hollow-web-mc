---
id: environments
title: "Environments: prod vs dev/sim"
kind: system
wiki: null
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-27
updated_at: 2026-09-11
status: implemented
tags: [environments, prod, dev, sim, database, gating]
related_docs: []
---

# Environments: prod vs dev/sim

Two COMPLETELY separate environments. They must never share worlds, players, or
world data — not even the database file.

| | Production | Development (Sim Deck) |
|---|---|---|
| Entry | prod host/port (private) | dev host/port (private) |
| Game API | `server/index.js` (prod instance) | `server/index.js` (dev instance, own `WEBMC_DB_PATH`) |
| Database | production SQLite | separate dev SQLite |
| Sim API (admin) | — | `server/sim.js` (own dev DB) |
| Nginx | serves prod build | separate dev proxy config template (`server/nginx-dev.conf`) |

Ports, deploy paths and service commands are intentionally kept in the private ops
runbook (`docs/ops-private/`), not in this public repo.

## Hard rules

1. **Dev-only features are gated by `isSimPort()`** (`src/services/simMode.ts`).
   Anything "Builder Studio / building mode / flat pad" MUST be hidden on prod.
   `isSim()` alone is NOT enough for UI gating — `?sim=1` can match on any port.
2. **Builder Studio button**: `onEnterStudio` is only passed when `isSimPort()`
   (`Game.tsx` PauseMenu/HUD props); `handleEnterStudio` itself early-returns
   unless `isSimPort()`. Prod players can NEVER enter sim mode.
3. **Never point the dev API at the prod DB** — the dev game server must always run
   with its own `WEBMC_DB_PATH`. Prod and dev never share DB files.
4. **Self-heal**: if a prod player somehow has a stale studio state, the boot path
   restores their pre-studio position from `mc_studio_cached_loc`
   (`studioMode.ts`) and clears it.

## Operations

- Start dev API with an explicit dev `WEBMC_DB_PATH` + dev port (see private ops).
- Nginx: use `server/nginx-dev.conf` as the template; the live config location and
  reload commands are deployment-specific.
- `server/sim.js` proxies its admin session check to the game API (prod auth) — auth
  may be shared for the admin gate, but game data never is.

## Auth / users

- Registration: `POST /api/auth/register {username, password}` (hashed).
  Test/QA accounts are provisioned out-of-band — never commit credentials.
- Dev DB starts empty — re-register any needed users there.
