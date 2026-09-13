---
id: ui/villager-trade-modal
title: Villager trade modal
kind: ui
wiki: https://minecraft.wiki/w/Trading
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-05
status: implemented
tags: [ui, modal, villager, trading, restock]
related_docs: [entities/villager.md, docs/ARCHITECTURE.md]
---

# Villager trade modal

Trade UI listing a villager's offers with daily restock. Pairs with villager AI.

## Vanilla specs

- Trade GUI: up to 2 wanted-item slots left, result slot right; profession
  title + level badges (Novice→Master); trade arrows show uses remaining;
  sold-out X until restock; price + demand fluctuate with reputation.

## Our implementation

| Concern | Where |
|---|---|
| Modal | `src/components/gui/VillagerTradeModal.tsx` (`VillagerTradeModalProps`, `tradeTick`, `onExecuteTrade`) |
| Trade data | `src/game/entities/villagerAI.ts` (`prof.trades`, `TRADES_PER_DAY`, uses-left restock) |
| Restock | dawn restock loop in `villagerAI.ts` (`v.usesLeft = v.prof.trades.map(() => TRADES_PER_DAY)`) |

## Deviations / limitations

- Trade set is per-profession curated; no XP/price fluctuation yet.

## Ruleset when modifying

- Keep `TRADES_PER_DAY` and restock in `villagerAI.ts` in sync with modal.
- Gate: `npm run kb:check`, `npm run sim:test`.

## Open work

- Price fluctuation / reputation.
