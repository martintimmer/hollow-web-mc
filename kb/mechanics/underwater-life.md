---
id: mechanics/underwater-life
title: Underwater life (seabeds, flora depth bands, allocation)
kind: mechanic
wiki: https://minecraft.wiki/w/Ocean
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-06
status: partial
tags: [ocean, underwater, seagrass, kelp, coral, seabed, worldgen, seed-generator]
related_docs: [docs/CLIMATE_HYDROLOGY_PLAN.md]
---

# Underwater life

How the seed builds what lives (and lies) under water: seabed zones by depth band,
flora gated on biome temperature, depth, and frozen state — per vanilla 1.19.3 rules.
All IDs verified against `catalog/completeRegistry.json`.

## Vanilla specs (from the wiki)

- **Seabed:** mostly flat around Y=45 (ours: continental −22 → y≈40). Regular oceans:
  one-block **gravel** layer with **sand/dirt/clay patches** near shallows. Warm and
  lukewarm oceans: **sand** floors (lukewarm keeps dirt/clay/gravel patches; warm has
  none). Frozen oceans: gravel floors, barren.
- **Seagrass (`133`):** all oceans except frozen; also rivers and swamps. Needs ≥2
  water blocks above the floor.
- **Kelp (`131`):** all oceans except frozen, deep-frozen, and warm; ~1/18 chunks;
  denser in cold oceans, taller in deep water (recent versions: any depth).
- **Warm ocean only:** coral reefs (Tube `127`, Brain `128`, Fire `129`, Horn `130`
  blocks) + sea pickles (`132`); **no kelp**. Tall seagrass (`661`) favors deep water.
- **Frozen ocean:** barren — no seagrass, no kelp. Icebergs (snow `51`, packed ice
  `53`, blue ice `200`) instead.
- **Deep ocean:** gravel, taller kelp/seagrass, monuments (not implemented here).
- **Fauna:** fish/dolphins (no entities in our engine yet — squid only).

## Our implementation

| Concern | Current Where | Status & Target |
|---|---|---|
| Seabed zones | `terrainGenerator.ts` → `surfaceAt` | Gravel `12` base + sand `10` / dirt `2` / clay `256` patches; warm (`tm>0.60`) pure sand; frozen gravel (was snow `51`) |
| Flora chooser | `terrainGenerator.ts` → `chooseUnderwaterFlora` (pure, tested) | Frozen→barren; rivers/swamps seagrass-only; warm coral (depth 3–10) + pickles (2–6) + seagrass, never kelp; else kelp (3+), tall seagrass (8+), seagrass (1–12) |
| Coral reefs | `ocean.ts` → `generateCoralReef` | Mound + horns + pickles on top, strictly submerged |
| Kelp forests | `ocean.ts` → `generateKelpForest` | Stalks up toward the surface |
| Seagrass rendering | `meshWorker.ts` + `chunkMesher.ts` | `133`/`661` cross-billboards (were full cubes), untinted per vanilla |
| Shipwrecks | `ocean.ts` → `generateSunkenShipwreck` | Deep water only (unchanged) |

## Deviations / limitations

- No fish/dolphin/turtle entities — squid only; fauna spawning untouched.
- No ocean monuments, ruins, or icebergs yet.
- Tall seagrass renders as two stacked billboards, not a 2-block plant.
- Bone-meal spreading is not implemented.

## Ruleset when modifying

- Keep frozen water barren; keep kelp out of warm water; keep coral/pickles in warm
  shallow water only.
- Flora blocks must sit on the floor with ≥1 water block above (≥2 for seagrass).
- Gate: `npm run kb:check`, `npm run sim:test`.
