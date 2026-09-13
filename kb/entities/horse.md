---
id: entities/horse
title: "Horse: 2-block mount, eyes, riding, and persistence"
kind: entity
wiki: https://minecraft.wiki/w/Horse
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-28
updated_at: 2026-08-28
status: implemented
tags: [horse, animals, pets, riding, mount, fast-movement, jumping]
related_docs: [kb/entities/animals.md, docs/KNOWN_ISSUES.md]
---

# Horse

A fast, rideable passive mob with an athletic 2-block height profile, detailed eyes, neck, mane, ears, hooves, tail, and saddle.

## Vanilla specs

- **Hitbox Size**: Adult height 1.6m to 1.9m (ears reaching ~2.0m), width 1.396m.
- **Health**: 15 to 30 HP (avg ~20 HP / 10 hearts).
- **Movement Speed**: 4.83 to 14.57 m/s (approx 1.5x–2x player sprint speed; fastest mount in the game).
- **Jump Height**: 1.0 to 5.5 blocks (clears 1- to 2-block steps easily).
- **Riding & Taming**: Can be saddled and mounted by players; controlled via movement keys and jumped with Space.
- **Drops**: Leather, experience orbs.

## Our implementation

| Concern | Where |
|---|---|
| 3D Model | \`src/game/entities/animals.ts\` (\`createHorseMesh\`: 0.7m x 0.68m x 1.35m torso, 0.95m legs with dark hooves, neck + mane, head with muzzle, upright ears reaching 2.07m, side-mounted eyes with white base + dark pupil, saddle blanket, leather saddle, iron stirrups, animated tail) |
| Kinematics & Animation | `src/game/entities/animals.ts` (`updateAnimalKinematics`: diagonal 4-leg trotting/galloping gait, head tracking/bobbing, dynamic tail swishing) |
| Wandering AI | `src/game/entities/spawner.ts` (Tiered wanderer: default `explorer` ~50–100 blocks/min; forward-committed trajectories; proactive 2-block auto-climb and tangential obstacle deflection) |
| Spawner & Herds | `src/game/entities/spawner.ts` (`MobManager.spawnSingleAnimal`, `spawnInitialWildlife`, periodic replenishment in herds) |
| Ridable Mount System | \`src/components/Game.tsx\` (\`aimAnimal\` mount trigger with empty hand + right-click / E; mount height \`MOUNT_H = 1.62m\`; Shift to dismount) |
| Mount Physics & Speed | \`src/game/entities/spawner.ts\` (\`RIDE_SPEED = 9.8\` m/s; \`Space\` jump \`vy = 8.8\` clearing 2 blocks high) |
| Pet UI & Management | \`src/components/gui/PetModal.tsx\` (icon 🐎, label Horse, name + coordinates, teleport button) |
| Persistence | \`server/index.js\` + \`server/db.js\` (\`world_animals\` table persists horses across session joins) |
| Simulation Studio | \`src/sim/catalog.ts\` (\`entity:horse\`), \`src/sim/items.ts\` (horse icon glyph), \`Game.tsx\` (\`stampEntity\`, \`spawnAnimal\`) |

## Deviations / limitations

- Pet adoption uses Sign right-click naming mechanism consistent with our codebase's pet system.
- Health defaults to standard 20 HP.
- Jump height fixed to an athletic 2-block clear (\`vy = 8.8\`).

## Ruleset when modifying

- Maintain 2-block overall height profile (~2.07m to tips of ears).
- Keep \`MOUNT_H\` synchronized between \`step()\` and the frame loop in \`Game.tsx\` (1.62m).
- Machine gates to run after edits:
  \`\`\`bash
  npx tsc -b
  npm run build
  npm run sim:test
  node catalog/textureCheck.mjs
  node scripts/test-worker-meshing.mjs
  \`\`\`

## Open work

- Horse armor overlays (iron/gold/diamond).
- Dynamic jump charge meter on holding Space.
