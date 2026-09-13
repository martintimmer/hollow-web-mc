# Nether Dimension Architecture & Implementation Plan

> **Specification & Roadmap**: Full Nether dimension generation alongside the Overworld with independent persistence, Nether Gate construction & crossing, 5 authentic Nether biomes, 3D cavernous terrain, and seamless dimensional transitions.

---

## 1. Executive Summary & Catalog Audit

A comprehensive audit of [`catalog/completeRegistry.json`](https://github.com/martintimmer/hollow-web-mc/blob/main/catalog/completeRegistry.json) and [`src/game/blocks.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/blocks.ts) confirms that **99 Nether-related blocks and items are already registered and textured in the engine**. No additional block textures are required.

### Registered Nether Block Palette
| Category | Block IDs & Names | Atlas Tile | Properties |
|---|---|---|---|
| **Bedrock Bounds** | `14` Bedrock | 35 | Unbreakable floor ($Y=0..4$) and ceiling ($Y=124..127$) |
| **Primary Rock** | `56` Netherrack | 44 | Cavern walls, arches, overhangs |
| **Lava & Heat** | `40` Lava, `99` Magma Block | 39, 102 | Lava sea at $Y \le 31$, thermal banks |
| **Soul Biome** | `57` Soul Sand, `632` Soul Soil, `630` Soul Fire, `81` Soul Torch, `82` Soul Lantern | 45, 768, 766, 82, 83 | Soul Sand Valley floor, blue flame emission |
| **Volcanic Rock** | `173` Basalt, `625` Smooth Basalt, `545` Polished Basalt, `193` Blackstone, `376` Gilded Blackstone | 174, 763, 638, 210, 438 | Basalt deltas & towering pillars |
| **Crimson Forest** | `277` Crimson Nylium, `120`/`281` Crimson Stem, `499` Nether Wart Block, `276` Crimson Fungus, `279` Crimson Roots, `88` Shroomlight | 326, 122, 581, 111, 328, 91 | Giant red fungi trees, glowing shroomlight |
| **Warped Forest** | `677` Warped Nylium, `121`/`682` Warped Stem, `684` Warped Wart Block, `676` Warped Fungus, `679` Warped Roots, `88` Shroomlight | 838, 124, 842, 112, 113, 91 | Giant cyan fungi trees, glowing shroomlight |
| **Ceiling Lighting** | `47` Glowstone | 46 | `glow: 1`, `lightDist: 12`, hanging stalactites |
| **Nether Ores** | `497` Quartz Ore, `496` Gold Ore, `149` Ancient Debris, `501` Netherite Block | 579, 578, 139, 585 | Natural distribution in Netherrack |
| **Fortress Material** | `58` Nether Bricks, `583` Red Nether Bricks, `272` Cracked Bricks, `1184` Nether Brick Fence | 47, 691, 319, 47 | Corridors, bridges, fortresses |
| **Portal Gate** | `15` Obsidian, `93` Crying Obsidian, `98` Nether Portal | 36, 96, 101 | `trans: 1`, `glow: 1`, `solid: 0`, double-sided panel |

---

## 2. World Generation Architecture (3D Cavernous Engine)

Unlike the Overworld (which uses a 2D surface heightmap with cave carving), the Nether is a 128-block tall hollow cavern bounded by bedrock ceilings and floors:

```
Y = 127 ── Solid Bedrock Ceiling (Y=124..127) ─────────────────────────
           Ceiling Glowstone Stalactites & Hanging Lava Pockets (Y=85..115)
           Vast 3D Netherrack Caverns, Bridges & Floating Overhangs
           Crimson & Warped Fungi Forests / Basalt Columns
Y = 31  ── Lava Ocean Surface (Y <= 31 is solid lava ocean) ───────────
Y = 0   ── Solid Bedrock Floor (Y=0..4) ───────────────────────────────
```

### Density Function & Noise Splines
$$\text{Density}(x, y, z) = \text{baseBias}(y) + 3\text{D\_Noise}(x \cdot s_x, y \cdot s_y, z \cdot s_z)$$
- $\text{baseBias}(y)$: High density at bottom ($y < 20$) and top ($y > 105$), deeply negative in middle ($y = 35..95$) to guarantee sweeping open chambers.
- $\text{Density} > 0 \implies \text{Netherrack (or Biome Surface)}$.
- $\text{Density} \le 0 \implies \text{Air}$ (or **Lava** if $y \le 31$).

### Biome Distribution
A continuous 2D/3D temperature & vegetation noise maps $(x, z)$ into 5 distinct biomes:
1. **Nether Wastes**: Classic bare netherrack caverns, quartz/gold ores, ceiling glowstone stalactites.
2. **Crimson Forest**: Crimson Nylium top layer, towering Crimson Fungi trees ($H=6..14$) made of Crimson Stems with Nether Wart caps and Shroomlight cores, crimson ground roots.
3. **Warped Forest**: Warped Nylium top layer, tall Warped Fungi trees with Warped Wart caps and Shroomlight cores, warped ground roots.
4. **Soul Sand Valley**: Soul Sand and Soul Soil dunes, floor-to-ceiling Basalt columns, blue Soul Fire patches.
5. **Basalt Deltas**: Jagged basalt scree, Smooth Basalt slabs, Blackstone outcrops, Magma blocks around hot lava pools.

---

## 3. Nether Gate & Dimensional Crossing

### 1. Frame Detection & Lighting
- **Obsidian Frame**: Standard Minecraft $4 \times 5$ vertical rectangle ($2 \times 3$ air aperture) made of Obsidian (`ID 15`).
- **Ignition**: Right-clicking the inside face with Flint & Steel (or placing a Nether Portal block) detects the surrounding frame and fills the $2 \times 3$ inner aperture with `Nether Portal` (`ID 98`).

### 2. Crossing the Gate
- **Collision Detection**: Standing inside a `Nether Portal` (`ID 98`) block activates the portal transition timer.
- **Warp Effect**: 1.5s transition with purple screen vignette, optical distortion, and synthesized WebAudio portal drone sound.
- **8:1 Coordinate Ratio**:
  - Overworld $\to$ Nether: $(X_N = \lfloor X_O / 8 \rfloor, \, Z_N = \lfloor Z_O / 8 \rfloor)$
  - Nether $\to$ Overworld: $(X_O = X_N \times 8, \, Z_O = Z_N \times 8)$
- **Destination Portal Generator**:
  - Scans a 16-block radius for an existing Nether Gate in the destination dimension.
  - If no gate exists, automatically constructs a complete Obsidian Gate with an obsidian landing platform at a safe altitude ($Y=35..85$), clearing any obstructing rock.

---

## 4. Dual-World Persistence Architecture

To guarantee the Nether is generated alongside the normal world and remains 100% persistent:

### 1. In-Memory Dimension Partitioning
- `GameState` tracks `s.dimension: "overworld" | "nether"`.
- Chunk storage partitioned:
  - Overworld chunks: `s.overworldChunks` (cached in memory).
  - Nether chunks: `s.netherChunks`.
  - When switching dimensions, meshes of the old dimension are unmounted from the Three.js scene, and the destination dimension's chunks are meshed and rendered.

### 2. Persistent Storage Keying
- **Database & LocalStorage**:
  - Overworld: Stored under active `worldId` (e.g. `<default-world-id>`).
  - Nether: Stored under `${worldId}_nether` (e.g. `<default-world-id>_nether`).
- **Block Edits**:
  - Block modifications made in the Nether persist into `${worldId}_nether`.
  - Block modifications in the Overworld remain unaffected.
  - Players can build, mine, and explore in both dimensions indefinitely.
- **Atmosphere & Sky Adaptation**:
  - In the Nether: Dark crimson fog (`#330808`), hide sun/moon/stars/clouds, soft deep-red ambient lighting.

---

## 5. Phased Implementation Roadmap

- **Phase 1 (Complete)**:
  - Implemented [`src/game/terrain/netherGenerator.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/terrain/netherGenerator.ts) (3D cavernous terrain, bedrock ceiling/floor, lava ocean $Y \le 31$, 5 biomes, giant fungi trees, glowstone stalactites, ore veins).
  - Benchmarked at `2.27ms` per chunk with 100% solid bedrock boundaries and all 5 biomes verified.
- **Phase 2 (Complete)**:
  - Implemented Nether Gate detector and igniter ([`src/game/entities/netherGate.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/entities/netherGate.ts)).
  - $4 \times 5$ obsidian frame detection, $2 \times 3$ portal block ignition (ID 98), frame breakage cleanup.
  - Coordinate translation ($8:1$ Overworld $\leftrightarrow$ Nether).
  - Auto-constructed destination portal gate on safe cavern floor with $6 \times 7$ obsidian landing terrace and ambient Glowstone beacons.
  - Dimension Manager ([`src/game/state/dimensionManager.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/state/dimensionManager.ts)) with dual chunk partitioning and persistence under `${worldId}_nether`.
  - Atmospheric adaptation in [`src/game/engine/renderLoop.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/renderLoop.ts) (deep crimson fog `#330808`, warm crimson directional and ambient lighting, hiding sun/moon/stars/clouds).
  - Dimensional warp screen vignette and audio effects in [`src/components/Game.tsx`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/components/Game.tsx) and [`src/game/sfx.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/sfx.ts).
- **Phase 3 (Complete)**:
  - **Server & SQLite Persistence**: Enhanced `server/index.js` routes (`POST /api/worlds/:id/join`, `POST /api/worlds/:id/blocks`, `DELETE /api/worlds/:id`) to automatically resolve `${worldId}_nether` from the base world, maintaining isolated block edits, chest inventories, and player coordinates in the SQLite database alongside the Overworld.
  - **Nether Environmental Interactions**:
    - *Water Evaporation*: Water bucket pouring (`curBlock 135` / ID `39`) in the Nether instantly vaporizes into steam with a puff and sizzle SFX.
    - *Exploding Beds*: Right-clicking a bed (`hit.id === BED_BYTE || BED_ID`) triggers an immediate explosive TNT blast with "Intentional Game Design" notification.
    - *Soul Fire*: Placing fire on Soul Sand (`57`) or Soul Soil (`632`) produces blue Soul Fire (`ID 630`).
  - **Nether Entities & Zombie Pigman**:
    - Created `createPigmanMesh()` in [`src/game/entities/mobs.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/entities/mobs.ts) with pink skin, decayed zombie patches, snout, and golden sword.
    - Updated [`src/game/entities/spawner.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/entities/spawner.ts) so Nether mob spawning selects from `["pigman", "pigman", "skeleton"]`, finding open cavern floor above lava ($Y=35..95$) below the bedrock roof.
    - Clear previous dimension mobs on transition to avoid cross-dimensional wandering.
  - **Nether Minimap & Cartography**:
    - Updated [`src/game/engine/worldMap.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/worldMap.ts) to slice below the bedrock roof ($Y < 120$) and map the cavern floor and lava oceans.
  - Verified with [`scripts/test-nether-phase3.mjs`](https://github.com/martintimmer/hollow-web-mc/blob/main/scripts/test-nether-phase3.mjs) and [`scripts/probe-nether-gate.mjs`](https://github.com/martintimmer/hollow-web-mc/blob/main/scripts/probe-nether-gate.mjs).
- **Phase 4 (Complete)**:
  - **Nether Fortress Procedural Generation** ([`src/game/terrain/netherFortress.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/terrain/netherFortress.ts)):
    - Grand elevated 4-way crossway ($7 \times 7$) with massive support pillars extending down towards lava ocean level.
    - Long 5-wide bridge spans of Nether Bricks (`ID 58`) with Red Nether Brick parapets (`ID 574`) and periodic vertical support pillars every 12 blocks.
    - Nether Wart garden chambers with Soul Sand (`ID 57`) beds planted with Nether Wart (`ID 500`).
    - Outdoor Blaze Spawner balcony overlooking the lava lake with Monster Spawner (`ID 633`) and Glowstone beacons (`ID 47`).
    - Fortress treasure alcoves with loot chests (`ID 43`) containing diamonds (`ID 32`), gold (`ID 33`), iron (`ID 30`), obsidian (`ID 15`), and nether wart.
  - **Ruined Portal Structures**:
    - Decayed obsidian frames with Crying Obsidian (`ID 93`), Magma Blocks (`ID 76`), and hidden Gold Blocks (`ID 33`).
    - Ruined portal loot chest stocked with obsidian, crying obsidian, and golden tools.
  - **Seamless Chunk Integration**:
    - Integrated directly into [`src/game/terrain/netherGenerator.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/terrain/netherGenerator.ts) with chestSink wiring into `s.chestMap` in [`src/components/Game.tsx`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/components/Game.tsx).
    - Verified with [`scripts/test-nether-phase4.mjs`](https://github.com/martintimmer/hollow-web-mc/blob/main/scripts/test-nether-phase4.mjs).
- **Phase 5 (Complete)**:
  - **The Ghast 3D Entity & Aerial Kinematics** ([`src/game/entities/mobs.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/entities/mobs.ts) & [`src/game/entities/spawner.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/entities/spawner.ts)):
    - Created `createGhastMesh()`: $2.2 \times 2.2 \times 2.2$ cubic off-white body with closed eyes, weeping tear streaks, animated mouth, and 9 dangling tentacles swaying with sinusoidal wave physics.
    - True 3D aerial levitation flight across cavern airspace ($Y=48..78$), bypassing ground collision and immune to fire and fall damage.
    - Extended visual aggro range ($42\text{m}$), tracking players and keeping a distant standoff hover distance ($15..28\text{m}$).
  - **Ghast Fireball Projectile & Deflection System** ([`src/game/entities/ghastFireball.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/entities/ghastFireball.ts)):
    - Charged fireball launch with warning face glow, luminous glowing core, dynamic point light, and flame particle trail.
    - Authentic *"Return to Sender"* mechanic: swinging or hitting near a flying fireball deflects it with $1.4\times$ speed back along the player's look vector!
    - Explosive impact on blocks and player, dealing blast damage and triggering explosion VFX/SFX.
  - **Wildlife in Nether**: Animals are strictly prohibited and purged from the Nether; only Nether-native monsters (Ghasts, Zombie Pigmen, Skeletons) populate the dimension.
  - Verified with [`scripts/test-nether-phase5.mjs`](https://github.com/martintimmer/hollow-web-mc/blob/main/scripts/test-nether-phase5.mjs) and browser traversal probe.
- **Phase 6 (Complete)**:
  - **Netherite Metallurgy & Smelting** ([`src/game/smelt.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/smelt.ts) & [`src/game/recipes.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/recipes.ts)):
    - Smelting Ancient Debris (`ID 149`) in furnace produces Netherite Scrap (`ID 1038`).
    - Crafting: 4 Netherite Scrap (`1038`) + 4 Gold (`33`/`49`) crafts into Netherite Ingot (`ID 1035`).
    - Crafting: 9 Netherite Ingots craft into a solid Netherite Block (`ID 501`).
    - Crafting Upgrades: Combining Diamond gear (Sword `572`, Pickaxe `32`, Axe `279`, Shovel `573`) with Netherite Ingot upgrades to Netherite gear (`1040`, `1037`, `1030`, `1039`).
  - **Blast Resistance & Fireproof Physics** ([`src/game/terrain/regionMutations.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/terrain/regionMutations.ts) & [`src/components/Game.tsx`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/components/Game.tsx)):
    - Ancient Debris (`149`), Netherite Block (`501`), Obsidian (`15`), and Crying Obsidian (`93`) are completely blast-proof and immune to explosion craters, enabling TNT/bed blast-mining.
    - Netherite items are fireproof and immune to lava burning.
- **Phase 7 (Complete)**:
  - **The Respawn Anchor** ([`src/game/recipes.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/recipes.ts), [`src/game/interaction/playerInteraction.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/interaction/playerInteraction.ts), [`src/components/Game.tsx`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/components/Game.tsx)):
    - Crafting: 6 Crying Obsidian (`ID 93`) + 3 Glowstone (`ID 47`) in 3x3 crafting grid produces Respawn Anchor (`ID 601`).
    - Anchor Charging: Right-clicking with Glowstone (`ID 47`) in the Nether increases charge up to 4/4 with light and feedback.
    - Nether Spawning: Right-clicking sets Nether respawn point; on death in the Nether, player respawns at anchor and consumes 1 charge. Depleted anchors fall back to world spawn.
    - Overworld Explosion: Interacting with a Respawn Anchor in the Overworld triggers an explosive blast (*"💥 Intentional Game Design: Respawn Anchors explode in the Overworld!"*).
    - Blast-proof: Anchor block is completely immune to TNT and explosion craters.
  - Verified with [`scripts/test-nether-phase6-7.mjs`](https://github.com/martintimmer/hollow-web-mc/blob/main/scripts/test-nether-phase6-7.mjs) and all 6 regression test suites.
