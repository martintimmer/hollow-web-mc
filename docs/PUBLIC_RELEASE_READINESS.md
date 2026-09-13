# PUBLIC RELEASE READINESS — Hollowpine (web-mc)

> **Purpose:** single source of truth for making this repo public without leaking personal / sensitive data.
> **Mode:** report + remediation tracker. No code fix is “done” until this file is updated and re-rated.
> **Scope:** 2861 tracked files + ~60 untracked files inventoried 2026-09-13. Full audit: `server/ data/ docs/ kb/ scripts/ fixtures/ snapshots/ e2e/ public/ src/` + configs + `dist/ catalog/ build-page/ block-page/ seed-page/`.

---

## 0. AGENT PROTOCOL (MANDATORY — read before any change)

Any agent working on public-release remediation MUST follow this:

1. **Read this file first.** Check `Current rating` + `Checklist` before touching code.
2. **Pick ONE checklist item** (topmost unchecked blocker first). Do not batch unrelated fixes.
3. **Make the change** (minimal diff, respect repo conventions in `AGENTS.md`).
4. **Verify** with the `Verify` command listed on that item (grep / git check). Paste abbreviated output in your summary.
5. **Update this file in the SAME turn:**
   - Flip `- [ ]` → `- [x]` when done, or `- [~]` when partially fixed; add date + commit hash.
   - Append a row to `Rating history` (date, change, new score, new light).
   - Recompute `Current rating` per scoring rules below.
   - Update `Files changed` log.
6. **Never** commit unless user explicitly asks. Never print full secrets (mask as `prefix***suffix`).
7. **Never** `git add` a file listed in `Must stay untracked / ignored` without explicit user approval.
8. If a fix reveals a NEW leak, add it to `New findings` with `file:line` + severity, and lower the score.

**Scoring rules (apply after EVERY modification):**

| Light | Score | Meaning |
|---|---|---|
| 🔴 RED | 0–59 | DO NOT PUBLISH. Hard blocker open. |
| 🟡 YELLOW | 60–89 | Only low-risk items left. Private review OK, still do not publish. |
| 🟢 GREEN | 90–100 | Public-safe. All blockers + high risks fixed + verified. Green light to publish. |

**Points model:** total = 185 pts (BLOCKER 20 · HIGH 10 · MEDIUM 5 · LOW 1). Full credit when verified done; **half credit** for a partially fixed item (e.g. working tree cleaned but git history still leaks). `Score = round(100 × earned / 185)`.

**Hard rule:** a valid leaked credential (unrevoked token, unrotated password, hashes still in history) keeps the light RED no matter the score. GREEN requires: zero BLOCKER + zero HIGH open + `Final verification` all passing.

---

## 1. Current rating

```text
Score: 100 / 100  (earned 185 / 185 pts)
Light: 🟢 GREEN — PUBLIC-SAFE. All audit items closed and verified.
Published: https://github.com/martintimmer/hollow-web-mc (public, 2026-09-13; history squashed to a single initial-release commit)
Updated: 2026-09-13 — published as a fresh public repo; history squashed; verified no DBs/logs on remote.
```

**One-line reason:** all personal/sensitive exposure is resolved — token revoked (401 confirmed), history purged, test accounts removed, paths/handles/ports scrubbed, ops docs private, LICENSE added. Remaining items are honest self-hosting hardening only.

---

## 2. Rating history (append after EVERY modification)

