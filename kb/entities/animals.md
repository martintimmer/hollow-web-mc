---
id: entities/animals
title: "Animals: pets, persistence, riding"
kind: entity
wiki: https://minecraft.wiki/w/Mob
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-27
updated_at: 2026-08-27
status: implemented
tags: [animals, pets, persistence, riding, naming, sign]
related_docs: [docs/KNOWN_ISSUES.md]
---

# Animals: pets, persistence, riding

Cows, sheep, pigs, chickens, horses, dogs. Custom pet system on top of the vanilla mob concept
(vanilla has no pet-taming for these — our "sign = adopt" mechanic is custom).

## Vanilla specs (relevant subset)

- Mobs wander idly; no taming/riding for cows/sheep/pigs in vanilla Java Edition
  (riding is a custom feature here, imitating horse-riding).
- Horses are tall (2 blocks), fast mounts with athletic jumps and saddles.
- Wolves/Dogs are agile canines with pointed ears, snout, collar, wagging tails, fast bursts and observant pauses.
- Animals persist per world in vanilla saves — here they persist via our own
  `world_animals` table.

## Our implementation

| Concern | Where |
|---|---|
| Entities | `src/game/entities/animals.ts` (meshes: cow, sheep, pig, chicken, horse, dog; `AnimalEntity` with `name`/`sex`/`ownerId`/`ridden`), `src/game/entities/spawner.ts` (`MobManager`) |
| Sex | random `male`/`female` at spawn (`spawner.ts`), shown as ♂/♀ in the pet list |
| Movement | Tiered wandering AI (`wanderTier`: `calm` 5–25 blocks/min, `roamer` 25–50 blocks/min, `explorer` 50–100 blocks/min for horses and adventurous animals); **smooth trajectory**: committed forward paths with gentle natural curvature; **social pattern**: approaches nearby animals to greet/graze then disperses into open pasture; **1-block auto-climb**: walks seamlessly right over 1-block elevation differences as if flat terrain; **2-block obstacle bump pause**: 2-block walls, cliffs, and fences trigger a 1–2s pause to look around before turning; **head tracking**: looks around at other animals and the player while idle; **riding head**: head actively turns in the direction of travel when ridden; cliff-edge sense refuses drops >4 into air/water |
| Naming/adopt | hold a **Sign item** (registry name matches `/sign/i`, not "hanging") → right-click an animal (`aimAnimal` aim+range test in `Game.tsx`) → `window.prompt` name → sets `name` + `ownerId` = `currentUserId` |
| Riding | free hand (empty hotbar slot) + right-click/E own pet (cow/sheep/pig/horse) → `s.riddenAnimal`; WASD steers via `ride {fx,fz,yaw}` passed to `mobMgr.update`; animal yaw = camera yaw **+π** (meshes face +Z, camera faces −Z); legs animate via `updateAnimalKinematics`; **Shift = dismount** (places player beside the animal, ground-snapped). Mount heights: horse 1.62, cow 1.35, sheep 1.32, pig 1.18. Ride speeds: horse 9.8, cow 7.0, sheep 6.6, pig 6.2 m/s |
| Persistence | server table `world_animals` (`server/db.js`); join returns `animals` (`server/index.js`); batch replace `POST /api/worlds/:id/animals`; client `apiSaveAnimals` runs with the 2.5s autosave + unload; boot restores persisted animals instead of procedural wildlife when any exist (`Game.tsx` boot, `s.pendingAnimals`) |
| Pet menu | HUD top-left "🐾 My Pets" button (prod only) → `src/components/gui/PetModal.tsx`: per pet — animal icon, name + sex, world coords, **➜ Go** teleport (`s.teleportToFn`, ground-snapped) |
| Player physics while riding | `step()` early-returns to a mount-grip branch (skips movement/gravity; syncs camera to player yaw/pitch) |

## Deviations / limitations

- Riding is custom (vanilla has no rideable cow/sheep/pig); chickens are NOT rideable.
- Naming uses `window.prompt` (no in-game rename UI); names ≤ 24 chars.
- Pets are keyed to `currentUserId`; guest sessions share the `guest` owner.
- Persisted animals restore at exact saved x/y/z (a caged animal stays caged);
  culled (>75 m) or killed animals disappear on the next batch save.
- Sim (:DEV) does not persist animals (sandbox).

## Ruleset when modifying

- Keep `MobManager.update` signature stable — it takes `ride` as the last param;
  worker-free (animals are main-thread only).
- Persistence is batch-replace: never send partial lists that would erase others'
  pets — the snapshot must include ALL animals of the world.
- Riding must skip the wander AI (`a.ridden` branch in `spawner.ts`) and the
  player physics (`step()` mount branch) — keep both guards in sync.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`,
  `node scripts/probe-animal-wander.mjs`, plus standard gates.

## Open work

- In-world nameplate above pets; rename via sign again; riding animation polish;
  multi-user pet ownership list (server knows `owner_id` already).
