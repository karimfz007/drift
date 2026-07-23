# THE FIRST NIGHT (DRIFT) — State
*The now-pointer. Canonical home: repo `/docs/drift_state.md`. Regenerated at every cycle CLOSE; C2 updates it after ship (Ops §2). This is the only handover document — any session can recover the project from here plus the cycle log.*

**As of:** 2026-07-23 (**Cycle 03 "The Island Pushes Back" SHIPPED and AUDITED — the pressure cycle; awaiting PLAYTEST**)

## Now
- **Title: The First Night** (D-015). DRIFT remains the internal codename for files and the repo.
- **Phase 1 — The Naked Hour · Cycle 03 "The Island Pushes Back" — SHIPPED, AUDITED, awaiting PLAYTEST.** Three vital clocks (thirst, hunger, health), real death and respawn, the crude axe earned through the four gates, the first loot, and a wreck on the horizon. The island stopped being scenery. Built on the untouched reconcile spine, with D-011's floors protecting absence.
- **The escalation is locked (D-037):** C03 pressure → **C04 construction** (shelter, bed/respawn, energy/sleep, storage, upkeep) → **C05 threats** (first creature, spear, defense). Each cycle turns learned systems into new decisions.
- Current canon: **charter v0.4 · ops v1.3** (unchanged this cycle), plus this state, the decisions log, the cycle log, and the codex. All six live at `/docs/`; superseded versions in `/docs/archive/`, reference material (including the three handoff packages) in `/docs/reference/`.
- **Repo: https://github.com/karimfz007/drift** (public). **Play URL: https://karimfz007.github.io/drift/**. The 2D lab is at `/builds/c01/`, the first 3D build at `/builds/c02/`, this one at `/builds/c03/`.
- **Current experience bet (C03):** three clocks and a first tool turn walking into deciding — pressure creates the decisions the Experience Constitution demands.

## What exists now (the inheritance every later cycle gets free)
- **The brain**, now with four vitals, death/respawn, tools, and two seed skills — all through the same `reconcile` spine. 100 tests, including the headline **property test: offline death is impossible** for any state × any elapsed (D-011 made law).
- **The one non-negotiable rule holds:** `/src/brain` has zero rendering-engine imports, CI-enforced by a check that resolves real package identity (alias-proof, D-034). The whole survival sim is portable.
- **Versioned save** with a working **v1→v2 migration** (a Cycle 02 save loads and wakes to a sensible set of vitals).
- **The pipeline** — push → purity → types → tests → build → Pages. One stable URL, per-cycle archives, a tag per cycle.
- **`tools/smoke.mjs`** — 38 device acceptance checks on a real GPU, including feet-to-terrain grounding, colliders, the full pressure loop, and death/respawn.

## Director's standing notes
- Keep replies short. C1 doubles as the director's candid advisor outside cycle ceremony (D-015).
- **Android-first**: Android Chrome is the primary device until launch-prep.

## Next actions
1. **Director** — play on the phone. Walk inland, get thirsty, find the pond (west of the trees), drink. Forage and eat. Gather wood + stone + fibre and **craft the axe** — then fell a standing tree and crack open the sealed box on the beach. Let yourself die once from neglect to see the wake-ashore. Close the app two minutes and come back. **The playtest question: did you ever have to choose between two needs — and did the axe feel earned?** React in plain language.
2. **C1** — triage the reactions (FIX / TUNE / NEXT / PARK); run PERFECT with C2, then CLOSE and OPEN **Cycle 04 — construction** (D-037): shelter tiers, the bed as a real respawn anchor, energy/sleep, storage, upkeep. This is the cycle that finally needs real dynamics, so it is the Havok adoption trigger (D-031).

## Awaiting the director (⚑ fork, does not block)
- **Crew composition** — the library-first audit's Amendment 7 proposes adding non-Claude sessions to the standing crew. Default if unanswered: crew stays as chartered; external red-team audits stay welcome as an occasional practice.

## Open design notes and watch items (not blockers)
- **⚠ Performance ceiling** — median FPS held (76–91 on the desktop GPU) on the bigger ~250 m island; the `fpsFloorMedian` / Godot-hatch watch (D-028) travels forward, now tested against more content each cycle.
- **⚠ Havok adoption (C04)** — Cycle 03 did collision with analytic cylinder push-out (no physics engine, D-031 held). Construction and moving threats are the trigger; C04 weighs Havok on its merits.
- **iOS save durability** — deferred to launch-prep (Android-first, D-015): Safari's ~7-day eviction of script-writable storage.
- **D-025 floor semantics — RESOLVED this cycle.** Warmth (and now thirst/hunger/health) carry real stakes; the rule stands as designed and is proven: floors protect *absence* only, active play can kill, and **offline death is impossible** (property-tested). The desktop-no-auto-lock caveat is now moot for offline (offline simply cannot kill).

## Last close
**Cycle 02 "Boots on Sand" — closed 2026-07-23 (gate 3 pass-with-notes, D-036).** The director accepted the 3D foundation on the phone: foundation good, trees read well, no frame-rate complaint. Two defects (the floating character; trees without colliders) and one direction note ("still very simple") — the defects fixed in C03 Stage 0 (grounding + blob shadow + colliders), the direction answered by D-037's escalation. Preserved playable at `/builds/c02/`.
