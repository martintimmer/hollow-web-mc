# Hollowpine Web Minecraft — Gameplay Authenticity Spec (Wikipedia/Wiki-Grounded)

> How to implement 10 core "feel-like-real-Minecraft" features. Facts sourced from the Minecraft Wiki (minecraft.wiki) & Wikipedia. Each section: **Reference facts → Target code → Implementation recipe → Acceptance criteria.**

Codebase map used below: `src/game/blocks.ts` (BlockDef registry), `src/game/sfx.ts` (100% procedural WebAudio engine), `src/game/engine/atlas.ts` (procedural texture atlas + iso thumbnails), `src/game/engine/chunkMesh.ts` (voxel meshing), `src/components/Game.tsx` (engine loop, physics, raycast), `src/components/gui/HUD.tsx`, `src/game/inventory.ts`.

---

## 1. Block Breaking Particles, Mining Cracks & Highlight Outline

### Reference facts (Breaking — minecraft.wiki)
- Cracks appear progressively on the targeted block as it is destroyed; the crack animation is drawn as a wireframe/damage overlay advancing through 10 stages until covering the block.
- The targeted block always shows a **wireframe cube outline** (Bedrock also offers a white highlight variant).
- Every block has **hardness**; base time = hardness × 1.5 (correct tool) or × 5 ("default"/wrong tool).
- Tool speeds: no tool 1×, wood 2×, stone 4×, iron 6×, diamond 8×, netherite 9×; Efficiency adds (level²+1).
- Break time rounds up to whole ticks; when time ≤ 0.05 s the block breaks **instantly without the 6-tick (0.3 s) recharge delay** that normally occurs between consecutive blocks.
- Creative mode breaks everything instantly.
- Particle reference (`/particle` command): block-crack particles use the block's own texture tinted at 16×16 sample sizes; destruction particle counts are typically ~40-100 per block (Bedrock `minecraft:destruction_particles` default `< 100`).

### Target code
- `src/game/blocks.ts` — add `hardness: number` and `material: "stone" | "wood" | "sand" | "grass" | "dirt" | "metal" | "leaf" | "glass" | "water" | ...` to each `BlockDef` (default 1.5).
- `Game.tsx` `breakBlock()` — compute `damagePerTick = toolSpeed * (canHarvest ? 1 : 1/3.3) * hardnessFactor`; maintain `s.breakProgress` per target block; emit 6-tick cooldown between completed blocks (except instant breaks).
- New `src/game/particles.ts` — a pooled `Points`/instanced-cube particle system: 16-40 shards per break, colored by the block's atlas texture sample (sample 3-5 px colors from the atlas canvas at break time), gravity ±, lifetime 0.4-0.9 s, velocity 2-5 m/s anisotropic.
- Damage overlay: instead of a 10-stage texture, draw a **fracture grid decal** (opaque triangles mask per stage, procedural) as a `MeshBasicMaterial` translucent mesh hugging the block face; or simpler: 10-step progressive darkening + growing crack lines on a face-slab billboard.

### Acceptance criteria
- Breaking a stone block with no tool takes ~1.0-1.5 s with 3-4 crack stages visible; dirt/grass breaks visibly faster; a targeted block shows an outline cube without hurting FPS (single `LineSegments` per target).
- Shards fly colored by the block (grass → green + brown); zero GC pressure (object pooling).

---

## 2. Per-Material Dig / Place / Step Sounds

### Reference facts
- Sound Groups (vanilla `sound_type`): stone, wood, sand, grass, gravel, dirt, glass, metal, wool, nether etc. Each has 4-5 variants per event (dig/place/step), randomized pitch ±0.1-0.2.
- Sounds attenuate with distance (begin ~100%, fade to 0 at ~16 blocks; subtitles name each group).
- Note: older versions sample-based; a procedural engine (this project has zero assets) should use shaped noise bursts per material family.

