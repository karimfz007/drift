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
| `walkSpeedMps` | 3.5 | C02 | Metres per second on foot in the 3D body |
| `cameraDistanceM` | 6 | C02 | Close third-person camera distance |
| `lookSensitivity` | 1.0 | C02 | Drag-to-orbit multiplier; persisted setting |
| `coldLoadBudgetSeconds` | 8 | C02 | Cold-load ceiling on 4G for the 3D build |
| `fpsFloorMedian` | 30 | C02 | Median FPS floor on the director's device; below it after an optimization pass, the Godot hatch (D-028) triggers a fork |
| `cameraFovHorizontalRad` | 1.05 | C02 | Horizontal-fixed field of view; vertical-fixed narrows to ~26° on a tall phone and the game becomes a telescope |
| `cameraHeightM` | 2.1 | C02 | Camera height above the player's feet |
| `cameraPitchMaxDeg` / `cameraPitchMinDeg` | 62 / −12 | C02 | How far the camera may be pitched |
| `turnRateDegPerSecond` | 620 | C02 | How fast the castaway turns to face travel |
| `fireBuildOffsetM` | 1.7 | C02 | How far ahead the fire is laid — in 2D it went at your feet, which in 3D put you inside the flames |
| `thirstMax` / `hungerMax` / `healthMax` | 100 | C03 | The three new vitals' full values |
| `thirstDrainPerGameHour` | 1.4 | C03 | ~3 game-days to empty — the second survival rhythm (Rule of Threes) |
| `hungerDrainPerGameHour` | 0.6 | C03 | ~7 game-days to empty — the slow background pressure |
| `healthDrainPerGameHourPerEmptyVital` | 5 | C03 | Each empty vital (thirst/hunger at 0) drains health, **stacking** |
| `warmthEmptyHealthDrainPerGameHour` | 6 | C03 | Warmth at 0 drains health too; adds to the stack |
| `healthRegenPerGameHour` | 4 | C03+ | Health recovers, online, while no vital is empty — recovery preserves momentum (§I.18 r3) |
| `thirstOfflineFloor` / `hungerOfflineFloor` | 10 | C03 | D-011 floors: absence drifts these here and stops |
| `healthOfflineFloor` | 25 | C03 | D-011 floor: offline health cannot fall below this. **Offline death is impossible — property-tested** |
| `drinkPerSip` | 25 | C03 | Thirst restored per drink at the pond or from the flask |
| `berryHungerValue` | 12 | C03+ | Hunger restored by a handful of berries |
| `coconutHungerValue` / `coconutThirstValue` | 14 / 10 | C03+ | A coconut feeds and waters — the palm is worth the climb |
| `shellfishHungerValue` | 22 | C03+ | Shellfish are the richest forage |
| `axeWoodCost` / `axeStoneCost` / `axeFiberCost` | 3 / 2 / 2 | C03 | The crude axe recipe — the four gates made concrete |
| `treeChopSecondsWithAxe` | 4 | C03 | Hold-to-chop a standing tree, axe only |
| `treeWoodYield` | 8 | C03 | A felled tree — timber, where hands got scraps |
| `stoneNodeYield` | 2 | C03+ | Stone per rock outcrop |
| `fiberPerCoconutPalm` | 2 | C03+ | Coir fibre from a palm — the pre-axe fibre source, so the recipe is reachable |
| `crashBoxFiber` / `crashBoxFlask` | 3 / 1 | C03+ | The sealed box's contents: cordage and a water flask |
| `flaskCapacitySips` | 1 | C03+ | The flask carries one drink inland |
| `xpPerMeaningfulAction` | 5 | C03 | XP for an outcome that mattered (a felled tree, a foraged meal) — never spam |
| `xpToLevelPerLevel` | 25 | C03 | XP to reach level N = N × this |
| `skillSpeedBonusPerLevel` | 0.08 | C03 | Each level makes the action faster/richer — mastery changes the action (§I.9) |
| `playerCollisionRadius` | 0.4 | C03+ | The castaway's collision radius; how close you get to a trunk (moved from the body, D-038) |
| `treeCollisionRadius` / `rockCollisionRadius` / `palmCollisionRadius` / `crashboxCollisionRadius` / `fireCollisionRadius` | 0.8 / 1.1 / 0.5 / 0.9 / 0.9 | C03+ | Obstacle footprints, in metres (D-038) |
| `decorTreeCollisionRadius` / `decorRockCollisionScale` | 0.7 / 1.4 | C03+ | Footprints for the decorative treeline/rock instances (D-038) |
| `pondTapSlack` | 1 | C03+ | Extra metres of forgiveness tapping the pond (D-038) |
| `tapMaxMs` / `tapMaxMovePx` | 320 / 14 | C03+ | A press this short and still is a tap, not a look-drag (moved from the body, D-038) |
| `thirstLowHintAt` / `hungerLowHintAt` / `healthLowHintAt` | 35 / 30 / 30 | C03+ | At or below, the HUD bar reads "low" AND a hint fires — one threshold, so they agree (D-038) |

