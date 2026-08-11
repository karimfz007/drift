# THE FIRST NIGHT (DRIFT) — HANDOVER: THE CHALLENGE SPRINT
**C1-authored · 2026-08-02 · Continuity document — supersedes chat memory.**
*Purpose: everything ratified recently that is not yet origin-witnessed, plus the full Challenge Sprint design, in one self-sufficient document. A fresh C1, SON, or CODE session can resume the project from this file + the repo. File at `/docs/` via CODE (clause-e verified); keep a copy in the project library.*

---

## 1 · THE GAME'S SPIRIT (the sentence everything serves)

You are alone, and it's cold. **Nothing is given** — not fire, not knowledge, not safety; everything is discovered, earned, and made by hand. **The island is honest**: it runs while you're gone, remembers what you do to it, and never lies to you. **Death is real** — the survivor ends; the island lives; the only things that outlive you are what you built and what you wrote by the fire. **And the horizon is always asking.** The director's verdict (2026-08-02): the build so far is the *first hour, polished* — the danger and the asking are missing. The Challenge Sprint exists to put them on screen.

## 2 · WHERE THE PROJECT ACTUALLY STANDS

**Shipped and verified on origin (ledger head D-105, SHA `80a31d6`):** the offline spine with offline-death impossibility (property-proven, adversarially attacked); five vitals + wet + fatigue + carry weight; the radial circle under the Default-Verb Law (tap = default, hold = circle); the invention pivot (empty catalogue — everything discovered via inspection/Try-Combining; six-state knowledge ladder; blueprints; grades); embodied growth (six indicators, eight capacities, §15 crossings, confidence layer — KnowledgeState monotonic, adversarially proven); the backpack hub (Inventory · Vitals · Skills), Build button retired by absence, contextual construction where you stand; **the Castaway Cycle, 6 of 7**: real permadeath (`respawn` deleted from the document), succession by safe-inversion ("default to death"), crash-arrival profile (measured: no fire → health 65→24.3 overnight, alive in alarm band), the Survivor's Journal (made/written at fire, costs real time, comprehension-gated reading, mortal carrier), the Death Review + arrival narration in the Voice, D-011 re-proven against all of it. 724 unit tests · 301/302 device · save schema v15.

**NOT shipped:** item 6 — the **One Body Resolver** (+ Boulder Formation + D-051 First Amendment, effectivity-bound) — owed by the next Slice 3 session, now folded into Drop 2.

**THE DEPLOY CRISIS (root of the director's frustration):** the public play URL has been serving a **weeks-stale artifact** — `deploy.yml` exists and is correct (auto build+deploy per push) but has been failing silently; Pages serves the last green build. Root index.html references raw TS (`/src/body/main.ts`) — dev-only; the served site is the Actions artifact. **The director has never played the pivot, the Cycle, or anything recent.** Repair order (Drop 0, already issued): `gh run list --workflow=deploy.yml` → find first red → fix → redeploy → **stamp the git SHA into the page meta AND as the first line of Copy debug info** → every future KEY REPORT quotes *pushed SHA + served SHA side by side*; mismatch = failed ship; red deploy workflow = failed ship. ("Origin is not deployed" — Vacuity family.)

**Also logged from the director's last export:** 8 consecutive upper-screen tree taps returning `no-hit` (rays missing canopies entirely) — re-judge on the true build; first FIX candidate if it survives redeploy. Known-open: FIX-5 pack tappability (pre-existing), the notch (Slice 2's named debt).

## 3 · THE CHALLENGE SPRINT (ratified; Ch.10 amended — tension jumps the queue)

**Sprint rules (binding):** PROCESS FREEZE — zero new laws/vocabularies/hazards for the sprint; CI already enforces everything. Reports ≤10 lines ending with the deliverable sentence. Instruments get minutes, never sessions. One drop per session; the director plays after every drop; one word from the director reorders drops. C1 is silent except at drop reports and forks.

### DROP 0 — THE TRUE BUILD (today)
Finish the deploy repair (0a–0d above). Report = pushed SHA, served SHA, and the words **"go play."** Nothing else in the session. *Deliverable: the director can now play the game that was actually built.*
**Director's first true playtest after Drop 0:** debug export's first line shows `build:<sha>`; wash ashore hurt/wet/~65 health; no fire button anywhere; discover fire via inspection; make a journal at the fire; die deliberately; read the Death Review; wash ashore as a successor into your own archaeology; read the stored book (`found-intact` — you can see the shelter works; you cannot yet build one).

