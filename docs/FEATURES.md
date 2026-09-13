# Hollowpine Web Minecraft — Feature Guide & Catalog

This document details all gameplay mechanics, 105+ Minecraft block materials, Infinite / Unlimited FPS & 120Hz ProMotion display detection, authentic Java & Bedrock Edition GUI styling with categorized Options Menu Tabs, Video Contrast adjustments, 25+ dynamic light-emitting blocks with colored point light shadows, authentic liquid fluid dynamics & waterfalls, 45-degree stairs, 3D voxel celestial bodies, and inventory features available in Hollowpine Web Minecraft.

---

## 1. Infinite FPS & High-Refresh Display Detection (120Hz ProMotion)

| Framerate & Display Feature | Description |
| :--- | :--- |
| **Hardware Refresh Rate Auto-Detection** | Real-time sampling of hardware display cadence detects the exact refresh rate of the device screen (e.g. **120 Hz ProMotion on iPad Pro**, 144 Hz gaming monitors, 240 Hz, 60 Hz). |
| **Infinite / Unlimited FPS (∞ FPS)** | Fully uncapped, unlocked frame rendering without artificial frame throttling. Renders at the maximum frame rate supported by the GPU/display. |
| **Framerate Cap Selector** | In **Video Settings**, choose between: `∞ Infinite`, `60 FPS`, `120 FPS` (iPad Pro), `144 FPS`, `240 FPS`, and `360 FPS`. |
| **Live HUD Framerate Telemetry** | Top-left HUD status bar displays real-time rolling FPS, detected hardware refresh rate, and active framerate target (e.g. `⚡ 120 FPS (120 Hz Display) · ∞ Unlimited`). |
| **High-Performance WebGL Pipeline** | Configured with `powerPreference: "high-performance"` and Retina resolution scaling (`devicePixelRatio: 2.0`) for crisp, responsive 120 FPS gameplay on Apple Silicon M2 iPad. |

---

## 2. Categorized Options & Settings Menu Tabs

The Minecraft Options / Pause Menu (`Esc` or `⚙️ Menu`) features authentic **Java & Bedrock Edition category navigation tabs**:

| Tab | Sub-Settings & Controls |
| :--- | :--- |
| **🖥️ Video Settings** | • **Max Frame Rate**: Toggle between `∞ Infinite`, `60`, `120`, `144`, `240`, `360` FPS.<br>• **Render Distance**: Adjustable from 4 to 16 chunks (64m to 256m) with real-time fog recalculation.<br>• **Color Vibrance / Saturation**: Adjustable from 60% to 220% (default 140%).<br>• **Brightness / Gamma**: Ambient exposure slider from 70% to 140%.<br>• **Image Contrast**: Live post-processing contrast slider from 70% to 160% (default 105%).<br>• **Dynamic Realistic Shadows**: Toggle celestial directional and point-light soft shadows. |
| **🎮 Gameplay & Controls** | • **Game Mode Toggle**: Switch between **Creative Mode** (flight enabled, double-tap Space to fly/fall) and **Survival Mode** (grounded physics, gravity, jumping).<br>• **Auto-Jump / Auto-Step**: Toggle automatic 1-block climbing on/off (Disabled by default; $45^\circ$ stairs always climb smoothly).<br>• **Controls Reference Table**: Quick desktop keyboard & mouse cheat sheet. |
| **☀️ World & Environment** | • **Time of Day Presets**: Instant Sunrise (Tick 0), Day/Noon (Tick 6000), Sunset (Tick 12000), and Night/Midnight (Tick 18000).<br>• **Time Manual Scrub**: Continuous 0–23999 tick range slider.<br>• **Time Flow & Speed**: Toggle time running/paused, and cycle day progression speeds (1x, 2x, 5x, 10x).<br>• **Fluid Dynamics Status**: Active monitoring for waterfalls and lava synthesis. |
| **🌍 World Generator** | • **World Seed Input**: Supports Java-compatible seed strings and numbers.<br>• **World Archetype Selector**: Standard, Amplified, Large Biomes, Islands, and Frozen.<br>• **Generate New World**: Instant procedural terrain re-generation. |

---

## 3. Controls & Interaction

