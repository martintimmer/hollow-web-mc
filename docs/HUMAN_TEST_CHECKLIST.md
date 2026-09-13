# Human Visual Test Checklist

Read on demand only — never injected. Agents: when an implementation is complete,
append ONE short entry here (latest-first, what to open / toggle / look for) and
repeat it in the final response. Expire entries older than ~30 days or already re-verified.

## Human visual test checklist (current features)

Calibrated corner readout + D0 sweep (2026-09-08, refresh to pick up):
1. ISO preset: bottom-left P-cluster now reads `… LUX EV15.0 ISO MATRIX` — noon sun ≈ EV15, overcast ≈ EV12, moonlit ≈ EV−3…−6, torch cave high-ISO. `▲n` appears only when real zones exceed the window (EV8 noon wall should show ▲; EV17 ≈ none).
2. D0 sweep (record numbers): clear-noon sun wall / shaded side / anti-sun face / torch 2 m / open sky / full-moon snow / new-moon cave — compare `?meter=1` LUX + anchor row against the table in `docs/LUX_PRECISION_PLAN.md` §4 and report deltas.
3. Anchor watch: `?meter=1` anchor row stabilizes after ~30 s in one place (no hunting); teleport day→night re-converges without exposure pumping.

EV8–17 capture window + true lux (2026-09-08, refresh to pick up):
1. Lighting tab → Dynamic Range slider now runs 8–17 (number = stops). Set EV8 at noon facing sunlit wall + shade: one end must CLIP (white wall blows OR shade crushes, not both held). Slide to EV17: both hold, no clipping, no dimmed shadows.
2. ISO preset + ?meter=1: noon white wall reads ~80–100k LUX, shaded wall ~10–20k, moonlit snow ~0.2–0.5, torch at 2 m tens of LUX; window banner shows `[lo…hi]` + clip counter that falls to ~0/63 at EV17.
3. Opposite-face check (ISO): sunlit wall face bright, side faces dimmer, anti-sun face dark-but-readable (bounce, not black). Legacy preset numbers/look unchanged except the shared EV window.

TTL meter P1 — real-pixel zones in ISO mode (2026-09-08, refresh to pick up):
1. Lighting tab → 🧪 ISO E-TTL (beta), then append ?meter=1 to the URL: overlay header shows ISO tag, `ttl 9x7` row reads `on` with a nonzero mean + ms, and a 9×7 ASCII zone map appears (bright cells track windows/torch/sun, dark cells track caves/shade as you pan).
2. Metering Spot + ISO preset: aim at a torch then dark ground — exposure snaps with the imaged center (not just the analytic taps); switch back to 📷 Legacy Sim — zone row reads `off`, behavior identical to before.
3. No regressions: matrix mode + legacy preset look exactly as yesterday; FPS unchanged (meter pass runs every 5th frame at 108×84).

Lighting tab + exposure presets (2026-09-08, refresh to pick up):
1. Esc → Settings → 💡 Lighting tab: top shows 📷 Legacy Sim (active) and 🧪 ISO E-TTL (beta) buttons; all light settings (metering, EV, comp, vibrance, brightness, contrast, weather, shadows, sun glint) live here now — Video tab no longer has them.
2. Press 🧪 ISO E-TTL (beta): scene gets visibly brighter/neutral (sliders reset to 100, EV 13) and bottom-left P readout shifts ~2-3 stops vs Legacy on the same view; torch flames stay controlled, night still reads as night.
3. Press 📷 Legacy Sim: exact old look returns (140 vibrance, 105 brightness/contrast, EV 12). Log out/in: last preset + lighting sliders persist.
4. ?meter=1 overlay + Matrix/Center/Spot still behave as before under both presets.

Movement: ground stickiness + stair climb (2026-09-07, refresh to pick up):
1. Walk up a staircase holding W only (no jump, Auto-Jump OFF): smooth continuous climb, no judder, no getting stuck mid-flight. Same for slabs and single doorsteps.
2. Stand still anywhere (flat, slab, stair tread): HUD state stays "on ground" solidly, no flicker to "falling", no micro-bobbing of nearby geometry.
3. Walk off a 1-block ledge: at most a hair of coyote glide, then normal fall (no floating, no hover).
4. Straddle seams: stand half on a stair tread / slab edge / fence post — no bobbing, no push-off, HUD stays "on ground" (this was the lift/fall yo-yo).

