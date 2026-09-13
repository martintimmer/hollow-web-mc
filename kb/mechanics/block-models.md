---
id: mechanics/block-models
title: Block models audit (cubes vs true 3D shapes)
kind: mechanic
wiki: https://minecraft.wiki/w/Block_models
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-06
status: partial
tags: [models, meshing, props, vanilla-parity, seed-generator]
related_docs: [docs/ANIMATION_PLAN.md]
---

# Block models audit

Which blocks render as plain cubes but are real 3D shapes in vanilla — and what
we did about each. All IDs verified against `catalog/completeRegistry.json`.
Geometry system: `PROP_MODELS` + `pushPropModel` in `src/game/engine/chunkMesh.ts`,
dispatched identically by `meshWorker.ts` and the `chunkMesher.ts` fallback
(parity by construction). Tiles always resolve from the block's own
side/top/bottom faces — no new textures were needed.

## Progress tracker

- [x] **Batch 1 (56 models, 2026-09-06):** all entries marked ✅ below.
- [x] **Mug (2026-09-07):** id 1210 open cup (bottom + 4 walls + handle), tile 865.
- [ ] **Batch 2 (deferred):** wall signs + hanging signs (need wall facing),
  coral fans (need waterlogged facing), banners/heads (need entity patterns).
- [ ] **Not planned:** paintings/item frames/armor stands (discrete entities).

## Batch 1 — modeled ✅

| ID(s) | Block | Vanilla shape | Our model (tiles used) |
|---|---|---|---|
| 367 | Flower Pot | tapered pot + soil | pot box 5–11/0–6, soil disc (side→top) |
| 239 | Chain | hanging link column | center bar + 3 alternating link plates |
| 232, 693 | Candle, White Candle | wax pillar + wick | wax 6–10/0–8, wick nub (flame via particles) |
| 85, 86 | Campfire, Soul Campfire | log pile + fire | crossed logs + fire cross (top tile) |
| 228 | Cake | squat 14/16 block, icing top | box 1–15/0–8 (side→top) |
| 572, 557, 342, 146 | Rails ×4 | sleeper bed + twin rails | plate 0–2 + rails at 2–4/13–14 |
| 435 | Lever | base + angled stick + knob | plate + stick + knob (fixed +Z throw) |
| 413 | Iron Bars | thin crossed panels | two full-height panels (no neighbor join yet) |
| 377 | Glass Pane | thin crossed panels | two full-height panels (no neighbor join yet) |
| 236 | Cauldron | 4 walls + floor + water | walls/floor + water plane (tile 11) |
| 454 | Lightning Rod | thin column + head | column 7–9 + head knob |
| 151 | Anvil | base + waist + overhang | 3 stacked boxes |
| 410 | Hopper | rim funnel + neck + spout | 3 stacked boxes |
| 403 | Grindstone | legs + axle + wheel | legs + bar + YZ wheel disc |
| 433 | Lectern | post + stepped desk + book | post + 2 desk steps + book nub |
| 179 | Bell | frame + beam + bell + clapper | posts + beam + body + skirt + nub |
| 639 | Stonecutter | table + saw blade | table slab + vertical blade |
| 264 | Composter | slatted walls + fill | 4 walls + floor + compost (top tile) |
| 353 | Enchanting Table | base + pillar + book | base + pillar + slab + book nub |
| 95 | Conduit | axis cage + core | 3 axis bars + bright core |
| 94 | Beacon | glass shell + core (beam separate) | foot + shell + core (no beam yet) |
| 302 | Daylight Detector | half slab | box 0–6 |
| 665 | Tripwire Hook | wall plate + arm | plate + arm (fixed +Z; no facing stored yet) |
| 606 | Scaffolding | corner posts + platform | 4 posts + top deck |
| 669 | Turtle Egg | 1–3 blobs | 3 static blobs |
| 627 | Snow | low drift pile | box 0–8 |
| 658, 113 | Sugar Cane, Bamboo Stalk | thin columns | column 4–12 |
| 233, 551, 692, 178 | Crops ×4 | full crosses | cross (side tile) |
| 500 | Nether Wart | small cross | cross (side tile) |
| 276, 676 | Fungi ×2 | small cross | cross (side tile) |
| 279, 679 | Roots ×2 | low cross | cross (side tile) |
| 483 | Mangrove Propagule | hanging sprout | small cross |
| 101 | Glow berries | vine cross | cross (side tile) |
| 1139 | Sweet Berries | vine cross | cross (tile 104 — own tiles unmapped, catalog gap) |
| 255, 253 | Chorus Plant/Flower | branching crosses | cross (side tile) |
| 260 | Cocoa | wall pod | small centered box (facing fixed; no facing stored yet) |
| 156, 369 | Azalea ×2 | leafy cross | cross (side tile) |
| 690, 672, 237 | Hanging vines ×3 | strands | foliage-tinted cross (matches 674) |
| 180, 620 | Dripleafs | stem + leaf platform | stem cross + thin leaf box (top tile) |
| 132 | Sea pickle | base + nubs | base + 2 nubs (static 3-cluster) |

## Already shaped before this audit (kept as-is)

Stairs (+porch), slabs, fences, doors `105/106`, trapdoors `107/108`, torch posts
`80/81/84`, lanterns `46/82` (3-box), end rod `92`, amethyst `97`, brewing stand
`103`, portal panel `98/1204`, ladder `140`, beds (entity + `pushBed`), chests
(articulated entities), billboards/decals (flowers, grass, ferns, vines `674`,
lily pads, dead bushes), sugar-cane-style tropical bushes.

## Correctly cubes (vanilla agrees — no work needed)

Shroomlight `88`, glowstone `47`, sea lantern `48`, jack o'lantern `87`,
bookshelf `44`, jukebox `421`, note block `502`, crafting table `41`, loom
`468`, cartography `234`, smithing `622`, fletching `366`, barrel `171`,
furnace `42`, cactus `227`, coral blocks `127–130` + dead variants, mushroom
blocks/stems, obsidian `15`, bedrock `14`.

## Catalog gaps (blocks don't exist — can't model yet)

Stone/oak buttons, pressure plates, cobblestone/stone-brick walls, carpets,
sniffer egg, trial/vault/crafter/copper-bulb family.

## Deviations / limitations

- Lever, tripwire hook, cocoa use a fixed facing (no facing stored in chunk data
  for these IDs yet — same limitation vanilla solves with block states).
- Iron bars / glass panes don't join neighbors yet (static cross; fence-style
  connection is a follow-up).
- Beacon has no beam; candles share one height (no 1–4 stacking yet).
- Sweet berries borrow the glow-berry tile (own tiles exist but unmapped).
- Held-item / inventory icons still render cubes (mesher-only change).

## Ruleset when modifying

- Add models to `PROP_MODELS` only — never fork the two meshers (dispatch exists
  in both, geometry lives in one place).
- New entries need a sim test pinning bounding boxes (see `sim/tests.mts`).
- Burial culling (`all 6 neighbors opaque → skip`) must stay in both dispatchers.
- Gate: `npm run kb:check`, `npm run sim:test`.
