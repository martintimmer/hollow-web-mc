---
id: blocks/cobweb
title: "Cobweb (density family + web spider)"
kind: block
wiki: https://minecraft.wiki/w/Cobweb
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-07
updated_at: 2026-09-07
status: implemented
tags: [cobweb, web, spider, meshing, cross, entity]
related_docs: [kb/entities/mobs.md, kb/mechanics/block-models.md]
---

# Cobweb (density family + web spider)

Vanilla cobweb plus two custom density variants and a hatchable decorative
web spider (Spider Egg item).

## Vanilla specs

- Model is `models/block/cross.json` (crossed planes, like fire/crops) since
  1.8 — NOT a cube. Transparent/partial, walk-through, stackable to 64.
- Entities inside move at ~25% speed and fall very slowly; webs prevent fall
  damage. Spiders/cave spiders are immune.
- Shears harvest the web itself; a sword breaks it fast (2 durability) and
  drops string; hand drops nothing.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `catalog/completeRegistry.json` → `src/game/blocks.ts` ids 259 (Cobweb, medium), 1207 (Cobweb Sparse, low), 1208 (Cobweb Dense, high), 1209 (Spider Egg item, `spider_eye.png` icon), 1210 (Mug block, tile 865). Added by `catalog/patchCobwebIds.mjs` (idempotent; never hand-edit `blocks.ts`) |
| Shared ids | `src/game/cobweb.ts` (`COBWEB_IDS`, `isCobwebId`, `SPIDER_EGG_ID`) |
| Meshing | `pushCobwebSparse` (single 45° plane, `diag` 0/1 from placement facing) in `src/game/engine/chunkMesh.ts`; medium = `pushCrossBillboard` (fire-style); dense = `pushTropicalBush` at scale 1.0 — all into the trans bucket, dispatched identically by `src/game/engine/chunkMesher.ts` and `src/game/engine/meshWorker.ts` |
| Culling | 259/1207/1208 are `trans: 1`, `solid: 0` and in `THIN_SHAPE_IDS` (non-occluding, walk-through) |
| Web spider | `src/game/entities/webSpider.ts` (`WebSpiderManager`: scene attach/clear, 3D web crawl — top face, side faces, inside the mass — via retarget points; 8 mirrored jointed legs rooted inside the body with pale knee beads, 8 oversized unlit eyes, striped abdomen with crown/rear markings, silk dragline anchor, emissive lift, brighter chitin; age growth 8/100 → 25/100 past 4 days; web deleted + age>4 → falls to ground and remains (pet kept), younger despawns; mug catch/release keeps age/name/owner; cap 32) |
| Egg hook | `src/game/interaction/playerInteraction.ts` `placeBlock` — Spider Egg on a web hatches a spider (consumes egg unless creative), elsewhere toasts a hint; Mug (1210) on an occupied web catches the spider (hand shows it riding the mug), on a free web releases it with age/name/owner kept; elsewhere places the cup |
| Pets | Sign-naming works on web/ground spiders (`tryAnimalInteraction` → naming modal → `confirmPetName`, plate height 0.7 with constant-world-size counter-scaling; entity exposes `.root` alias for the plate); owned spiders join the pets menu (`ownedEntries`, 🕷️ icon, Go-only — Summon hidden and guarded); >4d spider keeps pet status on ground-fall |
| Slowdown | `src/game/physics/playerPhysics.ts` — inside a web: 25% move speed, slow fall (min −1.5), damped climb, no fall damage |
| Tick/clear | `src/game/engine/renderLoop.ts` (paused-aware tick) + `src/game/engine/engineInit.ts` (init/clear on boot and world switch) |
| Tests | `scripts/sim/tests.mts` pins trans-bucket meshing, sparse < medium < dense vertex ordering, sparse diagonals differing by dirs, leg-root geometry, growth curve (full past 4d), day-wrap counting, mug prop + catch/release roundtrip, old-spider grounding vs young despawn, whole-block crawl bounds, pet-list filtering |
| Icons | `catalog/patchCobwebThumbs.mjs` (idempotent): 96×96 inventory icons — web density mirrors the placed block (diagonal band / full sheet / layered sheet) on a dark plate with 1/2/3 density pips (1207/259/1208), procedural speckled egg (1209), repaired spider-eye upscale (1121). Held-item first-person meshes (`createHeldWebMesh`, 1/2/4 planes) match placed density |

## Deviations / limitations

- Sparse/Dense webs and the web spider + egg are custom (vanilla has one web,
  no web spider, no spider egg item).
- Drops: sword/shears drop the web itself (vanilla sword drops string) —
  unchanged pre-existing behavior, kept for all three densities.
- Cobweb hardness follows the generic `trans` fast-break rule (vanilla 4).
- Web spiders are decorative only (no AI aggro, no drops, not persisted —
  hatch day is session-local, so reloads reset growth).
- Day count is session-local (resets to Day 1 on load; internal counter stays
  0-based so moon phases are unchanged).
- Held-item / inventory icons use flat thumbnails (mesher-only change, same as
  other Batch 1 models).

## Ruleset when modifying

- Geometry helpers live in `chunkMesh.ts` once; `chunkMesher.ts` and
  `meshWorker.ts` dispatch must stay identical (worker/main-thread parity).
- `THIN_SHAPE_IDS` + `SPECIAL_IDS` must cover new web ids (burial culling,
  greedy-merge exclusion, `VANILLA_3D_IDS` catalog split).
- New ids go through `catalog/patchCobwebIds.mjs` (registry + `blocks.ts` +
  shapes + thumbnails), then `catalog/exportThumbnails.mjs`.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`,
  `node catalog/textureCheck.mjs`, `node scripts/test-worker-meshing.mjs`,
  `npm run kb:check`.

## Human verification

1. Creative catalog → place Cobweb Sparse / Cobweb / Cobweb Dense side by side:
   single diagonal plane / crossed planes / full 4-plane volume. Place Sparse
   facing ±Z then ±X: the diagonal flips with your direction.
2. Walk into a web: movement slows hard, falling is cushioned, no fall damage.
3. Hold Spider Egg (search "spider"), right-click a web: a small but clearly
   visible spider hatches (unlit red eyes, banded legs joined to the body)
   and crawls the top, sides, and inside of the web; right-click stone: hint
   toast, no consume. Top-center badge reads 📅 Day 1 and counts up each dawn.
4. Hold a Sign, right-click the spider's web: name it → it joins the pets menu
   (🕷️, Go-only, no Summon). Hold the Mug (search "mug"), right-click its web:
   the spider rides the mug in your hand; right-click another web to relocate
   it with age/name kept. Break the web of a >4-day spider: it falls to the
   ground and stays your pet.
