---
id: ui/crafting-modal
title: Crafting modal
kind: ui
wiki: https://minecraft.wiki/w/Crafting
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-05
status: implemented
tags: [ui, modal, crafting, recipes]
related_docs: [mechanics/crafting.md]
---

# Crafting modal

Grid-based crafting overlay driven by `CRAFT_RECIPES`. Pairs with
`mechanics/crafting.md`.

## Vanilla specs

- Crafting-table block opens 3×3 + result arrow + player inventory below;
  inventory 2×2 grid always available (E); recipe book with unlock
  progression; leftovers (buckets) return to inventory.

## Our implementation

| Concern | Where |
|---|---|
| Modal | `src/components/gui/CraftingModal.tsx` |
| Recipe table | `src/game/recipes.ts` (`CRAFT_RECIPES`) |
| Craft execution | `src/components/Game.tsx` (consume inputs, grant output) |

## Deviations / limitations

- Curated recipe subset (17 recipes); 3×3 table grid exists (block 41),
  2×2 in inventory — see `mechanics/crafting.md`.

## Ruleset when modifying

- Add recipes to `CRAFT_RECIPES` only.
- Gate: `npm run kb:check`, `npm run sim:test`.

## Open work

- Shapeless detection parity; mirror/rotation-tolerant matching.
