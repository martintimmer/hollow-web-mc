---
id: mechanics/multiplayer
title: Multiplayer & networking
kind: mechanic
wiki:
game_version: ""
fetched_at:
updated_at: 2026-09-03
status: implemented
tags: [multiplayer, network, sync, websocket, server]
related_docs: [docs/ARCHITECTURE.md]
---

# Multiplayer & networking

Client-side multiplayer client that syncs world/player state with the server
over a websocket connection. Single shared authoritative server per environment.

## Vanilla specs

- N/A (vanilla is client/server); our model is one authoritative node server
  with multiple browser clients.

## Our implementation

| Concern | Where |
|---|---|
| Client | `src/services/multiplayer.ts` (`MultiplayerClient`, exported singleton `multiplayer`) |
| Server transport | `server/index.js` (websocket + REST APIs) |
| World/player sync | `src/components/Game.tsx` + `src/services/api.ts` |

## Deviations / limitations

- Not a fully authoritative sim; client predicts movement, server persists state.
- See `docs/ARCHITECTURE.md` for the split between `:PROD` PROD and `:DEV` DEV.

## Ruleset when modifying

- Persisted state must go through `server/db.js`, not client-only.
- Keep env gating (`isSimPort()`) when adding dev-only features.
- Gate: `npm run kb:check`, `npm run sim:test`.

## Open work

- Tighter anti-cheat / conflict resolution.
