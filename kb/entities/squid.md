---
id: entities/squid
title: Squid
kind: entity
wiki: https://minecraft.wiki/w/Squid
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: partial
tags: [squid, aquatic, mob, passive, water, buoyancy]
related_docs: [mechanics/fluid-dynamics.md]
---

# Squid

Passive aquatic mob with thrust/pulse swimming and beaching suffocation.
No ink-sac drop yet.

## Vanilla specs

- Spawns in water (oceans/rivers, Y-gated, groups of 1–4); drifts with
  periodic jet propulsion; suffocates on land; drops 1–3 ink sacs (→8 with
  Looting); no attack; 10 HP.

## Our implementation

| Concern | Where |
|---|---|
| Model | `src/game/entities/squid.ts` `createSquidMesh` — 0.75³ indigo body, beak, white eyes + pupils, **8 tentacles** (0.125×1.125×0.125 on a 0.28 ring) |
| Swim | `updateSquidKinematics(s, dt, getBlock)` — thrust cycle: flare to **0.70 rad** then `1.6·dt` impulse along yaw/pitch; drag ×0.96; 2% random course change (pitch clamped ±0.6); `animTime` advances `3.2·dt` |
| Water test | current cell 39 (water) **or 52 (ice)** counts as water |
| Beaching | gravity 16, terminal −12, drag ×0.8, tentacles 0.2; `suffocateTimer` → `health = 0` after **15 s** on dry land; `health ≤ 0` removes the mesh |
| Spawn | `src/game/entities/spawner.ts` — 8 ring attempts (10–35 blocks, `surf.h ≤ 60` with sea level 62), `health = 10`, small random velocity |

## Deviations / limitations

- Old revisions claimed "no beaching damage" — wrong: 15 s suffocation
  exists (corrected 2026-09-05). Still no ink-sac drop, no glow-squid
  variant, no group-size rules (fixed 8 attempts, not 1–4 groups).
- Ice counting as water is a quirk (frozen-river squids never beach).
- No attack (vanilla parity) and no XP/loot plumbing at all.

## Ruleset when modifying

- Water-bound logic must read the same fluid ids as `fluidDynamics.ts`
  (39/40 + the 52 quirk — change one, grep the other).
- Removal is health-driven in the spawner loop; any new death path (loot,
  XP) must run before `scene.remove` + `splice`.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `npm run kb:check`.

## Open work

- Ink-sac drop (+ looting scaling); glow squid; 1–4 group spawns.
- Decide the ice-as-water quirk (keep for frozen rivers or fix).
