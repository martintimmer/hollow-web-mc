---
id: mechanics/structures
title: Village structures & interior furnishing
kind: mechanic
wiki: https://minecraft.wiki/w/Village/Structure/Blueprints
game_version: "1.14+ (Village & Pillage)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: implemented (2026-09-05: shell/interior split + 20 designs wired; sim-spawnable)
tags: [structures, village, interiors, furniture, worldgen]
related_docs: [kb/mechanics/worldgen.md, docs/ROADMAP.md]
---

# Village structures & interior furnishing

Design rules for village house interiors, researched from the Minecraft Wiki
(blueprints), community furniture guides and build forums. Phase 3 of the
village overhaul will implement these in `src/game/terrain/structures.ts`
(`generateHouseStructure`).

## Research sources (10+)

1. Minecraft Wiki — Village/Structure/Blueprints (plains list: Armorer, Big
   House, Butcher ×2, Cartographer, Fisher Cottage, Fletcher, Library ×2,
   Mason, Medium ×2, Shepherd, Small House ×8, Stable, Tannery, Temple ×2,
   Tool Smith, Weaponsmith).
2. Minecraft Wiki — Village/Structure (small-house interior notes: white/yellow
   beds, cobblestone stairs inside, green carpet, flowerbeds, tiny 2×3 house).
3. Minecraft Wiki — Village & Pillage (1.14 redesign; profession workstations).
4. Minecraft Fandom wiki — Village/Structure/Blueprints (mirror).
5. Minecraft Wiki — Tutorials/Furniture (chairs: arm/study/dining/sofa/lounge;
   dressers = double chests; tables; fridges = chest + iron block + door).
6. minecraftfurniture.net — slab/trapdoor seats, benches, bar chairs,
   half-bed chairs, armrest chairs, corner shelves, terracotta rug, candle table.
7. thespike.gg — village house ideas (cleric brewing stand + bookshelves;
   weaponsmith anvil + grindstone + forge; fisherman bed/table/chair/lantern +
   fish tank; cartographer table + maps/compass; librarian bookshelves + lectern).
8. exitlag.com — medieval house guide (layout: entrance → kitchen → storage →
   bedrooms → library; chairs from stairs, tables from slabs, barrels in
   kitchens, campfire/fireplace chimneys).
9. CurseForge (Vex plains house, full interior) — room set: workshop, sitting
   room, kitchen (cake), dining, storage, library + enchanting, brewing room,
   bedrooms.
10. Minecraft Forum — villager housing needs (beds, job blocks, 3–4-tall rooms,
    doors, corridors; multi-level needs stairs).
11. Reddit r/Minecraftbuilds + r/Minecraft — villager-house redesign threads.
12. homeinteriorz.com / villageviewpost.com — village house furnishing guides.

## How vanilla actually designs village interiors

- **Small houses are bed-anchored**: 1 room, one colored bed against a wall
  (white/yellow/pink wool accents), sometimes a furnace + crafting table, a
  flowerbed outside, a 2×3 micro-house exists. Minimal but purposeful.
- **Profession houses are WORKSTATION-centric**: the job block is the centerpiece
  (lectern, cartography table, fletching table, smoker, blast furnace,
  stonecutter, loom, composter, brewing stand, barrel, smithing table,
  grindstone). Each adds 1–2 thematic decorations + storage + a bed.
- **Furniture is made from stair/slab/fence/sign/trapdoor idioms** (no mods):
  chairs = stair on slab; sofas = stairs back-to-back + wool cushion; tables =
  slab on post; shelves = stairs; dressers = double chests; fridges = chest +
  iron block + door.
- **Lighting**: lanterns/torches/glowstone; hanging lanterns on chains; fireplaces
  with cobble surrounds and chimneys; campfires.
- **Color via wool/carpet/terracotta** for bedding, rugs, curtains.

## Our block inventory (verified in catalog/completeRegistry.json)

- Workstations: Lectern 432, Cartography Table 234, Fletching Table 366,
  Smoker 623/624, Blast Furnace 194/195, Furnace 42, Stonecutter 639, Loom 468,
  Composter 264, Brewing Stand 209/103, Barrel 171/172, Smithing Table 622,
  Grindstone 401–403, Anvil 151, Cauldron 236.
- Furniture blocks: Bed 1162 (BED_ID; BED_BYTE 134 in compact world data),
  Crafting table 41, Chest 43, Bookshelf 44, Chiseled bookshelf 243–245,
  Painting 1046, Flower pot 367, Cake 228, Hay bale 49, Lantern 46, Sea lantern 48,
  Jack o'lantern 87, Glowstone 47, Torch 80, Candle 232, Campfire 85/230,
  Fire 102, Chain 239, Ladder 140, Bell 179, Scaffolding 606, Cobweb 259.