| Date (UTC) | Change made (files) | Score | Light | Notes |
|---|---|---|---|---|
| 2026-09-13 | Initial audit, file created, no code changed | 5 | 🔴 RED | 4 blockers open |
| 2026-09-13 | Remote token URL cleaned; prod DB untracked; 7 probes env-var'd; `123456` default removed; `kb/environments.md` scrubbed; `.gitignore` hardening; this file self-sanitized | 27 | 🔴 RED | verified: remote clean, `.git` token-free, no `.db` tracked, 7/7 ignores; pending: revocation, filter-repo, password rotation |
| 2026-09-13 | H2+H3: 102-file path codemod (`/opt/web-mc/` stripped); server paths → module-dir + env overrides; 18 brain-UUID paths → `snapshots/`; python/shell/import fixes; docs `file://` → GitHub URLs | 38 | 🔴 RED | `git grep` `/opt/web-mc\|/root/\.gemini` = 0; `node --check` all OK; `py_compile` + `bash -n` OK; `tsc -b` exit 0 |
| 2026-09-13 | H1+H4+H5: admin handle removed (fail-closed `SIM_ADMIN_USERNAME`); 149 docs/kb files port-tokenized; core topology docs rewritten; nginx conf renamed `server/nginx-dev.conf`; ops plan moved to ignored `docs/ops-private/`; `.commandcode/` untracked; src UI/comment ports cleaned | 54 | 🔴 RED | `ADMIN_HANDLE`/`nginx-5450`/`/opt/web-mc`/`/root/.gemini` = 0 in publishable files; port literals in publishable docs = 0; `tsc -b` = 0 |
| 2026-09-13 | H6: `LICENSE` (MIT) + `ASSETS.md` provenance added; `package.json` `"license": "MIT"`; music + paintings un-ignored and staged (user owns rights) | 59 | 🔴 RED | `git status` shows LICENSE/ASSETS + 52 assets staged; no DB/log staged (only the intended DB removal) |
| 2026-09-13 | **B2/B3 closed:** `git-filter-repo` purge executed (DB + ops doc removed from all history; creds/handles/UUIDs/host/IP redacted); `.git` swapped (backup `/tmp/web-mc-git-backup`); remote re-added; 21 test users deleted from prod DB (dependent rows cleaned, integrity ok) | 70 | 🔴 RED | `git log -- data/minecraft.db` = 0; secret-history scans = 0 (run with literals from private notes); users remaining = owner accounts only (handles masked); port 5401 = 200 after restart |
| 2026-09-13 | M3/M4/M6 done + M2/M7 partial: snapshot response basenamed; sim access comment cleaned; boot-stall + boundary beacons gated on telemetry opt-in with `pathname` only; efficiency console log DEV-only; tailscale verified absent | 81 | 🔴 RED | `tsc -b` = 0; `node --check` server OK; `git grep ts\.net\|100\.96` = 0 |
| 2026-09-13 | **B1 closed:** user revoked PAT (old token → HTTP 401 verified); M5 doc scrub; M8 snapshots untracked (806 files, golden kept); L1/L2/L4/L5 closed | **94** | **🟢 GREEN** | 401 check; `git ls-files snapshots/golden` = 8; `git status` = 806 staged deletions; no `123456`/`/tmp/opencode` left; package.json valid |
| 2026-09-13 | **M1/M2/M7/L3 closed:** scrypt hashing + legacy auto-upgrade, anonymous writes → 401, `HttpOnly`/dynamic-`Secure` cookie, CORS allowlist, `x-user-id` trust removed, explicit register flow client-side, relay secret (`WEBMC_RELAY_SECRET`) on both services, buildTag day+random, guest pet bypass removed | **100** | **🟢 GREEN** | live: anon POST 401, register/login 200 + `HttpOnly` cookie, wrong pw 401, dup register 409; `sim:test` 310/310; `pages:check` OK; `tsc -b` + `npm run build` = 0 |
| 2026-09-13 | Privacy wording pass: removed user-directive/request phrasing across docs (PROGRESS, MEMORY, ROADMAP, GAMEPLAY_POLISH_SPEC, CUSTOM_ASSET_VOXEL_PLAN, TEXTURE_FIX_PLAN, UI_IDLE_PAUSE_PLAN, baked-lighting, AI_ASSET_PLATFORM_PLAN, BEDROCK_UI_RECREATION_PLAN, PERFORMANCE_INVESTIGATION); AGENTS test-runner text made impersonal; admin handle masked in this tracker; first-person slips removed | 100 | 🟢 GREEN | greps: 0 directive/request phrasing; 0 admin handle in publishable docs |
| 2026-09-13 | **PUBLISHED** to `github.com/martintimmer/hollow-web-mc` (public): audited working tree committed (`chore: public release…`) + docs link fix, pushed with transient auth (no token stored) | 100 | 🟢 GREEN | `git ls-tree origin/main` = no `.db`/`.log`/`.env`; LICENSE/ASSETS/README present; remote URL clean |
| 2026-09-13 | Post-release history review: `.commandcode/` profile + scratch path purged from all history; tracker password/test-user literals re-redacted; force-pushed twice | 100 | 🟢 GREEN | fresh public clone: 0 commits for password/test-user/admin-handle/tailscale/UUID/taste strings; `.commandcode` paths = 0; author identity anonymous |
| 2026-09-13 | **History squashed** to a single initial-release commit (all old doc versions removed from public view); force-pushed | 100 | 🟢 GREEN | fresh public clone: `git log` = 1 commit; tree intact (LICENSE/README/ASSETS); no `.commandcode`, no DBs |
| _next_ | _…_ | _recompute_ | _…_ | _paste verify cmd_ |

---

## 3. Checklist — BLOCKERS (must be zero for GREEN)

