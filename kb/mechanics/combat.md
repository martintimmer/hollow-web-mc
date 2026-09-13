---
id: mechanics/combat
title: "Combat: melee damage, cooldown, death & respawn"
kind: mechanic
wiki: https://minecraft.wiki/w/Combat
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-04
updated_at: 2026-09-04
status: partial
tags: [combat, weapons, damage, cooldown, death, respawn, tooltip, mobs]
related_docs: []
---

# Combat: melee damage, cooldown, death & respawn

Vanilla Java melee rules adapted to our engine: weapon damage tiers shown in
tooltips, attack cooldowns, knockback, mob loot/XP, player death drops, and
respawn at the home spawn point.

## Vanilla specs

- Melee damage by tier (Java, post-1.9 rebalance). Swords: wood 4, gold 5,
  stone 5, iron 6, diamond 7, netherite 8. Axes: wood/gold 7, stone/iron/
  diamond 9, netherite 10. Pickaxes: 2/2/3/4/5/6. Shovels: 2.5/2.5/3.5/4.5/
  5.5/6.5. Hoes: 1 across tiers. Bare fist: 1. Tooltip shows the true value.
- Attack cooldown (Java only): weapons have attack speeds (sword 1.6, axe
  0.8–1, pickaxe 1.2, shovel 1, hoe 1–4); early hits deal reduced damage.
  Switching items restarts it. Melee reach ≈ 3 m.
- Knockback on every melee hit; armor reduces damage; hostile mobs deal
  contact damage on their own cooldowns.
- Mob loot + 5 XP orbs: zombie rotten flesh 0–2, skeleton bone/arrows 0–2,
  spider string 0–2, creeper gunpowder 0–2, piglin gold nugget 0–1, ghast
  tear/gunpowder 0–1.
- Death (survival): full inventory drops at the death spot; respawn resets
  health/hunger; creative keeps inventory.

## Our implementation

| Concern | Where |
|---|---|
| Damage tiers + cooldowns + loot | `src/game/weapons.ts` (`getWeaponInfo`, `meleeCooldownMs`, `MOB_LOOT`) |
| Player melee swing | `Game.tsx: tryMeleeAttack` (cone-aim ≤3.2 m, cooldown gate, knockback, XP + drops on kill, creative one-hit) |
| Mob damage application | `spawner.ts: damageMob` (shared with bow arrows) |
| Mob contact damage | `spawner.ts` melee block (1.4 m, 1.2 s cooldown, 2–3 survival / 6–8 hardcore) |
| Player damage/death | `playerPhysics.ts: damagePlayer` (armor reduction, `dead` flag) |
| Death drop | `Game.tsx: dropAllInventory` on the dead transition (survival only) |
| Respawn at home | `respawn()` prefers `getHomePortal`, falls back to world spawn |
| Tooltip | `InventoryModal.tsx` hover box: name + `+N Attack Damage` / speed for weapons |

## Deviations / limitations

- Simplified cooldown: sub-cooldown clicks fizzle instead of scaling damage;
  no attack-strength meter UI, no sweep attacks, no crits, no enchantments.
- No sprint-knockback bonus, no shields, no axe shield-disable.
- Animals never retaliate or flee when hit (mobs only).
- Mob HP matches vanilla (zombie/creeper/skeleton 20, spider 16, piglin 24,
  ghast 10); contact damage uses our survival 2–3 scale.
- Peaceful mode takes no damage (existing `damagePlayer` gate).

## Ruleset when modifying

- Damage numbers live ONLY in `weapons.ts` (parsed from registry names —
  never hardcode block ids there); tooltip reads the same source.
- `mobMgr.damageMob` is the single mob-damage path (melee + arrows).
- Death must always scatter before teleport (drops spawn at death position).
- Machine gates: `npx tsc -b`, `npm run build`, `npm run sim:test`,
  `node catalog/textureCheck.mjs`, `npm run kb:check`.

## Open work

- Attack-strength meter UI, sweep/crit/enchantments, shields.
- Animal flee/panic reactions, villager-unhappy states.
- Ranged bow item (arrows system exists for mobs only).
