# Next Feature Plan — KB as Linked Database, Editor Animals, Mob Skins, Bow Weapon

> 2026-08-28. Companion to `docs/GAME_MODULARIZATION_PLAN.md` and the OptiFine roadmap.
> This plan covers the four larger asks: (A) turning the KB into a linked "Wikipedia-style"
> knowledge graph, (B) showing animals/mobs in the Block Editor, (C) authentic mob skins,
> (D) the Bow weapon with infinite arrows.

---

## A. Knowledge Base → linked, Wikipedia-style knowledge graph

### Goal
The KB is currently individual `kb/*.md` files (offline, no cross-links). The aim: a
**linked, queryable knowledge graph** that connects the Minecraft-wiki facts we fetch with
the **game code/objects that implement them** — and a repeatable **methodology for finding
those links**.

### How we already link (foundation)
- `kb/index.json` = machine index (path, title, tags, status) — `/kb.html` renders it grouped
  with statuses and cross-links to the catalog pages.
- Entries carry frontmatter `wiki:` (source URL), `kind`, `status`, and an
  **"Our implementation" table** of code anchors (file:line) — this is the manual link.
- `catalog/biome-registry.json` / `catalog/object-classification.json` / `block-shapes.json`
  are machine catalogs that the pages already join with KB entries by name.

### Target architecture (chosen: SQLite "link graph" over a graph DB)
A **SQLite link graph** (in the worldgen/config db — new tables) is the pragmatic choice over
a full graph DB (Neo4j/Arango) because the server already runs `sql.js` and the dataset is
small (≈100 KB entries, ≈1200 objects). Three node types:

```
kb_entry (id, title, kind, wiki_url, status, path)
game_object (catalog id, name, category, shape, vanilla_id, classification)   # from JSON catalogs
wiki_page (title, url, fetched_at, summary)                                    # fetched from minecraft.wiki
```

and **edges** (the "extraordinary" links):
```
kb_entry -MENTIONS-> wiki_page
kb_entry -IMPLEMENTS-> game_object          # the anchor table from each entry's "Our implementation"
game_object -REFERENCES-> wiki_page          # auto-generated: name/vanilla_id → minecraft.wiki/w/<Title>
game_object -IS_A-> catalog_category/shape/classification
wiki_page -TAGGED-> topic (terrain|entity|item|mechanic|ui)
```

### Methodology to FIND the links (repeatable, automatable)
1. **Name/registry match (automated)**: every game object's `vanilla_id`/name maps to
   `https://minecraft.wiki/w/<Title>` (underscore, title-case). We already generate these in
   `/blocks.html`. Emit this as an edge automatically.
2. **Code-anchor extraction (semi-automated)**: each KB "Our implementation" table row
   `file:line` → parse into an edge. A small script (`scripts/kb_link_extract.mjs`) reads the
   markdown tables and emits `kb_entry -> file:symbol`.
3. **Symbol ↔ object resolve (automated)**: map code symbols back to objects — e.g., the KB
   chest entry mentions `pushChest`/`createArticulatedChest`; grep the source for the object
   names/ids those functions reference (id 43) → connect to `game_object 43`.
4. **Wiki summary ingestion (semi-automated)**: when a new KB entry is created from a wiki page,
   store the fetched markdown's first sections as `wiki_page` + tag it by the page's category
   (navbox / infobox). This gives the "related pages" (Beach → Snowy Beach, Stony Shore…).
5. **Human review loop**: `/kb.html` shows any *unlinked* objects (object with no KB entry) and
   *dangling* edges — the "gap list" that drives which wiki pages to fetch next.

### Deliverables
- `server/worldgen-db.js`: new tables `kb_entry`, `wiki_page`, `kb_edge` (+ seed from `kb/index.json`
  + object catalogs on startup).
- `scripts/kb_link_extract.mjs`: extracts code-anchor edges from `kb/*.md`.
- `/api/kb/graph`: returns nodes+edges for the visualizer.
- `/kb.html` upgrade: show the graph (force-directed or table), gap list (unlinked objects),
  and "related wiki pages" per object.

**Effort**: ~2–3 days. **This is the highest-leverage item** — once the graph exists, every new
biome/block/entity added to the KB auto-creates its wiki + game links.

---

## B. See animals & mobs in the Block Editor

The Block Texture Studio (`/editor.html`) only previews blocks. To see entities:

- Add an **"Entities" tab** to the editor that instantiates the real 3D models:
  `createCowMesh/createSheepMesh/createPigMesh/createChickenMesh/createHorseMesh/createDogMesh`
  (`src/game/entities/animals.ts`) and the hostile mob meshes (`spawner.ts`), rendered on the
  same rotating stage (reuse the `update3DGeometry` scene).