- [x] **B1 — Revoke GitHub PAT + clean remote URL** (Severity: BLOCKER, ✅ DONE 2026-09-13)
  - Where: `.git/config` → `remote.origin.url = https://ghp_***@github.com/martintimmer/hollow-web-mc.git`
  - Risk: repo write access to anyone seeing terminal output / logs.
  - Fix: GitHub → revoke token → `git remote set-url origin https://github.com/martintimmer/hollow-web-mc.git` → use `gh auth login` / credential helper.
  - Verify: `git config --get remote.origin.url | sed -E 's#(https://)[^@]+@#\1***@#'` must show no token.
  - **Status 2026-09-13:** ✅ remote URL cleaned + verified; `grep -r ghp_ .git/` empty; ✅ **token revoked — verified: old PAT returns HTTP 401 from `api.github.com/user`**. Done.

- [x] **B2 — Untrack prod DB + purge history + remove test users** (Severity: BLOCKER, −20, ✅ DONE 2026-09-13)
  - Where: `data/minecraft.db` (58–60MB, TRACKED, `M` dirty) — tables `users:24`, `world_blocks:67164`, `block_edits_log:91263`, `world_chests:20`, `world_animals:762`, etc. Schema `users(id,username,password_hash,skin_color,created_at,last_login)`. Hash = unsalted SHA-256 (`server/index.js:34-35`).
  - History: `git log -- data/minecraft.db` = 20+ commits — hashes in history.
  - Fix: `git rm --cached data/minecraft.db` → ignore `*.db* data/*.db* data/backups/` → `git filter-repo --path data/minecraft.db --invert-paths` (or BFG) → rotate all 24 passwords → migrate to `argon2/bcrypt/scrypt`.
  - Verify: `git ls-files | grep -E '\.db$'` empty for prod DBs; `git log -S 'password_hash' --all -- data/minecraft.db` clean after rewrite.
  - **Status 2026-09-13:** ✅ untracked + ignored; ✅ history purged (`git log -- data/minecraft.db` = 0 commits; `git-filter-repo` run on a fresh clone, `.git` swapped; original backup `/tmp/web-mc-git-backup`); ✅ 21 test users deleted from the prod DB with dependent rows (`player_state`, `block_edits_log`, `user_preferences`, `world_animals`, ...), `PRAGMA integrity_check` = ok; DB backup `data/backups/minecraft-pre-testuser-removal-*.db`; ✅ owner accounts kept (handle masked + variants); prod API restarted and healthy. Hash upgrade → tracked under M1 as hardening (no longer a leak).

- [x] **B3 — Remove hardcoded prod credentials + purge from history** (Severity: BLOCKER, −20, ✅ DONE 2026-09-13)
  - Where: `scripts/probe-prod-ride.mjs:17`, `probe-prod-ride2.mjs:15`, `probe-prod-boot.mjs:13`, `probe-prod-wake.mjs:14`, `probe-prod-wake2.mjs:14`, `probe-prod-animals.mjs:14`, `probe-prod-animals2.mjs:14` (prod test username + private world id — values live ONLY in private ops notes); `kb/environments.md:52-54` (+ second test account); `src/services/api.ts:85-89` default `password || "123456"`.
  - History: `git log -S '<prod-test-password>' --all` = 5 commits (`28ce273, fd430db, 365cba6, 01e3adb, c46341f`). Literal values: private ops notes only — never in this file.
  - Fix: rotate both test passwords in prod DB → delete/quarantine `probe-prod-*` or env-var (`WEBMC_TEST_USER/PASS/WORLD`) → remove `|| "123456"` → filter-repo secret strings.
  - Verify: working-tree grep with the prod-test credentials substituted from private notes must be empty; `git log -S '<prod-test-password>' --all` empty after rewrite.
  - **Status 2026-09-13:** ✅ 7 probe scripts require `WEBMC_TEST_USER/PASS/WORLD` env; ✅ `kb/environments.md` creds removed; ✅ `api.ts` `"123456"` default removed; ✅ credentials, handles, brain UUIDs, Tailscale host/IP redacted from **all history** (secret-history scans = 0, run with literals from private notes); ✅ the two leaked test accounts deleted from the DB. Done.