- Structure: Oak fence 1174, Spruce fence 1175, Oak door 105, Trapdoor 107/108,
  Glass 37, panes 377, Stained glass panes, Wool 62–69 (white/red/blue/yellow/
  green/black/purple/orange) + more, Stairs 70–75, Slabs 626/1185–1189,
  Logs 16/19/22/25/143, Planks 17/20/23/26/28/29, Terracotta/glazed, Bricks 50,
  Stone bricks 8, Smooth stone 9, Sandstone 11, Snow 51, Water 39, Lava 40,
  Wheat 692, Farmland 359, Dripstone 349/534, Paper 1047, Feather 904, Leather 966,
  String 1135, Flint 914, Coal 817, Charcoal 748.

## The 20 interior designs

Each is a layout recipe for `generateHouseStructure`. Notation: `id` = block id.

### Cottage family (1-floor)

**1. Cozy Cottage** — Source: Wiki small house 1–4; furniture tutorial.
Layout: single room, bed alcove at back. Bed (1162) on white wool (62) pillow;
furnace (42) + crafting table (41) kitchen corner; barrel (171) pantry; oak
table = fence (1174) post + oak slab (1185) top, 2 chairs = oak stairs (70) on
slab; red wool (63) rug; fireplace = cobble (6) surround + campfire (85) +
brick chimney; lantern (46) on wall.

**2. Farm Shack** — Source: Wiki small house 6 (flowerbeds, tiny); farmer guide.
2×3–4×4 interior. Bed (1162); composter (264); hay bale (49) stool; wheat
(692) sheaf corner; flower pots (367) on sill; lantern (46). Cozy and cramped.

### Forge / smith family

**3. Blacksmith Forge** — Source: thespike.gg weaponsmith; wiki forge.
Central anvil (151) on stone-brick (8) pad; blast furnace (194) + lava hearth
(lava 40 in cobble (6) ring); grindstone (403); smithing table (622); barrel
(171) charcoal bin (charcoal 748); tool rack = spruce fence (1175) + signs;
lanterns (46) on chains (239); bed (1162) in back corner.

**4. Weaponsmith Workshop** — Source: thespike.gg; wiki weaponsmith.
Grindstone (403) + anvil (151) flanking a lava forge (40 + stone bricks 8);
smoker (623) as the forge; weapon display = oak fence (1174) + iron block (414)
rack; coal block (257) bin; storage chests (43); bed (1162); floor = stone
slab (1185) over planks.

**5. Toolsmith** — Source: wiki Tool Smith House.
Smithing table (622) center; grindstone (403); workbench = log (16) + slab;
barrels (171) of ore; stone slab (1185) counters; iron block (414) trim;
lantern (46); bed (1162).

### Townhouse / multi-floor

**6. 2-Story Townhouse** — Source: wiki small house 5 (two-story, balcony);
furniture tutorial.
Ground: entrance + sitting area — sofa = 2 oak stairs (70) back-to-back + blue
wool (64) cushion; coffee table = slab (1185) on slab; painting (1046); kitchen
— crafting table (41), furnace (42), cake (228) on slab table, barrel (171)
pantry, dining table + 4 stair chairs; real oak stairs (70) to loft. Upper:
bed (1162), dresser = double chest (43), wardrobe = fence + slab; trapdoor
shutters (107) on windows.

**7. Family Home** — Source: CurseForge full-interior room set.
Ground: kitchen (furnace 42 + cake 228 + barrels 171) + dining (table +
stair benches) + sitting (sofa + fireplace 85). Upper: 2 bedrooms (bed 1162 +
dressers 43 + paintings 1046), bathroom nook (cauldron 236 + water 39 +
lantern). Interior oak stairs (70).

### Library / knowledge

**8. Village Library** — Source: wiki Library ×2; thespike.gg librarian.
Lectern (432) center; floor-to-ceiling bookshelves (44) on walls; chiseled
bookshelves (243); long reading table = slab (1185) + stair chairs (70); red
wool (63) carpet runner; lantern chandeliers = chain (239) + lantern (46);
candle (232) on tables; enchant nook = glowstone (47) + lapis accent (blue
wool 64).

**9. Cartographer's House** — Source: wiki Cartographer; thespike.gg.
Cartography table (234) center; wall maps = painting (1046) framed with spruce
fence (1175); paper stack = white wool (62) slabs; compass (→ iron block 414 +
sign); desk + chair; bed (1162); barrels (171) of maps; lantern (46).

### Tavern / gathering

**10. Village Tavern** — Source: wiki medium house; tavern guide.
Bar counter = oak fence (1174) posts + oak plank (17) top + stair (70) edge;
bar stools = trapdoor (107) on slab (1185); brewing stand (209) behind bar;
kegs = barrels (171); long tables + benches (stairs 70); fireplace (85 + cobble
6 + chimney); tankards = signs; lanterns (46) on chains; kitchen nook = smoker
(623).

**11. Meeting House** — Source: wiki Meeting Point ×5; forum (bell).
Bell (179) at entrance; long hall with bench rows (stairs 70); lectern (432);
fireplace (85); banner accents (wool 62–69 on walls); lanterns (46); wells of
water (39) and hay (49) for villagers; wide 4-tall ceiling for golems.

