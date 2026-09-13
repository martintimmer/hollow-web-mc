---
id: entities/paintings
title: Paintings
kind: entity
wiki: https://minecraft.wiki/w/Painting
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: partial
tags: [paintings, decoration, entity, wall, procedural]
related_docs: []
---

# Paintings

Decorative wall-mounted entities from a fixed 12-motif registry with
**procedural canvas art** (no vanilla textures). Placed on a solid face.

## Vanilla specs

- 26 motifs (1.19.3), sizes 1×1 through 4×4; placed on a wall face, random
  motif that fits; drops itself when broken or when its support is gone.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `src/game/entities/paintings.ts` — `PaintingDef {name, w, h, colorA/B/C}`, **`PAINTINGS` = 12 entries** |
| Mesh | `createPaintingMesh(def)` — canvas `w×32` px/block, 3-color geometric art |
| Placement | `PlacedPainting` in the same file; in-world place/break wiring outside this file is **unverified** (only `paintings.ts` references these symbols — confirm the path before touching) |

### Motif table (verbatim)

1×1: Kebab, Aztec, Alban · 2×1: Sunset, Sea, Courbet · 1×2: Wanderer,
Graham · 2×2: Match, Bust, Skull · 4×2: Fighters.

## Deviations / limitations

- 12 curated motifs vs vanilla 26; art is procedural 3-color geometry, not
  the vanilla crystal/pixel paintings; no 4×4 or 4×3 sizes.
- Motif selection (random vs curated) and break-drop behavior are unverified
  — recorded as open work, not as fact.

## Ruleset when modifying

- Add motifs to `PAINTINGS` only; keep `w/h` in whole blocks; art must stay
  procedural (no atlas dependency — that is the point of the canvas path).
- Verify the place/break path first (see Open work) before changing
  `PlacedPainting`, or edits may target dead code.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `npm run kb:check`.

## Open work

- Trace and document the in-world place/break path (symbols are only
  referenced inside `paintings.ts` as of 2026-09-05).
- Full 26-motif set; 4×4/4×3 sizes; drop-itself on support loss.
