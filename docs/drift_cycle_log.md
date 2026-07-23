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
| `lookSensitivity` | 1.35 | C02, raised C04 PERFECT | Drag-to-orbit multiplier; persisted setting (was 1.0 — quicker camera turn, director's request) |
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
| `interactRadiusM` | 2.5 | C04 | Reach for a direct-world interaction (tap the thing to use it, D-042) |
| `cameraFollowLerp` | 0.12 | C04 | How fast the camera catches up to the player — damped follow, no snap |
| `cameraLookSmoothing` | 0.15 | C04 | How fast yaw/pitch chase the drag target — smoothed look |
| `turnSlerpSpeed` | 10 | C04 | How fast the castaway turns to face travel (frame-rate-independent slerp) |
| `moveAccelMps2` | 14 | C04 | Acceleration/deceleration on foot — no instant velocity |
| `frameTimeP95BudgetMs` | 33 | C04 | Jank budget: p95 frame time through a scripted move-and-orbit run (A3) |
| `reedFiberYield` | 2 | C04 | Fibre per reed clump — the material that looks like what it makes (D-043) |
| `palmHuskFiberYield` | 2 | C04 | Husk fibre per palm (was `fiberPerCoconutPalm`; renamed for legibility, D-043) |
| `rotatePromptEnabled` | true | C04 | Portrait shows a rotate-to-landscape prompt (D-041) |
| `cameraMinBoomM` | 1.4 | C04 | Shortest camera boom — how close the camera pulls to avoid clipping/occluding through a trunk or rise (A6; C3 note N1) |
| `pondSipMinIntervalMs` | 600 | C04 | Min real-ms between auto-sips while standing in the pond — governs rehydration rate (C3 note N3) |
| `energyMax` | 100 | C05 | Full energy — the 5th vital |
| `energyDrainPerGameHour` | 5 | C05 | ~20 game hours to empty — a full-day rhythm, not a pressure clock like thirst/hunger; never feeds health drain this cycle (soft debuff only) |
| `energyOfflineFloor` | 15 | C05 | D-011-style offline floor, for consistency with every other vital — not required for safety (energy is not a death vector this cycle), just kindness |
| `energyLowThreshold` | 25 | C05 | At or below, the castaway is sluggish (walk speed scaled); a soft debuff, never a death vector |
| `energySlowWalkMultiplier` | 0.65 | C05 | Walk-speed multiplier while exhausted (below `energyLowThreshold`) |
| `sleepDurationGameHours` | 8 | C05 | Game hours a voluntary sleep at the shelter advances the clock by — reuses the reconcile spine an absence already uses, unmodified |
| `wetMax` | 100 | C05 | Full wetness — a condition, not a vital; no offline floor (not a safety concern) |
| `wetGainPerGameHourInPond` | 240 | C05 | Wetness gained per game hour standing in the pond — fast, a few real minutes of wading soaks through |
| `wetDecayPerGameHourDry` | 15 | C05 | Wetness lost per game hour on dry land, away from the shelter |
| `wetDecayPerGameHourSheltered` | 60 | C05 | Wetness lost per game hour within the shelter's radius — drying off is the shelter's second job |
| `wetWarmthDrainMultiplierAtMaxWet` | 1.5 | C05 | Warmth's night-time drain rate is multiplied by this at full wetness (linear from 1.0 at wet=0); applies only to the drain case, never the fire's regen |
| `shelterWoodCost` / `shelterStoneCost` / `shelterFiberCost` | 8 / 4 / 3 | C05 | The lean-to's build recipe — a meaningful step up from the axe |
| `shelterRadius` | 6 | C05 | Metres from the shelter its bonuses (warmth relief, faster drying) reach |
| `shelterWarmthDrainMultiplier` | 0.5 | C05 | Within the shelter's radius, warmth's night-time drain is halved — independent of the fire |
| `shelterBuildOffsetM` | 2.2 | C05 | How far ahead of the player the shelter is placed — same reasoning as `fireBuildOffsetM` |
| `shelterCollisionRadius` | 1.3 | C05 | Collision footprint of a built shelter |
| `storageWoodCost` / `storageStoneCost` | 5 / 3 | C05 | The storage crate's build recipe — wood and stone only, no fibre gate |
| `storageBuildOffsetM` | 2.2 | C05 | How far ahead of the player storage is placed |
| `storageCollisionRadius` | 0.9 | C05 | Collision footprint of a built storage crate |
| `storageWithdrawBatch` | 5 | C05 | Per-resource amount withdrawn per tap when the crate holds any and the player carries none |
| `structureDurabilityMax` | 100 | C05 | Full durability, for any structure (shelter or storage) |
| `structureDurabilityDecayPerGameHour` | 1 | C05 | Durability lost per game hour — ~4 days from full to 0, long enough that neglect, not attentiveness, triggers it |
| `repairDurabilityPerWood` | 15 | C05 | Durability restored per wood spent repairing |
| `structureRepairThresholdFraction` | 0.9 | C05 | Repair only "counts" (and wins the sleep/storage-use disjoint choice) below this fraction of max — the fix for the repair-threshold starvation bug found during the C05 build |

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
**Phase 1 · Tier: Opus-class · Status: CLOSED — systems pass, feel fails the LDOE bar; five defects → C04 (D-040) · Opened 2026-07-23 · Shipped 2026-07-23 · Closed 2026-07-23 · The pressure cycle (D-036 … D-039)**

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

---

## CYCLE 04 — "Second Nature"
**Phase 1 · Tier: Opus-class · Status: OPEN · Opened 2026-07-23 · The feel cycle (D-040 … D-043)**

**GOAL:** Make the phone disappear — landscape presentation, a camera that glides, and a world you touch directly, with every Cycle 03 defect root-caused, fixed, and regression-locked.

**PROMISE:** Moving, looking, and touching the island feels like second nature — smoother than Last Day on Earth.

**HYPOTHESIS:** Landscape + camera smoothing + tap-the-world interaction is what "fluid" actually means on a phone; feel is architecture, not polish.

**PLAYTEST QUESTION:** Held sideways — is it smoother than Last Day on Earth, and did every tap either do what you expected or tell you why not?

**SCOPE IN (build in stage order):**

- **Stage 0 — Landscape-first.** UI relaid for landscape (HUD corners, stick lower-left, look zone right, craft/settings top); portrait shows a rotate prompt; web-app manifest with landscape orientation; fullscreen + orientation lock requested on first interaction where supported; safe-area insets respected.
- **Stage 1 — Camera and movement feel.** Damped camera follow (`cameraFollowLerp`) and smoothed look (`cameraLookSmoothing`) with a proper sensitivity curve for landscape; character turns by slerp toward movement (`turnSlerpSpeed`); movement acceleration/deceleration (`moveAccelMps2`) instead of instant velocity; camera collision so it never clips terrain or trees; render interpolation/frame pacing so look-while-moving has no stutter; FOV retuned for landscape. Harness gains a **jank metric**: p95 frame time ≤ `frameTimeP95BudgetMs` through a scripted move-and-orbit run.
- **Stage 2 — Direct-world interaction (D-042).** Tap any interactive object: in range it acts; out of range the character path-walks to it and then acts (tap-to-move-and-use). Interaction radius per object with a subtle in-range highlight; hold-to-gather stays on gather nodes; tap fire → add wood / relight (range-gated); tap pond edge → drink; tap tree → chop **with the axe auto-used** (pre-axe: "Needs an axe"); tap crash box → open (same gate). Every blocked interaction states its reason. Buttons reduced to: **Build fire** (enabled whenever wood ≥ cost, day or night, placed at the player with a clear-ground check), the craft card, and settings. **Root-cause requirement:** identify and document in the as-built *why* fire was unavailable until night/axe in C03, and add a harness regression: *at game start, daytime, no axe, gather 5 wood → Build fire is enabled and works.*
- **Stage 3 — Resource legibility (D-043).** Reed clumps near the pond and scattered (fibrous silhouette, gather for fiber); palm husks visible at trunk bases; craft-card source hints under missing materials; first-pickup identity toasts; hints cover the new interaction model.
- **Stage 4 — Audit & ship.** Deploy; archive `/builds/c04/`; tag `c04`; smoke green including the new regressions; C3 audit; on PASS, as-built + play URL.

**SCOPE OUT (explicit):** construction, bed, upkeep, energy/sleep, storage, Havok (all C05); threats/combat (C06); new vitals, new tools, fishing, cooking, purification; first-person; island growth; PWA install/service worker; multiplayer.

**ACCEPTANCE CHECKS:**
- **A1** — Brain suite green; reed nodes covered; zero regressions (the brain barely changes this cycle — that is itself the check).
- **A2** — Purity green (all five bypass classes still caught).
- **A3** — Landscape lays out correctly on-device; portrait shows the rotate prompt; cold load ≤ budget; median FPS ≥ floor **and p95 frame time ≤ `frameTimeP95BudgetMs`** through the scripted move-and-orbit run.
- **A4** — Interaction truth, scripted in the harness: day-one pre-axe fire regression passes; all object interactions range-gated (a far tap walks then acts — never remote action); tap-tree pre-axe explains, post-axe chops; box likewise; every block states a reason.
- **A5** — URL live; `/builds/c04/` archived; `c04` tag; as-built appended (including the C03 fire-gating root cause); c01–c03 archives intact.
- **A6** — Camera: no snap on look start/stop, no clipping through terrain or trees in the scripted orbit, character turns smoothly, sensitivity persists.
- **A7** — Feel: reeds read as fiber at a glance; craft card teaches sources; first-pickup toasts fire once each; in-range highlight is subtle but noticeable; walk-to-and-use feels like one motion.

**TUNE INTRODUCED:** see ledger — rows marked C04.

**AS-BUILT:** *(C2, 2026-07-23)* Shipped. The phone gets out of the way and every Cycle 03 defect is root-caused and regression-locked.

- **The fire root cause (D-040 #3/#4), stated plainly.** Cycle 03's HUD had a single prioritised `action` slot resolved as an if/else chain. After the pond-drink case came `!tools.axe && (wood+stone+fiber) > 0 → "Craft axe"`, and the "Build fire" case sat *below* it. Because wood is both fire fuel and an axe part, the instant the player held any wood — which is mandatory to build a fire — the Craft-axe branch fired and the Build-fire branch became unreachable. The button literally never rendered until `tools.axe` was true. "Couldn't build until night" was **incidental**: the player was forced to finish the axe first (gated on the hard-to-find fibre, D-043), and that dragged into night. The fix is architectural (D-042): Build fire is its own button gated only on wood (day or night); Craft is a separate button; the two never share a slot. Regression-locked: *daylight (noon), no axe, 5 wood → "Build fire" is the primary, ready action and it builds* — this fails on the old code, where that exact state hits the Craft-axe branch and Build-fire never appears.
- **Direct-world interaction (D-042).** Tap the thing to use the thing. A tap sets an intention; in range it acts, out of range the castaway walks there and acts on arrival. Verbs left the button stack: hold-nodes auto-work on arrival, tap-nodes gather at once, tap the fire to feed, tap the pond to drink/fill, tap a food chip to eat, tap a full flask to sip inland. Every block states its reason. The one remaining action button (Build fire) plus the Craft card and Settings are all that stay in the HUD. No interaction fires out of reach — `actOnArrival` runs only when `pendingInReach()` (≤ `interactRadiusM`), and that gate is regression-locked with a negative test.
- **Landscape-first (D-041).** Web-app manifest (landscape/fullscreen), a rotate-to-landscape prompt while upright, first-touch fullscreen + orientation lock (best-effort, silently degraded where iOS withholds the APIs), safe-area insets, and a landscape smoke viewport.
- **A camera that glides.** Damped follow, smoothed look (drag moves a target angle the camera chases), frame-rate-independent turn slerp, movement acceleration/deceleration (no instant velocity), and analytic camera-collision that pulls the boom to the **near** side of the first obstacle so a trunk can neither clip nor occlude the player.
- **Resource legibility (D-043).** Reeds as an obvious tappable fibre source (mesh + `reed` node kind), palm husks visible at the trunk base, craft-card source hints under short parts, and first-pickup identity toasts. `fiberPerCoconutPalm` → `palmHuskFiberYield`.
- **The brain barely moved** (A1): one `reed` node kind and the rename. 102 brain tests green including the offline-death property test; purity clean (10 brain files, zero rendering imports).
- **Harness rewritten for the tap model** with a named regression per D-040 defect (fire, fibre/reeds, camera+p95 jank, tree/axe, and the range-gate negative test) plus a new p95 frame-time metric. **55/55 device checks green on a real GPU** (median 90–125 fps, p95 12–20 ms vs the 33 ms budget; cold 4G load ~1.7 s).

**AUDIT:** *(C3, 2026-07-23 — **PASS-WITH-NOTES**, remediated to green.)* The auditor confirmed the fire defect is genuinely root-caused (read the C03 `paintHud` in the diff and verified the regression fails on the old code), the fix is architectural, purity/typecheck/tests/offline-death all pass, the TUNE ledger mirrors `tune.ts`, and landscape is correctly best-effort for iOS. Four of five defects were solidly regression-locked at audit time. Findings and their remediation:
- **B1 (blocking) — the flask became fill-only.** Repurposing the C03 secondary button to open the Craft card stranded the flask-drink verb: the game filled the flask and taught "carry a drink inland," but no tap could ever drink it. *Fixed:* a full flask is now a tappable chip routed to `drinkFlask`; regression added (fill/inject a full flask, tap it → thirst rises, a sip is spent).
- **N1 — camera-clip picked the far side of a trunk.** `avoidCameraClip` took the farthest clear point, which could park the camera behind an occluding trunk. *Fixed:* it now marches outward from the player and stops before the first blocked sample, guaranteeing the whole boom segment is clear (near-side); `cameraMinBoomM` moved to `tune.ts`.
- **N2 — defect #3's "from far away" half was not regression-locked.** *Fixed:* added a negative test — an intention set from 14 m out does **not** act, the castaway auto-walks in, and only then does it act. (The intention is injected via a debug hook because reliably tapping a distant 3-D object from a headless projected ground-point is not feasible; the real tap→act path is covered by the close-range checks.)
- **N3 — a couple of gameplay constants were hardcoded.** *Fixed:* the pond-sip cadence is now `pondSipMinIntervalMs` in `tune.ts` (ledgered); the remaining literals are render-feel.
- **N4 — `canDrinkFlask`/`drinkFlask` were dead in the body.** Resolved by B1 (both are live again).
Post-remediation: purity ✓, typecheck ✓, 102 brain tests ✓, **55/55 device checks ✓**.

**PERFECT pass** *(C2, 2026-07-23 — live-build director report, two FIX items + a full verb audit sweep.)* Shipped directly (save schema unchanged; no new tag).
- **FIX 1 — "axe equipped, tap standing tree, tree does not fell."** Never remediated; root-caused fresh. `stepMovement` cleared **any** pending interaction on every frame the movement stick had nonzero magnitude — so the natural two-thumb gesture (walk toward the tree with the left thumb, tap it with the right) set `pending` in `onTap`, then the very next frame nulled it before the interaction ever ran, silently swallowing the tap. Confirmed by direct reproduction: dispatching a real, separate-pointerId tap while a stick pointer stayed down reliably discarded the pending intention (existing tests never caught this — they release the stick before tapping, which is not how a director holding the phone in both hands actually plays). *Fixed:* manual steering now overrides only the movement **direction**; it no longer erases `pending`. A tap on empty ground is the new explicit "never mind" gesture (any pending is superseded by a new tap regardless). *Regression:* a real dual-pointer tap (stick held via one pointerId, tree tapped via a second) fells the tree — verified to fail on the pre-fix code, pass on the fix.
- **FIX 2 — "near the pond, empty flask carried, no way to fill it."** The C04 rewrite didn't drop the fill branch outright (unlike Build-fire/flask-drink in the original audit) — it starved it the same way: `actOnArrival`'s pond branch checked `canDrinkAtPond` (true whenever thirst < max — nearly always) **before** `canFillFlask`, so a merely-thirsty player's tap always drank and the flask was never reached. *Fixed:* fill now wins over drink at the pond whenever it applies (filling is the one thing only the pond can do; drinking your own thirst down is also reachable anywhere via the flask chip, D-042 audit fix), falling through to drink when the flask is absent or already full. *Regression:* tap the pond with a non-full flask and a merely-thirsty player → `flaskSips` rises (not just thirst) — verified to fail on the pre-fix code, pass on the fix.
- **Audit sweep (requested, not per-bug):** diffed the full C03 verb list against current `game.ts`/`hud.ts` — drink (pond, fill-first now), fill flask (pond), drink flask (tappable chip), eat (tappable food chips), craft axe (secondary button), fell tree / open crash box (tap-and-hold, axe-gated), forage every node kind (driftwood/deadfall/rock/berrybush/coconutpalm/reed/shellfish, tap or hold per `NODE_SPECS`), feed fire (tap), build fire (primary button). **All reachable; no further dropped verbs found.** The auto-hold gather path (`stepHold`/`cancelHold`) was checked against the same class of bug as FIX 1 and is not vulnerable — it only cancels on distance or a panel opening, never on stick magnitude.
- **TUNE:** `lookSensitivity` raised 1.0 → 1.35 for a quicker camera turn (the settings-panel Gentle/Standard/Quick presets rescaled to 0.8/1.35/2.0 to match).
Verified: purity ✓, typecheck ✓, 102 brain tests ✓, **57/57 device checks ✓** (2 new regressions added, both confirmed to fail on pre-fix code and pass on the fix).

**PERFECT pass #2** *(C2, 2026-07-23 — live-build director report, two more FIX items.)* Shipped directly (save schema unchanged; no new tag).
- **Cache staleness, checked first (per the handoff).** GH Pages/Fastly caches `index.html` for up to ten minutes (`Cache-Control: max-age=600`, confirmed against the live headers) with no way to shorten it from a static Pages deploy, and no service worker exists in this repo. Vite's content-hashed bundle filenames make an already-loaded page safe (nothing hot-swaps mid-session) — but a page loaded from a *stale* cached `index.html` can silently keep running an older bundle well after a fix ships. This is a real, standing gap and the likely explanation for FIX 2 recurring right after the prior PERFECT pass shipped: the director could easily have reloaded within that ten-minute window. **Fix:** a version check (`src/body/updateCheck.ts`) — refetches the site root with `cache: 'no-store'` on foreground-return and every 5 minutes, compares the referenced bundle filename to the one actually running, and shows a small, corner, tap-to-reload prompt on a mismatch. Never auto-reloads mid-session, per D-014's law verbatim ("assets are never hot-swapped mid-session").
- **FIX 2 re-verification (not re-diagnosed on faith).** Attempted an independent, more-faithful reproduction via genuine CDP multi-touch (`Input.dispatchTouchEvent` with two concurrent touch points) rather than trusting the prior PointerEvent-based regression. CDP's raw touch-dispatch API proved unreliable for concurrent multi-touch in this headless environment (ambiguous touch-end-target semantics, contradictory results across attempts) — a tooling limitation, not a game defect. The prior regression (added last PERFECT pass) dispatches real, distinctly-`pointerId`'d `PointerEvent`s at the exact browser API layer `Controls.ts` actually consumes, and it still passes cleanly. Conclusion: the prior fix and its diagnosis hold; FIX 2's recurrence is explained by cache staleness, not a surviving code defect.
- **FIX 1 — "morning-report overlay has no way to dismiss it."** Root-caused fresh; NOT a tap-priority/input-swallowing bug (checked explicitly, per the handoff, and ruled out — `Controls` listens only on the canvas element, a DOM sibling of the overlay, so it structurally cannot intercept overlay-button touches; confirmed no service worker or first-gesture listener could plausibly interfere either). The real cause: `.panel` used `justify-content: center` with no overflow handling, and the C04 landscape pivot shrank the play viewport to ~412px tall. A sufficiently long panel (the morning report, with its fire/warmth/thirst/hunger/day-night lines) can be taller than that, and centered flex content overflows equally off BOTH edges — this pushed the "Back to the island" button below the visible viewport with **no scroll affordance**, `elementFromPoint` at its true screen position confirmed nothing was covering it: it was simply never on-screen. Every existing automated check had used Puppeteer's `ElementHandle.click()` (`clickDom`), which dispatches directly at an element regardless of whether it is within the viewport or occluded — a real testing gap that let this ship unnoticed through 57/57 green runs. **Fix:** `.panel` is now `overflow-y: auto` with `justify-content: flex-start` (content starts at the top and scrolls if it overflows, rather than centering into invisibility), plus a `@media (max-height: 480px)` pass that tightens spacing so the common case needs no scroll at all. General, not special-cased to the report — applies to every panel.
- **Testing gap closed generally.** Added `realTapDom()` to the harness: scrolls the nearest overflow container, confirms via `elementFromPoint` that the target is actually the topmost element within the viewport, and only then dispatches a genuine touch. Replaced every panel-dismiss `clickDom()` call (cold-open ×3, craft card, death, the morning report) with it, so the whole suite now honestly tests reachability instead of assuming it.
- **Regression:** a dedicated, deterministic long-absence scenario (fire pinned lit, both vitals pinned to move, the clock pinned so every optional report line fires) reliably overflows the viewport (~570–590px of content in a 412px panel) — confirmed to fail on the pre-fix CSS (`off-screen-after-scroll`, no scrollable ancestor existed) and pass on the fix.
Verified: purity ✓, typecheck ✓, 102 brain tests ✓, **62/62 device checks ✓** (regression confirmed to fail on pre-fix code and pass on the fix; every existing panel-dismiss check upgraded to real-tap reachability along the way).

**PERFECT pass #3** *(C2, 2026-07-23 — the 3rd tap-to-fell report, root-caused fresh per the C05 handoff's explicit instruction not to assume prior diagnoses held.)* Shipped directly, batched first, before Cycle 05's own build (save schema unchanged; no new tag).
- **Neither prior fix was wrong — neither was the whole story.** Reproduced with a battery of scenarios rather than re-testing the one narrow case each prior fix covered: (A) a plain single-finger tap, close range, no stick ever touched, on a freshly loaded page — **failed**; (B) walk in via the stick, release it, then tap — passed; (C) tap, wait, tap again — passed; (D) tap a different tree — passed. Only the scenario with **no stick input at all** failed, ruling out FIX 1's mechanism outright.
- **Root cause:** `Controls.onMove` updated `pressMoved` — the distance that decides `wasTap` in `onUp` — for **any** `pointermove` reaching the canvas, without checking which `pointerId` it belonged to. A direct trace of the real event sequence for a failing tap showed `pointerdown:2`, then a **`pointermove:1`** — a different, untracked pointer — then `pointerup:2`. That stray event, computed against the tracked pointer's start position, registered as an apparent move of hundreds of pixels, flipped `wasTap` to false, and silently discarded the tap before `onTap` ever ran. Confirmed via `document.fullscreenElement`: it flipped `false → true` during the exact failing tap — the stray pointermove is most reliably produced around the `requestFullscreen()` call that `orientation.ts`'s one-time first-gesture handler (D-041) fires on a session's first real touchscreen gesture. The existing harness never caught this: its cold-open dismissal is itself a real touch that consumes that one-time trigger before any later tree-tap check ever runs.
- **Fix:** `onMove` now only updates `pressMoved` for events whose `pointerId` matches the pointer actually being tracked (`stickPointer` or `lookPointer`); any other pointer is ignored outright and can no longer corrupt an in-flight press.
- **Regression:** a fresh session where the cold-open is dismissed with a plain DOM click (confirmed **not** to consume the first-gesture trigger, unlike the harness's usual real-tap dismissal) so the very next tap genuinely is the session's first real touchscreen gesture — reproducing the failure precisely. Confirmed to fail on the pre-fix code and pass on the fix.
Verified: purity ✓, typecheck ✓, 102 brain tests ✓, **64/64 device checks ✓**.

**CLOSE** *(C2, 2026-07-23 — standing in for the SON/C1 CLOSE stage, which the OPEN gap below also fell through; flagged for a KEY REPORT, not silently absorbed.)* Three PERFECT passes, three real, distinct, root-caused defects (fire priority-starvation → cache staleness explaining a fix's apparent non-recurrence → an untracked-pointerId bug corrupting tap-vs-drag detection), each independently regression-locked, none re-broken by the next. The phone disappeared; direct-world interaction holds under real multi-touch and under a session's very first gesture. **Cycle 04 "Second Nature" is CLOSED.** State regenerated below; Cycle 05 opens next in this same document.

---

## CYCLE 05 — "Foundations"
Phase 2 · Tier: Sonnet high (Opus per-blockage) · Status: OPEN · Opened 2026-07-23

**Process note (transparency, per Ops v1.4 crew norm 7):** this spec is **C2-authored**, not SON-drafted/C1-audited as v1.4 intends. The handoff that opened this cycle referenced a spec "in the cycle log" that did not exist — `drift_state.md`'s own next-actions still showed SON's OPEN-stage work as pending, and no `drift_c05_handoff_package.md` exists in `/docs/reference/`. Rather than block on a missing artifact, given standing authority, this spec was written by C2 directly from the scope already named across D-037/D-040/D-044 and `drift_state.md`, using the Ops §7 template. **Flagged for C1 review** at the next KEY REPORT — this is exactly the kind of MAJOR artifact v1.4 says should carry C1's audit, and it has not yet had one.

**HANDOFF BLOCK:** Tier: Sonnet high. Role: C2 — Builder. Boot: this spec. Confirm boot, execute end-to-end with standing authority; once deployed, spawn the C3 audit; on PASS, append the as-built note and report the play URL.

**GOAL:** Give the castaway a reason to stop wandering and build somewhere — a shelter that keeps the fire's warmth working for you while you rest, a bed that becomes home (the new respawn anchor), a place to keep what you've gathered, and the honest cost of neglecting any of it.

**PROMISE:** The island stops being a foraging loop with a fire at its center and starts being a place you are *building a life on* — what you build starts to need you back.

**HYPOTHESIS:** Cycles 01–04 proved the moment-to-moment loop feels good (feel, feedback, direct touch). This cycle tests the next rung of the Experience Constitution: does *investment* — something placed, something that can fall into disrepair, something worth returning to — deepen the pull, or does it just add chores? Construction is the first system whose payoff is measured in returns, not immediate feedback.

**PLAYTEST QUESTION:** Did building the shelter feel like progress — and did you notice, and care, when it started falling apart?

**SCOPE IN** (staged, in buildable order):
1. **Shelter (one tier — "lean-to").** A new placed structure, built like the fire (own button, gated on `shelterWoodCost`/`shelterStoneCost`/`shelterFiberCost`, clear-ground check, placed at the player). While the player is within `shelterRadius`, warmth drains slower and (see #4) wetness clears faster — the fire's job, extended. Analytic collision only (no Havok — see the Havok note below).
2. **Bed / respawn anchor.** Not a separate structure this cycle — the built shelter itself is where you sleep and where you wake. Once a shelter exists, death and any absence-triggered respawn place the player at the shelter instead of the original beach spawn. (Scope decision, stated plainly: a distinct bed structure is deferred — see SCOPE OUT.)
3. **Energy — the 5th vital.** Drains slowly, at all times, at `energyDrainPerGameHour` (a full-day rhythm, not a pressure clock like thirst/hunger). Below `energyLowThreshold`, the castaway is sluggish (`walkSpeedMps` reduced by `energySlowWalkMultiplier`, HUD says why) — a soft debuff, **never a death vector this cycle** (see SCOPE OUT). Restored by sleeping.
4. **Sleep.** Tap the shelter (once built) to sleep: this reuses the *exact* reconcile spine an offline absence already uses — a voluntary `sleepDurationGameHours`-long "absence" while stationary at the shelter, floors and all, ending with energy refilled. No new time-skip mechanism; the offline-death-impossible property this cycle's sleep span rides on is *already proven* (A1).
5. **Wet condition.** A `wet` meter (not a vital, not a death vector): rises fast while standing in the pond, decays slowly on dry land, decays fast within `shelterRadius`. While wet, warmth drains faster (`wetWarmthDrainMultiplier`, linearly interpolated by wetness) — this is *why* a roof over your head matters even with a fire already lit.
6. **Storage.** A second placed structure (own build option, wood/stone only — no fiber gate), holding raw materials (wood/stone/fiber) separately from personal inventory. One tap: if carrying any raw material, stores all of it; if not, and storage holds any, withdraws a fixed batch (`storageWithdrawBatch` per resource) — the same disjoint-state pattern that correctly resolved the pond's fill-vs-drink conflict (D-042 audit), applied up front this time instead of found by a bug report.
7. **Structure upkeep.** Shelter and storage each carry a `durability` (0–100) that decays slowly over game hours. At 0, the structure's *bonus* pauses (no warmth/dry bonus; storage still holds what's in it — nothing is ever destroyed or lost, per the charter's honest-systems law) until repaired. Repair: tap the structure while carrying wood — an instant, always-available action once any wood is held, restoring durability by `repairAmountPerWood` per wood spent.

**SCOPE OUT (explicit):**
- A second (or higher) shelter tier — one lean-to tier proves the system; more tiers are `NEXT`.
- A distinct bed structure separate from the shelter — folded into #2 above to keep this cycle's surface area buildable in one pass.
- Energy as a death vector — it is a soft debuff only. Wiring a fifth vital into the health-drain-stacking system safely (and re-proving the offline-death-impossible property against it) is real work that deserves its own scoped pass, not a rider on construction.
- Any change to personal-inventory carry capacity — storage is a second pool, not a cap on the first.
- Multiplayer or shared structures, weather events beyond the pond-driven wet meter, structure destruction (only disrepair, never deletion).
- Havok / any physics engine (see below).

**HAVOK (D-031's trigger, evaluated as instructed):** Construction was named as the likely Havok-adoption trigger back in D-031/D-040. Evaluated against what this cycle actually builds: shelter and storage are static placed objects, identical in kind to the fire (already solved with the existing analytic cylinder push-out and the near-side camera-boom pull, C04). Placement reuses the same clear-ground check `onBuildFire` already does. Nothing in this cycle's scope needs dynamic rigid-body simulation, joints, or realistic falling/stacking. **Recommendation: defer Havok to Cycle 06.** Re-litigate only if C06's threats (a moving creature needing real physics response) or a later cycle's shelter tiers (something that can be knocked down) genuinely need it — placement alone does not.

**ACCEPTANCE CHECKS:**
- **A1** — Brain suite green, including new tests for shelter/storage build gates, durability decay, repair, wet-meter accumulation, energy drain, and the sleep-uses-reconcile path; the offline-death-impossible property test still holds unmodified (energy/wet are not part of the health-drain path).
- **A2** — Purity green (all five bypass classes still caught); save schema bumped (v2→v3) with an explicit migration step, hydrate-safe for a mid-v2 save.
- **A3** — Device harness green on a real GPU: build shelter, build storage, sleep at the shelter (energy refills, time advances at the tuned rate), get wet at the pond and confirm faster warmth drain, let a structure's durability lapse and confirm the bonus pauses, repair it and confirm the bonus returns, die away from the shelter and confirm respawn is at the shelter once one exists.
- **A4** — Every new interaction states its reason when blocked ("Needs more wood," "Already dry," etc.), matching D-042's law.
- **A5** — URL live; `/builds/c05/` archived; `c05` tag; as-built appended (including the Havok call and the OPEN-stage process gap); c01–c04 archives intact.
- **A6** — No hardcoded gameplay constants outside `tune.ts`; the TUNE ledger mirrors it.

**TUNE INTRODUCED:** see ledger — rows marked C05.

**AS-BUILT:** *(C2, 2026-07-23.)* Shipped: one shelter tier (the lean-to), the storage crate, structure upkeep, the 5th vital (energy), the wet condition, and voluntary sleep — every SCOPE-IN item, with the two SCOPE-OUT decisions (a second shelter tier, a distinct bed structure) held as stated in the spec.

- **Shelter.** Built through the Build panel (`shelterWoodCost`/`shelterStoneCost`/`shelterFiberCost`), placed `shelterBuildOffsetM` ahead of the player on clear ground (the same `resolveCollision` check as the fire). Within `shelterRadius`, it halves warmth's night-time drain independently of the fire (`shelterWarmthDrainMultiplier`) and dries the player faster than open ground. Once built, it — not the beach — is where death and the respawn cause wake the castaway (`respawn()` in state.ts).
- **Storage.** A second placed structure, wood/stone only (no fibre gate), holding raw materials in a pool separate from personal carry. One tap: carrying any raw material deposits all of it; empty-handed with anything stored withdraws a fixed batch (`storageWithdrawBatch`) per resource — the disjoint-state rule the pond's fill/drink conflict proved out (D-042 audit), applied up front this time.
- **Upkeep.** Both structures carry a `durability` that decays slowly over game hours (`structureDurabilityDecayPerGameHour`) and pauses the structure's bonus at 0 — never deletes it (charter honest-systems law). Repair: tap the structure with wood in hand; wins the sleep/storage-use disjoint choice only once durability has dropped below `structureRepairThresholdFraction` (90%) of max — see the bug note below.
- **Energy.** The 5th vital, drains at `energyDrainPerGameHour` at all times, floored offline like every other vital (kindness, not safety — it never feeds the health-drain path this cycle, exactly as scoped). Below `energyLowThreshold` the castaway is sluggish (`energySlowWalkMultiplier`); the HUD's goal line and idle hint both say why.
- **Sleep.** Tapping the shelter reuses `reconcile()` directly for a `sleepDurationGameHours` span — no parallel time-skip system. Because that span comfortably exceeds `morningReportMinRealSeconds`, it always takes the OFFLINE, floored path: sleeping is a deliberate retreat to safety and inherits the exact guarantee a real absence already has (A1, unmodified). The result is shown through the same morning-report overlay a real absence uses.
- **Wet.** Not a vital — no floor, no death path. Rises fast in the pond (`wetGainPerGameHourInPond`), decays on dry land, decays faster in the shelter's radius. Raises warmth's *night-time drain* rate only (not the fire's regen) by up to `wetWarmthDrainMultiplierAtMaxWet`, computed per reconcile segment against wetness at that segment's start (exact, not approximated, since wetness's own rate is fixed for the whole span — the player doesn't move offline).

**Three real bugs found and fixed during BUILD (before any director report — self-caught via the harness and manual verification, the last one only after the harness finally completed a clean full run and kept failing the same two checks until root-caused fresh rather than dismissed as more environment noise):**
- **Collision degenerate case.** `Island.resolveCollision`'s push-out formula divided by the distance between the target point and an obstacle's centre; when that distance was ~0 (building storage from the same spot/facing as the shelter, both using a 2.2 m offset), the push silently no-opped, landing storage exactly on top of the shelter. Fixed: a degenerate branch picks a deterministic push direction from the obstacle's own position instead of leaving the overlap unresolved. General fix — protects every caller (movement, camera-clip, all three build placements), not just this one collision.
- **Repair-threshold starvation.** `canRepairStructure` originally fired on any `durability < max`. Passive decay is continuous, so that is true almost always — repair, checked first in the sleep/storage-use disjoint choice, would win nearly every tap once a structure had existed for even a few seconds, the same one-condition-always-true bug class that starved Build-fire in C03. Fixed: repair only applies below `structureRepairThresholdFraction` (90%) of max. Regression-tested directly (`construction.test.ts`) and confirmed via the device harness (sleeping at a freshly-built, only-just-decayed shelter correctly still sleeps, not repairs).
- **Shelter-swallows-storage tap misroute.** `onTap`'s fire/pond/shelter/storage hit-test was a first-match if-chain, shelter checked before storage. Shelter and storage are both placed `~2.2 m` ahead of the builder, so in ordinary play they end up close together — and shelter's own forgiveness radius (`shelterCollisionRadius + 1.5` = 2.8 m) comfortably reaches past that 2.2 m gap. A tap landing exactly on the storage crate was silently claimed by the *shelter* branch instead, repairing the shelter (spending wood, moving nothing) rather than depositing into the crate — invisible to the 128 brain tests (the bug lives entirely in the body's hit-testing, not the brain's disjoint-state logic, which was correct throughout). Caught by the device harness's storage deposit/withdraw checks, which kept failing identically across three consecutive full runs — including one clean 75/75 run's only two failures — until traced by instrumenting live `storage.durability` mid-run (it read 91.8%, comfortably above the repair threshold, ruling out the threshold-starvation bug class and pointing at hit-testing instead) and reading `onTap`'s actual check order. Fixed: candidate objects within their own forgiveness radius are now collected and the *nearest centre* wins, not the first one checked in source order — a general fix, not special-cased to shelter/storage, so any two future objects placed close together resolve the same correct way.

**HAVOK — the call, as instructed:** Evaluated against what this cycle actually builds. Shelter and storage are static placed objects, identical in kind to the fire — already solved with the existing analytic cylinder push-out (extended this cycle with the degenerate-case fix above). Placement reuses the fire's own clear-ground check. Nothing here needs dynamic rigid-body simulation, joints, or physical stacking/falling. **Deferred to Cycle 06**, per the spec's own default — re-litigate only if C06's threats or a later cycle's additional shelter tiers genuinely need it.

**Process note, stated plainly:** this cycle's OPEN stage was also missing (see the spec header above) — C2 wrote it directly, flagged for C1's review. The batched priority (the 3rd tap-to-fell report) was root-caused and shipped as its own commit *before* this build, per the handoff's explicit instruction; see "PERFECT pass 3" above for that work.

**Verification:** purity ✓ (10 brain files, zero rendering imports), typecheck ✓, **128 brain tests ✓** (26 new, covering shelter/storage build gates, the repair-threshold fix, wet gain/decay and its warmth coupling, energy drain and its offline floor, sleep-via-reconcile including the safe/floored guarantee, and respawn-at-shelter) — the offline-death-impossible property test (A1) holds unmodified; energy and wet were kept out of the health-drain path by design, exactly as scoped. **Device harness: a clean 75/75 full run**, after the hit-test fix above and two test-only corrections (an over-strict `energy === 100` assertion that ignored continuous drain resuming the instant sleep ends, mirroring the same tolerance the shelter-durability check already used; and `editSave()`, the harness's direct-save-mutation helper, now stamps `savedAtMs`/`lastSeenMs` to the moment of mutation so a debug edit never gets folded into the game's own real-absence catch-up maths as phantom elapsed time — a latent harness bug that had no visible effect before anything decayed against a hard threshold the way structures now do).

**Device harness — the earlier instability, resolved rather than just documented.** Several runs during this cycle's build stalled or crashed unpredictably (a `Navigating frame was detached` mid-run, a `waitForFunction` timeout on scene load) — this genuinely is environment resource accumulation from many hours of repeated Chrome launches across four cycles' harness runs in one sitting, not a code defect; killing stray Chrome/Node processes between attempts and retrying reliably got a clean run through. What earlier looked like it might also be environment noise in the two remaining failures (storage deposit/withdraw, reproducing identically across every run including the one clean 75/75 pass) was not: it was traced to the real hit-testing bug above by instrumenting live state rather than accepted at face value. The lesson banked for next time: a failure that reproduces identically across runs is signal, not noise, however plausible the "the environment is just slow today" explanation feels after a session full of genuine environment flakiness.

**Play URL:** https://karimfz007.github.io/drift/ · **Archive:** `/builds/c05/` · **Tag:** `c05`.

**AUDIT:** *(C3, 2026-07-23 — fresh-context agent in the repo, per Ops §4)*

**VERDICT: PASS-WITH-NOTES** (remediated to green).

A1–A6 independently verified, not taken on the as-built's word:

- **A1/A2** — `npm run purity` (10 brain files, zero rendering-engine imports), `npm run typecheck`, and `npm run test` re-run from a clean checkout: **128 tests green**, including the offline-death-impossible property test (3000 random states × random long absences) unmodified since C03. Read `healthRatePerGameHour` in `src/brain/vitals.ts` directly — its signature takes thirst/hunger/warmth/health only, no energy parameter — confirming energy genuinely cannot feed the health-drain path; this is a structural guarantee, not a convention that could quietly slip.
- **The `onTap` nearest-wins fix** (`src/body/game.ts`) is real and general, confirmed by reading the code rather than the as-built's description of it: fire, pond, shelter, and storage are all collected into one `candidates` array within their own forgiveness radius, sorted by distance, and the nearest wins — there is no special case for shelter-vs-storage specifically. Any future pair of nearby placed objects resolves through the same path.
- **The repair-threshold fix** (`canRepairStructure` in `src/brain/state.ts`, gated on `TUNE.structureRepairThresholdFraction = 0.9`) and **the collision degenerate-case fix** (`resolveCollision` in `src/body/island.ts`, a deterministic push angle derived from the obstacle's own position when `d² ≈ 0`) were both read line-by-line, not sampled: the repair gate is a real inequality against a tuned fraction of max (not `< max`), and the degenerate branch is a genuine second code path guarding every caller of `resolveCollision` (movement, camera-clip, and all three build placements), not a special case for shelter/storage alone.
- **Honest-systems law on structure decay** — confirmed in three places independently: `reconcile.ts` floors durability at `Math.max(0, ...)` (never negative, never triggers any deletion branch); `isInDisrepair`/`isNearShelter` in `state.ts` only pause the *bonus* (`shelterActive = nearShelter && !isInDisrepair(...)`); and `src/body/entities.ts`'s `ShelterView`/`StorageView.update()` only swap the material colour to `PALETTE.disrepair` at 0 durability — the mesh is never disabled, the obstacle footprint is returned unconditionally, and `useStorage()` never reads `durability` at all, so stored contents are reachable regardless of repair state.
- **The Havok deferral** — grepped `package.json`, all of `/src`, and the built `dist/assets/*.js` bundle for any Havok/physics-engine reference: zero, confirming the deferral is not merely asserted. Shelter and storage are built through `onBuildShelter`/`onBuildStorage` using the identical `island.resolveCollision` clear-ground check the fire already used pre-C05. No gameplay reason surfaced in this cycle's scope that C06 (moving threats) couldn't be the real trigger point instead — agreed with C2's call.
- **Device harness** — a fresh build (`npm run build`), served via `vite preview --port 4173`, driven by `node tools/smoke.mjs`. First attempt crashed mid-run at check 54/75 with `Error: Attempted to use detached Frame` — the identical signature the as-built already documents from this session's Chrome/Node process accumulation, not a new regression (every check up to the crash was a clean PASS). Killed stray `chrome.exe`/`node.exe`, restarted the preview server, and reran with no code changes: **a clean 75/75**, one retry needed exactly as the as-built anticipated. Independently confirmed live: the degenerate-collision fix (storage built 2.20 m from the shelter, no overlap), the repair-threshold fix (a shelter at 54.9% durability repairs, not sleeps, when wood is held), sleep (clock +8.01 game hours, energy refilled), storage's disjoint deposit/withdraw, and respawn-at-shelter after death.

**One finding, fixed — the TUNE ledger did not mirror `tune.ts`.** The spec's own A6 ("No hardcoded gameplay constants outside `tune.ts`; the TUNE ledger mirrors it") and the doc's standing convention both require every `tune.ts` row to appear in the ledger table at the top of this file. It did not: `tune.ts` gained roughly 26 new C05 constants (energy, wet, shelter, storage, upkeep) and none were added to the ledger table — a documentation-completeness gap, not a code violation (the diff was independently checked and contains no hardcoded gameplay numbers; every C05 constant does live in `tune.ts`, as claimed). **Fixed:** all 26 C05 rows added to the ledger table in this same pass, in the existing style.

**One carried-forward note, not remediated.** `onTap`'s per-kind forgiveness radius uses a hardcoded `+ 1.5` (metres) on top of each object's own tune-law radius — present for fire and pond since C04, and this cycle simply extended the same pattern consistently to shelter and storage rather than introducing a new instance of it. Not blocking (it predates this cycle and was already latent through C04's audit), but worth a `tune.ts` row (e.g. `tapForgivenessM`) the next time the tune-law sweep runs.

The audit's value this cycle was smaller than in prior cycles — every code-level claim in the as-built checked out on direct reading, and the harness's one crash was exactly the documented environment flakiness rather than a surprise. The one real finding was a documentation gap the acceptance checks claimed was satisfied but wasn't; it is now.

---

## PERFECT pass (C05) — FIX 4: tap-to-fell's fourth shape (D-045/D-049)

**C1 scoped diagnostic ruling, on the live build.** The director's re-test of tap-to-fell failed in a new shape: fell one tree, tap a second, unrelated object — zero reaction, no highlight, no sound, no reason. C04's conditional close (D-045) was void pending this pass.

**REPRODUCE FIRST, per the ruling's own order.** `tools/smoke.mjs` gained sequential-interaction coverage it had never had: fell A → tap B; fell → gather → fell; fell → tap-crate. The existing 75/75 single-action suite passed cleanly precisely because it never exercised a SECOND interaction right after a fell — that gap reproduced the report reliably.

**Root cause, confirmed via `window.__driftScene.pick()` rather than assumed:** `NodeViews.sync()` (`src/body/entities.ts`) disabled a spent node's mesh for *rendering* (`setEnabled(false)`) but never touched `isPickable` — a separate Babylon flag picking does not infer from enabled state. A felled tree's invisible geometry stayed a live pick target, silently intercepting a ray meant for whatever stood near or behind it. Confirmed concretely twice: a raw pick at a storage crate built near a just-felled tree returned the felled tree's own mesh and metadata, not the crate's; after the fix, the same pick correctly returned the crate.

**Branch executed, per the ruling's pre-committed decision tree:** this is post-action interaction state — a stale, disposed-mesh hit-list — not the tap-detection/pointer-routing class of the three priors (stick-held tap; cache staleness; the untracked-pointerId bug). Fixed at that layer: `NodeViews.sync()` now clears `isPickable` on a spent node's full mesh hierarchy (trunk *and* canopy; palm *and* fronds/husk; a reed's blade *and* its four extras), not just the parent — general, not special-cased to trees. Regression-locked in `tools/smoke.mjs`. **The input-layer strike count stays at three**; no rewrite, no Opus escalation (D-049).

**Also shipped, per the ruling's "either branch also ships":**
- **Fail-loud law.** Silence is never a legal outcome. `onTap`'s fallback now distinguishes a genuinely empty-ground tap (terrain, or nothing hit — a look-around, owed no explanation) from a tap that hit some other real, unrecognised pickable mesh (now routed through the existing `explain()`/`markFailedTap()` path — a player-visible reason plus a `trace.failedInteractionTaps` breadcrumb). Regression-locked: emptying the storage crate and inventory, then tapping the crate, now visibly explains and traces instead of vanishing.
- **Visible tool carriage.** The axe, once made, is worn on the castaway — a haft and head parented to the hip, always visible, no equip step (ownership is the only gate) — instead of living only in a HUD chip. The Build panel's axe item now reads "Owned." Confirmed via screenshot before/after crafting.

**Verification:** purity ✓, docs-integrity ✓ (49 decisions, every reference resolves), typecheck ✓, 128 brain tests ✓ (unchanged — this fix lives entirely in the body), **device harness: a clean 82/82** after killing 18 stray `chrome.exe` processes accumulated across this session's many hours of runs (one intermediate attempt hit the same documented `Input.dispatchTouchEvent` timeout signature; killing stray processes and retrying resolved it cleanly, consistent with every other environment-flake episode this session).

**Doc deltas applied:** D-049 (decisions log); `drift_state.md` regenerated — the crew-composition fork was already resolved (D-047), the process-gap note already marked remediated (D-046), and the Cycle 04 conditional close is now marked **resolved**: the condition (a live re-test) was exercised, found a real fourth failure, and D-045's own rule correctly did not fire the input-layer rewrite since the cause sat in a different layer. This fix joins the **C05 PERFECT queue** for the director's next pass.

**AUDIT:** *(C3, 2026-07-23 — **PASS**.)* Independently verified, not taken on the commit message's word:
- **The `NodeViews.sync()` fix is real and general.** Read the diff directly: `view.body.isPickable = available` plus `for (const child of view.body.getChildMeshes()) child.isPickable = available`. Cross-checked `buildNodeMesh` line by line to confirm which node kinds actually have pickable children — tree (canopy), coconutpalm (fronds + husk), reed (blade + 4 extras); driftwood/deadfall/rock/berrybush/shellfish/crashbox are single-mesh and already covered by the root assignment. `getChildMeshes()` with no arguments is recursive by Babylon's own default, so every case is covered. Traced the actual failure mechanism through `pickNode`/`pickHitPoint` in `game.ts`: a felled mesh left pickable would still win `scene.pick()`, `pickNode` would correctly reject it (`view.node.available` false) but fall through to a ghost `pickedPoint` on the invisible mesh, and no fire/pond/shelter/storage candidate would be near enough — reproducing "zero reaction" exactly. The fix removes the mesh from the pick filter entirely, which is the correct layer for the fix.
- **The classification call holds up.** Read all three prior root causes in this doc (stick-held movement clearing `pending` every frame; an untracked `pointerId` corrupting `pressMoved`/`wasTap`; cache staleness serving a stale bundle) — all three are genuinely upstream, in the touch-event-to-intention pipeline (`Controls`/`onTap`'s own dispatch), before a pick ever happens. This bug is downstream of that: the tap is correctly detected and dispatched, `scene.pick()` itself returns a wrong answer because of stale mesh state in an unrelated module (`entities.ts`, not `Controls.ts` or `game.ts`'s tap dispatch). It is a different subsystem, not a finer slice of the same one — the non-escalation call is defensible.
- **The fail-loud law is real and correctly scoped.** `pickHitPoint` now returns `unexpectedMesh` (mesh name, `null` for terrain or no hit); `onTap` only reaches the new `explain('Nothing to do there.')` branch after every node/fire/pond/shelter/storage candidate has already failed to match — so ordinary empty-ground taps (terrain or true misses) are unaffected. Confirmed by the harness: 0 spurious hints through the whole run's plain taps, and the dedicated fail-loud regression (empty crate tap) traces cleanly.
- **Visible axe carriage is real.** `PlayerView` grows a haft+head parented to `root`, `isPickable = false` on both (won't interfere with picking), toggled only by `syncTools(hasAxe)` called from `placePlayerFromState`. `hud.ts`'s Build panel confirmed changed from `'Made.'` to `'Owned.'` for the axe's built-label.
- **Full clean re-run from scratch:** `purity` ✓, `docs-integrity` ✓ (49 decisions, all references resolve), `typecheck` ✓, `vitest` **128/128** ✓. Fresh `npm run build` + `vite preview` + `node tools/smoke.mjs`: first attempt stalled with zero output for several minutes (this session's documented stray-process pattern); killed accumulated `chrome.exe`, retried once against the same still-live preview server, and got a clean **82/82**, including every check in the new "D-045 lineage — sequential interactions" section (fell → tap-storage, the fell→gather→fell interleave, and the fail-loud regression).
No findings requiring remediation. **Verdict: PASS.**

---

## PERFECT pass (C05) — FIX 5: the 5th live report — an emptied world, not a defect (D-050)

**C1 scoped diagnostic ruling, same live build.** Axe visibly carried (D-049 confirmed working); standing as close as possible to a tree, axe out, taps it — nothing happens. Not the fell action, not the tree reacting, not even the in-range affordance circle. True silence, every tree tried, the 5th consecutive live failure of this one verb while the device harness stayed green.

**The ruling's own lead was the key.** The affordance circle (`highlightTarget()`/`highlight()`) renders every frame from player proximity alone — it needs no tap at all. Its total absence meant the failure sat somewhere upstream of tap detection entirely, not inside it.

**Confirmed by direct reproduction, in the order the ruling required:**
- **(a) New-system gating** — ruled out. No C05 condition (energy, wet, any structure state) touches node felling or highlighting; `isExhausted` only scales walk speed.
- **(b) Ownership-state mismatch** — ruled out. The fell verb's `needsAxe` gate and the visible-carriage render both read the identical `state.tools.axe` field; no divergent source.
- **Root cause, reproduced bit-for-bit:** the island's 5 standing trees (`world.ts`) are single-use and never respawn. The 110-tree decorative treeline behind them (`island.ts`, thin-instanced for the frame budget its own comment states) uses the same trunk/canopy materials and sits in the same zone — visually indistinguishable from a real one, confirmed by screenshot. A scratch repro — fell all 5 real trees via `editSave`, then approach and tap a genuine decorative-tree coordinate (`TREES`'s deterministic scatter) — reproduced the exact report: no pending set, no highlight (decorative trees were never in `NodeViews.views`), no trace breadcrumb, `failedInteractionTaps` unchanged. After enough of today's own extensive testing to exhaust the 5 real trees, every later "tree" the director sees and taps genuinely has nothing left to give — correct behaviour, not a regression.

**Neither of the ruling's pre-committed branches fired.** This is not tap-detection/pointer-routing (D-045's class) and not post-action interaction state (D-049's class) — it is a content/legibility gap: a finite, non-respawning resource with zero visual distinction from decorative scenery and no depletion signal. **The input-layer strike count stays at three; no rewrite, no Opus escalation.**

**Shipped regardless — the mandatory harness-fidelity item (c):** a "Copy debug info" button in Settings (`hud.ts`'s `showSettings`, wired through a new `runtime.debugInfo`/`window.__drift.debugInfo()` hook) exporting: the trace, the last 20 taps (`Game.tapBreadcrumbs`, a bounded ring buffer recorded at every `onTap` exit path — node/fire/pond/shelter/storage/unexpected-mesh/empty-ground/no-hit/panel-open), and — the number that would have settled this instantly — every resource kind's remaining-vs-total count. **This explains precisely why 82/82 harness runs coexisted with 5 real device failures:** every harness run starts from a fresh or explicitly-reset save; a state a long, cumulative real session structurally cannot stay in. The harness has never once run long enough, or persistently enough, to exhaust a finite world resource — this class of report was categorically unreachable by the automated suite, not merely missed by it.

**Regression-locked** (`tools/smoke.mjs`, section "D-050"): felling all 5 trees then tapping a real decorative-tree coordinate reproduces the exact silent symptom (pending stays null, no trace increment); the debug-export text is asserted to report `tree: 0/5` in that state, to include the tap log, and to include the trace; the Settings panel's "Copy debug info" button is confirmed reachable by a real tap and its confirmation message shows.

**Verification:** purity ✓, docs-integrity ✓ (50 decisions), typecheck ✓, 128 brain tests ✓ (unchanged), device harness **89/89** clean on the first attempt.

**Recommendation, not actioned under this ruling's scope** (flagged to SON/C1 for the next cycle spec): give single-use harvestable nodes a visual tell distinct from decorative scenery, or a passive "picked clean" hint once a resource kind is fully depleted near the player.

**Doc deltas:** D-050 (decisions log); `drift_state.md` regenerated with the KEY REPORT stating explicitly which branch fired (neither — a content/legibility gap) and a debug-export mention for the director's next session.

**AUDIT:** *(pending — C3 spot-audit)*