- [x] **B4 — Close `.gitignore` gaps (untracked files that `git add .` would publish)** (Severity: BLOCKER, −20, ✅ DONE 2026-09-13)
  - Where (all currently `??`, NOT ignored per `git check-ignore`): `data/custom.db` (9.4MB), `data/minecraft.db.bak-p3-voxel` (58MB), `data/backups/`, `data/blueprints/bp_nyc_downtown.json` (1.9MB), `test-results/`, `public/music/*.mp3` (2×2.7MB), `public/textures/paintings/*` (50 files).
  - Fix: append to `.gitignore` (see §7 patch), never `git add -f` logs/DBs.
  - Verify: `git check-ignore -v data/custom.db data/backups/foo test-results/foo public/music/foo.mp3` all ignored; `git status --short | grep '??'` contains no DB/log/music/painting.
  - **Status 2026-09-13:** ✅ verified `git check-ignore` 7/7: `data/custom.db`, `data/minecraft.db.bak-p3-voxel`, `data/backups/`, `test-results/`, `public/music/`, `public/textures/paintings/`, `data/blueprints/bp_nyc*`. Still recommend a pre-push `git status --short` review (snapshots remain tracked — M8).

## 4. Checklist — HIGH (−10 each)

- [x] **H1 — Admin handle identity spray (masked: `ma***ly`) — ✅ DONE 2026-09-13** — `server/sim.js`: `SIM_ADMIN_USERNAME` now has **no default** (fail-closed; warns if unset), `audit()` records the env admin, boot logs no admin name/path, `/api/sim/health` no longer echoes admin/port/devDb. `src/services/simMode.ts` comment cleaned. `docs/SIM_ENVIRONMENT_PLAN.md` + `docs/PROGRESS.md` handle → `ADMIN_USER` (plan now in private ops). Verified: admin-handle hits = 0 in publishable files. Note: `SIM_ADMIN_USERNAME` must be set in the service env or sim admin endpoints deny all (intended).
- [x] **H2 — Absolute paths `/opt/web-mc/` + `/root/.gemini/.../<uuid>/` — ✅ DONE 2026-09-13** — 102 files codemodded (`/opt/web-mc/` stripped → repo-relative). Runtime paths now derive from module dir + env overrides: `server/index.js` (`WEBMC_SNAPSHOTS_DIR`, `WEBMC_ARTIFACT_DIR`, `WEBMC_LOG_DIR`), `server/db.js` (`WEBMC_DB_PATH`), `worldgen-db.js` (`WEBMC_WORLDGEN_DB_PATH`), `custom-db.js` (`WEBMC_CUSTOM_DB_PATH`), `blueprints.js`, `sim.js` (`SIM_DB_PATH`). 18 script brain-UUID paths → `snapshots/`. `game_activity_logger.py` `REPO_ROOT`-based; `snapshot.sh`/`rollback.sh` `cd "$(dirname "$0")/.."`; `ss_test.mjs` relative import; `crossCheckPages.mjs` uses `REPO_ROOT`; `nginx-5450.conf` roots → `<repo>` placeholder. Verified: `git grep '/opt/web-mc\|/root/\.gemini'` = 0 (excl. this tracker); all JS/MJS `node --check` pass; `py_compile` + `bash -n` pass; `tsc -b` exit 0. Notes: ignored local `*.log` still contain paths but are never published; this tracker references the path as audit context by design.
- [x] **H3 — `file:///opt/web-mc/` links — ✅ DONE 2026-09-13** — all `file:///opt/web-mc/...` links in docs/kb converted to canonical `https://github.com/martintimmer/hollow-web-mc/blob/main/...` URLs. Verified: repo-wide `file://` only remains as a generic syntax mention in a `kbCoverage.mjs:225` comment (no path).
- [x] **H4 — Port/topology map — ✅ DONE 2026-09-13** — 149 docs/kb files tokenized: `:5400`→`:PROD`, `:5401`→`:PROD-API`, `:5402`→`:DEV-API`, `:5450`→`:DEV`, `:5451`→`:SIM-API`, `:5173`→`:VITE`; bare numbers in prose also tokenized. Core rewrites: `AGENTS.md` environments/deployment, `kb/environments.md`, `docs/ARCHITECTURE.md`, `docs/MEMORY.md`, `info.md`. UI strings cleaned (`block-page`, `build-page`, `SimDeck`); src comments cleaned. `server/nginx-5450.conf` → `server/nginx-dev.conf`. `.commandcode/` untracked + ignored. `diagnose-port-5400.mjs` removed (→ `scripts/diagnose-prod-console.mjs`; original `diagnose-prod.mjs` restored + scrubbed). Verified: 0 port literals in publishable docs (`:5400|:5401|:5402|:5450|:5451|:5173`). **Accepted low-risk residue:** functional port constants remain in dev tooling (`src/services/simMode.ts:isSimPort`, `block-page/editor.ts` prod-push URL, `build-page/main.ts` env check, `server/*` env defaults, `nginx-dev.conf` example ports) — config values, not credentials.
- [x] **H5 — Ops disclosure (nginx/systemd/SSH/tokens) — ✅ DONE 2026-09-13** — `docs/SIM_ENVIRONMENT_PLAN.md` (full ops runbook incl. `SIM_TOKEN`/`x-sim-token`/SSH tunnel/bootstrap SQL/DDL) moved to ignored `docs/ops-private/` and untracked. `AGENTS.md` ops/restart sections genericized (live recipes → private runbook). `server/nginx-dev.conf` header generic + renamed. `docs/BANDWIDTH_INVESTIGATION.md` nginx paths → generic. `docs/PROGRESS.md` journals: `/etc/nginx/...`, `/etc/systemd/...`, `/var/log/nginx/...` → placeholders. Remaining: historical journal entries still describe deploy flow at a high level (tokenized); §7b purge runbook extended to optionally drop the old ops doc from history.
- [x] **H6 — Missing LICENSE + unclear-license assets — ✅ DONE 2026-09-13** — added `LICENSE` (MIT, © 2026 Hollowpine) + `ASSETS.md` (provenance: music + paintings are original works by the project author, published under the repo license; Mojang trademark disclaimer). `package.json` now declares `"license": "MIT"`. `public/music/` + `public/textures/paintings/` un-ignored and staged per user confirmation of ownership.

