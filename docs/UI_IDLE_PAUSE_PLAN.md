# UI / Idle / Cursor Plan — Esc Pause Menu, 1-FPS Idle & Pointer-Lock Cursor

> Research & implementation plan only (no code changed). Reference images saved locally under `docs/images/ref/menu/`.
> Sources: minecraft.wiki/w/Game_Menu, w/Java_Edition_GUI_textures, w/Options, w/Controls (fetched 2026-08-23).

---

## 1. Reference images (local, verified 8-bit PNG)

| File | What it shows | Dimensions | Source |
| :--- | :--- | :--- | :--- |
| `java_menu_26.2.png` | **Java 26.2 Game Menu** — the canonical Esc menu: white-grey panel, "Game Menu" title, button stack | 620×348 | minecraft.wiki GameMenu_26.2.png |
| `bedrock_menu_26.0.png` | **Bedrock 26.0 Pause Menu** — darker panel, MINECRAFT logo, 4 stacked buttons (Resume Game / Settings / Browse Add-ons! / Save & Quit), icon row bottom, live 3D player skin right w/ Dressing Room, world blurred behind | 620×349 | minecraft.wiki Pause_Menu_(Bedrock_26.0) |
| `java_multiplayer_pause.png` | Java multiplayer pause (transparent bg variant) | 620×332 | minecraft.wiki Java_Edition_Multiplayer_Pause_Menu_Transparent |
| `java_18w43a_pause.png` | Historical Java pause screen (1.14-beta era) | real png | fandom 18w43a_menuscreen.png |
| `bedrock_pause_2022.png` | Bedrock pause 2022 (older layout, shows Social pill top-right) | real png | fandom |
| `bedrock_game_menu_old.png` | Bedrock game menu (classic) | real png | fandom Game_Menu_Bedrock.png |
| `Inworld_menu_background.png` etc. | **actual texture assets** of the in-game menu (16×16 repeatable panels, header/footer separators) — downloaded as error-pages (minecraft.wiki serves them auth-tagged); the pattern is: 16×16 tiled dark-grey with 4px border highlight — reproducible procedurally in our atlas approach | 16×16 | minecraft.wiki Java_Edition_GUI_textures |

## 2. Layout analysis (Java vs Bedrock → what fits our project)

| Element | Java (26.2) | Bedrock (26.0) | Our project today | Target |
| :--- | :--- | :--- | :--- | :--- |
| Panel | wide white-grey panel, centered, MC beveled edges | darker vertical panel left side | single centered modal (`OptionsMenu.tsx`, tabs) | Esc menu = **new overlay** reusing modal styling |
| Header | "Game Menu" title text centered | MINECRAFT logo top-left | ⚙️ Options title | "Game Menu" header + small logo |
| Main actions | Back to Game (wide) · row: Advancements · Statistics · icon row (report bug / feedback / share) · row: Options... · Multiplayer... · wide: Save and Quit to Title | Resume Game · Settings · Browse Add-ons! · Save & Quit (stacked) · bottom icon row (world-options / help / camera) | Options modal has tabs (video/gameplay/world/gen) | Compose from **existing** components: Resume (close), Options... (open OptionsMenu), Statistics (open AuditLogsModal), Save & Quit (open WorldSelectModal), camera icon = snapshot button, help = docs link |
| Player preview | none (flat panel) | live 3D skin animation right side + Dressing Room | `PlayerPaperdoll.tsx` already exists (paperdoll on GUI screens) | paperdoll on pause overlay right side (or top-right in panel), spin slowly |
| Icons row | 3 small square icons with red badges | 3 icons bottom-left + Social pill top-right | none yet | 3 icons: camera/screenshot, feedback(↗ github), world-map quick toggle; Social pill → multiplayer status (online count) |
| Background | pause over frozen game view | blurred live world behind | our modal uses full-screen dim overlay | darken 25% + `backdrop-blur` (CSS) over preserved WebGL buffer (canvas keeps last frame — free) |
| Pausing behavior | **world is paused** (Java) / Bedrock keeps running in multiplayer | — | worldTime keeps flowing with menu open | **PAUSE worldTime + mobs + villagers + liquids + music when menu open** (= the 1-FPS goal + parity) |

## 3. Implementation plan — Esc pause overlay (new `PauseMenu.tsx`)

