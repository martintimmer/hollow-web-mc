---
id: blocks/prismarine
title: "Prismarine"
kind: block
wiki: https://minecraft.wiki/w/Prismarine
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: absent
tags: [nether_end]
related_docs: []
---

# Prismarine

STUB — auto-created by `scripts/kbExpand.mjs` on 2026-09-05. Fill in from https://minecraft.wiki/w/Prismarine before implementing.

## Vanilla specs

- TODO: hardness, blast resistance, stackability, transparency, light, behavior rules.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `catalog/completeRegistry.json` (1 entry — see table below) |
| Block ids | `src/game/blocks.ts` |
| Meshing | `src/game/engine/chunkMesh.ts` / `src/game/engine/meshWorker.ts` |
| Interaction | `src/components/Game.tsx` |

| id | name | category |
|---|---|---|
| 61 | Prismarine | nether_end |

## Deviations / limitations

- TODO: where we intentionally differ from vanilla.

## Ruleset when modifying

- Edit via `catalog/completeRegistry.json`, never hand-edit `src/game/blocks.ts`.
- Keep worker/main-thread mesher parity (`meshWorker.ts` + `Game.tsx advanceMeshJob`).
- Gates: `npm run kb:check`, `node scripts/test-worker-meshing.mjs`.

## Open work

- Research vanilla specs from the wiki link above; flip `status:` to `partial`/`implemented` once real.
