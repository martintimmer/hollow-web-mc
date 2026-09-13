---
id: ui/world-map-modal
title: World map modal
kind: ui
wiki: https://minecraft.wiki/w/Map
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-05
status: implemented
tags: [ui, modal, map, minimap, exploration]
related_docs: []
---

# World map modal

Overhead map overlay of explored terrain/structures for navigation.

## Vanilla specs

- Vanilla maps are 128×128 items (zoom 0–4, each level doubles coverage),
  filled by exploration, cloned/shared, framed, with banners as waypoints;
  cartography table extends/locks/copies. No fullscreen key-bound atlas.

## Our implementation

| Concern | Where |
|---|---|
| Modal | `src/components/gui/WorldMapModal.tsx` (`WorldMapModalProps`) |
| Map render | `src/game/engine/worldMap.ts` |

## Deviations / limitations

- Rendered from client-known chunks; not a vanilla item-held map with zoom levels.

## Ruleset when modifying

- Map tiles must come from the mesher/atlas pipeline, not re-decoded PNGs.
- Gate: `npm run kb:check`, `npm run build`.

## Open work

- Zoom levels; held-map item parity.