1. `PauseMenu` component (guis list): panel ~420px, MC beveled classes already used by OptionsMenu (`.mc-*` css exists in index.css); buttons as vertical stack:
   - **Back to Game** (primary) → same handler as close-menu (`handleOpenMenu` inverse: setMenuOpen(false), active=true, re-lock pointer)
   - **Options...** → renders `<OptionsMenu>` inner (reuse tabs state; no nesting issue: OptionsMenu already a modal; design PauseMenu to swap content in-place instead of stacking modals)
   - **Statistics** → `<AuditLogsModal>` (block edits log already exists)
   - **Save and Quit to Title** → flush state (`dirtySave`) → `<WorldSelectModal>` (title screen path exists)
   - icon row: 📸 snapshot (reuse archive snapshot fn), 🗺️ world map toggle, ℹ️ help → opens README/docs
2. Right-side paperdoll: reuse `PlayerPaperdoll` with idle animation; under it "Dressing room" placeholder = existing options tab.
3. Hooks: `onKeyDown Escape` currently does everything manually (closes chest/furnace/inventory/map/chats then toggles menu) — keep order, but **change ultimate outcome to `setPauseOpen(true)`** (new state) instead of directly menuOpen+OptionsMenu; the options tab opens inside pause.
4. Mobile: top-left ☰ button (currently ⚙️ Menu) opens pause overlay instead of Options directly; title/loading flows unchanged.
5. Textures: panel background procedural (CSS gradient + 4px border `#373737`/`#FFFFFF` bevel = already the `.mc-hud-slot` pattern) — no asset loads needed.

## 4. Implementation plan — idle = 1 FPS (resource saving)

Goal states where the game **must** idles: (a) tab hidden/blurred, (b) Esc/pause menu open, (c) title/world-select screens, (d) death screen, (e) inventory/chest/furnace/craft/trade modal open (menu-typical pausing), (f) before first click (loading done, not active yet).

Current waste: `frame()` keeps rAF at 60fps + renderer.render + full sim in ALL those states (menu open still renders the world & ticks time/mobs).

Steps:
1. `const paused = () => document.hidden || !s.active || menuPauseOpen || s.dead || titleOpen || worldSelectOpen || inventoryOpen || chestOpen || furnaceOpen || craftTableOpen || tradeOpen;` (single `useIdleIdle()`-style computed at top of `frame()`).
2. If `paused()`:
   - cancel rAF (`cancelAnimationFrame(s.reqId)`) and start `s.idleTimer = setInterval(idleTick, 1000)`;
   - `idleTick`: nothing but (a) keep last canvas frame (no render), (b) on 4th tick (4 s) push one `PULSE` telemetry line `{kind:"IDLE"}`, (c) check resume conditions → if unpaused: clearInterval + `requestAnimationFrame(frame)` + resume snapshot timers.
   - Resume triggers: visibilitychange, first click on canvas, modal close handlers (they already call setState; add effect that observes `s.active`/menu states each 250 ms interval while idle to cancel).
3. Inside `frame()` while active but modal open: skip `step()`/mobs/villagers/liquids/furnace/mapdraw/render when paused — currently `if (s.active && !s.inventoryOpen) step(dt)` etc. — extend condition with `!s.paused` gate applied once.
4. World clock: freeze `s.time` when pause overlay open (Java parity) — don't advance timeFlow.
5. Audio: `tickAmbientMusic(dt…)` skip while paused; AudioContext can stay (no cost when silent).
6. Snapshot streaming: already gated by `s.active` ✓; archive gated too ✓ — during pause **no captures** (idle).
7. Multiplayer: on pause flush final position via WS (one PLAYER_MOVE), then no sends; existing loop only sends when movement delta > 0.02 — with keys cleared nothing sends ✓.
8. Expected result: browser tab hidden → rAF stops natively anyway; menu open → **0 renders/s, 0 sim ticks**, one lightweight interval; CPU from ~1 full frame each second only; verify by task-manager/monitor in Chrome performance panel (idle tick shows only 1 micro-tick per 1000 ms).

Plan A/B: if any resume-detection race appears (menu stuck), fall back to keeping rAF but guarding every heavy phase behind `paused()` (still near-zero cost, simpler sync; the "1 frame per second" goal then only applies to render: `if (idleFrames % 60 === 0) render(scene,camera)`).

## 5. Implementation plan — cursor capture (pointer lock)

Current behavior: `onMouseDown` does `cv.requestPointerLock?.()` once on first click. Problem: when pointer lock is NOT engaged (browser refused, or it lapsed after Esc, or user clicked outside then back), mousemove works only while the cursor is physically inside the canvas → moving the mouse outside the window stops look-around.

Real Minecraft parity: pointer locked during play; Esc unlocks + opens menu; clicking “Back to Game” re-locks. That's exactly what's needed here.