*C03 adds the three vitals, death/respawn, the first tool and loot, and two seed skills. Rows marked **C03+** are derived constants C2 added under the tune law to express the spec's behaviour (food values, node yields, fibre source, health regen). The D-011 offline floors (`*OfflineFloor`) make **offline death impossible** — proven by a property test, not asserted (A1).*

*Spatial constants changed units at C02: the 2D body measured screen pixels, the 3D body measures metres. `fireWarmthRadius` 140 px → 7 m, `interactRadius` 74 px → 2.6 m, `nodeTapSlack` 34 px → 0.9 m, `fireTapRadius` 40 px → 1.6 m. The brain only ever asked for a distance on a plane, which is why it did not notice (D-030). Retired with the 2D body: `playerSpeed`, `tapArriveEpsilon`, `approachStopFraction`.*

*Rows marked **C01+** were added by C2 during the C01 build (D-019); the spec's behaviour could not be expressed without them. All are `[TUNE]` and provisional until playtest.*

---

## CYCLE 01 — "First Fire"
**Phase 1 · Tier: Opus-class · Status: CLOSED — technical PASS; direction overturned at gate 3 (D-027). The 2D body is frozen; this build is preserved as the simulation laboratory at /builds/c01/ · Opened 2026-07-22 · Shipped 2026-07-22 · Closed 2026-07-22 · Amended twice 2026-07-22: library-first audit (D-008 … D-014), then director directives + human-enjoyment audit (D-015 … D-018)**

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

---

## CYCLE 02 — "Boots on Sand"
**Phase 1 · Tier: Opus-class · Status: CLOSED — gate 3 pass-with-notes (D-036); two defects → C03 Stage 0 · Opened 2026-07-22 · Shipped 2026-07-23 · Closed 2026-07-23 · The 3D pivot cycle (D-027 … D-037)**

**GOAL:** Prove The First Night in three dimensions on a phone — a real island underfoot, the same fire, the same honest absence — with the Cycle 01 brain running untouched.

**PROMISE:** Standing on the beach for the first time — the world has depth, and your fire lives in it, not in a UI.

**HYPOTHESIS:** Low-poly 3D in the phone browser delivers the presence 2D couldn't, at a playable frame rate, without giving up the tap-a-link loop.

**PLAYTEST QUESTION:** Does moving, looking, and gathering feel like being there — and does it hold a playable frame rate on your phone?

**SCOPE IN (build in stage order):**