## 5. Checklist — MEDIUM (−5 each)

- [x] **M1 — Weak auth / CORS — ✅ DONE 2026-09-13** — CORS is same-origin-only by default (opt-in `WEBMC_CORS_ORIGINS` allowlist; sim server likewise via `SIM_CORS_ORIGINS`); session cookie now `HttpOnly` + `Secure` when behind HTTPS (`x-forwarded-proto`); `x-user-id` trust removed everywhere (session cookie only, incl. 7 direct-header routes → impersonation hole closed); anonymous mutating requests → 401 (auth/debug/worldgen tooling exempt); auto-register-on-login removed (login returns generic 401; the client now calls `/api/auth/register` explicitly then logs in); generic "Invalid username or password" (enumeration oracle removed); **scrypt** password hashing with per-user salt + transparent legacy SHA-256 verify-then-upgrade. Verified live: anon POST 401 · register/login 200 · `HttpOnly` cookie present · wrong password 401 · duplicate register 409.
- [x] **M2 — Internal API/path disclosure — ✅ DONE 2026-09-13** — `/api/debug/snapshot` returns basename only; log-path comments removed; cross-sync relay now requires a shared `WEBMC_RELAY_SECRET` (validated constant-style on incoming; sent on outgoing; cross-sync disabled with a warning if unset). Secret deployed to prod (`/etc/systemd/system/web-mc-server.service.d/relay.conf`) and the dev API; noted in private `docs/ops-private/DEPLOYMENT_NOTES.md`.
- [x] **M3 — Sim admin endpoints unauth — ✅ DONE 2026-09-13** — `/api/sim/health` no longer echoes admin/port/devDb (returns `{ok:true}`); `/api/sim/access` comment cleaned (server-side session check against the game auth API). No admin data exposed pre-auth.
- [x] **M4 — Telemetry without consistent consent — ✅ DONE 2026-09-13** — boot-stall `STALL_BOOT` post now gated on `isTelemetryEnabled()`; React error-boundary beacon gated too; all beacons send `location.pathname` only (no query strings); DEV-only console noise.
- [x] **M6 — Tailscale identity in logs — ✅ DONE 2026-09-13** — verified `git grep 'ts\.net\|100\.96\.'` = 0 in tracked files; logs stay ignored, never force-added.
- [x] **M5 — Absolute DB/table names + world/session IDs in docs — ✅ DONE 2026-09-13** — docs/kb scrubbed to tokens: `<game-db>`, `<dev-db>`, `<worldgen-db>`, `<dev-worldgen-db>`, `<custom-db>`, `<sim-world-id>`, `<default-world-id>`, `<world-id>` (0 leftovers, excl. private ops + this tracker).
- [x] **M7 — Client bundle fingerprinting — ✅ DONE 2026-09-13** — build tag is now `YYYYMMDD-<4 hex>` (no second-precision timestamp); `Game.tsx` efficiency log is `import.meta.env.DEV`-only. Rebuilt: `BUILD_TAG = 20260913-0f01`, `v0.1.679`.
- [x] **M8 — Snapshot hygiene — ✅ DONE 2026-09-13** — 806 non-golden screenshots/probes untracked (`git rm --cached`; files stay on disk); `snapshots/golden/` (8 curated frames) kept tracked; `.gitignore` now `snapshots/*` + `!snapshots/golden/**`. Repo shrinks ~74 MB and pixel-PII risk (chat/names in screenshots) is removed. Note: doc links to untracked snapshots will 404 on GitHub (acceptable; re-add curated images if needed).

