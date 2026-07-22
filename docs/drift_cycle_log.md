# DRIFT — Cycle Log
*Specs are appended at OPEN (C1); as-builts and audit verdicts at SHIP/CLOSE (C2/C3). Canonical home: repo `/docs/` from Cycle 01 onward. The TUNE ledger mirrors `tune.ts`.*

---

## TUNE ledger (current values)

| Constant | Value | Since | Note |
|---|---|---|---|
| `dayLengthRealMinutes` | 60 | C01 | One clock, online and offline; 1 game hour = 2.5 real minutes |
| `warmthMax` | 100 | C01 | |
| `warmthDrainPerGameHourNight` | 12 | C01 | Night only this cycle; without fire you bottom out ~8 game hours into a 12-hour night — fire is priority #1 |
| `warmthRegenPerGameHourAtFire` | 30 | C01 | Inside fire light radius |
| `driftwoodTapYield` | 1 | C01 | Loose driftwood: instant tap pickup — the first reward in seconds |
| `deadfallHoldSeconds` | 1.5 | C01 | Real seconds, tap-hold on deadfall |
| `deadfallYieldMin` / `deadfallYieldMax` | 2 / 3 | C01 | Wood per completed deadfall hold |
| `idleHintSeconds` | 10 | C01 | Inactivity before one contextual hint appears |
| `woodPerFire` | 5 | C01 | Build cost of a campfire |
| `fireBurnGameHoursPerWood` | 2 | C01 | 5-wood fire ≈ 10 game hours ≈ most of one night; adding a 6th covers it |
| `morningReportMinRealMinutes` | 2 | C01 | Absence below this produces no report |
| `gameHoursPerDay` | 24 | C01+ | Hours in a game day; kept explicit so the clock has no literals |
| `startHourOfDay` | 18 | C01+ | The crash lands you at dusk |
| `nightStartHour` | 18 | C01+ | Night begins (inclusive) |
| `dayStartHour` | 6 | C01+ | Night ends — a 12-game-hour night |
| `warmthOfflineFloor` | 15 | C01+ | **D-011 made concrete**: an absence that earns a report may sting but cannot bottom you out. Never raises warmth that was already lower |
| `warmthLowThreshold` | 30 | C01+ | At or below, the HUD reads "freezing" and the cold vignette closes in |
| `fireWarmthRadius` | 140 | C01+ | World px; inside it, warmth recovers |
| `fireMaxFuel` | 12 | C01+ | The pit is a fire, not a woodshed |
| `hintVisibleSeconds` | 6 | C01+ | How long one contextual hint stays up |
| `playerSpeed` | 190 | C01+ | World px/second on foot |
| `interactRadius` | 74 | C01+ | Reach for taking wood |
| `tapArriveEpsilon` | 6 | C01+ | How close tap-to-move gets before stopping |
| `joystickRadius` | 78 | C01+ | Thumb travel for full speed |
| `joystickDeadzone` | 0.18 | C01+ | Fraction of the stick radius that reads as still |
| `nodeTapSlack` | 34 | C01+ | Fat-finger forgiveness around a wood node — a difficulty number, not a decoration (D-026) |
| `fireTapRadius` | 40 | C01+ | How close a tap must land to the fire to feed it (D-026) |
| `approachStopFraction` | 0.6 | C01+ | Walking to a tapped node stops this far into the reach — beside it, not on it (D-026) |

*Rows marked **C01+** were added by C2 during the C01 build (D-019); the spec's behaviour could not be expressed without them. All are `[TUNE]` and provisional until playtest.*

---

## CYCLE 01 — "First Fire"
**Phase 1 · Tier: Opus-class · Status: SHIPPED — audited, awaiting PLAYTEST · Opened 2026-07-22 · Shipped 2026-07-22 · Amended twice 2026-07-22: library-first audit (D-008 … D-014), then director directives + human-enjoyment audit (D-015 … D-018)**

**HANDOFF BLOCK** — director: paste into Claude Code opened in the project folder:

```
Tier: Opus-class. You are C2 — Builder for DRIFT (game title: "The First Night").
This folder is the project root and contains the six project documents.
Boot: read drift_project_charter_v0_3.md (Parts I–II, esp. §I.18), drift_ops_protocol_v1_2.md (all of it),
and Cycle 01 in drift_cycle_log.md. Doc deltas: none — these files are current canon;
move all six to /docs/ in Stage 0.
Confirm boot in ≤5 lines (goal + acceptance checks), then execute Cycle 01 end-to-end with
standing authority, Stage 0 through Stage 3. No approval stops. Once deployed, spawn the
C3 audit (Ops §4); on PASS, append the as-built note to /docs/drift_cycle_log.md per Ops §7
and report the play URL in one line.
```

