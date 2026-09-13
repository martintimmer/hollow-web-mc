---
id: ui/onboarding
title: First-join onboarding card
kind: ui
wiki: https://minecraft.wiki/w/Tutorial
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: implemented
tags: [ui, onboarding, tutorial, first-join, controls]
related_docs: []
---

# First-join onboarding card

Dismissible 60-second primer (controls + goal chain) shown until the player
acknowledges it; dismissal persists per browser.

## Vanilla specs

- Java Edition has contextual tutorial toasts (movement, inventory, crafting
  table) that advance with progress — not a single card, and dismissible per
  toast. No iron-age goal hint.

## Our implementation

| Concern | Where |
|---|---|
| Card | `src/components/gui/FirstJoinCard.tsx` (self-contained; `visible` prop only) |
| Mount | `src/components/Game.tsx` after `<HUD/>` (`visible={!titleScreenOpen && !loading}`) |
| Dismissal | `localStorage` `mc_onboarding_dismissed = "1"` (per browser, not per user) |

## Deviations / limitations

- Single static card, not progress-advancing toasts; per-browser flag means
  alt accounts on one machine never see it, new browsers always do.
- Content is timing-agnostic (no day-clock or hardcore warnings).

## Ruleset when modifying

- Keep the component prop-free except `visible` (no game-state coupling).
- Goal chain in the card must mirror the real progression
  (coal → furnace → iron pickaxe); update the copy if recipes change.
- Gates: `tsc -b`, `npm run build`, `npm run kb:check`.

## Open work

- Progress-advancing hints (first coal → furnace hint; first ingot → table hint).
- Per-user dismissal sync instead of per-browser localStorage.
