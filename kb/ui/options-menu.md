---
id: ui/options-menu
title: Options / Settings menu (incl. post-fx)
kind: ui
wiki:
game_version: ""
fetched_at:
updated_at: 2026-09-05
status: implemented
tags: [ui, settings, video, postfx, persistence]
related_docs: [postfx.md, docs/POST_FX_PLAN.md]
---

# Options / Settings menu (incl. post-fx)

Settings modal with the Video tab hosting post-processing toggles. Pairs with
`postfx.md`.

## Vanilla specs

- Vanilla Options: FOV, render/simulation distance, graphics Fast/Fancy,
  smooth lighting, particles, clouds, entity distance; video settings apply
  live and persist in `options.txt`. No post-processing section exists in
  vanilla — ours extends the concept.

## Our implementation

| Concern | Where |
|---|---|
| Menu | `src/components/gui/OptionsMenu.tsx` (Video tab → Post-Processing Effects) |
| Post-fx state | `src/components/Game.tsx` (`dof`, `dofStrength`, `ca`, `caStrength`, gamut) |
| Persistence | `src/services/api.ts` + `server/index.js` + `server/db.js` (`user_preferences`) |

## Deviations / limitations

- Settings persist per-user on the server (like FOV), not local-only.

## Ruleset when modifying

- New toggles must add a `user_preferences` column + migration in `server/db.js`.
- Keep `ci:perf` golden-frame MAE gate green for any post-fx change.
- Gate: `npm run kb:check`, `npm run ci:perf`.

## Open work

- More Video/Accessibility tabs parity.
