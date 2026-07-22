# DRIFT — Decisions Log
*Standing-authority decisions with rationale, newest first. Forks that went to the director are marked ⚑. PARKed ideas live at the bottom. Canonical home: repo `/docs/` from Cycle 01 onward.*

---

**D-014 · 2026-07-22 — Verification and tooling schedule (from the external audit, gated).**
fast-check property tests are mandated on `reconcile` from Cycle 02 (C2 may pull them into C01 if free): no NaN/negative quantities, zero-elapsed changes nothing, determinism, caps respected. Playwright mobile-emulation flows and vite-plugin-pwa (install, cached assets, and a controlled "new build" prompt — assets are never hot-swapped mid-session) are scheduled for Cycles 02–03, once there is something to regress. Ops bumped to v1.1 (dependency law §5.7). *Status: standing.*

**D-013 · 2026-07-22 — The control-feel A/B is folded into Cycle 01, not run as a separate cycle.**
C01 Stage 2 ships both tap-to-move and a virtual joystick behind a settings toggle with identical action timing; the director picks by feel at PLAYTEST and the loser is archived, not blended. This absorbs the audit's "control shootout" at near-zero cost. Grid Engine is not adopted for player movement (grid-stepped locomotion risks the grounded feel); it stays parked for NPC pathfinding and structure occupancy later. *Status: standing.*

**D-012 · 2026-07-22 — Authored-first island (charter §II.10).**
The first island is handcrafted; procedural generation begins only after its pacing and spatial rules are proven in playtest. Formalizes what C01 already does. *Status: standing.*

**D-011 · 2026-07-22 — Offline fairness constitution (charter §II.10; frames the Cycle 02 spec).**
Supersedes the "offline-drain gentleness" open note. In the normal solo game: (1) no offline death; (2) vitals stop at a recoverable floor; (3) the base cannot be fully erased offline; (4) a threat's maximum loss is capped by defenses and phase; (5) escape-critical items are never destroyed by generic offline rolls; (6) a risk forecast is shown before exit once production/threats exist; (7) destructive offline effects are time-capped — excess absence becomes non-destructive narrative time; (8) the report explains causes, not just results; (9) offline randomness is seeded and reproducible; (10) long absences get a recovery path, not a restart. Hardcore mode may tighten all of this; the honest-systems rule (§I.8) still governs. *Status: standing; numbers `[TUNE]`.*

**D-010 · 2026-07-22 — Persistence and validation path: boundary now, heavier tools when earned.**
All save access sits behind a small `SaveRepository` interface from C01, with a localStorage implementation this cycle; Dexie/IndexedDB is adopted at the cycle where the save model outgrows one envelope (target C02–C03), and Zod validates saves and content tables from C02. Keeps the steel thread minimal while making the storage swap a non-event. Watch item: verify on-device that iOS Safari's ~7-day eviction of script-writable storage can't silently delete saves during long absences (mitigation: add-to-home-screen/PWA, later a native wrapper) — tracked in state. *Status: standing.*

**D-009 · 2026-07-22 — React rejected for now; UI is Phaser plus framework-free DOM overlays.**
By the audit's own Rule 5 (a package may not introduce more concepts than the code it removes): at C01–C03 scale React adds a second UI framework, a state-sync boundary the audit itself rates a High risk, and audit surface — for a warmth bar and two overlays. Adoption gate: the first screen that outgrows a simple DOM overlay (likely Phase 2's inventory/crafting/report), revisited then. Consequence: the official template used is `template-vite-ts`, not `template-react-ts`. *Status: reversible at the gate.*

**D-008 · 2026-07-22 — Engine: Phaser 4, pinned at 4.2.1 (charter v0.2 §II.5).**
The external audit's core correction, independently verified 2026-07-22 against phaser.io, GitHub, and npm: Phaser 3 ended at 3.90.0; v4.0.0 went stable April 2026 and v4.2.1 "Giedi" (9 July 2026) is current. Scaffold from the official `template-vite-ts`; upgrades only between cycles per the dependency law. Bonus adopted: the Phaser 4 repo ships official AI-agent `skills/` files (28 subsystem skills plus a v3→v4 migration skill) — C2 reads them in Stage 0. *Status: standing; pin advances only at cycle gates.*

**D-007 · 2026-07-22 — One accelerated clock; 1 game day = 60 real minutes `[TUNE]`; identical online and offline.**
The offline DNA demands one honest clock, and reconciliation must be trivially explainable ("8 hours passed = 8 game days"). Death is out of C01 scope, so the worst overnight outcome is a cold morning report, not a corpse; the offline-drain/death balance is a Cycle 02 design item. *Status: revisit in playtest.*

**D-006 · 2026-07-22 — Cycle 01 = "First Fire": the steel thread (crash → move → gather wood → fire → warmth → quit → reopen → morning report) on the permanent architecture.**
The DNA — delta-time reconciliation — is both the signature and the biggest risk; prove it first, on a phone, before widening scope. Stage 0 also stands up the entire pipeline, so every later cycle inherits it for free. *Status: standing (scope); all values `[TUNE]`.*

**D-005 · 2026-07-22 — `tune.ts` is the single home of every `[TUNE]` constant; the cycle log's TUNE ledger mirrors it.**
Tuning cycles touch one file, and the director's TUNE feedback maps 1:1 to named constants. *Status: standing.*

**D-004 · 2026-07-22 — Canon lives in the repo.**
From C01, the living four (state, decisions log, cycle log, codex) are canonical at `/docs/`. C1 reads them via raw GitHub fetch at boot; C1's own updates ride into the repo as doc deltas inside handoff blocks. The Project library permanently holds only the charter and the ops protocol. This cuts the director's file shuffling to roughly zero. *Fallback:* if the fetch ever fails, the director drops current copies into the chat. *Status: reversible.*

**D-003 · 2026-07-22 — Pipeline: public GitHub repo + GitHub Pages, auto-deploy on push, per-cycle archives, tag per cycle.**
Zero cost, a stable phone link, real version control — and a public repo is what makes D-004's raw reads possible. Nothing secret ships pre-launch; revisit visibility at launch (Pages on a private repo needs a paid plan; itch.io or Netlify are drop-in alternates). *Status: reversible.*

**D-002 · 2026-07-22 — The second-session audit runs as a fresh-context agent in the repo** (a clean-context subagent spawned by C2 at the end of BUILD, or a separate session), rather than a chat session.
An in-repo auditor can read the code, run the checks, and play the link — and the subagent form needs no director relay. Fresh context is the actual requirement of Charter §II.4, and both forms satisfy it. *Status: standing.*

**D-001 · 2026-07-22 — Ops Protocol v1.0 adopted.**
Crew of Director + C1 Orchestrator + C2 Builder + C3 Auditor (plus later hats); the seven-stage cycle (OPEN → BUILD → AUDIT → SHIP → PLAYTEST → PERFECT → CLOSE); the three-gate definition of done; FIX/TUNE/NEXT/PARK triage; the fork rule. Operationalizes Charter Part II at minimum ceremony. *Status: standing.*

---

## Parked
- **Play-as-an-animal-in-a-world** — separate concept, filed untouched (Charter Appendix A).
