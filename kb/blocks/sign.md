---
id: blocks/sign
title: Sign
kind: block
wiki: https://minecraft.wiki/w/Sign
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-27
updated_at: 2026-08-27
status: partial
tags: [sign, text, item-only, pet-naming, wood]
related_docs: [kb/entities/animals.md]
---

# Sign

Vanilla: a non-solid block that displays text (up to 4 lines), placeable on the top
or side of blocks. **In our game signs are item-only** and serve as the **pet-naming
tool** (custom mechanic — hold a sign and interact with an animal).

## Vanilla specs (from wiki)

- **Stats**: hardness 1, blast resistance 1, stackable 16, transparent, luminous no,
  waterloggable yes, flammable no (JE: except crimson/warped), renewable yes;
  axe is the fastest tool (default break 1.5 s, wooden 0.75, stone 0.4, copper 0.3,
  iron 0.25, diamond/netherite 0.2, golden 0.15).
- **Placement**: top of a block (stands on a short post, faces the player in 16
  directions) or side of a block (floats). Sneak to place on interactive blocks.
- **Text**: placing opens an editor GUI — up to 4 lines; dyes set text color; glow
  ink makes text glow; honeycomb waxes (locks editing); right-click a placed sign to
  re-edit. Non-solid, no collision — mobs/items pass through; water/lava flow around.
- **Breaking**: drops itself; also drops when its support block is removed.
- **Fuel**: overworld signs smelt 1 item each (nether signs cannot).
- Crafting: 6 planks (3 top rows) + 1 stick (center) → 3 signs.
- Generated: igloo basements (oak), taiga village houses (spruce).

## Our implementation

| Concern | Where |
|---|---|
| Registry | item-only entries: "Oak Sign" id **1044** etc. (all wood types; hanging signs separate). `isItemOnly` → not placeable |
| Pet-naming tool | `Game.tsx` `tryAnimalInteraction` — holding any `/sign/i` item (not "hanging") and right-click/E on an animal opens the in-game **naming prompt** (`namingAnimal`/`namingInput` overlay, Enter confirms / Esc cancels). Confirm sets `name`, `ownerId`, attaches the floating nameplate, and refreshes the pet list |
| Nameplate | `src/game/entities/animals.ts` `attachNameplate(root, name)` — canvas-text sprite above the animal (depthTest false), re-attached on rename and on restore from `world_animals` |
| Riding gate | free hand (empty slot) + own pet → mount (see `kb/entities/animals.md`) |

## Deviations / limitations

- **Signs are not placeable** — no sign blocks, no text editor GUI, no dyes/glow/wax.
- The naming prompt is a custom overlay (not the vanilla 4-line editor).
- Signs cannot be crafted here yet (no stick/plank sign recipe).

## Ruleset when modifying

- Keep the sign detection regex (`/sign/i` and NOT `/hanging/i`) in sync between the
  pet-interaction path and any future sign item additions.
- Naming opens a modal — it must pause the game (`s.active=false`) and resume on
  Enter/Esc (see `confirmPetName`/`closePetName`).
- If signs become placeable blocks, update this entry + `isItemOnly` semantics.

## Open work

- Placeable signs with a text editor; crafting recipe; nameplate polish.
