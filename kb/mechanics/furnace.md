---
id: mechanics/furnace
title: Furnace (smelting & fuel)
kind: mechanic
wiki: https://minecraft.wiki/w/Furnace
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: partial
tags: [furnace, smelting, fuel, cooking, block, lit-state]
related_docs: [ui/furnace-modal.md]
spec: {"consts": {"src/game/smelt.ts": {"SMELT_TIME": 10}}, "smeltIds": true}
---

# Furnace (smelting & fuel)

One focused furnace at a time: 3 recipes, wood-only fuel, 10 s/item, lit-block
swap (42 ↔ 96) with emitter light. Ticks **only while the modal is open**;
contents are in-memory and lost on relog.

## Vanilla specs

- 10 s/item at 1×; fuel ratings in items-per-unit (coal/charcoal 8, planks 1.5
  as 2 items per... precisely: coal 8, dried kelp block 20, lava bucket 100,
  blaze rod 12, planks/slabs 1.5→ effectively fractional via 300-tick units).
- Core recipes: ores/raw metals → ingots, sand → glass, cobble → stone,
  food → cooked food; XP per recipe on output withdrawal.
- Lit state per block; blast furnace (ores/armor, 2×) and smoker (food, 2×);
  hoppers feed top (input), sides (fuel), drain bottom.

## Our implementation

| Concern | Where |
|---|---|
| Rules (pure) | `src/game/smelt.ts` — `SMELT_MAP` (3 recipes), `SMELT_TIME = 10`, `FUEL_RATINGS` (wood only), `smeltOutput` / `fuelItems` |
| Tick + lit swap | `src/components/Game.tsx` `tickFurnace` / `setFurnaceLit` — lit block **96** ↔ unlit **42** + `registerEmitter` + remesh + `playFurnace` on change only |
| State | `src/game/state/gameState.ts` — single `furnace {x,y,z}`, `furnaceSlots {input,fuel,output}`, `furnaceProg`, `furnaceFuelLeft` (items-banked), `furnaceLit` |
| Modal | `src/components/gui/FurnaceModal.tsx`; SFX `playFurnace` |
| Persistence | `src/components/hooks/useFurnaceState.ts` — per-furnace localStorage mirror (`mc_furnace_<world>_<x,y,z>`, nether-suffixed), loaded on open, saved on close/slot-mutation/reset |

### Recipe + fuel tables (verbatim, `smelt.ts`)

| Input | → Output |
|---|---|
| Cobblestone 6 | Stone 5 |
| Sand 10 | Glass 37 |
| Ancient Debris 149 | Netherite Scrap 1038 |
| Iron ore 31 / Deepslate 328 / Raw iron 1073 | Iron ingot 953 |
| Gold ore 32 / Deepslate 327 / Raw gold 1072 | Gold ingot 925 |
| Copper ore 268 / Raw copper 1071 | Copper ingot 862 |
| Potato 1055 | Baked potato 1172 |
| Kelp 131 | Dried kelp 348 |

Fuel (items cooked per unit): **coal 817 / charcoal 748 → 8** (vanilla);
planks (17/20/23/26) 2; logs (16/19/22/25), oak door 105, cherry 119 /
crimson 120 / warped 121 / redwood 122 → 3.

### Tick rules (from `tickFurnace`)

- Returns immediately unless the modal is open; if the block is no longer
  42/96 the modal closes (furnace broken/moved).
- No smeltable input → unlit. Fuel bank dry → consume one fuel item into
  `furnaceFuelLeft += fuelItems(id)` (non-fuel id yields 0 → stays dry →
  unlit); output full at 64 → burn pauses, stays lit.
- Progress `furnaceProg += dt / 10`; at 1: consume 1 input, bank −1, output
  +1 (cap 64), grant **0.35 XP flat**.
- Lit swap only on change (no remesh spam); lit 96 glows via the emitter
  point-light pool.

## Deviations / limitations

- **Only 13 recipes** — ores smelt direct to ingots (no raw-stage
  fortune/yield step), no meat cooking (no raw-meat ids in the registry),
  no food beyond potato/kelp.
- **No coal/charcoal/lava fuel** — wood products only (planks 2, logs/door/
  stems 3 vs vanilla coal 8).
- **Single global tick, per-furnace contents**: only the open furnace burns,
  but every furnace keeps its own slots/prog/fuel across modal-close,
  furnace-switching, and relog (localStorage mirror). Passive burn progress
  between the last save and a hard disconnect (≤1 item) is not covered, and
  same-browser only (no server sync — unlike chests).
- XP is a flat 0.35 per item with a dead ternary (`? 0.35 : 0.35`) — no
  per-recipe XP values.
- No blast furnace / smoker / hopper automation.

## Ruleset when modifying

- Edit `SMELT_MAP` / `FUEL_RATINGS` in `smelt.ts` only — ids must resolve in
  the registry (enforced: `smeltIds` spec assertion).
- Keep `SMELT_TIME` documented (enforced: `consts` spec assertion).
- Lit swap must keep block 42/96 + emitter + remesh together or the furnace
  goes dark-but-lit (or lit-but-dark).
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `npm run kb:check`.

## Open work

- Ore→ingot + food recipes; coal/charcoal/lava fuel; per-recipe XP (fix the
  `0.35 : 0.35` ternary).
- Per-block furnace state + server persistence (multi-furnace worlds).
  DONE 2026-09-05 for contents (localStorage mirror); server sync still open.
- Blast furnace / smoker; hopper feed/drain.
