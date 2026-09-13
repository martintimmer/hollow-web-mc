---
id: ui/portal-modal
title: Portal & recall modal
kind: ui
wiki: https://minecraft.wiki/w/Portal
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-05
status: implemented
tags: [ui, modal, portal, recall, teleport, home]
related_docs: [docs/NETHER_DIMENSION_PLAN.md]
---

# Portal & recall modal

Save/teleport between named spawn portals (incl. a home). Pairs with nether/dimension
travel and the recall system.

## Vanilla specs

- No vanilla counterpart: vanilla Nether travel uses obsidian-frame portals
  (min 4×5, max 23×23) with portal-block teleport + loading screen, and
  respawn is bed/world-spawn based. Our named-portal recall list is a custom
  convenience layer on top of dimension travel.

## Our implementation

| Concern | Where |
|---|---|
| Portal modal | `src/components/gui/PortalModal.tsx` (`SpawnPortal`, `onSavePortal`, `onDeletePortal`, `onTeleportTo`) |
| Recall modal | `src/components/gui/RecallModal.tsx` |
| Portal storage | `src/game/state/portalStorage.ts` (`SpawnPortal` type) |

## Deviations / limitations

- Portals are player-saved markers, not vanilla nether-portal frame logic.

## Ruleset when modifying

- Portal state persists per-user; respect env gating for dev-only features.
- Gate: `npm run kb:check`, `npm run sim:test`.

## Open work

- True nether-portal frame detection (see `docs/NETHER_DIMENSION_PLAN.md`).