- Entities listed with name, type, KB + wiki link, and a **texture slot overview** (which
  material/color each part uses) so future per-part recoloring can reuse the same apply-to-DB
  pipeline as blocks.
- For hostiles (skeleton/creeper/zombie/spider) we need **mob meshes with proper parts** — see C.

**Effort**: ~1 day for animals (meshes exist); +1–2 days for hostiles once C lands.

---

## C. Authentic mob skins (skeleton, creeper, etc.)

Mobs are currently flat colored boxes (green/grey). To make them look like the wiki models:

1. **Skeleton**: boxy white-bone body with dark grey pants/boots, skull head with hollow eye
   sockets, and a **held bow** (small brown arc + string).
2. **Creeper**: green blocky body with the 4-feet pattern and the distinctive dark-green
   camouflage pixels; no arms; the classic "hiss" face (dark eyes/mouth pixels on the front).
3. **Zombie**: green skin, blue-turquoise shirt with ragged arms forward (arms-out zombie pose).
4. **Spider**: 8 legs, red eyes, black/grey body.

Implementation: replace the flat-colored `MeshLambertMaterial` bodies in `spawner.ts` (or a new
`mobs.ts`) with **procedural boxy models** (like the animals) using a small palette per mob —
no atlas textures needed, so no asset pipeline change. Optionally later: real 16×16 mob skins
baked into a mob atlas.

**Effort**: ~1–2 days per mob (procedural boxy models are fast and match the vanilla blocky look).

---

## D. Bow weapon (instant fire, infinite arrows, 3D arrows with arc + stick-into-surface)

The skeleton will shoot you (visuals only); you fight back with the bow. Decisions
locked in 2026-08-29: **instant click-to-fire** (no draw/charge), **infinite ammo**
(no Arrow item), **one-way combat** (player arrows hurt hostile mobs; skeleton arrows
do NOT damage the player), **~15-block range** (vanilla-like), **full feedback**
(bow pull animation, hit sparks, arrows stick in blocks), **no fire-rate cooldown**.

### Item & equip
- Add **Bow** to the vanilla inventory (already in the catalog as an item — add `heldItem.ts`
  support: a curved 3D bow model in the right hand via `createHeldBowMesh`, using wood texture +
  string). `heldItem.ts` already routes item ids to held sprites — add a bow branch.
- Select the bow in the hotbar → `s.hotbar[s.slot]` = bow id → right-click / TAKE fires **instantly**.
- Fire feedback: brief bow **pull animation** (string nocks back ~0.15s then snaps) via a short
  held-item animation state; no damage/range difference from holding longer.

### Arrow projectile (infinite ammo — no arrow item needed)
- New `src/game/engine/arrows.ts`: an arrow entity = thin 2×2×16px stick + sharp tip (cone),
  oriented along its velocity. Spawn at the bow tip with the player's aim.
- **Physics**: gravity-affected ballistic arc (velocity from aim, `GRAV` applied); range cap
  ≈ **15 blocks** (despawn or stick when `dist > 15`).
- **Impact**: ray-march the arrow path; on hitting a **solid block**, **stick it in the surface**
  (embed the tail into the block face, small penetration) and leave it with a short despawn
  timer; spawn small **hit sparks** (particle burst) on impact. On hitting a hostile mob, apply
  damage (3–6 HP, scaled: spider/husk take more) and despawn. Animals are NOT damaged by arrows.
- **Damage model**: arrows call the mob health system directly (mobs already carry `health` in
  `spawner.ts`); killing a mob removes it from `mobMgr` as today.
- **Player is not hurt by arrows** — skeleton arrows are visual only (no `damagePlayer` call).
- Rendering: a THREE.Group (stick + tip) added to `s.scene`, updated per-frame in the render
  loop (new tick), removed on impact/despawn.

### Skeleton AI
- Skeletons already shoot at the player within aggro (10 blocks, survival); reuse the same arrow
  system for their shots but make them **non-damaging** (pure visual threat + hit sparks).

### Verification
- Headless probe: equip bow → fire → assert an arrow entity spawns, travels an arc, sticks into
  a placed block, despawns after ~15 blocks; firing a second arrow before the first lands works
  (no cooldown); a skeleton arrow passing the player causes no health change; hitting a mob
  reduces its health.

**Effort**: ~1.5 days (arrow physics + rendering + bow model + skeleton non-damaging shots).

---

## Priority & sequencing
1. **KB link graph (A)** — highest leverage; unblocks future biome/block/entity automation.
2. **Mob skins (C)** then **editor entities (B)** — B depends on C for hostiles.
3. **Bow + arrows (D)** — self-contained gameplay feature; do after C so the skeleton can use it.

All items reuse existing patterns (factory modules, worldgen-db, `/seed.html`/`/blocks.html`/`/kb.html`
pages, headless-probe verification, AGENTS.md gates).