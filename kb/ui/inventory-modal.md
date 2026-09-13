---
id: ui/inventory-modal
title: Inventory modal
kind: ui
wiki: https://minecraft.wiki/w/Inventory
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-05
status: implemented
tags: [ui, modal, inventory, drag-drop]
related_docs: [mechanics/inventory.md]
---

# Inventory modal

Full-screen inventory overlay: main grid + hotbar + paperdoll, with drag/drop
and shift-click quick-stack. Pairs with `mechanics/inventory.md`.

## Vanilla specs

- Survival: 27 main slots + 9 hotbar + 4 armor + offhand; 2×2 crafting grid
  above the main inventory; recipe book toggle.
- Creative: tabbed item palette + survival-inventory tab; drag-spread places
  one per slot (left-drag) or full stacks (right-drag); shift-click
  quick-moves between inventories.

## Our implementation

| Concern | Where |
|---|---|
| Modal | `src/components/gui/InventoryModal.tsx` |
| Paperdoll | `src/components/gui/PlayerPaperdoll.tsx` |
| Slot model | `src/game/inventory.ts` (`InventoryCore`, `quickStack`, `transferAll`) |
| Open/close | `src/components/Game.tsx` |

## Deviations / limitations

- No armor/equipment sub-slots rendered yet.
- Drag-spread (vanilla) not implemented; shift-click works.

## Ruleset when modifying

- Keep slot ops going through `inventory.ts` helpers.
- Gate: `npm run kb:check`, `npm run sim:test`.

## Open work

- Armor slots; drag-spread.