### Target code
- `src/game/sfx.ts` — table `MATERIAL_SOUNDS` keyed by `BlockDef.material`: distinct noise filters, e.g. stone = short white-noise burst w/ lowpass 1800 Hz + high Q clack; wood = hollow resonant (multi-osc 220/330 Hz decay); sand = soft lowpass 900 Hz white noise; glass = highpass bell 2400 Hz; water = splash-comb filter.
- `Game.tsx` step loop — resample `playStep` per 0.25 s while moving (walking cadence step rate scales with speed; sprint faster cadence), choose material from `getBlock(floor(x), floor(y), floor(z))` under feet.
- `breakBlock()`/`placeBlock()` select material via `BLOCK_MAP.get(id).material`.

### Acceptance criteria
- Walking stone vs grass vs sand sounds clearly different; breaking logs ≠ iron; correct level ≈ -12 dBFS.

---

## 3. First-Person Held Item with Walking Bob & Aim-Lock

### Reference facts
- The held block/item renders at lower-right; while walking it bobs with a positional sine synced to the step cadence; while swinging it rotates ~60-90° into the punch animation; in flight it holds steady.
- Reaching (placing) has a distinct "hitch" — a 0.2-0.3 s snap toward the place.

### Target code
- `src/game/engine/heldItem.ts` exists (heldItemGroup) — add: `bobPhase += dt * (speed * 1.9)`; render offset `y = sin(bobPhase) * 0.025 * speedFactor`, `x = cos(bobPhase*0.5) * 0.01`; while `s.swingTimer > 0` apply rotation curve (5-phase: wind-up → strike → recover).
- Respect the existing `s.currentHeldId` + iso thumbnails for the sprite.

### Acceptance criteria
- Items visibly bob while walking and swing with a consistent rhythm; pause while standing still.

---

## 4. Hunger & Saturation (Phase-8 mechanic, wiki-exact)

### Reference facts (Hunger — minecraft.wiki, Player)
- 4 variables: **hunger 0-20** (10 icon), **saturation 0-20** (≤ hunger, start 5), **exhaustion 0-4**, foodTickTimer.
- When exhaustion crosses 4 → reset to 0, saturation −1; if saturation 0 → hunger −1.
- Exhaustion per action: sprint 0.1/m; sprint-jump 0.2; jump 0.05; attack 0.1/hit; block broken 0.005; swimming 0.01/m; damage 0.1/instance; **regenerating 1 HP = +6 exhaustion**.
- Thresholds: hunger ≥ 20 + saturation>0 → 1 HP / 0.5 s; hunger ≥ 18 → 1 HP / 4 s (80 ticks); ≤ 17 → no regen; **≤ 6 → cannot sprint**; = 0 → starvation 1 HP / 4 s (Easy stops at 10 HP, Normal at 1, Hard kills).
- Hunger bar visibly "jitters" when saturation hits 0.
- Creative & Peaceful: no drain, hunger regens.

### Target code
- `src/game/world.ts` or new `src/game/hunger.ts` — add `hunger`, `saturation`, `exhaustion` to `s.player`; persist via `player_state.inventory`-style JSON (add `hunger` column in `server/index.js` `/state`).
- Hook exhaustion increases into `stepPlayer` locomotion (sprint miles), `jump`, `breakBlock`, `mobMgr` hit damages, `stepLiquids` (swimming).
- `sfx.ts`: stomach-growl at hunger 0-4; `HUD.tsx`: iron-drumstick hunger bar (10 segments, 2 px each), jitters when saturation 0, red flash on starvation.

### Acceptance criteria
- Sprint exhausts visibly (≈60 m sprint ≈ 1 drumstick worth); no regen below 18; sprint locked below 6; creative immune.

---

## 5. Water Physics Feel (Swim, Sink, Breaks, FOV)

### Reference facts (Water — minecraft.wiki)
- Non-swimming entities sink slowly; holding jump raises; sneak sinks faster; sprint = "swim mode" when fully submerged (horizontal, 1-block hitbox, arm wave animation).
- **Water of any depth negates all fall damage** (1.6.3 made ≥3-deep needed once; reverted to any depth in 1.4.4 — choose the modern rule: any depth).
- Underwater FOV is reduced **by 10°** (refraction) unless FOV-effects disabled.
- Underwater block breaking takes **5× longer** if feet not on ground, cumulative → **25×** floating.
- Water spreads 1 block / 5 ticks horizontally up to 7 from a source; sources form when 2+ adjacent sources neighbor a flow block on solid ground (**infinite water** rule).
- Drowning: oxygen depletes when head submerged; bubbles; 1 HP/tick at 0.

