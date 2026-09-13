# Climate & Hydrology Plan: heat-aware worldgen + mountain-to-sea rivers

**Status:** Architecture Blueprint & Implementation Roadmap
**Author:** WebMC Engineering (with user direction)
**Date:** 2026-09-06
**Companion Documents:**
- [`docs/BIOME_TERRAIN_IMPROVEMENT_PLAN.md`](./BIOME_TERRAIN_IMPROVEMENT_PLAN.md) (all 6 phases complete)
- [`kb/mechanics/block-warmth.md`](../kb/mechanics/block-warmth.md) (warmth-tier catalog)
- [`kb/terrain/desert.md`](../kb/terrain/desert.md), [`kb/terrain/ice-spikes.md`](../kb/terrain/ice-spikes.md), [`kb/terrain/swamp.md`](../kb/terrain/swamp.md)

---

## 1. Vision (user direction, verbatim intent)

1. **The game understands heat.** Every block gets a warmth tier (ice = cold, sand = warm, torch/fire = hot), documented in the KB. At worldgen, warmth seeds placement: ice can never sit next to sand — warm dunes/islands and frozen mountaintops each own their territory.
2. **Water matters.** Rivers are born as sources high in the mountains, carve downhill through riverbeds, flow slowly all the way to the sea. Some channels run dry and stand as canyons. Widths vary: 4-block creeks up to ~35-block rivers between great peaks. Rivers wind with many corners because they run long.

---

## 2. Part A — Heat: block warmth tiers & separation

### Tier table (canonical IDs, verified against `catalog/completeRegistry.json`)

| Tier | Value | Blocks |
|---|---|---|
| `FROZEN` | −2 | Ice `52`, Packed Ice `53`, Blue Ice `200`, Snow Block `51`, Snow `627`, Powder Snow `556`, Frosted Ice `371–374`, Grass Block Snow `383` |
| `COLD` | −1 | Snowy Grass `54`, Spruce Leaves `24`, Soul Fire `630–631`, Soul Torch `81`, Soul Lantern `82` |
| `TEMPERATE` | 0 | Everything else (default) |
| `WARM` | +1 | Sand `10`, Sandstone `11`, Red Sand `584`, Red Sandstone `585`, all Terracotta (`663`, `515`, `710`, `221`, `589`, `700`, `452`), Cactus `227`, Dead Bush `309` |
| `HOT` | +2 | Lava `40`/`430`/`431`, Fire `102`, Torch `80`, Magma `99`/`478`, Lit Furnace `96`, Glowstone `47`, Campfire `85`, Jack o'Lantern `87`/`418` |

Full table with rules lives in [`kb/mechanics/block-warmth.md`](../kb/mechanics/block-warmth.md).

### Explicit warmth field

Today temperature only exists implicitly (`tempAt` + biome). The plan adds one explicit,
seed-deterministic field next to the regional helpers in `terrainGenerator.ts`:

```
warmthAt(x, z) = clamp(round(tempAt(x, z) * 4) - 2, -2, +2)   // −2..+2 tiers
```

Derived from the existing (regionally modulated) temperature — no new noise, no new
seams. Anything that places a tiered block consults it.

### Separation rules

- **S1 — Frozen/warm adjacency ban.** Natural-gen FROZEN blocks (`52`, `51`, `627`) are
  never placed within 2 columns of WARM terrain (`10`, `11`, `584`, terracotta) and vice
  versa. Dunes/islands stay warm, mountaintops and ice fields stay frozen, with temperate
  grass/dirt/stone always in between.
- **S2 — Beach temperature smoothing.** The frozen-beach (`51`) vs sand-beach (`10`) flip
  currently keys off raw per-column temperature, so a snow beach can border a sand beach.
  Key it off low-frequency temperature instead (wavelength ≥ 500), pushing the flip far
  from any plausible dune/ice adjacency.