## 6. Checklist — LOW (−1 each)

- [x] **L1 — `/tmp/opencode`, `/tmp/e2e-snap` — ✅ DONE 2026-09-13** — `crop-lantern.mjs`, `sim/door-shot.mjs` (3×), `e2e/test-1199.spec.js` now write to `snapshots/` (repo-relative). Verified 0 hits.
- [x] **L2 — Ephemeral `123456` pattern — ✅ DONE 2026-09-13** — both scripts now use `"T" + Math.random().toString(36).slice(2, 12)` per run. Verified 0 `123456` left.
- [x] **L3 — `guest`-as-owner bypass in client — ✅ DONE 2026-09-13** — removed the `uid === "guest"` branch in `usePetState.ts` (pets list) and `webSpider.ts` `ownedEntries`; ownership now requires an exact `ownerId` match.
- [x] **L4 — `600` perms on tracked `public/catalog/*` — ✅ DONE 2026-09-13** — `find public/catalog -type f -exec chmod 644 {} +`.
- [x] **L5 — `package.json` catalog:sync URL — ✅ DONE 2026-09-13** — loopback port removed from the manifest; `sync_catalog.py` default now reads `CATALOG_BASE_URL` env (functional local default retained in the dev script).

---

## 7. `.gitignore` patch to apply (for B4)

```gitignore
# --- public-release hardening (add to .gitignore) ---
*.db*
*.db-journal
data/*.db*
data/backups/
data/*.bak-*
data/blueprints/bp_nyc*
test-results/
public/music/
public/textures/paintings/
snapshots/shot-*.png
snapshots/probe-*.json
snapshots/latest.*
docs/ops-private/
server/sim.env
```

Also: `git rm --cached data/minecraft.db` (B2), `chmod 644 public/catalog/*` (L4).

---

## 7b. History purge runbook (B2/B3 — ✅ EXECUTED 2026-09-13)

Status: executed via `git-filter-repo` on a fresh clone; `.git` swapped; original backup `/tmp/web-mc-git-backup`. **Force-push still pending GitHub auth.**

Rewrites **all commit hashes**. Coordinate with every clone first, and revoke the token BEFORE the force-push. Never store real credential literals in this repo — put them in a temp file outside the repo and delete it after.

```bash
# 0. prerequisites
pipx install git-filter-repo        # or: pip install git-filter-repo
git clone --no-local . /tmp/web-mc-purge && cd /tmp/web-mc-purge

# 1. drop the prod DB from all history
git filter-repo --path data/minecraft.db --invert-paths --force

# 1b. optional: also drop the old ops runbook from history
git filter-repo --path docs/SIM_ENVIRONMENT_PLAN.md --invert-paths --force

# 2. redact credential literals (temp file OUTSIDE the repo)
cat > /tmp/replacements.txt <<'EOF'
<prod-test-password-1>==>REDACTED
<prod-test-password-2>==>REDACTED
<prod-test-user>==>REDACTED_USER
EOF
git filter-repo --replace-text /tmp/replacements.txt --force
rm /tmp/replacements.txt

# 3. verify, then push rewritten history
git log -S '<prod-test-password>' --all --oneline   # must be empty
git remote add origin https://github.com/martintimmer/hollow-web-mc.git
git push --force-with-lease origin main
```

Notes: rotate the two prod test accounts + all 24 DB users regardless (hashes were public in history). Backup the original `.git` before running (`cp -r .git /tmp/web-mc-git-backup`).

---

## 8. Final verification (all must pass for 🟢 GREEN)

```bash
# 1. no token in remote
git config --get remote.origin.url | sed -E 's#(https://)[^@]+@#\1***@#'
# 2. no prod DBs / logs tracked (music/paintings now intentionally tracked — see ASSETS.md)
git ls-files | grep -E '\.db$|\.log$|telemetry.*jsonl' || echo CLEAN
# 3. no creds / personal handles / machine paths in tree (excl. this file's redacted examples)
grep -r -n -I --exclude-dir=node_modules --exclude-dir=.git --exclude=PUBLIC_RELEASE_READINESS.md -E 'ghp_|ADMIN_HANDLE|nginx-5450|/root/\.gemini|file:///opt|ts\.net|100\.96\.' . || echo CLEAN   # substitute the actual admin handle from private notes
# 4. history purged
git log -S '<prod-test-password>' --all --oneline || echo CLEAN   # substitute from private notes
git log --all --oneline -- data/minecraft.db | head
# 5. ignore gates
git check-ignore -v data/custom.db data/backups/foo test-results/foo
```