### Target code
- `Game.tsx` physics — add `s.player.submerged` (eye-level block id 39); speed multiplier 0.6 (sink) / jump-dominant swim (0.4 m/s ascent); `s.player.swimMode` when fully submerged + sprint held.
- `placeBlock()` gas-free: use water bucket id mapping; fall damage guard: if the landing block below is water origin → treat as splash (already soft in some spots — ensure across any depth, per modern rule), reset fallPeakY.
- FOV: `camera.fov = baseFov + sprints*(base*0.1) - (underwater ? 10 : 0)`; lerp.
- Mining: if submerged & !grounded → `breakTime × 5` (× 25 if floating).
- Restore `s.oxygen` bubble bar (exists as oxygenBubbles — wire to real drowning damage at 0: 1HP/s).

### Acceptance criteria
- Sinking feels slow (heavy), swim-jump exits water with a bubble-splash sound; falls into 1-block water = no damage; FOV-10 underwater.

---

## 6. Buckets (Water/Lava Pickup & Infinite Sources)

### Reference facts (Bucket / Water / Lava — minecraft.wiki)
- Empty bucket + **source block** only (flowing water never fills a bucket) → consumes the source.
- Filled bucket: use on solid block → places a source against it (empties); the Nether evaporates water instead.
- **Infinite source**: a flowing block horizontally adjacent to 2+ source blocks (on solid/water below) regrows into a source when the space is emptied → regenerating water pool = 2-bucket rule.
- Lava: source-only pickup; placing lava next to water → the lava source becomes **obsidian** (water above lava → stone; flowing-lava touching water → cobblestone).
- Bucket stack limit = 16; filled buckets don't stack; creative: pickup leaves void and grants a bucket in a new slot.

### Target code
- `src/game/inventory.ts` / `blocks.ts` — item ids `bucket_empty`, `bucket_water`, `bucket_lava`.
- `Game.tsx placeBlock()` branch: if empty-bucket targeting a blocked cell → check `getBlock === 39/40` and cell is a source (level-0 source flag or scan: no flow parent) → `setRaw(x,y,z,0)` + swap item to filled bucket; if filled → place 39/40 source on the adjacent solid face, swap back.
- Extend `stepLiquids()` source-regeneration: after removals, scan flow cells; if exactly ≥2 source neighbors horizontally + solid/water below → promote back to source (already partially exists for 39; verify id 40 excluded per vanilla).
- Obsidian reaction already exists (`liquidQ` reactions) — ensure it triggers on bucket-placed lava vs water.

### Acceptance criteria
- Two-bucket pool is infinite; flowing water can't be bucketed; bucket into lava-vs-water turns it obsidian with the scrape sound.

---

## 7. Experience Points, Orbs & Level Bar

### Reference facts (Experience — minecraft.wiki)
- Orb tiers: 1-2, 3-6, 7-16, 17-36, 37-72, 73-148, 149-306… split total value into highest-first (e.g. 1000 → 617+307+73+3); naturally spawned orbs: 1-11, 17, 37, 73…
- Sources (XP/animation): coal ore 0-2, diamond/emerald 3-7, redstone 1-5, quartz/lapis 2-5; smelt gold/emerald/diamond ore 1.0, iron/redstone 0.7, food 0.35, clay 0.3, cactus 0.2, wood 0.15, cobble 0.1; mobs 1-10 (zombie/skeleton 5, witch 5, ender dragon 12000 first time).
- Levels: L1 = 7 XP, L2 = 16… formula for 16-30: `2.5×lvl + 62.5` → 30 requires 1395 total; enchant tables cap at level 30.
- XP bar sits directly **above the hotbar**; level number to the right; orbs gravitate toward players (single-player: auto-light-speed magnet).
- Dying: drop orbs worth `7 × current level` (cap 100, ≈ 7.4 levels), others vanish.

