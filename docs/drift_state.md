# THE FIRST NIGHT (DRIFT) — State
*The now-pointer. Canonical home: repo `/docs/drift_state.md`. Regenerated at every cycle CLOSE; C2 updates it after ship (Ops §2). This is the only handover document — any session can recover the project from here plus the cycle log.*

**As of:** 2026-07-23 (**Cycle 04 "Second Nature" SHIPPED and AUDITED — the feel cycle; awaiting PLAYTEST**)

## Now
- **Title: The First Night** (D-015). DRIFT remains the internal codename for files and the repo.
- **Phase 1 — The Naked Hour · Cycle 04 "Second Nature" — SHIPPED, AUDITED, awaiting PLAYTEST.** The phone gets out of the way: landscape presentation, a camera that glides, and a world you touch directly — **tap the thing to use the thing** (D-042). Every Cycle 03 director defect (D-040) is root-caused, fixed, and regression-locked, headed by the fire: a prioritised HUD action slot let "Craft axe" starve "Build fire" whenever any wood was held, so the fire hid until after the axe (i.e. until night). Build fire is now its own button, gated only on wood, day or night.
- **The escalation, re-ordered (D-040):** the D-037 chain stands with a feel cycle inserted first — C03 pressure → **C04 feel (done)** → **C05 construction** (shelter, bed/respawn, energy/sleep, storage, upkeep; the Havok adoption trigger, D-031) → **C06 threats** (first creature, spear, defense).
- Current canon: **charter v0.4 · ops v1.3** (unchanged this cycle), plus this state, the decisions log, the cycle log, and the codex. All six live at `/docs/`; superseded versions in `/docs/archive/`, reference material (including the four handoff packages) in `/docs/reference/`.
- **Repo: https://github.com/karimfz007/drift** (public). **Play URL: https://karimfz007.github.io/drift/**. The 2D lab is at `/builds/c01/`, the first 3D build at `/builds/c02/`, the pressure build at `/builds/c03/`, this one at `/builds/c04/`.
- **Current experience bet (C04):** the survival systems were sound but the *hands* were wrong — a janky camera and a hidden verb stack. Landscape, a gliding camera, and direct touch turn the proven loop into something that feels like a game, not a demo.

## What exists now (the inheritance every later cycle gets free)
- **The brain**, with four vitals, death/respawn, tools, two seed skills, and the reed fibre source — all through the same `reconcile` spine. 102 tests, including the headline **property test: offline death is impossible** for any state × any elapsed (D-011 made law).
- **The one non-negotiable rule holds:** `/src/brain` has zero rendering-engine imports, CI-enforced by a check that resolves real package identity (alias-proof, D-034/D-038, all five bypass classes caught). The whole survival sim is portable.
- **Direct-world interaction (D-042):** the "tap the thing to use the thing" input model — an intention that walks the castaway into reach and then acts, never remotely — with every verb on the world and only Build fire / Craft / Settings left as buttons.
- **A camera that glides:** damped follow, smoothed look, turn slerp, movement acceleration, and analytic near-side camera-collision (no clip, no occlusion).
- **Landscape-first presentation (D-041):** manifest, rotate prompt, first-touch fullscreen + orientation lock, safe-area insets.
- **Versioned save** with a working **v1→v2 migration**.
- **The pipeline** — push → purity → types → tests → build → Pages. One stable URL, per-cycle archives, a tag per cycle.
- **`tools/smoke.mjs`** — 55 device acceptance checks on a real GPU, including grounding, colliders, the p95 frame-time jank budget, the full tap-to-use pressure loop, and a named regression for each of the five D-040 defects.

## Director's standing notes
- Keep replies short. C1 doubles as the director's candid advisor outside cycle ceremony (D-015).
- **Android-first**: Android Chrome is the primary device until launch-prep.

## Next actions
1. **Director** — play on the phone, **in landscape**. Does the phone disappear? Walk around and swing the camera while moving — does it glide, or fight you? Tap things directly — driftwood, a reed clump by the pond, a rock, the pond itself, a food chip — does "tap it to use it" feel like one motion? Gather five wood in daylight and confirm **Build fire is right there** (the C03 defect). Craft the axe, fell a tree, crack the box. **The playtest question: did the phone disappear, and did touching the world feel direct and smooth?** React in plain language.
2. **C1** — triage the reactions (FIX / TUNE / NEXT / PARK); run PERFECT with C2, then CLOSE and OPEN **Cycle 05 — construction** (D-040/D-037): shelter tiers, the bed as a real respawn anchor, energy/sleep, storage, upkeep. This is the cycle that finally needs real dynamics, so it is the Havok adoption trigger (D-031).

## Awaiting the director (⚑ fork, does not block)
- **Crew composition** — the library-first audit's Amendment 7 proposes adding non-Claude sessions to the standing crew. Default if unanswered: crew stays as chartered; external red-team audits stay welcome as an occasional practice.

## Open design notes and watch items (not blockers)
- **⚠ Performance ceiling** — median FPS held (90–125 on the desktop GPU) with the new camera/interaction work; the p95 frame-time budget (`frameTimeP95BudgetMs` = 33 ms) is now measured directly and held (12–20 ms). The `fpsFloorMedian` / Godot-hatch watch (D-028) travels forward.
- **⚠ Havok adoption (C05)** — Cycle 04 still did collision with analytic cylinder push-out (no physics engine, D-031 held), and extended it to the camera boom. Construction and moving threats are the trigger; C05 weighs Havok on its merits.
- **Camera occlusion edge case** — the near-side boom pull handles trunks/rises; dense clusters could still momentarily crowd the view. Cosmetic; revisit if playtest flags it.
- **iOS save durability & orientation-lock** — deferred to launch-prep (Android-first, D-015): Safari's ~7-day storage eviction, and iOS withholding the fullscreen/orientation-lock APIs (the rotate prompt covers the gap).

## Last close
**Cycle 03 "The Island Pushes Back" — closed 2026-07-23 (gate 3, D-040).** The director accepted the systems but failed the *feel*: five defects (camera, fibre sourcing, remote-fire interaction, fire-gating, undiscoverable axe verbs), all traceable to one architecture problem plus teaching gaps. That verdict became Cycle 04's mandate (D-041/D-042/D-043) and the escalation was re-ordered to insert a feel cycle before construction. Preserved playable at `/builds/c03/`.
