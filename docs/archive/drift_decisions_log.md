# DRIFT — Decisions Log
*Standing-authority decisions with rationale, newest first. Forks that went to the director are marked ⚑. PARKed ideas live at the bottom. Canonical home: repo `/docs/` from Cycle 01 onward.*

---

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
