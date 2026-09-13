# Block & Item Animation Plan: flag everything that should move

**Status:** Architecture Blueprint & Implementation Roadmap
**Date:** 2026-09-06
**Author:** WebMC Engineering
**Companion:** [`docs/KNOWN_ISSUES.md`](./KNOWN_ISSUES.md) (U14), `catalog/textures/block/*.mcmeta` (49 files)

---

## 1. Current state (audited 2026-09-06)

- **The ONLY motion in the engine is vertex wind sway** (foliage + grass billboards,
  `uTime` in `materials.ts`) plus voxel water flow (not texture motion).
- **All texture animation is frozen at frame 0:** `buildMasterAtlas.js` blits only the
  top 16×16 of each source, so 16×512 water/fire/portal strips render as stills.
- **Zero blocks flagged animated** in `catalog/completeRegistry.json`.
- 49 `.mcmeta` files ship authoritative frame counts + frametimes and are currently
  ignored by every tool.

## 2. Flagged list (canonical — every entry verified: source strip + our block ID)

### Tier 1 — texture frames (strips exist, engine ignores them)

| # | Block(s) | Our IDs | Source strip | Priority |
|---|---|---|---|---|
| 1 | Water (still + flow share `39` in our engine) | `39` | `water_still` 16×512, `water_flow` 32×1024 | P0 — visible everywhere |
| 2 | Lava | `40` | `lava_still` 16×320, `lava_flow` 32×512 | P0 — caves/Nether read dead without it |
| 3 | Fire | `102` | `fire_0/1` 16×512 | P0 |
| 4 | Soul fire | `630`, `631` | `soul_fire_0/1` 16×512 | P0 (same pass as fire) |
| 5 | Nether portal | `98`, `1204` | `nether_portal` 16×512 | P1 |
| 6 | Kelp + Kelp plant | `131`, `425` | `kelp[_plant]` 16×320 | P1 (billboards since Sep-06) |
| 7 | Seagrass + Tall seagrass | `133`, `661` | `seagrass` 16×288, `tall_*` 16×304 | P1 (billboards since Sep-06) |
| 8 | Lantern / Soul lantern | `46`, `82` | `lantern`, `soul_lantern` 16×48 | P1 |
| 9 | Sea lantern | `48` | `sea_lantern` 16×80 | P1 |
| 10 | Magma block | `99` | `magma` 16×48 | P1 |
| 11 | Campfire fire/log, Soul campfire | `85`, `86` | `*_campfire_fire` 16×128, `*_log_lit` 16×64 | P1 |
| 12 | Lit furnace, Smoker, Blast furnace | `96`, `623`, `194` | `*_front_on` 16×32/48 | P2 |
| 13 | Prismarine | `61` | `prismarine` 16×64 | P2 |
| 14 | Respawn anchor top | `601` | `respawn_anchor_top` 16×512 | P2 |
| 15 | Sculk family (5) | `607`, `608`, `611`, `614`, `617` | `sculk*` 16×64–256 | P2 (only if the blocks generate/placeable) |
| 16 | Stonecutter saw | `639` | `stonecutter_saw` 16×48 | P3 |
| 17 | Crimson / Warped stems | `120`, `682` | `*_stem` 16×80 | P3 (subtle shimmer) |
| 18 | Command blocks (6) | `240`, `261`, … | `*_command_block_*` 16×64 | P3 (dev-only blocks) |

### Tier 2 — procedural motion, no new textures

| # | Effect | Mechanism | Priority |
|---|---|---|---|
| 19 | Torch / lantern flame flicker | point-light intensity jitter + tiny emissive pulse on glow material | P1 — sells every cave at near-zero cost |
| 20 | Lava glow pulse | slow `uTime` emissive breathing on glow bucket | P1 |
| 21 | Portal swirl | UV rotation/scroll in FRAGMENT shader (no atlas change) | P2 |
| 22 | Redstone dust brightness by power | already tinted per power — pulse at high power | P3 |
| 23 | Water surface shimmer | specular/UV micro-scroll on trans material | P2 |

### Tier 3 — already animated (do not regress)

Foliage wind sway, grass/flower billboard wind, boat oars, mob walk bob (`animTime`),
voxel fluid spread, cloud drift, weather particles.

### Explicitly NOT animated

Ores, stone/dirt/sand families, woods, glass, wool/concrete, doors/trapdoors (they
articulate instead), crops at growth stages (stage blocks, not motion), paintings.

## 3. Implementation roadmap

### Phase 1: registry flags + audit gate
- Parse all 49 `.mcmeta` → per-block `animated: { frames, frametime, interpolate }`
  in `catalog/completeRegistry.json` (regenerate `blocks.ts` via the catalog pipeline —
  NEVER hand-edit, per AGENTS.md).
- Sim test: every Tier-1 block flagged AND every flagged block has a strip source
  (catches future renumbers — same pattern as the terrain ID-guard test).
- Gate: `npm run sim:test`.

### Phase 2: atlas carries the frames
- Reserve animation frame rows (or a second animated atlas page); baker copies ALL
  frames + records `(tile, frameCount, frametime)` into `textureTileMap.json`.
- Atlas stays 512² if frames fit, else 1024² (watch the bandwidth diet — measure).
- Destructive step (cf. U9): snapshot + `textureCheck.mjs` green before/after.
- Gate: `npm run build`, `textureCheck.mjs`, `pages:check`.

### Phase 3: shader frame selection (Tier 1, P0 → P1 → P2 order)
- Global `uTime`-driven frame index in the opaque/trans/glow materials; per-face
  frame offset attribute OR per-tile uniform lookup (frametime respected;
  interpolate flag honored where vanilla interpolates, e.g. water/lava/portal).
- Worker + main-thread mesher parity (both emit the same UV origin; AGENTS.md rule).
- Start with water + lava only (== U14's 2-frame ask), prove zero FPS delta, then
  fire/portal/kelp/seagrass/lanterns.
- Gate: `tsc -b`, `build`, `sim:test`, human dusk/night check on :PROD.

### Phase 4: procedural motion (Tier 2) + closeout
- Torch flicker, lava pulse, portal swirl, shimmer; KB entry
  (`kb/mechanics/block-animation.md`); tick Phase-3 boxes in §4 checklist.
- Gate: full machine gates + human checklist entry.

## 4. Summary checklist

- [x] Audit: current motion, frozen strips, zero flags (this doc §1).
- [x] Canonical flagged list with block IDs (this doc §2).
- [x] Phase 1: `.mcmeta` → registry `animated` flags + audit test (52 blocks flagged via `catalog/flagAnimatedBlocks.mjs`; lit smoker/blast sides wired; `syncBlocksTs.mjs` template fixed + destructive-regen warning; 267 sim tests passing).
- [x] Ambient block particles (34 emitters: leaves flutter, fire/lava embers, lantern shimmer, portal drift, conditional drips/bubbles; `ambientParticles.ts` + `spawnMote` + budgeted sampler in `renderLoop.ts`; KB `mechanics/block-particles`; 269 sim tests passing).
- [ ] Phase 2: multi-frame atlas layout + baker support.
- [ ] Phase 3: shader frame selection, water/lava first.
- [ ] Phase 4: procedural motion + KB + human verification.