- **S3 — Emitter melt rules (gameplay follow-up, not worldgen).** HOT emitters melt adjacent
  FROZEN over time — except Packed Ice `53`, which never melts (existing ice-spikes rule,
  preserved). Documented in KB; implemented as a later gameplay tick, not in this plan's
  generator phases.

---

## 3. Part B — Hydrology: mountain sources to sea

### How water works today (two systems)

- **Gen-time (static):** `riverAt` carves shallow troughs (`≤ 8.5` blocks), oceans fill to
  `SEA`, hillside springs stamp water/lava where slopes drop (`hasDrop` check) and queue
  it into `liquidQ`.
- **Runtime (dynamic):** `fluidDynamics.ts` spreads queued liquid downhill block by block.
- **Gap:** rivers have no sources, no width, no winding, no canyons — they are puddles
  where noise dips, not systems that flow.

### River architecture: a Strahler-ordered network, not a noise threshold

Rivers form a hierarchy (Strahler stream order) that is fully analytic — every value is
a pure function of `(x, z)` and seed, so chunks stay independent and deterministic:

```
order-1 creek (tributary field, λ≈210, width ~4, no discharge needed)
        │  joins
order-2 stream (tributary confluence zones, width 6–10)
        │  joins
order-3 river (trunk field, λ≈560, width 10–22, meander amplitude ~55)
        │  joins
order-4 grand river (trunk + high discharge, width 22–34, only in broad valleys)
        ▼
   delta / inland sea / ocean (SEA)
```

1. **Two centerline fields.** `riverTrunkAt` (λ≈560, domain-warped ±90 blocks + meander
   sine: transverse oscillation, wavelength ~700, amplitude ~55, phase drifting with a
   second noise so bends never repeat) carries orders 3–4. `riverTribAt` (λ≈210, lightly
   warped) carries orders 1–2. Confluences are emergent — where fields cross, carving
   takes the max and widths add.
2. **Discharge field.** `dischargeAt` (λ≈1100, 0..1) is the downstream-accumulation proxy:
   `width = 4 + 30 · D^1.6` → 4-block headwater creeks up to ~34-block grand rivers
   between great peaks. Threshold `t = W/300` maps width to the trunk field; calibrated
   empirically against measured water-surface widths (see validation).