**GOAL:** Prove The First Night's first tactile and emotional promise on a phone — intention becomes action, cold becomes refuge, absence produces an honest return story — on the permanent brain/body architecture (crash → move → gather → fire → warmth → quit → reopen → morning report).

**PROMISE:** Turning cold driftwood into a warm refuge feels immediate and understandable.
**HYPOTHESIS:** The lit fire creates a satisfying transition from vulnerability to earned safety.
**PLAYTEST QUESTION:** Which control mode makes intention and positioning feel most natural?

**SCOPE IN (build in stage order):**

- **Stage 0 — Foundation.** Git repo (C2 creates it on GitHub via `gh`, public); scaffold from the official `phaserjs/template-vite-ts` template with **Phaser pinned to 4.2.1** (bump the template's phaser dependency if needed; commit the lockfile; use the template's `-nolog` build scripts); layout per Ops §5; seed `DEPENDENCIES.md` per Ops §5.7; Vitest; CI running tests plus the brain-purity check (build fails on any Phaser import under `/src/brain/`); GitHub Pages auto-deploy on push to main; `/docs/` populated with the six documents. Before writing body code, C2 reads the Phaser 4 repo's `skills/` folder (official AI-agent skill files covering every subsystem).
- **Stage 1 — Brain.** World clock (real-time anchored, `dayLengthRealMinutes`); warmth vital (night drain, fire-radius regen, clamped 0–max); fire entity (fuel units, burn rate, lit/out); wood nodes (driftwood, deadfall) + minimal inventory; versioned save (`schemaVersion: 1`) behind a small `SaveRepository` interface — localStorage implementation this cycle, swappable for IndexedDB later without touching the brain — saved on `visibilitychange`/`pagehide`; `reconcile(elapsedRealSeconds)` — a pure function advancing clock, fire, and warmth for any absence length; morning-report composer (plain prose from reconcile results, produced only when absence ≥ `morningReportMinRealMinutes`). `reconcile` must be deterministic: same state + same elapsed time → same result, always. Full test coverage: clock math, reconcile over short/medium/long absences, fire exhaustion timing, warmth clamps, save round-trip.
- **Stage 2 — Body.** One handcrafted beach + treeline scene (placeholder tiles); **two control modes behind a settings toggle** — tap-to-move and a left-thumb virtual joystick (continuous), identical action timing in both; the director picks one at PLAYTEST and the loser is archived, not blended. **Two wood interactions:** loose driftwood is an instant tap pickup (`driftwoodTapYield`, place several near spawn — first reward within seconds), deadfall is a tap-hold salvage (`deadfallHoldSeconds` → `deadfallYieldMin`–`Max`); visible inventory count. Build a campfire from `woodPerFire` at the player's spot; add wood to extend the burn. **Grounded feedback kit** on every core action: target highlight, input acknowledgment, hold-progress ring, count pulse, restrained particles, ignition response — plus **six placeholder audio cues** (target/pickup, gather progress, wood collected, ignition, fire loop, insufficient wood; permissively licensed or generated). **Sanctuary transition:** when lit, the fire visibly changes its space — warm light radius, calmer ambience, warmth clearly recovering; the relief beat. Day/night tint; warmth bar. **Contextual onboarding:** no tutorial panel — the cold-open as a title-and-text card (**THE FIRST NIGHT** — you wash ashore at dusk; cold is coming), one highlighted next action, one short hint after `idleHintSeconds` of inactivity or repeated failure. **Local playtest trace** (localStorage/debug only, no external service): time to first move / first wood / fire lit, failed interaction taps, control-mode switches, steel-thread completion. Morning-report overlay on qualifying reopen.
- **Stage 3 — Audit & ship.** Deploy; archive to `/builds/c01/`; tag `c01`; spawn the C3 audit; on PASS, append the as-built note and report the play URL.

**SCOPE OUT (explicit):** thirst / hunger / energy / oxygen; health and death; building tiers, upkeep, decay; skills, XP, the Development Tree; any resource but wood; any production loop; threats; procedural islands; real art, music, and final audio (the six placeholder feedback cues are IN). (All arrive in Cycles 02+ per the roadmap.)