---

## 9. Audit evidence (condensed, values masked)

* **Inventory 2026-09-13:** 2861 tracked, `data/` 180MB (`minecraft.db` 58M, `minecraft.db.bak-p3-voxel` 58M, `telemetry-perf.jsonl` 39M, `custom.db` 9.4M, `worldgen.db` 7.6M, `sim-worldgen.db` 5.8M, `sim-dev.db` 3.5M), `snapshots/` 74MB / 814 tracked, `dist/` ignored-clean, `node_modules/` ignored.
* **Secrets:** no private keys / AWS / OpenAI keys found. Found: PAT in remote (B1), prod passwords in 7 scripts + kb (B3), default `123456` (B3/MEDIUM).
* **PII:** 0 emails in code/docs (150 files grepped); 0 public IPs in code; Tailscale host + Tailscale IP only in ignored `data/client-errors.log` (M6). Usernames: admin handle 50+ hits (masked `ma***ly`), prod test user (masked), repo owner. Machine IDs: 2 brain UUIDs + `/opt/web-mc` + `/root/` spray.
* **Per-dir:** `server/` 30 findings (auth/CORS/paths, §5 audit); `scripts/` 93/181 files leaky (creds + absolute paths); `docs+kb` 150 files (≈60 findings, §5); `src/` 186 files (2 critical, 3 high, rest medium/low); `public/data/snapshots` metadata audit clean except music/paintings/DB/logs.
* **Full detail:** prior audit chat 2026-09-13 (5 subagent reports: server, scripts/e2e/fixtures, docs/kb, src/configs, public/data/snapshots) — summarized here to keep this file public-safe (no secret values).

---

## 10. Files changed log (agent appends every fix)

