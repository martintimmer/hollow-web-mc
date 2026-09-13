---
id: ID_UNDER_PATH
title: "Name"
kind: block            # block | entity | mechanic | ui | system
wiki: https://minecraft.wiki/w/Title
game_version: "1.19.3 (Java)"
fetched_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
status: implemented   # implemented | partial | absent | broken
tags: []
related_docs: []
owner:             # optional: session/area owning active experiments here (e.g. lighting)
experiment:        # optional: one-line note on in-flight uncommitted work + date
spec:              # optional: single-line JSON declaring enforced assertions, e.g.
                   # {"tradeIds": true} or {"slots": {"invMain": 27, "hotbar": 9, "chest": 27}}
                   # or {"consts": {"src/game/x.ts": {"NAME": 1}}}
                   # (known keys: tradeIds, slots, biomesLinked, usesLeftDerived,
                   #  fluidIds, recipeIds, consts, smeltIds — enforced by scripts/kbConform.mjs)
---

# Title

One-line summary of what the thing is.

## Vanilla specs

- The wiki facts that matter for implementation: hardness, blast resistance,
  stackability, light, transparency, behavior rules, data values, sizes.

## Our implementation

| Concern | Where |
|---|---|
| Registry entry | `src/game/blocks.ts` id N (`name`, tiles, flags) |
| Meshing | `src/game/engine/chunkMesh.ts` / `meshWorker.ts` (special-case id) |
| Interaction | `src/components/Game.tsx` (placement/breaking/interact) |
| UI | `src/components/gui/*.tsx` |
| Persistence | `server/index.js` + `server/db.js` |

## Deviations / limitations

- What we do differently vs the wiki (intentionally or not yet implemented).

## Ruleset when modifying

- Invariants to keep (counts, ids, tile pins, worker/main-thread parity, schemas).
- Machine gates to run: `tsc -b`, `npm run build`, `npm run sim:test`,
  `node catalog/textureCheck.mjs`, `node scripts/test-worker-meshing.mjs`, `npm run ci:perf`.

## Open work

- Links into `docs/KNOWN_ISSUES.md` (U-numbers) and other TODOs.

## Human verification (optional, gameplay entries)

- Numbered human test steps (what to open, keys, expected vs actual), mirroring
  the `AGENTS.md` checklist style. Agents never run browser probes; this is how
  the human verifies instead.