**ACCEPTANCE CHECKS:**
- **A1** — Brain suite green, including: reconcile over 1 minute / 8 real hours / 3 real days; reconcile determinism (same state + elapsed → identical result); zero-elapsed reconcile changes nothing; fire exhausts at exactly `fuel × fireBurnGameHoursPerWood`; warmth clamps at bounds; save survives a schema round-trip.
- **A2** — Purity check green: zero Phaser imports under `/src/brain/`, CI-enforced.
- **A3** — On a phone browser (primary target: Android Chrome — the director's device; iOS secondary) via the public URL: first load ≤ ~5 s on 4G, playable one-thumb, no pinch/zoom traps, survives tab-switching without losing state.
- **A4** — The steel thread on-device: gather ≥5 wood → light fire → warmth visibly recovers → background/close the app ≥2 real minutes → reopen → morning report matches `tune.ts` math for the elapsed time.
- **A5** — Stable URL live; `/builds/c01/` archived; `c01` tag pushed; as-built note appended.
- **A6** — The steel thread completes in **both** control modes; the toggle persists across a reload.
- **A7** — Feel checks on-device: first wood lands within seconds of gaining control (instant driftwood near spawn); every core action gives visible + audible confirmation; the lit fire reads as sanctuary (light + ambience change, warmth visibly recovering); the idle hint appears; the local trace records the run.

**TUNE INTRODUCED:** see ledger — all rows marked C01.

**AS-BUILT** *(C2, 2026-07-22)*

**Play URL:** https://karimfz007.github.io/drift/
**Repo:** https://github.com/karimfz007/drift (public) · **Archive:** `/builds/c01/` → https://karimfz007.github.io/drift/builds/c01/ · **Tag:** `c01`

**Shipped vs. spec — everything in SCOPE IN shipped.**

- **Stage 0.** Public repo created via `gh`; scaffold structured after the official `phaserjs/template-vite-ts` with Phaser bumped 4.0.0 → **4.2.1** and the lockfile committed; layout per Ops §5; `DEPENDENCIES.md` per §5.7 (every direct dependency pinned exact, licensed, with an exit path; `npm audit` clean); Vitest; two workflows — `done-checks` (purity → types → tests → audio reproducibility → build) and `deploy` (the same gates, then GitHub Pages); the six canon documents moved to `/docs/`. The Phaser 4 repo's `skills/` folder was read before any body code was written (v3→v4 migration, config, scale, graphics, input, audio).
- **Stage 1 — Brain.** Zero Phaser, **67 tests**. World clock (one clock online and offline; 60 real minutes = 1 game day; night 18:00–06:00; the crash lands at dusk). Warmth with night drain, fire-radius regen, clamped both ends. Fire as fuel units burning at `fireBurnGameHoursPerWood`. Wood nodes + inventory; deadfall yield derived from the node id rather than a dice roll, so the island is the same island every time. Versioned save (`schemaVersion: 1`) behind `SaveRepository`, localStorage this cycle, written on `visibilitychange`/`pagehide`/`blur`. **`reconcile()`** is pure and deterministic, walking any span in segments bounded by the day↔night flip and the fire running dry, landing on boundaries exactly so a three-day absence cannot drift. Morning report composed as plain prose from the reconcile result, silent below the threshold.
- **Stage 2 — Body.** One handcrafted portrait beach and treeline in placeholders. Two control modes behind a settings toggle — tap-to-move and a floating left-thumb stick; **only locomotion differs, interaction is identical in both**, which is what makes the PLAYTEST QUESTION a fair comparison. Driftwood is an instant tap pickup; deadfall is a 1.5 s hold with a progress ring. Feedback kit on every core action (target highlight, tap acknowledgment, hold ring, count pulse, restrained motes, ignition flash) plus the placeholder cues. Sanctuary transition: warm light radius, the cold vignette receding, warmth visibly climbing, the fire bed starting. Cold-open title card, one contextual hint, no tutorial panel. Local trace in localStorage only.
- **Stage 3.** Deployed, archived, tagged, audited, remediated twice, redeployed.

**Deviations and why**

1. **Fifteen extra `[TUNE]` constants** (D-019/D-026; ledger rows `C01+`). The spec's behaviour could not be expressed without them, so nothing was hard-coded to avoid the ledger. The consequential one is **`warmthOfflineFloor = 15`** — D-011's offline-fairness floor made concrete.
2. **Presentation constants live in `src/body/theme.ts`, not `tune.ts`** (D-023). The rule applied: if changing it changes how the game *plays* it belongs in `tune.ts`; if it changes only how it *looks* it belongs in `theme.ts`. The audit found three numbers on the wrong side of that line; all three moved.
3. **Seven audio files for the spec's six cue slots.** The spec's first slot, "target/pickup", is two distinct moments and got two files. **Synthesised in-repo** by `tools/gen-audio.mjs` rather than sourced (D-021) — ours, licence-free, byte-identical on regeneration, which CI asserts.
4. **One input path** (D-020). Phaser's per-Game-Object input fired for mouse but **not** for touch in this configuration: every button in the game was dead under a thumb while working perfectly on a desktop. All taps now route through a single scene-level handler.
5. **A `window.__drift` debug hook ships** (D-022), reading and writing only this device's own single-player save. It is what makes the device checks — and the audit — mechanical rather than anecdotal.
6. **`puppeteer-core` added as a devDependency** for `tools/smoke.mjs`; chosen over `puppeteer`/Playwright because it downloads no browser.
7. **`docs/archive/` and `docs/reference/`** hold superseded versions and the director's reference material (D-024); `/docs/` itself holds exactly the six canon documents.

**Acceptance checks — all met**

- **A1** 67 tests green: 1 minute / 8 real hours / 3 real days; determinism across six span lengths; zero, negative, NaN and Infinity spans change nothing; the fire exhausts at exactly `fuel × fireBurnGameHoursPerWood` (checked just-before, exactly-at, and well-after); warmth clamps at both bounds; the save round-trips, refuses a future schema, and hydrates a partial save instead of crashing. C3 independently stress-tested 50-year and 1000-year absences: no NaN, no runaway loop, no negative fuel.
- **A2** Purity green, CI-enforced — and **materially stronger than it started**. The original check only regexed the brain's own files; the audit demonstrated two working bypasses (a transitive import through `src/data/`, then a computed dynamic specifier). It now walks the brain's whole transitive import graph, prints the offending chain, and rejects any dynamic import a static check cannot follow. Both bypasses reproduced and confirmed caught.
- **A3** Public URL live. Cold load over a throttled 4G link: **1.4–2.3 s** against a ~5 s budget. Canvas fits the viewport, no page scroll, `touch-action: none`, `user-scalable=no`, 56 px minimum touch targets. Survives backgrounding with the clock still running and the save intact.
- **A4** Steel thread on-device: five wood → fire → warmth recovering → 3 real minutes away → reopen → report. The report's numbers match `tune.ts` exactly for the time that actually elapsed (fuel burned equals game hours ÷ `fireBurnGameHoursPerWood` to within 1e-6).
- **A5** URL live, `/builds/c01/` published and served, `c01` tag pushed, this note appended.
- **A6** The thread completes in **both** control modes; the toggle survives a reload.
- **A7** First wood ~6 s from gaining control; every core action gives visible and audible confirmation; the lit fire reads as sanctuary; the idle hint appears and is about where the player actually is; the trace records the run.

**Automated done-checks:** `npm run done-checks` (purity → types → 67 tests) and `npm run smoke` (**30 device checks**; re-runnable against any deployed URL — `npm run smoke -- https://karimfz007.github.io/drift/`).

**Known gaps — the honest list**

- The screenshots are the only record of *feel*, and they cannot tell the director whether it feels right. That is the third gate and it is his.
- Placeholder art and audio throughout. The fire is three tweened triangles.
- Ten single-use nodes; the island cannot be farmed, and is not meant to be yet.
- The camera does not scroll — world is screen. A bigger island is a Cycle 02+ concern.
- iOS untested (Android-first, D-015). Safari's ~7-day storage eviction remains the deferred launch-prep watch item (D-010).
- The offline floor protects absence, not idleness (D-025) — deliberate, documented, pinned by a test, and flagged for Cycle 02, along with the fact that on the primary device it quietly leans on OS auto-lock.

**AUDIT** *(C3, 2026-07-22 — fresh-context agent in the repo, per Ops §4)*

**VERDICT: PASS-WITH-NOTES** (two passes: initial audit, then re-verification after remediation).

A1–A7 all verified independently: C3 re-ran every command itself, drove the deployed build with its own smoke run, read the screenshots, and wrote its own adversarial tests rather than trusting the suite. Constitutional checks — brain/body, tune, testing, save, dependency, honest systems, offline fairness, Experience Constitution, scope discipline — all upheld.

Six defects raised; **all six fixed, none accepted** (D-026): the purity check's transitive blind spot, two gameplay numbers outside `tune.ts`, a test whose title claimed a property that did not hold, three device checks that could not fail or could silently skip, and two miscounts in the decisions log. On re-verification C3 found a **new** bypass on the fix (a computed dynamic import) and a genuine flake in the device harness (the fire-burn check compared against a nominal absence and failed 1 run in 3); both closed as well — the harness now asserts the invariant rather than the harness's own punctuality, and is exact to 1e-6 across three consecutive runs.

C3's standing note, carried to Cycle 02: **D-025's reasoning leans on OS auto-lock on the primary device and has no safety net on desktop.** Recorded in the decisions log; Cycle 02 weighs it on that basis.

The audit's value is not in doubt: the two defects that mattered — the purity hole and the touch-input failure — were both invisible to reading the code, and one of them would have put a game with no working buttons on the director's phone.