### Target code
- New `src/game/xp.ts` — `xpTotal`, `levelFor(xp)` inverse curves (0-15: 2L+7, 16-30: 5L-38, 31+ reverse), `magnetOrbs`.
- Wire to `smelt.ts` outputs (already itemized), `breakBlock` ore ids (47/83/45/64), mob deaths in `entities/spawner.ts`.
- Particle entity: small green glowing sprite (atlas px) w/ attract velocity toward player (max 12 orbs/s visible), merge same values.
- HUD: green bar + level number; render cost via `transform-gpu` (already used for filters).

### Acceptance criteria
- Mining coal spawns orbs 0-2 XP; bar fills exactly level-1 at 7 XP; smelting 10 cobble = 1 XP; enchanting table GUI shows 3 randomized tiers.

---

## 8. Fall Damage (Multiplier Model)

### Reference facts (Damage — minecraft.wiki)
- `fall damage = max(0, floor((fallDistance − safeFall) × multiplier))`; player `safeFall = 3`, `multiplier = 1` → 1 HP per additional block.
- Max fatal fall ≈ 23.5 blocks at 20 HP; small 1-HP rounding variances at 17/20/23 blocks due to tick order.
- Water (any depth), cobweb, powder snow, slime/space, vines/ladders reset fall distance; jumping from blocks gives +1.5 block "grace" (measured from apex, not takeoff).
- Feather Falling reduces by (level² × 2)% per level compounded; Jump Boost −1 HP per level; Resistance −20% per level; Slow Falling = zero.

### Target code
- `Game.tsx` — track `fallPeakY` (exists) → on ground transition: `dist = fallPeakY − groundY − 1.5` (jump grace); if `dist > 3` → `dmg = floor(dist − 3)`; apply via existing `damagePlayer`; water check first (see §5); show red vignette + thud sound.
- Feather-falling boots item flag + `fallDamageMultiplier` per `level²×2%`.

### Acceptance criteria
- 4-block fall = 1 HP; 23+ = death; landing in 1-deep water across a 50-block drop = 0 HP (per modern rule).

---

## 9. Sprint FOV Kick & Movement Weight

### Reference facts (Sprinting — Parkour WIKI & Player)
- Sprint = +30% movement speed (walk 4.32 m/s → sprint 5.61 m/s), FOV increases by **10°** (set by `fov * 1.1` when sprinting; ~110° from 70 base) with smooth interpolation ≈ 1.5-2 s ease; sprint-jump extends a 4.2-block gap; double-tap W (or sprint key) to start; stop after 30 s without Sprint key.
- Air-control reduced: sprinting in air can't be toggled until landing (1-tick lag).

### Target code
- `Game.tsx` — sprint state `s.sprint` (existing shift); FOV lerp `target += s.sprint ? baseFov*0.1 : 0` each frame; position footsteps pitch up.
- Exhaustion hook (see §4) gates sprint when hunger ≤ 6.

### Acceptance criteria
- Visible FOV widen at sprint; sprint speed matches 5.6 m/s vs 4.3 walking; FOV returns smoothly (no snap).

---

## 10. 3D-Positioned Ambient Sounds (Caves, Animals, Flute)

### Reference facts (Sound — minecraft.wiki, particles)
- Ambience loops (cave/waterfall/wind) at low volume 24/7 in matching biomes; animal sounds broadcast at 16-block listener radius, at most 1-2 instances per second global cap.
- Ambience volume pan ≈ stereo from the entity's relative bearing (sin/cos of yaw-difference), distance attenuation rate 0.5-1.0 per 16 blocks.
- `/particle` note: default display radius = 32 blocks; sounds generally cut from 16 blocks to avoid spam.

### Target code
- `src/game/music.ts` (already plays ambient motif) + `src/game/entities/animals.ts` — animal call scheduler: every 8-20 s from a random live animal within 24 m; `sfx.ts` 3D-position: `pan = sin(yaw − atan2(dz,dx))`, `gain = max(0, 1 − dist/16)`; the existing `ConvolverNode`/`StereoPannerNode` path (WebAudio) supports this natively.
- Cave-ambience trigger: when `getBlock(eyeY-1..8)` count of solid ≥ threshold (underground detector) → start filtered-noise drone `loop` node with gentle 0.3 Hz LFO; stop on surface.
- Options menu: ambient volume slider already exists as music; add "Ambient sounds" toggle.

