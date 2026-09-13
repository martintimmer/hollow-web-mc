# Bedrock (iPad) UI Recreation Plan — Boot Loading, In-World Loading & Settings

> Analysis of the 3 reference captures supplied with the project (local: `docs/images/ref/game-loading.jpeg`, `loading.jpeg`, `settings.jpeg`).
> Goal: 100%-style accurate recreation of layout/behavior (functionality stays ours — Bedrock has far more functions; the style is the reference).
> No code changed. Plan only.

---

## 1. Reference screens — element inventory

### 1.1 `game-loading.jpeg` — Boot / Title Loader (dark screen)

| Element | Appearance | Details (measured on 1080×822) |
| :--- | :--- | :--- |
| Background | Flat near-black `#111` | full screen, no vignette |
| MINECRAFT logo | 3D stone-block wordmark, centered | width ≈ 41% of screen width (≈445px), positioned ~25% from top; stone-white faces `#c9c5c0`-ish, dark extruded bottom edge `#2b2a29`, block-grid seams |
| Boot spinner | White pixel glyph, ~55px tall | 5-segment arc (half-circle + 2 uprights) drawn with the MC pixel font (`K`-shaped arc); classic Bedrock boot spinner - **rotates/flips ~0.5s per step** (12 o'clock → 1 → … cycle) |
| Progress bar | Hollow outline bar, centered | width ≈ 39% (≈420px), height ≈ 13px; **white 2px border, transparent fill**; progress fill = segmented **teal/turquoise `#3ab3a0`-ish** blocks (68% filled), remainder `#c9c5c0` light-grey fill continues to 100%; trailing empty space is hollow/outline-only |
| Percent text | `68%` with **green tint `#4cbd4c`-ish**, MC pixel font, centered below bar | ~26px |
| Behavior | Deterministic ticker to 100% (not real progress; boot). On 100% + splash sound → next screen | — |

### 1.2 `loading.jpeg` — In-World Loading overlay (world joining)

| Element | Appearance | Details |
| :--- | :--- | :--- |
| Background | **Blurred live 3D world** (frozen frame, darkened ~40%, heavy gaussian blur) | world continues rendering behind; a voxel scene (Nether-ish) visible |
| MINECRAFT logo | Same wordmark, **small top-center** (~120px wide, small 3D extruded) | — |
| Dialog | Rounded-corner white-grey frame: **header bar** (light grey `#d9d9d9`, centered "Loading" in pixel font, bottom hairline dark), **body**: near-black `#0d0d0d` panel with **animated dither texture** (scrolling dirt-grain noise), **tip text** centered white pixel font, **progress bar at body bottom**: green glass bar (~4px) with **marching-stripes gradient animation** (light→translucent green), inside dark inset track with pixel border |
| Tip | "Diorite, you either love it or hate it." — cycles per load stage | white `#ffffff`, MC font ~14px |
| Cursor | White pixel arrow visible (dev/desktop only) | — |
| Behavior | Bar animated with marching stripes; tips rotate 3-4 s; world fade-in on finish | — |

### 1.3 `settings.jpeg` — Bedrock Settings (iPad)

| Element | Appearance | Details |
| :--- | :--- | :--- |
| Scaffold | Top bar: "SETTINGS" white-grey header strip, centered uppercase letter-spaced (~24px), under it `‹` back-chevron top-left | strip width 100%, height ~44px, bg `#c9c9c9`-ish with darker bottom hairline |
| Left sidebar | Fixed-width ≈ 30% (≈320/1080), full height, `dark #1e1e1e`; scrollable entries | — |
| Sidebar groups | Section headers "Controls" / "Social" / "General" in small grey caps above clusters of entries | headers not clickable |
| Sidebar entries | 2-cell list: **icon box** (28×28, black-bg rounded-4 with white pixel glyph) + **label** white 14px; hover → lighter; **selected** = grey bg `#4c4c4c` + white 3px left-edge indicator + underline accent on label (white) | Accessibility (thumb, big, starred) sits at top with larger icon+label |
| Right content | Scroll column ~70% width; sections flow: colored headline (e.g. **VIDEO** blue `#3b9dff`) + subtitle grey; then **card blocks** dark `#242424` with inner heading (caps small) and control groups separated by hairlines | — |
| Controls seen | • label+desc left, value right (`82°`) • **green slider** (track light `#5c5c5c`, filled green `#2fae3d`-bright, square white thumb, under-track tick marks) • **segmented buttons** row (3-4 segments; selected = green with dark text; unselected = mid-grey `#4a4a4a` with white text; disabled = dimmed) • **toggle** small white-box w/ `1`/`0` • caption paragraphs; **warning box**: grey-strip bar w/ explanatory text | — |
| Typography | Minecraft-look pixel font everywhere; uppercase section headers; labels sentence case | — |
| Behavior | selection accentuates green + slider follows with pop sound; changes persist per tab (our prefs API) | — |

Reference palette (measured-by-eye, verify visually in implementation):
`#111` boot · `#1e1e1e` sidebar · `#242424` cards · `#4a4a4a` segmented · `#2fae3d`/`#3fc94b` greens · `#3b9dff` blue heads · `#c9c9c9` header · `#d9d9d9` dialog · `#ffffff` text · teal `#3ab3a0` boot fill · green `#4cbd4c` pct text.

---

## 2. Recreation guidance — how to build each screen at 100% accuracy

### 2.0 Shared foundations

1. **Pixel font**: options in order of fidelity & asset policy (project = "zero external images"):
   - (a) CSS-stacked `font-family: press-start/monospace` is not MC-accurate — reject.
   - (b) **Procedural glyph canvas**: reuse the 256×256 atlas painter approach — draw the 26 letters of the Bedrock font (5×7-ish grid, known shapes) once into an atlas canvas, exposed as a `CanvasTexture`, then render text with per-glyph `<canvas>` strips or CSS `background-image` per text run. Cost ~150 lines; 100% accuracy, zero downloads. **Recommended**.
   - (c) Load `minecraft.ttf` from CDN — violates zero-asset rule; only as final fallback (documented).
2. **Button/segmented icons**: procedurally draw icons (controller, camera, gear…) into small canvases (same painter), or reuse existing emoji/`▣` glyphs in current menus until glyph atlas lands.
3. **MINECRAFT wordmark (the hardest asset)**:
   - Options: (A) **geometry recreation** — draw in 2D canvas: for each of 8 letters draw per-letter slab: light face + top face + dark extruded right/bottom edge, 3D-ish isometric shear (like existing celestial cubes). 8 letters × ~20 px cells = accurate enough at 445px width; two sizes (boot 445px, world-load 120px); cache to `CanvasTexture`; add subtle `filter: drop-shadow`.
   - (B) CSS-extruded blocky rectangles w/ `transform: skew` per letter — less accurate but fast.
   - (C) Ship the official logo PNG **as a bundled asset** (48KB jpeg artifact already in thumbs) — pragmatic; note the policy exception in FEATURES.md if used.
   - **Recommend A**, fallback C for 1.21-fidelity.
4. **Boot spinner**: 5 segments = draw with the glyph painter at 5 rotation steps (0°,72°,144°,216°,288°) as offscreen canvases; animate by swapping `background-image` every 500 ms; or single `canvas` with rotation transform + stepper easing (approx.).
5. **Marching-stripes progress** (world load): CSS `background: repeating-linear-gradient(135deg, #57d957 0 8px, rgba(255,255,255,.25) 8px 16px)` on a 6px-tall 84%-width track, keyframed `background-position` translate; plus trailing glow. Teal boot bar: segmented blocks = `linear-gradient(90deg, #3ab3a0 …)` with 1px gaps via `::after` mask, or canvas tile.

### 2.1 Boot screen (`BootScreen.tsx` — replaces the flat dark <div> behind Title)

- Layout: flex column center; logo (45% w, margin-top ~22vh) → spinner (55px, my-auto) → bar (39% w, 13px, white 2px border; inner `.boot-fill-teal` width = pct%) → `pct%` green text 26px.
- Behavior: RFC ticker: `% = min(100, elapsed*2.5%)`; after 100% and ≥1.2 s → crossfade to title; any click skips → title instantly.
- Where: currently the TitleScreenModal shows immediately on load; plan = BootScreen as phase-0 (per the reference flows), Title on top after.
- Sounds: menu boot SFX pair in sfx.ts (`playBootTone` = deep bong + sparkle ding), volume respected.

### 2.2 World load overlay (replace the current plain progress overlay in Game.tsx)

- Transfer world renderer **already renders** during buildSpawnArea — keep it (perf already layered) + apply `filter: blur(10px) brightness(.6)` on the canvas container via class toggle while loading (CSS-only, GPU compositing — no readback).
- UI = reference 1.2: centered dialog (max-w-640): header "Loading" bar; body min-h-24 bg near-black with **animated dither** (`background-image: repeating-conic-gradient(#1111 …) ~ 8px` translate keyframes 1s linear); tip text centered MC-pixel 14px white; green marching bar bottom-inset.
- Data: `loadMsg` strings exist in Game.tsx buildSpawnArea ("Folding hills…", "Illuminating the village…") → tip pool; add a global `TIPS` array (20 Bedrock-flavor tips: "Diorite, you either love it or hate it.", "Flint and steel...", "Creeper... er, careful tonight!", "Heal up by eating..." etc.); rotate every 3.5 s; progress = real loadPct (already computed) → bar width; 100% → fade-out AND unblur (CSS transition .6s).
- When world-select is open (before world), boot spinner style bar reused in that modal intro — optional.

### 2.3 Settings screen (restyle `OptionsMenu.tsx` to Bedrock '3-column' grid  -- describe exact structure:

- New layout: `<div class=bedrock-settings>` grid `[240px 1fr]` on ≥768px, stack on mobile:
  - **Header strip**: `‹` back (functions: close modal / back to pause menu) center-title "SETTINGS" (letterSpacing .35em, uppercase).
  - **Sidebar**: groups from a `SETTINGS_NAV` tree: `Main` (Accessibility), `Controls` (Keyboard & Mouse / Controller / Touch), `Social` (Party), `General` (General / Gameplay→Video / Audio / Account / Global Resources / Storage / Language / Creator). Map each leaf → existing tab content: Video→existing `video` tab content; Gameplay→`gameplay`; Audio→sfx master/music sliders (new small tab reusing sfx.ts setVolume); Language→static "English" row (display-only for now); Storage→chest/world stats; Accessibility→vibrance/brightness rows already in video — move copies. Items w/o backend = disabled caption "Coming soon" (style-only reference per user).
  - **Content pane**: render leaf's config from a **declarative field schema** driving 4 control widgets: `labelRow` (title+desc+value), `slider` (green, +tick marks + pop sfx), `segments` (array of options, selected green, disabled grey — matches existing preset slider "smooth/balanced/beautiful" and FOV row already in code), `toggle` (white box 1/0 — matches shadows/autoStep booleans in prefs). Each control binds to existing `s` + `/api/preferences` save (already loaded via handleApplyPreset / prefs).
  - Section headers colored (`#3b9dff` VIDEO-style) + warning strip for unsupported combos (e.g. "Ray tracing...": bind to detected `webgl2`/device? style-only default hidden).
- CSS tokens (index.css additions): `.be-green`, `.be-panel`, `.be-seg`, `.be-sel`, `.be-hairline`, `.be-icon-box`, `.be-scroll`. Textures: none (CSS only), matching 100% measured layout.

### 2.4 Screen flow & audio glue

- Flow: BootScreen (game-loading) → Title (existing, restyle top strip) → WorldSelect (existing) → In-world Loading overlay (blurred) → play. Esc → pause overlay (existing plan doc §3) → Settings reached from pause (Bedrock parity: pause → Settings).
- sfx.ts additions: `playBootTone`, `playMenuHover` (tiny tick), `playMenuClick` (thock), `playSliderTick` (spring arpeggio, sped 1.2), `playTabSwitch` (page-flip whoosh) — all procedural, ≤ 20 lines each.

---

## 3. Implementation phases (each independently shippable)

| Phase | Scope | Files | Verify |
| :- | :--- | :--- | :--- |
| 1 | Pixel glyph atlas + BootScreen (spinner/logo/teal bar) | new `src/game/ui/font.ts`, `src/components/gui/BootScreen.tsx` | side-by-side vs `game-loading.jpeg` (screenshot at 1080×822) |
| 2 | In-world load overlay + tips + blur/честь unblur | `Game.tsx` loading UI + new `LoadingOverlay.tsx` | vs `loading.jpeg`; FPS during load stays ≥ ~30 (blur is GPU-composited) |
| 3 | Settings restructure (sidebar + schema widgets) | `OptionsMenu.tsx` → `SettingsScreen.tsx` + `index.css` tokens | vs `settings.jpeg`; FOV/slider/segments actions still persist |
| 4 | Menu SFX + pause-integration (Settings from pause) | `sfx.ts`, `PauseMenu.tsx` (from UI_IDLE_PAUSE_PLAN) | smoke: open/close all screens no console errors |
| 5 | *(optional)* Bedrock green segmented for Game-Mode toggle & preset buttons to unify style | `OptionsMenu` rows | visual regression pass |

Acceptance per screen: overlay at 1440×900 & iPad 1024×768 viewports; pixel font renders crisply (no browser smoothing — `image-rendering: pixelated`); all controls reachable; existing prefs API responses still load (network preserved).

## 4. Logging plan

Complete each phase → update `docs/ROADMAP.md` changelog, `docs/UI_IDLE_PAUSE_PLAN.md`/this file status → ✅, `npm run snapshot` tag (per project snapshot rule).