### Desktop (Keyboard & Mouse)
- **Settings & UI:**
  - `I` or `📦 INV` Button: Open / Close Inventory (search now works in survival — type `tall grass` to find `124`/`1200`).
  - `E` or Right-Click: **Use / Place block / Enter aimed vehicle** (doors `105/106`, trapdoors `107/108`, chests `43`, beds, crafting `41`, furnaces `42/96`, villagers) — not inventory. Trading additionally requires crosshair-on-villager within 2.6 m.
  - `Q`: Drop held item as a pickupable world entity (survival decrements one, creative keeps its stack).
  - `T` / `C` / `Enter`: Open Multiplayer Chat (Enter to send, Esc to cancel).
  - `F`: Swap Main Hand and Left Hand (off-hand torch).
  - `R`: Recall / spawn-point menu. `B`: Builder/blueprint tools.
  - `⚙️ MENU` Button (Top-Left) or `Esc`: Open Minecraft Game Options Menu with Tabs.
  - `🗺️ MAP` Button (Top-Left) or `M`: Toggle Fullscreen World Map (M also closes; opening releases the pointer).
  - `⏩ +3h` Button (Top-Left): Advance time by 3 hours (3,000 ticks).
- **Movement:**
  - `W` / `A` / `S` / `D`: Walk forward, left, backward, right.
  - `Shift` (Hold): Sprint (increases movement speed and widens camera FOV).
  - `Space` (Hold): Jump (walking) or Ascend (flight).
  - `Double-tap Space` (Creative): Toggle Flying on/off. When turned off in midair, character falls from the sky.
  - `Shift` (in flight): Descend.
- **Flight & Game Modes:**
  - `G`: Toggle Creative mode vs. Survival mode.
- **Steering & Looking:**
  - **Click Canvas**: Lock mouse pointer and steer.
  - **Mouse Movement**: Rotate camera yaw and pitch.
  - **Mouse Scroll Wheel**: Cycle active hotbar item (zooms the fullscreen map when open).
- **Building & Inventory:**
  - **Left Click** (Hold in Survival): Break / Mine targeted block with progressive crack stages.
  - **Right Click** or `E`: Place active block (`1×1×1` `skirting` `1199`/`porch` `1211` centered `y` to `y+1`, `MeshBasicMaterial` `DoubleSide`) / liquid; toggles doors (open/close) & shutters; `1211` per-face `16×16` top/side edits via `editor.html` now correctly mapped (`6` groups `clearGroups`).
  - **Middle Mouse Click**: Creative pick-block — copies targeted block into active slot.
  - `1` – `9` / `0`: Select hotbar slots 1 through 10.
  - `X`: Toggle Sneak (slow walk, reduced bob).
  - `Y`: Quick 180° look-behind.

### Touch Controls (iPad / Mobile / Forced)
- **D-Pad** (`▲` `▼`): Move forward / backward. **Look joystick** (bottom-right): drag to steer camera (multi-touch safe).
- **HIT / TAKE / JUMP** buttons: dig, use-or-place, jump. Holding **JUMP** ascends while flying; double-tap toggles flight in Creative.
- **Settings → Gameplay → Touch Buttons: FORCED ON** shows all touch controls on any resolution (persisted per user in `user_preferences.touch_controls`, guests in localStorage).

## 4. Recent Additions (2026-09)
- **Trade gate** (`villagers.ts: canTradeWith`): range ≤2.6 m + voxel line-of-sight + crosshair raycast, enforced on HUD button, right-click, touch take and `E`; modal auto-closes on walk-away.
- **Farmer pens** (`terrainGenerator.ts: VillagePlan.pens`, `structures.ts: buildPen`): fenced 7×7 pens with hay bale; 2–3 calm cows each; farmers visit via `tending_cows` AI (librarians never do).
- **Stray cats** (`animals.ts`, `spawner.ts`): solitary explorer-tier roamers, herd/social exempt, sign-nameable, never rideable.
- **Pet persistence**: `world_animals` merge-by-id saves (nether trips can no longer wipe pets); 🐾 Pets modal with teleport-to-pet.
- **World map**: M toggles both ways (pointer released on open), 20 Hz minimap, spawn pins + cursor readout, right-click to add, sidebar list (teleport / rename / home / remove), spawns persisted per user+world (`spawn_points` table, `/api/spawns`, 20/world cap).
- **Porch stairs** (`1205` left rail / `1206` right rail): two-step stair + integrated railing in `chunkMesh.ts: pushPorchStair`, porch tile `890`, full mesher parity.
- **Atmosphere**: sun/moon-lit horizon LOD + clouds (`MeshLambertMaterial`), moon halo sprite, sun +15% (`2.415`), ~10 s smoothed weather-light transitions (`weatherMachine.ts`).
