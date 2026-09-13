# Could we translate & sandbox-run the entire Java Minecraft in a browser?

**Question (2026-08-27):** "If we'd have all the assets like `github.com/PrismarineJS/node-minecraft-assets` — could we translate and sandbox-run the entire Java game in a web browser?"

**Short answer:** *Assets alone are not the game* — but with the PrismarineJS data ecosystem as the data layer there are **three proven-practical routes**, in order of promise for a project like this one:

| Route | What it means | Legal | Effort | Verdict |
|---|---|---|---|---|
| **A. Data-driven re-implementation** (what Hollowpine already is) | Use the asset packs as registries/JSON/textures and rebuild gameplay against them | Clean for our own engine code (assets stay Mojang's — see §Licenses) | Large but incremental — we're already 60% there | ✅ **Recommended** |
| **B. Bytecode port (Eaglercraft recipe)** | MCP-decompile → TeaVM Java→JS + GL1.3→WebGL2 shim + WebSocket proxy | Grey (decompiled Mojang client code; ToS) | 1–2 person-months for a *frozen old version* | ⚠️ Shown to work (1.5.2), caps at old versions |
| **C. JVM-in-WASM (CheerpJ-style)** | Run the real JAR unmodified via an OpenJDK/WASM runtime | Requires licensed game files | Days to demo, suffers GLFW/OpenGL/audio/socket shims + perf | 🚫 Not practical as a shipped game |

---

## 1. What `node-minecraft-assets` actually gives you

Repo: `PrismarineJS/node-minecraft-assets` — a thin Node wrapper over the versioned asset submodule `PrismarineJS/minecraft-assets` (from `rom1504/minecraft-assets`).

**Contains (per version folder, e.g. `data/1.8.8/…`):**
- `items.json`, `blocks.json`, `blockstates`, `models` (block/item model JSONs, the canonical minecraft format)
- textures (`getTexture(name)`, `textureContent[name].texture`), sounds, lang files
- recipes, tags, enchants, particles, entity data

**What it does NOT contain:**
- The game engine: no terrain algorithms (no biome/noise/caves), no physics, no AI, no chunk meshing, no lighting engine
- No networking/protocol implementation (that's the sibling project `minefix/minecraft-protocol`, which *is* proven to speak the modern server protocol — mineflayer bots join real 1.16–1.21 servers)
- No shaders, no fonts/menu code, no input handling

So: **assets = the skin of the game, not the body.** Our v0.1.107+ catalog work is exactly this pipeline — we already consume asset packs to generate `blocks.ts`, `atlasData.ts`, thumbnails, recipes, and C#-style block models.

## 2. Route A — data-driven rebuild (recommended; where we live today)

Feasible and already demonstrated by this repo. Browser-sandbox "entire Java game" decomposition and maturity:

| Subsystem | Status here | Remaining to "entire game" | Notes |
|---|---|---|---|
| Block/register data | done (1173 ids via assets) | version drift (we use 1.19.3) | regenerate from `minecraft-assets` v1.19.3 |
| Textures → atlas | done | tiles baked (done); need per-biome tinting + animated frames | same as vanilla renderer |
| Models (JSON) | partial (cube/stair/door/fence/bed shapes) | **full model-JSON loader** (the biggest fidelity win: 800+ block variants incl. rails, torches-walls, panels, signs, chests, gates) | effort: medium; we've done the hard byte-level atlas proofs |
| Terrain | done (multi-noise continentalness/erosion/etc. — already vanilla-style splines) | caves (cheese) + 1.18+ noise-3D, structures parity | medium-high |
| Physics/Movement | done (AABB + step + gravity ≈ vanilla numbers) | fluid interaction & piston detail | low |
| Gameplay | partial (survival/crafting/chests/xp/hunger, redstone-lite) | villager trading loops, enchanting, brewing UI, redstone physics, armor/enchant tables, advancement trees | high but parallelizable |
| Mobs/AI | partial (cow/sheep/pig/chicken + hostile spawner) | vanilla AI graph (pathfinding, senses) | medium |
| Multiplayer | real (WebSocket UX; DB persistence) | protocol parity: join with real Minecraft clients via a JS `minecraft-protocol` bridge (minestream-ready) — proven tech, medium effort | medium |
| Rendering | done (WebGL2 single atlas, worker meshing, greedy pending) | light-level smooth lighting (4-bit), baked AO already; night culling; mipmapped atlas (planned) | low-medium |
| Mods | ❌ inherently | Only server-plugin-ish via API, or VM route | not applicable |

**Sandboxing:** fully supported by browsers today — `WebGL2`/`WebGPU`, Web Workers (we already use), SharedArrayBuffer/Atomics (with COOP/COEP for cores), IndexedDB persistence, Web Audio, Pointer Lock, OffscreenCanvas, WASM for hot loops (a greedy mesher in Rust→WASM is a known winner — `urath`).

Effort to reach "full game" parity on this path: roughly **6–10 person-months** for one focused engineer with the existing codebase (multiple parallelizable subprojects), vs. **2–4 months** for route B — but route B freezes you onto one old version and leaves you unable to do modding, whereas route A is future-proof and self-owned.

## 3. Route B — the Eaglercraft formula (proven, but "old-version lockdown")

What's known-working (public evidence):
- **Eaglercraft** (LAX1DUDE): decompiled **Minecraft 1.5.2** (MCP) → **TeaVM** cross-compile to JS; a custom compatibility layer re-implements Mojang's **fixed-function OpenGL 1.3 → WebGL 2.0** ("minimal changes to the source, graphics look the same"); multiplayer joins real 1.5.2 servers via a modified **Bungeecord that accepts WebSocket clients**, unwrapping to TCP.
- Author's own description: *"**proof of concept … not very fast or stable**"* — the value was the emulator code, not shipping a full game.
- TeaVM/JVM-in-browser (CheerpJ — OpenJDK 8/11/17, Swing/AWT → Canvas, virtual FS, HTTP, JS interop) can in principle load a *modern* Minecraft JAR untouched, but you'd still need:
  - LWJGL/GLFW→WebGL/pointer-lock shims (huge, constant-update burden),
  - audio + WebSocket shims,
  - signed/chunk "secure" crypto flows,
  - **and** the game is 100× slower through a generic JVM-in-WASM for a voxel render loop (MC allocates heavily per-frame).

Why ports stop at old versions: modern MC replaced fixed-function GL with modern shader pipelines and heavy obfuscation/version churn - each update rebuilds the whole decompile/TeaVM pass.

## 4. Licenses — the part we must say out loud

- `minecraft-assets` repos: **assets belong to Mojang** (their EULA). Widely used for developer/testing/bots, but distributing them publicly (in an app store / commercial site) is a real exposure. Our 1.19.3 pack comes from such archives — keep redistribution internal unless you change policy.
- Route B additionally reproduces **decompiled Mojang client code** — grey area at best (Eaglercraft exists, but Mojang has historically not licensed it; it survives because it's *proof-of-concept* and old).
- Our own engine (route A) has no such issue — we write everything ourselves.

## 5. Recommendation

1. **Stay on Route A** and keep asset consumption *data-pipeline-only* (generate code from the pack once, never ship the raw pack), plus our own alternatives for anything sensitive.
2. Adopt the **model-JSON loader** next — it is the single highest-fidelity-per-effort move to make our in-world visuals match the wiki renders (which we've been hand-approximating).
3. If multiplayer-with-real-clients becomes a milestone, add a `minecraft-protocol`-based sidecar (JS-to-JS, no JVM) rather than any Java-side bridge.
4. Sandbox confidence is already proven by this very build: 512² atlas, worker meshing, sub-frame pipelines, modern APIs.

**Verdict:** Yes — with the Prismarine asset packs (plus its data/protocol siblings) we can rebuild and sandbox-run a full Minecraft-like game in the browser... and we already are. What a "full run" changes is scope: route A = complete parity in months, route B = old-version literal port in weeks (legally grey), route C = not a game. Recommend A.

---

*Sources: `PrismarineJS/node-minecraft-assets` (README + submodule), `rom1504/minecraft-assets`, `Eaglercraft` (LAX1DUDE, TeaVM + WebGL shim + WS-Bungee proxy), `CheerpJ` (OpenJDK-in-WASM), `urath` (Rust→WASM greedy mesher for three.js), and this repo's own catalog/atlas/worker pipeline.*