Paintings flush + framed (2026-09-07, refresh to pick up):
1. Hang a canvas, then strafe to view it edge-on: it sits ~flush on the wall (no floating gap) with a thin dark frame around the art.
2. Left-click the canvas: pops off + item drops (if it doesn't, note creative vs survival — the path is wired in both).
3. Hang 3× on the same big wall: different random canvases of the largest fitting size each time; box the wall down to 1-wide: 1×1s only.

Emitter lux normalization + no-cutoff lights (2026-09-07, refresh to pick up):
1. Render distance 12, night, torches spread 150+ blocks: every torch lights its ground and shows a halo — walk the line and confirm no 40-block wall where glow starts/stops.
2. Dark cave, hold torch: surroundings readable, flame bright but not a white nuke; snow/desert at night near torch doesn't blow out. Unequip torch: scene lifts further (meter no longer sees the flame).
3. Face a torch 2 blocks away in the dark, then turn 90° so it leaves the center: exposure steps up as it exits the metering circle.
4. Night resolution 1–500 lux: moonless cave mouth (~1 lux, near-black but not crushed) vs moonlit desert (~420, bright) vs moonlit snow (~700) — smooth gradation between them, nothing flattening/clipping above 300. Day look unchanged.
5. Camera-correct torch exposure: inside house at night staring at the lantern/torch — flame keeps shape and color (hot, not white blob), room dimly readable; step outside into the dark — scene brightens up; from outside, the house windows/lanterns glow bright against the dark.
6. White balance: hold a torch at night and stare at a white wall ~2 s — the orange cast visibly neutralizes as your "eyes" adapt (snapshot shows ~2700K); turn to moonlit snow — image drifts cooler (~7500K) over ~1.5 s. Sunset light goes honey-warm. Nether sits warm (~3500K).
7. Daylight kills flames: at noon place a torch/lantern — no light pool, no halo, flame looks like a plain unlit stick; it only starts reading as a light source toward dusk. Night behavior from items 2–5 unchanged.
8. Metering modes (Options → Video → Light Metering, default Matrix): Matrix — pan across sun/shadow splits, nothing clips, balance holds; Center — exposure follows the middle of the frame; Spot — point at a torch then at dark ground and watch exposure snap in ~0.15 s with no highlight protection (torch goes detailed-gray, ground blows). Spot is shadow-aware: face a shaded wall at sunset with sun to the side and the wall lifts readable; swing to the sun and it steps down hard. Snapshots print ISO + mode (e.g. ISO3200 f/2.8 1/60 SPOT).
9. Program Auto + comp dial: bottom-left shows live `P f/4 1/250 ISO200 MATRIX 17mm 3.4klx` updating twice a second as you look around (bright sun → small aperture/fast shutter/ISO100; dark cave → f/2.8 1/60 high ISO). Tap the ±0.0 button for the 7-step comp dial (-1…+1): +1 visibly lifts shadows ~1 stop even past the auto ceiling. Persists + rides the cinematic profile.
10. Focal length + extremes: FOV slider now reads `70° · 17mm`; HUD mm tracks live (sprint/zoom changes it). Stare into the sun: readout runs to f/8, 1/4000, ISO100 with a dark frame and a visible disc + halo; look at plain sky: iris opens back toward f/5.6, ISO100.
11. No-banding skies + true sun shadows: sunset gradient shows smooth blue→orange with no contour lines (fine grain if you pixel-peep). Shadowed wall beside sunlit ground meters ~1k vs sky ~3.5k (was ~2.6k) — face a shaded wall at noon, confirm it lifts readable instead of sitting black.
12. Lantern glow at 30–50 blocks (night): the lantern body itself glows warm (not a dark cage), halo + lit ground around it visible from 40+ blocks. Place a lone lantern, walk back 50 blocks — still glowing. Check HUD version tag changed (hard-refresh if not).
13. Moon + night sky audit (night, clear): moon is a crisp disc with a small tight halo (no more giant glow ball); moonlit ground shows soft directional shading; overcast nights are darker than clear ones; torch-lit areas unchanged.
14. Backlit matrix fix: indoors facing a dark wall with bright windows/sky at the frame edges — meter now exposes for the wall (hundreds of lux, not thousands). Snapshots show the split `(sc…+em…)` proving scene vs emitter contributions.
15. Comp to +3.0 + true lunar cycle: comp dial now runs -1…+3 (scrollable); +3 lifts deep shadow ~3 stops past the ceiling. New-moon nights are now truly dark (~1 lux — every midnight was a full moon before); full-moon desert reads a few hundred lux.
16. Night lift + meter debugger: dark scenes display slightly brighter than metered (tapered to zero above 300 lux so torch pools stay anchored) — night looks like night, readable. Halo sprites auto-dim at high gain so they stay halos instead of white squares. Append ?meter=1 to the URL for a live 3Hz per-source readout (lux total + scene/emitter split, gain/ISO/program, WB, flash, moon phase) to diagnose any reading on the spot.
17. Active crosshair metering: the meter now reads the engine-selected block + face (same raycast as block interaction) — aim at leaves/glass/torch and the ?meter=1 overlay names the locked block, face, and distance. All readouts say LUX (no more x/klx). Point at the sun in daylight: millions of LUX, exposure slams to minimum — including low sunset sun over foreground terrain (disc visibility is marched separately from the view ray).
18. Viewmodel exposure exemption + DOF grain: hands/held items keep constant color day and night (no more white hands); defocused backgrounds show film grain instead of 4-5-bit posterization. Enable DOF, focus a close block, confirm the background goes soft-grained not banded.
18. Calibrated program + cache reboot: bottom-left program follows the exposure-guide families on a -4EV dark-cinematic base grade at comp ±0 (10000 LUX → ~f/8 1/250 ISO100; sun → f/8 1/8000 ISO100 unchanged; comp dial ±3 around the new base). Settings → gameplay tab bottom has ♻️ Reset Cache & Reboot (clears SW + Cache API, reboots cache-busted, keeps login/worlds).
19. Moon metering: full moon overhead now meters ~6000 LUX with a mild exposure dip (was: plain night sky, no response). New moon: no response, correctly.
15. Daylight recalibration (6am anchor): morning sunlit ground ~1500 lux with shadows ~400; dusk sky glow in the hundreds, not thousands; noon look unchanged (gain ≈ 1 as before). Torches now switch fully off at noon and fade back through morning/dusk.

Lighting: stall warning, torch dim, fullbright hands, distant glow (2026-09-07, refresh to pick up):
1. Join a world: the red "World load stall detected" card must NOT appear on a normal load anymore (it now fires only if progress freezes 12 s+ at some %, and names the stage: gen/mesh/wildlife/atlas).
2. Night, torch on a wall: clearly dimmer pool of light than before (night boost cut ~2.4×→~1.35×); held torch also dimmer. Day torch nearly unchanged.
3. Hold any block at night near a torch: the hand/sleeve stays flat constant color (no orange wash sweeping over it); the held block itself is still lit normally.
4. Night, village/row of torches from 100+ blocks: every torch has a visible halo and the ground/walls around them are warmly lit without walking closer (baked into chunks + halo sprites, no distance cutoff). Place a torch far away: its halo + ground tint appear as soon as its chunk meshes.

Shadow audit fixes (2026-09-07, refresh to pick up):
1. Walk toward a distant village/building from far away: its shadows fade in correctly as you approach (previously chunks meshed while far stayed shadowless forever). All nearby buildings now cast, not just some.
2. Standing still, place a tall dirt pillar: its shadow appears within a second without moving (previously needed walking to another chunk). Mine it: shadow gone just as fast.
3. Toggle Options → shadows OFF/ON (or switch smooth↔beautiful): shadows apply instantly, no stale shadows, no relog needed. Boats now cast full hull+oar shadows; wall paintings no longer cast a hard rectangle.

Paintings P0–P3 (2026-09-07, refresh to pick up; needs fresh seed or `/regenerate` for village canvases):
1. Take a painting item, E on a wide wall: largest fitting canvas appears (Kebab on 1-wide, Fighters-class on 4-wide); E on floor/ceiling: "hang on walls" toast.
2. Left-click the canvas: pops off + painting item drops at your feet.
3. Break a wall block behind a canvas: it falls and drops within ~1 s; relog: still hanging.
4. Fresh village: real vanilla-art canvases hang inside houses next to the wool art.

Eye-adaptation exposure meter (2026-09-07, refresh to pick up):
1. Sunny noon at EV 12 (Standard): tilt from bright sky down to shadows — the image swings hard both ways (sky view darkens the ground, shadow view blows the sky) with punchy contrast. Dark areas now lift strongly (up to ~22× at EV 12). Adaptation takes ~1.3 s either direction.
2. Same test at EV 15–16: the image goes visibly flatter and stays balanced — shadows lift a lot, highlights roll back into range instead of clipping. Metering is center-dominant in log space: it follows what you point at, so centering a shadow lifts it while the sunlit background around it blows much brighter (low EV).
3. NEW — glow + sun dominance: at EV 11–12 stand where sunlit sand meets a dark building shadow — the sand and sun bloom with a real glow while the shadow stays deep (big dark/bright difference). Stare directly into the sun: it is by far the brightest thing, adaptation slams down and even the sky around it darkens; look at plain sky nearby: bright, but clearly dimmer than the sun disc itself. At EV 15–16 the glow nearly vanishes (flat HDR look).
3. Desert noon looking down at sand: sand renders brighter than the horizon sky. Snapshots print measured lux + gain, e.g. `~3400 lux ×0.88`.
4. EV 12 static default view is unchanged (gain ≈ 1, contrast factor 1.0); the Contrast slider still works and stacks with the EV flattening.

HDR in Rec.709 + gamut cleanup (2026-09-07, refresh to pick up):
1. Options → Video → Color Gamut is now sRGB / P3 D65 / Rec.709 only — BT.2020 is gone (browsers can't output true HDR anyway; a stored BT.2020 falls back to sRGB).
2. EV 13–14 at noon looking at sun + landscape: highlights compress smoothly into white with no hard clip edges, and shadow areas keep visible detail instead of going muddy/black. Compare 12 (neutral) vs 14 vs 16 — each step should look like a brighter exposure of the same grade, not a different grade.
3. If 13–14 still looks too contrasty or too flat for your taste, report which — the operator (Khronos Neutral) can be swapped for AgX (more filmic, flatter) on request.

Rain + sun + dynamic range (2026-09-07, refresh to pick up):
1. `/weather rain`: all drops now fall at one even speed — no fast streaks mixed into the slow rain. Snow unchanged (slow, even).
2. Look at the sun at noon and near sunset: a single flat square, never a diamond, no small satellite squares around it. It reads bright/hot against the sky.
3. Options → Video → Dynamic Range slider (11–16 EV): 12 = neutral reference; 11 darkens moodily; 14–16 pushes an extreme HDR look (hot sun/sky compress, shadows deepen). Persists across reloads; in 🎬 Cinematic it swaps with the cinematic profile like the other video settings.

Villager trading v2 (2026-09-06, refresh to pick up; works on existing worlds):
1. Give yourself an emerald, find a Desert Nomad, open trade: today's 3 offers show; pick Emerald ×1 ➔ Sand ×6 → emerald leaves your inventory, sand ×6 arrives, villager purse shows Emerald ×1, offer locks to "Traded".
2. Re-click the locked offer: refused until rotation. Sleep past dawn: offers re-roll (different subset, counters reset).
3. Log out on Day N, log back in: HUD still shows Day N (never resets); traded offers stay locked and the purse keeps its emeralds.

Cinematic timelines & scenes (2026-09-07, refresh to pick up):
1. Enter 🎬 Cinematic → press Q (marks camera A, toast confirms) → fly somewhere else → press Q (marks B, Director opens automatically).
2. In Director set Duration 5 → ⏳ Process: "loading N chunks" bar fills without fps loss → ▶ Play: camera glides A→B in 5s with smooth ease + turning to B's look direction; Q or ⏹ stops mid-flight, Esc exits cinematic entirely.
3. Save the take (name optional) → it appears under 🎬 Cinematic scenes with coordinates → Load restores marks + video settings; ▶ Auto-play loads, processes, and plays by itself; 🗑 deletes.
4. Map (same build): hold left mouse + drag pans the map (no spawn popup after dragging); scroll zooms; zoom fully out: the whole visible area keeps filling progressively (near-first) instead of stopping after a few chunks; right-click → Add with empty name saves as "Spawn N"; 🛬 Spawn still teleports.
5. Director is a compact panel docked right with no dimming — game stays visible behind it. Esc anywhere in cinematic jumps straight back to normal play (settings restored). If the pause menu opens over cinematic, its button reads ⏹ STOP Cinematic and returns to normal game.

Cinematic observer mode (2026-09-07, refresh to pick up):
1. Esc → Game Menu → row next to Statistics now has 🎬 Cinematic: click it — HUD/hotbar/crosshair and hand vanish, world keeps running, camera starts at your eye position.
2. Fly with WASD (+arrows), Space up / Shift down, mouse-drag look, wheel = fly speed: camera passes straight through blocks, ground, any height, no collision and no suffocation.
3. While flying: press ⚙️ in the bottom pill → change FOV/render distance/shadows/DOF → close: they apply live; ✕ Exit (or Esc → pause menu) restores your normal settings exactly; re-enter Cinematic: your cinematic FOV/video setup is still there (persisted).
4. In cinematic: left/right click does nothing (no mining/placing), M/I/E/T are ignored; Esc with Options open closes Options and stays cinematic; Esc otherwise exits to the pause menu.

Map 30fps fix (2026-09-07, refresh to pick up):
1. Press M: map opens instantly and stays smooth (was 0-1fps) — pan/zoom freely, game keeps running at 30fps+.
2. Zoom fully out on first open: distant areas fill in progressively over ~1-2 s (grey patches resolving into terrain) instead of freezing; villages/markers/player arrow still draw.
3. Stand still with map open: compass/village/coordinates readouts stay stable (no flicker); walk: they update within a second.

Hand, torch light, All order (2026-09-06, refresh to pick up):
1. Hold a torch (or any item) in the right hand: item floats at the screen edge, no arm/hand mesh visible; empty hand shows the hand again.
2. Place a torch on ground/wall at night: it lights up and STAYS lit (previously went dark on remesh); mine it: light goes away.
3. Creative All Items: stable vanilla-group order (building → colored → natural → functional → redstone → tools → combat → food → rest, customs last) instead of numeric id order.

Offhand, clock, audio (2026-09-06, refresh to pick up):
1. Hold something in the left hand (F swaps): it sits ~20% closer to the camera than before.
2. Top-left HUD: 📅 Day N now sits right next to the clock time; the old top-center day pill is gone.
3. Music pause button: pause, wait 10 s, confirm silence (previously a pending play could restart it); unpause resumes.
4. Audio settings: drag SFX and Music sliders — volume changes audibly; if you open settings before any sound played, dragging still takes effect.

Slow flames + far fire glow (2026-09-06, refresh to pick up):
1. Flames drift lazily now (10× slower wobble + slow light breathing) — no frantic flicker.
2. At night, village campfires/fireplaces read as warm pools from across the map again (full range restored), and keep their light slot even among nearby torches. Particles still only appear up close.

Fire range + flame motion (2026-09-06, refresh to pick up):
1. Campfire/fire light pool now ends ~9 blocks out (was ~17) — from 50 blocks you see the flame dot but no landscape wash. Torches/lanterns unchanged.
2. Flames visibly shimmer: crossed fire quads sway/stretch gently, and the light itself breathes (watch the pool edge at night). Logs, lanterns and torches stay rock still.
3. If any glowing block strobes, stretches, or detaches from its flame, report which block + time of day (shader gate check).

Fire stoking + crackle (2026-09-06, refresh to pick up):
1. E with empty hand/stick on a fire block or soul fire: same stoke burst + flare + fade as campfires, plus a loud crackle pop.
2. Stand 1–2 blocks from a fireplace: irregular crackling; walk 4+ blocks away: silent. Stokes and placement bursts also crackle.

Campfire ignition + stoking (2026-09-06, refresh to pick up):
1. Place a campfire: embers + smoke burst out immediately on placement, then settle into the steady ambient stream.
2. With empty hand or a stick, press E on the campfire: swing + ember/smoke burst and the light flares ~2× for ~2 s, then fades back (re-poking restarts the flare).

Cobweb density family + web spider (2026-09-07, refresh to pick up):
1. Creative catalog, place side by side: Cobweb Sparse (single diagonal plane), Cobweb (crossed planes like fire), Cobweb Dense (full 4-plane volume) — none is a cube anymore. Place Sparse facing N/S vs E/W: the diagonal flips with your direction. Catalog icons are crisp 96px: dark web tiles with 1/2/3 density pips, speckled Spider Egg.
2. Walk into a web: movement slows hard, falling is cushioned with no fall damage; sword/shears still harvest it. Top-center badge reads 📅 Day 1, counting up each dawn.
3. Search "spider", hold Spider Egg, right-click a web: a clearly visible banded spider (red eyes, silk thread to the web) hatches and crawls the top, sides, and inside of the web block; right-click stone: hint toast, egg kept. Hold a Sign and right-click its web to name it (no more crash) → pets menu shows 🕷️ with Go only (no Summon; Go teleports you to it). Hold the Mug, right-click its web: the spider rides the mug in your hand (legs wiggling); right-click another web to relocate it. Break the web of a >4-day spider: it falls to the ground and stays your pet; a young one disappears. Held webs also render as planes in first person (not cubes), and catalog icons show the density (diagonal band / full / layered web + pips).
4. Torches, campfires, fireplaces, portals: flames stay bright at any distance now — bigger flame quads, no fog wash (walk 60+ blocks away and compare before/after). Light reach now matches vanilla levels (torch 14, soul torch 10, magma 3, brewing stand 1, etc. — full table in kb/mechanics/light-levels.md). Newly glowing: all 17 candles (3), enchanting table (7), brown mushroom + dragon egg (1), amethyst buds (4/2/1), respawn anchor (12) — meshes unchanged, only their light.

Fireplace fumes (2026-09-06, refresh to pick up; relog so the emitter registry rebuilds):
1. Stand next to a lit fireplace/campfire: orange embers rise steadily plus grey smoke wisps; place a fire block: same ember stream; lava: occasional embers.
2. Motes now come from the block itself even when it's the only emitter around (previously only dense forests/cities ever triggered any).

Keys, banner, block batch (2026-09-06, refresh to pick up):
1. Q now attacks/mines like left-click; B drops the held item; N opens the blueprint modal (was B).
2. The red bottom error bar only appears for real game errors now — confirm it stays hidden during normal sim play (foreign-frame noise is logged, not shown).
3. From the 3D tab spawn and check: chain (visible links now), chain/repeating command blocks, fire + soul/campfire fire (cross flames, not cubes), brewing stand (solid base), kelp, all saplings, bell (solid, no holes), compost heap, cactus (inset column), cobweb (webby cube), corals/fans/mushrooms/stems (crosses), dripleaf (stem + leaf), cave vines, bamboo fence gate (fence rails).

Sim 3D tab + lantern (2026-09-06, refresh :DEV to pick up):
1. Open creative inventory on :DEV: a new "3D Models" tab (torch icon, top row) lists ~118 vanilla 3D blocks — torch, chain, chest, cake, lanterns, candles, campfires, bed, doors, anvil, bell, flowers... (tab is hidden on :PROD prod).
2. Place a lantern + soul lantern: solid cage + cap + knob with no hollow/see-through faces; rist glow at night like a torch.
3. Spawn one of each from the tab and eyeball for transparent-box or x-ray artifacts.

Door-to-road paths (2026-09-06, needs fresh seed or `/regenerate`):
1. Every house door opens onto a path that runs to the village road — no door facing grass with the path leading to a different spot on the wall.
2. Raised houses (porch above ground): a staircase (stone-brick, oak, or cobble — varies per house) descends from the porch to the path; about half the staircases have a lantern post at the foot. Walk up and down with no jumps over cliffs.
3. Grade-level doors sit flush on their path with no stray steps.

Flowers + particles (2026-09-06, needs fresh seed or `/regenerate` for scatter):
1. Plains/meadow walk: dense mixed flower fields (tulips, cornflower, oxeye, allium, lilac, sunflower...), not just dandelions/poppies; all render as cross billboards with no transparent-box or x-ray artifacts.
2. Stand under trees / near torches, campfires, lava: leaf-flutter, rising embers/smoke and shimmer motes drift from the blocks (were clumped/invisible before).
3. Wither rose renders as a billboard but never spawns wild.

Village interiors refresh (2026-09-06, needs fresh seed or `/regenerate` — old houses keep old furniture):
1. No water inside any house (cleric temple corner is shelves now; fisherman has dry barrels/crates, no tank). Forge lava channels stay — those are intentional.
2. Every bed is 2 blocks long horizontally (bed + matching blanket foot), including beds against the south wall that used to render as a single block.
3. Living houses have a table (fence + slab + stools) or writing desk (plank + slab + stool), a bookshelf stack, and a framed wall painting (log frame + colored canvas, hung above chests/pots/counters).
4. Fireplaces are campfire + cobble + brick + stone slab; manor/tavern/townhouse/family/cottage/fisherman/meeting-house all have one.
5. Upstairs is no longer bed-only: studies with desks, shelf walls, lounges with tables, storage crates, rugs and lamps differ per floor and per house.

Thin-block gap sweep (2026-09-06, refresh to pick up):
1. Bed + cake against walls: no see-through slits above the mattress / around the cake; neighboring wall/floor faces render fully.
2. Spot-check a few more: bell, anvil, enchanting table, hopper, cauldron (look down into it), snow layer on grass, sugar cane patch, vines on a wall, lever on a block — no transparent gaps or x-ray holes in adjacent blocks.
3. Regression glance: torches, lanterns, chests, candles, campfires, doors, fences, stairs/slabs all look as before.

Campfire transparency (2026-09-06, refresh to pick up):
1. Place a campfire (85) and a soul campfire (86): the log pile is solid, and the ground/wall faces touching the campfire cell still render — no see-through gaps around or under it (same fix as candles/torch/chest).
2. Place a campfire against a wall and on grass: no transparent cube faces, no x-ray holes in the neighboring blocks.

Candle/rain/carpet/door batch (2026-09-06, refresh to pick up; village carpet needs fresh seed or `/regenerate`):
1. Place every candle color (plain + white + 15 dyed): each renders as a small solid wax pillar + flame nub with NO see-through holes; walls/floor faces touching a candle still render (no gaps around it).
2. `/weather rain`: fall speed is roughly half of before; walk inside a villager house: drops fade out within ~1 s; step back outside: fade back in (patter sound keeps playing indoors).
3. New village (fresh seed): carpets sit flush with the floor (no step up); doors, beds, tables unchanged.
4. Stand inside an open doorway and click the door to close it: close is refused with a "step out of the doorway" toast and you stay put (never lifted to the roof); placing a door/tall plant with your head in the upper cell is refused the same way.

Props audit fixes (2026-09-06, refresh to pick up):
1. Place cake (228): brown walls + white/red icing, correct half-height. Place campfire (85): modest flame (smaller than before) over log pile, warm light pool at night.
2. Place lantern (46): small hanging lamp; at night it must cast a warm pool like the torch (place torch beside it to compare).
3. KNOWN OPEN: vivid blue pad + green strip sometimes under cake/campfire (see audit notes in final summary) — if you see it, note world seed + coords + whether it survives `/regenerate`.
4. Forest walk: no two oaks alike — trunk thickness (1 vs 2 wide), lean/fork/twist, canopy shapes (blob/flatTop/layered/pagoda tiers/vase), emergent trunk tip poking through leaves.

PostFX full-res rebuild (2026-09-06, refresh to pick up):
1. Esc → Settings → Video → Beautiful (DOF 40% + CA 25%): aim at a close block — it must look as crisp as with both effects OFF (toggle to compare); only out-of-focus areas blur.
2. Look at high-contrast edges (torch against night, leaves against sky) at screen corners: CA fringe should be thin/colored, not a soft smear.
3. Cycle Color Gamut (sRGB/P3/Rec.709/BT.2020): image must not go dark/washed at any setting (conversion moved into present pass).
4. FPS with Beautiful vs before: should match or beat (depth prepass removed); report both numbers.

Environment optimization batch (2026-09-06, needs rebuild + refresh AFTER SimDeck lands):
1. `/weather thunder`: sky flashes white (double-pulse) + crack sound every 4–13 s; rain darkens + fog closes in; console shows no shader errors.
2. `/weather rain` then walk into a desert: drops fade out; walk out: fade back in. Patter sounds every ~5 s while raining.
3. Dig into a cave at noon WITHOUT torches: near-black; place torch: warm pool. House interior at noon reads dimmer than outside.
4. Night: moon shows a phase (not always full); sleep in a bed clears rain.
5. Stand in powder snow (place id 556, stand in it): freeze toast ~5 s, half-heart damage every 2 s after ~7 s; step out: resets.
6. Dive: world dims + all sound muffles; surface: restores. Nether: HUD clock frozen, no sun shadows.
7. Perf: FPS at noon/midnight matches or beats before; no hitch on weather transitions (quick fade dip, no pop).

Complex trees GEN 4 (2026-09-06, needs fresh seed — old worlds keep old trees until `/regenerate`):
1. New world on `:PROD`: forests show varied trunk thickness (mostly 1×1, occasional 2×2, rare 3×3 giants) with canopies sized to match; heights vary within one species.
2. Wood matches biome: jungle/acacia/palm trunks no longer oak-colored; dark oak is dark; mangrove roots are mangrove wood; alpine/spruce trunks are spruce.
3. Jungle has stories: small understory trees, mid canopy, rare tall 2×2 emergents poking above the rest.
4. Spacing: trees keep a few blocks apart (no trunk-in-trunk overlaps) but still form groves and lone trees — not a grid.
5. Fly across a chunk border through dense forest: no half-cut canopies on the border line.

Static caching + telemetry rotation (2026-09-06, refresh twice to verify):
1. Open DevTools → Network, hard-refresh twice: second load shows `music/*.mp3`, `catalog/thumbnails.json` served from disk cache (Transferred ≈ 0).
2. Ambient music still starts after first click (no silent break from the caching change — MP3 URLs are unchanged).
3. NOTE: verify only after the in-flight SimDeck rewrite lands + `npm run build` passes (parallel session collision 2026-09-06).

SimDeck redesign — slim panel + section dropdown (2026-09-06, needs rebuild + refresh):
1. Join :DEV: panel is ~340px (was 580), header shows SIM DECK + env + BLUEPRINTS + — only; one dropdown lists 11 sections (Spawn/Params/Build/Vehicles/World/Placed/Tests/Inspect/Scenes/Sideload/AI Designer).
2. Switch through every section incl. AI Designer sub-tabs: all previous controls present (spawn grid, params sliders, palettes/sculpt/area-CAD, car spawn + FBX import + transform sliders, snap/orbit/time, placed list, test runner, telemetry, scenes up/down, sideload dropzone, designer flow).
3. Click — (minimize): deck collapses to the SIM DECK pill; EXPAND restores it with the last section selected.
4. On iPad: panel must not cover the screen; dropdown usable by touch.

Game.tsx split — engine boot smoke test (2026-09-06, refactor-only, no behavior change):
1. Hard-refresh, join a world: boot veil lifts onto textured blocks, WASD + mouse-look work immediately.
2. `T` opens chat, `/spawn` teleports, Esc → Settings → Audio toggles work, pause menu buttons (Resume/Options/Snapshot) respond.
3. NOTE: verify only after the in-flight SimDeck rewrite lands + `npm run build` passes (parallel session collision 2026-09-06).

Music play/pause + mute fix, audio defaults (SFX off, music 50%) — updated 2026-09-06 (v0.1.566):
1. Open the game (`:PROD` prod or `:DEV` dev), join a world: SFX are silent by default, ambient music plays at 50% (Audio tab shows SFX OFF, Music 50%).
2. Top-left quick-access bar shows a **⏸️ Music** button on BOTH ports: click it → music pauses immediately + toast "Music: PAUSED ⏸️", button flips to **▶️ Music**; click again → resumes + toast. It must NEVER restart on its own while paused (previous bug: the render loop re-triggered playback every frame).
3. Esc → Settings → Audio & Music: Music ON/OFF toggle mutes/unmutes instantly; slider re-enables on drag; "▶️ Play Ambient Music" test button turns music back on and plays.
4. SFX toggle still works: turn SFX ON, break a block (sound), turn OFF (silent).

File-based ambient music + sound on by default — updated 2026-09-06:
1. Hard-refresh the game (`:PROD` prod or `:DEV` dev), join a world: Esc → Settings → Audio tab must show Sound Effects ON and Music Tracks ON (both default on now).
2. After your first click/keypress in the world (browser autoplay rule), ambient music starts — one of the two `/music` MP3s ("Green Meadows", "Minimal Ambient Cover with Solo Cello"), shuffling to the other when each ends.
3. Esc → Settings → Audio → "▶️ Play Ambient Music" jumps straight to a (shuffled) track; diving underwater muffles the music (lowpass) and surfacing restores it.
4. Muting Music sets the slider to "Muted 🔇" and silences output; unmuting resumes the same track.

Baked cave lighting (sky + block light propagation) — updated 2026-09-04:
1. Open the game (`:PROD` prod or `:DEV` dev), join a world, dig straight down ~20 blocks: the tunnel should go near-black within a few blocks of the opening, with light falling off smoothly from the hole (no more uniformly-lit caves).
2. Place a torch (80) in the dark tunnel: warm light floods ~13 blocks with a smooth falloff; the PointLight pool adds a soft glow on top. Remove it: the cave goes dark again.
3. Place/remove lanterns (46), glowstone (47), lava (40), lit redstone lamps (104/83): each propagates baked light. Lit furnace (96) also lights up.
4. Check chunk borders around a torch-lit cave: no dark/bright vertical seams (border light strips + multi-chunk invalidation handle seams).
5. With Sun Glint ON (Settings → Video), stone in a cave shows **no reflection**; surface stone/water still glint at the right angles.
6. Change time to night (World menu): surface terrain dims smoothly, torch-lit cave stays bright, and there is no remesh hitch on the time change.
7. Settings → Smooth preset (shadows OFF): cave interiors must stay dark (the sun term is gated by baked sky exposure, not just shadow maps).
8. Enter the Nether: unchanged look — flat ambient, lit by lava/fire glow (sky is intentionally baked at 15 there).
9. Perf: no visible hitch when placing/breaking single blocks (light recompute is a few ms per affected chunk); FPS in a dense torch-lit cave should match before.

Wind-animated grass & flowers (advanced wind-grass pass) — updated 2026-09-04:
1. Open the game (`:PROD` prod or `:DEV` dev), join a world, and find a grassy meadow or glade (short grass, dandelions/poppies, and high grass are worldgen in meadows/glades).
2. Look at grass/flowers up close: the **base is anchored** and the **tip leans with the wind** (a real pivot bend, up to ~1/5 block at the top), layered as a slow gust + faster ripple so nearby plants sway slightly out of phase.
3. Walk around a tree and watch **leaves keep the old gentle sway** while grass bends harder — they now use separate materials (grass = wind-bend, leaves = subtle sway).
4. Place `tall grass` (124/1200) or `large fern` (1202) from the creative inventory (`I`); they should bend with the same wind, including the 2-tall high-grass segments.
5. With shadows ON and sun low, confirm grass shadows **sway along with the plants** (the bend applies in the depth pass) and nothing pops/flickers.
6. Confirm fire still renders normally (no wind bend) and performance feels unchanged in a dense meadow.

Post-processing (DOF + Chromatic Aberration + Color Gamut) — updated 2026-08-30:
1. Open the game (`:PROD` prod or `:DEV` dev), join a world, press `Esc` → Settings → **Video** tab.
2. Scroll to **Post-Processing Effects**:
   - Toggle **🎯 Depth of Field** ON → photographic focus-plane model: the focus plane follows
     the crosshair target but caps at 10 blocks. Aiming at a very close block = strong lens blur
     everywhere except the focus plane; aiming at 10+ blocks or the sky = essentially everything
     sharp. Objects at the focus plane stay sharp; nearer objects blur more. Adjust **Dof
     Strength** (0-100%).
   - Toggle **🌈 Chromatic Aberration** ON → red/blue fringing that is barely visible in the
     center and strong toward the corners (power curve). At 100% it should be clearly visible at
     the screen corners.
   - **Color Gamut** selector: sRGB / P3 D65 / Rec.709 / BT.2020 — on a wide-gamut monitor P3
     and BT.2020 look progressively richer; sRGB is the classic look. Swap while in-game (no reload).
   - **🔵 Circular Bokeh** (shown while DOF is ON) → ON switches the blur kernel from the soft
     8-tap ring to a 16-sample golden-angle (Vogel spiral) disk: out-of-focus highlights become
     round lens-style bokeh balls. OFF = the original soft look. Toggle while in-game.
   - **✨ Sun Glint / Reflections** → ON adds Blinn-Phong sun specular to reflective materials:
     look at **water** (strong glint at glancing angles with the sun behind you), **glass & ice**,
     and **stone-family blocks / ores / metal blocks** (moderate sheen on sun-facing faces).
     **Wood, dirt, grass, sand, plants stay fully matte.** A **Glow Strength** slider (shown while
     ON) scales the glint 0-100%. The glint moves as the sun travels
     (time set in the World menu) and dims under overcast weather.
   - With effects ON, compare against OFF: identical image when OFF; in-focus areas stay sharp.
3. Quality presets (Smooth/Balanced/Beautiful) also set post-fx: Smooth=off,
   Balanced=CA 15%, Beautiful=DOF 40% + CA 25%.
4. Settings persist per-user on the server: toggle DOF/CA + set sliders + gamut, log out/in
   (or refresh) — everything should restore exactly as left, like FOV.
5. Perf: with both effects OFF the frame rate must be unchanged. With DOF+CA ON there is a
   modest cost (one depth pass + half-res blur + composite).

Car visuals (GTA: San Andreas style pass) — updated 2026-08-31, see
`docs/CAR_VISUAL_STYLE_PLAN.md` (all units A–G shipped):
1. Open the game, join a world, open the SimDeck. The old single "TEST CAR" button
   is now a **style dropdown + "SPAWN CAR"** button, listing 6 styles: Bravura
   (hardtop sedan), Cabriolet (convertible), Sabre (muscle), Voodoo (lowrider),
   Cheetah (sports), Blista (compact). Spawn each one.
2. **Bravura**: closed hardtop, flat bold red paint, chrome rectangular headlights,
   visible B/C pillars + sloped backlight, chrome-dish wheels. **Cabriolet**: same
   chassis but open-top (no roof) — confirms it's still a distinct, separate style.
3. **Sabre**: long hood + hood scoop, matte black, white racing stripes running
   hood → roof → trunk (canvas-texture decal — should look continuous down the
   centerline, breaking only at the glass), 5-spoke alloy wheels.
4. **Voodoo**: noticeably lower ride height, two-tone purple body / white roof,
   chrome wire wheels with knock-off spinner caps, small chrome hood ornament.
   **Tires must sit flush on the ground, not sunk into it** (was a bug, fixed
   2026-08-31). **Get in, hold Space (handbrake) while stationary** → the body
   should hop/bounce rhythmically (hydraulics) — releasing Space stops the
   bounce. Driving normally (no Space) should look identical to the other
   styles otherwise.
5. **Cheetah**: low & wide stance, raked windshield, rear delta-wing spoiler on
   struts, wide-track alloy wheels, yellow paint. **Blista**: small tall-roofed
   hatchback with a rear liftgate (not a trunk lid), plain steel poverty-cap
   wheels, blue paint — should read as the "cheap economy car" of the set.
6. All 6 styles: walk up to the front/rear bumper and confirm a small light-colored
   **license plate** with dark border + blue text front and back, a **grille**
   (dark plate + vertical chrome bars) between the headlights, and — on all but
   Blista — **dual chrome exhaust tips** under the rear bumper.
7. Open a door on any style (E near the door, or click it) and look inside: an
   interior door card + armrest should be visible on the inward face (not
   blank). Look at the dash through the windshield: a **rearview mirror**
   hangs from the header, and a **shifter + handbrake lever** sit on the
   center console.
8. Wheels up close: tread should look blocky/segmented (not a smooth drum),
   `chromeDish` (Bravura/Cabriolet) should look dished/concave not flat, and
   `alloy5spoke`/`wireSpoke` (Sabre/Cheetah/Voodoo) should show a rotor (and
   for alloy, a small red caliper) glimpsed behind the spokes while rolling.
9. Enter and drive each: WASD/Space/steering all feel the same *pattern* but the
   numbers differ per plan (muscle = strong accel but slides more in turns,
   lowrider/compact = slow top speed, sports = fastest + tightest turning).
   Wheel spin/steer must track correctly on every style's `wheel_*` groups.

Car realism foundation — updated 2026-08-31, see
`docs/CAR_VISUAL_STYLE_PLAN.md`:
1. Open `:DEV`, join a world, and spawn Bravura from SimDeck. Orbit at bumper,
   wheel, roof, side, and interior distance; rounded fallback panels should have
   softer highlights with no floating or detached trim.
2. Aim at the front/rear panel and press E. Confirm the trunk and hood open and
   close smoothly without snapping. Aim at each side door and confirm the
   correct door opens around its front hinge.
3. Import a GLB using the required node names in the car plan. Confirm doors,
   hood, trunk, and hatch/liftgate are detected and rotate around the asset's
   authored hinge pivots.
4. Drive, steer, brake, and exit after opening a panel. Confirm wheel spin and
   steering remain correct and the camera/player position is not corrupted.
5. This is a runtime foundation check, not proof that the procedural cars are
   production-realistic; the authored Bravura hero asset still needs the plan's
   close-orbit review.

Build asset environment — updated 2026-09-02, see
`docs/BUILD_ASSET_ENVIRONMENT_PLAN.md`:
1. Open `/build.html` in the dev server, preferably at `:DEV/build.html`.
2. On `:PROD/build.html`, export a small Meshy model as `.glb`, enter its user prompt, then drag it onto **Upload Meshy model** or use the file picker. Confirm the prompt becomes the item name and the model appears in the 3D preview. Upload two models with the same or very similar prompt and confirm both rows remain visible independently.
3. Confirm **Production inventory ID** matches the next server ID, check the confirmation box, and click **Insert to game**. On `:DEV/build.html`, confirm publishing is disabled and the page identifies the development inventory.
4. Select the asset's **Horizontal footprint** and **Vertical footprint** from `1` through `6`, and move **Model scale**. Confirm `2 × 1` is horizontal, `2 × 2` spans both dimensions, `6 × 6` is available, **Place in preview** updates the footprint guide, and **Save placement** survives refresh. Confirm the model stays still until **Rotate 90°** is pressed, then rotates one quarter-turn per press.
5. Open `:PROD`, join a world, open the creative inventory (`I` search now works in survival), search for `porch` `1211`/`skirting` `1199` and `tall grass` `124`/`1200`, confirm every imported asset has a solid `80×80` icon on `8B8B8B` (not blank/`✨`), equip `porch`/`skirting` and confirm first-person hand shows `MeshBasicMaterial` `DoubleSide` solid, place each at `0,70,0` looking N/S/E/W — confirm `1×1×1` fills `y` to `y+1` centered (not `50%` overflow) and `16×16` top/side edits via `editor.html` appear on correct faces (`+Y` top `2`, `-Y` bottom `3`).
6. Place a closed and open door, then a closed and open trapdoor, inside a wall or beside solid blocks. Confirm every neighboring block keeps its side faces instead of showing transparent holes. Repeat with fence-, chest-, torch-, and custom 3D meshes.
7. Refresh `/build.html` and confirm the uploaded item remains in the server inventory. Use the row `×` control to remove an asset from production and confirm it disappears after refresh. Test a fence-shaped GLB specifically: confirm it imports as a renderable mesh prop with both sides visible, not a voxelized Minecraft block.

L2 Vertex Lighting, Food Eating, Redstone, Mob Combat, Weather & SFX — updated 2026-09-03:
1. **Food Eating**: Equip Bread (1030) or Cooked Beef (1053) in Survival mode. Hold Right-Click or press E: observe the 1.6s rhythmic bobbing, bread crumb particle bursts (`b5824c`), WebAudio procedural chewing noises, and the finishing gulp/burp tone with +hunger recovery.
2. **Redstone Activation & Lamps**: Place a Lever (435) adjacent to a Redstone Lamp (104) or Wooden Door (105). Right-click the lever: hear the tactile click, observe the toast, and watch the Lamp immediately illuminate to lit state (83) and door open.
3. **Hostile Mob AI & Combat**:
   - Zombie: chases player directly on sight; melee attack deals damage with hurt SFX and red vignette.
   - Skeleton: maintains standoff distance (7–12m), aiming and strafing.
   - Creeper: approaches within 3m, emits a tense hiss/sizzle sound with priming swell, and detonates with TNT explosion audio and player damage if not escaped.
4. **Dynamic Weather & Positional SFX**:
   - Rain & Snow: when weather transitions from clear, instanced precipitation streaks surround the player (snow particles in cold biomes, rain in temperate biomes).
   - Cave Ambience: when deep underground (Y < 50) surrounded by solid rock (>= 55 solid blocks within 8m), a procedural low-frequency drone plays every ~25-30s.
5. **L2 Vertex Lighting Baking**:
   - Blocks neighboring light sources (torches, glowstone, lit redstone lamps) bake a direct luminescence boost into their vertex colors during meshing in `meshWorker.ts` and `chunkMesh.ts`, dramatically reducing point light pool overhead.

Builder Studio ("SimDeck" 2.0 on :DEV) & Asset Optimization — updated 2026-09-03:
1. **In-scene 3D Transform Gizmos**: Toggle area selection in SimDeck or via `window.__sim.api.toggleAreaSelect()`. Confirm the RGB axis arrows (`gizmo.ts`) anchor to the bounding box corner with high render order.
2. **Voxel Sculpting Brushes**: Select sphere, cuboid, or cylinder brush in SimDeck/console (`brushPaint` / `brushErase`). Paint and erase voxel volumes centered around target coordinates; check that block bounds compute accurately.
3. **Schematic & Litematic Import/Export**: Open Blueprint Library (`BlueprintModal.tsx`). Confirm each blueprint row features `.litematic` (📦) and `.schem` (📜) download buttons. Paste a schematic JSON in the import tab and confirm it imports with full compatibility.
4. **Blender-Style Orbit Camera**: In Sim studio, trigger orbit camera (`orbitEnable(true)` / Alt+Drag). Confirm smooth rotational orbit around target, snapping to Top/Side/Front views (`orbitView`), and precision building focus (`orbitFocus`).
5. **Thumbnail Memory Optimization**: Open dev tools memory tab. Confirm 2.5MB base64 thumbnail strings are offloaded into browser-managed lazy `blob:` ObjectURLs in `thumbnails.ts`.

High-Resolution Inventory & Hotbar Icons — updated 2026-09-03:
1. Open the inventory (`E` or `I` in creative mode) and check the hotbar at the bottom.
2. Verify that 2D tools, weapons, armor, foods, and flat cutout blocks are rendered at 4× crisp nearest-neighbor resolution (64×64) with pixelated anti-blur filtering (`image-rendering: pixelated; image-rendering: crisp-edges`) and authentic drop shadows across all slots.
3. Inspect 3D blocks (stone, wood, glass, stairs, slabs, chests): verify sharp isometric cube edges without bilinear fuzziness or blurry scaling artifacts.

Tiled far-horizon LOD (RD headroom) — updated 2026-09-04:
1. Open the game (`:PROD` or `:DEV`), join a world, fly up ~30 blocks and look at the horizon: distant terrain should look smoother/denser than before (8-block inner steps) with no gap or z-fighting where voxel chunks end.
2. Spin 360° and walk/fly ~100 blocks: no cracks at the voxel-to-far seam, no popping; FPS should match the pre-change build at the same render distance.

Chunk-efficiency logger — updated 2026-09-04:
1. Play normally (telemetry auto-flushes to `data/telemetry-perf.jsonl`), then run `node scripts/chunk-efficiency.mjs` for the streaming/render/memory verdict.
2. At RD10 expect `streaming=EFFICIENT` but `render=BOUND` (~1900 draw calls, ~30 FPS); set RD 8 and re-run — calls should drop under ~1000 with FPS back at ~60 while the far-shell keeps the distant view.

Fast streaming + on-demand shadows — updated 2026-09-04:
1. Refresh, set RD 10-12, fly fast across new terrain: holes behind you should fill in noticeably faster than before (8 mesh workers, mesh-first queue, no-AO far meshing beyond RD-2).
2. Stand still at RD12: FPS should read higher than the old ~26 (shadow map now refreshes 2×/sec instead of every frame — sun shadows lag ≤0.5s, imperceptible).
3. Walk up to a far cliff/trees: shape and texture must look identical up close vs far — only micro AO shading differs at distance.

High-res actual-data horizon — updated 2026-09-04:
1. Refresh, fly up high and look far: mountain silhouettes should match the real terrain (4-block inner steps from the live heightmap), forests show as raised dark-green canopy masses, snow caps and beaches read correctly.
2. Fly toward a distant ridge: the crossover from horizon-shell to voxel chunks should show no shape pop — same heights, finer detail fading in. Watch `horizonMs` in `node scripts/chunk-efficiency.mjs` (warm rebuilds should stay well under 150ms).

Villager trade gate + farmer cows — updated 2026-09-04:
1. Walk to within 4m of a villager but look away: NO Trade button. Aim the crosshair at them within ~2.5m: button appears; E/right-click opens trade. Through a wall: nothing, and E places a block instead.
2. Open a trade, then walk away: modal auto-closes with a toast.
3. Find a village with a fenced 7×7 pen (hay bale inside, 2-3 cows): only straw-hat farmers wander over to it; librarians never do. Cows stay inside across reload.

Stray cats — updated 2026-09-04:
1. Roam wilderness/village outskirts: orange tabby cats with upright tails wander alone (never in herds, never approaching other animals), covering long distances between pauses.
2. Name one with a Sign: nameplate sits just above the head (offset 1.0). Empty-hand E never rides a cat (only cow/sheep/pig/horse).

Pet persistence (nether-wipe fix) — updated 2026-09-04 — requires API restart + refresh:
1. Name a pet, enter the Nether, wait 10s, return: pet must still be in 🐾 My Pets with its position intact (autosave previously overwrote overworld rows with the emptied nether list).
2. Relog: Pets list restores with names/positions; ➜ Go teleports to each pet. NOTE: restart the game API after pulling (server/index.js merge-save), then refresh the browser.

World map + spawn points — updated 2026-09-04 — requires API restart + refresh:
1. M opens AND closes the fullscreen map (also from inventory/pause states); minimap ticks visibly faster with no FPS loss.
2. Hover the big map: crosshair cursor + live X/Z readout; pins for every spawn (🏠 home gold, 📍 blue) with names; right-click → name → pin appears.
3. Left sidebar: rename ✏️ (Enter/✓), ➜ teleport (closes map), 🏠 set-home, 🗑️ remove, click row to flash pin on map. All survive relog (server-persisted per user+world).
4. NOTE: restart the game API after pulling (server/index.js spawn_points table + /api/spawns), then refresh.

Touch controls + fly-jump — updated 2026-09-04 — requires API restart + refresh:
1. Esc → Settings → Gameplay → "Touch Buttons: FORCED ON": D-pad, HIT/TAKE/JUMP and the look-joystick appear on desktop too; persists per user (server) and for guests (local). OFF restores mobile-only auto behavior.
2. Hold JUMP while flying: steady climb; release: vertical velocity decays. Tap on ground: normal jump. Double-tap in creative still toggles fly.
3. NOTE: restart the game API after pulling (user_preferences.touch_controls + prefs column-order fix), then refresh.

Lit horizon/clouds + moon glow + 10s weather transitions — updated 2026-09-04:
1. At sunset: distant horizon and clouds pick up the warm tint; at night both go dark blue with the voxel terrain (previously stayed daylight-bright).
2. After moonrise: a soft halo glows around the moon disc, dimming under overcast; it hides in the Nether.
3. Force rain via World menu or wait for weather: sunlight/clouds/darkness now fade over ~10-12s instead of snapping (same for clear-ups). No FPS change expected (same draw calls).

Porch stairs with rails (1205 left / 1206 right) — updated 2026-09-04:
1. Creative inventory (`I`): search "porch" — both stairs show beige iso-cube icons; equip to see the beige mini-cube in hand.
2. Place 1205 facing south (+Z): two beige steps ascending southward, rail posts + top rail on the EAST (+X) edge; 1206 mirrors to the west edge. Rotate with facing (dirs) — verify N/E/S/W placements.
3. Walk into them: auto-step climbs 0.52 like vanilla stairs; map shows beige dots; breaking drops nothing special (no crash, remesh clean).

Functional boats — updated 2026-09-04:
1. Creative inventory: all 7 wooden boats (Oak `1041` etc.) equip as items; aim at water + E/right-click: boat launches with a toast (survival consumes one); aiming at land only toasts a hint.
2. Empty hand + aim at boat + E: board ("Rowing — WASD/Shift"); W paddles forward, A/D turn, S backs water; oars animate; Shift disembarks waterside (never buried).
3. Left-click a boat: breaks into a pickupable boat item; beached boats rest on ground and barely move; relog keeps every boat (positions + variant); Nether trips and world deletes behave (dimension-aware saves, `_nether` cleanup).

Melee combat — updated 2026-09-04:
1. Equip any sword/axe/pickaxe/shovel/hoe, hover it in inventory: tooltip shows `+N Attack Damage` + speed (vanilla tiers: diamond sword 7, netherite axe 10, hoes 1).
2. Left-click a zombie/skeleton/spider/creeper within 3 m: swing sound, knockback, contact XP orbs + loot drops on kill (rotten flesh/bone/string/gunpowder/etc.); spam-clicking fizzles on cooldown; creative one-hits.
3. Let mobs hit you in survival: 2–3 HP per hit (armor reduces), hurt feedback, death screen on 0 HP.
4. Die in survival: inventory scatters at the death spot (drops persist 5 min, re-collectable); Respawn lands on the home spawn (🏠 portal if set, else world spawn) with empty hands; creative keeps everything.

Pet summon + torch corner (2026-09-05):
1. 🐾 My Pets → ⬇ Summon: the pet appears 2-3 blocks in front of you (grounded, mounts disengage) instead of you teleporting to it; ➜ Go still teleports you.
2. Held torch: now emerges from the bottom-right corner of the screen (closer + lower + further right) — the stick base cuts off at the screen edge instead of floating mid-air; flame reads near the corner.

Custom-object DB separation (2026-09-05 — requires API restart):
1. Custom assets + blueprints now live in a dedicated `<custom-db>` (env `WEBMC_CUSTOM_DB_PATH`), migrated once from the old game DB — never again coupled to vanilla game data or texture overrides.
2. Editing a texture in editor.html writes only to `worldgen.db`; custom objects load from their own DB via `syncCustomAssetsCatalog()` on boot — a texture save can never disable or clobber them.
3. Human check: edit a vanilla texture in editor.html → custom objects (porch/fence/tractor) stay visible and unchanged; edit a custom block's texture → that block updates, others stay.
4. NOTE: restart the game API after pulling so the rewired routes (`/api/custom-assets`, `/api/blueprints`) serve from custom.db. Verify `<custom-db>` exists with the 5 existing assets.
5. GLB purged everywhere (verified 0 bytes for all 5 assets; no .glb/.gltf/.bin on disk). New uploads are voxelized server-side and the GLB is discarded immediately; the client builds only voxel meshes and no API route serves the GLB binary.
4. Catalog & Texture Studio (`/blocks.html` & `/editor.html`):
   - In `/blocks.html`, search `porch left rail` or `porch right rail`: both appear as individual items (`1205` and `1206`) with authentic 3D stair + rail preview meshes.
   - Click "Edit in Studio" (`/editor.html?id=1205` or `?id=1206`): edit `side`, `top`, and `bottom` face textures individually. Changes reflect live on the 3D model with rail and persist independently without clobbering each other.
5. Production persistence (`:PROD`):
   - Open `http://<host>:PROD/editor.html?id=1205` (or hard refresh): saved texture overrides from `/api/textures/overrides` sync immediately to the canvas and 3D preview.
   - Check `:PROD/blocks.html` and join in-game `:PROD/`: block 1205 displays the updated custom face textures.

Clouds / map cursor / sun order / Q-E keys — updated 2026-09-04:
1. Look at cloud edges against the sky: silhouette reads white (sides no longer gray); undersides still shaded. At sunset/night clouds tint/darken with the light.
2. Press M (pointer locked): OS cursor appears, ✕/sidebar/right-click all clickable; hover shows X/Z readout + ghost ring; M closes again.
3. Daytime with broken clouds: sun disc hides behind cloud clumps (no more shining through); moon halo sits under clouds at night.
4. Q with empty hand: toast "nothing to drop". Q with stack: one item pops out as a pickupable mini-block (magnet-collect it); count decrements (creative keeps stack).
5. E near a parked car while aiming elsewhere: places blocks (no more surprise entering); aim AT the car + E: enters as before.

Bandwidth diet — updated 2026-09-04 — requires API restart + refresh (prod :PROD-API restarted 15:00):
1. Reload twice: second load pulls JS/atlas/thumbs/overrides from disk cache (DevTools Network: Transferred ≈ 0). Per-boot floor now ~1.5 MB first visit, near-zero after.
2. Edit a block texture in editor.html, return to game WITHOUT pressing ↻: nothing changes (no background polling). Press ↻ in pause menu: texture applies + toast.
3. Append ?telemetry=1: perf POSTs resume and `chunk-efficiency.mjs` sees fresh pulses. Without it: zero /api/debug traffic.
4. Place a Meshy custom block (porch/skirting/tractor): model appears (voxel fetched on demand); first placement triggers exactly one small `/api/custom-assets/<id>` fetch.

Time + map — updated 2026-09-04:
1. Full day now lasts ~40 min at 1x (was 20); top-left ⏩ button advances +3h with matching toast.
2. Open the fullscreen map fully zoomed out and roam: no slideshow while tiles fill (stride-2 far tiles, capped radius), heap stays flat (distance-evicted tile cache); zoom back in: live chunks sharpen to full detail.
3. NOTE on server-side chunk loading: intentionally NOT done — worldgen is deterministic from the seed, so shipping voxels from the server would cost ~16 MB per area in bandwidth (the opposite of the diet) for zero visual gain; the map never needed chunks at all (it synthesizes tiles from noise).

Boot veil + input wake — updated 2026-09-04:
1. Join a world on a cold cache: the loading bar shows "Warming up textures…" and the veil lifts only onto textured blocks — no black screen first (max ~8 s grace if the atlas fetch stalls).
2. After load, mouse-look and WASD work immediately with no menus open; switching hotbar slots is no longer required to unfreeze. (Safety net heals any stuck-frozen state within ~2.5 s; it never fires while a menu/modal is open or the tab is unfocused.)

Red-world fix (baked-light integration) — updated 2026-09-05 — refresh (hard-reload) required:
1. Day overworld renders normal colors again (the 22:36 build shipped the new light channels without matching wiring: air was opaque to skylight AND materials/disagreeing geometry met in the middle).
2. Sanity markers: open-field blocks bright, caves dark, torch pools warm; white clouds, blue sky unchanged.
3. Torch/daylight balance: torches contribute ~nothing at full noon (sun 100 : torch ~0), gentle pools at dusk, full local lighting at night — no more daytime warm blobs.
4. NOTE: `bakedLight.ts` / `lightField.ts` belong to the in-progress lighting pass (uncommitted, other session) — fixes here only repaired its air-opacity table and the torch/day balance; the feature itself is still theirs.

Lighting-session collision note (2026-09-05): the other session is actively editing `lightField.ts`/`bakedLight.ts` and rebuilding dist every few minutes — diagnose live visuals against the CURRENT bundle hash, not the tree; coordinate before touching those files. Open observations: fence customs reported purple-glowing at night (customs path verified clean in tree: brown tile, plain Lambert, no magenta anywhere — likely in-flight experiment); sand reads very yellow under the +15% sun (neutral-noon already shipped).

Perf follow-up on baked lights (measured 2026-09-05, needs owner action):
1. `computeChunkLight` costs ~4–12 ms main-thread per chunk (48×128×48 window + BFS); it runs synchronously inside every `buildMesh` dispatch, so heavy streaming blows the 1.2–5 ms budget after a single dispatch.
2. Fixed the worst multiplier here: `collectLightBorders` no longer force-computes 4 neighbors (cached lights only, seams self-heal).
3. Memory: 64 KB cached light per chunk (~45 MB at 700 chunks) + transient flood windows; evicted with the chunk.
4. Fix 2026-09-05 22:55 UTC: per-emitter vanilla light levels (torch 14, lava 15, soul gear 10, redstone torch 7, magma 3, etc.; redstone ore no longer glows passively) — caves tighten visibly after the rebuild; large lava pools still reach ~15 blocks as intended.
5. Open (lighting owner): move the flood off the dispatch path (worker-side or deferred refine pass) if flight-speed streaming still lags; consider a settings kill-switch.

Yellow-cast fix (2026-09-05): canvas was tagged Display-P3 while the shader encoded Rec.709/sRGB, so the compositor oversaturated everything (`postFx.ts`: per-space `drawingBufferColorSpace` + matching override in `applyColorGamut`). Human check: whites stay white on rec709/sRGB gamuts.

Neutral block light (2026-09-05): dynamic point pool no longer splashes saturated emitter colors (redstone red, obsidian magenta); all block light is neutral warm-white `0xfff1dd`, baked term matched. Caves read via albedo now — gray stone glows gray, ores glow their own tile colors. Human check: redstone/amethyst areas without pink pools.

Sun-init tint kill (2026-09-05): the per-frame loop already set the sun to pure white at noon, but `createLightingRig` + Game.tsx initialized `DirectionalLight(0xfff2da)` (warm) — a frame before first override the whole world + specular glints flickered warm, incl. water. Init now matches: `0xffffff`. Water stays blue-white, glints white.

Hemisphere ground tint kill (2026-09-05): `HemisphereLight(0xcfe6ff, 0x6b6a55)` ground bounce (warm khaki) was adding a yellow-green cast to up-facing surfaces — most visible on water. Ground now neutral `0x555555` (sky stays cool `0xcfe6ff`). Water reads blue-white at noon.

Block-light tint neutralized (2026-09-05): the baked-light uniform was still `0xfff1dd` warm — under the sky gate this leaks into every daylight surface incl. water/grass. Now pure white; any remaining tint is your vibrance/contrast profile (119/121).

YELLOW WATER ROOT CAUSE + FIX (2026-09-05): water faces carried the baked-light channels `(r=AO·shade, g=sky, b=block)`; at a daylight surface with no block light, `b=0` zeroed water's blue channel → yellow. Both meshers now keep LIQUIDS pure grayscale (full albedo reaches the shader) while solids keep their sky/block channels. Verified in Node: water = 255,255,255 grayscale; solids still 16640/17664 with light channels. Human check: water reads BLUE at noon, caves still lit.

Purple fence root cause + fix (2026-09-05): in-world custom assets that mesh before the catalog registers spawn a MAGENTA placeholder cube, and the early-return (`customAssetEntities.has(key)`) meant the catalog re-scan could never replace it — the one-shot 1.2 s retry failed on slow catalog fetches and left the fence purple forever. Placeholder is now BROWN, retries every 800 ms until the real model lands, and the re-scan replaces placeholders when metadata arrives.

Yellow reflections on stone fix (2026-09-05): the dynamic point-light pool ran at ~1.2 intensity during FULL DAY (warm `0xfff1dd`), washing nearby stones/reflective tiles yellow. Pool + held torch now scale by darkness² (≈0 at noon, full at night), matching the baked term. Human check: stones read neutral by day, torches/lava still light caves at night.

Deployment-warning (2026-09-05): the OTHER session's frequent rebuilds overwrite `dist` from their tree — verify the served hash has the expected markers before trusting a refresh. Re-apply after any session build.

Lighting revert to 8c89d24 (2026-09-05, user-directed): removed the baked-light system entirely (lightField.ts, bakedLight.ts, vertex-color light channels, uSkyLight wiring, specular sky-gate) and restored the pre-experiment model: grayscale vertex colors (albedo preserved — water blue), warm-tinted sun 2.1, per-emitter point-light colors, held torch 2.4. KB `mechanics/baked-lighting` documents the revert + lessons. Fence: all four magenta placeholder paths are brown + retry-loop. Human check: water blue, stones neutral, no purple fence, FPS back.

Vanilla sun restore (2026-09-05): directional sun is constant neutral white at the long-standing 2.1 power (the +15% experiment yellow-clipped bright tiles); sunset warmth lives only in sky/fog uniforms now, matching Java's monochromatic light model. KB `mechanics/lighting` updated with the vanilla sun facts.

Atlas over-bright bake fix (2026-09-05): `buildMasterAtlas.js` applied its 1.35 foliage boost to EVERY tile (sand 219,207,163 clipped to 255,254,219) — now boost applies to tinted foliage only; 859 tiles re-blitted verbatim from sources, porch 890 + tinted tiles untouched; both atlas copies re-synced. Human check: sand/woods read true to source; brights no longer clip yellow.

Purple-fence investigation (2026-09-05, unresolved — other session's area): fence model data + mesher replicated exactly in isolation → all browns, zero purple (uv counter exact 19136/19136, tile fully brown/opaque, materials unpatched plain Lambert). Purple correlates with the lighting session's build cadence (gone after refresh). Suspect lives in uncommitted lighting experiments, not in committed model/material code.

## Village gen overhaul (Phase 0 done 2026-09-05, Phases 1-3 pending)

- Phase 0 (regeneration mechanics): `GEN_VERSION` 1→2 in `server/worldVersions.js`
  (server stamps new worlds; client worldgen is seed-deterministic and ignores the
  version, so loading ANY world always uses current generator code). New chat command
  `/regenerate` (`/regen`) → `regenerateCurrentArea()` (Game.tsx) — clears chunks/
  heightCache/lanterns/mapTiles/regionCache/planCache/genQ/meshQ and regenerates the
  player area. Player edits survive: `genChunk` re-applies `editsByChunk` on top of
  fresh terrain (terrainGenerator.ts:988). Prod API restarted; all gates green.
- Next: Phase 1 terrain-aware placement + no mountain cuts (roads follow surface with
  stairs — Oak/Cobblestone/Stone-brick stairs exist in blocks.ts), Phase 2 seed-keyed
  layout archetypes, Phase 3 vanilla interiors. Bump GEN_VERSION again when those land.

Phase 1 (DONE 2026-09-05 — terrain-aware placement, no mountain cuts):
- `villageAt` now gates placement by a footprint slope gate (`villageTerrainDelta`:
  max |height - center| over radius 24 must be <= 3.5; 10 attempts; spawn region 0,0
  falls back to its best candidate). Villages sit on gentle terrain, never mountains.
- Per-house `base` in `villagePlan` = max terrainHeight over the footprint+center, so
  houses ground to their OWN local terrain instead of the village center flat.
- `buildRoadStrip` (structures.ts) lays the path ON the surface per column (no
  clearUp/carve) and builds stone-brick staircases (+ solid landing) wherever the
  surface rises/drops >=2 along the road's dominant axis. Wells/lamps ground to local
  terrain. Gardens are per-column surface.
- `generateHouseStructure`: clearUp is interior-only (outer ring kept → house tucks
  into a hillside instead of slicing it); foundation is a shallow terrain-following
  pad (base-1 → local ground-1, no base-24 carve); door gets a real stone-brick stair
  when the approach ground is >=2 below the floor.
- `wStair` writer (Game.tsx) stamps stair blocks + records facing in chunk.dirs
  (mesher reads dirs[off]-1). Stairs reuse existing block 72 (Stone brick).
- Verification: `npm run phase1:check` — slope gate, determinism, per-house grounding,
  road surface-following + stairs + no-cut, village-chunk determinism. All pass.
Phase 2 (DONE 2026-09-05 — seed-keyed layout archetypes + house-count variance):
- `villagePlan` now picks ONE of 7 layout archetypes per village from its seeded RNG:
  crossroads, linear main street, star/plaza, winding hamlet, grid, terrace (runs up
  a gentle slope via the stair roads), compact cluster. No two villages share a layout
  (verified 88/88 distinct; house range 3–22, avg ~10).
- Shared `placeHouse`/`connectToRoad` helpers: houses ground to their own terrain,
  AABB-overlap clearance, dominant-axis road direction, door-path rects generated
  AFTER placement (so they never block later houses), seed-budget filler (12–26) that
  sweeps each spine at ~house-width pitch on both road sides.
- Slope gate widened slightly for bigger villages: footprint radius 24→30, max
  delta 3.5→4.0 (still gentle terrain, no mountains). Distance guard 80.
- Verification (`npm run phase1:check`): archetype variety, house-count variance,
  determinism, per-house grounding, no-cut roads+stairs, village-chunk determinism.
- Manual test: `/regenerate` then fly around — each village has a distinct layout and
  a different number of houses.
  Next: Phase 3 (DONE 2026-09-05 — 20 individually-spawnable vanilla interiors).
- `structures.ts` now splits house building into shell + a `house-design:<key>`
  interior registry (`HOUSE_DESIGN_META`, 20 researched recipes from
  `kb/mechanics/structures.md`): every design carries its workstation + real bed
  (1162) + light + storage, built from stair/slab/fence/wool/lantern idioms;
  real oak stair blocks replaced the fake plank interior stairs; door cells are
  recorded on H and kept clear.
- Villages pick a deterministic interior per house footprint (`pickInteriorKey`,
  shell-compatible, seed-stable); `H.designKey` forces one.
- SimDeck "houses" tab (dev :DEV only) lists all 20 as `🏠 …` entries via
  `VILLAGE_HOUSE_DESIGN_CATALOG`; `stampStructure("design:<key>", …)` stamps the
  design's own shell + interior (side honored); `iconFor` renders a real preview
  per design. Existing 8 `house:<style>` presets unchanged.
- `GEN_VERSION` 2→3 (interior output changed for the same seed).
- Verification: sim drift tests assert 20 entries, each builds voxels with its
  workstation+bed+light+storage present, and ≥18/20 unique block fingerprints
  (217/217 sim pass); tsc/build/textureCheck/kb/pages/phase1-check green.
- Manual test on :DEV SimDeck → catalog → Houses: search `house-design:`, spawn
  each of the 20 side-by-side and compare — every interior must read vanilla
  (workstation centerpiece, bed, lanterns, storage) and differ from the others.
  Then `/regenerate` in a world: village houses now have furnished interiors and
  vary per house.

Spontaneous-restart fix (DONE 2026-09-05 — refresh to pick up):
1. Root cause: the ONLY page-reload path in the codebase was the WebGL
   `contextrestored` handler (`Game.tsx`) doing a full `location.reload()`. Any
   transient GPU context loss (memory pressure, tab switch, driver reset) looked
   like a "random restart". No service worker / auto-updater exists.
2. Fix: context loss now pauses + toasts ("GPU paused — recovering…") and context
   restore resumes the loop in place (THREE re-uploads GPU state itself) — no
   reload, no lost session. The frame watchdog skips restarts while the context
   is down. Both events are logged to the console AND beaconed (ungated) to
   `/api/debug/client-error` (`data/client-errors.log`) so the next event is
   captured with build tag + timestamp.
3. Hardening in the same pass: per-instance entity geometries are now disposed on
   removal (animals/mobs/squids/boats in `spawner.ts`, fireballs, remote avatars
   on leave) — previously only `scene.remove()` ran, leaking GPU buffers on every
   kill/despawn. Item-drop meshes are intentionally NOT disposed (shared per-block
   geometry cache). `planCache`/`regionCache` capped (400/200, oldest-first, safe
   because plans re-derive from seed).
4. Audit result: chunk unload/remesh, dimension hops, light pool (fixed 25),
   entity caps, snapshot gating all already bounded — entities were the leak.
- Manual test: play normally (combat + travel esp.); if a "GPU paused" toast ever
  appears, note what you were doing and check `data/client-errors.log` for the
  `webglcontextlost/restored` lines — the game must resume WITHOUT reloading.
  If a tab still hard-crashes (Aw-snap page, no toast), that's browser OOM beyond
  our context handler — report device + what you were doing.

Offline sync (DONE 2026-09-05 — refresh to pick up):
1. Correction to the earlier finding: `useWorldSession.ts` ALREADY flushed pending
   edits on a 2.5s interval + unload and autosaved player state — the real gaps were
   narrower: no detection/notification, the single-block edit path had a bare POST
   (offline edits dropped instantly, never queued), flush sent everything to the
   CURRENT dimension's world (overworld edits queued offline then flushed in the
   Nether went to the wrong world), and HTTP errors resolved as success.
2. Now: browser online/offline events + save success/failure flip a connection
   status with toasts ("Connection lost — playing offline…" / "Back online —
   syncing…"); HUD top bar shows 🟢/🔴 with pending-edit count and last-sync time
   (hover for detail); `pendingEdits` are world-tagged and flushed per world;
   `apiSaveBlockEdits` rejects on HTTP error; unload beacons any remainder grouped
   by world (duplicates harmless — absolute block sets); the 2.5s interval skips
   attempts while the OS reports offline but keeps retrying otherwise, so recovery
   is automatic.
3. Verification: new sim tests (save ok/error semantics, world grouping, per-world
   flush, failure remnants, empty flush); tsc/build/textureCheck/kb:check/pages all
   green. NOTE: sim shows 4 failures in alpine/desert/swamp surface tests — caused
   by the other session's uncommitted biomes.ts/trees.ts rewrite, not this change.
4. Manual test: hard-refresh, break a few blocks, kill the server (or disconnect),
   break more blocks — 🔴 appears with pending count + toast; player state keeps
   working; restore connection — ✅ toast, queue drains, 🟢 with fresh sync time;
  relog — all edits present. Enter the Nether while offline with queued overworld
  edits, reconnect there — overworld edits must land in the overworld, not Nether.

Stability batch 1–6 (DONE 2026-09-05, committed + pushed as 2470027 — refresh):
1. Atomic DB writes: `server/atomic-write.js` (tmp + rename) wired into game,
   worldgen, custom, and sim DB save paths — a mid-write crash can no longer
   corrupt a database. Verified with a scratch write/overwrite test.
2. React error boundary (`main.tsx`): render crashes show a recovery panel
   (soft remount, no page reload) + full-reload escape hatch + ungated beacon
   to client-errors.log.
3. (Committed last, after green sim.)
4. Villager audit: `spawnVillagers()` leaked 8 meshes per call (boot/join/every
   `/regenerate`) — clear loop now disposes via `disposeEntityRoot`
   (`gameState.ts`). Villagers never die individually; no other removal path.
   Item-drop meshes intentionally NOT disposed (shared per-block cache).
5. Leak watchdog: telemetry PULSE now records `textures`, `mobs`, `animals`,
   `villagers` alongside existing `geoms`/`heapMB` — watch the trend in
   `data/telemetry-perf.jsonl` (?telemetry=1) to catch the next leak early.
6. Red sim tests resolved WITHOUT touching assertions: the 4 failures were a
   transient mid-edit tree state from the parallel biome session; the tree is
   self-consistent (registry renumber 11=Sandstone/256=Clay/490=Mud + a renumber
   guard test) and sim is green 3× (244/244). Only fixed two stale test NAMES
   (desert 19→11, swamp 117/21→490/256); behavior assertions untouched.
- Manual test: hard-refresh; play a long session with combat/travel/regens and
  confirm no spontaneous restarts (any "GPU paused" toast must self-resolve with
  no reload); force a render crash if you can (the boundary panel must offer
  restart-view, not a white screen).

Village chest loot (DONE 2026-09-05):
- Every village house chest now spawns with vanilla-style loot: `rollVillageLoot`
  (`structures.ts`, 20 per-design tables — bread/wheat staples, emeralds, books
  plus profession goods: feathers/flint/arrows in the fletcher, paper/compass in
  the cartographer, coal/iron/diamond in the smiths, wheat/seeds/potatoes in the
  farm shack, cooked meats in the butcher/tavern, redstone/bottles/glowstone in
  the temple, etc.). 1–3 stacks in random slots of the 27-slot chest.
- Loot is deterministic per chest coordinate (`rngAt`), seeded once with the same
  `if (!chestMap.has)` guard as mineshaft loot — player-looted chests win and stay
  looted across `/regenerate` (chestMap is never cleared by it); brand-new chest
  coords get fresh rolls. Barrels (171) stay decorative (not openable, same as
  vanilla interaction map: 41 crafting, 42 furnace, 43 chest, bed sleep).
- Verification: sim tests assert all 20 tables non-empty with valid registry ids,
  deterministic rolls, 27-slot shape, and that every design hooks loot to ≥1 real
  chest block (38 hooked chests; 225/225 sim pass); tsc/build/textureCheck/kb/pages
  green.
- Manual test: `/regenerate`, open chests in several houses — forge gives coal/iron,
  library gives books/paper, farm gives wheat/seeds; take everything from one chest,
  relog — it stays empty; `/regenerate` again — looted chest stays empty, untouched
  houses keep loot.

Emerald currency fix (2026-09-05 — needs rebuild + refresh to go live):
1. Open the game, find a village, aim at a Farmer within ~2.5 m and press E: the
   modal offers "Dirt ×20 ➔ Emerald ×1". Execute it with 20+ dirt: inventory
   gains a real Emerald (green gem icon, id 893) — NOT a Shroomlight.
2. Trade modal + toast both say "Emerald"; check all 6 professions' first trade.
3. Regression: sell-out still hits after 8 uses ("Sold out — restocks at dawn"),
   dawn restocks, creative trades stay free.

Furnace persistence + smelting/gear (2026-09-05 — needs rebuild + refresh):
1. Place a furnace, load raw iron + coal, close the modal mid-smelt, relog:
   contents + progress survive. Open a second furnace: first furnace keeps
   its own contents (no cross-wipe).
2. Smelt iron/gold/copper ores + potato/kelp; craft an iron pickaxe from
   ingots at the table (pattern `mmm/ s / s `), equip and mine.
3. Regression: output-full pause at 64, dawn-independent burn, Esc closes
   and saves (reopen to confirm).

Onboarding card (2026-09-05 — needs rebuild + refresh):
1. Fresh browser (or clear `mc_onboarding_dismissed` in localStorage): join a
   world past the title screen — the primer card shows top-center with
   controls + coal→furnace→iron-pickaxe goal.
2. Click "Got it": card closes, refresh — stays closed. It must never cover
   the title screen or loading veil.