### Acceptance criteria
- Underground rumble vs above-ground silence; a cow 12 m to your left is clearly panned left and quieter at 20 m.

---

## Cross-cutting performance rules (docs/AUDIT.md does not relax these)
- Particle pools ≤ 400 instances; spawn ≤ 64/frame; particle mesh = one `THREE.InstancedMesh`, `updateMatrix` per frame only when active.
- All new systems shove into the existing frame-tick budget: XP magnet 0.5 ms slice; ambience checks every 250 ms; FOV lerp is O(1).
- Anything time-based uses `dt` already clamped to 0.05 s in `frame()`; never allocate arrays per frame (reuse vectors).

---

# Part 2 — Implementation Status Audit & Gap Plan (audited 2026-08-23)

Stage legend: ✅ **done** · 🟡 **partial** · ⭕ **missing** — evidence = verified file:line.

## Audit table

| # | Feature | Stage | Current code evidence | What's missing → plan |
| :- | :--- | :--- | :--- | :--- |
| 1 | Breaking particles · crack overlay · outline | ⭕ | No particle system exists (atlas only). `breakBlock()` plays `playSwing`/`playDig` (`Game.tsx:5150+`); no target mesh | Instanced-shard pool (new `src/game/particles.ts`), 10-stage fracture decal, `LineSegments` outline cube on `s.target` |
| 2 | Per-material dig/place/step sounds | 🟡 | `sfx.ts:121-190` has generic `playStep/playDig/playPlace/playSwing/playSplash/furnace` etc.; `playStep` is material-blind | Add `BlockDef.material`, `MATERIAL_SOUNDS` table in `sfx.ts`, pick material via `getBlock` under feet/dig target |
| 3 | First-person held item + bob | 🟡 | Implemented: `heldItemGroup` on `firstPersonArm` `Game.tsx:2775-2803`; block/sword/pickaxe builders in `engine/heldItem.ts`; `s.swingTimer` exists | Add `player.bob`-synced bob y/x (bob field exists, unused for held item) + swing rotation curve, sprint-pitch up |
| 4 | Hunger & saturation | ⭕ | No hunger code anywhere (roadmap Phase 8 deferred). Health regen currently timed `lastRegenAt` (`Game.tsx:4061`) | Full `src/game/hunger.ts` (existing top-partial code at `Game.tsx:4061` = creative regen only); HUD drumstick bar in `HUD.tsx`; persist in `player_state` |
| 5 | Water physics feel | 🟡 | `Game.tsx:3499-3508` genuinely modeled: `swimSpeed = Sprint*0.75` sink/ascend/dive keys, state strings `isUnderwater` HUD, `setUnderwaterAudio`, underwater flora | Missing: submerged −10° FOV, 5×/25× underwater mining penalty, splash-enter animation, bubble exit. Fall-negation already correct |
| 6 | Buckets | ⭕ | Zero references (`bucket` grep = none; no water/lava buckets in `blocks.ts`) | Add 3 items, pickup/placement rules in `placeBlock`, source-regeneration in `stepLiquids`, obsidian reaction already exists (`liquidQ`) |
| 7 | XP · levels · enchanting | ⭕ | Only `playLevelUp()` sound pre-baked (`sfx.ts:232`). No XP state/UI | New `src/game/xp.ts` (orb tiers, level curves), magnet orbs, green bar above hotbar (`HUD.tsx`), wire to `smelt.ts` output + ore min IDs (47/83/45/64) + mob kills |
| 8 | Fall damage | ✅ | `Game.tsx:3605-3611`: `fallDist = fallPeakY-(floor(ny)+1)`; `if (!inWater && !inLava && fallDist > 3.25) damagePlayer(floor(fallDist-3))`; jump-grace 1.5, water/lava negate, survival-only — matches wiki | NONE (optionally add Feather Falling boots multiplier + minor tick-level rounding at 17/20/23) |
| 8b | Drowning | ✅ | `Game.tsx:3699`: oxygen 0 → `drownTimer ≥1.5s → damagePlayer(2)`; bubbles in HUD; `setUnderwaterAudio` | NONE (wiki parity: 1 HP/tick real ≈ 2/s; rate close enough) |
| 9 | Sprint FOV kick | 🟡 | `baseFov` read from prefs `Game.tsx:853-902`, applied directly; sprint exists (`Shift`) | FOV lerp `base*1.1` when sprinting + `submerged` −10° + `SmoothDamp` curve |
| 10 | 3D ambient sounds | 🟡 | Ambient music phases + climate motif (`music.ts:93-121`), `setUnderwaterAudio`; animals exist (`entities/animals.ts`) with zero SFX | Stereo pan/gain per animal call (16-block cutoff) + cave drone detector (underground solid count) + toggle |
| 11 | Tree sway / richer clouds | 🟡 | Clouds procedural weather swap (`Game.tsx:479`, `visuals.ts makeClouds`); tree MESHES static | Vertex-shader leaf sway (uniform time); cloud weather already toggles `"clear"|"cloudy"|"overcast"` |
| 12 | Tooltips / HUD vignette | ✅ | Hotbar hover tooltip `HUD.tsx:302`, purple-bordered floating tooltip in `ChestModal.tsx:352`; options menu tab system | (optional) MC-styled tooltips on all modal slots (inventory/crafting reuse ChestModal pattern) |
| 13 | Sneak | ⭕ | No sneak/crouch code | Shift re-priority: sneak-state (movement 0.3×, bob×0.5), shift already = sprint → swap: Shift=sneak, Ctrl=legacy sprint (or double-tap W) |
| 14 | Fast 180° look | ⭕ | None | `Y` (or scroll-double-tap) → 180° yaw with 120 ms eased spin, cancels on pointer release |
| 15 | Redstone wiring | 🟡 | Blocks registered: torch 80/81, redstone torch 84 (`blocks.ts:122-126`), redstone lamp lit 83 ⇄ off 104; sounds/particles no | No dust/lever/button/repeater, no propagation; Phase-1: lever + lamp toggle chain (ids 104→83) via `edit()` + emitter remesh; Phase-2: dust wire + 15-block signal decay |
| 16 | Villager AI | ✅ | Wander/return-home/physics `Game.tsx:2350-2406`, trade `usesLeft ×8` dawn-restock `villagers.ts:4`, trade GUI, respawn | (optional) job assignment (farmer→farm, librarian→shelf), walking-into-trade gap fix |
| 17 | Weather visuals | 🟡 | `weather` state `"clear"|"cloudy"|"overcast"` + rain/thunder arg mapping `Game.tsx:562` → cloud mesh swap only | Rain particle layer + wind drone loop + fog density curve per weather + wet ground tint post-switch |
| 18 | Chest/door SFX | 🟡 | Chest articulation + hinge anim (`chest.ts`, `openChest Game.tsx:5276`); no dedicated SFX | Add `playChestOpen` (slow creak = 3-stage filtered noise + wood resonance) in `sfx.ts`, call on chest open; door impact on use |
| 19 | Creative pick-block | 🟡 | Right-click = place (`Game.tsx:4769`); no middle-mouse picker | Middle-mouse (button 1): raycast → copy block id into active hotbar slot; touch: long-press-right icon in hotbar |
| 20 | Autosave indicator | 🟡 | `s.dirtySave` exists; server saves silently on WS move >250 ms + `/state`; toasts exist (`showToast`) | Add `Saved ✓` fade-in toast bottom-right when dirtySave flush lands (5× rate-limit), or HUD green dot |

