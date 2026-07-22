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

*Rows marked **C01+** were added by C2 during the C01 build (D-019); the spec's behaviour could not be expressed without them. All are `[TUNE]` and provisional until playtest.*

---

## CYCLE 01 — "First Fire"
**Phase 1 · Tier: Opus-class · Status: OPEN · Opened 2026-07-22 · Amended twice 2026-07-22: library-first audit (D-008 … D-014), then director directives + human-enjoyment audit (D-015 … D-018)**

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

**AS-BUILT:** *(pending — C2 at SHIP)*

**AUDIT:** *(pending — C3)*