Steps:
1. **Pointer-lock state machine** in the engine effect:
   - `const lockErr = (e) => …` → on `pointerlockerror`: `showToast("🔒 Click inside the game to capture mouse")` and set `s.steering=false`.
   - `document.addEventListener("pointerlockchange", …)`: if `document.pointerLockElement === cv` → `s.pointerLocked = true`; else if `s.pointerLocked` (lost): if `s.active && !s.menuAnyOpen` → treat as Esc-pause (open pause menu, set active false) — parity with MC where Esc releases cursor + pauses; if a modal (chest etc.) is open → ignore (cursor already released there).
   - Request helper `tryLock()`: `const opts = { unadjustedMovement: true };` (Chromium) — try `cv.requestPointerLock(opts)` catch → `cv.requestPointerLock()` (Safari/FF no-args).
2. **Canvas mousedown**: always `if (!document.pointerLockElement) tryLock()`; remember `hadLock=true` so we resume steering without page reload.
3. **Movement handler** (`onMouseMove` currently `look(dx,dy)` from `e.movementX/Y`): under pointer lock `movementX/Y` are provided even when the OS cursor would have left the window — this alone fixes the reported problem **provided the lock is engaged**. Add fallback: when `!s.pointerLocked`, while `s.steering && s.active` still use movementX (movement events fire while inside the canvas) and hide the OS cursor (`css cursor: none` on canvas) so the game feels captured even pre-lock.
4. Any click while `document.pointerLockElement` set → normal game input (no re-lock spam).
5. Touch devices: unchanged (touch look already).
6. Esc key handling nuance: when pointer lock is active, pressing Esc **exits the lock in the browser** and the browser may not dispatch our `keydown` — the `pointerlockchange` handler above opens the pause menu (step 1b). When lock is NOT active, our existing `onKeyDown Escape` code path (close modals → open pause) runs as today. Both routes end in `PauseMenu`.
7. Trackpads: `unadjustedMovement` gives 1:1 deltas; on mac trackpads smooth acceleration is natural via their driver; no extra code. NB: keep `look(mx,my)` sensitivity constant; do not apply per-frame smoothing greater than 0.4 to avoid float.
8. Acceptance test list:
   - Lock engaged → move mouse far outside browser window → head still turns ✓
   - Esc → menu opens, OS cursor returns ✓; click Back to Game → cursor captured again, pointer disappears ✓
   - Click in game without lock (e.g., after F5 browser reload) → first click locks & wakes ✓
   - Window loses focus while locked → becomes "idle" 1-FPS state per §4 ✓

## 6. Changelog insertion (when implemented)

When code lands: mark in `docs/ROADMAP.md` changelog + set statuses in this file: [ ] → ✅ per section, snapshot tag, mention in `docs/GAMEPLAY_POLISH_SPEC.md` part 3 as UI/IDLE batch.

---

# Status update (2026-08-23 — shipped)

| Section | Status | Evidence |
| :- | :--- | :--- |
| §3 Pause overlay | ✅ shipped | new `gui/PauseMenu.tsx`; Esc flow + ⚙️ button → `pauseOpen`; Resume→Options…→Statistics(audit logs)→Save&Quit(world select); icon row = snapshot (one-shot encode→POST `?name=`), world map, help; right paperdoll w/ skin color |
| §4 1-FPS idle | ✅ shipped | `s.uiPaused` mirror effect (menu/pause/modal/title/world-select/dead); `frame()` gate cancels rAF & polls 1 s (`idleTimer`); no render/sim while paused; frozen world = canvas retention (free, preserveDrawingBuffer) |
| §5 Cursor pointer-lock | ✅ shipped | `tryLockPointer()` (unadjustedMovement try/catch fallback), request re-lock on canvas click; `pointerlockchange` → pause-when-unlocked-while-steering; `pointerlockerror` → silent no-op; Esc-unlock parity covered by the change handler |
| Bonus | Boot & load screens | `BootScreen.tsx` (orig. blocky wordmark "HOLLOWPINE", 5-step spinner, teal fill bar, green %), `LoadingOverlay.tsx` (header/body/tips/marching bar, original tips), `sfx.ts` playBootTone/playMenuClick/playMenuHover/playSliderTick/playTabSwitch, Settings restyled to 3-region Bedrock layout with `.be-*` CSS |

Deviation note: logo/tips are **original recreations** (own brand + own text) under the project's zero-asset-copyright policy — visual style matches the references, assets do not copy the original artwork.