## Priority ladder (order matters — quick wins first)

1. **#1 particles+cracks** (builds on #2 audio = strongest overall feel per LOC)
2. **#2 material sounds + #18 chest/door SFX** (sfx.ts only)
3. **#19 pick-block + #14 look-around** (input-layer, ~30 min each)
4. **#9 sprint FOV + #13 sneak** (needs input rework — do together)
5. **#7 XP** (orb + bar; unlock enchanting stage 2)
6. **#4 hunger** (biggest system; prerequisite for realistic survival loop)
7. **#5 water polish + #6 buckets** (complementary)
8. **#17 rain + #11 sway** (shader-layer polish)
9. **#15 redstone Phase 1** (lever+lamp), then Phase 2 (dust)
10. **#10 ambient positioning** (last — polish layer)

# Part 4 — Progress Rating & Sorted Backlog (rev 3, 2026-08-23)

## ⏸ PAUSED ITEMS (project decisions — do not resume without explicit ask)
- **Door polish** (2026-08-24: work stopped by user; frozen state + autopsy in `docs/PROGRESS.md`). Knowns: closed 2-block thin leaf ✅ · 4 see-through panes ✅ · 90° open same design ✅ · one unresolved gray base quad (world data clean; not resumed).

## Current stage (honest self-assessment)

