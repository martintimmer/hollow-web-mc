---
id: ui/furnace-modal
title: Furnace modal
kind: ui
wiki: https://minecraft.wiki/w/Furnace
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-05
status: implemented
tags: [ui, modal, furnace, smelting]
related_docs: [mechanics/furnace.md]
---

# Furnace modal

Smelting overlay: input / fuel / output slots + progress + lit state. Pairs with
`mechanics/furnace.md`.

## Vanilla specs

- 3 slots (ingredient top, fuel bottom, result right); flame icon = fuel
  remaining, arrow = smelt progress; output grants XP (amount per recipe);
  blast furnace (ores/tools, 2×) and smoker (food, 2×) variants; hoppers
  auto-feed/drain.

## Our implementation

| Concern | Where |
|---|---|
| Modal | `src/components/gui/FurnaceModal.tsx` (`FurnaceUIState`, `FurnaceModalProps`) |
| Tick + lit | `src/components/Game.tsx` (`setFurnaceLit`, `tickFurnace`) |
| Smelt rules | `src/game/smelt.ts` (`SMELT_MAP`, `SMELT_TIME`, `smeltOutput`, `fuelItems`) |

## Deviations / limitations

- No smelting XP; no blast-furnace/smoker variants.

## Ruleset when modifying

- Contents persist per-furnace via the localStorage mirror in
  `useFurnaceState.ts` (see `mechanics/furnace.md`) — every mutation path
  (slot click, reset, close) must save, and open must load; server sync is
  explicitly out of scope for now.
- Gate: `npm run kb:check`, `npm run sim:test`.

## Open work

- XP on smelt; variant furnaces.