- **Stage 0 — Rebase.** New body scaffold: Babylon.js pinned at current stable (record exact version + license in `DEPENDENCIES.md`), official Havok physics plugin; Phaser removed from dependencies; `/src/brain` and `/tests` carried over **byte-identical**; the purity check generalized (transitive check now forbids Babylon — and any rendering engine — under `/src/brain`); smoke harness adapted to 3D scene-readiness signals and an FPS probe; pipeline unchanged (push → checks → Pages). The 2D body remains at tag `c01` and deployed under `/builds/c01/`.
- **Stage 1 — The island underfoot.** One small handcrafted low-poly island slice (beach, treeline, water plane, sky — roughly 100–150 m across) with terrain collision; day/night driven by the existing world clock and tune constants; close third-person camera (`cameraDistanceM`); touch controls: left virtual stick to move (`walkSpeedMps`), right-side drag to orbit (`lookSensitivity`, persisted setting), tap the world to interact; capsule/simple CC0 placeholder character via a Havok character controller or kinematic controller (C2's call). Performance discipline from the first mesh: median ≥ `fpsFloorMedian` on Android Chrome, cold load ≤ `coldLoadBudgetSeconds` on 4G.
- **Stage 2 — The same fire, standing up.** Driftwood scattered on the sand (instant tap pickup, several near spawn), deadfall at the treeline (hold, world-space progress ring); campfire built at the player's spot as a real object — light pool, flame particles, the sanctuary transition re-created in 3D; warmth bar minimal; the six audio cues carried over; cold-open title card (**THE FIRST NIGHT**); one highlighted next action + idle hint; local playtest trace extended with an FPS median; morning-report overlay on qualifying reopen — all driven by the untouched brain and the same tune constants.
- **Stage 3 — Audit & ship.** Deploy (the main URL becomes the 3D build); archive `/builds/c02/`; tag `c02`; smoke checks green including the 3D additions; spawn the C3 audit; on PASS, append the as-built note and report the play URL.

**SCOPE OUT (explicit):** building system; inventory beyond the wood count; hunting, combat, threats; thirst/hunger/energy; skills/XP; first-person camera; procedural or full-size islands; character art and animations beyond a placeholder; multiplayer. (The Rust-loop systems begin Cycle 03+ on this foundation.)

**ACCEPTANCE CHECKS:**
- **A1** — Brain suite green with **zero diffs under `/src/brain` and `/tests` vs tag `c01`** — the pivot's central claim, checked mechanically.
- **A2** — Purity check green: zero rendering-engine imports under `/src/brain` (transitive), CI-enforced.
- **A3** — On Android Chrome via the public URL: cold load ≤ `coldLoadBudgetSeconds` on 4G, median FPS ≥ `fpsFloorMedian` through the steel thread, no pinch/zoom traps, tab-switch survives.
- **A4** — The 3D steel thread on-device: walk the island → gather ≥5 wood (both interactions) → build + light the fire → warmth visibly recovers → background/close ≥2 real minutes → reopen → morning report matches `tune.ts` math.
- **A5** — Main URL serves the 3D build; `/builds/c02/` archived; `c02` tag pushed; as-built appended; the 2D laboratory still reachable at `/builds/c01/`.
- **A6** — Controls: the thread completes with stick + drag + tap; look sensitivity persists across reload.
- **A7** — Feel in 3D: first wood within seconds of control; every action confirmed visibly and audibly **in the world**, not only the HUD; the lit fire reads as sanctuary (light pool + ambience shift); the idle hint fires; the trace records the run including the FPS median.

**TUNE INTRODUCED:** see ledger — rows marked C02.

**AS-BUILT** *(C2, 2026-07-23)*

**Play URL:** https://karimfz007.github.io/drift/ (now the 3D build)
**2D laboratory:** https://karimfz007.github.io/drift/builds/c01/ (still live) · **This cycle:** `/builds/c02/` · **Tag:** `c02`

**The headline: the pivot's central claim held, and it was measured, not asserted.**
`git diff c01 -- src/brain tests` is **empty**. The entire renderer was replaced — Phaser out, Babylon in, 2D to 3D, screen pixels to metres — and the brain and its 67 tests came through byte-identical. The brain only ever asked for a distance on a plane; it never learned the world grew a dimension. That is the whole reason the architectural rule exists, and Cycle 02 is its proof.

**Shipped vs. spec — everything in SCOPE IN shipped.**

- **Stage 0 — Rebase.** `@babylonjs/core` 9.17.1 (Apache-2.0, exact-pinned, deep ES imports → 371 KB gzipped, near-identical to the Phaser build). Phaser removed. The purity check generalised from "no Phaser" to "no rendering engine", still transitive; the frozen 2D body deleted from `main` and preserved at tag `c01` and `/builds/c01/`. The smoke harness rebuilt for 3D (waits on a rendered frame, steers the virtual stick in world space, aims taps by projecting world→screen, probes the frame rate). Pipeline unchanged.
- **Stage 1 — The island underfoot.** One authored low-poly island (~116 m across) generated at boot from `world.ts` — terrain from an analytic height field, thin-instanced treeline and rocks (two draw calls for the whole forest), sea, fog, and a sky driven by the **brain's** clock, so the light and the cold never disagree. Close third-person camera; left thumb to steer, drag to look, tap to reach.
- **Stage 2 — The same fire, standing up.** Driftwood on the sand, deadfall at the treeline with a world-space progress ring, a campfire that is a real object with flame particles and a light pool, warmth visibly climbing. Six cues carried over, cold-open card, one contextual hint, the local trace extended with an FPS median. The morning report overlays a qualifying reopen.

**Deviations and why**

1. **Havok was not adopted, though Stage 0 names it** (D-031). ~1.4 MB of WASM against an 8 s cold-load budget, for nothing this cycle needs; the island height is analytic so ground-following is exact in one shared call, and reach is a distance check the brain already owns. Charter §II.10's own rule decides it. Adoption trigger named: the first system needing real dynamics — Cycle 03's building, or the first threat that moves.
2. **The HUD and panels are DOM over the canvas** (D-032), not engine-drawn: crisp at any pixel ratio, free for the GPU, accessible, and it keeps the frame budget for the island. A `window.__driftScene` debug handle also ships — more surface than Cycle 01's save accessor, kept because it turned two silent rendering bugs into five-minute diagnoses.
3. **The FPS median is traced beside the save** (D-033), in its own localStorage key, because A1 forbids touching the brain's `TraceState`.
4. **Spatial TUNE constants changed units** (px → m); `playerSpeed`, `tapArriveEpsilon`, `approachStopFraction` retired with the 2D body.

**Four rendering bugs the screenshots caught that reading the code did not:** vertex-colour alpha silently moving the island into the transparent pass; inverted winding leaving the beach back-face culled (an invisible ground under the camera); vertical-fixed FOV narrowing to ~26° on a portrait phone; and `manualEmitCount` latching so the ignition burst killed the flame it announced. Every one was invisible to the code and obvious in a picture — which is the case for the device harness and its `__driftScene` handle.

**Acceptance checks — all met**

- **A1** Zero diffs under `/src/brain` and `/tests` vs `c01`; 67 tests green. The pivot's claim, checked mechanically.
- **A2** Purity green, CI-enforced, transitive — and hardened again after audit (below): it now judges a bare specifier by the real package it resolves to, so an npm alias cannot smuggle a renderer past a name list.
- **A3** Cold 4G load **1.9 s** (budget 8 s); median **95–111 FPS** on a real GPU (floor 30); no pinch/zoom trap; tab-switch survives with the clock running. The harness refuses to read a software-renderer FPS as a real verdict.
- **A4** The 3D steel thread on-device: walk → gather (both interactions) → build and light the fire → warmth recovers in the firelight → 3 real minutes away → reopen → report matching `tune.ts` to 1e-6 for the time that actually passed.
- **A5** Main URL is the 3D build; `/builds/c02/` archived; `c02` tag pushed; the 2D laboratory still live at `/builds/c01/`; this note appended.
- **A6** The thread completes with stick + drag + tap; look sensitivity persists across a reload.
- **A7** First wood ~4 s from control; every action confirmed in the world (target halo, world-space hold ring, ember burst, light pool) as well as audibly; the lit fire reads as sanctuary; the idle hint fires; the trace records the run including the FPS median.

**Automated done-checks:** `npm run done-checks` (purity → types → 67 tests) and `npm run smoke` (**37 device checks** on a real GPU; `npm run smoke -- https://karimfz007.github.io/drift/`).

**Known gaps — the honest list**

- The screenshots are the only record of *feel*, and cannot tell the director whether being there feels like being there — or whether the frame rate holds on **his** phone rather than this desktop GPU. That is the third gate, and the one the whole cycle is really asking about (the `fpsFloorMedian` watch item / Godot hatch, D-028).
- Placeholder art throughout: the castaway is a capsule, the trees are cones, the audio is non-positional.
- Ten single-use wood nodes; the island cannot be farmed and is not meant to be yet.
- No character animation — the capsule slides and turns, it does not walk.
- iOS untested (Android-first, D-015). The offline floor still protects absence not idleness (D-025/D-035), unchanged because warmth still has no stakes this cycle.

**AUDIT** *(C3, 2026-07-23 — fresh-context agent in the repo, per Ops §4)*

**VERDICT: PASS-WITH-NOTES.**

A1–A7 all verified independently: C3 confirmed the zero brain-diff mechanically, ran every command itself, drove the deployed build with its own smoke run (37/37, cold 4G 1.9 s, median 95.5 FPS on a real GPU; and separately under `--software` to confirm the harness labels the meaningless number rather than passing it), read the screenshots, and satisfied itself the brain tests assert real invariants rather than tautologies. Constitutional checks all upheld. All three declared deviations (D-031/D-032/D-033) examined and accepted, D-031 (no Havok) judged "the best-reasoned of the three, holds up under scrutiny — verified no Havok/WASM anywhere in source or `dist/`".

**One blocking defect: a third bypass of the purity check** — an npm alias (`"x": "npm:@babylonjs/core"`) let a brain file import a renderer under a clean name, past the forbidden-name list. Same root cause as Cycle 01's two bypasses: trusting the typed name. **Fixed at the root** (D-034): the check now resolves every bare specifier to the file it loads and judges the real declared package name; all four bypass classes reproduced and confirmed caught. Two notes fixed (hard-coded `+2 hours` feedback; a 45 s "within seconds" threshold), plus a guard added so the harness fails rather than silently reads a software-renderer FPS. **D-025's carried-forward risk** — which C3 rightly noted had travelled into Cycle 02 unlogged — is now an explicit on-the-record deferral (D-035): the revisit condition (a vital with real stakes) still has not arrived.

C3's standing note for the next cycle: the allow-list-by-string design is inherently gameable; the real-identity resolution now in place is the sturdier version it asked for. The audit's value, again, was in the one defect invisible to reading the code — the constitutional check that guards the whole architecture had a hole, for the third cycle running, and now has the fix that closes the *class* rather than the instance.

---

## CYCLE 03 — "The Island Pushes Back"
**Phase 1 · Tier: Opus-class · Status: SHIPPED — audited PASS-WITH-NOTES, all notes fixed; awaiting PLAYTEST · Opened 2026-07-23 · Shipped 2026-07-23 · The pressure cycle (D-036 … D-039)**

**GOAL:** Turn the island from scenery into a survival situation — three vital clocks, real death and respawn, the first tool earned through the four gates, the first loot, and the first visible mystery — all flowing through the untouched reconcile spine with D-011's floors protecting absence.

**PROMISE:** The island stops being scenery — it makes demands, and it offers answers to those who look.

**HYPOTHESIS:** Three clocks plus a first tool turn walking into deciding; pressure creates the decisions the Experience Constitution demands.

**PLAYTEST QUESTION:** Did you ever have to choose between two needs — and did the axe feel earned?

**SCOPE IN (build in stage order):**

- **Stage 0 — Ground truth (the C02 defects, fixed first).** Character grounding: physics/terrain snap with feet-at-surface calibration **plus a blob shadow** under the character (and under wood items) — the contact shadow is what kills the floating illusion; colliders on trees, rocks, the fire, and the crash box (smoke-checked: walking into a tree stops you). Island grows to ~250 m with an inland **freshwater pond**, rock outcrops (stone nodes), berry bushes, coconut palms, shellfish on the wet sand, **one sealed crash box** on the beach, and a **distant wreck silhouette** offshore — visible from spawn, unreachable, unexplained (the curiosity rule: one question, one clue, one visible possibility).
- **Stage 1 — Brain: the three clocks.** Thirst, hunger, health as brain modules through `reconcile`: online drain per the charter's Rule-of-Threes ladder; empty vitals drain health (stacking); **death and respawn** — death only from active play; on death, wake washed-ashore at the spawn beach, inventory intact (v1 mercy, `[TUNE]` later), a plain one-line death cause shown. **Offline: D-011 made law** — thirst/hunger/health drift to floors and stop; a property test proves offline death is impossible for *any* elapsed time and starting state. Morning report grows honest vitals lines with causes ("Thirst wore you down to 10 and held"). **Development Tree seed:** Woodcutting and Foraging XP — meaningful actions only (a felled tree, a foraged meal — not spam), levels grant a visible speed/yield bump (the anti-grind principle: mastery changes the action).
- **Stage 2 — Body: demands and answers.** Vitals HUD (three compact bars + health), drink at the pond (hold — sip cues), forage berries/coconuts/shellfish (eat from a minimal inventory row), **craft the crude axe** — the four gates shown plainly on the craft card (resources + time; knowledge innate v1) — then **chop standing trees**: axe-only, tree falls, big yield; bare hands still limited to driftwood/deadfall (the gates made visible: scraps by hand, timber by tool). The axe **opens the sealed crash box** — first loot moment (contents: fiber cordage + a water flask `[TUNE]` — the flask lets you carry one drink inland). New audio/feedback cues for drink, eat, craft, fell, unlock; sanctuary beat untouched; hints cover the new verbs; local trace extended (time-to-first-drink, first-craft, deaths).
- **Stage 3 — Audit & ship.** Deploy; archive `/builds/c03/`; tag `c03`; smoke green including grounding/collider checks; C3 audit; on PASS, as-built + play URL.

**SCOPE OUT (explicit):** building/shelter/bed/upkeep, energy/sleep, storage (all C04); threats, combat, spear, hunting (C05); fishing; water purification and cooking (arrive with containers/fire-craft in C04+); first-person; procedural or full-size islands; skills beyond the two seeds; multiplayer.

**ACCEPTANCE CHECKS:**
- **A1** — Brain suite green including: three-vital reconcile drift with floors; **property test: offline death impossible** (any state × any elapsed); stacking health drain; death/respawn round-trip; XP/level math; save schema migration from c02 saves (a c02 save loads and gains the new vitals sensibly).
- **A2** — Purity green (transitive, alias-proof) across all new brain modules.
- **A3** — Performance holds on the bigger island: median ≥ `fpsFloorMedian`, cold load ≤ `coldLoadBudgetSeconds` on 4G, tab-switch survives.
- **A4** — The pressure loop on-device: get thirsty → find the pond → drink; forage a meal; craft the axe; fell a tree; open the crash box; die once from neglect → respawn ashore with a stated cause; ≥2-minute absence → report shows drift held at floors with causes.
- **A5** — URL live; `/builds/c03/` archived; `c03` tag; as-built appended; c01/c02 archives intact.
- **A6** — Ground truth: feet planted with contact shadow (no perceived float at rest or on slopes, smoke-checked feet-to-terrain gap); tree/rock/box colliders stop the player.
- **A7** — Feel: vitals readable at a glance; drink and eat land with satisfying cues; the axe *visibly* changes chopping (speed, animation of the fall, yield); the wreck silhouette is noticeable from spawn; the XP level-up moment reads; every new verb has a hint path.

**TUNE INTRODUCED:** see ledger — rows marked C03.

**AS-BUILT** *(C2, 2026-07-23)*

**Play URL:** https://karimfz007.github.io/drift/ · **Archive:** `/builds/c03/` · **Tag:** `c03` · 2D lab at `/builds/c01/`, first 3D at `/builds/c02/`, both still live.

**The island stopped being scenery.** Three vital clocks, real death and respawn, the crude axe earned through the four gates, the first loot, and a wreck on the horizon — all through the untouched reconcile spine, with D-011's floors turning absence into a thing that can sting but never kill.

**Shipped vs. spec — everything in SCOPE IN shipped.**

- **Stage 0 — Ground truth (the two Cycle 02 defects, fixed first).** Blob contact shadows under the castaway, the wood, and the fire — the float is gone (measured feet-to-terrain gap **0.000 m**). Colliders via analytic cylinder push-out on trees, rocks, the crash box, and the fire pit (walking into a tree stops you 1.2 m short of the trunk); **no physics engine** — D-031 held, and the push-out was fuzzed by C3 at 200k resolves with zero residual penetration and no traps. Island grown to ~250 m with a freshwater pond (in a real basin), stone outcrops, berry bushes, coconut palms, shellfish on the wet sand, one sealed crash box, and a distant unreachable wreck.
- **Stage 1 — Brain: three clocks (100 tests).** Thirst, hunger, health as modules through `reconcile`. Empty vitals drain health, **stacking**; health regens online while nothing is empty. **Death and respawn — active play can kill**: on death you wake ashore at spawn, inventory/tools/skills kept (v1 mercy, §14), a plain honest cause shown. **THE LAW (D-011/D-025, now D-039): offline death is impossible** — proven by a property test over 3000 random states × long absences, plus the worst legal entry (every vital empty, a sliver of health, 1000 days away), not asserted. Development Tree seed: Woodcutting and Foraging XP for meaningful outcomes only; levels shorten the chop. Save schema **v1→v2 migration**: a Cycle 02 save loads and wakes to full vitals.
- **Stage 2 — Body: demands and answers.** Four vital bars, a carried-inventory chip strip, a two-button context action. Drink at the pond (hold, or fill the flask to carry a drink inland); forage and eat (coconut both feeds and waters); **craft the crude axe** on a card that shows the four gates plainly; **fell standing trees** (axe only, 8 wood, trains woodcutting); **open the sealed box** (the flask). Death overlay, level-up toast, five new synthesised cues (drink, eat, craft, fell, unlock). The sanctuary beat is untouched.

**Deviations and why**

1. **Havok still not adopted** (D-031 held). Collision is analytic cylinder push-out — a distance check and a push, the same family as reach checks — because the island's height is analytic and Cycle 03 has no moving dynamics. Fuzzed sound by the audit. The real Havok trigger is Cycle 04's construction.
2. **`D-036`/`D-037` renumbered** from the handoff's suggested D-031/D-032 (Cycle 02 had logged through D-035). No collision.
3. **Derived `[TUNE]` rows** (C03+): food/yield values, the fibre source, health regen, and — after the audit — the body's collision/gesture numbers, all in `tune.ts` and the ledger.
4. **A `window.__drift.groundAt`/`playerFeetY` debug accessor** for the harness's grounding check.
5. **`vitest.config.ts`** scopes the suite to `tests/` (a stray `.claude/worktrees/` checkout from another session was polluting local runs; CI's clean checkout never saw it, and I left the worktree untouched since it is not mine).

**Acceptance checks — all met** (C3-verified independently; the property test adversarially fuzzed)

- **A1** 100 brain tests, including the offline-death-impossible property test and the c02→c03 migration. C3 attacked the property with 1e15-second spans, chained qualifying calls, and 2000 fuzzed out-of-band vitals — it held.
- **A2** Purity green, CI-enforced. **Materially stronger after audit:** the check now judges every import by the package that owns the file it resolves to, closing the whole "trust the syntax" class after a fourth bypass (a relative path into node_modules). All five bypass shapes reproduced and caught.
- **A3** Cold 4G load **1.8 s** (budget 8 s); median **76–87 FPS** on the ~250 m island (floor 30); no pinch/zoom trap; tab-switch survives.
- **A4** The pressure loop on-device: thirsty → pond → drink; forage → eat; craft the axe; fell a tree; open the box; die once (cause stated) → respawn ashore; a 4-minute absence → report with honest vitals lines.
- **A5** URL live; `/builds/c03/` archived; `c03` tag pushed; this note appended; c01/c02 archives intact.
- **A6** Feet on the terrain with a contact shadow; colliders stop the player and cannot trap them (audit-fuzzed).
- **A7** Vitals legible at a glance; drink/eat/craft/fell/unlock each cued; the craft card shows the gates; the level-up toast reads; the wreck is on the horizon; every new verb has a hint path.

**Automated done-checks:** `npm run done-checks` (purity → types → 100 tests) and `npm run smoke` (**38 device checks** on a real GPU).

**Known gaps — the honest list**

- The screenshots are the only record of *feel*, and the frame rate is a desktop GPU's, not the director's phone (the `fpsFloorMedian` / Godot-hatch watch, D-028).
- Placeholder art throughout: the castaway is a capsule, trees are cones, the wreck is two cylinders, audio is non-positional.
- Single-use nodes; the island doesn't regrow yet.
- No character or tree-fall animation — the tree vanishes with a cue, it doesn't topple.
- iOS untested (Android-first, D-015).

**AUDIT** *(C3, 2026-07-23 — fresh-context agent in the repo, per Ops §4)*

**VERDICT: PASS-WITH-NOTES.**

A1–A7 all verified independently. C3 read `reconcile.ts`/`vitals.ts` end to end and confirmed the offline-death-impossible mechanism is real (not an assertion), then attacked it with its own adversarial suite — 1e15-second spans, Infinity/NaN/negative elapsed, 500 chained qualifying calls, 2000 fuzzed out-of-band vitals — and it held (health finite, > 0, loop terminates in ms). It independently fuzzed the analytic collision (200k resolves, zero penetration, no pond lockout) and confirmed A6. Constitutional checks upheld; the v1→v2 migration verified real; `npm audit` clean; Phaser and Havok both absent from the bundle.

**One blocking defect: a fourth purity bypass** — a *relative* import tunnelling into node_modules, past a check that judged relative paths only for body imports. Same root cause as the prior three, so it was **fixed by generalisation, not another special case** (D-038): every import is now judged by the package that owns the file it resolves to. All five bypass shapes reproduced and confirmed caught. Five notes also fixed: the body's collision/gesture numbers moved into `tune.ts` (the class D-026 established); the HUD "low" thresholds now share the hint system's constants; `save.ts` clamps vitals on load (a tampered negative health can no longer be held negative — pinned by a new test); D-025 formally resolved on the record (D-039); and the harness's death screenshot now fires after the overlay is confirmed up.

C3's standing note for Cycle 04: the purity checker has now been generalised to close the *class* of syntax-vs-resolution bypasses, which should end the four-cycle run; and the tune-law sweep matters more as C04 adds construction footprints and reach checks. The audit's value, a fourth time running, was the one defect invisible to reading the code — the constitutional check guarding the whole architecture had a hole, and now has the generalisation that should close the family for good.
