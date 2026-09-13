---
id: entities/villager
title: Villager (AI, professions, trading)
kind: entity
wiki: https://minecraft.wiki/w/Villager
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: partial
tags: [villager, npc, trading, ai, passive, profession, emerald, restock, breeding, gossip]
related_docs: [ui/villager-trade-modal.md, mechanics/structures.md, docs/ARCHITECTURE.md]
spec: {"tradeIds": true, "usesLeftDerived": true, "consts": {"src/game/villagers.ts": {"TRADES_PER_DAY": 8, "TRADE_RANGE": 2.6, "TRADE_AIM_DIST": 3.0}}}
---

# Villager (AI, professions, trading)

Passive NPC: fixed profession at spawn, 3 emerald trades each, dawn restock,
wander/shelter AI, crosshair+line-of-sight trade gate. Pairs with
`ui/villager-trade-modal.md`; spawned by village generation
(`mechanics/structures.md`).

## Vanilla specs (from wiki)

### Body & spawn

- **Health 20, passive, speed 0.5.** Adult hitbox 1.95 high × 0.6 wide.
- Spawn in villages (plains/snowy/savanna/desert/taiga), igloo basements
  (always unemployed, JE), cured zombie villagers (Weakness + golden apple,
  5 min, nausea particles 10 s, keeps profession, discount if employed), and
  breeding. Never despawns; forgets its village past 32 blocks in ~6 s.
- Drops: nothing (farmer bonemeal 8.5% exception, dispenser armor). Trade XP
  3–6 per trade, 8–11 while willing to breed.

### Behavior

- Socialize: stop and stare at another villager 4–5 s; stare at nearby players
  unless working/farming/fleeing/sheltering.
- Pathfinding: avoids cliffs higher than 3, opens **wooden doors only** (no
  trapdoors, fence gates, iron doors); ladder climbs are accidental and can
  strand them. Flees zombies/husks/drowned/pillagers/vindicators/evokers.
- Schedules: work, wander, gather at bell, return home, sleep at night, heal.

### Professions & job sites (JE)

- 13 professions + nitwit (green coat, never trades) + unemployed. Claim rule:
  nearest unclaimed site in a **48-block sphere**, provisional claim released
  if unreachable in **60 s**, finalized within a **2-block radius** (green
  particles). Traded villagers lock profession; untraded ones may switch.

| Profession | Site block |
|---|---|
| Armorer | Blast furnace |
| Butcher | Smoker |
| Cartographer | Cartography table |
| Cleric | Brewing stand |
| Farmer | Composter |
| Fisherman | Barrel |
| Fletcher | Fletching table |
| Leatherworker | Cauldron |
| Librarian | Lectern |
| Mason | Stonecutter |
| Shepherd | Loom |
| Toolsmith | Smithing table |
| Weaponsmith | Grindstone |

### Trading, restock, reputation

- Restock **up to 2×/day** at the workstation; per-trade `maxUses` + demand
  pricing (price rises with demand).
- Gossip (JE): each trade +4, curing +20 major (permanent, unshareable);
  attacking −1×25, witnessed kill −5×25 (16-block sight box); decay tick every
  20 min. Prices scale with reputation; iron golems turn hostile at −100
  (10 horiz / 8 vert box). Hero of the Village: per-profession gifts.

### Breeding (JE)

- Willing at **≥12 nutrition** (beet/carrot/potato 1, bread 4); breeding
  consumes 12; 5-min cooldown; needs a pathfindable unclaimed bed within
  **48 blocks** or it fails with anger particles. Babies start unemployed.

## Our implementation