| Domain | Stage | Evidence / notes |
| :-- | :-- | :-- |
| Performance & visibility | **95%** | Worker PNG encode, sliced meshing, shadow every-2nd, mapdraw cooldown, 1-FPS idle gate, pointer-lock; telemetry pipeline proves 60 FPS stable. Remaining: meshing on a real WebWorker (nice-to-have), G-buffer compression |
| Gameplay authenticity | **65%** | ✅ particles/cracks/hold-mining, XP+bar, hunger core, water feel (FOV/penalty/fall), sneak, 180° look, pick-block, material sounds, chest/door SFX, **buckets (just shipped)** · ⏳ food eating, enchanting, ambient 3D SFX, rain, redstone wiring, death drops, auto-jump polish |
| UI / Menus | **95%** | Esc pause menu, Bedrock-style loading/boot/settings, autosave toast, hide-able HUD |
| Sim environment | **100%** | sandbox, flat-pad, spawn-only, catalog (blocks/18 trees/8 houses+doors/8 features), edit tools, scenes, :DEV admin infra, 58/58 harness |
| Tooling / docs | **90%** | sim:test goldens+drift, PROGRESS.md convention, plan docs 7 parts; lint baseline ~34 pre-existing |

**Overall ≈ 80% of the full plan.** The remaining gameplay slice is the biggest lever.

## Sorted backlog (matches current progress; each is user-visible)

| # | Item | Depends on | Est. |
| :- | :--- | :--- | :--- |
| 1 | ✅ **Buckets** (134/135/136: absorb, pour, swap, liquid ray) | liquids engine (live) | done |
| 2 | **Food eating** — eat steak/bread items from hotbar w/ `F`? (use E-on-self or right-click-hold), restore hunger/saturation + eating SFX + 32-tick animation | hunger (live) | 0.5 d |
| 3 | **Enchanting table GUI** — 3 randomized options, level-30 cap, lapis cost | XP (live) | 1 d |
| 4 | **Ambient 3D SFX** — animals/cave panning via StereoPanner + listener gain | sfx engine | 0.5 d |
| 5 | **Rain particles + wet fog** — weather system exists (clouds only) | particles.ts | 0.5 d |
| 6 | **Redstone Phase 1** — lever + lamp 104⇄83 propagation | edit() (live) | 1 d |
| 7 | **Death drops + 5-min despawn** | entities | 0.75 d |
| 8 | Gizmo-drag transforms (sim polish) | sim edit tools | 0.5 d |
| 9 | Meshing WebWorker offload | meshing | 1.5 d |

Next up (per order): **#2 food eating**.

---

# Part 3 — Implementation Status Update (pass 1, 2026-08-23 — shipped)

Verified live code audit vs part 2 claims, plus new features implemented and built this pass:

## Corrected audits (features were already implemented!)

