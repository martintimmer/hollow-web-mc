---
id: mechanics/crafting
title: Crafting (2x2 / 3x3 recipe table)
kind: mechanic
wiki: https://minecraft.wiki/w/Crafting
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: implemented
tags: [crafting, recipes, grid, survival, shapeless, shaped]
related_docs: [ui/crafting-modal.md, ui/inventory-modal.md]
spec: {"recipeIds": true}
---

# Crafting (2x2 / 3x3 recipe table)

Shaped-only recipe matching over a shared grid: **2×2 in the inventory
modal, 3×3 in the crafting-table modal** (block id 41 opens it). Position in
the grid does not matter; dimensions must match exactly.

## Vanilla specs

- Inventory grid is 2×2; crafting-table block opens 3×3.
- Recipes are **shaped** (pattern matters, mirrors/rotations usually accepted)
  or **shapeless** (ingredients only); output respects stack size; leftover
  containers (buckets) return to inventory.
- Recipe book tracks discovered recipes.

## Our implementation

| Concern | Where |
|---|---|
| Recipe table | `src/game/recipes.ts` — `CraftCell {id,count}`, `CraftRecipe {output, pattern, key}` (`' '`/`'.'` = empty, `key` char → accepted block ids); **`CRAFT_RECIPES` = 17 entries** |
| Matching | `matchCrafting(cells, gridWidth)` — `trimGrid` strips the empty border, then trimmed w/h must **exactly** equal pattern dims and every char must match (`key[char].includes(cell.id)`) |
| Table modal (3×3) | `src/components/gui/CraftingModal.tsx` — 9 cells + result + Reset; opened by `openCraftTable()` (`useCraftingState.ts`: `setCraftW(3)`, clear grid, exit pointer lock); trigger: right-click/E on block **41** (`interaction/playerInteraction.ts`) |
| Inventory grid (2×2) | `src/components/gui/InventoryModal.tsx` — 4 cells sharing the same `craftGrid`/`craftResult` state; default `craftW = 2`; built-in recipe-book drawer (`CRAFT_RECIPES.map`) |
| Consume/grant | `useCraftingState.ts` — cell click returns stack or pulls the full selected hotbar stack (`consumeSlot`); result click consumes **1 of each non-empty cell**, grants output, `playCraft()` + toast; Reset returns all cells |

### Recipe list (68 entries: 17 original + 51 Phase-B, `recipes.ts`)

Utilities: sticks, torch ×4, furnace, bow, arrows ×4. Full tool ladder
(sword/pickaxe/axe/shovel/hoe × plank/cobble/iron/gold/diamond, axe+hoe in
both mirror orientations — the matcher is placement-agnostic but NOT
mirror-tolerant). Armor: leather/iron/diamond 4-piece. Originals: planks,
table, stone-brick, sandstone, stone, door, chest, netherite line, anchor.

## Deviations / limitations

- **Shaped-only, placement-agnostic**: no shapeless matching (position
  invariance comes solely from `trimGrid`); no mirror/rotation variants —
  each orientation needs its own entry.
- Curated 17-recipe subset (no tools/weapons/armor/food recipes yet); no
  recipe-book unlock progression (the drawer lists everything); no leftover
  containers.
- `craftW` reset on modal close is unverified — closing the 3×3 table may
  leave width state behind for the 2×2 grid (flagged, not confirmed).

## Ruleset when modifying

- Add recipes to `CRAFT_RECIPES` only; pattern rows must be equal length;
  key chars must cover every non-empty pattern char or the recipe can never
  match (and every key char should appear in the pattern or it is dead).
- **No all-empty pattern border**: `trimGrid` strips the player's empty
  border, so a pattern row/column that is empty in EVERY row can never match
  trimmed dims (this silently killed all 20 axe/hoe recipes on 2026-09-05 —
  fixed to 2-wide). Every border row/column needs a filled cell somewhere.
- Input consumption must go through `inventory.ts` ops (`consumeSlot`,
  `inventoryAddItem`) to keep stacks valid — never mutate counts inline.
- Output ids must exist in `BLOCK_MAP` (same class of bug as the villager
  id-88 currency incident).
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `npm run kb:check`.

## Open work

- Confirm `craftW` reset behavior after closing the table modal.
- Shapeless matching; mirror/rotation-tolerant shaped matching.
- Tool/weapon/armor/food recipes; recipe-book progression; leftover
  containers (buckets).
