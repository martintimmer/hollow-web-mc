---
id: mechanics/block-particles
title: Ambient block particles (passive emitters)
kind: mechanic
wiki: https://minecraft.wiki/w/Particle-emitting_blocks
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-06
status: partial
tags: [particles, ambient, emitters, leaves, fire, performance, seed-generator]
related_docs: [docs/ANIMATION_PLAN.md]
---

# Ambient block particles

Blocks passively emit mote particles around players, per vanilla's
particle-emitting blocks list. Emitter table: `src/game/ambientParticles.ts`
(34 blocks); mote physics: `src/game/particles.ts` (`spawnMote`, kinds
rise/fall/flutter/spark in the shared 420-quad pool); sampler: `renderLoop.ts`
(6 samples per 0.35s tick, max 3 motes — pool can never flood).

## Emitter list (block ID → mote)

- Falling leaves (flutter, tinted): oak `18`, jungle `114`, dark oak `115`,
  acacia `118`, mangrove `480`, birch `116`, spruce `24`, cherry `109`,
  crimson `110`, aspen `111`.
- Fire & heat (rising embers + smoke): torch `80`, soul torch `81`, redstone
  torch `84`, lantern `46`, soul lantern `82`, campfire `85`, soul campfire
  `86`, lit furnace `96`, magma `99`, lava `40`, fire `102`, soul fire
  `630`/`631`, jack o'lantern `87`.
- Shimmer (spark): glowstone `47`, sea lantern `48`, end rod `92`,
  glow lichen `100`, redstone lamp `596`, crying obsidian `93` (drip),
  sea pickle `132`.
- Conditional: dripstone `1051` drips water/lava pooled above it; soul sand
  `57` breathes bubbles only while submerged; nether portal `98` violet drift.

## Deviations / limitations

- No patience/pre-warm: emitters start the frame their block is sampled.
- Dripstone needs fluid directly above (no stalactite-fill simulation).
- Furnace/smoker/blast emit while the lit block exists (no smelting check).
- Redstone ore, candles, spawners, note blocks not yet covered.

## Ruleset when modifying

- Keep the per-tick budget (samples × spawn cap); the pool is shared with
  mining bursts and combat hits.
- New entries go in `ambientParticles.ts` with a sim test pinning behavior.
- Gate: `npm run kb:check`, `npm run sim:test`.