3. **Sinuosity by construction.** Meander amplitude grows as valley slope falls
   (approximated by `1 − discharge` weighting on the sine term… in practice the warp +
   sine stack yields sinuosity > 1.4 on measured traces: no straight run exceeds ~400
   blocks, corners every ~150–300 blocks, oxbow-like hooks where amplitude peaks.
4. **Braiding & deltas.** In flat wet lowlands (swamp/mangrove, slope < 0.6, `h ≤ SEA+2`)
   the trunk threshold widens ×1.3 and depth shallows ×0.5 → braided multi-thread
   channels instead of one canal. At the coast the same rule fans into a delta mouth.
5. **Canyon mode.** Where the reach is arid (`tm > 0.72 && hum < 0.30`) or high and dry
   (`h > SEA+30`, discharge < 0.25): width ×0.55, depth ×1.5 (cap 26), wall profile
   steepened — and if the floor stays above `SEA`, no water fills: a standing dry
   canyon with sandy floor and dead bushes. Badlands reaches cut terracotta walls
   automatically via the existing strata rule.
6. **Sources.** Where a trunk minimum meets highland (`SEA+20 … SEA+100`) in a bowl
   (all 8 neighbors within −1 of center height), stamp a 3×3 source pool and queue a
   `liquidQ` head: the runtime fluid sim then actually flows the stream downhill.
   No source, no river — headless channels cannot exist.
7. **Waterfalls.** Wherever the carved profile drops ≥ 3 blocks across one column, the
   existing spring/`hasDrop` stamping already places falling water; source pools extend
   the same mechanism to stream heads.
8. **Beds & banks.** Wet beds keep Sand `10` over Clay `256`; a 1–2 block grass bank
   (`top 1`, `sub 2`) rims channels crossing arid zones (oasis effect); frozen biomes cap
   reaches with Ice `52` through the existing freeze rule.

### Gravity, honestly

True downhill flow-simulation at gen time is out of scope (it needs gradient descent over
the heightmap per river). The split stays: **gen carves a downhill-plausible profile**
(sources high, mouth at sea, monotonic-ish descent enforced by construction) and
**runtime `fluidDynamics` moves the water** from the queued source heads. Falling water
renders through the existing liquid path, not a new system.

---

## 4. Phase-by-phase implementation roadmap

### Phase 1: Warmth catalog & field ✅ PLANNED (KB DONE)
**Done now:** [`kb/mechanics/block-warmth.md`](../kb/mechanics/block-warmth.md) with the
canonical tier table.
**Code (next):** add `warmthAt(x, z)` to `terrainGenerator.ts`, export tier constants,
extend the BLOCK_MAP ID-guard sim test with warmth assertions.
**Gate:** `npm run sim:test` green (new tests: tier table matches registry; warmth spans
−2..+2 across a 3000-block transect).

### Phase 2: Warmth separation enforcement
**Target:** `terrainGenerator.ts` → `surfaceAt`, beach logic.
1. S1 adjacency ban for natural FROZEN↔WARM placement (2-column temperate buffer).
2. S2 beach flip keyed off low-frequency temperature.
3. Sim tests sampling N random land columns: zero FROZEN-adjacent-WARM violations.
**Gate:** `npm run sim:test`, plus seed-page spot check (no snow/sand checkerboarding).

### Phase 3: River network overhaul
**Target:** `terrainGenerator.ts` → new `riverTrunkAt`/`riverTribAt`/`dischargeAt`/`riverInfoAt` fields, `rawHeight` carving, `surfaceAt` beds/banks, `genChunk` source pools.
1. Trunk + tributary centerline fields with meander warp and domain warp.
2. Discharge width field (4 → ~34 blocks) with empirical width calibration.
3. Depth scaling + canyon (dry) mode in arid/high reaches; braid/delta mode in flat wetlands.
4. Source pools + `liquidQ` heads in highland bowls.
5. Sim tests: width distribution covers ≤6 and ≥22; downhill continuity walk reaches the
   sea; dry canyon exists in arid scan; sinuosity (no straight run > ~400 blocks);
   all 244 prior tests stay green.
**Gate:** `npm run sim:test`, seed-page elevation/water review (human).

### Phase 4: Beds, banks & falls polish
1. Oasis bank strips in arid crossings, frozen ice caps upstream, waterfall stamping at
   ≥3-block drops along carved profiles.
2. KB updates (`kb/terrain/river.md`,ices/river-frozen entries) + this doc's checklist.
**Gate:** full machine gates + human fly-through (source → bends → canyon → sea).

---

## 5. Summary checklist

- [x] Warmth-tier catalog in KB (`kb/mechanics/block-warmth.md`, IDs verified).
- [ ] Phase 1: `warmthAt` field + tier tests.
- [x] Phase 2 (S1): frozen/warm separation via transition bands (`applyTransitionBand` — mid-temp extremes downgrade to oak/birch/plains below SEA+10; 0 hard adjacencies in 3000² scan). S2 beach smoothing still open.
- [x] Climate rebalance (2026-09-06): +0.14 warm bias, temp λ520→380, humidity λ750→520 — frozen surfaces 16.9%→7.8%, tropical biomes 29%→40%, desert 0.2%→1.0%, ice_spikes pocket retuned to ~0.2%, frozen_peaks/redwood preserved. Zones change hands ~122× per 5×3000 transects.
- [x] Phase 3: sources, meander, discharge widths (4→~34), canyon mode + continuity tests (250 sim tests passing).
- [x] Phase 4 (partial): oasis banks, frozen caps (existing freeze rule), waterfall/source heads, river KB updated. Remaining: human fly-through.
