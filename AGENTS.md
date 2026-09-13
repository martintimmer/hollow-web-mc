# AGENTS.md — repo conventions for autonomous sessions

## Knowledge base (read FIRST when touching a block/entity/mechanic)

`kb/` holds Minecraft behavior specs mapped to this codebase. Protocol:
1. Look up the subject in `kb/index.json`, read the entry (specs + our code anchors +
   deviations + ruleset).
2. No entry? Fetch `https://minecraft.wiki/w/<Title>` and create one from
   `kb/_templates/entry.md` before implementing.
3. After implementing, update the entry if anchors/deviations changed.

## Token discipline (sessions here are expensive — follow this)

- Grep-first: locate with `grep`/`glob` before opening any file.
- Windowed reads only: `Read` with `offset`/`limit`; never full-read files >500 lines.
- Delegate exploration to `Task` subagents ("return file:line + 3-line summary").
- Tail all gate/build output; never dump raw logs into context.
- Entry points: `kb/code-index.json` + `docs/ARCHITECTURE.md` first, then anchor lines only.
- QUARANTINE — never `Read`: `src/game/blocks.ts`, `src/game/engine/atlasData.ts`,
  `catalog/*.json`, `public/catalog/*`, `data/*`, `dist/*`, `*.log`, `*.jsonl`,
  `snapshots/*`, `package-lock.json`, media files. Block lookups:
  `node scripts/block-lookup.mjs <id|name>`. Repo weight: `node scripts/repo-weight.mjs`.

## Task queue & plans

- `docs/KNOWN_ISSUES.md` is the prioritized task queue (U-series + live-play issues).
  Update its statuses when work lands.
- Other plans: `docs/ROADMAP.md`, `docs/GAMEPLAY_POLISH_SPEC.md`,
  `docs/TEXTURE_FIX_PLAN.md`, `docs/CONSOLIDATED_IMPLEMENTATION_PLAN.md`.
- Token plan: `docs/TOKEN_EFFICIENCY_PLAN.md`.

## Machine gates (run after every code change)

```
npx tsc -b
npm run build
npm run sim:test
node catalog/textureCheck.mjs
node scripts/test-worker-meshing.mjs
npm run kb:check
npm run pages:check
```
Visual/perf changes additionally: `npm run ci:perf` (golden-frame MAE gate).

## Environments (read kb/environments.md before touching ports/servers/UI gating)

- **Prod** and **dev/sim** are COMPLETELY separate: separate processes, separate
  database files, never shared. Ports, paths, service names and restart recipes are
  deployment-specific and live in the private ops runbook (`docs/ops-private/`).
- Prod runs the normal game; dev/sim runs the admin-gated Sim Deck. Dev-only features
  (Builder Studio / building mode) MUST be hidden on prod; gate UI by `isSimPort()`,
  not `isSim()`.
- All server paths are env-overridable (`WEBMC_DB_PATH`, `WEBMC_WORLDGEN_DB_PATH`,
  `WEBMC_CUSTOM_DB_PATH`, `WEBMC_PORT`, `SIM_DB_PATH`, ...). Never hardcode a
  deployment path or point the dev API at the prod database.

## Deployment restarts (MANDATORY after every change)

After ANY code change (client or server), restart every affected service and verify —
stale servers silently serve old behavior and waste human test cycles. Exact service
names, ports and restart commands live in the private ops runbook (`docs/ops-private/`).
Verify the worldgen summary endpoint returns presets equal to
`catalog/biome-registry.json`. Seed/worldgen verification runs against **prod**; the
sim environment is a sandbox and never the seed-verification environment.

## World-gen DB & seed visualizer

- Separate sql.js DB (`server/worldgen-db.js`, env-overridable paths). Catalog source
  of truth: `catalog/biome-registry.json` (re-seeded on every server start). The main
  game DB keeps game assets.
- `/seed.html` (built from `seed-page/`, hooked into `npm run build`) runs the REAL
  generator (`src/game/terrain`); APIs: `/api/worldgen/summary|report|reports`.

## Version (bottom-right HUD tag)

`npm run build` auto-bumps the patch version in `package.json` and regenerates
`src/buildTag.ts` (`VERSION` + `BUILD_TAG`) — the HUD shows it bottom-right. No
manual version bumping needed; always run `npm run build` after edits.

## Hard rules

- NEVER hand-edit `src/game/blocks.ts` directly — fix `catalog/completeRegistry.json` +
  patch scripts, then regenerate (see `catalog/patchRegistryIds.mjs` history, U7).
- Regenerating the master atlas is destructive (U9) — do not run casually.
- `meshWorker.ts` and `engineInit.ts` `advanceMeshJob` must stay in parity for all shapes.
- Do not add code comments unless asked; follow existing file conventions.
- Do not commit unless explicitly asked.

## Visual verification: agents do NOT run browser probes

Agents must NOT launch headless Chromium / CDP probes (probe-*.mjs, capture-*.mjs,
`npm run ci:perf`, etc.) for verification. They are slow, burn CPU, and pass ~90%
of the time while missing real visual regressions. Machine gates (tsc, build,
sim:test, textureCheck, worker-meshing) are the agent's verification; anything
visual/perceptual is verified manually in a real browser.

**When an implementation is complete, append ONE short human test entry
(what to open, what to toggle, what to look for, latest-first) to
`docs/HUMAN_TEST_CHECKLIST.md` (read on demand, never injected) and repeat it
in the final response.**

## Test-runner preference (IMPORTANT — do this always)

Do NOT launch headless Chromium or automated browser-driver tests to reproduce or
verify behavior. Make the change, pass the machine gates, state exactly what to open,
toggle and look for, then iterate on the manual test report.

## Cleanup note (background processes)

If any headless Chromium is ever left running, kill it before wrapping up:
`pkill -9 -f 'chromium.*--headless=new'` — a leftover instance can peg 1000%+ CPU.
Check with `pgrep -c -f 'chromium.*headless'`.