### Tower / vertical

**12. Watchtower** — Source: wiki; medieval tower guide.
Central spiral = oak stairs (70) around a log (16) pillar; ground: guard room
— bell (179), chests (43), lantern (46); mid: sleeping loft — bed (1162);
top: lookout — glowstone (47) + sea lantern (48) + ladder (140) to a roof
platform; arrow slits = stair windows.

### Manor / grand

**13. Manor Grand Hall** — Source: wiki; medieval manor guide.
Entrance hall: red carpet (63) runner, chandelier (chain 239 + lantern 46),
paintings (1046), flower pots (367) on pedestals. Left parlor: 2 sofas +
fireplace (85) + coffee table. Right dining: long table + benches. Upstairs:
2–3 bedrooms (bed 1162 + dressers 43 + wardrobes), library nook (44), servants'
oak stairs (70). Stone-brick (8) hearth.

**14. Country Manor** — Source: CurseForge full-interior; exitlag layout.
Entrance → kitchen (furnace 42 + cake 228 + barrels 171 + smoker 623) → storage
room (chests 43 + barrels 171) → sitting room (sofa + fireplace 85) → bedrooms.
All connected by plank (17) corridors and oak stairs (70); lanterns (46).

### Cathedral / temple

**15. Village Cathedral** — Source: wiki Temple ×2; thespike.gg cleric.
Nave: pew rows = oak stairs (70) facing altar (stone bricks 8 + lantern 46);
red wool (63) aisle; stained glass panes (377) windows; candle (232) racks;
pulpit = lectern (432); chandelier (chain 239 + lantern 46); crypt = oak stairs
(70) down to a stone-brick vault; ceiling glowstone (47) rosettes.

**16. Cleric's Temple** — Source: wiki temple; thespike.gg cleric.
Brewing stand (209) on cauldron (236) + red carpet (63); glowstone (47) altar;
bookshelves (44) + potion shelf (candles 232); stained glass (377); dripping
dripstone (534) detail; sea lantern (48) pool; bed (1162) alcove.

### Profession houses

**17. Fisherman's Cottage** — Source: wiki Fisher Cottage; thespike.gg.
Barrel (171) workstation; fishing rod = spruce fence (1175) + sign; fish tank =
glass (37) box + water (39) + coral/kelp; wooden floor (planks 17); bed (1162);
campfire (85) outside door; hay (49) crate; lantern (46).

**18. Butcher's Shop** — Source: wiki Butcher Shop ×2.
Smoker (623) + hanging meat = chain (239) + red wool (63); hay bale (49)
shelves; chopping block = log (16) + slab (1185); barrels (171) + chests (43);
counter = stone slab (1185) + stairs (71); lantern (46); bone detail = bone→
white wool (62) on shelf.

**19. Fletcher's House** — Source: wiki Fletcher House.
Fletching table (366) center; feather display = white wool (62) on slabs (1185);
hay bale (49) corner; quiver = banner/wool wall accent; chests (43) of string
(1135) + flint (914); small bed (1162); lantern (46).

**20. Mason's House** — Source: wiki Mason House; stonecutter.
Stonecutter (639) center; clay/terracotta shelf displays (terracotta variants);
workbench = smooth stone slab (626); chisel display = chiseled stone bricks
(252) + chiseled sandstone; cauldron (236); barrels (171) of sand (10);
lantern (46); bed (1162).

### Cross-cutting interior rules (for implementation)

- Ground floor = living/kitchen/work; upper = sleep. Real stair blocks connect.
- Every house: ≥1 bed (1162), ≥1 light (46/80/47), storage (43/171).
- Profession house: its workstation block + 1–2 thematic deco + storage + bed.
- Wall trim: log (16) corner posts already exist; add fence shelves, sign
  details, painting (1046), flower pot (367), trapdoor shutters (107).
- Floors: plank (17) by default; stone slab (1185)/smooth stone (626) in
  forges/libraries; wool rug (63/64) accents.
- Fireplace: cobble (6)/stone-brick (8) surround + campfire (85) + chimney.
- Lighting: lantern (46) hanging on chains (239) or on walls; torch (80) in
  cheap houses; glowstone (47)/sea lantern (48) in grand buildings.
- Ceilings ≥3 blocks (4 in meeting/manor for golems per forum research).

## Phase 3 spawn/design mapping (current)

- Add `VILLAGE_HOUSE_DESIGNS` in `src/game/terrain/structures.ts`: one entry per
  researched interior (`house-design:<key>`), each with shell-style key, floors,
  footprint range, palette, workstation/object list, and room recipe.
- Split house construction into shell-only plus interior-only. Village gen keeps
  using shells, but selects a deterministic interior design compatible with the
  placed style/floors/footprint; neighboring houses must not repeat the same
  interior.
- Expose the same 20 designs in SimDeck "houses" through the catalog plus a
  `stampHouseDesign` bridge path, so each design spawns individually on :DEV.
  Reuse `simWriteCell` behavior: `BED_ID` becomes `BED_BYTE` in sim captures.