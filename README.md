# Hollowpine — Browser-Based Voxel World Engine

An endless, procedurally generated 3D voxel sandbox game built with **React 19**, **Three.js**, **TypeScript**, and **Vite**.

---

## 🌟 Highlights & Added Features

- **Procedural Voxel Engine**: Infinite chunked terrain generation with Value & Simplex noise, multi-tier elevation, and biomes (Plains, Oak Forests, Pine Taigas, Snowy Peaks, Frozen Oceans).
- **Procedural Town & Village Generator**: Spawns regional villages with interconnected roads, central plazas, stone wells, lampposts, crop gardens, and 5 detailed house designs with staircases and interior furniture.
- **Bundled Game Assets**: A vanilla-style 512×512 terrain atlas (baked into the bundle, validated by `catalog/textureCheck.mjs`), procedurally synthesized SFX (WebAudio) plus optional ambient music tracks, and hand-made pixel-art paintings.
- **Realtime Cartography**: Live 2D circular minimap and zoomable fullscreen map with altitude-based relief shading.
- **Dynamic Lighting & Atmosphere**: Day/night atmospheric cycle, PCF soft shadows from the sun, starfields, procedural voxel clouds, and dynamic point lights for placed lanterns.
- **Full iPad & Mobile Support**: Touch drag camera aiming, on-screen 4-way D-Pad, dedicated touch action buttons, and iOS Safari gesture optimization.
- **Survival Economy**: 37-slot stack inventory (27 main + 10 hotbar), authentic crafting (2×2 inventory / 3×3 crafting table), furnaces with fuel + lit-state lighting, server-persisted 27-slot chests, and emerald villager trading with daily restock.
- **Villagers & Pets**: proximity + line-of-sight + crosshair trade gate, farmer cow pens with tending AI, solitary roaming stray cats, and server-persisted named pets with teleport-to-pet list.
- **World Map & Spawns**: live fullscreen map (spawn pins, cursor readout, right-click to add) with a per-user server-persisted spawn list (teleport / rename / home / remove).
- **Custom Stairs**: porch stairs with integrated left/right rails (blocks `1205`/`1206`), textured from the porch asset.
- **Atmosphere**: lit distant-horizon LOD + clouds that follow sun/moonlight, moon halo glow, and ~10 s smoothed weather-light transitions.
- **Procedural Sound**: 100% synthesized WebAudio SFX (dig, place, step, explosion, hurt, splash, trade chime) — zero audio files.
- **Minecraft Seed Hashing**: Compatible with Java 32-bit string seed hashing.

---

## 🎮 Controls

### Desktop
- `W`, `A`, `S`, `D`: Move
- `Shift` (Hold): Sprint / Descend (in flight)
- `Space`: Jump / Ascend while held (in flight)
- `Double-tap Space` (Creative): Toggle Flight Mode
- `F`: Swap Main Hand and Left Hand
- `G`: Toggle Creative / Survival Mode
- `T` / `C` / `Enter`: Open Multiplayer Chat
- `R`: Recall / Spawn-point menu (`B`: Builder/blueprint tools)
- `M`: Toggle Fullscreen World Map (also closes it)
- `E` or `Right Click`: Use / Place Block / Enter aimed vehicle
- `Q`: Drop held item as a pickupable entity
- `Left Click` (Hold): Dig / Break Block
- `Middle Click` (Creative): Pick targeted block into active slot
- `X` / `Y`: Sneak / 180° look-behind
- `I`: Open Material Inventory (`1` – `9`, `0` or `Scroll`: hotbar)
- `Esc`: Pause / Settings Menu

### iPad / Mobile
- **Drag Screen / Joystick**: Look / Rotate Camera
- **On-Screen D-Pad**: Move Forward / Backward (`▲` `▼`)
- **Touch Buttons**: `HIT` (dig), `TAKE` (use/place), `JUMP` (hold to ascend while flying; double-tap toggles flight in Creative)
- **Hotbar**: Tap any item along the bottom to equip
- **Settings → Gameplay → Touch Buttons: FORCED ON** shows these controls on any resolution

---

## 📁 Technical Documentation

For deep technical details on algorithms, data structures, and subsystems:

- 📖 **[System Architecture & Function Reference](docs/ARCHITECTURE.md)**: Detailed breakdown of the terrain generator, meshing pipeline, Vertex Ambient Occlusion (AO), physics, collision detection, and raycasting.
- 📋 **[Feature Catalog & Block Guide](docs/FEATURES.md)**: Catalog of 120+ block materials, 5 world generation types, and game mechanics.

---

## 🛠️ Tech Stack & Build Commands

- **Language:** TypeScript 5.9
- **Frontend Framework:** React 19 (`react`, `react-dom`)
- **3D Graphics:** Three.js v0.185.1 (`three`, `@types/three`)
- **Build Tool:** Vite 7.3.0
- **Styling:** Tailwind CSS 3.4.19
- **Backend:** Node.js (Express 5 + sql.js SQLite) — `server/index.js`

### Prerequisites

- **Node.js 20 or newer** (tested on Node 24) and npm
- Python 3 is only needed for the optional catalog scripts (`npm run catalog:*`)

### Quick Start (development)

```bash
# 1. Install dependencies
npm install

# 2. Start the game API — creates a fresh SQLite DB in data/ on first run
node server/index.js            # http://127.0.0.1:5401 (override: WEBMC_PORT)

# 3. Start the client dev server (proxies /api + /ws to the API above)
npm run dev                     # http://127.0.0.1:3000
```

Open **http://127.0.0.1:3000**, register any username + password on the title
screen, and play. The API port can be changed with `WEBMC_PORT` and the client's
proxy target with `WEBMC_API_URL` (defaults to `http://127.0.0.1:5401`).

Optional API environment variables: `WEBMC_CORS_ORIGINS` (comma-separated
cross-origin allowlist; same-origin only by default), `WEBMC_RELAY_SECRET`
(shared secret that enables dev↔prod cross-sync), `SIM_ADMIN_USERNAME`
(admin account for the optional sim server, `server/sim.js`).

### Production build

```bash
# Type-check, generate the build tag, and emit dist/ (game + seed + blocks + build pages)
npm run build

# Preview the built bundle locally (still needs the API above; preview port 4173)
npm run preview
```

Deploy the contents of `dist/` behind a static server/reverse proxy that forwards
`/api` and `/ws` to the API process. Database files and logs live under
`data/` and are git-ignored — never commit them.