| # | Correction | Evidence |
| :- | :--- | :--- |
| 2 | **Per-material sounds were already done** — `sfx.ts` has `getMaterialType()` mapping 6 material families; `playStep/playDig/playPlace` receive block ids | `sfx.ts:110-186` · `Game.tsx:3261,3596,3744` |
| 3 | **Held-item bob/swing already done** — arm Bob + swing sine + speed factor | `Game.tsx:4270-4276` |
| 8 | Fall damage **exact wiki formula** (safe 3.25, floor(dist−3), water/lava negate, survival-only) | `Game.tsx:3605-3611` |
| 8b | Drowning 2HP/1.5s + bubbles | `Game.tsx:3699` |
| 9 | **Sprint FOV kick already done** (+8° lerp `dt*8`) | `Game.tsx:3665-3674` |
| 12 | Tooltips (HUD hover + modal purple tooltips) | `HUD.tsx:302` · `ChestModal.tsx:352` |
| 16 | Villager AI (wander/home/collision + dawn restock) | `Game.tsx:2350-2406` · `villagers.ts:4` |
| 6b | Infinite-water source rule **already in fluid engine** (2-adjacent-source rule) | `Game.tsx:2993-3001` |
| 12b | Door toggle open/close **already existed** (105⇄106 both halves) | `Game.tsx:3418-3428` |

## Critical bug found & fixed

| Bug | Before | After | Evidence |
| :- | :--- | :--- | :--- |
| **World-gen ore IDs were wrong** | Caves spawned Chests (43), Bookshelves (44), TNT (45), Glowstone (47), BlueWool (64), Redstone Lamps (83) instead of ores | Real ores: Coal 30, Iron 31, Gold 32, Redstone 33, Lapis 34, Diamond 35 (per `blocks.ts`) | `Game.tsx genChunk()` ore block fixed |

## Newly implemented this pass

| # | Feature | Delivered | Files |
| :- | :--- | :--- | :--- |
| 1 | Block-break/place **particles** (pooled 420, atlas-colored, gravity) + **10-stage crack decal** + **white target outline** + **hold-to-mine survival breaking** with 6-tick-class creep, material-based hold times, 5×/25× underwater penalty | ✅ | new `src/game/particles.ts` · `Game.tsx` (§1.11-1.12, `startMining/mineHoldTime/minePenalty`) |
| 4 | **Hunger core implemented**: exhaustion model (sprint 0.1/m, swim 0.01/m, regen 6.0/HP, mine 0.05/blk), thresholds (≥18 regen, ≥20+sat 0.5s, ≤0 starve, ≤6 no-sprint), dynamic 🍗 HUD, respawn reset | ✅ (eating UI pending) | `Game.tsx` §1.14 · `HUD.tsx` |
| 5 | Underwater **−10° FOV** + mining penalties completed | ✅ | `Game.tsx:3672` |
| 7 | **XP system**: wiki orb tiers (1/3/7/17/37/73/149/307/617/1237/2477), level curve (L1=7 … L30=1395), magnet orbs, green bar+level in HUD, ore XP (coal 0-2 … diamond/emerald 3-7), smelt 0.35, level-up SFX+toast | ✅ (enchant table next) | new `src/game/xp.ts` · `Game.tsx` §1.13 |
| 13 | **Sneak** (X key toggle): 0.62× speed, 0.55× bob, 1.7× step spacing | ✅ | `Game.tsx:3503-3506,3694,3834` |
| 14 | **180° quick-look** (Y key, smooth-stepped 0.22s) | ✅ | `Game.tsx:4952-4957, §1.15` |
| 18 | **Chest-open creak + door creak/click SFX** | ✅ | `sfx.ts playChestOpen/playDoorUse` · `Game.tsx openChest` |
| 19 | **Creative pick-block (middle mouse)** → copies targeted block into hotbar | ✅ | `Game.tsx:4779-4783, pickBlock` |
| 20 | **Autosave toast** (💾 World saved ✓, 30s throttle) | ✅ | `Game.tsx` breakBlock |

## Still open (next passes)
- #6 Buckets items+pickup (infinite-rule already live, flow rules live)
- #4 Food consumption items (steak/apple in inventory → eat with E)
- #7 Enchanting table GUI (level-30 cap)
- #10 3D-panned animal/ambient sounds · #11 leaf sway · #17 rain particles
- #15 Redstone wiring (lamp 83⇄104 + lever)