| Concern | Where |
|---|---|
| Professions & trades | `src/game/villagers.ts` `PROFESSIONS` — 6 entries (Nomad has 4 trades, rest 3); daily rotation via `rollDailyOffers(prof, tkey, day)` (deterministic subset of 3); `TRADES_PER_DAY = 8` legacy constant kept for tests |
| Trade gate (range+LOS+aim) | `src/game/villagers.ts` `villagerInTradeRange` (`TRADE_RANGE = 2.6`, eye height +1.45, lava id 40 ignored, solid blocks / mobs / animals / villagers in the corridor block) + `isVillagerAimed` (`TRADE_AIM_DIST = 3.0`, center-screen raycast, occluded by nearer blocks) |
| AI step | `src/game/entities/villagerAI.ts` `stepVillagers` — daily rotation when `tradeDay !== s.dayCount` (re-roll + `usesLeft = trades.map(1)` + server save), 0.85-block repulsion, ±135° head clamp, state machine, voxel physics, ground snap |
| Spawn | `src/game/engine/engineInit.ts` village spawn (`profIdx = (i + 2) % PROFESSIONS.length`; 4 skin tones; `vil_${idx}` keys; `tkey = spawn|prof` stable key; `usesLeft` init; persisted ledger applied from `s.tradeLedger`; farmer→nearest pen) |
| Trade execution | `src/components/hooks/useTradingState.ts` `handleExecuteTrade` — offer-position → trade index, uses check ("come back tomorrow"), survival deduct + villager `purse` credit, offer to player, `usesLeft -= 1`, ledger save, `playTrade()`; 500 ms auto-close when `aimedVillager` changes |
| Trade UI | `src/components/gui/VillagerTradeModal.tsx` — today's offers only, purse readout, Traded / Can't afford / `Trade (N left)` states |
| Persistence | `server/db.js` `villager_trades` table + `POST /api/worlds/:id/trades` (join returns `trades` map); `worlds.day_count` column saved/loaded with the world — day never resets on login |
| Mesh | `src/game/villagers.ts` `createVillagerMesh` — head 0.5×0.62×0.5 at y1.45, nose, unibrow, green eyes, 5 hat types (straw/scholar/hood/turban/parka), robe torso, crossed arms, hip-pivot legs, nameplate sprite (`badge + name`, "Aim + E to Trade", y2.15, always on top) |

### Profession table (verbatim from `PROFESSIONS`)

| Profession | Hat | Trades (cost ➔ offer) |
|---|---|---|
| Farmer 🌾 | straw | Dirt ×20 ➔ Emerald ×1; Emerald ×1 ➔ Jack o'Lantern ×2; Emerald ×1 ➔ Hay Bale ×2 |
| Librarian 📚 | scholar | Oak Planks ×16 ➔ Emerald ×1; Emerald ×1 ➔ Bookshelf ×1; Emerald ×1 ➔ Lantern ×2 |
| Weaponsmith ⚒️ | apron | Cobblestone ×16 ➔ Emerald ×1; Emerald ×1 ➔ Stone Bricks ×8; Emerald ×2 ➔ Brick Block ×6 |
| Cleric 🔮 | hood | Dirt ×32 ➔ Emerald ×1; Emerald ×1 ➔ Glowstone ×2; Emerald ×1 ➔ Sea Lantern ×1 |
| Desert Nomad 🌴 (custom) | turban | Sand ×24 ➔ Emerald ×1; Emerald ×1 ➔ Sandstone ×8; Emerald ×2 ➔ Glass ×8; Emerald ×1 ➔ Sand ×6 |
| Tundra Fur ❄️ (custom) | parka | Snow Block ×16 ➔ Emerald ×1; Emerald ×1 ➔ Packed Ice ×4; Emerald ×1 ➔ Ice ×2 |

### AI numbers (from `stepVillagers`)

- Night sheltering when `12500 < time < 23500` and the villager has a house
  (10–20 s at house center); otherwise idle 2–5 s (35%), wander 3–9 blocks
  4–8 s (35%), farmer `tending_cows` at its pen 8–14 s (~12%, farmers with
  pens only — librarians never tend), `visiting_house` 6–11 s.