### DROP 1 — FEAR: the boar
**Source:** v0_8 threat lifecycle + v0_12 population law + fair-challenge + the five-stage ladder. **Design in full:**
- **A population animal, not a spawn**: 2–4 boars [TUNE] living in the inland forest with needs (forage, water) and daily rhythm; they exist whether or not you're near (reconcile-driven at coarse grain; rendered only near the player — perf rail).
- **Senses & telegraphs**: sight cone, hearing radius, smell-ish proximity [TUNE]; state ladder *unaware → alert (head up, faces you) → warning (snort, ground-paw, short bluff) → charge (committed, straight-line, telegraphed wind-up) → aftermath (disengage/flee or press)*. Every stage perceivable and audible; no attack without its precursor. The Voice narrates encounters in the report ("a boar drove you off the berry line at dusk").
- **Harm now, wounds later**: a connected charge deals health damage + knockback [TUNE]; the full injury *profile* (bleed/limp) is Drop 2's — Drop 1 must not half-ship it.
- **Player answers**: evade (break line-of-sight, terrain), deter (fire/torch radius repels [TUNE]; thrown stone startles), or kill — **the SPEAR**: new discovery-route craft (wood shaft + knapped blade + fiber binding; enters via inspection/Try-Combining like everything post-pivot; reachability-proof mandatory). Thrust verb via the circle; a thrown option may wait.
- **Meat — the first hunted food**: a kill yields raw meat (spoils fast; cooking at fire = the natural next discovery), honest whole-use framing per v0_12.
- **Rails**: D-011 absolute — boars never harm the player or property offline (encounters are active-play; offline boar activity is report-material only, capped). Fair-challenge review per attack shape. No spawn waves ever.
*Deliverable: "the director can now be afraid."*

### DROP 2 — STAKES: the body that breaks
- **The One Body Resolver** (the owed refactor): one causal function unifying reconcile + the D-089 workload formula + the exposure chain; every activity declaration (v2.5 §6 format) flows through it. **Boulder Formation + D-051 First Amendment ship in this same drop** (effectivity-bound: the active-play stone floor becomes law the moment its mechanism exists).
- **The injury profile** (v2.4 Law 116 — "a profile, not a discount"): wounds from the boar (and future sources) as conditions — bleeding (drains until dressed), limp (speed penalty), pain (work quality penalty) [TUNE]; each perceivable, each with its five-stage telegraphs; heals through the existing rest/recovery chains over real game time.
- **The bandage's live verb at last** (held since D-055 by the no-dead-tools rule): fiber-based dressing, discovery-route craft; stops bleeding, speeds wound recovery.
- **Rails**: injuries stabilize at floors offline (D-011); the fatigue/immunity ladder interacts (a wounded, exhausted body heals slower) via the Resolver, not ad-hoc taps.
*Deliverable: "the director can now be hurt, and heal."*

### DROP 3 — URGENCY: time that bites
- **The pressure pass**: one bounded TUNE session on ONLINE drains against v0_14's curves — hunger/thirst/night reach the alarm band in normal ambitious play, not only through neglect; the first night keeps its measured envelope; fair-challenge governs (telegraphed, answerable, recoverable). Ship as tune.ts changes with the model's basis recorded (invented-constant rule).
- **ONE timed wreck event** (Laws 119–123, the director's own design): a forest crash — **smoke column visible over the treeline** (the island's first appointment); reachable site with a closing window of work (the forest consumes it over days [TUNE], stages visible: fresh → picked-over → overgrown); salvage per the wreck economy (wreckfall always empty of the living — arrival canon). Trajectory-driven, not a spawn roll; announced by the world (smoke, sound) and the report, never by a quest marker.
*Deliverable: "the director can now run out of time."*