| Date | File(s) | What changed | Verified by |
|---|---|---|---|
| 2026-09-13 | `docs/PUBLIC_RELEASE_READINESS.md` (created) | Tracker created, score 5 RED | inventory + 5 scans |
| 2026-09-13 | `.git/config` (remote), git index | Token removed from remote URL; `data/minecraft.db` untracked (`git rm --cached`, file kept) | `git config --get remote.origin.url`; `grep ghp_ .git/` empty; `git ls-files \| grep -E '\.db$'` empty |
| 2026-09-13 | `.gitignore` | Public-release hardening block added | `git check-ignore` 7/7 |
| 2026-09-13 | 7× `scripts/probe-prod-*.mjs`, `kb/environments.md`, `src/services/api.ts` | Prod creds → `WEBMC_TEST_USER/PASS/WORLD` env; plaintext creds removed; `"123456"` default removed | working-tree grep clean (excl. ignored logs) |
| 2026-09-13 | 102 files across `scripts/ catalog/ src/ kb/ docs/ AGENTS.md .commandcode/` + `server/{index,db,worldgen-db,custom-db,blueprints,sim}.js` + `scripts/{game_activity_logger.py,ss_test.mjs,crossCheckPages.mjs,snapshot.sh,rollback.sh}` + `server/nginx-5450.conf` | H2/H3: absolute paths + brain UUIDs removed; env/module-dir path resolution; docs links → GitHub | `git grep` = 0; `node --check`; `py_compile`; `bash -n`; `tsc -b` |
| 2026-09-13 | `server/sim.js`, `src/services/simMode.ts`, `docs/PROGRESS.md`, `docs/SIM_ENVIRONMENT_PLAN.md`→`docs/ops-private/` | H1: no default admin, env fail-closed, audit env-based, logs sanitized, handle scrubbed | admin-handle grep = 0 |
| 2026-09-13 | 149 docs/kb files + `AGENTS.md` + `kb/environments.md` + `docs/{ARCHITECTURE,MEMORY}.md` + `info.md` + `src/{Game,GameOverlays,engineInit,playerPhysics}` + `src/components/sim/SimDeck.tsx` + `block-page/*` + `build-page/main.ts` + `server/nginx-dev.conf` + `.gitignore` | H4/H5: port tokens, topology docs genericized, ops moved private, `.commandcode/` untracked | port literals in publishable docs = 0; `tsc -b` = 0 |
| 2026-09-13 | `LICENSE`, `ASSETS.md`, `package.json`, `.gitignore`, `public/music/*`, `public/textures/paintings/*` | H6: MIT LICENSE + provenance; assets staged | staged file list reviewed; no DB/log staged |
| 2026-09-13 | `.git` (rewritten history), `git config` (remote/user), `data/minecraft.db` (untracked file), `data/backups/minecraft-pre-testuser-removal-*.db` | B2/B3: `git-filter-repo` purge (DB + ops doc out; creds/handles/UUIDs/host/IP redacted); 21 test users deleted + dependent rows; owner accounts kept | `git log -- data/minecraft.db` = 0; `-S` scans = 0; users = 3; integrity ok; 5401 = 200 |
| 2026-09-13 | `server/index.js`, `server/sim.js`, `src/components/Game.tsx`, `src/main.tsx` | M2/M3/M4/M7 partial: basenamed snapshot response, comment scrubs, telemetry-gated beacons with pathname, DEV-only console | `tsc -b` = 0; `node --check` OK; tailscale grep = 0 |
| 2026-09-13 | `docs/kb` (M5 scrub), `snapshots/` (806 untracked), `.gitignore`, `scripts/{crop-lantern,sim/door-shot,verify-all-fixes,test-prod-controls-clouds-auth}.mjs`, `e2e/test-1199.spec.js`, `package.json`, `scripts/catalog/sync_catalog.py`, `public/catalog/*` perms | M5/M8/L1/L2/L4/L5 closed; PAT revocation verified | 401 token check; 0 leftover scrub hits; 806 staged deletions; golden = 8; JS/py syntax OK |
| 2026-09-13 | `README.md`, `vite.config.ts`, `info.md` | Install docs corrected (API step, ports 3000/4173, prerequisites, asset claim) + dev/preview `/api`+`/ws` proxies (`WEBMC_API_URL`), explicit loopback hosts | live checks: dev 200/200, preview 200/200, `npm run build` OK, `tsc -b` 0 |
| 2026-09-13 | `server/index.js`, `server/sim.js`, `src/{services/api.ts,components/hooks/useWorldSession.ts,components/hooks/usePetState.ts,game/entities/webSpider.ts}`, `scripts/{gen-build-tag.mjs,test-nether-phase3.mjs}`, `README.md`, systemd drop-in, dev API env, `docs/ops-private/DEPLOYMENT_NOTES.md` | M1/M2/M7/L3 closed: scrypt auth + session hardening + explicit register, relay secret, buildTag format, guest bypass removed; services restarted | anon 401, register/login 200 + HttpOnly, wrong pw 401, dup 409; `sim:test` 310/310; `pages:check` OK; build 0 |
| 2026-09-13 | ~12 docs + `AGENTS.md` + this tracker | Privacy wording cleanup (no personal directives/requests, no first-person slips); tracker admin handle masked; AGENTS test-runner text impersonal | grep scans: 0 directive/request phrasing, 0 handle in publishable docs |
| 2026-09-13 | `docs/PUBLIC_RELEASE_READINESS.md` | Self-sanitized literals; statuses + points model + §7b purge runbook + re-rating | this row |

## 11. New findings (append if discovered mid-fix)

| Date | file:line | Severity | Description |
|---|---|---|---|
| 2026-09-13 | `.commandcode/**` (history) | MEDIUM | Post-release review found `.commandcode/settings.json` + `taste/taste/taste.md` (behavioral preference profile + scratch-session path) tracked in 2 old commits visible in the public history. Fixed: `git filter-repo --path .commandcode --invert-paths`; force-pushed; verified 0 paths/strings in a fresh clone of the public repo. |
| 2026-09-13 | `docs/PUBLIC_RELEASE_READINESS.md:62,93` | HIGH | My own tracker status text re-embedded the prod-test password + test username literals (they had been purged from history earlier). Fixed: placeholders in the file, `git filter-repo --replace-text` for the literals, force-pushed; verified 0 commits for all secret strings in a fresh public clone. |

---

## 12. Green-light definition

🟢 GREEN = all B1–B4 checked + all H1–H6 checked + Final verification §8 all CLEAN + LICENSE present + fresh `grep`/`git ls-files` evidence pasted into Rating history. Only then publish. Until then: 🔴 RED.

**✅ GREEN ACHIEVED 2026-09-13.** Evidence: token 401 · `git grep` leak patterns = 0 · tracked DB/logs = 0 · history `-S` = 0 · ignore gates pass · `tsc -b` = 0 · LICENSE + ASSETS.md present. Remaining open items (M1/M2/M7/L3) are self-hosting hardening, not publish blockers.