- Walk speed **1.25**, stair-step 0.55/1.0, gravity `GRAV`, ground snap;
  nearest-villager tracking radius **4.5** (`setNearVillager`), head-look
  radius 5.0 with ±2.356 rad clamp and body-turn past 2.0 rad.

## Deviations / limitations

- **Currency fix (2026-09-05): trades used id 88 = Shroomlight while labels
  said "Emerald" — swapped all 18 `offerId`/`costId` entries to id 893
  (Emerald, `item`, `emerald.png`) in `src/game/villagers.ts`. All other
  trade ids audited the same day: every one resolves to its labeled material
  (Dirt 2, Jack o'lantern 87, Hay bale 49, Oak planks 17, Bookshelf 44,
  Lantern 46, Cobblestone 6, Stone bricks 8, Brick block 50, Glowstone 47,
  Sea lantern 48, Sand 10, Sandstone 11, Glass 37, Snow block 51, Packed
  ice 53, Ice 52). Trade *goods* are a curated custom economy, not vanilla
  parity (vanilla farmers buy wheat/carrots, ours buys dirt) — deliberate.
- 6 professions, not 15: no unemployed/nitwit/babies; Desert Nomad and Tundra
  Fur are custom biome professions with no vanilla counterpart.
- Professions are **fixed at spawn** — no job-site claiming, no workstations,
  no profession switching, no workstation-linked restock.
- Restock is **1×/day at dawn for all trades** (vanilla: up to 2×/day at the
  workstation, per-trade `maxUses` + demand pricing). No price fluctuation.
  Each offer is single-purchase per day; the next day brings a re-rolled subset.
- No gossip/reputation, no iron golems, no breeding/willingness/nutrition, no
  curing, no Hero of the Village, no schedules beyond night sheltering.
- Trade gate is stricter than vanilla right-click: crosshair aim within 2.6 m
  + line-of-sight + corridor-entity check; through a wall E places a block.
- Villager bodies are **in-memory only** (`s.villagers` Map, `vil_${idx}` keys) —
  they respawn on village (re)gen. Trade LEDGERS persist server-side
  (`villager_trades`, keyed by stable `tkey = spawn|profession`) and re-apply
  on spawn; `worlds.day_count` persists the day across logins.
- Nameplate always renders on top (vanilla has none); walk speed 1.25 vs
  vanilla 0.5 attribute (gameplay tuning, feels right at our scale).

## Ruleset when modifying

- `usesLeft` length must equal `prof.trades` length — it is initialized in
  **two** places (engine spawn, `villagerAI.ts` daily rotation), always via
  `prof.trades.map(...)`; change one, change both, or trades index out of bounds.
- `TRADES_PER_DAY` is legacy (kept for the `=== 8` test); the live rule is
  1 use per offer per day with a deterministic daily re-roll.
- `offerId`/`costId` must exist in `BLOCK_MAP` — the modal and toasts resolve
  names through it (this is how the id-88 Shroomlight surfaced, not Emerald).
- Farmer-only logic is keyed by the `FARMER_PROFESSION` constant (pen
  assignment in `Game.tsx`, `tending_cows` in `villagerAI.ts`) — renaming the
  profession breaks both silently.
- `TRADES_PER_DAY` is legacy (kept for the `=== 8` test); the live rule is
  1 use per offer per day with a deterministic daily re-roll (`rollDailyOffers`).
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `npm run kb:check`.
  Human check: 4 m look-away = no button; crosshair ≤2.5 m = Trade button;
  through-wall = nothing; walk away = auto-close toast.

## Open work

- **Decide the id-88 currency question** — DONE 2026-09-05 (Emerald 893).
- Breeding + nutrition/willingness; gossip/reputation + demand pricing;
  workstation claiming with the 48-block/60-s/2-block ruleset.
- Nitwit/unemployed/babies; iron golems (village defense + −100 hostility);
  curing; 2×/day restock; Hero of the Village gifts.
- Persistence decision: currently respawn-on-regen by design — record the
  decision if it becomes permanent.