### DROP 4 — THE PULL: the way home, visible
- **The broken fishing boat, state B0** (Law 124 staged capability; v2.4's design): beached, hull-holed, engineless — placed where the shore walk finds it. **Inspectable by evidence**: inspection reveals its needs as questions (hull material, sealant, a working engine, fuel…), not a checklist; needs gate on knowledge/tools/strength per Law 125 (a manual route and a safer mechanics route).
- No restoration mechanics this drop beyond inspection + the first obvious repair step if cheap — B1+ is the maritime slice. The point is **the physical goal on the horizon of every session**.
- The far-island silhouette and the boat now form one visual sentence: *there, and this is how.*
*Deliverable: "the director can now see the way home."*

**After Drop 4** the sprint ends and Ch.10 resumes with the director's re-verdict: if tension landed, next per plan (threats deepening, Construction II, maritime B1+); if not, C1 re-cuts with the director.

## 4 · STANDING ORDERS & ROUTING (current)
- **Director → SON** for all execution; SON runs drops end-to-end (Master Plan grant, long-session doctrine). **Revert to C1 only for:** forks (⚑), law/property-test contradictions, identity/tone/arc, architecture walls past two attempts, honest-systems doubt, drop-report ratification. C1 otherwise silent.
- **All prior verification law stands via CI** (vacuity a–e, effectivity, bench mutex, player-path, reachability, origin-witness + deploy-witness, tune law, closing rule: severity gates — novelty/volume never; investigation budget: one session max; content-first ratio; invented-constant rule; the deliverable sentence).
- **Relay hygiene**: long content to C1 as file attachments (chat pastes of big documents have failed 3×); reports fine as text.

## 5 · OPEN ITEMS LEDGER
**⚑ Director's parked forks** (brought at their moments, options prepared by C1): campaign length + castaway-lives count (at Ch.10's pacing pass) · Triangle reveal depth + ending emotional emphasis (at the Thin Road design) · Community Island: authored district vs traces-first (at its slice) · business posture (pre-launch) · the Godot "RUSTED" workspace question (affects trust in external docs' build claims — still unanswered).
**Pending from the director:** Drop-0 verified playtest (the Cycle script above) · real-save migration confirmation (D-089's last PARTIAL — structures standing, crafted types craftable).
**Owed by the machine:** One Body Resolver (Drop 2) · no-hit tree-tap re-judgment (post-Drop-0) · FIX-5 pack tap · the notch · combine-slot growth UI + work-mat + known-multiple-results (2C leftovers; post-sprint unless a drop touches them).
**Design-track parked:** Medicine slice (illness + sleep-as-treatment, rails set) · underwater · Community · Ch.3 junk · Ch.7 TUNE translation · Bible v3.0 consolidation · gaps #17–26 (audio, art bible, weather system, UI master, lore, modes, accounts-before-public-test, localization, live-ops).

## 6 · THE LAWS A FRESH READER NEEDS FIRST (pointers in `/docs`)
1. Absence never harms and can never kill (D-011; property-tested). 2. Nothing survival-critical is exhaustible; the floor is reachable through active play alone (D-051 + First Amendment, pending Drop 2). 3. Death is permanent; the island persists; matter, not memory; the journal is the only bridge (D-105 family). 4. Tap = default verb; the circle divides on hold (Default-Verb Law). 5. Nothing is pre-known — discovery is causal, legible, generous; no wiki needed for survival basics (v2.3 Laws 94–114). 6. Every fatal chain is telegraphed by the five-stage ladder and answerable (fair-challenge). 7. No claim without a witness — tests witness code, laws witness mechanisms, reports witness their legs, "live" witnesses origin, ships witness the served URL. 8. Honest systems always: no dark patterns, no monetized memory, the Voice never lies. 9. Severity gates closes; novelty and volume never do. 10. The verb must be worth performing; relief is a real reward; delight is part of survival.

## 7 · WHERE EVERYTHING LIVES
**Repo (canon):** `github.com/karimfz007/drift` — `/docs/` (state, decisions log D-001→D-105, cycle log, ops v1.11, codex) · `/docs/reference/` (research corpus v0_4–v0_15, Bibles v2.0–v2.5, model exports) · `/builds/c01–c05/` archives. **Play URL:** `karimfz007.github.io/drift/` — *trust it only when its stamped SHA matches the report.* **This document:** file at `/docs/handover_challenge_sprint.md`; copy in the project library. **The comparison sheet** regenerates at gate/sprint closes.

*The engine is built and proven. The sprint puts teeth, wounds, clocks, and a horizon into it. Drop 0 hands the director the game for the first time; Drop 1 makes him afraid; by Drop 4 he can see the way home. — C1*
