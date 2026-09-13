---
id: mechanics/inventory
title: Inventory & item stacks
kind: mechanic
wiki: https://minecraft.wiki/w/Inventory
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: partial
tags: [inventory, items, stacking, hotbar, persistence, slots]
related_docs: [ui/inventory-modal.md, ui/hud.md, docs/ARCHITECTURE.md]
spec: {"consts": {"src/game/inventory.ts": {"STACK_MAX": 64, "INV_MAIN_SIZE": 27, "INV_HOTBAR_SIZE": 9}}}
---

# Inventory & item stacks

Player item storage: 27-slot main grid + hotbar, flat 64-max stacks, shared
slot math with chests/crafting/trading. Pure stack ops in `inventory.ts`
mutate the core in place; React mirrors the arrays back into state.

## Vanilla specs

- Survival: 27 main + 9 hotbar + 4 armor + offhand; 2×2 crafting above the
  grid; recipe book. Creative: tabbed palette + survival-inventory tab.
- Stacks: 64 most items, 16 (snowballs/eggs/signs), 1 (tools/weapons/armor/
  buckets-of-axolotl). Shift-click quick-moves; drag-spread places one per
  slot (left) or full stacks (right).
- Death drops everything (unless keepInventory); pickups magnet within range.

## Our implementation

| Concern | Where |
|---|---|
| Slot model + stack math | `src/game/inventory.ts` — `InvSlot {id,count}`, `InventoryCore {hotbar, hotbarCounts, hotbarDamage?, invMain[27], creative}`; `STACK_MAX = 64`, `INV_MAIN_SIZE = 27`, `INV_HOTBAR_SIZE = 10` |
| Pickup / consume / count | `pickUp` (4-phase order below), `consumeSlot` (clamp ≥0, clears id at 0, resets damage), `countItems`, `removeItems` (validates first: all-or-nothing, hotbar first) |
| Bulk ops | `sortSlotArray` (merge to 64 + numeric id sort), `quickStack` (only ids already in dest; fill stacks then empties), `restock` (top-up non-full), `transferAll`, `swapMainToHotbar` (click-swap + `cleared` flag) |
| Modal UI | `src/components/gui/InventoryModal.tsx` (cursor-stack model, shift-click 64-stack assign, creative place-full-stack; `armor`/`offhand`/`trash` slot types exist in code) |
| Hotbar render | `src/components/gui/HUD.tsx` (`hotbar.slice(0, 9)`) |
| Persistence (per-user) | `src/services/api.ts` + `server/index.js` + `server/db.js` |
| Consumers | chests, crafting (`consumeSlot`/`inventoryAddItem`), trading, furnace (all go through these ops) |

### Pickup order (`pickUp`, returns leftover that did NOT fit)

1. Existing hotbar stacks left→right → 2. existing main stacks →
   3. empty hotbar slots → 4. empty main slots. Creative: infinite
   (`pickUp` stores nothing, `consumeSlot`/`removeItems` no-op,
   `countItems` returns a huge number).

## Deviations / limitations

- **Hotbar reconciled to 9 (2026-09-05)**: `INV_HOTBAR_SIZE` was 10 while
  HUD/modal/gameState mirror all render/allocate 9 and the offhand is a
  separate `s.offhandItem` — index 9 was write-only via pickup overflow.
  Fixed to 9 everywhere (constant, `hotbarDamage` mirror); enforced by the
  `consts` spec assertion above.
- **Flat 64 stacks**: no 16-stacks, no unstackables — tools stack to 64.
- No drag-spread; armor/offhand/trash slot types exist in modal code but
  rendered parity is unverified.
- Old revisions claimed "`InvSlot` immutability used by React state" — wrong:
  the module header states all functions **mutate in place** and React
  mirrors arrays back (corrected 2026-09-05).

## Ruleset when modifying

- Keep `STACK_MAX` and slot counts in sync with chest/crafting/trade
  consumers (enforced: slot-shape spec in `kb/blocks/chest.md`).
- New stack ops must preserve the conventions: validate-before-mutate,
  leftover counts returned, creative short-circuits, slot-clearing zeroes
  the id (and damage).
- Do not "fix" the 10-vs-9 mismatch by halves — render, mirror, constant,
  and loops change together (see Open work).
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `npm run kb:check`.

## Open work

- Reconcile hotbar 10-vs-9 (probe index-9 behavior first). DONE 2026-09-05
  (sized to vanilla 9).
- Per-item stack limits (16-stack items, unstackable tools/weapons).
- Drag-spread; armor/offhand/trash render parity; `hotbarDamage`
  (durability) system documentation.
