# CYCLE 03 HANDOFF PACKAGE — paste this entire file into Claude Code, opened in the repo folder
*(Director: no new charter or ops files this time — one paste is the whole action.)*

```
Tier: Opus-class. You are C2 — Builder for DRIFT (The First Night). Cycle 03 "The Island Pushes Back".
You are in the repo root. Boot: read /docs/ canon (charter v0.4 §I.5–§I.9 + §I.18, ops v1.3),
then apply the DOC DELTAS below verbatim: append the decisions as the next ledger numbers
(expected D-031, D-032 — renumber to follow the ledger if Cycle 02 logged build decisions),
append the Cycle 03 spec + TUNE rows to the cycle log, mark Cycle 02 CLOSED, regenerate state.
Confirm boot in ≤5 lines (goal + acceptance checks), then execute Cycle 03 end-to-end with
standing authority, Stage 0 through Stage 3. No approval stops. Once deployed, spawn the C3
audit (Ops §4); on PASS, append the as-built note per Ops §7 and report the play URL in one line.
The brain grows this cycle (vitals, death, tools, XP) — the purity and tune laws apply to every
new module; the D-011 floors must be property-tested: offline death must be *impossible*.
```

---

## DOC DELTAS — apply to `/docs/` before building

### 1 · Append to `drift_decisions_log.md` (next ledger numbers)

**D-032 · 2026-07-23 — The build-up: escalation order locked (pressure → construction → threats).**
Per Experience Constitution rule 2 (new decisions before tighter margins): **C03** adds survival pressure (thirst, hunger, health/death, first tool, first loot, first mystery) — the island starts making demands; **C04** adds construction (shelter tiers, bed/respawn anchor, energy/sleep, storage, upkeep) — the player starts owning ground; **C05** adds threats (first creature, spear, defense) — the base earns its walls. Each cycle converts learned systems into new decisions. Director's mandate: "build it up as you see" (standing authority on content escalation within the charter). *Status: standing; contents of C04/C05 specified at their OPEN.*

**D-031 · 2026-07-23 — ⚑ Cycle 02 CLOSED: gate 3 pass-with-notes. The 3D foundation is accepted.**
Director's verdict: foundation good, trees read well, no frame-rate complaint (treated as pass; re-raised any time it stutters) — two defects and one direction note. Defects, fixed in C03 Stage 0: (1) the character reads as floating — root causes to address together: feet-to-terrain grounding via physics snap **and a blob shadow under the character** (absence of a contact shadow is the classic cause of perceived hovering); (2) trees have no colliders. Direction note: "still very simple" — answered by D-032's escalation, not by iterating the thin slice. *Status: standing.*

### 2 · Regenerate `drift_state.md`

Regenerate with: **Cycle 03 "The Island Pushes Back" — OPEN** (D-031, D-032); canon unchanged (charter v0.4 · ops v1.3); experience bet = *three clocks and a first tool turn walking into deciding*; escalation roadmap C03 pressure → C04 construction → C05 threats; director's standing notes unchanged; next actions = C2 executes → director plays (the new question: did you ever have to choose between two needs, and did the axe feel earned) → C1 triages and closes; carried watch items: performance ceiling / Godot hatch (now tested against a bigger island), iOS at launch-prep, clock scale, crew-composition fork parked. **D-025 floor semantics: resolved this cycle** — floors protect absence only; active play can now kill you (D-011 satisfied: offline death impossible, property-tested).

### 3 · Append to `drift_cycle_log.md`

Mark Cycle 02 **CLOSED** (gate 3 pass-with-notes per D-031). Add TUNE rows (all C03, all `[TUNE]`; C2 may add derived constants per the tune law, mirrored here):
`thirstMax = 100` · `thirstDrainPerGameHour = 1.4` (~3 game-days) · `hungerMax = 100` · `hungerDrainPerGameHour = 0.6` (~7 game-days) · `healthMax = 100` · `healthDrainPerGameHourPerEmptyVital = 5` (stacking) · `warmthEmptyHealthDrainPerGameHour = 6` · `thirstOfflineFloor = 10` · `hungerOfflineFloor = 10` · `healthOfflineFloor = 25` · `drinkPerSip = 25` · `axeRecipe = 3 wood + 2 stone + 2 fiber` · `treeChopSecondsWithAxe = 4` · `treeWoodYield = 8` · `xpPerMeaningfulAction = 5` · `xpToLevel = level × 25` · `skillSpeedBonusPerLevel = 8%`

## CYCLE 03 — "The Island Pushes Back"
**Phase 1 · Tier: Opus-class · Status: OPEN · Opened 2026-07-23 · The pressure cycle (D-031, D-032)**

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

**AS-BUILT:** *(pending — C2 at SHIP)*

**AUDIT:** *(pending — C3)*
