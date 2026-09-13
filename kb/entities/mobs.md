---
id: entities/mobs
title: "Hostile mobs: zombie, creeper, skeleton, spider"
kind: entity
wiki: https://minecraft.wiki/w/Mob
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-27
updated_at: 2026-08-27
status: implemented
tags: [mobs, hostile, zombie, burning, fall-damage, water-walk, climbing]
related_docs: [kb/entities/animals.md]
---

# Hostile mobs

Zombie, creeper, skeleton, spider (`src/game/entities/mobs.ts` + `spawner.ts`).

## Vanilla specs (relevant subset)

- Hostile mobs spawn in darkness; zombies/skeletons burn in direct sunlight and die.
- Fall damage applies to all mobs (survive short drops, die from high ones).
- Mobs path to the player when aggroed; zombies can break doors (not implemented).

## Our implementation

| Concern | Where |
|---|---|
| Entities | `src/game/entities/mobs.ts` (meshes + kinematics); `MobManager.mobs` in `spawner.ts` |
| Spawning | day AND night (peaceful removes all); `spawnHostileMobOf` retries up to 10 offsets when `isSafeSpawn` rejects (no spawning on roofs/trees — uses the same `spawnSafeAt`/`STRUCTURE_IDS` check as animals) |
| Aggro | chase the player within 16 blocks (24 hardcore) in **all non-peaceful modes incl. creative** |
| Water | **mobs WALK ON WATER** — liquids treated as ground in the foot/ground logic (no swimming/sinking) |
| Climbing | 1-block hop always; **2-block hop max** only when the player is above (`player.y > m.y + 2.5`), cooldown 1.2 s — no wall-free teleporting, no climbing trees to the player |
| Burning | daytime + sky exposure (no opaque block in the 8-block column above) → `burnTimer` accrues, fire particles via `onMobBurn` callback; **dies after 10 s** (gray burst via `onMobDeathFx`) |
| Fall damage | `fallStartY` tracked; landing after a **>5-block fall kills** the mob |
| Despawn | >65 m from the player |

## Deviations / limitations

- No wall collision on x/z (mobs walk through blocks except the hop logic).
- No darkness-based spawning (day spawns burn; that's the intended look).
- Zombie door-breaking, creeper explosion damage to terrain, skeleton arrows not
  implemented.

## Ruleset when modifying

- `mobMgr.update` signature: `(dt, player, getBlock, damagePlayer, isNight,
  gameplayMode, surfaceAt, isSafeSpawn, ride, onMobBurn, onMobDeathFx)` — keep
  callbacks optional.
- The 2-block climb cap is intentional (KB requirement): do not raise it.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`,
  `node scripts/probe-mob-burn.mjs`, plus standard gates.

## Open work

- Proper wall collision + pathfinding; creeper terrain damage.
