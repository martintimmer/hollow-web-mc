# L2 Vertex Lighting & Advanced Systems Implementation Plan

## 1. Objectives & Scope
1. **L2 Vertex Lighting Baking**:
   - Calculate ambient occlusion + 4-bit sky light + 4-bit block light in `meshWorker.ts`.
   - Modulate vertex colors with combined lighting ($C_v = C_{base} \times (AO \times \text{lightFactor})$).
   - Offload GPU point-light evaluation, maintaining 1 dynamic light for held torches only.
2. **Survival Loop: Food Eating & Consumption**:
   - Edible items (Bread, Cooked Beef, Apples, Golden Apples, Carrots, etc.).
   - 1.6s eating animation timer (`s.eatingTimer`, rhythmic bob, crumb particle bursts via `spawnBurst`, procedural chewing & gulp WebAudio sound).
   - Restore hunger & saturation; decrement hotbar stack in Survival.
3. **Hostile Mob Combat & AI Enhancements**:
   - Zombie: direct pathing, contact melee with sound & red hit effect.
   - Skeleton: maintains ranged distance, fires procedural arrows at player via `arrowMgr`.
   - Creeper: proximity fuse sizzle ($1.5\text{s}$ countdown), white flashing swell, triggers TNT explosion.
   - Player knockback and invulnerability frames ($0.5\text{s}$).
4. **Redstone Mechanics (Phases 1 & 2)**:
   - Lever (toggle power state, switch texture/dir, sound).
   - Redstone Lamp (direct power toggle: Unlit ID 104 <-> Lit ID 83).
   - Redstone Dust: BFS power propagation up to 15 blocks.
5. **Dynamic Weather & Positional SFX**:
   - Weather state machine (clear, rain, thunder) with falling precipitation particles.
   - 3D panned ambient audio with cave resonance detection.
