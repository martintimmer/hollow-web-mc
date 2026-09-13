---
id: entities/dog
title: "Dog / Wolf: fast sprint, long pauses, eyes, collar, and pet adoption"
kind: entity
wiki: https://minecraft.wiki/w/Wolf
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-28
updated_at: 2026-09-05
status: implemented
tags: [dog, wolf, animals, pets, fast-movement, collar, pack]
related_docs: [kb/entities/animals.md, docs/KNOWN_ISSUES.md]
---

# Dog / Wolf

A fast, loyal canine mob smaller than cows (~0.85m tall), featuring expressive 3D eyes, pointed ears, a perky tail, a bright red collar, fast sprint bursts, and long observant pauses.

## Vanilla specs

- **Hitbox Size**: Adult height 0.85m, width 0.6m, length 0.9m.
- **Health**: 8 HP (wild) / 20 HP (tamed).
- **Behavior**: Neutral/Passive pet; looks around curiously with head tilting; wags tail.
- **Speed**: Fast sprint bursts across open terrain; pauses to look around.
- **Features**: Snout/muzzle, black nose, pointed ears, red collar, wagging tail.

## Our implementation

| Concern | Where |
|---|---|
| 3D Model | `src/game/entities/animals.ts` (`createDogMesh`: 0.36m x 0.36m x 0.55m body, chest fluff, red collar, head with snout and nose, pointed ears, expressive eyes with white base + pupil, wagging tail, 4 legs pivoting at hip joints) |
| Kinematics & Animation | `src/game/entities/animals.ts` (`updateAnimalKinematics`: 4-leg trotting/sprinting, dynamic tail wagging/swishing, curious head looking around at other animals and player) |
| Movement Behavior | `src/game/entities/spawner.ts` (Fast sprint bursts `2.0–4.5s` at `3.2 m/s` followed by long observant pauses `4.0–8.0s` looking around and greeting companions) |
| Spawner & Herds | `src/game/entities/spawner.ts` (`MobManager.spawnSingleAnimal`, `spawnInitialWildlife`, periodic replenishment in herds) |
| Pet UI & Management | `src/components/gui/PetModal.tsx` (icon 🐕, label Dog, name + coordinates, teleport button) |
| Persistence | `server/index.js` + `server/db.js` (`world_animals` table persists dogs across session joins) |
| Simulation Studio | `src/sim/catalog.ts` (`entity:dog`), `src/sim/items.ts` (dog pixel glyph), `Game.tsx` (`stampEntity`, `spawnAnimal`) |

## Deviations / limitations

- Pet adoption uses Sign right-click naming mechanism consistent with our codebase's pet system.
- Health defaults to standard 20 HP.
- Dogs are not rideable (chickens & dogs are unmounted companions).

## Ruleset when modifying

- Maintain height profile (~0.85m to top of ears, significantly smaller than ~1.45m cows).
- Keep `ENTITY_CATALOG` length assertions synchronized in `scripts/sim/tests.mts`.
- Machine gates to run after edits:
  ```bash
  npx tsc -b
  npm run build
  npm run sim:test
  node catalog/textureCheck.mjs
  node scripts/test-worker-meshing.mjs
  ```

## Open work

- Taming-flow parity: vanilla tames with bones (sit/follow/teleport-to-owner
  states); ours adopts via sign-naming — the sit/follow/teleport behaviors
  are unimplemented.
- Wild 8 HP vs tamed 20 HP split (currently flat 20 HP).
- Neutral defense AI: vanilla wolves retaliate when harmed and hunt
  sheep/skeletons/foxes; ours has no combat behavior.
- Breeding pups; collar dye colors (currently fixed red).
