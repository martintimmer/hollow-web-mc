# Token-Efficiency Plan (AI session cost reduction)

Goal: minimize tokens spent on file reads per AI session without losing velocity.
Baseline (2026-09-06): AGENTS.md 603 lines / 55 KB injected on every file read;
Game.tsx 4,301 lines; blocks.ts 12,576 lines (generated); SimDeck.tsx 2,066 lines;
data/telemetry-perf.jsonl 40 MB; catalog/thumbnails*.json ~2.6 MB each.

## P0 — Stop the per-read AGENTS.md tax (DONE 2026-09-06)
- AGENTS.md slimmed to ~130 lines: KB protocol, task queue, gates, envs, restarts,
  worldgen/seed, version, hard rules (incl. quarantine + workflow), no-probe policy,
  test-runner preference, cleanup. Everything else moved out.
- Human visual checklist + session history moved to docs/HUMAN_TEST_CHECKLIST.md
  (read on demand, never injected). Rule: new entries go there, latest-first,
  one entry per feature, no running commentary.
- Why: the checklist was append-only history inside an injected file — every shipped
  feature permanently taxed every future file read.

## P1 — Finish the Game.tsx split (DONE 2026-09-06)
- `src/game/engine/engineInit.ts`: the ~2,650-line engine-bootstrap effect as
  `initEngine(deps)`; Game.tsx keeps a single call site.
- `src/game/chat/chatController.ts`: openChat / handleChatCommand / closeChat.
- `src/components/gameActions.ts`: presets, weather, respawn, pause/menu handlers.
- Target: Game.tsx pure wiring (<1,000 lines). Each module header states
  responsibility + key exports so future sessions skip reading bodies.
- Safety: verbatim moves, no behavior change; tsc + build + sim:test after each step.

## P2 — Quarantine giant generated/data files (DONE 2026-09-06)
- Hard rule (AGENTS.md): never Read blocks.ts, catalog/*.json, thumbnails json,
  data/*, *.log/*.jsonl, dist/*, snapshots, docs images.
- `scripts/block-lookup.mjs <id|name>`: one-line block-def lookup (replaces opening
  blocks.ts / completeRegistry.json).
- `scripts/repo-weight.mjs`: top-N files by approx tokens; baseline + after numbers.

## P3 — Navigate via index, not via reading (standing rule)
- Consult kb/code-index.json + docs/ARCHITECTURE.md first; open only anchor lines.
- Keep KB code anchors current — stale anchors cause expensive hunting.

## P4 — Session workflow rules (standing rule, in AGENTS.md)
- Grep-first; Read with offset/limit windows; no full reads of files >500 lines.
- Delegate exploration to Task subagents ("return file:line + 3-line summary").
- Tail all gate/build output; never dump raw logs into context.

## Measured effect
- Before: AGENTS.md 603 lines (~13.7k tok) injected per read; Game.tsx 4,301
  lines (~41.7k tok, #9 heaviest file).
- After: AGENTS.md 121 lines (~1.6k tok) injected per read (**-88% per-read
  overhead**); Game.tsx 1,403 lines (~12.0k tok, out of the top-14).
  Engine code lives in `src/game/engine/engineInit.ts` (moved verbatim,
  byte-identical body), chat in `src/game/chat/chatController.ts`, UI actions
  in `src/components/gameActions.ts`.
- New guardrails: `scripts/block-lookup.mjs`, `scripts/repo-weight.mjs`,
  quarantine list in AGENTS.md, checklist in `docs/HUMAN_TEST_CHECKLIST.md`.
- Gates at landing: tsc clean, build clean, sim:test 266/266, textureCheck PASS,
  kb:check PASS, pages:check PASS. worker-meshing: only the pre-existing
  `draw calls bounded` flake (fails identically without this change).
  NOTE 2026-09-06: a parallel session is mid-rewrite of `SimDeck.tsx`
  (syntactically broken at landing time) — re-run `tsc`/`build` once it lands.
